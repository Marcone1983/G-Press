import { getDb } from "../server/db";
import { journalists } from "../drizzle/schema";
import * as fs from "fs";

async function addAllContacts() {
  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }
  
  // Get current count
  const currentCount = await db.select({ email: journalists.email }).from(journalists);
  console.log(`Current journalists in database: ${currentCount.length}`);
  
  // Get existing emails to check for TRUE duplicates only
  const existingEmails = new Set(currentCount.map((j: {email: string}) => j.email.toLowerCase()));
  
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
      // Only skip if email already exists
      if (!existingEmails.has(email.toLowerCase())) {
        contacts.push({ name, email, outlet, country });
      }
    }
  }
  
  console.log(`New contacts to add: ${contacts.length}`);
  
  const countryMap: Record<string, string> = {
    'USA': 'Stati Uniti', 'US': 'Stati Uniti', 'UK': 'Regno Unito', 'GB': 'Regno Unito',
    'FR': 'Francia', 'DE': 'Germania', 'ES': 'Spagna', 'IT': 'Italia', 'CA': 'Canada',
    'AU': 'Australia', 'JP': 'Giappone', 'IN': 'India', 'BR': 'Brasile', 'NP': 'Nepal',
    'ZA': 'Sudafrica', 'NO': 'Norvegia', 'UA': 'Ucraina', 'IL': 'Israele', 'TW': 'Taiwan',
    'Unknown': 'Internazionale', 'News': 'Internazionale',
  };
  
  // Insert in batches
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
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
      if (inserted % 500 === 0 || i + batchSize >= contacts.length) {
        console.log(`Inserted ${inserted}/${contacts.length} contacts...`);
      }
    } catch (error: any) {
      // Skip duplicates silently
      if (!error.message.includes('Duplicate')) {
        console.error(`Error at batch ${i}: ${error.message}`);
      }
    }
  }
  
  console.log(`Done! Inserted ${inserted} new contacts`);
  
  const finalCount = await db.select({ email: journalists.email }).from(journalists);
  console.log(`Total contacts in database: ${finalCount.length}`);
  
  process.exit(0);
}

addAllContacts().catch(console.error);
