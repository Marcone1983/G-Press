/**
 * AI Article Revision Endpoint
 * Provides inline suggestions and rewrites for articles
 */

import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

type RevisionType = 'improve' | 'formal' | 'informal' | 'shorter' | 'longer' | 'rewrite_paragraph';

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
    const { text, type, context, customInstruction } = body;

    if (!text || !type) {
      return new Response(JSON.stringify({ error: 'Missing text or revision type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    const revisionPrompts: Record<RevisionType, string> = {
      improve: `Migliora questo testo mantenendo il significato originale. Rendi più chiaro, scorrevole e professionale. Non aggiungere informazioni nuove.`,
      formal: `Riscrivi questo testo in un tono più formale e professionale, adatto a una pubblicazione giornalistica di alto livello.`,
      informal: `Riscrivi questo testo in un tono più accessibile e conversazionale, mantenendo l'accuratezza delle informazioni.`,
      shorter: `Riduci questo testo del 30-40% mantenendo tutte le informazioni essenziali. Elimina ridondanze e frasi superflue.`,
      longer: `Espandi questo testo aggiungendo più dettagli, contesto e spiegazioni. Mantieni lo stile giornalistico.`,
      rewrite_paragraph: `Riscrivi completamente questo paragrafo con un approccio diverso, mantenendo le stesse informazioni chiave.`,
    };

    const systemPrompt = `Sei un editor professionista per testate giornalistiche di primo livello.
${customInstruction || revisionPrompts[type as RevisionType] || revisionPrompts.improve}

REGOLE:
1. Mantieni sempre l'accuratezza fattuale
2. Non inventare informazioni
3. Preserva i dati numerici esatti
4. Rispondi SOLO con il testo revisionato, senza commenti o spiegazioni
5. Scrivi in italiano`;

    const userPrompt = context 
      ? `CONTESTO DELL'ARTICOLO:\n${context}\n\nTESTO DA REVISIONARE:\n${text}`
      : text;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const revisedText = response.choices[0]?.message?.content;
    if (!revisedText) {
      throw new Error('No response from AI');
    }

    // Generate suggestions for further improvements
    const suggestionsResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `Analizza questo testo e fornisci 3 suggerimenti specifici per migliorarlo ulteriormente. Rispondi in JSON: {"suggestions": ["suggerimento 1", "suggerimento 2", "suggerimento 3"]}` 
        },
        { role: 'user', content: revisedText },
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    let suggestions: string[] = [];
    try {
      const suggestionsContent = suggestionsResponse.choices[0]?.message?.content;
      if (suggestionsContent) {
        suggestions = JSON.parse(suggestionsContent).suggestions || [];
      }
    } catch (e) {
      // Ignore suggestions parsing errors
    }

    return new Response(JSON.stringify({
      success: true,
      original: text,
      revised: revisedText,
      type,
      suggestions,
      usage: {
        revision: response.usage,
        suggestions: suggestionsResponse.usage,
      },
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Revision error:', error);
    return new Response(JSON.stringify({ 
      error: 'Revision failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
