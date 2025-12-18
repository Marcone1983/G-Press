import Constants from 'expo-constants';

const RESEND_API_KEY = Constants.expoConfig?.extra?.resendApiKey || '';
const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Send emails using Resend API
 * Handles batching for large recipient lists
 */
export async function sendEmails(options: EmailOptions): Promise<SendResult> {
  const { to, subject, html, from = 'G-Press <onboarding@resend.dev>' } = options;
  
  if (!RESEND_API_KEY) {
    return {
      success: false,
      sent: 0,
      failed: to.length,
      errors: ['API key non configurata'],
    };
  }

  const result: SendResult = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [],
  };

  // Resend allows up to 100 recipients per request
  // We'll send in batches of 50 for safety
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  
  for (let i = 0; i < to.length; i += BATCH_SIZE) {
    batches.push(to.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: batch,
          subject,
          html,
        }),
      });

      if (response.ok) {
        result.sent += batch.length;
      } else {
        const errorData = await response.json().catch(() => ({}));
        result.failed += batch.length;
        result.errors.push(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error: any) {
      result.failed += batch.length;
      result.errors.push(error.message || 'Errore di rete');
    }
  }

  result.success = result.failed === 0;
  return result;
}

/**
 * Check if Resend API is configured
 */
export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY && RESEND_API_KEY.startsWith('re_');
}

/**
 * Format press release content as HTML email
 */
export function formatPressReleaseEmail(params: {
  title: string;
  subtitle?: string;
  content: string;
  boilerplate?: string;
  contactName?: string;
  contactEmail?: string;
}): string {
  const { title, subtitle, content, boilerplate, contactName, contactEmail } = params;
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2E7D32; font-size: 24px; margin-bottom: 8px; }
    h2 { color: #666; font-size: 16px; font-weight: normal; margin-top: 0; }
    .content { margin: 24px 0; white-space: pre-wrap; }
    .boilerplate { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
    .contact { margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 8px; }
    .footer { margin-top: 32px; font-size: 12px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${subtitle ? `<h2>${subtitle}</h2>` : ''}
  <div class="content">${content.replace(/\n/g, '<br>')}</div>
`;

  if (boilerplate) {
    html += `<div class="boilerplate"><strong>Chi siamo</strong><br>${boilerplate.replace(/\n/g, '<br>')}</div>`;
  }

  if (contactName || contactEmail) {
    html += `<div class="contact"><strong>Contatti per la stampa</strong><br>`;
    if (contactName) html += `${contactName}<br>`;
    if (contactEmail) html += `<a href="mailto:${contactEmail}">${contactEmail}</a>`;
    html += `</div>`;
  }

  html += `
  <div class="footer">
    Inviato con G-Press - Distribuzione Comunicati Stampa
  </div>
</body>
</html>
`;

  return html;
}
