import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  KBDocument,
  CompanyInfo,
  GeneratedArticle,
  ArticleRequest,
  saveDocument,
  getDocuments,
  deleteDocument,
  saveCompanyInfo,
  getCompanyInfo,
  generateArticle,
  getGeneratedArticles,
  updateArticleStatus,
  deleteArticle,
  getDocumentTypeLabel,
  getFormatLabel,
} from "@/lib/knowledge-base";

type Tab = "documents" | "company" | "generate" | "articles";

export default function KnowledgeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("documents");
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [articles, setArticles] = useState<GeneratedArticle[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showArticlePreview, setShowArticlePreview] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<GeneratedArticle | null>(null);
  
  // Upload form
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<KBDocument["type"]>("other");
  const [uploadContent, setUploadContent] = useState("");
  
  // Company form
  const [companyForm, setCompanyForm] = useState<CompanyInfo>({
    name: "",
    description: "",
    industry: "",
    foundedYear: "",
    headquarters: "",
    website: "",
    ceo: "",
    keyProducts: [],
    uniqueSellingPoints: [],
    recentNews: [],
    boilerplate: "",
  });
  const [productsInput, setProductsInput] = useState("");
  const [uspInput, setUspInput] = useState("");
  
  // Generate form
  const [generateRequest, setGenerateRequest] = useState<ArticleRequest>({
    format: "news_brief",
    tone: "neutral",
    length: "medium",
    topic: "",
  });
  
  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    try {
      const [docs, arts, info] = await Promise.all([
        getDocuments(),
        getGeneratedArticles(),
        getCompanyInfo(),
      ]);
      setDocuments(docs);
      setArticles(arts);
      setCompanyInfo(info);
      if (info) {
        setCompanyForm(info);
        setProductsInput(info.keyProducts.join(", "));
        setUspInput(info.uniqueSellingPoints.join(", "));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);

  // Pick document
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setUploadName(file.name.replace(/\.[^/.]+$/, ""));
        
        // Read file content
        if (file.uri) {
          try {
            const content = await FileSystem.readAsStringAsync(file.uri);
            setUploadContent(content);
          } catch {
            // For non-text files, use placeholder
            setUploadContent(`[Contenuto del file: ${file.name}]\n\nInserisci qui il testo estratto dal documento.`);
          }
        }
        
        setShowUploadModal(true);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Errore", "Impossibile selezionare il documento");
    }
  };

  // Save document
  const handleSaveDocument = async () => {
    if (!uploadName.trim() || !uploadContent.trim()) {
      Alert.alert("Errore", "Inserisci nome e contenuto del documento");
      return;
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await saveDocument({
        name: uploadName,
        type: uploadType,
        content: uploadContent,
        fileSize: uploadContent.length,
      });
      
      setShowUploadModal(false);
      setUploadName("");
      setUploadType("other");
      setUploadContent("");
      loadData();
      
      Alert.alert("Successo", "Documento aggiunto alla Knowledge Base!");
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare il documento");
    }
  };

  // Save company info
  const handleSaveCompanyInfo = async () => {
    if (!companyForm.name.trim()) {
      Alert.alert("Errore", "Inserisci almeno il nome dell'azienda");
      return;
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updatedInfo: CompanyInfo = {
        ...companyForm,
        keyProducts: productsInput.split(",").map(p => p.trim()).filter(p => p),
        uniqueSellingPoints: uspInput.split(",").map(u => u.trim()).filter(u => u),
      };
      
      await saveCompanyInfo(updatedInfo);
      setCompanyInfo(updatedInfo);
      setShowCompanyModal(false);
      
      Alert.alert("Successo", "Informazioni aziendali salvate!");
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare le informazioni");
    }
  };

  // Generate article
  const handleGenerateArticle = async () => {
    if (documents.length === 0 && !companyInfo) {
      Alert.alert("Attenzione", "Carica almeno un documento o configura le informazioni aziendali prima di generare articoli");
      return;
    }
    
    try {
      setGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      const article = await generateArticle(generateRequest);
      
      setShowGenerateModal(false);
      setSelectedArticle(article);
      setShowArticlePreview(true);
      loadData();
    } catch (error) {
      Alert.alert("Errore", "Impossibile generare l'articolo");
    } finally {
      setGenerating(false);
    }
  };

  // Delete document
  const handleDeleteDocument = (id: string, name: string) => {
    Alert.alert(
      "Elimina Documento",
      `Vuoi eliminare "${name}" dalla Knowledge Base?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            await deleteDocument(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadData();
          },
        },
      ]
    );
  };

  // Approve article
  const handleApproveArticle = async (article: GeneratedArticle) => {
    await updateArticleStatus(article.id, "approved", { approvedAt: new Date().toISOString() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Approvato!", "L'articolo è pronto per l'invio. Vai alla Home per inviarlo ai giornalisti.");
    setShowArticlePreview(false);
    loadData();
  };

  // Render document card
  const renderDocumentCard = ({ item }: { item: KBDocument }) => (
    <Pressable
      style={styles.documentCard}
      onLongPress={() => handleDeleteDocument(item.id, item.name)}
    >
      <View style={styles.docHeader}>
        <View style={[styles.docTypeBadge, { backgroundColor: getDocTypeColor(item.type) }]}>
          <ThemedText style={styles.docTypeText}>{getDocumentTypeLabel(item.type)}</ThemedText>
        </View>
        <ThemedText style={styles.docDate}>
          {new Date(item.uploadedAt).toLocaleDateString("it-IT")}
        </ThemedText>
      </View>
      <ThemedText style={styles.docName}>{item.name}</ThemedText>
      <ThemedText style={styles.docSummary} numberOfLines={2}>
        {item.summary}
      </ThemedText>
      <View style={styles.keywordsRow}>
        {item.keywords.slice(0, 4).map((kw, i) => (
          <View key={i} style={styles.keywordBadge}>
            <ThemedText style={styles.keywordText}>{kw}</ThemedText>
          </View>
        ))}
      </View>
    </Pressable>
  );

  // Render article card
  const renderArticleCard = ({ item }: { item: GeneratedArticle }) => (
    <Pressable
      style={styles.articleCard}
      onPress={() => {
        setSelectedArticle(item);
        setShowArticlePreview(true);
      }}
    >
      <View style={styles.articleHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <ThemedText style={styles.statusText}>{getStatusLabel(item.status)}</ThemedText>
        </View>
        <View style={styles.formatBadge}>
          <ThemedText style={styles.formatText}>{getFormatLabel(item.format)}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.articleTitle}>{item.title}</ThemedText>
      <ThemedText style={styles.articleSubtitle} numberOfLines={2}>
        {item.subtitle}
      </ThemedText>
      <ThemedText style={styles.articleDate}>
        {new Date(item.createdAt).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </ThemedText>
    </Pressable>
  );

  // Get document type color
  const getDocTypeColor = (type: KBDocument["type"]): string => {
    const colors: Record<KBDocument["type"], string> = {
      whitepaper: "#1E88E5",
      press_release: "#43A047",
      innovation: "#E53935",
      product: "#FB8C00",
      case_study: "#8E24AA",
      other: "#757575",
    };
    return colors[type] || "#757575";
  };

  // Get status color
  const getStatusColor = (status: GeneratedArticle["status"]): string => {
    const colors: Record<GeneratedArticle["status"], string> = {
      draft: "#757575",
      pending_review: "#FB8C00",
      approved: "#43A047",
      sent: "#1E88E5",
    };
    return colors[status] || "#757575";
  };

  // Get status label
  const getStatusLabel = (status: GeneratedArticle["status"]): string => {
    const labels: Record<GeneratedArticle["status"], string> = {
      draft: "Bozza",
      pending_review: "In Revisione",
      approved: "Approvato",
      sent: "Inviato",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <ThemedText style={styles.loadingText}>Caricamento Knowledge Base...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 20) + 100,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D32" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={["#6A1B9A", "#8E24AA", "#AB47BC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <ThemedText style={styles.headerEmoji}>🤖</ThemedText>
            <View style={styles.headerText}>
              <ThemedText style={styles.headerTitle}>AI Journalist</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Knowledge Base & Generazione Articoli
              </ThemedText>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{documents.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Documenti</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{articles.length}</ThemedText>
              <ThemedText style={styles.statLabel}>Articoli</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>
                {articles.filter(a => a.status === "approved").length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Approvati</ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          {(["documents", "company", "generate", "articles"] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
            >
              <ThemedText style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                {tab === "documents" && "📄 Documenti"}
                {tab === "company" && "🏢 Azienda"}
                {tab === "generate" && "✨ Genera"}
                {tab === "articles" && "📰 Articoli"}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Knowledge Base</ThemedText>
              <Pressable style={styles.addButton} onPress={handlePickDocument}>
                <ThemedText style={styles.addButtonText}>+ Carica</ThemedText>
              </Pressable>
            </View>
            <ThemedText style={styles.sectionDescription}>
              Carica whitepaper, press release, documenti di prodotto e altre informazioni. L'AI userà questi dati per generare articoli giornalistici.
            </ThemedText>
            
            {documents.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>📁</ThemedText>
                <ThemedText style={styles.emptyTitle}>Nessun documento</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Carica i tuoi documenti per iniziare a generare articoli personalizzati
                </ThemedText>
                <Pressable style={styles.emptyButton} onPress={handlePickDocument}>
                  <ThemedText style={styles.emptyButtonText}>Carica Documento</ThemedText>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={documents}
                renderItem={renderDocumentCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              />
            )}
            
            {/* Manual text input */}
            <Pressable
              style={styles.manualInputButton}
              onPress={() => {
                setUploadName("");
                setUploadContent("");
                setUploadType("other");
                setShowUploadModal(true);
              }}
            >
              <ThemedText style={styles.manualInputIcon}>✏️</ThemedText>
              <ThemedText style={styles.manualInputText}>Inserisci testo manualmente</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Company Tab */}
        {activeTab === "company" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Informazioni Aziendali</ThemedText>
              <Pressable style={styles.addButton} onPress={() => setShowCompanyModal(true)}>
                <ThemedText style={styles.addButtonText}>
                  {companyInfo ? "Modifica" : "+ Configura"}
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText style={styles.sectionDescription}>
              Configura le informazioni sulla tua azienda. L'AI le userà per contestualizzare gli articoli.
            </ThemedText>
            
            {companyInfo ? (
              <View style={styles.companyCard}>
                <ThemedText style={styles.companyName}>{companyInfo.name}</ThemedText>
                <ThemedText style={styles.companyIndustry}>{companyInfo.industry}</ThemedText>
                <ThemedText style={styles.companyDescription}>{companyInfo.description}</ThemedText>
                
                {companyInfo.keyProducts.length > 0 && (
                  <View style={styles.companySection}>
                    <ThemedText style={styles.companySectionTitle}>Prodotti Chiave</ThemedText>
                    <View style={styles.tagsRow}>
                      {companyInfo.keyProducts.map((p, i) => (
                        <View key={i} style={styles.productTag}>
                          <ThemedText style={styles.productTagText}>{p}</ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {companyInfo.uniqueSellingPoints.length > 0 && (
                  <View style={styles.companySection}>
                    <ThemedText style={styles.companySectionTitle}>Punti di Forza</ThemedText>
                    {companyInfo.uniqueSellingPoints.map((usp, i) => (
                      <ThemedText key={i} style={styles.uspItem}>• {usp}</ThemedText>
                    ))}
                  </View>
                )}
                
                {companyInfo.ceo && (
                  <View style={styles.companySection}>
                    <ThemedText style={styles.companySectionTitle}>CEO</ThemedText>
                    <ThemedText style={styles.ceoName}>{companyInfo.ceo}</ThemedText>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>🏢</ThemedText>
                <ThemedText style={styles.emptyTitle}>Nessuna informazione</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Configura le informazioni sulla tua azienda per articoli più personalizzati
                </ThemedText>
                <Pressable style={styles.emptyButton} onPress={() => setShowCompanyModal(true)}>
                  <ThemedText style={styles.emptyButtonText}>Configura Azienda</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Generate Tab */}
        {activeTab === "generate" && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Genera Articolo</ThemedText>
            <ThemedText style={styles.sectionDescription}>
              L'AI analizzerà la tua Knowledge Base e genererà un articolo in stile giornalistico, imparziale e non promozionale.
            </ThemedText>
            
            <View style={styles.generateForm}>
              {/* Format Selection */}
              <ThemedText style={styles.formLabel}>Formato Articolo</ThemedText>
              <View style={styles.formatSelector}>
                {(["news_brief", "feature", "interview", "case_study", "announcement"] as const).map((format) => (
                  <Pressable
                    key={format}
                    style={[
                      styles.formatOption,
                      generateRequest.format === format && styles.formatOptionActive,
                    ]}
                    onPress={() => setGenerateRequest({ ...generateRequest, format })}
                  >
                    <ThemedText style={styles.formatOptionEmoji}>
                      {format === "news_brief" && "📰"}
                      {format === "feature" && "📝"}
                      {format === "interview" && "🎤"}
                      {format === "case_study" && "📊"}
                      {format === "announcement" && "📢"}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.formatOptionText,
                        generateRequest.format === format && styles.formatOptionTextActive,
                      ]}
                    >
                      {getFormatLabel(format)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              
              {/* Tone Selection */}
              <ThemedText style={styles.formLabel}>Tono</ThemedText>
              <View style={styles.toneSelector}>
                {(["neutral", "enthusiastic", "analytical", "investigative"] as const).map((tone) => (
                  <Pressable
                    key={tone}
                    style={[
                      styles.toneOption,
                      generateRequest.tone === tone && styles.toneOptionActive,
                    ]}
                    onPress={() => setGenerateRequest({ ...generateRequest, tone })}
                  >
                    <ThemedText
                      style={[
                        styles.toneOptionText,
                        generateRequest.tone === tone && styles.toneOptionTextActive,
                      ]}
                    >
                      {tone === "neutral" && "Neutrale"}
                      {tone === "enthusiastic" && "Entusiasta"}
                      {tone === "analytical" && "Analitico"}
                      {tone === "investigative" && "Investigativo"}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              
              {/* Topic (optional) */}
              <ThemedText style={styles.formLabel}>Argomento Specifico (opzionale)</ThemedText>
              <TextInput
                style={styles.topicInput}
                value={generateRequest.topic}
                onChangeText={(text) => setGenerateRequest({ ...generateRequest, topic: text })}
                placeholder="Es: lancio nuovo prodotto, risultati Q4, partnership..."
                placeholderTextColor="#999"
              />
              
              {/* Generate Button */}
              <Pressable
                style={[styles.generateButton, generating && styles.generateButtonDisabled]}
                onPress={handleGenerateArticle}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <ThemedText style={styles.generateButtonText}>Generazione in corso...</ThemedText>
                  </>
                ) : (
                  <>
                    <ThemedText style={styles.generateButtonEmoji}>🤖</ThemedText>
                    <ThemedText style={styles.generateButtonText}>Genera Articolo</ThemedText>
                  </>
                )}
              </Pressable>
              
              <ThemedText style={styles.disclaimer}>
                L'articolo sarà scritto in stile giornalistico imparziale, come se fosse redatto da un giornalista indipendente.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Articles Tab */}
        {activeTab === "articles" && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Articoli Generati</ThemedText>
            <ThemedText style={styles.sectionDescription}>
              Rivedi, modifica e approva gli articoli generati dall'AI prima di inviarli ai giornalisti.
            </ThemedText>
            
            {articles.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>📰</ThemedText>
                <ThemedText style={styles.emptyTitle}>Nessun articolo</ThemedText>
                <ThemedText style={styles.emptyText}>
                  Genera il tuo primo articolo dalla tab "Genera"
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())}
                renderItem={renderArticleCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Upload Document Modal */}
      <Modal visible={showUploadModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Aggiungi Documento</ThemedText>
              <Pressable onPress={() => setShowUploadModal(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.formLabel}>Nome Documento</ThemedText>
              <TextInput
                style={styles.input}
                value={uploadName}
                onChangeText={setUploadName}
                placeholder="Es: Whitepaper AI 2024"
                placeholderTextColor="#999"
              />
              
              <ThemedText style={styles.formLabel}>Tipo Documento</ThemedText>
              <View style={styles.typeSelector}>
                {(["whitepaper", "press_release", "innovation", "product", "case_study", "other"] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={[styles.typeOption, uploadType === type && styles.typeOptionActive]}
                    onPress={() => setUploadType(type)}
                  >
                    <ThemedText
                      style={[styles.typeOptionText, uploadType === type && styles.typeOptionTextActive]}
                    >
                      {getDocumentTypeLabel(type)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              
              <ThemedText style={styles.formLabel}>Contenuto</ThemedText>
              <TextInput
                style={[styles.input, styles.contentInput]}
                value={uploadContent}
                onChangeText={setUploadContent}
                placeholder="Incolla qui il contenuto del documento..."
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />
            </ScrollView>
            
            <Pressable style={styles.saveButton} onPress={handleSaveDocument}>
              <ThemedText style={styles.saveButtonText}>Salva Documento</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Company Info Modal */}
      <Modal visible={showCompanyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Informazioni Aziendali</ThemedText>
              <Pressable onPress={() => setShowCompanyModal(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.formLabel}>Nome Azienda *</ThemedText>
              <TextInput
                style={styles.input}
                value={companyForm.name}
                onChangeText={(text) => setCompanyForm({ ...companyForm, name: text })}
                placeholder="Es: GROWVERSE"
                placeholderTextColor="#999"
              />
              
              <ThemedText style={styles.formLabel}>Settore</ThemedText>
              <TextInput
                style={styles.input}
                value={companyForm.industry}
                onChangeText={(text) => setCompanyForm({ ...companyForm, industry: text })}
                placeholder="Es: Tecnologia, AI, Metaverso"
                placeholderTextColor="#999"
              />
              
              <ThemedText style={styles.formLabel}>Descrizione</ThemedText>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={companyForm.description}
                onChangeText={(text) => setCompanyForm({ ...companyForm, description: text })}
                placeholder="Breve descrizione dell'azienda..."
                placeholderTextColor="#999"
                multiline
              />
              
              <ThemedText style={styles.formLabel}>CEO / Spokesperson</ThemedText>
              <TextInput
                style={styles.input}
                value={companyForm.ceo}
                onChangeText={(text) => setCompanyForm({ ...companyForm, ceo: text })}
                placeholder="Es: Roberto Romagnino"
                placeholderTextColor="#999"
              />
              
              <ThemedText style={styles.formLabel}>Prodotti Chiave (separati da virgola)</ThemedText>
              <TextInput
                style={styles.input}
                value={productsInput}
                onChangeText={setProductsInput}
                placeholder="Es: AI Platform, Metaverse SDK, Analytics"
                placeholderTextColor="#999"
              />
              
              <ThemedText style={styles.formLabel}>Punti di Forza (separati da virgola)</ThemedText>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={uspInput}
                onChangeText={setUspInput}
                placeholder="Es: Tecnologia proprietaria, Team esperto, Clienti Fortune 500"
                placeholderTextColor="#999"
                multiline
              />
              
              <ThemedText style={styles.formLabel}>Boilerplate (testo standard)</ThemedText>
              <TextInput
                style={[styles.input, { height: 100 }]}
                value={companyForm.boilerplate}
                onChangeText={(text) => setCompanyForm({ ...companyForm, boilerplate: text })}
                placeholder="Testo standard che appare alla fine dei comunicati..."
                placeholderTextColor="#999"
                multiline
              />
            </ScrollView>
            
            <Pressable style={styles.saveButton} onPress={handleSaveCompanyInfo}>
              <ThemedText style={styles.saveButtonText}>Salva Informazioni</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Article Preview Modal */}
      <Modal visible={showArticlePreview} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.previewModal, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Anteprima Articolo</ThemedText>
              <Pressable onPress={() => setShowArticlePreview(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            
            {selectedArticle && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.previewHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedArticle.status) }]}>
                    <ThemedText style={styles.statusText}>{getStatusLabel(selectedArticle.status)}</ThemedText>
                  </View>
                  <View style={styles.formatBadge}>
                    <ThemedText style={styles.formatText}>{getFormatLabel(selectedArticle.format)}</ThemedText>
                  </View>
                </View>
                
                <ThemedText style={styles.previewTitle}>{selectedArticle.title}</ThemedText>
                <ThemedText style={styles.previewSubtitle}>{selectedArticle.subtitle}</ThemedText>
                
                <View style={styles.previewMeta}>
                  <ThemedText style={styles.previewAngle}>📐 Angolo: {selectedArticle.angle}</ThemedText>
                </View>
                
                <View style={styles.previewContent}>
                  <ThemedText style={styles.previewContentText}>{selectedArticle.content}</ThemedText>
                </View>
                
                {selectedArticle.targetAudience.length > 0 && (
                  <View style={styles.previewAudience}>
                    <ThemedText style={styles.previewAudienceTitle}>Target Audience:</ThemedText>
                    <View style={styles.tagsRow}>
                      {selectedArticle.targetAudience.map((a, i) => (
                        <View key={i} style={styles.audienceTag}>
                          <ThemedText style={styles.audienceTagText}>{a}</ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
            
            {selectedArticle && selectedArticle.status === "draft" && (
              <View style={styles.previewActions}>
                <Pressable
                  style={styles.rejectButton}
                  onPress={async () => {
                    await deleteArticle(selectedArticle.id);
                    setShowArticlePreview(false);
                    loadData();
                  }}
                >
                  <ThemedText style={styles.rejectButtonText}>🗑️ Elimina</ThemedText>
                </Pressable>
                <Pressable
                  style={styles.approveButton}
                  onPress={() => handleApproveArticle(selectedArticle)}
                >
                  <ThemedText style={styles.approveButtonText}>✅ Approva</ThemedText>
                </Pressable>
              </View>
            )}
            
            {selectedArticle && selectedArticle.status === "approved" && (
              <Pressable style={styles.sendButton}>
                <ThemedText style={styles.sendButtonText}>📤 Vai alla Home per Inviare</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#6A1B9A",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  sectionDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: "#6A1B9A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: "#6A1B9A",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  documentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  docTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  docDate: {
    fontSize: 11,
    color: "#999",
  },
  docName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  docSummary: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 8,
  },
  keywordsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  keywordBadge: {
    backgroundColor: "#F3E5F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  keywordText: {
    fontSize: 10,
    color: "#6A1B9A",
    fontWeight: "500",
  },
  manualInputButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  manualInputIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  manualInputText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  companyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  companyName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  companyIndustry: {
    fontSize: 14,
    color: "#6A1B9A",
    fontWeight: "600",
    marginBottom: 12,
  },
  companyDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  companySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  companySectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  productTag: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  productTagText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "500",
  },
  uspItem: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
    lineHeight: 20,
  },
  ceoName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  generateForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    marginBottom: 8,
    marginTop: 12,
  },
  formatSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  formatOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  formatOptionActive: {
    backgroundColor: "#F3E5F5",
    borderColor: "#6A1B9A",
  },
  formatOptionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  formatOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  formatOptionTextActive: {
    color: "#6A1B9A",
  },
  toneSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toneOption: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  toneOptionActive: {
    backgroundColor: "#F3E5F5",
    borderColor: "#6A1B9A",
  },
  toneOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  toneOptionTextActive: {
    color: "#6A1B9A",
  },
  topicInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#1A1A1A",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6A1B9A",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonEmoji: {
    fontSize: 20,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  disclaimer: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  articleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  articleHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  formatBadge: {
    backgroundColor: "#F3E5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  formatText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6A1B9A",
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  articleSubtitle: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 8,
  },
  articleDate: {
    fontSize: 11,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  previewModal: {
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalClose: {
    fontSize: 24,
    color: "#999",
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 8,
  },
  contentInput: {
    height: 200,
    textAlignVertical: "top",
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  typeOption: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeOptionActive: {
    backgroundColor: "#F3E5F5",
    borderColor: "#6A1B9A",
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  typeOptionTextActive: {
    color: "#6A1B9A",
  },
  saveButton: {
    backgroundColor: "#6A1B9A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  previewHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
    lineHeight: 28,
  },
  previewSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    lineHeight: 22,
    fontStyle: "italic",
  },
  previewMeta: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  previewAngle: {
    fontSize: 13,
    color: "#666",
  },
  previewContent: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewContentText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },
  previewAudience: {
    marginBottom: 16,
  },
  previewAudienceTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    marginBottom: 8,
  },
  audienceTag: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  audienceTagText: {
    fontSize: 12,
    color: "#1565C0",
    fontWeight: "500",
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#FFEBEE",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#C62828",
  },
  approveButton: {
    flex: 2,
    backgroundColor: "#43A047",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sendButton: {
    backgroundColor: "#1E88E5",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
