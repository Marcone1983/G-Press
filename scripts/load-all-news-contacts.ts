import { getDb } from "../server/db";
import { journalists } from "../drizzle/schema";
import * as fs from "fs";

interface Contact {
  name: string;
  email: string;
  outlet: string;
  country: string;
  category: string;
}

async function loadContacts() {
  console.log("Loading contacts from CSV...");
  
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }
  
  const csvPath = "/home/ubuntu/all_news_contacts.csv";
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").slice(1); // Skip header
  
  const contacts: Contact[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const [name, email, outlet, country, category] = line.split(",");
    if (name && email && email.includes("@")) {
      contacts.push({ name, email, outlet, country, category });
    }
  }
  
  console.log(`Parsed ${contacts.length} contacts from CSV`);
  
  // Get existing emails to avoid duplicates
  const existing = await db.select({ email: journalists.email }).from(journalists);
  const existingEmails = new Set(existing.map((j: { email: string }) => j.email.toLowerCase()));
  console.log(`Found ${existingEmails.size} existing contacts in database`);
  
  // Filter out duplicates
  const newContacts = contacts.filter(c => !existingEmails.has(c.email.toLowerCase()));
  console.log(`${newContacts.length} new contacts to add`);
  
  // Map country codes to full names
  const countryMap: Record<string, string> = {
    'USA': 'Stati Uniti',
    'US': 'Stati Uniti',
    'UK': 'Regno Unito',
    'GB': 'Regno Unito',
    'FR': 'Francia',
    'DE': 'Germania',
    'ES': 'Spagna',
    'IT': 'Italia',
    'CA': 'Canada',
    'AU': 'Australia',
    'JP': 'Giappone',
    'IN': 'India',
    'BR': 'Brasile',
    'MX': 'Messico',
    'NL': 'Paesi Bassi',
    'BE': 'Belgio',
    'CH': 'Svizzera',
    'AT': 'Austria',
    'SE': 'Svezia',
    'NO': 'Norvegia',
    'DK': 'Danimarca',
    'FI': 'Finlandia',
    'PL': 'Polonia',
    'PT': 'Portogallo',
    'IE': 'Irlanda',
    'NZ': 'Nuova Zelanda',
    'SG': 'Singapore',
    'HK': 'Hong Kong',
    'KR': 'Corea del Sud',
    'TW': 'Taiwan',
    'ZA': 'Sudafrica',
    'AE': 'Emirati Arabi',
    'IL': 'Israele',
    'RU': 'Russia',
    'CN': 'Cina',
    'NP': 'Nepal',
    'Unknown': 'Internazionale',
  };
  
  // Insert in batches
  const batchSize = 100;
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
      if (inserted % 500 === 0) {
        console.log(`Inserted ${inserted}/${newContacts.length} contacts...`);
      }
    } catch (error) {
      console.error(`Error inserting batch at ${i}:`, error);
    }
  }
  
  console.log(`\nDone! Inserted ${inserted} new contacts`);
  
  // Get final count
  const finalCount = await db.select({ email: journalists.email }).from(journalists);
  console.log(`Total contacts in database: ${finalCount.length}`);
  
  process.exit(0);
}

loadContacts().catch(console.error);
