/**
 * REST API endpoints per Cloudflare D1
 * Questi endpoint permettono al frontend di accedere al database D1
 */

export const config = {
  runtime: 'edge',
};

// Cloudflare D1 credentials
const CLOUDFLARE_ACCOUNT_ID = "af495621eec5c53e3f99f7e0b1fbbe7b";
const CLOUDFLARE_DATABASE_ID = "93354d3d-7050-4565-a28a-949bae431eac";
const CLOUDFLARE_API_TOKEN = "7uXBsLMHZFK1NUvRJBjavLmUN8liMkriYWJzzwlr";

const D1_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}`;

// Helper per eseguire query D1
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

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export default async function handler(req: Request) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.replace('/api/d1/', '').split('/').filter(Boolean);
  const endpoint = pathParts.join('/');

  try {
    let body: any = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
    }

    // ============================================
    // INITIALIZE
    // ============================================
    if (endpoint === 'init' && req.method === 'POST') {
      // Le tabelle sono già create, solo verifica
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ============================================
    // DOCUMENTS (Knowledge Base)
    // ============================================
    if (endpoint === 'documents') {
      if (req.method === 'GET') {
        const result = await d1Query("SELECT * FROM knowledge_documents ORDER BY created_at DESC");
        return new Response(JSON.stringify(result.results), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        const result = await d1Query(
          `INSERT INTO knowledge_documents (title, content, type, category, tags) VALUES (?, ?, ?, ?, ?)`,
          [body.title, body.content, body.type || "document", body.category || null, JSON.stringify(body.tags || [])]
        );
        return new Response(JSON.stringify({ id: result.meta?.last_row_id, success: true }), { headers: corsHeaders });
      }
    }

    // ============================================
    // CUSTOM JOURNALISTS
    // ============================================
    if (endpoint === 'journalists') {
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
        const result = await d1Query(
          `INSERT INTO custom_journalists (name, email, outlet, category, country, is_vip, is_blacklisted, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET
             name = excluded.name,
             outlet = excluded.outlet,
             category = excluded.category,
             country = excluded.country,
             is_vip = excluded.is_vip,
             is_blacklisted = excluded.is_blacklisted,
             notes = excluded.notes`,
          [
            body.name,
            body.email,
            body.outlet || null,
            body.category || "general",
            body.country || "IT",
            body.isVip ? 1 : 0,
            body.isBlacklisted ? 1 : 0,
            body.notes || null
          ]
        );
        return new Response(JSON.stringify({ id: result.meta?.last_row_id, success: true }), { headers: corsHeaders });
      }
    }

    // ============================================
    // EMAIL TEMPLATES
    // ============================================
    if (endpoint === 'templates') {
      if (req.method === 'GET') {
        const result = await d1Query("SELECT * FROM email_templates ORDER BY created_at DESC");
        const templates = result.results.map((t: any) => ({
          ...t,
          isDefault: t.is_default === 1,
        }));
        return new Response(JSON.stringify(templates), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        const result = await d1Query(
          `INSERT INTO email_templates (name, subject, content, is_default) VALUES (?, ?, ?, ?)`,
          [body.name, body.subject || null, body.content, body.isDefault ? 1 : 0]
        );
        return new Response(JSON.stringify({ id: result.meta?.last_row_id, success: true }), { headers: corsHeaders });
      }
    }

    // ============================================
    // TRAINING EXAMPLES
    // ============================================
    if (endpoint === 'training') {
      if (req.method === 'GET') {
        const result = await d1Query("SELECT * FROM training_examples ORDER BY created_at DESC");
        return new Response(JSON.stringify(result.results), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        const result = await d1Query(
          `INSERT INTO training_examples (prompt, completion, category) VALUES (?, ?, ?)`,
          [body.prompt, body.completion, body.category || null]
        );
        return new Response(JSON.stringify({ id: result.meta?.last_row_id, success: true }), { headers: corsHeaders });
      }
    }

    // ============================================
    // PRESS RELEASES
    // ============================================
    if (endpoint === 'releases') {
      if (req.method === 'GET') {
        const result = await d1Query("SELECT * FROM press_releases ORDER BY sent_at DESC");
        return new Response(JSON.stringify(result.results), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        const result = await d1Query(
          `INSERT INTO press_releases (title, content, subject, category, recipients_count) VALUES (?, ?, ?, ?, ?)`,
          [body.title, body.content, body.subject || null, body.category || null, body.recipientsCount || 0]
        );
        return new Response(JSON.stringify({ id: result.meta?.last_row_id, success: true }), { headers: corsHeaders });
      }
    }

    // ============================================
    // EMAIL TRACKING
    // ============================================
    if (endpoint === 'tracking' && req.method === 'POST') {
      await d1Query(
        `INSERT INTO email_tracking (press_release_id, journalist_email, journalist_name, event_type, event_data) VALUES (?, ?, ?, ?, ?)`,
        [body.pressReleaseId || null, body.journalistEmail, body.journalistName || null, body.eventType, JSON.stringify(body.eventData || {})]
      );
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (endpoint === 'tracking/stats' && req.method === 'GET') {
      const sentResult = await d1Query("SELECT COUNT(*) as count FROM email_tracking WHERE event_type = 'sent'");
      const openedResult = await d1Query("SELECT COUNT(*) as count FROM email_tracking WHERE event_type = 'opened'");
      const clickedResult = await d1Query("SELECT COUNT(*) as count FROM email_tracking WHERE event_type = 'clicked'");

      const totalSent = sentResult.results?.[0]?.count || 0;
      const totalOpened = openedResult.results?.[0]?.count || 0;
      const totalClicked = clickedResult.results?.[0]?.count || 0;

      return new Response(JSON.stringify({
        totalSent,
        totalOpened,
        totalClicked,
        openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      }), { headers: corsHeaders });
    }

    if (endpoint === 'tracking/history' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const result = await d1Query("SELECT * FROM email_tracking ORDER BY created_at DESC LIMIT ?", [limit]);
      return new Response(JSON.stringify(result.results), { headers: corsHeaders });
    }

    // ============================================
    // AUTOPILOT
    // ============================================
    if (endpoint === 'autopilot') {
      if (req.method === 'GET') {
        const result = await d1Query("SELECT * FROM autopilot_state WHERE id = 1");
        const state = result.results?.[0];
        return new Response(JSON.stringify({
          isActive: state?.is_active === 1,
          trendsAnalyzed: state?.trends_analyzed || 0,
          articlesGenerated: state?.articles_generated || 0,
          articlesSent: state?.articles_sent || 0,
          lastRun: state?.last_run || null,
        }), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        const setClauses: string[] = [];
        const params: any[] = [];

        if (body.isActive !== undefined) {
          setClauses.push("is_active = ?");
          params.push(body.isActive ? 1 : 0);
        }
        if (body.trendsAnalyzed !== undefined) {
          setClauses.push("trends_analyzed = ?");
          params.push(body.trendsAnalyzed);
        }
        if (body.articlesGenerated !== undefined) {
          setClauses.push("articles_generated = ?");
          params.push(body.articlesGenerated);
        }
        if (body.articlesSent !== undefined) {
          setClauses.push("articles_sent = ?");
          params.push(body.articlesSent);
        }

        setClauses.push("last_run = CURRENT_TIMESTAMP");
        setClauses.push("updated_at = CURRENT_TIMESTAMP");

        await d1Query(`UPDATE autopilot_state SET ${setClauses.join(", ")} WHERE id = 1`, params);
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }
    }

    // ============================================
    // RANKINGS
    // ============================================
    if (endpoint === 'rankings') {
      if (req.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const result = await d1Query("SELECT * FROM journalist_rankings ORDER BY engagement_score DESC LIMIT ?", [limit]);
        return new Response(JSON.stringify(result.results), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        const opens = body.opens || 0;
        const clicks = body.clicks || 0;
        const totalSent = body.totalSent || 1;
        
        const openRate = opens / totalSent;
        const clickRate = clicks / totalSent;
        const engagementScore = (openRate * 0.4) + (clickRate * 0.6);
        
        let tier = "C";
        if (engagementScore > 0.3) tier = "A";
        else if (engagementScore > 0.15) tier = "B";

        await d1Query(
          `INSERT INTO journalist_rankings (journalist_email, journalist_name, tier, engagement_score, opens, clicks, total_sent)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(journalist_email) DO UPDATE SET
             journalist_name = excluded.journalist_name,
             tier = excluded.tier,
             engagement_score = excluded.engagement_score,
             opens = excluded.opens,
             clicks = excluded.clicks,
             total_sent = excluded.total_sent,
             updated_at = CURRENT_TIMESTAMP`,
          [body.email, body.name || null, tier, engagementScore, opens, clicks, totalSent]
        );
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }
    }

    // ============================================
    // FOLLOW-UPS
    // ============================================
    if (endpoint === 'followups') {
      if (req.method === 'GET') {
        const result = await d1Query("SELECT * FROM followup_sequences ORDER BY created_at DESC");
        return new Response(JSON.stringify(result.results), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        const result = await d1Query(
          `INSERT INTO followup_sequences (journalist_email, original_subject, original_content, step, next_send_at, status) VALUES (?, ?, ?, ?, ?, ?)`,
          [body.journalistEmail, body.originalSubject, body.originalContent || null, body.step || 1, body.nextSendAt || null, body.status || "pending"]
        );
        return new Response(JSON.stringify({ id: result.meta?.last_row_id, success: true }), { headers: corsHeaders });
      }
    }

    if (endpoint === 'followups/pending' && req.method === 'GET') {
      const result = await d1Query(
        `SELECT * FROM followup_sequences WHERE status = 'pending' AND next_send_at <= datetime('now') ORDER BY next_send_at ASC`
      );
      return new Response(JSON.stringify(result.results), { headers: corsHeaders });
    }

    if (endpoint === 'followups/cancel' && req.method === 'POST') {
      await d1Query(
        "UPDATE followup_sequences SET status = 'cancelled' WHERE journalist_email = ? AND status = 'pending'",
        [body.email]
      );
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ============================================
    // CACHE (Successful Articles)
    // ============================================
    if (endpoint === 'cache') {
      if (req.method === 'GET') {
        const category = url.searchParams.get('category');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        
        let sql = "SELECT * FROM successful_articles";
        const params: any[] = [];
        
        if (category) {
          sql += " WHERE category = ?";
          params.push(category);
        }
        
        sql += " ORDER BY open_rate DESC, click_rate DESC LIMIT ?";
        params.push(limit);

        const result = await d1Query(sql, params);
        return new Response(JSON.stringify(result.results), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        await d1Query(
          `INSERT INTO successful_articles (title, content, subject, category, open_rate, click_rate, keywords) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [body.title, body.content, body.subject || null, body.category || null, body.openRate, body.clickRate, JSON.stringify(body.keywords || [])]
        );
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }
    }

    // ============================================
    // PATTERNS (Learning)
    // ============================================
    if (endpoint === 'patterns') {
      if (req.method === 'GET') {
        const result = await d1Query("SELECT * FROM send_patterns ORDER BY avg_open_rate DESC");
        return new Response(JSON.stringify(result.results), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        await d1Query(
          `INSERT INTO send_patterns (country, category, best_hour, best_day, avg_open_rate, avg_click_rate, sample_size)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT DO UPDATE SET
             best_hour = excluded.best_hour,
             best_day = excluded.best_day,
             avg_open_rate = excluded.avg_open_rate,
             avg_click_rate = excluded.avg_click_rate,
             sample_size = excluded.sample_size,
             updated_at = CURRENT_TIMESTAMP`,
          [body.country || null, body.category || null, body.bestHour, body.bestDay, body.avgOpenRate, body.avgClickRate, body.sampleSize]
        );
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }
    }

    if (endpoint === 'patterns/best' && req.method === 'GET') {
      const country = url.searchParams.get('country');
      const category = url.searchParams.get('category');
      
      let sql = "SELECT best_hour, best_day FROM send_patterns WHERE 1=1";
      const params: any[] = [];
      
      if (country) {
        sql += " AND country = ?";
        params.push(country);
      }
      if (category) {
        sql += " AND category = ?";
        params.push(category);
      }
      
      sql += " ORDER BY avg_open_rate DESC LIMIT 1";

      const result = await d1Query(sql, params);
      const pattern = result.results?.[0];
      
      if (pattern) {
        return new Response(JSON.stringify({ hour: pattern.best_hour, day: pattern.best_day }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify(null), { headers: corsHeaders });
    }

    // ============================================
    // SETTINGS
    // ============================================
    if (endpoint === 'settings') {
      if (req.method === 'GET') {
        const result = await d1Query("SELECT key, value FROM app_settings");
        const settings: Record<string, string> = {};
        for (const row of result.results || []) {
          settings[row.key] = row.value;
        }
        return new Response(JSON.stringify(settings), { headers: corsHeaders });
      }
      if (req.method === 'POST') {
        await d1Query(
          `INSERT INTO app_settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
          [body.key, body.value]
        );
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }
    }

    // ============================================
    // DYNAMIC ROUTES (delete, update)
    // ============================================
    if (pathParts.length === 2) {
      const [resource, id] = pathParts;
      const numId = parseInt(id);

      // GET single setting
      if (resource === 'settings' && req.method === 'GET') {
        const result = await d1Query("SELECT value FROM app_settings WHERE key = ?", [id]);
        return new Response(JSON.stringify({ value: result.results?.[0]?.value || null }), { headers: corsHeaders });
      }

      if (req.method === 'POST' && body.action === 'delete') {
        const tableMap: Record<string, string> = {
          'documents': 'knowledge_documents',
          'journalists': 'custom_journalists',
          'templates': 'email_templates',
          'training': 'training_examples',
          'followups': 'followup_sequences',
        };
        
        const table = tableMap[resource];
        if (table) {
          await d1Query(`DELETE FROM ${table} WHERE id = ?`, [numId]);
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
      }

      if (req.method === 'POST' && body.action === 'update') {
        const { action, ...updates } = body;
        
        if (resource === 'journalists') {
          const setClauses: string[] = [];
          const params: any[] = [];

          if (updates.name !== undefined) { setClauses.push("name = ?"); params.push(updates.name); }
          if (updates.outlet !== undefined) { setClauses.push("outlet = ?"); params.push(updates.outlet); }
          if (updates.category !== undefined) { setClauses.push("category = ?"); params.push(updates.category); }
          if (updates.country !== undefined) { setClauses.push("country = ?"); params.push(updates.country); }
          if (updates.isVip !== undefined) { setClauses.push("is_vip = ?"); params.push(updates.isVip ? 1 : 0); }
          if (updates.isBlacklisted !== undefined) { setClauses.push("is_blacklisted = ?"); params.push(updates.isBlacklisted ? 1 : 0); }
          if (updates.notes !== undefined) { setClauses.push("notes = ?"); params.push(updates.notes); }

          if (setClauses.length > 0) {
            params.push(numId);
            await d1Query(`UPDATE custom_journalists SET ${setClauses.join(", ")} WHERE id = ?`, params);
          }
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        if (resource === 'followups') {
          const setClauses: string[] = [];
          const params: any[] = [];

          if (updates.step !== undefined) { setClauses.push("step = ?"); params.push(updates.step); }
          if (updates.nextSendAt !== undefined) { setClauses.push("next_send_at = ?"); params.push(updates.nextSendAt); }
          if (updates.status !== undefined) { setClauses.push("status = ?"); params.push(updates.status); }

          if (setClauses.length > 0) {
            params.push(numId);
            await d1Query(`UPDATE followup_sequences SET ${setClauses.join(", ")} WHERE id = ?`, params);
          }
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
      }
    }

    // Not found
    return new Response(JSON.stringify({ error: 'Not found', endpoint }), { 
      status: 404, 
      headers: corsHeaders 
    });

  } catch (error: any) {
    console.error('[D1 API] Error:', error);
    return new Response(JSON.stringify({ error: error.message || String(error) }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}
