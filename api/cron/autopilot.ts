/**
 * Vercel Cron Job for Autopilot
 * Runs every hour to:
 * 1. Check for trends relevant to GROWVERSE
 * 2. Generate articles using Knowledge Base
 * 3. Request approval from owner
 * 4. Process approved articles for sending
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
  console.log("[Cron Autopilot] Starting hourly cycle...");
  
  // Verify cron secret (required for security)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  // Vercel cron jobs send a special header
  const isVercelCron = req.headers["x-vercel-cron"] === "true";
  
  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error("[Cron Autopilot] Unauthorized request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";

    // Step 1: Check autopilot status
    console.log("[Cron Autopilot] Checking autopilot status...");
    const statusResponse = await fetch(`${baseUrl}/api/trpc/autonomousAutopilot.getStatus`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    
    const statusResult = await statusResponse.json();
    const status = statusResult?.result?.data;
    
    if (!status?.active) {
      console.log("[Cron Autopilot] Autopilot is not active, skipping cycle");
      return res.status(200).json({
        success: true,
        action: "skipped",
        reason: "Autopilot not active",
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Run autopilot cycle
    console.log("[Cron Autopilot] Running autopilot cycle...");
    const cycleResponse = await fetch(`${baseUrl}/api/trpc/autonomousAutopilot.runCycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const cycleResult = await cycleResponse.json();
    console.log("[Cron Autopilot] Cycle result:", cycleResult);

    // Step 3: Process follow-ups
    console.log("[Cron Autopilot] Processing follow-ups...");
    const followUpResponse = await fetch(`${baseUrl}/api/trpc/followUp.process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const followUpResult = await followUpResponse.json();
    console.log("[Cron Autopilot] Follow-up result:", followUpResult);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      autopilotCycle: cycleResult?.result?.data || cycleResult,
      followUps: followUpResult?.result?.data || followUpResult,
    });
  } catch (error: any) {
    console.error("[Cron Autopilot] Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
