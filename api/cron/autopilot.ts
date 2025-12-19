/**
 * Vercel Cron Job for Autopilot
 * Runs every hour to send optimal batches
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/autopilot",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

export default async function handler(req: any, res: any) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Call the autopilot process endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/trpc/autopilot.processHourlyBatch`, {
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
    console.error("Cron autopilot error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
