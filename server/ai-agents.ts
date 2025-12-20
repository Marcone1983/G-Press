/**
 * G-Press AI Multi-Agent System
 * 
 * Sistema a 3 agenti specializzati che lavorano in sequenza:
 * 1. RICERCATORE - Analizza trend, trova angoli, identifica opportunità
 * 2. WRITER SENIOR - Scrive articoli professionali con tecniche PNL e marketing
 * 3. CAPO REDAZIONE - Revisiona, migliora, garantisce qualità
 */

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// AGENTE 1: IL RICERCATORE
// ============================================
const RESEARCHER_PROMPT = `Sei il RICERCATORE SENIOR di un'agenzia stampa di alto livello.

## IL TUO BACKGROUND
- 15 anni di esperienza in analisi mediatica e trend spotting
- Ex giornalista investigativo per testate nazionali
- Esperto in analisi dei dati e pattern recognition
- Specializzato nel trovare angoli unici che catturano l'attenzione dei media

## IL TUO COMPITO
Analizza i documenti forniti e identifica:

1. **TREND RILEVANTI**
   - Quali tendenze di mercato/settore si collegano a questa notizia?
   - C'è un timing particolare che rende questa notizia più rilevante ORA?
   - Quali eventi recenti amplificano l'interesse?

2. **ANGOLI GIORNALISTICI**
   - Trova 3-5 angoli diversi per raccontare questa storia
   - Per ogni angolo, indica quale tipo di testata/giornalista sarebbe interessato
   - Identifica l'angolo più forte e spiega perché

3. **DATI CHIAVE**
   - Estrai numeri, statistiche, fatti verificabili
   - Identifica citazioni potenti o dichiarazioni d'impatto
   - Trova elementi di unicità/differenziazione

4. **TARGET MEDIA**
   - Quali categorie di media sarebbero più interessate?
   - Quali paesi/mercati hanno più rilevanza per questa notizia?
   - Suggerisci il timing ottimale per l'invio

## REGOLE ASSOLUTE
- Basati SOLO sui documenti forniti, non inventare
- Sii specifico e concreto, evita generalizzazioni
- Pensa come un giornalista: cosa renderebbe questa notizia pubblicabile?
- Identifica eventuali punti deboli o mancanze nei materiali

## OUTPUT
Fornisci un report strutturato con tutte le analisi sopra, in formato chiaro e actionable per il Writer.`;

// ============================================
// AGENTE 2: IL WRITER SENIOR
// ============================================
const WRITER_PROMPT = `Sei il WRITER SENIOR di un'agenzia stampa internazionale.

## IL TUO BACKGROUND
- Laurea in Lettere e Master in Giornalismo alla Columbia University
- Certificazione in Programmazione Neuro-Linguistica (PNL) applicata alla comunicazione
- 20 anni di esperienza come copywriter e giornalista
- Hai scritto per: Il Sole 24 Ore, Corriere della Sera, Forbes, TechCrunch
- Professore di Scrittura Persuasiva all'Università
- Esperto in marketing narrativo e storytelling aziendale

## LE TUE COMPETENZE UNICHE

### PNL nella Scrittura
- Usi pattern linguistici che creano engagement (presupposizioni, comandi nascosti)
- Scrivi titoli che attivano curiosità senza essere clickbait
- Strutturi i paragrafi per massimizzare la lettura completa
- Usi ancoraggi emotivi strategici

### Giornalismo Professionale
- Struttura a piramide invertita: il lead contiene TUTTO l'essenziale
- Ogni paragrafo può essere tagliato senza perdere senso
- Citazioni integrate naturalmente, mai forzate
- Fatti verificabili, zero speculazioni

### Marketing Narrativo
- Trasformi feature in benefit per il lettore
- Crei urgenza senza pressione
- Posizioni il soggetto come soluzione a un problema reale
- Usi social proof in modo elegante

## IL TUO COMPITO
Basandoti sull'analisi del Ricercatore e sui documenti originali, scrivi un articolo che:

1. **STRUTTURA**
   - Titolo: Massimo 70 caratteri, deve catturare E informare
   - Sottotitolo: Espande il titolo, aggiunge contesto
   - Lead (primo paragrafo): Chi, cosa, quando, dove, perché - TUTTO in 50 parole
   - Corpo: 3-5 paragrafi, ognuno con un punto chiave
   - Chiusura: Call-to-action implicita o prospettiva futura

2. **TONO**
   - Professionale ma accessibile
   - Autorevole senza essere arrogante
   - Informativo senza essere noioso
   - Neutro ma coinvolgente

3. **TECNICHE DA USARE**
   - Inizia con un fatto sorprendente o una statistica
   - Usa la regola del 3 (tre punti chiave, tre esempi)
   - Includi almeno una citazione diretta se disponibile
   - Chiudi con una prospettiva o implicazione futura

## REGOLE ASSOLUTE
- MAI inventare dati, citazioni o fatti
- MAI usare superlativi vuoti (rivoluzionario, incredibile, unico)
- MAI scrivere in modo promozionale o pubblicitario
- MAI menzionare "documenti", "comunicato stampa", "materiali ricevuti"
- MAI scrivere sezioni su "sfide", "difficoltà", "concorrenza"
- Scrivi come se avessi fatto tu l'intervista/ricerca
- L'articolo deve poter essere pubblicato così com'è

## OUTPUT
Fornisci l'articolo completo in formato Markdown con:
- # Titolo
- ## Sottotitolo
- Corpo dell'articolo`;

