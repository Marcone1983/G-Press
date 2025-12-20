import React, { useState, useEffect, useRef } from 'react';
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
import { useTrainingExamples, useKnowledgeBase } from '@/hooks/use-d1-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  factCheckArticle,
  reviseText,
  semanticSearch,
  prepareTrainingData,
  listFineTuningJobs,
  listFineTunedModels,
  generateArticleStream,
  type Document,
  type RevisionType,
  type FactCheckResult,
  type SearchResult,
  type FineTuningJob,
} from '@/lib/vercel-api';

// Storage keys per fallback locale
const SELECTED_MODEL_KEY = 'gpress_selected_model';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StoredDocument extends Document {
  id: string;
  uploadedAt: string;
}

interface TrainingExample {
  id: string;
  prompt: string;
  completion: string;
  createdAt: string;
}

type ActiveTab = 'search' | 'factcheck' | 'revision' | 'streaming' | 'finetune';

export default function AIToolsScreen() {
  const insets = useSafeAreaInsets();
  
  // State
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // Fact-check state
  const [articleToCheck, setArticleToCheck] = useState('');
  const [factCheckResults, setFactCheckResults] = useState<FactCheckResult[]>([]);
  const [factCheckScore, setFactCheckScore] = useState<number | null>(null);
  
  // Revision state
  const [textToRevise, setTextToRevise] = useState('');
  const [revisedText, setRevisedText] = useState('');
  const [revisionType, setRevisionType] = useState<RevisionType>('improve');
  const [revisionSuggestions, setRevisionSuggestions] = useState<string[]>([]);
  
  // Streaming state
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Fine-tuning state
  const [trainingExamples, setTrainingExamples] = useState<TrainingExample[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newCompletion, setNewCompletion] = useState('');
  const [fineTuningJobs, setFineTuningJobs] = useState<FineTuningJob[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');
  
  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carica modello selezionato da locale (non critico)
      const modelJson = await AsyncStorage.getItem(SELECTED_MODEL_KEY);
      if (modelJson) setSelectedModel(modelJson);
      
      // I documenti e training examples vengono caricati da D1 tramite hooks
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Hook per training examples da D1
  const { 
    examples: d1TrainingExamples, 
    save: saveD1Example, 
    delete: deleteD1Example,
    loading: trainingLoading 
  } = useTrainingExamples();
  
  // Hook per documenti da D1
  const { 
    documents: d1Documents, 
    loading: docsLoading 
  } = useKnowledgeBase();
  
  // Sincronizza state locale con D1
  useEffect(() => {
    if (d1TrainingExamples.length > 0) {
      setTrainingExamples(d1TrainingExamples.map(e => ({
        id: String(e.id),
        prompt: e.prompt,
        completion: e.completion,
        createdAt: e.created_at,
      })));
    }
  }, [d1TrainingExamples]);
  
  useEffect(() => {
    if (d1Documents.length > 0) {
      setDocuments(d1Documents.map(d => ({
        id: String(d.id),
        name: d.title,
        category: d.category || 'general',
        content: d.content,
        uploadedAt: d.created_at,
      })));
    }
  }, [d1Documents]);

  const saveTrainingExamples = async (examples: TrainingExample[]) => {
    setTrainingExamples(examples);
    // Salva anche localmente come backup
    await AsyncStorage.setItem('gpress_training_examples_backup', JSON.stringify(examples));
  };

  // ============================================
  // SEMANTIC SEARCH
  // ============================================
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Errore', 'Inserisci una query di ricerca');
      return;
    }
    
    if (documents.length === 0) {
      Alert.alert('Errore', 'Carica prima dei documenti nella Knowledge Base');
      return;
    }

    setIsLoading(true);
    try {
      const response = await semanticSearch({
        query: searchQuery,
        documents: documents.map(d => ({
          name: d.name,
          category: d.category,
          content: d.content,
        })),
      });
      
      if (response.success) {
        setSearchResults(response.results);
        if (response.results.length === 0) {
          Alert.alert('Nessun risultato', 'Nessun documento corrisponde alla tua ricerca');
        }
      }
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Ricerca fallita');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // FACT-CHECKING
  // ============================================
  
  const handleFactCheck = async () => {
    if (!articleToCheck.trim()) {
      Alert.alert('Errore', 'Inserisci un articolo da verificare');
      return;
    }
    
    if (documents.length === 0) {
      Alert.alert('Errore', 'Carica prima dei documenti nella Knowledge Base per la verifica');
      return;
    }

    setIsLoading(true);
    try {
      const response = await factCheckArticle({
        article: articleToCheck,
        documents: documents.map(d => ({
          name: d.name,
          category: d.category,
          content: d.content,
        })),
      });
      
      if (response.success) {
        setFactCheckResults(response.facts);
        setFactCheckScore(response.overallScore);
      }
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Verifica fallita');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // INLINE REVISION
  // ============================================
  
  const handleRevise = async () => {
    if (!textToRevise.trim()) {
      Alert.alert('Errore', 'Inserisci del testo da revisionare');
      return;
    }

    setIsLoading(true);
    try {
      const response = await reviseText({
        text: textToRevise,
        type: revisionType,
      });
      
      if (response.success) {
        setRevisedText(response.revised);
        setRevisionSuggestions(response.suggestions);
      }
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Revisione fallita');
    } finally {
      setIsLoading(false);
    }
  };

  const revisionTypes: { type: RevisionType; label: string; icon: string }[] = [
    { type: 'improve', label: 'Migliora', icon: '✨' },
    { type: 'formal', label: 'Formale', icon: '👔' },
    { type: 'informal', label: 'Informale', icon: '😊' },
    { type: 'shorter', label: 'Più corto', icon: '✂️' },
    { type: 'longer', label: 'Più lungo', icon: '📝' },
    { type: 'rewrite_paragraph', label: 'Riscrivi', icon: '🔄' },
  ];

  // ============================================
  // STREAMING GENERATION
  // ============================================
  
  const handleStreamGenerate = async () => {
    if (documents.length === 0) {
      Alert.alert('Errore', 'Carica prima dei documenti nella Knowledge Base');
      return;
    }

    setIsStreaming(true);
    setStreamingText('');
    
    try {
      await generateArticleStream(
        {
          documents: documents.map(d => ({
            name: d.name,
            category: d.category,
            content: d.content,
          })),
          companyInfo: {
            name: 'Azienda',
            ceo: '',
            industry: '',
          },
          format: 'news_brief',
          fineTunedModel: selectedModel !== 'gpt-4o-mini' ? selectedModel : undefined,
        },
        (chunk) => {
          setStreamingText(prev => prev + chunk);
        },
        () => {
          setIsStreaming(false);
        },
        (error) => {
          Alert.alert('Errore', error);
          setIsStreaming(false);
        }
      );
    } catch (error: any) {
      Alert.alert('Errore', error.message);
      setIsStreaming(false);
    }
  };

  // ============================================
  // FINE-TUNING
  // ============================================
  
  const handleAddTrainingExample = async () => {
    if (!newPrompt.trim() || !newCompletion.trim()) {
      Alert.alert('Errore', 'Inserisci sia il prompt che la risposta');
      return;
    }

    try {
      // Salva su D1 (persistente)
      await saveD1Example({
        prompt: newPrompt,
        completion: newCompletion,
        category: 'general',
      });
      
      setNewPrompt('');
      setNewCompletion('');
      Alert.alert('Successo', 'Esempio salvato su cloud!');
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile salvare');
    }
  };

  const handleDeleteExample = async (id: string) => {
    try {
      // Elimina da D1
      await deleteD1Example(parseInt(id));
    } catch (error: any) {
      // Fallback: elimina solo localmente
      await saveTrainingExamples(trainingExamples.filter(e => e.id !== id));
    }
  };

  const handlePrepareTraining = async () => {
    if (trainingExamples.length < 10) {
      Alert.alert('Errore', `Servono almeno 10 esempi per il fine-tuning. Hai ${trainingExamples.length} esempi.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await prepareTrainingData(
        trainingExamples.map(e => ({
          prompt: e.prompt,
          completion: e.completion,
        }))
      );
      
      if (response.success) {
        Alert.alert(
          'Training Data Pronto',
          `${response.exampleCount} esempi preparati.\nCosto stimato: ${response.estimatedCost}\n\n${response.instructions.join('\n')}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Errore', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadJobs = async () => {
    setIsLoading(true);
    try {
      const [jobsResponse, modelsResponse] = await Promise.all([
        listFineTuningJobs(),
        listFineTunedModels(),
      ]);
      
      if (jobsResponse.success) {
        setFineTuningJobs(jobsResponse.jobs);
      }
      if (modelsResponse.success) {
        setAvailableModels(['gpt-4o-mini', ...modelsResponse.models.map(m => m.id)]);
      }
    } catch (error: any) {
      Alert.alert('Errore', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#34C759';
      case 'unverified': return '#FF9500';
      case 'inconsistent': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'verified': return 'Verificato';
      case 'unverified': return 'Non verificato';
      case 'inconsistent': return 'Inconsistente';
      default: return 'Non trovato';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Tools</Text>
        <Text style={styles.subtitle}>Strumenti avanzati</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        <View style={styles.tabs}>
          {[
            { id: 'search' as ActiveTab, label: '🔍 Ricerca', icon: '🔍' },
            { id: 'factcheck' as ActiveTab, label: '✓ Fact-Check', icon: '✓' },
            { id: 'revision' as ActiveTab, label: '✏️ Revisione', icon: '✏️' },
            { id: 'streaming' as ActiveTab, label: '⚡ Streaming', icon: '⚡' },
            { id: 'finetune' as ActiveTab, label: '🎯 Fine-Tune', icon: '🎯' },
          ].map(tab => (
            <Pressable
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SEMANTIC SEARCH */}
        {activeTab === 'search' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ricerca Semantica</Text>
            <Text style={styles.sectionSubtitle}>
              Cerca nei tuoi documenti usando l'intelligenza artificiale
            </Text>
            
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Es. Quali sono i vantaggi del prodotto?"
              multiline
            />
            
            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>🔍 Cerca</Text>
              )}
            </Pressable>

            {searchResults.length > 0 && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>Risultati ({searchResults.length})</Text>
                {searchResults.map((result, index) => (
                  <View key={index} style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultDocName}>{result.documentName}</Text>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>{result.relevanceScore}%</Text>
                      </View>
                    </View>
                    <Text style={styles.resultExcerpt}>{result.relevantExcerpt}</Text>
                    <Text style={styles.resultReason}>{result.matchReason}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* FACT-CHECKING */}
        {activeTab === 'factcheck' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fact-Checking AI</Text>
            <Text style={styles.sectionSubtitle}>
              Verifica le affermazioni di un articolo contro i documenti fonte
            </Text>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              value={articleToCheck}
              onChangeText={setArticleToCheck}
              placeholder="Incolla qui l'articolo da verificare..."
              multiline
              numberOfLines={6}
            />
            
            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleFactCheck}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>✓ Verifica Fatti</Text>
              )}
            </Pressable>

            {factCheckScore !== null && (
              <View style={styles.scoreCard}>
                <Text style={styles.scoreLabel}>Punteggio Affidabilità</Text>
                <Text style={[styles.scoreBig, { color: factCheckScore >= 70 ? '#34C759' : factCheckScore >= 40 ? '#FF9500' : '#FF3B30' }]}>
                  {factCheckScore}%
                </Text>
              </View>
            )}

            {factCheckResults.length > 0 && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>Affermazioni Verificate</Text>
                {factCheckResults.map((fact, index) => (
                  <View key={index} style={styles.factCard}>
                    <View style={[styles.factStatus, { backgroundColor: getStatusColor(fact.status) }]}>
                      <Text style={styles.factStatusText}>{getStatusLabel(fact.status)}</Text>
                    </View>
                    <Text style={styles.factClaim}>"{fact.claim}"</Text>
                    {fact.source && <Text style={styles.factSource}>Fonte: {fact.source}</Text>}
                    {fact.note && <Text style={styles.factNote}>{fact.note}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* INLINE REVISION */}
        {activeTab === 'revision' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revisione AI</Text>
            <Text style={styles.sectionSubtitle}>
              Migliora il tuo testo con suggerimenti AI
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.revisionTypes}>
              {revisionTypes.map(rt => (
                <Pressable
                  key={rt.type}
                  style={[styles.revisionChip, revisionType === rt.type && styles.revisionChipActive]}
                  onPress={() => setRevisionType(rt.type)}
                >
                  <Text style={styles.revisionChipIcon}>{rt.icon}</Text>
                  <Text style={[styles.revisionChipText, revisionType === rt.type && styles.revisionChipTextActive]}>
                    {rt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            
            <TextInput
              style={[styles.input, styles.textArea]}
              value={textToRevise}
              onChangeText={setTextToRevise}
              placeholder="Inserisci il testo da revisionare..."
              multiline
              numberOfLines={6}
            />
            
            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRevise}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>✏️ Revisiona</Text>
              )}
            </Pressable>

            {revisedText && (
              <View style={styles.revisionResult}>
                <Text style={styles.revisionResultTitle}>Testo Revisionato</Text>
                <Text style={styles.revisionResultText}>{revisedText}</Text>
                
                {revisionSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsTitle}>Suggerimenti</Text>
                    {revisionSuggestions.map((suggestion, index) => (
                      <Text key={index} style={styles.suggestionItem}>• {suggestion}</Text>
                    ))}
                  </View>
                )}
                
                <Pressable
                  style={styles.copyButton}
                  onPress={() => {
                    setTextToRevise(revisedText);
                    setRevisedText('');
                    Alert.alert('Copiato', 'Testo copiato nel campo di input');
                  }}
                >
                  <Text style={styles.copyButtonText}>📋 Usa questo testo</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* STREAMING GENERATION */}
        {activeTab === 'streaming' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Generazione Streaming</Text>
            <Text style={styles.sectionSubtitle}>
              Guarda l'AI scrivere in tempo reale
            </Text>
            
            <Pressable
              style={[styles.button, isStreaming && styles.buttonDisabled]}
              onPress={handleStreamGenerate}
              disabled={isStreaming}
            >
              {isStreaming ? (
                <View style={styles.streamingIndicator}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.buttonText}> Generazione in corso...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>⚡ Genera con Streaming</Text>
              )}
            </Pressable>

            {streamingText && (
              <View style={styles.streamingResult}>
                <Text style={styles.streamingText}>{streamingText}</Text>
                {isStreaming && <Text style={styles.cursor}>|</Text>}
              </View>
            )}
          </View>
        )}

        {/* FINE-TUNING */}
        {activeTab === 'finetune' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fine-Tuning</Text>
            <Text style={styles.sectionSubtitle}>
              Addestra l'AI sul tuo stile di scrittura
            </Text>
            
            {/* Add Training Example */}
            <View style={styles.trainingForm}>
              <Text style={styles.formLabel}>Nuovo Esempio di Training</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newPrompt}
                onChangeText={setNewPrompt}
                placeholder="Prompt (es. Scrivi un articolo su...)"
                multiline
                numberOfLines={3}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newCompletion}
                onChangeText={setNewCompletion}
                placeholder="Risposta ideale (l'articolo come lo vuoi tu)"
                multiline
                numberOfLines={5}
              />
              <Pressable style={styles.addButton} onPress={handleAddTrainingExample}>
                <Text style={styles.addButtonText}>+ Aggiungi Esempio</Text>
              </Pressable>
            </View>

            {/* Training Examples List */}
            <View style={styles.examplesContainer}>
              <Text style={styles.examplesTitle}>
                Esempi di Training ({trainingExamples.length}/10 minimi)
              </Text>
              {trainingExamples.map(example => (
                <View key={example.id} style={styles.exampleCard}>
                  <Text style={styles.examplePrompt} numberOfLines={2}>
                    📝 {example.prompt}
                  </Text>
                  <Text style={styles.exampleCompletion} numberOfLines={2}>
                    ✓ {example.completion}
                  </Text>
                  <Pressable
                    style={styles.deleteExample}
                    onPress={() => handleDeleteExample(example.id)}
                  >
                    <Text style={styles.deleteExampleText}>🗑️</Text>
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Prepare Training */}
            <Pressable
              style={[styles.button, styles.trainButton, (isLoading || trainingExamples.length < 10) && styles.buttonDisabled]}
              onPress={handlePrepareTraining}
              disabled={isLoading || trainingExamples.length < 10}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>🎯 Prepara Training Data</Text>
              )}
            </Pressable>

            {/* Jobs & Models */}
            <Pressable style={styles.loadJobsButton} onPress={handleLoadJobs}>
              <Text style={styles.loadJobsText}>🔄 Carica Jobs & Modelli</Text>
            </Pressable>

            {fineTuningJobs.length > 0 && (
              <View style={styles.jobsContainer}>
                <Text style={styles.jobsTitle}>Fine-Tuning Jobs</Text>
                {fineTuningJobs.map(job => (
                  <View key={job.id} style={styles.jobCard}>
                    <Text style={styles.jobId}>{job.id}</Text>
                    <View style={[styles.jobStatus, { backgroundColor: job.status === 'succeeded' ? '#34C759' : job.status === 'failed' ? '#FF3B30' : '#FF9500' }]}>
                      <Text style={styles.jobStatusText}>{job.status}</Text>
                    </View>
                    {job.fineTunedModel && (
                      <Text style={styles.jobModel}>Modello: {job.fineTunedModel}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {availableModels.length > 1 && (
              <View style={styles.modelsContainer}>
                <Text style={styles.modelsTitle}>Seleziona Modello</Text>
                {availableModels.map(model => (
                  <Pressable
                    key={model}
                    style={[styles.modelOption, selectedModel === model && styles.modelOptionActive]}
                    onPress={async () => {
                      setSelectedModel(model);
                      await AsyncStorage.setItem(SELECTED_MODEL_KEY, model);
                    }}
                  >
                    <Text style={[styles.modelOptionText, selectedModel === model && styles.modelOptionTextActive]}>
                      {model === 'gpt-4o-mini' ? '🤖 GPT-4o Mini (Default)' : `🎯 ${model}`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resultsContainer: {
    marginTop: 24,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultDocName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  scoreBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  resultExcerpt: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  resultReason: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  scoreCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scoreBig: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  factCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  factStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  factStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  factClaim: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  factSource: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  factNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  revisionTypes: {
    marginBottom: 16,
  },
  revisionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  revisionChipActive: {
    backgroundColor: '#007AFF',
  },
  revisionChipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  revisionChipText: {
    fontSize: 13,
    color: '#666',
  },
  revisionChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  revisionResult: {
    marginTop: 24,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
  },
  revisionResultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  revisionResultText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  suggestionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  suggestionItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  copyButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamingResult: {
    marginTop: 24,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  streamingText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
  },
  cursor: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  trainingForm: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#34C759',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  examplesContainer: {
    marginBottom: 24,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  exampleCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    position: 'relative',
  },
  examplePrompt: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 4,
  },
  exampleCompletion: {
    fontSize: 13,
    color: '#34C759',
  },
  deleteExample: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  deleteExampleText: {
    fontSize: 16,
  },
  trainButton: {
    backgroundColor: '#FF9500',
  },
  loadJobsButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  loadJobsText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  jobsContainer: {
    marginTop: 20,
  },
  jobsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  jobCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  jobId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  jobStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  jobStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  jobModel: {
    fontSize: 12,
    color: '#007AFF',
  },
  modelsContainer: {
    marginTop: 20,
  },
  modelsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  modelOption: {
    padding: 14,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 8,
  },
  modelOptionActive: {
    backgroundColor: '#007AFF',
  },
  modelOptionText: {
    fontSize: 14,
    color: '#333',
  },
  modelOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
