import AsyncStorage from "@react-native-async-storage/async-storage";

const KB_DOCUMENTS_KEY = "gpress_kb_documents";
const KB_ARTICLES_KEY = "gpress_kb_articles";
const KB_COMPANY_INFO_KEY = "gpress_kb_company_info";

// ============================================
// KNOWLEDGE BASE - Document Storage
// ============================================

export interface KBDocument {
  id: string;
  name: string;
  type: "whitepaper" | "press_release" | "innovation" | "product" | "case_study" | "other";
  content: string;
  summary: string;
  keywords: string[];
  uploadedAt: string;
  fileSize: number;
}

export interface CompanyInfo {
  name: string;
  description: string;
  industry: string;
  foundedYear: string;
  headquarters: string;
  website: string;
  ceo: string;
  keyProducts: string[];
  uniqueSellingPoints: string[];
  recentNews: string[];
  boilerplate: string;
}

export interface GeneratedArticle {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  angle: string;
  format: "news_brief" | "feature" | "interview" | "case_study" | "announcement";
  targetAudience: string[];
  suggestedJournalists: string[];
  status: "draft" | "pending_review" | "approved" | "sent";
  createdAt: string;
  approvedAt?: string;
  sentAt?: string;
  basedOnDocuments: string[];
}

// Save company info
export async function saveCompanyInfo(info: CompanyInfo): Promise<void> {
  try {
    await AsyncStorage.setItem(KB_COMPANY_INFO_KEY, JSON.stringify(info));
  } catch (error) {
    console.error("Error saving company info:", error);
  }
}

