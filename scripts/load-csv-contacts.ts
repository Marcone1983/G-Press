import { getDb } from "../server/db";
import { journalists } from "../drizzle/schema";
import * as fs from "fs";

async function loadContacts() {
  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }
  
  console.log("Loading contacts from CSV...");
  const csvPath = "/home/ubuntu/all_news_contacts.csv";
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").slice(1);
  
  const contacts: Array<{name: string; email: string; outlet: string; country: string}> = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    const name = parts[0];
    const email = parts[1];
    const outlet = parts[2];
    const country = parts[3];
    if (name && email && email.includes("@")) {
      contacts.push({ name, email, outlet, country });
    }
  }
  
  console.log(`Parsed ${contacts.length} contacts from CSV`);
  
  // Get existing emails
  const existing = await db.select({ email: journalists.email }).from(journalists);
  const existingEmails = new Set(existing.map((j: {email: string}) => j.email.toLowerCase()));
  console.log(`Found ${existingEmails.size} existing contacts`);
  
  // Filter duplicates
  const newContacts = contacts.filter(c => !existingEmails.has(c.email.toLowerCase()));
  console.log(`${newContacts.length} new contacts to add`);
  
  const countryMap: Record<string, string> = {
    'USA': 'Stati Uniti', 'US': 'Stati Uniti', 'UK': 'Regno Unito', 'GB': 'Regno Unito',
    'FR': 'Francia', 'DE': 'Germania', 'ES': 'Spagna', 'IT': 'Italia', 'CA': 'Canada',
    'AU': 'Australia', 'JP': 'Giappone', 'IN': 'India', 'BR': 'Brasile', 'NP': 'Nepal',
    'Unknown': 'Internazionale',
  };
  
  // Insert in batches
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < newContacts.length; i += batchSize) {
    const batch = newContacts.slice(i, i + batchSize);
    const values = batch.map(c => ({
      name: c.name.substring(0, 100),
      email: c.email.toLowerCase(),
      outlet: c.outlet.substring(0, 100),
      country: countryMap[c.country] || c.country || 'Internazionale',
      category: 'general' as const,
      active: true,
    }));
    
    try {
      await db.insert(journalists).values(values);
      inserted += batch.length;
      if (inserted % 500 === 0 || i + batchSize >= newContacts.length) {
        console.log(`Inserted ${inserted}/${newContacts.length} contacts...`);
      }
    } catch (error: any) {
      console.error(`Error at batch ${i}: ${error.message}`);
    }
  }
  
  console.log(`Done! Inserted ${inserted} new contacts`);
  
  const finalCount = await db.select({ email: journalists.email }).from(journalists);
  console.log(`Total contacts in database: ${finalCount.length}`);
  
  process.exit(0);
}

loadContacts().catch(console.error);
