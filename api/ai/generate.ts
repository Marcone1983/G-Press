import OpenAI from 'openai';

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

## IL TUO COMPITO
Analizza ATTENTAMENTE i documenti forniti e estrai:

1. **FATTI CHIAVE** - Elenca TUTTI i fatti concreti presenti nei documenti
2. **NUMERI E DATI** - Estrai TUTTE le statistiche, date, cifre
3. **CITAZIONI** - Estrai citazioni dirette se presenti
4. **ANGOLO PRINCIPALE** - Qual è la notizia principale?
5. **ELEMENTI UNICI** - Cosa rende questa storia interessante?

## REGOLE ASSOLUTE
- Estrai SOLO informazioni presenti nei documenti
- NON inventare NULLA
- NON aggiungere interpretazioni
- Sii preciso e letterale

Rispondi in formato strutturato.`;

// ============================================
// AGENTE 2: IL WRITER SENIOR
// ============================================
const WRITER_PROMPT = `Sei il WRITER SENIOR di un'agenzia stampa internazionale.

## IL TUO BACKGROUND
- Laurea in Lettere e Master in Giornalismo
- Certificazione in PNL applicata alla comunicazione
- 20 anni di esperienza come copywriter e giornalista
- Professore di Scrittura Persuasiva

## IL TUO COMPITO
Scrivi un articolo giornalistico basandoti ESCLUSIVAMENTE sull'analisi del Ricercatore.

## STRUTTURA OBBLIGATORIA
- **Titolo**: Massimo 70 caratteri, informativo
- **Sottotitolo**: Espande il titolo
- **Lead**: Chi, cosa, quando, dove, perché in 50 parole
- **Corpo**: 3-5 paragrafi con fatti concreti
- **Chiusura**: Prospettiva futura neutra

## REGOLE ASSOLUTE
- USA SOLO le informazioni dall'analisi del Ricercatore
- MAI inventare dati, citazioni o fatti
- MAI usare superlativi (rivoluzionario, incredibile, unico)
- MAI scrivere in modo promozionale
- MAI menzionare "documenti", "comunicato stampa", "materiali"
- MAI scrivere sezioni su "sfide", "difficoltà", "concorrenza"
- Scrivi come se avessi fatto tu la ricerca
- Tono neutro e professionale`;

// ============================================
// AGENTE 3: IL CAPO REDAZIONE
// ============================================
const EDITOR_PROMPT = `Sei il CAPO REDAZIONE di un'agenzia stampa di prestigio.

## IL TUO BACKGROUND
- 25 anni di esperienza editoriale
- Ex direttore responsabile di quotidiano nazionale
- Standard elevatissimi - nessun errore passa

## IL TUO COMPITO
Revisiona l'articolo del Writer e:

1. **VERIFICA ACCURATEZZA** - Ogni fatto è presente nei documenti originali?
2. **ELIMINA INVENZIONI** - Rimuovi qualsiasi cosa non supportata dai documenti
3. **CORREGGI STILE** - Rimuovi superlativi, tono promozionale
4. **MIGLIORA STRUTTURA** - Assicurati che il lead contenga l'essenziale

## RED FLAGS DA CORREGGERE
- Informazioni inventate → RIMUOVI
- Tono promozionale → RENDI NEUTRO
- Riferimenti a "documenti" → RIMUOVI
- Sezioni su "sfide/concorrenza" → RIMUOVI
- Superlativi vuoti → RIMUOVI

## OUTPUT
Fornisci l'articolo FINALE corretto, pronto per la pubblicazione.
Rispondi SOLO con JSON:
{"title": "...", "subtitle": "...", "content": "..."}`;

interface Document {
  name: string;
  category: string;
  content: string;
}

interface CompanyInfo {
  name: string;
  ceo: string;
  industry: string;
  products?: string[];
  strengths?: string[];
}

interface RequestBody {
  documents: Document[];
  companyInfo: CompanyInfo;
  format: string;
  targetAudience?: string;
  tone?: string;
}

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { documents, companyInfo, format, targetAudience, tone } = body;

    if (!documents || !companyInfo || !format) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepara il contesto dai documenti
    const documentsText = documents
      .map((doc) => `=== ${doc.name} (${doc.category}) ===\n${doc.content}`)
      .join('\n\n');

    const companyText = `
