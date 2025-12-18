// Vercel Serverless Function
// Types are inferred automatically in Vercel environment

// Lista di pattern URL comuni per pagine redazione/contatti
const CONTACT_PAGE_PATTERNS = [
  '/redazione',
  '/chi-siamo',
  '/contatti',
  '/about',
  '/about-us',
  '/contact',
  '/contact-us',
  '/team',
  '/staff',
  '/la-redazione',
  '/chi-siamo/redazione',
  '/chi-siamo/contatti',
];

// Regex per estrarre email valide
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Domini email da escludere (generici, non giornalisti)
const EXCLUDED_DOMAINS = [
  'example.com',
  'test.com',
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'privacy@',
  'cookie@',
  'gdpr@',
  'noreply@',
  'no-reply@',
  'info@',
  'support@',
  'help@',
  'admin@',
  'webmaster@',
];

// Mappa testate italiane -> domini
const OUTLET_DOMAINS: Record<string, string> = {
  'corriere della sera': 'corriere.it',
  'corriere': 'corriere.it',
  'repubblica': 'repubblica.it',
  'la repubblica': 'repubblica.it',
  'il sole 24 ore': 'ilsole24ore.com',
  'sole 24 ore': 'ilsole24ore.com',
  'la stampa': 'lastampa.it',
  'stampa': 'lastampa.it',
  'il messaggero': 'ilmessaggero.it',
  'messaggero': 'ilmessaggero.it',
  'il giornale': 'ilgiornale.it',
  'giornale': 'ilgiornale.it',
  'ansa': 'ansa.it',
  'agi': 'agi.it',
  'adnkronos': 'adnkronos.com',
  'il fatto quotidiano': 'ilfattoquotidiano.it',
  'fatto quotidiano': 'ilfattoquotidiano.it',
  'libero': 'liberoquotidiano.it',
  'il tempo': 'iltempo.it',
  'avvenire': 'avvenire.it',
  'il manifesto': 'ilmanifesto.it',
  'il foglio': 'ilfoglio.it',
  'domani': 'editorialedomani.it',
  'open': 'open.online',
  'fanpage': 'fanpage.it',
  'huffpost': 'huffingtonpost.it',
  'wired': 'wired.it',
  'sky tg24': 'tg24.sky.it',
  'tgcom24': 'tgcom24.mediaset.it',
  'rainews': 'rainews.it',
  // Testate tech
  'techcrunch': 'techcrunch.com',
  'the verge': 'theverge.com',
  'engadget': 'engadget.com',
  'mashable': 'mashable.com',
  'cnet': 'cnet.com',
  // Testate business
  'bloomberg': 'bloomberg.com',
  'forbes': 'forbes.com',
  'fortune': 'fortune.com',
  'financial times': 'ft.com',
  'wall street journal': 'wsj.com',
  'wsj': 'wsj.com',
  // Testate UK
  'bbc': 'bbc.com',
  'guardian': 'theguardian.com',
  'the guardian': 'theguardian.com',
  'telegraph': 'telegraph.co.uk',
  'the times': 'thetimes.co.uk',
  // Testate USA
  'new york times': 'nytimes.com',
  'nyt': 'nytimes.com',
  'washington post': 'washingtonpost.com',
  'cnn': 'cnn.com',
  'reuters': 'reuters.com',
  'ap': 'apnews.com',
  'associated press': 'apnews.com',
};

interface ScrapedContact {
  email: string;
  name?: string;
  role?: string;
  source: string;
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; G-Press/1.0; +https://g-press.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function extractEmails(html: string): string[] {
  const emails = html.match(EMAIL_REGEX) || [];
  
  // Filtra email escluse
  return [...new Set(emails)].filter(email => {
    const lowerEmail = email.toLowerCase();
    return !EXCLUDED_DOMAINS.some(excluded => 
      lowerEmail.includes(excluded)
    );
  });
}

function extractNameFromContext(html: string, email: string): string | undefined {
  // Cerca il nome vicino all'email nel HTML
  const emailIndex = html.indexOf(email);
  if (emailIndex === -1) return undefined;
  
  // Prendi 200 caratteri prima dell'email
  const context = html.substring(Math.max(0, emailIndex - 200), emailIndex);
  
  // Pattern comuni per nomi
  const namePatterns = [
    /<strong>([^<]+)<\/strong>/,
    /<b>([^<]+)<\/b>/,
    /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/,
    /class="[^"]*name[^"]*"[^>]*>([^<]+)</,
  ];
  
  for (const pattern of namePatterns) {
    const match = context.match(pattern);
    if (match && match[1] && match[1].length < 50) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { outlet } = req.body;
    
    if (!outlet || typeof outlet !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Nome testata richiesto' 
      });
    }
    
    const outletLower = outlet.toLowerCase().trim();
    
    // Trova il dominio della testata
    let domain = OUTLET_DOMAINS[outletLower];
    
    // Se non trovato, prova a costruire il dominio
    if (!domain) {
      // Rimuovi spazi e caratteri speciali
      const cleanName = outletLower.replace(/[^a-z0-9]/g, '');
      domain = `${cleanName}.it`; // Default italiano
    }
    
    const baseUrl = `https://www.${domain}`;
    const contacts: ScrapedContact[] = [];
    const pagesScraped: string[] = [];
    
    // Scrape pagine contatti/redazione
    for (const pattern of CONTACT_PAGE_PATTERNS) {
      const url = `${baseUrl}${pattern}`;
      const html = await fetchPageContent(url);
      
      if (html) {
        pagesScraped.push(url);
        const emails = extractEmails(html);
        
        for (const email of emails) {
          // Verifica che l'email appartenga al dominio della testata
          if (email.toLowerCase().includes(domain.split('.')[0])) {
            const name = extractNameFromContext(html, email);
            contacts.push({
              email: email.toLowerCase(),
              name,
              source: url,
            });
          }
        }
      }
    }
    
    // Prova anche la homepage
    const homepageHtml = await fetchPageContent(baseUrl);
    if (homepageHtml) {
      pagesScraped.push(baseUrl);
      const emails = extractEmails(homepageHtml);
      
      for (const email of emails) {
        if (email.toLowerCase().includes(domain.split('.')[0])) {
          if (!contacts.find(c => c.email === email.toLowerCase())) {
            contacts.push({
              email: email.toLowerCase(),
              source: baseUrl,
            });
          }
        }
      }
    }
    
    // Rimuovi duplicati
    const uniqueContacts = contacts.reduce((acc, curr) => {
      if (!acc.find(c => c.email === curr.email)) {
        acc.push(curr);
      }
      return acc;
    }, [] as ScrapedContact[]);
    
    return res.status(200).json({
      success: true,
      outlet: outlet,
      domain: domain,
      contacts: uniqueContacts,
      pagesScraped: pagesScraped,
      summary: {
        totalFound: uniqueContacts.length,
        pagesChecked: pagesScraped.length,
      },
    });
    
  } catch (error: any) {
    console.error('Scrape error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Errore durante lo scraping',
    });
  }
}
