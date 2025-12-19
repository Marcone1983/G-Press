/**
 * Vercel Cron Job for Follow-up Processing
 * Runs every hour at :30 to process pending follow-ups
 */

export default async function handler(req: any, res: any) {
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/trpc/followUp.process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error: any) {
    console.error("Cron follow-up error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
