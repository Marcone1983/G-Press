/**
 * LinkedIn CSV Import Endpoint
 * Parses and imports journalist contacts from LinkedIn export
 */

export const config = {
  runtime: 'edge',
};

interface LinkedInContact {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  position: string;
  connectedOn: string;
  notes?: string;
}

interface ImportedContact {
  name: string;
  email: string;
  outlet: string;
  category: string;
  country: string;
  position: string;
  source: 'linkedin';
  importedAt: string;
}

// Keywords to identify journalists
const JOURNALIST_KEYWORDS = [
  'journalist', 'giornalista', 'reporter', 'editor', 'editore', 'redattore',
  'correspondent', 'corrispondente', 'writer', 'scrittore', 'columnist',
  'news', 'media', 'press', 'stampa', 'editorial', 'editoriale',
  'anchor', 'broadcaster', 'producer', 'produttore', 'blogger',
  'content creator', 'comunicazione', 'communication', 'pr manager',
  'public relations', 'relazioni pubbliche', 'ufficio stampa',
];

// Keywords to identify media outlets
const MEDIA_KEYWORDS = [
  'news', 'times', 'post', 'herald', 'tribune', 'gazette', 'journal',
  'daily', 'weekly', 'magazine', 'rivista', 'quotidiano', 'giornale',
  'tv', 'television', 'radio', 'broadcast', 'media', 'press',
  'reuters', 'bloomberg', 'associated press', 'ansa', 'agi',
  'corriere', 'repubblica', 'stampa', 'sole', 'messaggero',
  'gazzetta', 'secolo', 'avvenire', 'fatto', 'giorno',
];

// Category detection based on company/position
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Tech': ['tech', 'technology', 'digital', 'software', 'startup', 'innovation', 'ai', 'cyber'],
  'Finance': ['finance', 'financial', 'business', 'economy', 'economic', 'banking', 'investment'],
  'Lifestyle': ['lifestyle', 'fashion', 'beauty', 'travel', 'food', 'wellness', 'health'],
  'Sport': ['sport', 'sports', 'calcio', 'football', 'basketball', 'tennis'],
  'Entertainment': ['entertainment', 'cinema', 'film', 'music', 'cultura', 'culture', 'arte'],
  'Politics': ['politic', 'government', 'parliament', 'policy'],
  'Science': ['science', 'research', 'scientific', 'environment', 'climate'],
};

function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === header.length) {
      const row: Record<string, string> = {};
      header.forEach((h, j) => {
        row[h] = values[j];
      });
      rows.push(row);
    }
  }
  
  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

function isJournalist(position: string, company: string): boolean {
  const combined = `${position} ${company}`.toLowerCase();
  return JOURNALIST_KEYWORDS.some(keyword => combined.includes(keyword)) ||
         MEDIA_KEYWORDS.some(keyword => combined.includes(keyword));
}

function detectCategory(position: string, company: string): string {
  const combined = `${position} ${company}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      return category;
    }
  }
  
  return 'General';
}

function detectCountry(company: string, notes: string = ''): string {
  const combined = `${company} ${notes}`.toLowerCase();
  
  const countryKeywords: Record<string, string[]> = {
    'Italia': ['italia', 'italy', 'italian', 'milano', 'roma', 'torino', 'napoli'],
    'USA': ['usa', 'united states', 'america', 'new york', 'california', 'washington'],
    'UK': ['uk', 'united kingdom', 'britain', 'london', 'england'],
    'Francia': ['france', 'french', 'paris', 'francia'],
    'Germania': ['germany', 'german', 'berlin', 'munich', 'germania'],
    'Spagna': ['spain', 'spanish', 'madrid', 'barcelona', 'spagna'],
  };
  
  for (const [country, keywords] of Object.entries(countryKeywords)) {
    if (keywords.some(keyword => combined.includes(keyword))) {
      return country;
    }
  }
  
  return 'Internazionale';
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { csvContent, filterJournalistsOnly = true } = body;

    if (!csvContent) {
      return new Response(JSON.stringify({ error: 'Missing CSV content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse CSV
    const rows = parseCSV(csvContent);
    
    if (rows.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No valid contacts found in CSV',
        hint: 'Assicurati che il file sia un export LinkedIn valido con intestazioni',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Map LinkedIn fields to our format
    // LinkedIn export typically has: First Name, Last Name, Email Address, Company, Position, Connected On
    const linkedInContacts: LinkedInContact[] = rows.map(row => ({
      firstName: row['First Name'] || row['Nome'] || '',
      lastName: row['Last Name'] || row['Cognome'] || '',
      email: row['Email Address'] || row['Email'] || row['Indirizzo email'] || '',
      company: row['Company'] || row['Azienda'] || row['Organization'] || '',
      position: row['Position'] || row['Posizione'] || row['Title'] || '',
      connectedOn: row['Connected On'] || row['Data connessione'] || '',
      notes: row['Notes'] || row['Note'] || '',
    }));

    // Filter and transform contacts
    const importedContacts: ImportedContact[] = [];
    const skippedContacts: { name: string; reason: string }[] = [];

    linkedInContacts.forEach(contact => {
      const name = `${contact.firstName} ${contact.lastName}`.trim();
      
      // Skip if no email
      if (!contact.email) {
        skippedContacts.push({ name, reason: 'Email mancante' });
        return;
      }

      // Skip if not a journalist (when filter is enabled)
      if (filterJournalistsOnly && !isJournalist(contact.position, contact.company)) {
        skippedContacts.push({ name, reason: 'Non identificato come giornalista' });
        return;
      }

      importedContacts.push({
        name,
        email: contact.email.toLowerCase(),
        outlet: contact.company || 'Freelance',
        category: detectCategory(contact.position, contact.company),
        country: detectCountry(contact.company, contact.notes),
        position: contact.position,
        source: 'linkedin',
        importedAt: new Date().toISOString(),
      });
    });

    return new Response(JSON.stringify({
      success: true,
      imported: importedContacts,
      skipped: skippedContacts,
      summary: {
        totalInCSV: rows.length,
        imported: importedContacts.length,
        skipped: skippedContacts.length,
        categories: [...new Set(importedContacts.map(c => c.category))],
        countries: [...new Set(importedContacts.map(c => c.country))],
      },
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('LinkedIn import error:', error);
    return new Response(JSON.stringify({ 
      error: 'Import failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
