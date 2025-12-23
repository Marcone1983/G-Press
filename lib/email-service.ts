/**
 * G-Press Email Service
 * Uses tRPC backend API for email sending to ensure API key security
 */

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  type?: string; // mime type
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

// We'll use direct fetch to the tRPC endpoint since we're in the mobile app
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Send emails using tRPC backend API (which has access to RESEND_API_KEY)
 */
/**
 * Send emails using tRPC backend API (which has access to RESEND_API_KEY)
 */
export async function sendEmails(options: EmailOptions): Promise<SendResult> {
  const { to, subject, html, from = 'Roberto Romagnino <g.ceo@growverse.net>', attachments } = options;
  
  try {
    // Call tRPC mutation via HTTP
    const response = await fetch(`${API_BASE_URL}/trpc/email.send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: {
          to,
          subject,
          html,
          from,
          attachments: attachments?.map(a => ({
            filename: a.filename,
            content: a.content,
          })),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Email Service] HTTP Error:', response.status, errorText);
      return {
        success: false,
        sent: 0,
        failed: to.length,
        errors: [`HTTP ${response.status}: ${errorText}`],
      };
    }

    const data = await response.json();
    
    // tRPC wraps result in { result: { data: ... } }
    const result = data?.result?.data || data;
    
    return {
      success: result.success ?? false,
      sent: result.sent ?? 0,
      failed: result.failed ?? to.length,
      errors: result.errors ?? [],
    };
  } catch (error: any) {
    console.error('[Email Service] Error:', error);
    return {
      success: false,
      sent: 0,
      failed: to.length,
      errors: [error.message || 'Errore di rete'],
    };
  }
}

/**
 * Check if email service is configured (always true since backend handles it)
 */
export function isEmailConfigured(): boolean {
  return true; // Backend has the API key
}

/**
 * Get email statistics from Resend via backend
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
 * Get list of sent emails - returns empty for now, use tRPC stats instead
 */
export async function getEmailsList(limit: number = 100): Promise<EmailDetail[]> {
  // Stats are now fetched via tRPC in the stats screen
  return [];
}

/**
 * Get details of a specific email
 */
export async function getEmailDetails(emailId: string): Promise<any> {
  return null;
}

/**
 * Calculate aggregate statistics - returns empty, use tRPC stats instead
 */
export async function getAggregateStats(): Promise<EmailStats> {
  return {
    total: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    complained: 0,
  };
}

/**
 * Get statistics from database via tRPC (real data)
 */
export async function getStatsFromDatabase(): Promise<EmailStats | null> {
  return null;
}

/**
 * Get best send times from analytics
 */
export interface BestSendTime {
  dayOfWeek: number;
  hourOfDay: number;
  openRate: number;
}

/**
 * Get hourly open data for chart
 */
export interface HourlyData {
  hour: number;
  opens: number;
}

/**
 * Get daily open data for chart
 */
export interface DailyData {
  day: string;
  opens: number;
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
