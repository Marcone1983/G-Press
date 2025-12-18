/**
 * Semantic Search Endpoint
 * Searches documents using AI-powered semantic understanding
 */

import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

interface SearchResult {
  documentName: string;
  relevantExcerpt: string;
  relevanceScore: number;
  matchReason: string;
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
    const { query, documents } = body;

    if (!query || !documents || !Array.isArray(documents)) {
      return new Response(JSON.stringify({ error: 'Missing query or documents' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({ apiKey });

    // Build document list for AI
    const documentList = documents
      .map((doc: any, i: number) => `[DOC ${i + 1}: ${doc.name}]\n${doc.content.substring(0, 2000)}`)
      .join('\n\n---\n\n');

    const systemPrompt = `Sei un sistema di ricerca semantica. Data una query e una lista di documenti, trova i passaggi più rilevanti.

Per ogni documento rilevante, estrai:
1. Il nome del documento
2. L'estratto più pertinente alla query (max 300 caratteri)
3. Un punteggio di rilevanza da 0 a 100
4. Il motivo per cui è rilevante

Rispondi SOLO in JSON:
{
  "results": [
    {
      "documentName": "nome documento",
      "relevantExcerpt": "estratto pertinente...",
      "relevanceScore": 85,
      "matchReason": "perché è rilevante"
    }
  ],
  "summary": "breve riassunto di cosa è stato trovato"
}

Ordina per rilevanza decrescente. Includi solo documenti con score >= 30.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `QUERY: ${query}\n\nDOCUMENTI:\n${documentList}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const searchResults = JSON.parse(content);

    return new Response(JSON.stringify({
      success: true,
      query,
      ...searchResults,
      usage: response.usage,
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ 
      error: 'Search failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