// Get company info
export async function getCompanyInfo(): Promise<CompanyInfo | null> {
  try {
    const data = await AsyncStorage.getItem(KB_COMPANY_INFO_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting company info:", error);
    return null;
  }
}

// Save document to knowledge base
export async function saveDocument(doc: Omit<KBDocument, "id" | "uploadedAt" | "summary" | "keywords">): Promise<KBDocument> {
  try {
    const documents = await getDocuments();
    
    // Generate summary and keywords from content
    const summary = generateSummary(doc.content);
    const keywords = extractKeywords(doc.content);
    
    const newDoc: KBDocument = {
      ...doc,
      id: Date.now().toString(),
      uploadedAt: new Date().toISOString(),
      summary,
      keywords,
    };
    
    documents.push(newDoc);
    await AsyncStorage.setItem(KB_DOCUMENTS_KEY, JSON.stringify(documents));
    
    return newDoc;
  } catch (error) {
    console.error("Error saving document:", error);
    throw error;
  }
}

// Get all documents
export async function getDocuments(): Promise<KBDocument[]> {
  try {
    const data = await AsyncStorage.getItem(KB_DOCUMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting documents:", error);
    return [];
  }
}

// Delete document
export async function deleteDocument(id: string): Promise<void> {
  try {
    const documents = await getDocuments();
    const filtered = documents.filter(d => d.id !== id);
    await AsyncStorage.setItem(KB_DOCUMENTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting document:", error);
  }
}

// Generate summary from content
function generateSummary(content: string): string {
  // Take first 500 characters and find a good break point
  const maxLength = 500;
  if (content.length <= maxLength) return content;
  
  const truncated = content.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastNewline = truncated.lastIndexOf("\n");
  
  const breakPoint = Math.max(lastPeriod, lastNewline);
  return breakPoint > 200 ? truncated.substring(0, breakPoint + 1) : truncated + "...";
}

// Extract keywords from content
function extractKeywords(content: string): string[] {
  const stopWords = new Set([
    "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "a", "da", "in", "con", "su", "per",
    "tra", "fra", "e", "o", "ma", "che", "non", "si", "come", "più", "anche", "solo", "già", "ancora",
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  ]);
  
  const words = content.toLowerCase()
    .replace(/[^\w\sàèéìòù]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  // Count word frequency
  const wordCount: Record<string, number> = {};
  words.forEach(w => {
    wordCount[w] = (wordCount[w] || 0) + 1;
  });
  
  // Return top 10 keywords
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// ============================================
// AI ARTICLE GENERATOR
// ============================================

export interface ArticleRequest {
  topic?: string;
  format: GeneratedArticle["format"];
  tone: "neutral" | "enthusiastic" | "analytical" | "investigative";
  length: "short" | "medium" | "long";
  focusDocuments?: string[];
  targetCategory?: string;
}

// Generate article based on knowledge base
export async function generateArticle(request: ArticleRequest): Promise<GeneratedArticle> {
  const documents = await getDocuments();
  const companyInfo = await getCompanyInfo();
  
  // Select relevant documents
  let relevantDocs = documents;
  if (request.focusDocuments && request.focusDocuments.length > 0) {
    relevantDocs = documents.filter(d => request.focusDocuments!.includes(d.id));
  }
  
  // Build context from documents
  const context = buildContext(relevantDocs, companyInfo);
  
  // Generate article based on format and tone
  const article = createJournalisticArticle(context, request, companyInfo);
  
  // Save to storage
  const articles = await getGeneratedArticles();
  articles.push(article);
  await AsyncStorage.setItem(KB_ARTICLES_KEY, JSON.stringify(articles));
  
  return article;
}

// Get all generated articles
export async function getGeneratedArticles(): Promise<GeneratedArticle[]> {
  try {
    const data = await AsyncStorage.getItem(KB_ARTICLES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting articles:", error);
    return [];
  }
}

// Update article status
export async function updateArticleStatus(
  id: string, 
  status: GeneratedArticle["status"],
  additionalData?: Partial<GeneratedArticle>
): Promise<void> {
  try {
    const articles = await getGeneratedArticles();
    const index = articles.findIndex(a => a.id === id);
    if (index !== -1) {
      articles[index] = { ...articles[index], status, ...additionalData };
      await AsyncStorage.setItem(KB_ARTICLES_KEY, JSON.stringify(articles));
    }
  } catch (error) {
    console.error("Error updating article:", error);
  }
}

// Delete article
export async function deleteArticle(id: string): Promise<void> {
  try {
    const articles = await getGeneratedArticles();
    const filtered = articles.filter(a => a.id !== id);
    await AsyncStorage.setItem(KB_ARTICLES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting article:", error);
  }
}

// Build context from documents
function buildContext(docs: KBDocument[], companyInfo: CompanyInfo | null): string {
  let context = "";
  
  if (companyInfo) {
    context += `AZIENDA: ${companyInfo.name}\n`;
    context += `SETTORE: ${companyInfo.industry}\n`;
    context += `DESCRIZIONE: ${companyInfo.description}\n`;
    context += `PUNTI DI FORZA: ${companyInfo.uniqueSellingPoints.join(", ")}\n`;
    context += `PRODOTTI CHIAVE: ${companyInfo.keyProducts.join(", ")}\n\n`;
  }
  
  docs.forEach(doc => {
    context += `--- ${doc.name} (${doc.type}) ---\n`;
    context += doc.summary + "\n";
    context += `Keywords: ${doc.keywords.join(", ")}\n\n`;
  });
  
  return context;
}

// Create journalistic article (non-promotional, neutral tone)
function createJournalisticArticle(
  context: string,
  request: ArticleRequest,
  companyInfo: CompanyInfo | null
): GeneratedArticle {
  const companyName = companyInfo?.name || "l'azienda";
  const industry = companyInfo?.industry || "tecnologia";
  
  // Find newsworthy angles from context
  const angles = findNewsworthyAngles(context, companyInfo);
  const selectedAngle = angles[0] || "Innovazione nel settore";
  
  // Generate title based on format and angle
  const { title, subtitle } = generateTitle(selectedAngle, request.format, companyName);
  
  // Generate content based on format
  const content = generateContent(context, request, companyInfo, selectedAngle);
  
  // Determine target audience based on content
  const targetAudience = determineTargetAudience(context, industry);
  
  return {
    id: Date.now().toString(),
    title,
    subtitle,
    content,
    angle: selectedAngle,
    format: request.format,
    targetAudience,
    suggestedJournalists: [],
    status: "draft",
    createdAt: new Date().toISOString(),
    basedOnDocuments: [],
  };
}

// Find newsworthy angles from context
function findNewsworthyAngles(context: string, companyInfo: CompanyInfo | null): string[] {
  const angles: string[] = [];
  const contextLower = context.toLowerCase();
  
  // Check for innovation keywords
  if (contextLower.includes("innovazione") || contextLower.includes("innovation") || contextLower.includes("nuovo") || contextLower.includes("first")) {
    angles.push("Innovazione tecnologica");
  }
  
  // Check for growth/success
  if (contextLower.includes("crescita") || contextLower.includes("growth") || contextLower.includes("record") || contextLower.includes("successo")) {
    angles.push("Crescita e risultati");
  }
  
  // Check for sustainability
  if (contextLower.includes("sostenibil") || contextLower.includes("green") || contextLower.includes("ambiente") || contextLower.includes("climate")) {
    angles.push("Sostenibilità e impatto ambientale");
  }
  
  // Check for AI/tech
  if (contextLower.includes("intelligenza artificiale") || contextLower.includes("ai") || contextLower.includes("machine learning") || contextLower.includes("blockchain")) {
    angles.push("Frontiera tecnologica");
  }
  
  // Check for market/industry impact
  if (contextLower.includes("mercato") || contextLower.includes("industry") || contextLower.includes("settore") || contextLower.includes("trasformazione")) {
    angles.push("Impatto sul mercato");
  }
  
  // Default angle
  if (angles.length === 0) {
    angles.push("Novità dal settore " + (companyInfo?.industry || "tecnologico"));
  }
  
  return angles;
}

// Generate title based on angle and format
function generateTitle(angle: string, format: GeneratedArticle["format"], companyName: string): { title: string; subtitle: string } {
  const titles: Record<string, { title: string; subtitle: string }[]> = {
    "Innovazione tecnologica": [
      { title: `Come ${companyName} sta ridefinendo gli standard del settore`, subtitle: "Un'analisi delle nuove soluzioni che potrebbero cambiare il mercato" },
      { title: `La nuova frontiera dell'innovazione: cosa sta succedendo nel settore`, subtitle: "Uno sguardo alle tecnologie emergenti e ai player che le guidano" },
      { title: `Innovazione o rivoluzione? Il caso ${companyName}`, subtitle: "Analisi di una strategia che sta attirando l'attenzione degli esperti" },
    ],
    "Crescita e risultati": [
      { title: `Il settore in crescita: chi sono i protagonisti`, subtitle: "Numeri e trend che raccontano un mercato in evoluzione" },
      { title: `Quando i dati parlano: le performance che fanno notizia`, subtitle: "Un'analisi dei risultati che stanno emergendo nel settore" },
    ],
    "Sostenibilità e impatto ambientale": [
      { title: `Sostenibilità: da buzzword a strategia concreta`, subtitle: "Come le aziende stanno traducendo gli impegni green in azioni misurabili" },
      { title: `Il futuro verde del settore: sfide e opportunità`, subtitle: "Un'analisi delle iniziative che stanno ridisegnando il mercato" },
    ],
    "Frontiera tecnologica": [
      { title: `AI e business: oltre l'hype, cosa funziona davvero`, subtitle: "Un'analisi pragmatica delle applicazioni che stanno generando valore" },
      { title: `La tecnologia che sta cambiando le regole del gioco`, subtitle: "Uno sguardo alle innovazioni che potrebbero ridefinire il settore" },
    ],
    "Impatto sul mercato": [
      { title: `Mercato in movimento: i trend da tenere d'occhio`, subtitle: "Analisi delle dinamiche che stanno ridisegnando il settore" },
      { title: `Chi sta guidando il cambiamento nel settore`, subtitle: "I player e le strategie che stanno emergendo" },
    ],
  };
  
  const options = titles[angle] || titles["Innovazione tecnologica"];
  return options[Math.floor(Math.random() * options.length)];
}

// Generate content based on format
function generateContent(
  context: string,
  request: ArticleRequest,
  companyInfo: CompanyInfo | null,
  angle: string
): string {
  const companyName = companyInfo?.name || "l'azienda in questione";
  const industry = companyInfo?.industry || "tecnologia";
  
  // Extract key facts from context
  const facts = extractFacts(context);
  
  // Build article structure based on format
  let content = "";
  
  switch (request.format) {
    case "news_brief":
      content = generateNewsBrief(companyName, industry, facts, angle);
      break;
    case "feature":
      content = generateFeatureArticle(companyName, industry, facts, angle, companyInfo);
      break;
    case "interview":
      content = generateInterviewStyle(companyName, industry, facts, angle, companyInfo);
      break;
    case "case_study":
      content = generateCaseStudy(companyName, industry, facts, angle, companyInfo);
      break;
    case "announcement":
      content = generateAnnouncement(companyName, industry, facts, angle);
      break;
    default:
      content = generateNewsBrief(companyName, industry, facts, angle);
  }
  
  return content;
}

// Extract facts from context
function extractFacts(context: string): string[] {
  const facts: string[] = [];
  const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Look for sentences with numbers (likely facts)
  sentences.forEach(s => {
    if (/\d+/.test(s) && facts.length < 5) {
      facts.push(s.trim());
    }
  });
  
  // Look for sentences with key indicators
  const keyIndicators = ["primo", "first", "unico", "only", "leader", "innovativo", "nuovo", "record"];
  sentences.forEach(s => {
    const lower = s.toLowerCase();
    if (keyIndicators.some(k => lower.includes(k)) && facts.length < 8) {
      facts.push(s.trim());
    }
  });
  
  return facts;
}

// Generate news brief (short, factual)
function generateNewsBrief(companyName: string, industry: string, facts: string[], angle: string): string {
  return `Nel panorama del settore ${industry}, emergono sviluppi significativi che meritano attenzione. ${companyName} si inserisce in questo contesto con iniziative che potrebbero influenzare le dinamiche di mercato.

Secondo quanto emerge dai dati disponibili, ${facts[0] || "l'azienda sta implementando nuove strategie"}. Questo si inserisce in un trend più ampio che vede il settore ${industry} in fase di trasformazione.

Gli esperti del settore osservano con interesse questi sviluppi, che potrebbero avere ripercussioni significative per l'intero ecosistema. Resta da vedere come il mercato risponderà a queste novità nei prossimi mesi.

${facts[1] ? `\nDa segnalare inoltre: ${facts[1]}.` : ""}`;
}

// Generate feature article (in-depth)
function generateFeatureArticle(
  companyName: string, 
  industry: string, 
  facts: string[], 
  angle: string,
  companyInfo: CompanyInfo | null
): string {
  const ceo = companyInfo?.ceo || "il management";
  const products = companyInfo?.keyProducts?.join(", ") || "le soluzioni proposte";
  
  return `**Il contesto**

Il settore ${industry} sta attraversando una fase di profonda trasformazione. Tra i player che stanno emergendo in questo scenario, ${companyName} ha attirato l'attenzione degli osservatori per il suo approccio distintivo.

**I fatti**

${facts[0] || "L'azienda ha recentemente annunciato sviluppi significativi"}. Questo si inserisce in una strategia più ampia che punta a ${angle.toLowerCase()}.

${facts[1] ? `Particolarmente rilevante è il dato relativo a ${facts[1]}.` : "I numeri, pur non essendo stati divulgati nel dettaglio, sembrano indicare una traiettoria positiva."}

**L'analisi**

Cosa significa tutto questo per il mercato? Gli analisti sono divisi. Da un lato, c'è chi vede in questi sviluppi un segnale di maturazione del settore. Dall'altro, alcuni osservatori invitano alla cautela, ricordando che il ${industry} è notoriamente volatile.

${products !== "le soluzioni proposte" ? `\nTra i prodotti chiave dell'azienda figurano ${products}, che rappresentano il cuore dell'offerta.` : ""}

**Le prospettive**

Guardando al futuro, sarà interessante osservare come ${companyName} riuscirà a mantenere il momentum. Il mercato ${industry} è competitivo, e la capacità di innovare costantemente sarà determinante.

${facts[2] ? `\nUn ultimo dato da tenere a mente: ${facts[2]}.` : ""}`;
}

// Generate interview-style article
function generateInterviewStyle(
  companyName: string,
  industry: string,
  facts: string[],
  angle: string,
  companyInfo: CompanyInfo | null
): string {
  const ceo = companyInfo?.ceo || "il CEO";
  
  return `**Conversazione con ${ceo} di ${companyName}**

In un momento di grande fermento per il settore ${industry}, abbiamo avuto l'opportunità di approfondire la visione e la strategia di ${companyName}.

**Qual è la vostra lettura del mercato attuale?**

"Il settore ${industry} sta vivendo una fase di trasformazione senza precedenti. ${facts[0] || 'Vediamo opportunità significative per chi sa innovare'}. La nostra strategia si basa su ${angle.toLowerCase()}."

**Come vi posizionate rispetto alla concorrenza?**

"Non ci piace parlare di concorrenza in termini conflittuali. Preferiamo concentrarci su ciò che possiamo offrire di unico. ${facts[1] || 'Il nostro approccio si distingue per la capacità di anticipare le esigenze del mercato'}."

**Quali sono le sfide principali?**

"Come tutti nel settore, affrontiamo sfide legate all'evoluzione tecnologica e alle aspettative crescenti dei clienti. ${facts[2] || 'La chiave è rimanere agili e aperti al cambiamento'}."

**Cosa possiamo aspettarci nei prossimi mesi?**

"Stiamo lavorando su sviluppi importanti che preferiamo non anticipare. Posso dire che il nostro impegno verso ${angle.toLowerCase()} rimane al centro della nostra strategia."`;
}

// Generate case study
function generateCaseStudy(
  companyName: string,
  industry: string,
  facts: string[],
  angle: string,
  companyInfo: CompanyInfo | null
): string {
  const products = companyInfo?.keyProducts?.[0] || "la soluzione implementata";
  
  return `**Case Study: ${companyName} e l'approccio a ${angle}**

**Il contesto**

Nel competitivo mercato del ${industry}, le aziende sono costantemente alla ricerca di modi per differenziarsi. ${companyName} ha scelto di puntare su ${angle.toLowerCase()} come leva strategica.

**La sfida**

Come molte realtà del settore, l'azienda si trovava di fronte a sfide significative: ${facts[0] || "la necessità di innovare mantenendo la sostenibilità economica"}.

**La soluzione**

L'approccio adottato si è concentrato su ${products}. ${facts[1] || "L'implementazione ha richiesto un ripensamento dei processi esistenti"}.

**I risultati**

${facts[2] || "I primi risultati sembrano incoraggianti, anche se sarà necessario attendere per una valutazione definitiva"}.

**Le lezioni apprese**

Questo caso offre spunti interessanti per altre realtà del settore ${industry}. In particolare:

1. L'importanza di un approccio strutturato all'innovazione
2. La necessità di bilanciare ambizione e pragmatismo
3. Il valore della persistenza nel perseguire obiettivi di lungo termine

**Conclusioni**

Il percorso di ${companyName} dimostra che nel ${industry} c'è spazio per approcci innovativi. Resta da vedere se questo modello potrà essere replicato su scala più ampia.`;
}

// Generate announcement
function generateAnnouncement(companyName: string, industry: string, facts: string[], angle: string): string {
  return `**${companyName}: nuovi sviluppi nel settore ${industry}**

${companyName} ha annunciato sviluppi significativi che potrebbero avere impatto sul mercato ${industry}.

${facts[0] || "L'azienda ha comunicato l'avvio di nuove iniziative strategiche"}. Secondo fonti vicine all'azienda, questa mossa si inserisce in una strategia più ampia focalizzata su ${angle.toLowerCase()}.

${facts[1] ? `\nTra i dettagli emersi: ${facts[1]}.` : ""}

Il mercato ha accolto la notizia con interesse, anche se gli analisti attendono ulteriori dettagli prima di esprimere valutazioni definitive.

${facts[2] ? `\nDa notare inoltre: ${facts[2]}.` : ""}

Ulteriori aggiornamenti sono attesi nelle prossime settimane.`;
}

// Determine target audience
function determineTargetAudience(context: string, industry: string): string[] {
  const audiences: string[] = [];
  const contextLower = context.toLowerCase();
  
  if (contextLower.includes("tech") || contextLower.includes("tecnolog") || contextLower.includes("software") || contextLower.includes("digital")) {
    audiences.push("technology");
  }
  if (contextLower.includes("business") || contextLower.includes("impresa") || contextLower.includes("aziend") || contextLower.includes("mercato")) {
    audiences.push("business");
  }
  if (contextLower.includes("finanz") || contextLower.includes("invest") || contextLower.includes("capital")) {
    audiences.push("finance");
  }
  if (contextLower.includes("startup") || contextLower.includes("venture") || contextLower.includes("innovation")) {
    audiences.push("startup");
  }
  if (contextLower.includes("sostenibil") || contextLower.includes("green") || contextLower.includes("ambiente")) {
    audiences.push("sustainability");
  }
  
  if (audiences.length === 0) {
    audiences.push("general", industry);
  }
  
  return audiences;
}

// Get document type label
export function getDocumentTypeLabel(type: KBDocument["type"]): string {
  const labels: Record<KBDocument["type"], string> = {
    whitepaper: "Whitepaper",
    press_release: "Press Release",
    innovation: "Innovazione",
    product: "Prodotto",
    case_study: "Case Study",
    other: "Altro",
  };
  return labels[type] || type;
}

// Get format label
export function getFormatLabel(format: GeneratedArticle["format"]): string {
  const labels: Record<GeneratedArticle["format"], string> = {
    news_brief: "News Breve",
    feature: "Approfondimento",
    interview: "Intervista",
    case_study: "Case Study",
    announcement: "Annuncio",
  };
  return labels[format] || format;
}
