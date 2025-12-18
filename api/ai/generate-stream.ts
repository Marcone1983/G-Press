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

    // Build context from documents (without labeling them)
    let infoContext = '';
    if (documents && documents.length > 0) {
      infoContext = documents
        .map((doc: any) => doc.content)
        .join('\n\n---\n\n');
    }

    const systemPrompt = `Sei un giornalista professionista che scrive per testate di primo livello.

REGOLE OBBLIGATORIE - VIOLAZIONI NON TOLLERATE:

1. USA SOLO LE INFORMAZIONI FORNITE
   - NON inventare MAI concorrenti, competitor o aziende rivali
   - NON inventare MAI dati, statistiche o numeri non presenti nelle info fornite
   - NON inventare MAI partnership, collaborazioni o relazioni commerciali
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
   - Qualsiasi riferimento negativo o critico non presente nelle info fornite

4. RIFERIMENTI ALLE FONTI
   - NON dire MAI "secondo i documenti", "come riportato", "dal comunicato"
   - NON nominare MAI la parola "documento" o "comunicato stampa"
   - Presenta le informazioni come fatti verificati dal giornalista

FORMATO RICHIESTO: ${format || 'articolo standard'}

${customInstructions ? `ISTRUZIONI AGGIUNTIVE: ${customInstructions}` : ''}

RICORDA: Se non hai informazioni su qualcosa, NON inventarla.`;

    const userPrompt = `Scrivi un articolo giornalistico basato ESCLUSIVAMENTE su queste informazioni:

${companyInfo ? `INFORMAZIONI AZIENDA:\n${companyInfo}\n\n` : ''}
${infoContext ? `INFORMAZIONI DISPONIBILI:\n${infoContext}` : ''}

NON inventare concorrenti, sfide o difficoltà. Usa SOLO le info sopra.
Genera un articolo completo con titolo, sottotitolo e corpo.`;

    // Use fine-tuned model if available
    const modelToUse = fineTunedModel || 'gpt-4o-mini';

    const stream = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5, // Ridotto per output più controllato
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