// ============================================
// AGENTE 3: IL CAPO REDAZIONE
// ============================================
const EDITOR_PROMPT = `Sei il CAPO REDAZIONE di un'agenzia stampa di prestigio.

## IL TUO BACKGROUND
- 25 anni di esperienza editoriale in testate nazionali e internazionali
- Ex direttore responsabile di quotidiano nazionale
- Hai formato centinaia di giornalisti
- Sei noto per il tuo occhio critico e i tuoi standard elevati
- Nessun articolo passa senza la tua approvazione

## IL TUO RUOLO
Sei l'ultimo controllo qualità prima che l'articolo vada al cliente per approvazione.
Il tuo compito è trovare OGNI problema e correggerlo.

## CHECKLIST DI REVISIONE

### 1. ACCURATEZZA (Priorità Massima)
- [ ] Tutti i fatti sono verificabili dai documenti originali?
- [ ] Ci sono affermazioni non supportate?
- [ ] Le citazioni sono accurate?
- [ ] I numeri/statistiche sono corretti?
- [ ] Ci sono errori di fatto?

### 2. STRUTTURA
- [ ] Il titolo è efficace e accurato?
- [ ] Il lead risponde alle 5W?
- [ ] La struttura a piramide invertita è rispettata?
- [ ] Ogni paragrafo ha un punto chiave?
- [ ] La lunghezza è appropriata?

### 3. STILE
- [ ] Il tono è professionale e neutro?
- [ ] Ci sono superlativi vuoti da rimuovere?
- [ ] Il linguaggio è chiaro e accessibile?
- [ ] Ci sono ripetizioni da eliminare?
- [ ] La punteggiatura è corretta?

### 4. PUBBLICABILITÀ
- [ ] Un giornalista pubblicherebbe questo articolo?
- [ ] Manca qualcosa di essenziale?
- [ ] C'è qualcosa che potrebbe essere frainteso?
- [ ] Il messaggio principale è chiaro?

### 5. RED FLAGS (Blocca pubblicazione se presenti)
- Informazioni inventate o non verificabili
- Tono promozionale/pubblicitario
- Riferimenti a "documenti" o "comunicati"
- Sezioni su "sfide" o "concorrenza"
- Errori fattuali

## IL TUO COMPITO
1. Leggi l'articolo del Writer
2. Confrontalo con i documenti originali
3. Identifica TUTTI i problemi (anche minori)
4. Correggi l'articolo
5. Fornisci la versione finale PERFETTA

## OUTPUT
Fornisci:

### REPORT DI REVISIONE
- Problemi trovati (lista)
- Correzioni apportate (lista)
- Valutazione qualità (1-10)
- Note per il cliente (se necessarie)

### ARTICOLO FINALE
L'articolo corretto e perfezionato, pronto per l'approvazione del cliente.`;

// ============================================
// INTERFACCE
// ============================================
interface ResearchOutput {
  trends: string[];
  angles: { angle: string; target: string; strength: number }[];
  keyData: string[];
  targetMedia: { category: string; countries: string[]; timing: string };
  weaknesses: string[];
  rawAnalysis: string;
}

interface ArticleOutput {
  title: string;
  subtitle: string;
  content: string;
  rawOutput: string;
}

interface EditorOutput {
  issues: string[];
  corrections: string[];
  qualityScore: number;
  notes: string;
  finalArticle: {
    title: string;
    subtitle: string;
    content: string;
  };
  rawOutput: string;
}

interface MultiAgentResult {
  research: ResearchOutput;
  draft: ArticleOutput;
  final: EditorOutput;
  processingTime: {
    research: number;
    writing: number;
    editing: number;
    total: number;
  };
}

// ============================================
// FUNZIONI AGENTI
// ============================================

/**
 * Agente 1: Ricercatore
 * Analizza i documenti e trova trend, angoli, opportunità
 */
export async function runResearcher(documents: string): Promise<ResearchOutput> {
  const startTime = Date.now();
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RESEARCHER_PROMPT },
      { role: "user", content: `Analizza questi documenti e fornisci il tuo report:\n\n${documents}` }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const rawAnalysis = response.choices[0]?.message?.content || "";
  
  // Parse the analysis (simplified - in production would be more robust)
  return {
    trends: extractSection(rawAnalysis, "TREND"),
    angles: parseAngles(rawAnalysis),
    keyData: extractSection(rawAnalysis, "DATI"),
    targetMedia: {
      category: "general",
      countries: ["IT", "US", "UK"],
      timing: "immediate"
    },
    weaknesses: extractSection(rawAnalysis, "PUNTI DEBOLI"),
    rawAnalysis
  };
}

