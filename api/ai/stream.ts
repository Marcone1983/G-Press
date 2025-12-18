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

    // Build context from documents
    const documentContext = documents
      .map((doc: any) => `[${doc.category}] ${doc.name}:\n${doc.content}`)
      .join('\n\n---\n\n');

    const formatInstructions: Record<string, string> = {
      news_brief: 'Scrivi una news breve (300-400 parole) in stile agenzia stampa.',
      deep_dive: 'Scrivi un approfondimento (800-1000 parole) con analisi dettagliata.',
      interview: 'Scrivi come se fosse un\'intervista al CEO con domande e risposte.',
      case_study: 'Scrivi un case study con problema, soluzione e risultati.',
      announcement: 'Scrivi un comunicato stampa formale per un annuncio ufficiale.',
    };

    const systemPrompt = `Sei un giornalista professionista che scrive per testate di primo livello.

REGOLE FONDAMENTALI:
1. Scrivi in modo IMPARZIALE e OGGETTIVO - NON promozionale
2. Usa il tono di un giornalista che riporta fatti, non di un marketer
3. Includi contesto di mercato e prospettive bilanciate
4. Cita dati specifici quando disponibili
5. Evita superlativi e linguaggio commerciale
6. Scrivi in italiano professionale

INFORMAZIONI AZIENDA:
- Nome: ${companyInfo.name}
- CEO: ${companyInfo.ceo || 'Non specificato'}
- Settore: ${companyInfo.industry || 'Non specificato'}
- Prodotti: ${companyInfo.products?.join(', ') || 'Non specificati'}
- Punti di forza: ${companyInfo.strengths?.join(', ') || 'Non specificati'}

${formatInstructions[format] || formatInstructions.news_brief}

Inizia con un titolo accattivante, poi un sottotitolo, poi il contenuto dell'articolo.
Formatta così:
TITOLO: [titolo]
SOTTOTITOLO: [sottotitolo]
CONTENUTO:
[articolo]`;

    const userPrompt = `Basandoti sui seguenti documenti, scrivi un articolo giornalistico:

${documentContext}`;

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
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
