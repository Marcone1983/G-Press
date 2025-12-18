import { getDb } from "../server/db";
import { journalists } from "../drizzle/schema";

async function count() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    return;
  }
  const result = await db.select().from(journalists);
  console.log("Total journalists:", result.length);
  process.exit(0);
}

count();
