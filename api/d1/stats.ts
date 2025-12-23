/**
 * D1 Email Stats/Tracking API
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
      // Get aggregated stats
      const [tracking, releases] = await Promise.all([
        d1Query("SELECT * FROM email_tracking ORDER BY sent_at DESC LIMIT 500"),
        d1Query("SELECT COUNT(*) as total, SUM(recipients_count) as total_recipients FROM press_releases"),
      ]);

      const trackingData = tracking.results;
      const sent = trackingData.length;
      const delivered = trackingData.filter((t: any) => t.status === 'delivered').length;
      const opened = trackingData.filter((t: any) => t.opened_at).length;
      const clicked = trackingData.filter((t: any) => t.clicked_at).length;
      const bounced = trackingData.filter((t: any) => t.status === 'bounced').length;
      const spam = trackingData.filter((t: any) => t.status === 'spam').length;

      return new Response(JSON.stringify({
        sent,
        delivered,
        opened,
        clicked,
        bounced,
        spam,
        openRate: sent > 0 ? (opened / sent * 100).toFixed(1) : 0,
        clickRate: opened > 0 ? (clicked / opened * 100).toFixed(1) : 0,
        totalReleases: releases.results[0]?.total || 0,
        totalRecipients: releases.results[0]?.total_recipients || 0,
        recentTracking: trackingData.slice(0, 50),
      }), { headers: corsHeaders });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const result = await d1Query(
        `INSERT INTO email_tracking (email_id, recipient_email, journalist_id, status, sent_at) VALUES (?, ?, ?, ?, datetime('now'))`,
        [body.email_id, body.recipient_email, body.journalist_id || null, body.status || "sent"]
      );
      return new Response(JSON.stringify({ id: result.meta?.last_row_id, success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (error: any) {
    console.error('[D1 Stats] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
