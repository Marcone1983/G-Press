import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { generateArticle, checkApiHealth, type Document, type CompanyInfo, type ArticleFormat, type GeneratedArticle } from '@/lib/vercel-api';

const STORAGE_KEYS = {
  DOCUMENTS: 'gpress_kb_documents',
  COMPANY_INFO: 'gpress_kb_company',
  ARTICLES: 'gpress_kb_articles',
};

interface StoredDocument extends Document {
  id: string;
  uploadedAt: string;
}

interface StoredArticle extends GeneratedArticle {
  id: string;
  generatedAt: string;
  format: ArticleFormat;
  status: 'draft' | 'approved' | 'sent';
}

export default function KnowledgeScreen() {
  const insets = useSafeAreaInsets();
  
  // State
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [articles, setArticles] = useState<StoredArticle[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    ceo: '',
    industry: '',
    products: [],
    strengths: [],
  });
  const [isApiHealthy, setIsApiHealthy] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ArticleFormat>('news_brief');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<StoredArticle | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'articles' | 'settings'>('documents');

  // Load data on mount
  useEffect(() => {
    loadData();
    checkHealth();
  }, []);

  const checkHealth = async () => {
    const healthy = await checkApiHealth();
    setIsApiHealthy(healthy);
  };

  const loadData = async () => {
    try {
      const [docsJson, companyJson, articlesJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.COMPANY_INFO),
        AsyncStorage.getItem(STORAGE_KEYS.ARTICLES),
      ]);
      
      if (docsJson) setDocuments(JSON.parse(docsJson));
      if (companyJson) setCompanyInfo(JSON.parse(companyJson));
      if (articlesJson) setArticles(JSON.parse(articlesJson));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const saveDocuments = async (docs: StoredDocument[]) => {
    setDocuments(docs);
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
  };

  const saveCompanyInfo = async (info: CompanyInfo) => {
    setCompanyInfo(info);
    await AsyncStorage.setItem(STORAGE_KEYS.COMPANY_INFO, JSON.stringify(info));
  };

  const saveArticles = async (arts: StoredArticle[]) => {
    setArticles(arts);
    await AsyncStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(arts));
  };

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf', 'application/msword'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      let content = '';

      // Read file content
      if (file.mimeType === 'text/plain') {
        content = await FileSystem.readAsStringAsync(file.uri);
      } else {
        // For PDF/Word, we'd need a parser - for now just store metadata
        content = `[File: ${file.name}] - Content extraction requires manual input`;
      }

      const newDoc: StoredDocument = {
        id: Date.now().toString(),
        name: file.name,
        category: 'general',
        content: content.substring(0, 10000), // Limit content size
        uploadedAt: new Date().toISOString(),
      };

      await saveDocuments([...documents, newDoc]);
      Alert.alert('Successo', 'Documento caricato!');
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Errore', 'Impossibile caricare il documento');
    }
  };

  const handleAddManualDocument = () => {
    Alert.prompt(
      'Aggiungi Documento',
      'Inserisci il contenuto del documento:',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Aggiungi',
          onPress: async (content: string | undefined) => {
            if (!content) return;
            const newDoc: StoredDocument = {
              id: Date.now().toString(),
              name: `Documento ${documents.length + 1}`,
              category: 'manual',
              content,
              uploadedAt: new Date().toISOString(),
            };
            await saveDocuments([...documents, newDoc]);
          },
        },
      ],
      'plain-text'
    );
  };

  const handleDeleteDocument = async (id: string) => {
    Alert.alert('Elimina', 'Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await saveDocuments(documents.filter(d => d.id !== id));
        },
      },
    ]);
  };

  const handleGenerateArticle = async () => {
    if (documents.length === 0) {
      Alert.alert('Errore', 'Carica almeno un documento prima di generare un articolo');
      return;
    }

    if (!companyInfo.name) {
      Alert.alert('Errore', 'Configura le informazioni aziendali prima di generare un articolo');
      setShowCompanyModal(true);
      return;
    }

    setIsGenerating(true);

    try {
      const response = await generateArticle({
        documents: documents.map(d => ({
          name: d.name,
          category: d.category,
          content: d.content,
        })),
        companyInfo,
        format: selectedFormat,
      });

      if (response.success && response.article) {
        const newArticle: StoredArticle = {
          ...response.article,
          id: Date.now().toString(),
          generatedAt: new Date().toISOString(),
          format: selectedFormat,
          status: 'draft',
        };

        await saveArticles([newArticle, ...articles]);
        setSelectedArticle(newArticle);
        setShowArticleModal(true);
        Alert.alert('Successo', 'Articolo generato con AI!');
      }
    } catch (error: any) {
      console.error('Error generating article:', error);
      Alert.alert('Errore', error.message || 'Impossibile generare l\'articolo. Verifica il credito OpenAI.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveArticle = async (article: StoredArticle) => {
    const updated = articles.map(a => 
      a.id === article.id ? { ...a, status: 'approved' as const } : a
    );
    await saveArticles(updated);
    setShowArticleModal(false);
    Alert.alert('Approvato!', 'L\'articolo è pronto per essere inviato dalla Home.');
  };

  const handleDeleteArticle = async (id: string) => {
    await saveArticles(articles.filter(a => a.id !== id));
    setShowArticleModal(false);
  };

  const formatLabels: Record<ArticleFormat, string> = {
    news_brief: 'News Breve',
    deep_dive: 'Approfondimento',
    interview: 'Intervista',
    case_study: 'Case Study',
    announcement: 'Annuncio',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Journalist</Text>
        <View style={styles.healthBadge}>
          <View style={[styles.healthDot, { backgroundColor: isApiHealthy ? '#34C759' : isApiHealthy === false ? '#FF3B30' : '#FF9500' }]} />
          <Text style={styles.healthText}>{isApiHealthy ? 'Online' : isApiHealthy === false ? 'Offline' : 'Checking...'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['documents', 'articles', 'settings'] as const).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'documents' ? 'Documenti' : tab === 'articles' ? 'Articoli' : 'Azienda'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'documents' && (
          <>
            {/* Upload Buttons */}
            <View style={styles.uploadRow}>
              <Pressable style={styles.uploadButton} onPress={handleUploadDocument}>
                <Text style={styles.uploadButtonText}>📄 Carica File</Text>
              </Pressable>
              <Pressable style={styles.uploadButton} onPress={handleAddManualDocument}>
                <Text style={styles.uploadButtonText}>✏️ Aggiungi Testo</Text>
              </Pressable>
            </View>

            {/* Documents List */}
            {documents.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>Nessun documento</Text>
                <Text style={styles.emptySubtitle}>Carica whitepaper, press release o altri documenti per generare articoli AI</Text>
              </View>
            ) : (
              documents.map(doc => (
                <View key={doc.id} style={styles.docCard}>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={styles.docMeta}>{doc.category} • {new Date(doc.uploadedAt).toLocaleDateString()}</Text>
                    <Text style={styles.docPreview} numberOfLines={2}>{doc.content}</Text>
                  </View>
                  <Pressable onPress={() => handleDeleteDocument(doc.id)} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </Pressable>
                </View>
              ))
            )}

            {/* Generate Button */}
            {documents.length > 0 && (
              <View style={styles.generateSection}>
                <Text style={styles.sectionTitle}>Genera Articolo</Text>
                
                {/* Format Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formatScroll}>
                  {(Object.keys(formatLabels) as ArticleFormat[]).map(format => (
                    <Pressable
                      key={format}
                      style={[styles.formatChip, selectedFormat === format && styles.formatChipActive]}
                      onPress={() => setSelectedFormat(format)}
                    >
                      <Text style={[styles.formatChipText, selectedFormat === format && styles.formatChipTextActive]}>
                        {formatLabels[format]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Pressable
                  style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
                  onPress={handleGenerateArticle}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.generateButtonText}>🤖 Genera con AI</Text>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}

        {activeTab === 'articles' && (
          <>
            {articles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyTitle}>Nessun articolo</Text>
                <Text style={styles.emptySubtitle}>Genera il tuo primo articolo dalla tab Documenti</Text>
              </View>
            ) : (
              articles.map(article => (
                <Pressable
                  key={article.id}
                  style={styles.articleCard}
                  onPress={() => {
                    setSelectedArticle(article);
                    setShowArticleModal(true);
                  }}
                >
                  <View style={styles.articleHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: article.status === 'approved' ? '#34C759' : article.status === 'sent' ? '#007AFF' : '#FF9500' }]}>
                      <Text style={styles.statusText}>{article.status === 'approved' ? 'Approvato' : article.status === 'sent' ? 'Inviato' : 'Bozza'}</Text>
                    </View>
                    <Text style={styles.articleFormat}>{formatLabels[article.format]}</Text>
                  </View>
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  <Text style={styles.articleSubtitle}>{article.subtitle}</Text>
                  <Text style={styles.articleDate}>{new Date(article.generatedAt).toLocaleString()}</Text>
                </Pressable>
              ))
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Informazioni Aziendali</Text>
            <Text style={styles.sectionSubtitle}>Queste informazioni vengono usate dall'AI per generare articoli contestualizzati</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome Azienda</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.name}
                onChangeText={(text) => saveCompanyInfo({ ...companyInfo, name: text })}
                placeholder="Es. GhostBridge"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CEO / Fondatore</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.ceo}
                onChangeText={(text) => saveCompanyInfo({ ...companyInfo, ceo: text })}
                placeholder="Es. Marco Rossi"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Settore</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.industry}
                onChangeText={(text) => saveCompanyInfo({ ...companyInfo, industry: text })}
                placeholder="Es. Blockchain / Fintech"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Prodotti (separati da virgola)</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.products?.join(', ')}
                onChangeText={(text) => saveCompanyInfo({ ...companyInfo, products: text.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="Es. Cross-chain Bridge, Wallet"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Punti di Forza (separati da virgola)</Text>
              <TextInput
                style={styles.input}
                value={companyInfo.strengths?.join(', ')}
                onChangeText={(text) => saveCompanyInfo({ ...companyInfo, strengths: text.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="Es. Sicurezza, Velocità, Innovazione"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Article Preview Modal */}
      <Modal visible={showArticleModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowArticleModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Anteprima Articolo</Text>
            <View style={{ width: 30 }} />
          </View>

          {selectedArticle && (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.previewTitle}>{selectedArticle.title}</Text>
              <Text style={styles.previewSubtitle}>{selectedArticle.subtitle}</Text>
              <View style={styles.previewTags}>
                {selectedArticle.tags.map((tag, i) => (
                  <View key={i} style={styles.previewTag}>
                    <Text style={styles.previewTagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.previewContent}>{selectedArticle.content}</Text>

              {/* Tasto Copia */}
              <Pressable
                style={styles.copyButton}
                onPress={async () => {
                  const fullText = `${selectedArticle.title}\n\n${selectedArticle.subtitle}\n\n${selectedArticle.content}`;
                  await Clipboard.setStringAsync(fullText);
                  Alert.alert('✅ Copiato!', 'L\'articolo è stato copiato negli appunti');
                }}
              >
                <Text style={styles.copyButtonText}>📋 Copia Articolo</Text>
              </Pressable>

              <View style={styles.previewActions}>
                {selectedArticle.status === 'draft' && (
                  <Pressable
                    style={styles.approveButton}
                    onPress={() => handleApproveArticle(selectedArticle)}
                  >
                    <Text style={styles.approveButtonText}>✓ Approva</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.deleteArticleButton}
                  onPress={() => handleDeleteArticle(selectedArticle.id)}
                >
                  <Text style={styles.deleteArticleButtonText}>🗑️ Elimina</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  healthText: {
    fontSize: 12,
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  docPreview: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  generateSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  formatScroll: {
    marginBottom: 16,
  },
  formatChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  formatChipActive: {
    backgroundColor: '#007AFF',
  },
  formatChipText: {
    fontSize: 13,
    color: '#666',
  },
  formatChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  articleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  articleFormat: {
    fontSize: 12,
    color: '#666',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  articleSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  articleDate: {
    fontSize: 12,
    color: '#999',
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1a1a1a',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 32,
  },
  previewSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  previewTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  previewTagText: {
    fontSize: 12,
    color: '#007AFF',
  },
  previewContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    marginBottom: 30,
  },
  copyButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteArticleButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  deleteArticleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
