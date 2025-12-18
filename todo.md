# G-Press TODO

## Completato
- [x] Configurare tema colori (blu professionale #1E88E5)
- [x] Creare tab navigation (Home, Contatti, Storico)
- [x] Home Screen - Form creazione articolo
- [x] Home Screen - Pulsante "Invia a Tutti"
- [x] Home Screen - Contatore destinatari
- [x] Contatti Screen - Lista contatti
- [x] Contatti Screen - Form aggiunta contatto
- [x] Contatti Screen - Eliminazione contatto
- [x] Storico Screen - Lista articoli inviati
- [x] Storico Screen - Dettaglio articolo
- [x] Sistema invio email (via mailto:)
- [x] Persistenza dati con AsyncStorage
- [x] Generare logo app personalizzato
- [x] Sostituire logo con quello fornito dall'utente

## Da Implementare - Funzionalità Avanzate
- [ ] Database giornalisti italiani pre-popolato (50+ contatti reali)
- [ ] Categorie giornalisti (Tecnologia, Business, Finanza, Sport, etc.)
- [ ] Filtro giornalisti per categoria/testata
- [ ] Sistema invio email automatico con API (Resend)
- [ ] Invio massivo in batch a tutti i contatti
- [ ] Tracking aperture email
- [ ] Analytics dashboard con statistiche invii
- [ ] Import/Export contatti CSV
- [ ] Editor articolo avanzato con formattazione
- [ ] Template comunicati stampa predefiniti
- [ ] Boilerplate aziendale configurabile

## Infrastruttura MCP
- [x] Creare repository GitHub per G-Press
- [ ] Configurare Cloudflare D1 database
- [ ] Setup Cloudflare Workers per API backend
- [ ] Configurare Vercel per deployment frontend

## Database Giornalisti Globale
- [x] Giornalisti Italia (testate nazionali e regionali)
- [x] Giornalisti USA (NYT, WSJ, WaPo, CNN, etc.)
- [x] Giornalisti UK (BBC, Guardian, Times, etc.)
- [x] Giornalisti Francia (Le Monde, Le Figaro, etc.)
- [x] Giornalisti Germania (Der Spiegel, FAZ, etc.)
- [x] Giornalisti Spagna (El País, El Mundo, etc.)
- [x] Agenzie stampa internazionali (Reuters, AP, AFP)
- [x] Testate tech globali (TechCrunch, The Verge, Wired)
- [x] Testate business globali (Bloomberg, Forbes, Fortune)

## Importazione Dataset Esterni
- [x] Download dataset local_news_outlets_dataset.csv (12.217 righe)
- [x] Download dataset VOA journalists (verificato - nessuna email diretta)
- [x] Estrazione nome testata/giornalista e email (6.802 testate USA)
- [x] Caricamento nel database G-Press (7.022 contatti totali)

## Miglioramenti UI/UX
- [x] Migliorare grafica generale dell'app
- [x] Rendere l'interfaccia più moderna e gradevole
- [x] Mantenere tutte le funzionalità esistenti

## Nuovi Contatti da File
- [x] Analizzare pasted_content.txt (255 contatti)
- [x] Analizzare pasted_content_2.txt (1527 contatti)
- [x] Estrarre nome ed email valide (1527 unici)
- [x] Eliminare doppioni (5 duplicati rimossi)
- [x] Caricare nel database (1522 nuovi contatti - Totale: 8.544)

## Ricerca Dataset Giornalisti
- [x] Cercare su GitHub dataset giornalisti/journalists
- [x] Cercare su GitHub dataset press/media contacts
- [x] Cercare su GitHub dataset news outlets/testate
- [x] Cercare su Kaggle dataset giornalisti
- [x] Cercare su data.world dataset media
- [x] Analizzare e scaricare dataset trovati (US News Domains 5397, News Homepages 1167)
- [x] Estrarre nome ed email valide (5975 contatti unici)
- [x] Caricare nel database G-Press (totale: 8.546 contatti)

## Nuove Funzionalità Richieste
- [x] Esportare tutti i contatti in file JSON per APK standalone (9.001 contatti)
- [x] Aggiungere funzionalità per aggiungere giornalisti manualmente nell'app
- [x] App funziona offline con dati locali (AsyncStorage)
- [x] Storico invii salvato localmente
- [ ] Configurare sistema invio email reale con Resend API (opzionale)

## Prossimi Passi
- [x] Importazione contatti da file CSV/Excel
- [x] Template comunicati stampa salvabili e riutilizzabili
- [x] Push su GitHub dopo ogni modifica

## Configurazione Resend API
- [x] Configurare RESEND_API_KEY come variabile d'ambiente
- [x] Implementare invio email automatico con Resend
- [x] Fallback a mailto se API non configurata

## Modifiche Richieste
- [x] Rimuovere fallback mailto - mostrare errore se API non configurata
- [x] Aggiungere dashboard statistiche Resend nell'app
- [x] Visualizzare: email inviate, aperture, click, bounce
- [x] Statistiche per singolo invio e totali
- [x] Nuovo tab "Statistiche" con dashboard completa

## Configurazione Email Mittente
- [x] Configurare email mittente: Roberto Romagnino <g.ceo@growverse.net>
- [x] Aggiungere firma: Founder & CEO, GROWVERSE, LLC

## Bug Fix
- [x] Fix errore ESM/CommonJS in app.config.ts per build Android

## Funzionalità Immagini
- [x] Aggiungere pulsante per selezionare immagini dalla galleria
- [x] Preview delle immagini selezionate nel form articolo
- [x] Possibilità di rimuovere immagini selezionate
- [x] Integrare immagini nell'invio email con Resend (come allegati)

## Funzionalità Avanzate v1.2
- [x] Mostrare lista destinatari prima dell'invio (nome, email, testata)
- [x] Aggiungere ricerca e selezione singoli giornalisti
- [x] Fix errore expo-file-system readAsStringAsync deprecato
- [x] Fix API Key Resend hardcoded per APK standalone
- [x] Fix salvataggio paese nei contatti personalizzati (picker con tutti i paesi)
- [x] Aggiunto paese Metaverso e Internazionale ai filtri
- [ ] Aggiungere anteprima email prima dell'invio
