/**
 * Streaming AI Article Generation Endpoint
 * Generates articles with real-time streaming response
 */

import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { documents, companyInfo, format } = body;

    if (!documents || !companyInfo) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    // Build context from documents (without labeling them as documents)
    const infoContext = documents
      .map((doc: any) => doc.content)
      .join('\n\n---\n\n');

    const formatInstructions: Record<string, string> = {
      news_brief: 'Scrivi una news breve (300-400 parole) in stile agenzia stampa.',
      deep_dive: 'Scrivi un approfondimento (800-1000 parole) con analisi dettagliata.',
      interview: 'Scrivi come se fosse un\'intervista al CEO con domande e risposte.',
      case_study: 'Scrivi un case study focalizzato sui risultati ottenuti.',
      announcement: 'Scrivi un comunicato stampa formale per un annuncio ufficiale.',
    };

    const systemPrompt = `Sei un giornalista professionista che scrive per testate di primo livello.

REGOLE OBBLIGATORIE - VIOLAZIONI NON TOLLERATE:

1. USA SOLO LE INFORMAZIONI FORNITE
   - NON inventare MAI concorrenti, competitor o aziende rivali
   - NON inventare MAI dati, statistiche o numeri non presenti nelle info fornite
   - NON inventare MAI partnership o relazioni commerciali
   - Se non hai un'informazione, NON la includere

2. TONO E STILE
   - Scrivi come un giornalista indipendente che riporta fatti
   - Tono neutro e professionale, MAI promozionale
   - MAI usare superlativi senza dati a supporto
   - Scrivi in italiano professionale

3. CONTENUTI VIETATI - NON SCRIVERE MAI:
   - Sezioni "Sfide", "Difficoltà", "Problemi", "Ostacoli"
   - Confronti con concorrenti (Meta, Epic Games, Roblox, Facebook, etc.)
   - Speculazioni su difficoltà future dell'azienda
   - Frasi tipo "dovrà affrontare", "le sfide includono", "i rischi sono"

4. RIFERIMENTI ALLE FONTI
   - NON dire MAI "secondo i documenti", "come riportato", "dal comunicato"
   - NON nominare MAI la parola "documento" o "comunicato stampa"
   - Presenta le informazioni come fatti verificati dal giornalista

INFORMAZIONI AZIENDA:
- Nome: ${companyInfo.name}
- CEO: ${companyInfo.ceo || 'Non specificato'}
- Settore: ${companyInfo.industry || 'Non specificato'}
- Prodotti: ${companyInfo.products?.join(', ') || 'Non specificati'}
- Caratteristiche: ${companyInfo.strengths?.join(', ') || 'Non specificate'}

${formatInstructions[format] || formatInstructions.news_brief}

Formatta così:
TITOLO: [titolo]
SOTTOTITOLO: [sottotitolo]
CONTENUTO:
[articolo]

RICORDA: Se non hai informazioni su qualcosa, NON inventarla.`;

    const userPrompt = `Scrivi un articolo giornalistico basato ESCLUSIVAMENTE su queste informazioni:

${infoContext}

NON inventare concorrenti, sfide o difficoltà. Usa SOLO le info sopra.`;

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5, // Ridotto per output più controllato
      max_tokens: 2000,
      stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Streaming error:', error);
    return new Response(JSON.stringify({ 
      error: 'Generation failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
