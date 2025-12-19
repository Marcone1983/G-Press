// Vercel serverless function for Resend webhooks

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = req.body as ResendWebhookEvent;
    
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
