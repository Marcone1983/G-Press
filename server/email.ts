import * as db from "./db";
import { notifyOwner } from "./_core/notification";

// Email sending configuration
// For production, integrate with Resend, SendGrid, or AWS SES
// For now, we use a simulated send that logs and updates status

interface SendResult {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  errors: string[];
}

/**
 * Send a press release to all active journalists
 * Optionally filter by category
 */
export async function sendPressRelease(
  pressReleaseId: number,
  categoryFilter?: string
): Promise<SendResult> {
  const result: SendResult = {
    success: false,
    totalSent: 0,
    totalFailed: 0,
    errors: [],
  };

  try {
    // Get the press release
    const pressRelease = await db.getPressReleaseById(pressReleaseId);
    if (!pressRelease) {
      result.errors.push("Press release not found");
      return result;
    }

    // Get journalists (filtered by category if specified)
    const journalists = await db.getAllJournalists({
      category: categoryFilter,
      isActive: true,
    });

    if (journalists.length === 0) {
      result.errors.push("No active journalists found");
      return result;
    }

    // Update press release status to sending
    await db.updatePressRelease(pressReleaseId, { status: "sending" });

    // Create distribution records
    const journalistIds = journalists.map((j) => j.id);
    await db.createDistributions(pressReleaseId, journalistIds);

    // Send emails to each journalist
    for (const journalist of journalists) {
      try {
        // Build email content
        const emailContent = buildEmailContent(pressRelease, journalist);
        
        // Send email (simulated for now - integrate with real email service)
        const sent = await sendEmail({
          to: journalist.email,
          subject: pressRelease.title,
          html: emailContent,
        });

        if (sent) {
          result.totalSent++;
          // Update distribution status
          const distributions = await db.getDistributionsByPressRelease(pressReleaseId);
          const dist = distributions.find(d => d.journalistId === journalist.id);
          if (dist) {
            await db.updateDistribution(dist.id, { 
              status: "sent", 
              sentAt: new Date() 
            });
          }
        } else {
          result.totalFailed++;
        }
      } catch (error) {
        result.totalFailed++;
        result.errors.push(`Failed to send to ${journalist.email}: ${error}`);
      }
    }

    // Update press release with final status and counts
    await db.updatePressRelease(pressReleaseId, {
      status: result.totalFailed === journalists.length ? "failed" : "sent",
      sentAt: new Date(),
      recipientCount: result.totalSent,
    });

    result.success = result.totalSent > 0;

    // Notify owner about the distribution
    await notifyOwner({
      title: "Press Release Distributed",
      content: `"${pressRelease.title}" sent to ${result.totalSent} journalists. ${result.totalFailed} failed.`,
    });

    return result;
  } catch (error) {
    result.errors.push(`Distribution error: ${error}`);
    await db.updatePressRelease(pressReleaseId, { status: "failed" });
    return result;
  }
}

/**
 * Build HTML email content from press release
 */
function buildEmailContent(
  pressRelease: any,
  journalist: any
): string {
  const greeting = journalist.name ? `Gentile ${journalist.name},` : "Gentile Redazione,";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1E88E5; font-size: 24px; margin-bottom: 10px; }
    h2 { color: #666; font-size: 18px; font-weight: normal; margin-top: 0; }
    .content { margin: 20px 0; white-space: pre-wrap; }
    .boilerplate { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
    .contact { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
    .footer { margin-top: 30px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <p>${greeting}</p>
  
  <p>Le inviamo il seguente comunicato stampa:</p>
  
  <h1>${pressRelease.title}</h1>
  ${pressRelease.subtitle ? `<h2>${pressRelease.subtitle}</h2>` : ''}
  
  <div class="content">${pressRelease.content}</div>
  
  ${pressRelease.boilerplate ? `
  <div class="boilerplate">
    <strong>Informazioni sull'azienda:</strong><br>
    ${pressRelease.boilerplate}
  </div>
  ` : ''}
  
  ${pressRelease.contactName || pressRelease.contactEmail ? `
  <div class="contact">
    <strong>Contatti per la stampa:</strong><br>
    ${pressRelease.contactName ? `${pressRelease.contactName}<br>` : ''}
    ${pressRelease.contactEmail ? `Email: ${pressRelease.contactEmail}<br>` : ''}
    ${pressRelease.contactPhone ? `Tel: ${pressRelease.contactPhone}` : ''}
  </div>
  ` : ''}
  
  <div class="footer">
    <p>Questo comunicato è stato inviato tramite G-Press.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send email using configured email service
 * TODO: Integrate with Resend, SendGrid, or AWS SES for production
 */
async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  // Check if we have an email API key configured
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey) {
    // Use Resend API
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "G-Press <noreply@gpress.app>",
          to: options.to,
          subject: options.subject,
          html: options.html,
        }),
      });
      
      if (response.ok) {
        console.log(`[Email] Sent to ${options.to}`);
        return true;
      } else {
        const error = await response.text();
        console.error(`[Email] Failed to send to ${options.to}:`, error);
        return false;
      }
    } catch (error) {
      console.error(`[Email] Error sending to ${options.to}:`, error);
      return false;
    }
  } else {
    // Simulated send for development/demo
    console.log(`[Email] SIMULATED send to ${options.to}: ${options.subject}`);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }
}

/**
 * Get email preview HTML
 */
export function getEmailPreview(pressRelease: any): string {
  return buildEmailContent(pressRelease, { name: "Anteprima" });
}


/**
 * Send bulk emails directly using Resend API
 * Used by the mobile app for direct email sending
 */
export async function sendBulkEmails(options: {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{ filename: string; content: string }>;
}): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const result = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  if (!resendApiKey) {
    result.errors.push("RESEND_API_KEY not configured");
    result.failed = options.to.length;
    return result;
  }

  const { to, subject, html, from = "Roberto Romagnino <g.ceo@growverse.net>", attachments } = options;

  // Send in batches of 50
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  
  for (let i = 0; i < to.length; i += BATCH_SIZE) {
    batches.push(to.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const requestBody: any = {
        from,
        to: batch,
        subject,
        html,
      };

      if (attachments && attachments.length > 0) {
        requestBody.attachments = attachments;
      }

      console.log(`[Email] Sending to ${batch.length} recipients...`);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Email] Success:`, data);
        result.sent += batch.length;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Email] Failed:`, errorData);
        result.failed += batch.length;
        result.errors.push(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error(`[Email] Error:`, error);
      result.failed += batch.length;
      result.errors.push(error.message || "Network error");
    }
  }

  result.success = result.failed === 0;
  return result;
}