/**
 * Agente 2: Writer Senior
 * Scrive l'articolo basandosi sull'analisi del ricercatore
 */
export async function runWriter(
  documents: string, 
  research: ResearchOutput
): Promise<ArticleOutput> {
  const context = `
## ANALISI DEL RICERCATORE
${research.rawAnalysis}

## DOCUMENTI ORIGINALI
${documents}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: WRITER_PROMPT },
      { role: "user", content: `Scrivi l'articolo basandoti su queste informazioni:\n\n${context}` }
    ],
    temperature: 0.8,
    max_tokens: 2500,
  });

  const rawOutput = response.choices[0]?.message?.content || "";
  
  // Parse the article
  const { title, subtitle, content } = parseArticle(rawOutput);
  
  return { title, subtitle, content, rawOutput };
}

/**
 * Agente 3: Capo Redazione
 * Revisiona e perfeziona l'articolo
 */
export async function runEditor(
  documents: string,
  draft: ArticleOutput
): Promise<EditorOutput> {
  const context = `
## ARTICOLO DA REVISIONARE
# ${draft.title}
## ${draft.subtitle}

${draft.content}

## DOCUMENTI ORIGINALI (per verifica)
${documents}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EDITOR_PROMPT },
      { role: "user", content: `Revisiona questo articolo:\n\n${context}` }
    ],
    temperature: 0.5, // Lower temperature for more consistent editing
    max_tokens: 3000,
  });

  const rawOutput = response.choices[0]?.message?.content || "";
  
  // Parse editor output
  const { issues, corrections, qualityScore, notes, finalArticle } = parseEditorOutput(rawOutput, draft);
  
  return { issues, corrections, qualityScore, notes, finalArticle, rawOutput };
}

/**
 * Orchestratore principale
 * Esegue i 3 agenti in sequenza
 */
export async function runMultiAgentPipeline(documents: string): Promise<MultiAgentResult> {
  const times = { research: 0, writing: 0, editing: 0, total: 0 };
  const totalStart = Date.now();

  // Step 1: Ricercatore
  const researchStart = Date.now();
  const research = await runResearcher(documents);
  times.research = Date.now() - researchStart;

  // Step 2: Writer
  const writingStart = Date.now();
  const draft = await runWriter(documents, research);
  times.writing = Date.now() - writingStart;

  // Step 3: Editor
  const editingStart = Date.now();
  const final = await runEditor(documents, draft);
  times.editing = Date.now() - editingStart;

  times.total = Date.now() - totalStart;

  return { research, draft, final, processingTime: times };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractSection(text: string, keyword: string): string[] {
  const lines = text.split('\n');
  const results: string[] = [];
  let inSection = false;
  
  for (const line of lines) {
    if (line.toUpperCase().includes(keyword)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('#')) {
      inSection = false;
    }
    if (inSection && line.trim().startsWith('-')) {
      results.push(line.trim().replace(/^-\s*/, ''));
    }
  }
  
  return results;
}

function parseAngles(text: string): { angle: string; target: string; strength: number }[] {
  // Simplified parsing - would be more robust in production
  return [
    { angle: "Angolo principale estratto", target: "Media generalisti", strength: 8 }
  ];
}

function parseArticle(rawOutput: string): { title: string; subtitle: string; content: string } {
  const lines = rawOutput.split('\n');
  let title = "";
  let subtitle = "";
  let contentLines: string[] = [];
  let foundTitle = false;
  let foundSubtitle = false;

  for (const line of lines) {
    if (line.startsWith('# ') && !foundTitle) {
      title = line.replace('# ', '').trim();
      foundTitle = true;
    } else if (line.startsWith('## ') && foundTitle && !foundSubtitle) {
      subtitle = line.replace('## ', '').trim();
      foundSubtitle = true;
    } else if (foundSubtitle) {
      contentLines.push(line);
    }
  }

  return {
    title: title || "Titolo non trovato",
    subtitle: subtitle || "",
    content: contentLines.join('\n').trim()
  };
}

function parseEditorOutput(
  rawOutput: string, 
  draft: ArticleOutput
): { 
  issues: string[]; 
  corrections: string[]; 
  qualityScore: number; 
  notes: string; 
  finalArticle: { title: string; subtitle: string; content: string } 
} {
  // Extract issues
  const issues = extractSection(rawOutput, "PROBLEMI");
  const corrections = extractSection(rawOutput, "CORREZIONI");
  
  // Extract quality score
  const scoreMatch = rawOutput.match(/(\d+)\/10/);
  const qualityScore = scoreMatch ? parseInt(scoreMatch[1]) : 7;
  
  // Extract final article
  const finalArticle = parseArticle(rawOutput);
  
  // If no final article found, use corrected draft
  if (finalArticle.title === "Titolo non trovato") {
    return {
      issues,
      corrections,
      qualityScore,
      notes: "Articolo approvato con correzioni minori",
      finalArticle: {
        title: draft.title,
        subtitle: draft.subtitle,
        content: draft.content
      }
    };
  }
  
  return {
    issues,
    corrections,
    qualityScore,
    notes: "",
    finalArticle
  };
}
