/**
 * D1 Press Releases API
 */

export const config = {
  runtime: 'edge',
};

const CLOUDFLARE_ACCOUNT_ID = "af495621eec5c53e3f99f7e0b1fbbe7b";
const CLOUDFLARE_DATABASE_ID = "93354d3d-7050-4565-a28a-949bae431eac";
const CLOUDFLARE_API_TOKEN = "7uXBsLMHZFK1NUvRJBjavLmUN8liMkriYWJzzwlr";

const D1_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}`;

async function d1Query(sql: string, params: any[] = []): Promise<any> {
  const response = await fetch(`${D1_API_BASE}/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  const data = await response.json() as any;
  
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || "Query failed");
  }

  return {
    results: data.result?.[0]?.results || [],
    meta: data.result?.[0]?.meta,
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      const result = await d1Query("SELECT * FROM press_releases ORDER BY sent_at DESC LIMIT 100");
      return new Response(JSON.stringify(result.results), { headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const result = await d1Query(
        `INSERT INTO press_releases (title, subtitle, content, recipients_count, category, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [body.title, body.subtitle || "", body.content, body.recipients_count || 0, body.category || "general", body.status || "sent"]
      );
      return new Response(JSON.stringify({ id: result.meta?.last_row_id, success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (error: any) {
    console.error('[D1 Releases] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
