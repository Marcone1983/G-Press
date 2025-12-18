import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = "Sei un giornalista professionista esperto in comunicazione aziendale. " +
  "Il tuo compito è scrivere articoli IMPARZIALI e NON PROMOZIONALI basati sui documenti forniti. " +
  "REGOLE FONDAMENTALI: " +
  "1. Scrivi come un giornalista indipendente, NON come un ufficio stampa. " +
  "2. Usa un tono neutro e oggettivo. " +
  "3. Presenta i fatti senza esagerazioni o superlative. " +
  "4. Includi contesto di settore quando rilevante. " +
  "5. Evita frasi come 'leader di mercato', 'il migliore', 'rivoluzionario' a meno che non siano supportate da dati. " +
  "6. Cita fonti e dati specifici quando disponibili. " +
  "7. Scrivi in italiano professionale.";

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

    // Build context from documents
    const documentsContext = documents
      .map((doc) => "### " + doc.name + " (" + doc.category + ")\n" + doc.content)
      .join('\n\n');

    const companyContext = 
      "AZIENDA: " + companyInfo.name + "\n" +
      "CEO: " + companyInfo.ceo + "\n" +
      "SETTORE: " + companyInfo.industry + "\n" +
      "PRODOTTI: " + (companyInfo.products?.join(', ') || 'N/A') + "\n" +
      "PUNTI DI FORZA: " + (companyInfo.strengths?.join(', ') || 'N/A');

    const formatInstructions: Record<string, string> = {
      news_brief: 'Scrivi una notizia breve (300-500 parole) in stile agenzia stampa.',
      deep_dive: 'Scrivi un approfondimento (800-1200 parole) con analisi dettagliata.',
      interview: 'Scrivi un articolo in formato intervista con 5-7 domande.',
      case_study: 'Scrivi un caso studio: Sfida -> Soluzione -> Risultati.',
      announcement: 'Scrivi un annuncio ufficiale completo.',
    };

    const toneInstruction = tone === 'formal' 
      ? 'Usa un tono formale.' 
      : tone === 'technical' 
        ? 'Usa un tono tecnico.' 
        : 'Usa un tono professionale ma accessibile.';

    const targetInstruction = targetAudience ? "TARGET: " + targetAudience : '';

    const userPrompt = 
      (formatInstructions[format] || formatInstructions.news_brief) + "\n\n" +
      toneInstruction + "\n\n" +
      targetInstruction + "\n\n" +
      "INFORMAZIONI AZIENDA:\n" + companyContext + "\n\n" +
      "DOCUMENTI DI RIFERIMENTO:\n" + documentsContext + "\n\n" +
      "Genera un articolo giornalistico. Rispondi SOLO con JSON:\n" +
      '{"title": "Titolo", "subtitle": "Sottotitolo", "content": "Contenuto completo", "tags": ["tag1", "tag2"], "suggestedCategories": ["cat1"], "estimatedReadTime": 3}';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
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
