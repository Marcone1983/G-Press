import { getDb } from "../server/db";
import { journalists } from "../drizzle/schema";
import * as fs from "fs";

interface Contact {
  name: string;
  email: string;
  outlet: string;
  country: string;
  category?: string;
}

async function addMissingContacts() {
  console.log("Connecting to database...");
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }
  
  // Get current emails in database
  const currentRecords = await db.select({ email: journalists.email }).from(journalists);
  const existingEmails = new Set(currentRecords.map((j: {email: string}) => j.email.toLowerCase()));
  console.log(`Current journalists in database: ${existingEmails.size}`);
  
  // Load new contacts from JSON
  console.log("Loading contacts from JSON...");
  const jsonPath = "/home/ubuntu/all_extracted_contacts.json";
  const content = fs.readFileSync(jsonPath, "utf-8");
  const allContacts: Contact[] = JSON.parse(content);
  console.log(`Total contacts in JSON: ${allContacts.length}`);
  
  // Filter only NEW contacts (not in database)
  const newContacts = allContacts.filter(c => !existingEmails.has(c.email.toLowerCase()));
  console.log(`New contacts to add: ${newContacts.length}`);
  
  if (newContacts.length === 0) {
    console.log("No new contacts to add!");
    process.exit(0);
  }
  
  // Insert in batches
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < newContacts.length; i += batchSize) {
    const batch = newContacts.slice(i, i + batchSize);
    const values = batch.map(c => ({
      name: c.name.substring(0, 100),
      email: c.email.toLowerCase(),
      outlet: c.outlet.substring(0, 100),
      country: c.country || 'Internazionale',
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
  
  // Final count
  const finalCount = await db.select({ email: journalists.email }).from(journalists);
  console.log(`Total contacts in database: ${finalCount.length}`);
  
  process.exit(0);
}

addMissingContacts().catch(console.error);
