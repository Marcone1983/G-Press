/**
 * Email Send API Endpoint
 * Handles email sending via Resend API
 */

export const config = {
  runtime: 'edge',
};

interface EmailAttachment {
  filename: string;
  content: string;
  type?: string;
}

interface RequestBody {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    console.error('[Email Send] RESEND_API_KEY not configured');
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Email service not configured',
      sent: 0,
      failed: 0,
      errors: ['RESEND_API_KEY not configured']
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { to, subject, html, from = 'Roberto Romagnino <g.ceo@growverse.net>', attachments } = body;

    if (!to || !to.length || !subject || !html) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing required fields: to, subject, html',
        sent: 0,
        failed: 0,
        errors: ['Missing required fields']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resend allows up to 100 recipients per request
    // We'll send in batches of 50 for safety
    const BATCH_SIZE = 50;
    const batches: string[][] = [];
    
    for (let i = 0; i < to.length; i += BATCH_SIZE) {
      batches.push(to.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    // Prepare attachments for Resend API format
    const resendAttachments = attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
    }));

    for (const batch of batches) {
      try {
        const requestBody: any = {
          from,
          to: batch,
          subject,
          html,
        };

        if (resendAttachments && resendAttachments.length > 0) {
          requestBody.attachments = resendAttachments;
        }

        console.log(`[Email Send] Sending to ${batch.length} recipients...`);

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`[Email Send] Success:`, result);
          totalSent += batch.length;
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error(`[Email Send] Failed:`, errorData);
          totalFailed += batch.length;
          errors.push(errorData.message || `HTTP ${response.status}`);
        }
      } catch (error: any) {
        console.error(`[Email Send] Error:`, error);
        totalFailed += batch.length;
        errors.push(error.message || 'Network error');
      }
    }

    const success = totalFailed === 0;

    return new Response(JSON.stringify({
      success,
      sent: totalSent,
      failed: totalFailed,
      errors,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Email Send] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to send emails',
      message: error.message,
      sent: 0,
      failed: 0,
      errors: [error.message],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
