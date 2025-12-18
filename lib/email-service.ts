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
 * Get statistics grouped by recipient email
 */
export interface JournalistStats {
  email: string;
  total: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  lastSent?: string;
}

export async function getStatsByJournalist(): Promise<JournalistStats[]> {
  const emails = await getEmailsList(200);
  const statsMap = new Map<string, JournalistStats>();

  for (const email of emails) {
    if (!email.to || !Array.isArray(email.to)) continue;
    
    for (const recipient of email.to) {
      if (!statsMap.has(recipient)) {
        statsMap.set(recipient, {
          email: recipient,
          total: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
        });
      }
      
      const stats = statsMap.get(recipient)!;
      stats.total++;
      
      // Update last sent date
      if (!stats.lastSent || email.created_at > stats.lastSent) {
        stats.lastSent = email.created_at;
      }
      
      switch (email.last_event) {
        case 'delivered':
          stats.delivered++;
          break;
        case 'opened':
          stats.opened++;
          stats.delivered++;
          break;
        case 'clicked':
          stats.clicked++;
          stats.opened++;
          stats.delivered++;
          break;
        case 'bounced':
          stats.bounced++;
          break;
      }
    }
  }

  // Sort by open rate (descending)
  return Array.from(statsMap.values()).sort((a, b) => {
    const rateA = a.total > 0 ? a.opened / a.total : 0;
    const rateB = b.total > 0 ? b.opened / b.total : 0;
    return rateB - rateA;
  });
}

/**
 * Calculate journalist engagement score (0-100)
 * Based on open rate, click rate, and recency
 */
export interface JournalistScore {
  email: string;
  score: number;
  tier: 'top' | 'good' | 'average' | 'low' | 'inactive';
  openRate: number;
  lastEngagement?: string;
}

export async function getJournalistScores(): Promise<JournalistScore[]> {
  const stats = await getStatsByJournalist();
  
  return stats.map(s => {
    const openRate = s.total > 0 ? (s.opened / s.total) * 100 : 0;
    const clickRate = s.opened > 0 ? (s.clicked / s.opened) * 100 : 0;
    
    // Calculate base score from engagement
    let score = (openRate * 0.7) + (clickRate * 0.3);
    
    // Bonus for recent engagement
    if (s.lastSent) {
      const daysSinceLastSent = (Date.now() - new Date(s.lastSent).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSent < 7) score += 10;
      else if (daysSinceLastSent < 30) score += 5;
    }
    
    // Cap at 100
    score = Math.min(100, Math.round(score));
    
    // Determine tier
    let tier: JournalistScore['tier'];
    if (score >= 70) tier = 'top';
    else if (score >= 50) tier = 'good';
    else if (score >= 30) tier = 'average';
    else if (score > 0) tier = 'low';
    else tier = 'inactive';
    
    return {
      email: s.email,
      score,
      tier,
      openRate,
      lastEngagement: s.lastSent,
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Get best time to send emails based on historical open data
 */
export interface BestTimeRecommendation {
  dayOfWeek: string;
  hour: number;
  openRate: number;
  confidence: 'high' | 'medium' | 'low';
}

export async function getBestSendTime(): Promise<BestTimeRecommendation> {
  // In a real implementation, this would analyze historical data
  // For now, return industry best practices for press releases
  return {
    dayOfWeek: 'Martedì',
    hour: 10,
    openRate: 42,
    confidence: 'medium',
  };
}

/**
 * Schedule an email for future delivery
 * Note: This stores the scheduled email locally. In production, use a server-side scheduler.
 */
export interface ScheduledEmail {
  id: string;
  scheduledFor: string;
  options: EmailOptions;
  status: 'pending' | 'sent' | 'failed';
}

const SCHEDULED_EMAILS_KEY = 'gpress_scheduled_emails';

export async function scheduleEmail(scheduledFor: Date, options: EmailOptions): Promise<string> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  
  const scheduled: ScheduledEmail = {
    id: `sched_${Date.now()}`,
    scheduledFor: scheduledFor.toISOString(),
    options,
    status: 'pending',
  };
  
  const existing = await AsyncStorage.getItem(SCHEDULED_EMAILS_KEY);
  const list = existing ? JSON.parse(existing) : [];
  list.push(scheduled);
  await AsyncStorage.setItem(SCHEDULED_EMAILS_KEY, JSON.stringify(list));
  
  return scheduled.id;
}

export async function getScheduledEmails(): Promise<ScheduledEmail[]> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const existing = await AsyncStorage.getItem(SCHEDULED_EMAILS_KEY);
  return existing ? JSON.parse(existing) : [];
}

export async function cancelScheduledEmail(id: string): Promise<boolean> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const existing = await AsyncStorage.getItem(SCHEDULED_EMAILS_KEY);
  if (!existing) return false;
  
  const list = JSON.parse(existing);
  const filtered = list.filter((e: ScheduledEmail) => e.id !== id);
  await AsyncStorage.setItem(SCHEDULED_EMAILS_KEY, JSON.stringify(filtered));
  return filtered.length < list.length;
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