AZIENDA: ${companyInfo.name}
CEO: ${companyInfo.ceo}
SETTORE: ${companyInfo.industry}
PRODOTTI/SERVIZI: ${companyInfo.products?.join(', ') || 'N/A'}
CARATTERISTICHE: ${companyInfo.strengths?.join(', ') || 'N/A'}`;

    const fullContext = `${companyText}\n\n${documentsText}`;

    // ============================================
    // STEP 1: RICERCATORE - Analizza i documenti
    // ============================================
    console.log('[AI Generate] Step 1: Ricercatore analizza documenti...');
    
    const researchResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RESEARCHER_PROMPT },
        { role: 'user', content: `Analizza questi documenti e estrai tutte le informazioni:\n\n${fullContext}` }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const researchAnalysis = researchResponse.choices[0]?.message?.content || '';
    console.log('[AI Generate] Ricercatore completato');

    // ============================================
    // STEP 2: WRITER - Scrive l'articolo
    // ============================================
    console.log('[AI Generate] Step 2: Writer scrive articolo...');

    const formatInstructions: Record<string, string> = {
      news_brief: 'Scrivi una notizia breve (300-500 parole).',
      deep_dive: 'Scrivi un approfondimento (800-1200 parole).',
      interview: 'Scrivi un articolo in formato intervista.',
      case_study: 'Scrivi un caso studio.',
      announcement: 'Scrivi un annuncio ufficiale.',
    };

    const writerPrompt = `
${WRITER_PROMPT}

## FORMATO RICHIESTO
${formatInstructions[format] || formatInstructions.news_brief}
${tone === 'formal' ? 'Tono formale.' : tone === 'technical' ? 'Tono tecnico.' : 'Tono professionale.'}
${targetAudience ? `Target: ${targetAudience}` : ''}

## ANALISI DEL RICERCATORE (USA SOLO QUESTE INFORMAZIONI)
${researchAnalysis}

Scrivi l'articolo. Rispondi SOLO con JSON:
{"title": "...", "subtitle": "...", "content": "..."}`;

    const writerResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sei un writer professionista. Rispondi SOLO in JSON valido.' },
        { role: 'user', content: writerPrompt }
      ],
      temperature: 0.6,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const draftArticle = JSON.parse(writerResponse.choices[0]?.message?.content || '{}');
    console.log('[AI Generate] Writer completato');

    // ============================================
    // STEP 3: CAPO REDAZIONE - Revisiona
    // ============================================
    console.log('[AI Generate] Step 3: Capo Redazione revisiona...');

    const editorPrompt = `
${EDITOR_PROMPT}

## DOCUMENTI ORIGINALI (per verifica)
${fullContext}

## ANALISI DEL RICERCATORE
${researchAnalysis}

## ARTICOLO DA REVISIONARE
Titolo: ${draftArticle.title}
Sottotitolo: ${draftArticle.subtitle}
Contenuto: ${draftArticle.content}

Revisiona e correggi. Rispondi SOLO con JSON:
{"title": "...", "subtitle": "...", "content": "..."}`;

    const editorResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sei un capo redazione. Revisiona e correggi. Rispondi SOLO in JSON valido.' },
        { role: 'user', content: editorPrompt }
      ],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const finalArticle = JSON.parse(editorResponse.choices[0]?.message?.content || '{}');
    console.log('[AI Generate] Capo Redazione completato');

    // Calcola tempo lettura
    const wordCount = (finalArticle.content || '').split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    return new Response(JSON.stringify({
      success: true,
      article: {
        title: finalArticle.title || draftArticle.title || 'Titolo',
        subtitle: finalArticle.subtitle || draftArticle.subtitle || '',
        content: finalArticle.content || draftArticle.content || '',
        tags: [],
        suggestedCategories: [companyInfo.industry],
        estimatedReadTime: readTime,
      },
      pipeline: {
        research: researchAnalysis.substring(0, 500) + '...',
        draft: draftArticle.title,
        final: finalArticle.title,
      },
      usage: {
        research: researchResponse.usage,
        writer: writerResponse.usage,
        editor: editorResponse.usage,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[AI Generate] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: 'Failed to generate article',
      message: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
