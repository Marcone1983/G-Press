/**
 * Global Journalists Database Seed Script
 * Contains journalists from major outlets worldwide
 */

import { drizzle } from "drizzle-orm/mysql2";
import { journalists } from "../drizzle/schema";

// Global journalists database organized by country/region
const globalJournalists = [
  // ============================================
  // ITALY - Major National & Regional Outlets
  // ============================================
  { name: "Marco Pratellesi", email: "redazione.tech@corriere.it", outlet: "Corriere della Sera - Tech", category: "technology" as const, country: "IT", city: "Milano" },
  { name: "Riccardo Luna", email: "redazione@agendadigitale.eu", outlet: "Agenda Digitale", category: "technology" as const, country: "IT", city: "Roma" },
  { name: "Luca Tremolada", email: "l.tremolada@ilsole24ore.com", outlet: "Il Sole 24 Ore - Tech", category: "technology" as const, country: "IT", city: "Milano" },
  { name: "Redazione ANSA", email: "redazione@ansa.it", outlet: "ANSA", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione AGI", email: "redazione@agi.it", outlet: "AGI", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione Adnkronos", email: "redazione@adnkronos.com", outlet: "Adnkronos", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione Repubblica", email: "redazione@repubblica.it", outlet: "La Repubblica", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione Corriere", email: "redazione@corriere.it", outlet: "Corriere della Sera", category: "general" as const, country: "IT", city: "Milano" },
  { name: "Redazione La Stampa", email: "redazione@lastampa.it", outlet: "La Stampa", category: "general" as const, country: "IT", city: "Torino" },
  { name: "Redazione Il Messaggero", email: "redazione@ilmessaggero.it", outlet: "Il Messaggero", category: "general" as const, country: "IT", city: "Roma" },
  { name: "Redazione Gazzetta", email: "redazione@gazzetta.it", outlet: "La Gazzetta dello Sport", category: "sports" as const, country: "IT", city: "Milano" },
  { name: "Redazione Wired Italia", email: "redazione@wired.it", outlet: "Wired Italia", category: "technology" as const, country: "IT", city: "Milano" },
  { name: "Redazione StartupItalia", email: "redazione@startupitalia.eu", outlet: "StartupItalia", category: "technology" as const, country: "IT", city: "Milano" },
  { name: "Redazione Il Sole 24 Ore", email: "redazione@ilsole24ore.com", outlet: "Il Sole 24 Ore", category: "business" as const, country: "IT", city: "Milano" },
  { name: "Redazione Milano Finanza", email: "redazione@milanofinanza.it", outlet: "Milano Finanza", category: "finance" as const, country: "IT", city: "Milano" },

  // ============================================
  // USA - Major National Outlets
  // ============================================
  { name: "News Desk", email: "newsdesk@nytimes.com", outlet: "The New York Times", category: "general" as const, country: "US", city: "New York" },
  { name: "Tech Editor", email: "tech@nytimes.com", outlet: "The New York Times - Tech", category: "technology" as const, country: "US", city: "New York" },
  { name: "Business Desk", email: "business@nytimes.com", outlet: "The New York Times - Business", category: "business" as const, country: "US", city: "New York" },
  { name: "News Tips", email: "newstips@wsj.com", outlet: "The Wall Street Journal", category: "business" as const, country: "US", city: "New York" },
  { name: "Tech Coverage", email: "tech@wsj.com", outlet: "The Wall Street Journal - Tech", category: "technology" as const, country: "US", city: "New York" },
  { name: "National Desk", email: "national@washpost.com", outlet: "The Washington Post", category: "general" as const, country: "US", city: "Washington DC" },
  { name: "Tech Policy", email: "tech@washpost.com", outlet: "The Washington Post - Tech", category: "technology" as const, country: "US", city: "Washington DC" },
  { name: "News Desk", email: "tips@latimes.com", outlet: "Los Angeles Times", category: "general" as const, country: "US", city: "Los Angeles" },
  { name: "News Tips", email: "tips@chicagotribune.com", outlet: "Chicago Tribune", category: "general" as const, country: "US", city: "Chicago" },
  { name: "News Desk", email: "metro@bostonglobe.com", outlet: "The Boston Globe", category: "general" as const, country: "US", city: "Boston" },
  { name: "CNN Tips", email: "tips@cnn.com", outlet: "CNN", category: "general" as const, country: "US", city: "Atlanta" },
  { name: "CNN Business", email: "business@cnn.com", outlet: "CNN Business", category: "business" as const, country: "US", city: "New York" },
  { name: "NBC News Tips", email: "tips@nbcnews.com", outlet: "NBC News", category: "general" as const, country: "US", city: "New York" },
  { name: "CBS News", email: "evening@cbsnews.com", outlet: "CBS News", category: "general" as const, country: "US", city: "New York" },
  { name: "ABC News Tips", email: "tips@abc.com", outlet: "ABC News", category: "general" as const, country: "US", city: "New York" },
  { name: "Fox News Tips", email: "newsmanager@foxnews.com", outlet: "Fox News", category: "general" as const, country: "US", city: "New York" },
  { name: "USA Today", email: "accuracy@usatoday.com", outlet: "USA Today", category: "general" as const, country: "US", city: "McLean" },
  { name: "AP News Desk", email: "info@ap.org", outlet: "Associated Press", category: "general" as const, country: "US", city: "New York" },
  { name: "UPI News", email: "tips@upi.com", outlet: "United Press International", category: "general" as const, country: "US", city: "Washington DC" },

  // ============================================
  // USA - Tech & Business Outlets
  // ============================================
  { name: "TechCrunch Tips", email: "tips@techcrunch.com", outlet: "TechCrunch", category: "technology" as const, country: "US", city: "San Francisco" },
  { name: "The Verge Tips", email: "tips@theverge.com", outlet: "The Verge", category: "technology" as const, country: "US", city: "New York" },
  { name: "Wired Tips", email: "tips@wired.com", outlet: "Wired", category: "technology" as const, country: "US", city: "San Francisco" },
  { name: "Ars Technica", email: "tips@arstechnica.com", outlet: "Ars Technica", category: "technology" as const, country: "US", city: "Chicago" },
  { name: "Engadget Tips", email: "tips@engadget.com", outlet: "Engadget", category: "technology" as const, country: "US", city: "New York" },
  { name: "CNET News", email: "news@cnet.com", outlet: "CNET", category: "technology" as const, country: "US", city: "San Francisco" },
  { name: "ZDNet", email: "news@zdnet.com", outlet: "ZDNet", category: "technology" as const, country: "US", city: "San Francisco" },
  { name: "VentureBeat", email: "tips@venturebeat.com", outlet: "VentureBeat", category: "technology" as const, country: "US", city: "San Francisco" },
  { name: "Mashable", email: "tips@mashable.com", outlet: "Mashable", category: "technology" as const, country: "US", city: "New York" },
  { name: "Gizmodo Tips", email: "tips@gizmodo.com", outlet: "Gizmodo", category: "technology" as const, country: "US", city: "New York" },
  { name: "Bloomberg News", email: "newsroom@bloomberg.net", outlet: "Bloomberg", category: "business" as const, country: "US", city: "New York" },
  { name: "Bloomberg Tech", email: "tech@bloomberg.net", outlet: "Bloomberg Technology", category: "technology" as const, country: "US", city: "San Francisco" },
  { name: "Forbes Tips", email: "tips@forbes.com", outlet: "Forbes", category: "business" as const, country: "US", city: "New York" },
  { name: "Fortune", email: "letters@fortune.com", outlet: "Fortune", category: "business" as const, country: "US", city: "New York" },
  { name: "Business Insider", email: "tips@businessinsider.com", outlet: "Business Insider", category: "business" as const, country: "US", city: "New York" },
  { name: "CNBC", email: "tips@cnbc.com", outlet: "CNBC", category: "finance" as const, country: "US", city: "Englewood Cliffs" },
  { name: "MarketWatch", email: "tips@marketwatch.com", outlet: "MarketWatch", category: "finance" as const, country: "US", city: "New York" },
  { name: "Fast Company", email: "tips@fastcompany.com", outlet: "Fast Company", category: "business" as const, country: "US", city: "New York" },
  { name: "Inc Magazine", email: "tips@inc.com", outlet: "Inc.", category: "business" as const, country: "US", city: "New York" },
  { name: "Entrepreneur", email: "tips@entrepreneur.com", outlet: "Entrepreneur", category: "business" as const, country: "US", city: "Irvine" },

  // ============================================
  // UK - Major Outlets
  // ============================================
  { name: "BBC News Desk", email: "newsonline@bbc.co.uk", outlet: "BBC News", category: "general" as const, country: "GB", city: "London" },
  { name: "BBC Tech", email: "technology@bbc.co.uk", outlet: "BBC Technology", category: "technology" as const, country: "GB", city: "London" },
  { name: "BBC Business", email: "business@bbc.co.uk", outlet: "BBC Business", category: "business" as const, country: "GB", city: "London" },
  { name: "Guardian News", email: "national@theguardian.com", outlet: "The Guardian", category: "general" as const, country: "GB", city: "London" },
  { name: "Guardian Tech", email: "tech@theguardian.com", outlet: "The Guardian - Tech", category: "technology" as const, country: "GB", city: "London" },
  { name: "The Times News", email: "home.news@thetimes.co.uk", outlet: "The Times", category: "general" as const, country: "GB", city: "London" },
  { name: "Telegraph News", email: "dtletters@telegraph.co.uk", outlet: "The Daily Telegraph", category: "general" as const, country: "GB", city: "London" },
  { name: "Telegraph Tech", email: "technology@telegraph.co.uk", outlet: "The Telegraph - Tech", category: "technology" as const, country: "GB", city: "London" },
  { name: "Financial Times", email: "news.desk@ft.com", outlet: "Financial Times", category: "business" as const, country: "GB", city: "London" },
  { name: "FT Tech", email: "tech@ft.com", outlet: "Financial Times - Tech", category: "technology" as const, country: "GB", city: "London" },
  { name: "The Independent", email: "newsdesk@independent.co.uk", outlet: "The Independent", category: "general" as const, country: "GB", city: "London" },
  { name: "Daily Mail", email: "news@dailymail.co.uk", outlet: "Daily Mail", category: "general" as const, country: "GB", city: "London" },
  { name: "The Sun", email: "exclusive@the-sun.co.uk", outlet: "The Sun", category: "general" as const, country: "GB", city: "London" },
  { name: "Mirror News", email: "mirrornews@mirror.co.uk", outlet: "Daily Mirror", category: "general" as const, country: "GB", city: "London" },
  { name: "Sky News", email: "news@sky.com", outlet: "Sky News", category: "general" as const, country: "GB", city: "London" },
  { name: "Reuters UK", email: "uk.editorial@thomsonreuters.com", outlet: "Reuters UK", category: "general" as const, country: "GB", city: "London" },
  { name: "PA Media", email: "news@pamedia.co.uk", outlet: "PA Media (Press Association)", category: "general" as const, country: "GB", city: "London" },
  { name: "The Economist", email: "letters@economist.com", outlet: "The Economist", category: "business" as const, country: "GB", city: "London" },
  { name: "TechRadar", email: "tips@techradar.com", outlet: "TechRadar", category: "technology" as const, country: "GB", city: "Bath" },
  { name: "The Register", email: "news@theregister.com", outlet: "The Register", category: "technology" as const, country: "GB", city: "London" },

  // ============================================
  // FRANCE - Major Outlets
  // ============================================
  { name: "Le Monde Rédaction", email: "redaction@lemonde.fr", outlet: "Le Monde", category: "general" as const, country: "FR", city: "Paris" },
  { name: "Le Monde Tech", email: "pixels@lemonde.fr", outlet: "Le Monde - Pixels (Tech)", category: "technology" as const, country: "FR", city: "Paris" },
  { name: "Le Figaro", email: "redaction@lefigaro.fr", outlet: "Le Figaro", category: "general" as const, country: "FR", city: "Paris" },
  { name: "Le Figaro Tech", email: "tech@lefigaro.fr", outlet: "Le Figaro - Tech", category: "technology" as const, country: "FR", city: "Paris" },
  { name: "Libération", email: "redaction@liberation.fr", outlet: "Libération", category: "general" as const, country: "FR", city: "Paris" },
  { name: "Les Echos", email: "redaction@lesechos.fr", outlet: "Les Echos", category: "business" as const, country: "FR", city: "Paris" },
  { name: "La Tribune", email: "redaction@latribune.fr", outlet: "La Tribune", category: "business" as const, country: "FR", city: "Paris" },
  { name: "AFP", email: "infos.generales@afp.com", outlet: "Agence France-Presse", category: "general" as const, country: "FR", city: "Paris" },
  { name: "France 24", email: "info@france24.com", outlet: "France 24", category: "general" as const, country: "FR", city: "Paris" },
  { name: "BFM TV", email: "redaction@bfmtv.com", outlet: "BFM TV", category: "general" as const, country: "FR", city: "Paris" },
  { name: "01net", email: "redaction@01net.com", outlet: "01net", category: "technology" as const, country: "FR", city: "Paris" },
  { name: "Numerama", email: "redaction@numerama.com", outlet: "Numerama", category: "technology" as const, country: "FR", city: "Paris" },
  { name: "FrenchWeb", email: "redaction@frenchweb.fr", outlet: "FrenchWeb", category: "technology" as const, country: "FR", city: "Paris" },
  { name: "Maddyness", email: "redaction@maddyness.com", outlet: "Maddyness", category: "technology" as const, country: "FR", city: "Paris" },
  { name: "L'Usine Digitale", email: "redaction@usine-digitale.fr", outlet: "L'Usine Digitale", category: "technology" as const, country: "FR", city: "Paris" },

  // ============================================
  // GERMANY - Major Outlets
  // ============================================
  { name: "Der Spiegel", email: "redaktion@spiegel.de", outlet: "Der Spiegel", category: "general" as const, country: "DE", city: "Hamburg" },
  { name: "Spiegel Tech", email: "netzwelt@spiegel.de", outlet: "Der Spiegel - Netzwelt", category: "technology" as const, country: "DE", city: "Hamburg" },
  { name: "FAZ Redaktion", email: "leserbriefe@faz.de", outlet: "Frankfurter Allgemeine Zeitung", category: "general" as const, country: "DE", city: "Frankfurt" },
  { name: "Süddeutsche", email: "redaktion@sueddeutsche.de", outlet: "Süddeutsche Zeitung", category: "general" as const, country: "DE", city: "Munich" },
  { name: "Die Zeit", email: "leserbriefe@zeit.de", outlet: "Die Zeit", category: "general" as const, country: "DE", city: "Hamburg" },
  { name: "Handelsblatt", email: "redaktion@handelsblatt.com", outlet: "Handelsblatt", category: "business" as const, country: "DE", city: "Düsseldorf" },
  { name: "Wirtschaftswoche", email: "redaktion@wiwo.de", outlet: "Wirtschaftswoche", category: "business" as const, country: "DE", city: "Düsseldorf" },
  { name: "Die Welt", email: "briefe@welt.de", outlet: "Die Welt", category: "general" as const, country: "DE", city: "Berlin" },
  { name: "Bild", email: "leserbriefe@bild.de", outlet: "Bild", category: "general" as const, country: "DE", city: "Berlin" },
  { name: "DPA", email: "info@dpa.com", outlet: "Deutsche Presse-Agentur", category: "general" as const, country: "DE", city: "Hamburg" },
  { name: "Heise Online", email: "redaktion@heise.de", outlet: "Heise Online", category: "technology" as const, country: "DE", city: "Hannover" },
  { name: "Golem.de", email: "redaktion@golem.de", outlet: "Golem.de", category: "technology" as const, country: "DE", city: "Berlin" },
  { name: "t3n", email: "redaktion@t3n.de", outlet: "t3n", category: "technology" as const, country: "DE", city: "Hannover" },
  { name: "Gründerszene", email: "redaktion@gruenderszene.de", outlet: "Gründerszene", category: "technology" as const, country: "DE", city: "Berlin" },
  { name: "Deutsche Startups", email: "redaktion@deutsche-startups.de", outlet: "Deutsche Startups", category: "technology" as const, country: "DE", city: "Cologne" },

  // ============================================
  // SPAIN - Major Outlets
  // ============================================
  { name: "El País", email: "redaccion@elpais.es", outlet: "El País", category: "general" as const, country: "ES", city: "Madrid" },
  { name: "El País Tech", email: "tecnologia@elpais.es", outlet: "El País - Tecnología", category: "technology" as const, country: "ES", city: "Madrid" },
  { name: "El Mundo", email: "redaccion@elmundo.es", outlet: "El Mundo", category: "general" as const, country: "ES", city: "Madrid" },
  { name: "ABC", email: "redaccion@abc.es", outlet: "ABC", category: "general" as const, country: "ES", city: "Madrid" },
  { name: "La Vanguardia", email: "redaccion@lavanguardia.es", outlet: "La Vanguardia", category: "general" as const, country: "ES", city: "Barcelona" },
  { name: "El Periódico", email: "redaccion@elperiodico.com", outlet: "El Periódico", category: "general" as const, country: "ES", city: "Barcelona" },
  { name: "Expansión", email: "redaccion@expansion.com", outlet: "Expansión", category: "business" as const, country: "ES", city: "Madrid" },
  { name: "Cinco Días", email: "redaccion@cincodias.com", outlet: "Cinco Días", category: "business" as const, country: "ES", city: "Madrid" },
  { name: "EFE", email: "redaccion@efe.com", outlet: "Agencia EFE", category: "general" as const, country: "ES", city: "Madrid" },
  { name: "Europa Press", email: "redaccion@europapress.es", outlet: "Europa Press", category: "general" as const, country: "ES", city: "Madrid" },
  { name: "Xataka", email: "redaccion@xataka.com", outlet: "Xataka", category: "technology" as const, country: "ES", city: "Madrid" },
  { name: "El Español Tech", email: "tecnologia@elespanol.com", outlet: "El Español - Tech", category: "technology" as const, country: "ES", city: "Madrid" },
  { name: "Hipertextual", email: "redaccion@hipertextual.com", outlet: "Hipertextual", category: "technology" as const, country: "ES", city: "Madrid" },

  // ============================================
  // INTERNATIONAL WIRE SERVICES
  // ============================================
  { name: "Reuters Global", email: "reuters.editorial@thomsonreuters.com", outlet: "Reuters", category: "general" as const, country: "GB", city: "London" },
  { name: "Reuters Tech", email: "tech.editorial@thomsonreuters.com", outlet: "Reuters Technology", category: "technology" as const, country: "US", city: "New York" },
  { name: "AFP Global", email: "info@afp.com", outlet: "AFP", category: "general" as const, country: "FR", city: "Paris" },
  { name: "AP International", email: "apnewsroom@ap.org", outlet: "Associated Press International", category: "general" as const, country: "US", city: "New York" },
  { name: "Xinhua", email: "english@xinhuanet.com", outlet: "Xinhua News Agency", category: "general" as const, country: "CN", city: "Beijing" },
  { name: "Kyodo News", email: "english@kyodonews.jp", outlet: "Kyodo News", category: "general" as const, country: "JP", city: "Tokyo" },
  { name: "TASS", email: "press@tass.com", outlet: "TASS", category: "general" as const, country: "RU", city: "Moscow" },
  { name: "ANSA International", email: "english@ansa.it", outlet: "ANSA English", category: "general" as const, country: "IT", city: "Rome" },

  // ============================================
  // ASIA - Major Outlets
  // ============================================
  { name: "South China Morning Post", email: "newsdesk@scmp.com", outlet: "South China Morning Post", category: "general" as const, country: "HK", city: "Hong Kong" },
  { name: "Nikkei Asia", email: "feedback@nikkei.com", outlet: "Nikkei Asia", category: "business" as const, country: "JP", city: "Tokyo" },
  { name: "Japan Times", email: "newsdesk@japantimes.co.jp", outlet: "The Japan Times", category: "general" as const, country: "JP", city: "Tokyo" },
  { name: "Straits Times", email: "stforum@sph.com.sg", outlet: "The Straits Times", category: "general" as const, country: "SG", city: "Singapore" },
  { name: "Channel NewsAsia", email: "newsdesk@mediacorp.com.sg", outlet: "Channel NewsAsia", category: "general" as const, country: "SG", city: "Singapore" },
  { name: "Times of India", email: "toifeatures@timesgroup.com", outlet: "Times of India", category: "general" as const, country: "IN", city: "Mumbai" },
  { name: "Economic Times", email: "ettech@timesgroup.com", outlet: "Economic Times", category: "business" as const, country: "IN", city: "Mumbai" },
  { name: "Hindustan Times", email: "htmetro@hindustantimes.com", outlet: "Hindustan Times", category: "general" as const, country: "IN", city: "New Delhi" },
  { name: "Korea Herald", email: "khnews@heraldcorp.com", outlet: "The Korea Herald", category: "general" as const, country: "KR", city: "Seoul" },
  { name: "Yonhap News", email: "english@yna.co.kr", outlet: "Yonhap News Agency", category: "general" as const, country: "KR", city: "Seoul" },

  // ============================================
  // MIDDLE EAST & AFRICA
  // ============================================
  { name: "Al Jazeera English", email: "feedback@aljazeera.net", outlet: "Al Jazeera English", category: "general" as const, country: "QA", city: "Doha" },
  { name: "Arab News", email: "editor@arabnews.com", outlet: "Arab News", category: "general" as const, country: "SA", city: "Riyadh" },
  { name: "Gulf News", email: "editor@gulfnews.com", outlet: "Gulf News", category: "general" as const, country: "AE", city: "Dubai" },
  { name: "Haaretz", email: "feedback@haaretz.co.il", outlet: "Haaretz", category: "general" as const, country: "IL", city: "Tel Aviv" },
  { name: "Times of Israel", email: "news@timesofisrael.com", outlet: "Times of Israel", category: "general" as const, country: "IL", city: "Jerusalem" },
  { name: "Daily Maverick", email: "info@dailymaverick.co.za", outlet: "Daily Maverick", category: "general" as const, country: "ZA", city: "Johannesburg" },
  { name: "Mail & Guardian", email: "newsdesk@mg.co.za", outlet: "Mail & Guardian", category: "general" as const, country: "ZA", city: "Johannesburg" },

  // ============================================
  // AUSTRALIA & NEW ZEALAND
  // ============================================
  { name: "Sydney Morning Herald", email: "newsdesk@smh.com.au", outlet: "Sydney Morning Herald", category: "general" as const, country: "AU", city: "Sydney" },
  { name: "The Age", email: "newsdesk@theage.com.au", outlet: "The Age", category: "general" as const, country: "AU", city: "Melbourne" },
  { name: "The Australian", email: "news@theaustralian.com.au", outlet: "The Australian", category: "general" as const, country: "AU", city: "Sydney" },
  { name: "ABC Australia", email: "news.online@abc.net.au", outlet: "ABC News Australia", category: "general" as const, country: "AU", city: "Sydney" },
  { name: "Australian Financial Review", email: "newsroom@afr.com", outlet: "Australian Financial Review", category: "business" as const, country: "AU", city: "Sydney" },
  { name: "NZ Herald", email: "newsdesk@nzherald.co.nz", outlet: "New Zealand Herald", category: "general" as const, country: "NZ", city: "Auckland" },
  { name: "Stuff NZ", email: "info@stuff.co.nz", outlet: "Stuff", category: "general" as const, country: "NZ", city: "Wellington" },

  // ============================================
  // LATIN AMERICA
  // ============================================
  { name: "Folha de S.Paulo", email: "redacao@uol.com.br", outlet: "Folha de S.Paulo", category: "general" as const, country: "BR", city: "São Paulo" },
  { name: "O Globo", email: "redacao@oglobo.com.br", outlet: "O Globo", category: "general" as const, country: "BR", city: "Rio de Janeiro" },
  { name: "Clarín", email: "redaccion@clarin.com", outlet: "Clarín", category: "general" as const, country: "AR", city: "Buenos Aires" },
  { name: "La Nación Argentina", email: "cartas@lanacion.com.ar", outlet: "La Nación", category: "general" as const, country: "AR", city: "Buenos Aires" },
  { name: "El Universal Mexico", email: "redaccion@eluniversal.com.mx", outlet: "El Universal", category: "general" as const, country: "MX", city: "Mexico City" },
  { name: "Reforma", email: "redaccion@reforma.com", outlet: "Reforma", category: "general" as const, country: "MX", city: "Mexico City" },
  { name: "El Mercurio Chile", email: "cartas@mercurio.cl", outlet: "El Mercurio", category: "general" as const, country: "CL", city: "Santiago" },
  { name: "El Comercio Peru", email: "redaccion@elcomercio.pe", outlet: "El Comercio", category: "general" as const, country: "PE", city: "Lima" },

  // ============================================
  // CANADA
  // ============================================
  { name: "Globe and Mail", email: "newsroom@globeandmail.com", outlet: "The Globe and Mail", category: "general" as const, country: "CA", city: "Toronto" },
  { name: "National Post", email: "letters@nationalpost.com", outlet: "National Post", category: "general" as const, country: "CA", city: "Toronto" },
  { name: "Toronto Star", email: "city@thestar.ca", outlet: "Toronto Star", category: "general" as const, country: "CA", city: "Toronto" },
  { name: "CBC News", email: "cbcnews@cbc.ca", outlet: "CBC News", category: "general" as const, country: "CA", city: "Toronto" },
  { name: "CTV News", email: "ctvnewstips@bellmedia.ca", outlet: "CTV News", category: "general" as const, country: "CA", city: "Toronto" },
  { name: "BetaKit", email: "tips@betakit.com", outlet: "BetaKit", category: "technology" as const, country: "CA", city: "Toronto" },

  // ============================================
  // TECH SPECIALIZED (GLOBAL)
  // ============================================
  { name: "Protocol", email: "tips@protocol.com", outlet: "Protocol", category: "technology" as const, country: "US", city: "San Francisco" },
  { name: "The Information", email: "tips@theinformation.com", outlet: "The Information", category: "technology" as const, country: "US", city: "San Francisco" },
  { name: "Recode", email: "tips@recode.net", outlet: "Recode", category: "technology" as const, country: "US", city: "New York" },
  { name: "Axios", email: "tips@axios.com", outlet: "Axios", category: "general" as const, country: "US", city: "Arlington" },
  { name: "Axios Pro Rata", email: "prorata@axios.com", outlet: "Axios Pro Rata", category: "business" as const, country: "US", city: "Arlington" },
  { name: "Crunchbase News", email: "news@crunchbase.com", outlet: "Crunchbase News", category: "technology" as const, country: "US", city: "San Francisco" },
  { name: "PitchBook", email: "news@pitchbook.com", outlet: "PitchBook", category: "finance" as const, country: "US", city: "Seattle" },
  { name: "Sifted", email: "tips@sifted.eu", outlet: "Sifted", category: "technology" as const, country: "GB", city: "London" },
  { name: "Tech.eu", email: "tips@tech.eu", outlet: "Tech.eu", category: "technology" as const, country: "BE", city: "Brussels" },
  { name: "EU-Startups", email: "tips@eu-startups.com", outlet: "EU-Startups", category: "technology" as const, country: "DE", city: "Berlin" },
];

async function seedGlobalJournalists() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log(`Seeding global journalists database with ${globalJournalists.length} contacts...`);
  
  const batchSize = 25;
  let inserted = 0;
  
  for (let i = 0; i < globalJournalists.length; i += batchSize) {
    const batch = globalJournalists.slice(i, i + batchSize).map(j => ({
      ...j,
      verified: true,
      isActive: true,
    }));
    
    try {
      await db.insert(journalists).values(batch).onDuplicateKeyUpdate({
        set: { updatedAt: new Date() }
      });
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${globalJournalists.length} journalists`);
    } catch (error) {
      console.error("Error inserting batch:", error);
    }
  }

  console.log(`\nSeeding complete! ${inserted} global journalists added.`);
  console.log("\nBreakdown by region:");
  
  const byCountry: Record<string, number> = {};
  globalJournalists.forEach(j => {
    byCountry[j.country] = (byCountry[j.country] || 0) + 1;
  });
  
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([country, count]) => {
    console.log(`  ${country}: ${count} contacts`);
  });
  
  process.exit(0);
}

export { globalJournalists };
seedGlobalJournalists();
