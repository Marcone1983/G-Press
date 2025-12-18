import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Sei un giornalista professionista che scrive articoli per testate di primo livello.

REGOLE OBBLIGATORIE - VIOLAZIONI NON TOLLERATE:

1. USA SOLO LE INFORMAZIONI FORNITE
   - NON inventare MAI concorrenti, competitor o aziende rivali
   - NON inventare MAI dati, statistiche o numeri non presenti nelle info fornite
   - NON inventare MAI partnership, collaborazioni o relazioni commerciali
   - Se non hai un'informazione, NON la includere

2. TONO E STILE
   - Scrivi come un giornalista indipendente che riporta fatti
   - Tono neutro e professionale, MAI promozionale
   - MAI usare superlativi (migliore, leader, rivoluzionario) senza dati a supporto
   - Scrivi in italiano professionale

3. CONTENUTI VIETATI - NON SCRIVERE MAI:
   - Sezioni "Sfide", "Difficoltà", "Problemi", "Ostacoli"
   - Confronti con concorrenti (Meta, Epic Games, Roblox, etc.)
   - Speculazioni su difficoltà future dell'azienda
   - Frasi tipo "dovrà affrontare", "le sfide includono", "i rischi sono"
   - Qualsiasi riferimento negativo o critico non presente nelle info fornite

4. RIFERIMENTI ALLE FONTI
   - NON dire MAI "secondo i documenti", "come riportato", "dal comunicato"
   - NON nominare MAI la parola "documento" o "comunicato stampa"
   - Presenta le informazioni come fatti verificati dal giornalista
   - Scrivi come se avessi fatto tu la ricerca

5. STRUTTURA
   - Titolo accattivante e informativo
   - Sottotitolo che espande il titolo
   - Contenuto con fatti concreti
   - Chiusura neutra senza speculazioni

RICORDA: Se non hai informazioni su qualcosa, NON inventarla. Meglio un articolo più corto ma accurato.`;

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
  // CORS headers
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

    // Build context from documents (without labeling them as "documents")
    const infoContext = documents
      .map((doc) => doc.content)
      .join('\n\n');

    const companyContext = 
      "AZIENDA: " + companyInfo.name + "\n" +
      "CEO: " + companyInfo.ceo + "\n" +
      "SETTORE: " + companyInfo.industry + "\n" +
      "PRODOTTI/SERVIZI: " + (companyInfo.products?.join(', ') || 'N/A') + "\n" +
      "CARATTERISTICHE: " + (companyInfo.strengths?.join(', ') || 'N/A');

    const formatInstructions: Record<string, string> = {
      news_brief: 'Scrivi una notizia breve (300-500 parole) in stile agenzia stampa.',
      deep_dive: 'Scrivi un approfondimento (800-1200 parole) con analisi dettagliata.',
      interview: 'Scrivi un articolo in formato intervista con 5-7 domande.',
      case_study: 'Scrivi un caso studio focalizzato sui risultati ottenuti.',
      announcement: 'Scrivi un annuncio ufficiale completo.',
    };

    const toneInstruction = tone === 'formal' 
      ? 'Usa un tono formale.' 
      : tone === 'technical' 
        ? 'Usa un tono tecnico.' 
        : 'Usa un tono professionale ma accessibile.';

    const targetInstruction = targetAudience ? "TARGET LETTORI: " + targetAudience : '';

    const userPrompt = 
      (formatInstructions[format] || formatInstructions.news_brief) + "\n\n" +
      toneInstruction + "\n\n" +
      targetInstruction + "\n\n" +
      "INFORMAZIONI AZIENDA:\n" + companyContext + "\n\n" +
      "INFORMAZIONI DISPONIBILI:\n" + infoContext + "\n\n" +
      "Genera un articolo giornalistico basato ESCLUSIVAMENTE sulle informazioni sopra. " +
      "NON inventare concorrenti, sfide o difficoltà. " +
      "Rispondi SOLO con JSON:\n" +
      '{"title": "Titolo", "subtitle": "Sottotitolo", "content": "Contenuto completo", "tags": ["tag1", "tag2"], "suggestedCategories": ["cat1"], "estimatedReadTime": 3}';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5, // Ridotto per output più controllato
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const article = JSON.parse(content);

    return new Response(JSON.stringify({
      success: true,
      article,
      usage: response.usage,
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
