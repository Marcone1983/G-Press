import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { journalists } from "../drizzle/schema";
import * as fs from "fs";

interface Outlet {
  name: string;
  email: string;
  outlet: string;
  category: string;
  country: string;
  city?: string;
  state?: string;
  twitter?: string;
  website?: string;
}

async function loadOutletsToDb() {
  console.log("Connecting to database...");
  
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  
  const db = drizzle(process.env.DATABASE_URL);
  
  console.log("Loading outlets from extracted JSON...");
  
  const outletsData = fs.readFileSync("/home/ubuntu/extracted_outlets.json", "utf-8");
  const outlets: Outlet[] = JSON.parse(outletsData);
  
  console.log(`Found ${outlets.length} outlets to load`);
  
  // Get existing emails to avoid duplicates
  const existingJournalists = await db.select({ email: journalists.email }).from(journalists);
  const existingEmails = new Set(existingJournalists.map((j: { email: string }) => j.email.toLowerCase()));
  
  console.log(`Found ${existingEmails.size} existing journalists in database`);
  
  // Filter out duplicates
  const newOutlets = outlets.filter(o => !existingEmails.has(o.email.toLowerCase()));
  console.log(`${newOutlets.length} new outlets to insert (${outlets.length - newOutlets.length} duplicates skipped)`);
  
  if (newOutlets.length === 0) {
    console.log("No new outlets to insert");
    return;
  }
  
  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < newOutlets.length; i += batchSize) {
    const batch = newOutlets.slice(i, i + batchSize);
    
    const values = batch.map(outlet => ({
      name: outlet.name.slice(0, 255),
      email: outlet.email.slice(0, 255),
      outlet: outlet.outlet.slice(0, 255),
      category: "general" as const,
      country: outlet.country || "US",
      city: outlet.city?.slice(0, 100) || null,
      region: outlet.state?.slice(0, 100) || null,
      twitter: outlet.twitter?.slice(0, 100) || null,
      isActive: true,
    }));
    
    try {
      await db.insert(journalists).values(values);
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${newOutlets.length} outlets`);
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
  
  console.log(`\nDone! Inserted ${inserted} new outlets`);
  
  // Get final count
  const finalCount = await db.select({ email: journalists.email }).from(journalists);
  console.log(`Total journalists in database: ${finalCount.length}`);
}

loadOutletsToDb()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
