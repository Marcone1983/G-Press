import Constants from 'expo-constants';

// API Key hardcoded per funzionamento standalone APK
const RESEND_API_KEY = Constants.expoConfig?.extra?.resendApiKey || 're_KDQAhbXV_3LimzkWiPTFv45T7M3NJ9ckL';
const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  type: string; // mime type
}

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: EmailAttachment[];
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Send emails using Resend API (legacy function without attachments)
 */
export async function sendEmails(options: EmailOptions): Promise<SendResult> {
  return sendEmailsWithAttachments(options);
}

/**
 * Send emails using Resend API with optional attachments
 * Handles batching for large recipient lists
 */
export async function sendEmailsWithAttachments(options: EmailOptions): Promise<SendResult> {
  const { to, subject, html, from = 'Roberto Romagnino <g.ceo@growverse.net>', attachments } = options;
  
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

  // Prepare attachments for Resend API format
  const resendAttachments = attachments?.map(att => ({
    filename: att.filename,
    content: att.content, // Resend accepts base64 content directly
  }));

  for (const batch of batches) {
    try {
      const requestBody: any = {
        from,
        to: batch,
        subject,
        html,
      };

      // Add attachments if present
      if (resendAttachments && resendAttachments.length > 0) {
        requestBody.attachments = resendAttachments;
      }

      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
 * Get email statistics from Resend
 */
export interface EmailStats {
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
}

export interface EmailDetail {
  id: string;
  to: string[];
  subject: string;
  created_at: string;
  last_event: string;
}

/**
 * Get list of sent emails from Resend
 */
export async function getEmailsList(limit: number = 100): Promise<EmailDetail[]> {
  if (!RESEND_API_KEY) return [];

  try {
    const response = await fetch(`https://api.resend.com/emails?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching emails list:', error);
    return [];
  }
}

/**
 * Get details of a specific email
 */
export async function getEmailDetails(emailId: string): Promise<any> {
  if (!RESEND_API_KEY) return null;

  try {
    const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error('Error fetching email details:', error);
    return null;
  }
}

/**
 * Calculate aggregate statistics from emails list
 */
export async function getAggregateStats(): Promise<EmailStats> {
  const emails = await getEmailsList(100);
  
  const stats: EmailStats = {
    total: emails.length,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0,
  };

  for (const email of emails) {
    switch (email.last_event) {
      case 'delivered':
        stats.delivered++;
        break;
      case 'opened':
        stats.opened++;
        stats.delivered++; // opened implies delivered
        break;
      case 'clicked':
        stats.clicked++;
        stats.opened++; // clicked implies opened
        stats.delivered++;
        break;
      case 'bounced':
        stats.bounced++;
        break;
      case 'complained':
        stats.complained++;
        break;
    }
  }

  return stats;
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
    <strong>Roberto Romagnino</strong><br>
    Founder & CEO<br>
    GROWVERSE, LLC<br><br>
    Inviato con G-Press - Distribuzione Comunicati Stampa
  </div>
</body>
</html>
`;

  return html;
}
