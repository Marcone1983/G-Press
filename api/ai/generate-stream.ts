/**
 * AI Article Generation with Streaming
 * Real-time text generation with typing effect
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
    const { companyInfo, documents, format, customInstructions, fineTunedModel } = body;

    if (!companyInfo && (!documents || documents.length === 0)) {
      return new Response(JSON.stringify({ error: 'Missing company info or documents' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    // Build context from documents
    let documentContext = '';
    if (documents && documents.length > 0) {
      documentContext = documents
        .map((doc: any) => `[${doc.name}]\n${doc.content}`)
        .join('\n\n---\n\n');
    }

    const systemPrompt = `Sei un giornalista professionista che scrive articoli imparziali e di alta qualità.

REGOLE FONDAMENTALI:
1. Scrivi in modo IMPARZIALE e OGGETTIVO - non sei un promotore dell'azienda
2. Usa uno stile giornalistico professionale (piramide invertita)
3. Cita fatti e dati quando disponibili
4. Evita aggettivi promozionali (rivoluzionario, straordinario, incredibile)
5. Includi contesto di mercato quando rilevante
6. Scrivi in italiano

FORMATO RICHIESTO: ${format || 'articolo standard'}

${customInstructions ? `ISTRUZIONI AGGIUNTIVE: ${customInstructions}` : ''}`;

    const userPrompt = `Scrivi un articolo giornalistico basato su queste informazioni:

${companyInfo ? `INFORMAZIONI AZIENDA:\n${companyInfo}\n\n` : ''}
${documentContext ? `DOCUMENTI DI RIFERIMENTO:\n${documentContext}` : ''}

Genera un articolo completo con titolo, sottotitolo e corpo.`;

    // Use fine-tuned model if available
    const modelToUse = fineTunedModel || 'gpt-4o-mini';

    const stream = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    // Create a TransformStream to handle the streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              // Send as Server-Sent Events format
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Streaming generation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Generation failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
