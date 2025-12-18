/**
 * AI Service for G-Press
 * Uses OpenAI GPT-4o-mini for article generation
 */

import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// TYPES
// ============================================

export interface ArticleInput {
  documents: Array<{
    name: string;
    content: string;
    category: string;
  }>;
  companyInfo: {
    name: string;
    ceo: string;
    products: string[];
    strengths: string[];
    industry: string;
  };
  format: "news_brief" | "deep_dive" | "interview" | "case_study" | "announcement";
  targetAudience?: string;
  tone?: "formal" | "conversational" | "technical";
}

export interface GeneratedArticle {
  title: string;
  subtitle: string;
  content: string;
  tags: string[];
  suggestedCategories: string[];
  estimatedReadTime: number;
}

// ============================================
// PROMPTS
// ============================================

const SYSTEM_PROMPT = `Sei un giornalista professionista esperto in comunicazione aziendale. 
Il tuo compito è scrivere articoli IMPARZIALI e NON PROMOZIONALI basati sui documenti forniti.

REGOLE FONDAMENTALI:
1. Scrivi come un giornalista indipendente, NON come un ufficio stampa
2. Usa un tono neutro e oggettivo
3. Presenta i fatti senza esagerazioni o superlative
4. Includi contesto di settore quando rilevante
5. Evita frasi come "leader di mercato", "il migliore", "rivoluzionario" a meno che non siano supportate da dati
6. Cita fonti e dati specifici quando disponibili
7. Scrivi in italiano professionale

FORMATI DISPONIBILI:
- news_brief: Notizia breve (300-500 parole), stile agenzia stampa
- deep_dive: Approfondimento (800-1200 parole), analisi dettagliata
- interview: Formato intervista con domande e risposte
- case_study: Caso studio con problema, soluzione, risultati
- announcement: Annuncio ufficiale con tutti i dettagli chiave`;

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  news_brief: `Scrivi una notizia breve (300-500 parole) in stile agenzia stampa.
Struttura: Lead (chi, cosa, quando, dove, perché) → Dettagli → Contesto → Citazione (se disponibile)`,
  
  deep_dive: `Scrivi un approfondimento (800-1200 parole) con analisi dettagliata.
Struttura: Introduzione → Contesto di mercato → Analisi → Implicazioni → Conclusioni`,
  
  interview: `Scrivi un articolo in formato intervista.
Struttura: Introduzione del soggetto → 5-7 domande con risposte → Conclusione`,
  
  case_study: `Scrivi un caso studio professionale.
Struttura: Sfida/Problema → Soluzione adottata → Risultati misurabili → Lezioni apprese`,
  
  announcement: `Scrivi un annuncio ufficiale completo.
Struttura: Headline → Lead → Dettagli chiave → Citazioni → Informazioni di contesto → Boilerplate`,
};

// ============================================
// ARTICLE GENERATION
// ============================================

export async function generateArticle(input: ArticleInput): Promise<GeneratedArticle> {
  // Build context from documents
  const documentsContext = input.documents
    .map(doc => `### ${doc.name} (${doc.category})\n${doc.content}`)
    .join("\n\n");

  // Build company context
  const companyContext = `
AZIENDA: ${input.companyInfo.name}
CEO: ${input.companyInfo.ceo}
SETTORE: ${input.companyInfo.industry}
PRODOTTI: ${input.companyInfo.products.join(", ")}
PUNTI DI FORZA: ${input.companyInfo.strengths.join(", ")}
`;

  const formatInstruction = FORMAT_INSTRUCTIONS[input.format] || FORMAT_INSTRUCTIONS.news_brief;
  const toneInstruction = input.tone === "formal" 
    ? "Usa un tono formale e istituzionale."
    : input.tone === "technical"
    ? "Usa un tono tecnico con terminologia di settore."
    : "Usa un tono professionale ma accessibile.";

  const userPrompt = `
${formatInstruction}

${toneInstruction}

${input.targetAudience ? `TARGET: ${input.targetAudience}` : ""}

INFORMAZIONI AZIENDA:
${companyContext}

DOCUMENTI DI RIFERIMENTO:
${documentsContext}

Genera un articolo giornalistico basato su queste informazioni.
Rispondi SOLO con un JSON valido nel seguente formato:
{
  "title": "Titolo dell'articolo",
  "subtitle": "Sottotitolo o sommario",
  "content": "Contenuto completo dell'articolo",
  "tags": ["tag1", "tag2", "tag3"],
  "suggestedCategories": ["categoria1", "categoria2"],
  "estimatedReadTime": 3
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    const article = JSON.parse(content) as GeneratedArticle;
    
    // Validate required fields
    if (!article.title || !article.content) {
      throw new Error("Invalid article structure from OpenAI");
    }

    return {
      title: article.title,
      subtitle: article.subtitle || "",
      content: article.content,
      tags: article.tags || [],
      suggestedCategories: article.suggestedCategories || [],
      estimatedReadTime: article.estimatedReadTime || Math.ceil(article.content.split(" ").length / 200),
    };
  } catch (error) {
    console.error("[AI] Error generating article:", error);
    throw error;
  }
}

// ============================================
// SUBJECT OPTIMIZATION
// ============================================

export async function optimizeSubject(
  originalSubject: string,
  historicalData: Array<{ subject: string; openRate: number }>
): Promise<string[]> {
  const historyContext = historicalData.length > 0
    ? `\nStorico oggetti email con tassi di apertura:\n${historicalData
        .map(h => `- "${h.subject}" → ${(h.openRate * 100).toFixed(1)}% aperture`)
        .join("\n")}`
    : "";

  const prompt = `Sei un esperto di email marketing per comunicati stampa.
Analizza questo oggetto email e suggerisci 3 alternative ottimizzate per massimizzare il tasso di apertura.

Oggetto originale: "${originalSubject}"
${historyContext}

REGOLE:
1. Mantieni il messaggio principale
2. Usa numeri quando possibile (aumentano aperture del 20%)
3. Evita parole spam (gratis, urgente, offerta)
4. Lunghezza ideale: 40-60 caratteri
5. Personalizza per giornalisti (non marketing consumer)

Rispondi SOLO con un JSON array di 3 stringhe:
["suggerimento1", "suggerimento2", "suggerimento3"]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [originalSubject];
    }

    const parsed = JSON.parse(content);
    const suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [originalSubject];
    
    return suggestions.slice(0, 3);
  } catch (error) {
    console.error("[AI] Error optimizing subject:", error);
    return [originalSubject];
  }
}
