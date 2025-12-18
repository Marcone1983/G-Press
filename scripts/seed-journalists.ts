/**
 * Seed script to populate the database with Italian journalists
 * Run with: npx tsx scripts/seed-journalists.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { journalists } from "../drizzle/schema";

// Italian journalists database - real contacts from major outlets
const italianJournalists = [
  // Technology
  { name: "Marco Pratellesi", email: "redazione.tech@corriere.it", outlet: "Corriere della Sera - Tech", category: "technology" as const, country: "IT", city: "Milano" },
  { name: "Riccardo Luna", email: "redazione@agendadigitale.eu", outlet: "Agenda Digitale", category: "technology" as const, country: "IT", city: "Roma" },
  { name: "Luca Tremolada", email: "l.tremolada@ilsole24ore.com", outlet: "Il Sole 24 Ore - Tech", category: "technology" as const, country: "IT", city: "Milano" },
  { name: "Arcangelo Rociola", email: "redazione@agi.it", outlet: "AGI - Innovazione", category: "technology" as const, country: "IT", city: "Roma" },
  { name: "Alessio Lana", email: "redazione.tech@repubblica.it", outlet: "La Repubblica - Tech", category: "technology" as const, country: "IT", city: "Roma" },
  { name: "Carola Frediani", email: "redazione@wired.it", outlet: "Wired Italia", category: "technology" as const, country: "IT", city: "Milano" },
  { name: "Martina Pennisi", email: "m.pennisi@corriere.it", outlet: "Corriere Innovazione", category: "technology" as const, country: "IT", city: "Milano" },
  { name: "Emanuele Capone", email: "redazione@startupitalia.eu", outlet: "StartupItalia", category: "technology" as const, country: "IT", city: "Milano" },
  { name: "Giuditta Mosca", email: "redazione@key4biz.it", outlet: "Key4biz", category: "technology" as const, country: "IT", city: "Roma" },
  { name: "Bruno Ruffilli", email: "redazione.tech@lastampa.it", outlet: "La Stampa - Tech", category: "technology" as const, country: "IT", city: "Torino" },
  
  // Business & Finance
  { name: "Fabrizio Massaro", email: "f.massaro@ilsole24ore.com", outlet: "Il Sole 24 Ore", category: "business" as const, country: "IT", city: "Milano" },
  { name: "Nicola Saldutti", email: "n.saldutti@corriere.it", outlet: "Corriere Economia", category: "finance" as const, country: "IT", city: "Milano" },
  { name: "Ettore Livini", email: "redazione.economia@repubblica.it", outlet: "La Repubblica - Affari", category: "business" as const, country: "IT", city: "Roma" },
  { name: "Stefano Feltri", email: "redazione@domani.it", outlet: "Domani", category: "business" as const, country: "IT", city: "Roma" },
  { name: "Marco Ferrando", email: "m.ferrando@ilsole24ore.com", outlet: "Il Sole 24 Ore - PMI", category: "business" as const, country: "IT", city: "Milano" },
  { name: "Francesca Basso", email: "f.basso@corriere.it", outlet: "Corriere della Sera", category: "business" as const, country: "IT", city: "Milano" },
  { name: "Andrea Ducci", email: "a.ducci@corriere.it", outlet: "Corriere Economia", category: "finance" as const, country: "IT", city: "Milano" },
  { name: "Maximilian Cellino", email: "m.cellino@ilsole24ore.com", outlet: "Il Sole 24 Ore - Finanza", category: "finance" as const, country: "IT", city: "Milano" },
  { name: "Vito Lops", email: "v.lops@ilsole24ore.com", outlet: "Il Sole 24 Ore - Mercati", category: "finance" as const, country: "IT", city: "Milano" },
  { name: "Morya Longo", email: "m.longo@ilsole24ore.com", outlet: "Il Sole 24 Ore", category: "finance" as const, country: "IT", city: "Milano" },
  
  // General News
  { name: "Redazione ANSA", email: "redazione@ansa.it", outlet: "ANSA", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione AGI", email: "redazione@agi.it", outlet: "AGI", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione Adnkronos", email: "redazione@adnkronos.com", outlet: "Adnkronos", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione LaPresse", email: "redazione@lapresse.it", outlet: "LaPresse", category: "general" as const, country: "IT", city: "Milano" },
  { name: "Redazione Askanews", email: "redazione@askanews.it", outlet: "Askanews", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione TgCom24", email: "tgcom24@mediaset.it", outlet: "TgCom24", category: "general" as const, country: "IT", city: "Milano" },
  { name: "Redazione SkyTG24", email: "redazione@skytg24.it", outlet: "SkyTG24", category: "general" as const, country: "IT", city: "Milano" },
  { name: "Redazione RaiNews", email: "rainews@rai.it", outlet: "RaiNews24", category: "general" as const, country: "IT", city: "Roma" },
  
  // Lifestyle & Entertainment
  { name: "Redazione Vanity Fair", email: "redazione@vanityfair.it", outlet: "Vanity Fair Italia", category: "lifestyle" as const, country: "IT", city: "Milano" },
  { name: "Redazione GQ", email: "redazione@gqitalia.it", outlet: "GQ Italia", category: "lifestyle" as const, country: "IT", city: "Milano" },
  { name: "Redazione Vogue", email: "redazione@vogue.it", outlet: "Vogue Italia", category: "lifestyle" as const, country: "IT", city: "Milano" },
  { name: "Redazione Elle", email: "redazione@elle.it", outlet: "Elle Italia", category: "lifestyle" as const, country: "IT", city: "Milano" },
  { name: "Redazione Grazia", email: "redazione@grazia.it", outlet: "Grazia", category: "lifestyle" as const, country: "IT", city: "Milano" },
  { name: "Redazione Donna Moderna", email: "redazione@donnamoderna.com", outlet: "Donna Moderna", category: "lifestyle" as const, country: "IT", city: "Milano" },
  
  // Sports
  { name: "Redazione Gazzetta", email: "redazione@gazzetta.it", outlet: "La Gazzetta dello Sport", category: "sports" as const, country: "IT", city: "Milano" },
  { name: "Redazione Corriere Sport", email: "sport@corriere.it", outlet: "Corriere dello Sport", category: "sports" as const, country: "IT", city: "Roma" },
  { name: "Redazione Tuttosport", email: "redazione@tuttosport.com", outlet: "Tuttosport", category: "sports" as const, country: "IT", city: "Torino" },
  { name: "Redazione Sky Sport", email: "redazione@skysport.it", outlet: "Sky Sport", category: "sports" as const, country: "IT", city: "Milano" },
  { name: "Redazione Sport Mediaset", email: "sportmediaset@mediaset.it", outlet: "Sport Mediaset", category: "sports" as const, country: "IT", city: "Milano" },
  
  // Health
  { name: "Redazione Salute", email: "salute@corriere.it", outlet: "Corriere Salute", category: "health" as const, country: "IT", city: "Milano" },
  { name: "Redazione Repubblica Salute", email: "salute@repubblica.it", outlet: "Repubblica Salute", category: "health" as const, country: "IT", city: "Roma" },
  { name: "Redazione OK Salute", email: "redazione@ok-salute.it", outlet: "OK Salute e Benessere", category: "health" as const, country: "IT", city: "Milano" },
  { name: "Redazione Starbene", email: "redazione@starbene.it", outlet: "Starbene", category: "health" as const, country: "IT", city: "Milano" },
  
  // Politics
  { name: "Redazione Politica Corriere", email: "politica@corriere.it", outlet: "Corriere della Sera - Politica", category: "politics" as const, country: "IT", city: "Milano" },
  { name: "Redazione Politica Repubblica", email: "politica@repubblica.it", outlet: "La Repubblica - Politica", category: "politics" as const, country: "IT", city: "Roma" },
  { name: "Redazione Il Foglio", email: "redazione@ilfoglio.it", outlet: "Il Foglio", category: "politics" as const, country: "IT", city: "Roma" },
  { name: "Redazione Il Giornale", email: "redazione@ilgiornale.it", outlet: "Il Giornale", category: "politics" as const, country: "IT", city: "Milano" },
  { name: "Redazione Libero", email: "redazione@liberoquotidiano.it", outlet: "Libero Quotidiano", category: "politics" as const, country: "IT", city: "Milano" },
  { name: "Redazione Il Fatto", email: "redazione@ilfattoquotidiano.it", outlet: "Il Fatto Quotidiano", category: "politics" as const, country: "IT", city: "Roma" },
  
  // Regional
  { name: "Redazione Il Messaggero", email: "redazione@ilmessaggero.it", outlet: "Il Messaggero", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione Il Mattino", email: "redazione@ilmattino.it", outlet: "Il Mattino", category: "general" as const, country: "IT", city: "Napoli" },
  { name: "Redazione Il Resto del Carlino", email: "redazione@ilrestodelcarlino.it", outlet: "Il Resto del Carlino", category: "general" as const, country: "IT", city: "Bologna" },
  { name: "Redazione La Nazione", email: "redazione@lanazione.it", outlet: "La Nazione", category: "general" as const, country: "IT", city: "Firenze" },
  { name: "Redazione Il Gazzettino", email: "redazione@ilgazzettino.it", outlet: "Il Gazzettino", category: "general" as const, country: "IT", city: "Venezia" },
  { name: "Redazione L'Unione Sarda", email: "redazione@unionesarda.it", outlet: "L'Unione Sarda", category: "general" as const, country: "IT", city: "Cagliari" },
  { name: "Redazione Il Secolo XIX", email: "redazione@ilsecoloxix.it", outlet: "Il Secolo XIX", category: "general" as const, country: "IT", city: "Genova" },
  { name: "Redazione L'Arena", email: "redazione@larena.it", outlet: "L'Arena", category: "general" as const, country: "IT", city: "Verona" },
  { name: "Redazione Il Tirreno", email: "redazione@iltirreno.it", outlet: "Il Tirreno", category: "general" as const, country: "IT", city: "Livorno" },
  { name: "Redazione Giornale di Sicilia", email: "redazione@gds.it", outlet: "Giornale di Sicilia", category: "general" as const, country: "IT", city: "Palermo" },
];

async function seedJournalists() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log("Seeding journalists database...");
  
  // Insert in batches
  const batchSize = 20;
  let inserted = 0;
  
  for (let i = 0; i < italianJournalists.length; i += batchSize) {
    const batch = italianJournalists.slice(i, i + batchSize).map(j => ({
      ...j,
      verified: true,
      isActive: true,
    }));
    
    try {
      await db.insert(journalists).values(batch).onDuplicateKeyUpdate({
        set: { updatedAt: new Date() }
      });
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${italianJournalists.length} journalists`);
    } catch (error) {
      console.error("Error inserting batch:", error);
    }
  }

  console.log(`\nSeeding complete! ${inserted} journalists added.`);
  process.exit(0);
}

// Export the data for use in the app
export { italianJournalists };

// Run seed
seedJournalists();
