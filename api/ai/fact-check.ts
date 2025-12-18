/**
 * AI Fact-Checking Endpoint
 * Verifies facts in generated articles against source documents
 */

import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

interface FactCheckResult {
  claim: string;
  status: 'verified' | 'unverified' | 'inconsistent' | 'not_found';
  source?: string;
  confidence: number;
  note?: string;
}

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
    const { article, documents } = body;

    if (!article || !documents) {
      return new Response(JSON.stringify({ error: 'Missing article or documents' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    // Build source context
    const sourceContext = documents
      .map((doc: any) => `[FONTE: ${doc.name}]\n${doc.content}`)
      .join('\n\n---\n\n');

    const systemPrompt = `Sei un fact-checker professionista. Il tuo compito è verificare le affermazioni nell'articolo confrontandole con i documenti fonte.

Per ogni affermazione fattuale (numeri, date, nomi, statistiche, citazioni), verifica se:
1. È presente nei documenti fonte (verified)
2. Non è presente ma potrebbe essere vera (unverified)
3. Contraddice i documenti fonte (inconsistent)
4. Non può essere verificata (not_found)

Rispondi SOLO in formato JSON con questa struttura:
{
  "facts": [
    {
      "claim": "affermazione estratta dall'articolo",
      "status": "verified|unverified|inconsistent|not_found",
      "source": "nome del documento fonte se trovato",
      "confidence": 0.0-1.0,
      "note": "spiegazione opzionale"
    }
  ],
  "overallScore": 0-100,
  "summary": "breve riassunto della verifica"
}`;

    const userPrompt = `ARTICOLO DA VERIFICARE:
${article}

DOCUMENTI FONTE:
${sourceContext}

Estrai tutte le affermazioni fattuali dall'articolo e verificale contro i documenti fonte.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const factCheckResult = JSON.parse(content);

    return new Response(JSON.stringify({
      success: true,
      ...factCheckResult,
      usage: response.usage,
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Fact-check error:', error);
    return new Response(JSON.stringify({ 
      error: 'Fact-check failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
