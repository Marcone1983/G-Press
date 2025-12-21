// Vercel serverless function for Resend webhooks

import crypto from "crypto";

/**
 * Resend Webhook Handler
 * Receives email events (delivered, opened, clicked, bounced, etc.)
 * 
 * Configure in Resend Dashboard:
 * Webhook URL: https://your-domain.vercel.app/api/webhooks/resend
 * Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained
 */

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // For click events
    click?: {
      link: string;
      timestamp: string;
      user_agent: string;
      ip_address: string;
    };
    // For open events
    open?: {
      timestamp: string;
      user_agent: string;
      ip_address: string;
    };
    // For bounce events
    bounce?: {
      message: string;
    };
  };
}

/**
 * Verify Resend webhook signature
 * @see https://resend.com/docs/dashboard/webhooks/verify-webhook-signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.warn("[Resend Webhook] Missing signature or secret");
    return false;
  }

  try {
    // Resend uses HMAC SHA256
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error("[Resend Webhook] Signature verification error:", error);
    return false;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get webhook signing secret
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    
    // Get signature from headers
    const signature = req.headers["resend-signature"] || req.headers["x-resend-signature"];
    
    // Get raw body for signature verification
    // NOTE: In Vercel, the raw body is not automatically available on req.body for serverless functions.
    // We assume a middleware or Vercel's body parser has been configured to provide the raw body in req.rawBody or similar.
    // For simplicity in this environment, we'll assume req.body is the raw text if it's a string, or we stringify it.
    const rawBody = req.rawBody ? req.rawBody.toString() : (typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    // Verify signature if secret is configured
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      
      if (!isValid) {
        console.error("[Resend Webhook] Invalid signature - rejecting request");
        return res.status(401).json({ error: "Invalid webhook signature" });
      }
      
      console.log("[Resend Webhook] Signature verified successfully");
    } else {
      console.warn("[Resend Webhook] RESEND_WEBHOOK_SECRET not configured - skipping signature verification");
    }

    const event = JSON.parse(rawBody) as ResendWebhookEvent;
    
    console.log("[Resend Webhook] Received event:", event.type);

    // Map Resend event types to our event types
    const eventTypeMap: Record<string, string> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
    };

    const eventType = eventTypeMap[event.type];
    if (!eventType) {
      console.log("[Resend Webhook] Unknown event type:", event.type);
      return res.status(200).json({ received: true, ignored: true });
    }

    // Extract data based on event type
    const emailId = event.data.email_id;
    const recipientEmail = event.data.to?.[0];
    
    let userAgent: string | undefined;
    let ipAddress: string | undefined;
    let clickedUrl: string | undefined;

    if (event.type === "email.opened" && event.data.open) {
      userAgent = event.data.open.user_agent;
      ipAddress = event.data.open.ip_address;
    } else if (event.type === "email.clicked" && event.data.click) {
      userAgent = event.data.click.user_agent;
      ipAddress = event.data.click.ip_address;
      clickedUrl = event.data.click.link;
    }

    // Call our internal API to save the event
    const apiUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/email/track-event`
      : "http://localhost:3000/api/email/track-event";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailId,
        eventType,
        recipientEmail,
        userAgent,
        ipAddress,
        clickedUrl,
        timestamp: event.created_at,
        rawData: event,
      }),
    });

    if (!response.ok) {
      console.error("[Resend Webhook] Failed to save event:", await response.text());
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Resend Webhook] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
