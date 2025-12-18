import { drizzle } from "drizzle-orm/mysql2";
import { journalists } from "../drizzle/schema";
import * as fs from "fs";

interface Contact {
  name: string;
  email: string;
  outlet: string;
  country: string;
}

async function loadNewContacts() {
  console.log("Connecting to database...");
  
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  
  const db = drizzle(process.env.DATABASE_URL);
  
  console.log("Loading contacts from extracted JSON...");
  
  const contactsData = fs.readFileSync("/home/ubuntu/new_contacts.json", "utf-8");
  const contacts: Contact[] = JSON.parse(contactsData);
  
  console.log(`Found ${contacts.length} contacts to load`);
  
  // Get existing emails to avoid duplicates
  const existingJournalists = await db.select({ email: journalists.email }).from(journalists);
  const existingEmails = new Set(existingJournalists.map((j: { email: string }) => j.email.toLowerCase()));
  
  console.log(`Found ${existingEmails.size} existing journalists in database`);
  
  // Filter out duplicates
  const newContacts = contacts.filter(c => !existingEmails.has(c.email.toLowerCase()));
  console.log(`${newContacts.length} new contacts to insert (${contacts.length - newContacts.length} duplicates skipped)`);
  
  if (newContacts.length === 0) {
    console.log("No new contacts to insert");
    return;
  }
  
  // Map country codes
  const countryMap: Record<string, string> = {
    "Australia": "AU",
    "Canada": "CA",
    "USA": "US",
    "USA/International": "US",
    "United States": "US",
    "Kenya": "KE",
    "Uganda": "UG",
    "Nigeria": "NG",
    "Sudan": "SD",
    "South Korea": "KR",
    "Indonesia": "ID",
    "Philippines": "PH",
    "India": "IN",
    "UK": "GB",
    "France": "FR",
    "Germany": "DE",
    "Spain": "ES",
    "Italy": "IT",
  };
  
  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < newContacts.length; i += batchSize) {
    const batch = newContacts.slice(i, i + batchSize);
    
    const values = batch.map(contact => ({
      name: (contact.name || contact.outlet || "Unknown").slice(0, 255),
      email: contact.email.slice(0, 320),
      outlet: (contact.outlet || "").slice(0, 255) || null,
      category: "general" as const,
      country: countryMap[contact.country] || contact.country?.slice(0, 2)?.toUpperCase() || "XX",
      isActive: true,
    }));
    
    try {
      await db.insert(journalists).values(values);
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${newContacts.length} contacts`);
    } catch (error) {
      console.error(`Error inserting batch at index ${i}:`, error);
      // Try inserting one by one
      for (const value of values) {
        try {
          await db.insert(journalists).values(value);
          inserted++;
        } catch (e) {
          console.error(`Failed to insert ${value.email}:`, e);
        }
      }
    }
  }
  
  console.log(`\nDone! Inserted ${inserted} new contacts`);
  
  // Get final count
  const finalCount = await db.select({ email: journalists.email }).from(journalists);
  console.log(`Total journalists in database: ${finalCount.length}`);
}

loadNewContacts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
