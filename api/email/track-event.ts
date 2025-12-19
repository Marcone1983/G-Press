// Track email events from Resend webhooks

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      emailId,
      eventType,
      recipientEmail,
      userAgent,
      ipAddress,
      clickedUrl,
      timestamp,
      rawData,
    } = req.body;

    // Import database functions dynamically to avoid bundling issues
    const { saveEmailEvent, updateDistributionFromEvent, updateAnalytics, cancelFollowUpsForOpened } = await import("../../server/email-tracking");

    // Save the event
    await saveEmailEvent({
      emailId,
      eventType,
      recipientEmail,
      userAgent,
      ipAddress,
      clickedUrl,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      rawData,
    });

    // Update distribution status based on event
    await updateDistributionFromEvent(emailId, eventType, recipientEmail);

    // Update analytics for auto-timing
    if (eventType === "opened" || eventType === "clicked") {
      await updateAnalytics(recipientEmail, eventType, timestamp);
    }

    // If email was opened, cancel pending follow-ups
    if (eventType === "opened") {
      await cancelFollowUpsForOpened(emailId, recipientEmail);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[Track Event] Error:", error);
    return res.status(500).json({ error: "Failed to track event" });
  }
}
