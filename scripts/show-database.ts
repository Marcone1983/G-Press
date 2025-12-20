import { getDb } from "../server/db";
import { journalists, users, pressReleases, knowledgeDocuments, autopilotState, sendPatterns } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database non disponibile");
    return;
  }
  
  console.log("=== STATO DATABASE G-PRESS ===\n");
  
  // Count all tables
  const journalistCount = await db.select({ count: sql<number>`COUNT(*)` }).from(journalists);
  const userCount = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const pressCount = await db.select({ count: sql<number>`COUNT(*)` }).from(pressReleases);
  const kbCount = await db.select({ count: sql<number>`COUNT(*)` }).from(knowledgeDocuments);
  const autopilotCount = await db.select({ count: sql<number>`COUNT(*)` }).from(autopilotState);
  const patternsCount = await db.select({ count: sql<number>`COUNT(*)` }).from(sendPatterns);
  
  console.log("CONTEGGIO RECORD:");
  console.log("- Giornalisti:", journalistCount[0]?.count);
  console.log("- Utenti:", userCount[0]?.count);
  console.log("- Comunicati Stampa:", pressCount[0]?.count);
  console.log("- Documenti Knowledge Base:", kbCount[0]?.count);
  console.log("- Stati Autopilota:", autopilotCount[0]?.count);
  console.log("- Pattern di Invio:", patternsCount[0]?.count);
  
  // Sample journalists
  const sampleJournalists = await db.select({
    id: journalists.id,
    name: journalists.name,
    email: journalists.email,
    outlet: journalists.outlet,
    category: journalists.category,
    country: journalists.country
  }).from(journalists).limit(5);
  
  console.log("\n=== ESEMPIO GIORNALISTI (primi 5) ===");
  console.table(sampleJournalists);
  
  // Sample users
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role
  }).from(users);
  
  console.log("\n=== UTENTI ===");
  console.table(allUsers);
  
  process.exit(0);
}

main().catch(console.error);
