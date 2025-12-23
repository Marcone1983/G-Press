/**
 * D1 Custom Journalists API
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
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      const result = await d1Query("SELECT * FROM custom_journalists ORDER BY created_at DESC");
      const journalists = result.results.map((j: any) => ({
        ...j,
        isVip: j.is_vip === 1,
        isBlacklisted: j.is_blacklisted === 1,
      }));
      return new Response(JSON.stringify(journalists), { headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      
      // Check if batch insert
      if (Array.isArray(body)) {
        for (const j of body) {
          await d1Query(
            `INSERT OR REPLACE INTO custom_journalists (name, email, outlet, country, category, is_vip, is_blacklisted, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [j.name, j.email, j.outlet || "", j.country || "IT", j.category || "general", j.isVip ? 1 : 0, j.isBlacklisted ? 1 : 0, j.notes || ""]
          );
        }
        return new Response(JSON.stringify({ success: true, count: body.length }), { headers: corsHeaders });
      }

      const result = await d1Query(
        `INSERT INTO custom_journalists (name, email, outlet, country, category, is_vip, is_blacklisted, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [body.name, body.email, body.outlet || "", body.country || "IT", body.category || "general", body.isVip ? 1 : 0, body.isBlacklisted ? 1 : 0, body.notes || ""]
      );
      return new Response(JSON.stringify({ id: result.meta?.last_row_id, success: true }), { headers: corsHeaders });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: corsHeaders });
      }
      await d1Query("DELETE FROM custom_journalists WHERE id = ?", [parseInt(id)]);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (error: any) {
    console.error('[D1 Journalists] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
