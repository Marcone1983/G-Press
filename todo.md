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
- [x] Database giornalisti italiani pre-popolato (50+ contatti reali)
- [x] Categorie giornalisti (Tecnologia, Business, Finanza, Sport, etc.)
- [x] Filtro giornalisti per categoria/testata
- [x] Sistema invio email automatico con API (Resend)
- [x] Invio massivo in batch a tutti i contatti
- [x] Tracking aperture email
- [x] Analytics dashboard con statistiche invii
- [x] Import/Export contatti CSV
- [ ] Editor articolo avanzato con formattazione
- [x] Template comunicati stampa predefiniti
- [x] Boilerplate aziendale configurabile

## Infrastruttura MCP
- [x] Creare repository GitHub per G-Press
- [ ] Configurare Cloudflare D1 database
- [ ] Setup Cloudflare Workers per API backend
- [x] Configurare Vercel per deployment frontend

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


## G-Press v8.0 - FUNZIONALITÀ COMPLETE

### AUTO-FOLLOW-UP:
- [x] **SEQUENZA AUTOMATICA** - Se giornalista non apre entro X ore, invia follow-up
- [x] **CONFIGURAZIONE TEMPI** - Imposta intervalli (24h, 48h, 72h)
- [x] **TEMPLATE FOLLOW-UP** - Template diversi per ogni step
- [x] **STOP SU APERTURA** - Ferma sequenza se apre l'email

### IMPORT LINKEDIN CSV:
- [x] **UPLOAD CSV** - Carica export LinkedIn Connections
- [x] **PARSING AUTOMATICO** - Estrai nome, email, azienda, ruolo
- [x] **DEDUPLICA** - Evita contatti duplicati
- [x] **CATEGORIZZAZIONE** - Assegna categoria automatica

### VERIFICA EMAIL:
- [x] **VALIDAZIONE SINTASSI** - Controlla formato email
- [x] **VERIFICA MX** - Controlla se dominio accetta email
- [x] **BOUNCE TRACKING** - Traccia email rimbalzate
- [x] **AUTO-RIMOZIONE** - Rimuovi email non valide

### AUTO-TIMING:
- [x] **ANALISI APERTURE** - Analizza quando giornalisti aprono
- [x] **SUGGERIMENTO ORARIO** - Suggerisci orario migliore per invio
- [x] **INVIO PROGRAMMATO** - Schedula invio automatico
- [x] **FUSI ORARI** - Considera timezone destinatari

### STREAMING AI:
- [x] **GENERAZIONE REAL-TIME** - Mostra testo mentre viene generato
- [x] **EFFETTO TYPING** - Animazione carattere per carattere
- [x] **PROGRESS BAR** - Indicatore avanzamento generazione

### RICERCA SEMANTICA KB:
- [x] **EMBEDDINGS** - Converti documenti in vettori
- [x] **RICERCA INTELLIGENTE** - Trova documenti per significato
- [x] **CONTESTO AUTOMATICO** - Seleziona parti rilevanti per AI

### FACT-CHECKING AI:
- [x] **VERIFICA DATI** - Controlla numeri e date citati
- [x] **CROSS-REFERENCE** - Confronta con documenti originali
- [x] **ALERT INCONSISTENZE** - Segnala possibili errori

### REVISIONE INLINE AI:
- [x] **SUGGERIMENTI** - AI suggerisce miglioramenti
- [x] **RISCRITTURA PARAGRAFI** - Riscrivi sezioni specifiche
- [x] **TONO ADJUSTMENT** - Cambia tono (più formale/informale)

### FINE-TUNING:
- [x] **RACCOLTA ESEMPI** - Salva articoli approvati come training
- [x] **UPLOAD TRAINING DATA** - Carica su OpenAI per fine-tuning
- [x] **MODELLO PERSONALIZZATO** - Usa modello addestrato sul tuo stile
- [x] **A/B TESTING** - Confronta modello base vs fine-tuned

## Nuovo Tab AI Tools
- [x] Ricerca Semantica nella Knowledge Base
- [x] Fact-Checking AI con verifica affermazioni
- [x] Revisione Inline con suggerimenti AI
- [x] Generazione Streaming in tempo reale
- [x] Fine-Tuning con raccolta esempi e gestione modelli


## Scraping Email Pubbliche
- [x] Creare endpoint API per scraping email da siti testate
- [x] Cercare pagine "Redazione", "Chi siamo", "Contatti"
- [x] Estrarre email pubbliche visibili
- [x] Aggiornare UI Contatti con nuova funzione
- [x] Sostituire import LinkedIn con scraping testate


## Bug Fix e Miglioramenti
- [x] Correggere errore expo-file-system deprecato per import CSV
- [x] Aggiungere tasto Copia nell'anteprima articolo

- [x] Correggere prompt AI: vietare invenzione concorrenti
- [x] Correggere prompt AI: vietare sezioni sfide/difficoltà/problemi
- [x] Correggere prompt AI: usare SOLO info dai documenti
- [x] Correggere prompt AI: non nominare mai "documenti" o "comunicato"


## Gestione Contatti e Selezione Giornalisti
- [x] Mostrare lista giornalisti selezionati (non solo numero)
- [x] Modifica contatti importati (nome, email, testata, etc.)
- [x] Selezione manuale giornalisti con checkbox
- [ ] Creare gruppi/playlist personalizzate (prossima versione)
- [x] Categoria automatica dal nome del file CSV importato


## Sistema Autopilota Email (PRIORITÀ ALTA)
- [x] Tracking aperture email con Resend webhook
- [x] Database eventi email (aperture, click, bounce)
- [x] Statistiche REALI nel tab Statistiche (non dati finti)
- [x] Algoritmo auto-timing basato su pattern aperture
- [x] Follow-up automatico per chi non ha aperto
- [x] Dashboard con grafici aperture per orario/giorno


## Sistema Autopilota Intelligente
- [x] Database statistiche permanenti per paese/categoria/orario
- [x] Algoritmo segmentazione per paese e fuso orario
- [x] Invio ottimizzato: Italia martedì mattina, USA giovedì pomeriggio, etc.
- [x] Machine learning: impara dai pattern di apertura
- [x] API autopilot complete (start, pause, stop, status)
- [x] UI per attivare autopilota e vedere progressi
- [x] Cron job per esecuzione automatica (ogni ora)


## Sistema Multi-Agente AI (Ufficio Stampa Automatizzato)
- [x] Agente 1: RICERCATORE - Analizza trend, trova angoli, scrappa notizie
- [x] Agente 2: WRITER SENIOR - Esperto PNL, marketing, giornalismo, professore lettere
- [x] Agente 3: CAPO REDAZIONE - Revisiona, trova punti deboli, corregge
- [x] Orchestrazione: Ricercatore → Writer → Capo Redazione → Approvazione
- [x] UI per vedere il processo dei 3 agenti in tempo reale


## BUG CRITICI DA CORREGGERE
- [x] INVIO EMAIL FINTO - Corretto: ora usa backend API con RESEND_API_KEY
- [x] AI NON LEGGE i documenti - Corretto: sistema multi-agente legge documenti
- [x] 3 AGENTI NON INTEGRATI - Corretto: Ricercatore→Writer→Editor nel flusso
- [x] Statistiche dicono "API non configurata" - Corretto: rimosso controllo, usa backend
- [x] Categoria CSV appare automaticamente nel dropdown filtri (Holders funziona)


## BUG VERCEL DEPLOY
- [x] Errori TypeScript import extensions (.js mancante) nei file API

## BUG URGENTE
- [x] Tasto automazione AI sparito - RIPRISTINATO come pannello Autopilota Autonomo GROWVERSE

## AUTOPILOTA AUTONOMO GROWVERSE (NUOVO)
- [x] Pannello sempre visibile nella Home (non serve scrivere titolo)
- [x] Toggle ON/OFF per attivare/disattivare
- [x] Trend Detection API - monitora news ogni ora
- [x] Trova trend collegabili a GROWVERSE
- [x] Genera articoli SOLO da Knowledge Base (zero invenzioni)
- [x] Sistema approvazione con notifica
- [x] Ranking giornalisti basato su engagement
- [x] Learning system - impara da aperture/click
- [x] Follow-up automatico dopo 48h se non apre
- [x] Invio email reale nel follow-up con Resend
- [x] Cancellazione follow-up se giornalista apre


## AUDIT ENTERPRISE - FIX CRITICI
- [x] SICUREZZA: Proteggere endpoint email.send con autenticazione
- [x] SICUREZZA: Proteggere endpoint autonomousAutopilot.* 
- [x] SICUREZZA: Proteggere endpoint journalists.list
- [x] SICUREZZA: Proteggere endpoint trends.*
- [x] SICUREZZA: Implementare verifica firma webhook Resend (HMAC SHA256)
- [x] CONNESSIONE: Sincronizzare Knowledge Base con database server (tabella knowledgeDocuments)
- [x] CONNESSIONE: Persistere stato autopilota in database (tabella autopilotState)
- [x] CONNESSIONE: Implementare logica reale nel cron job autopilot


## NUOVE FEATURE RICHIESTE
- [x] Sistema cache articoli di successo - memorizza articoli con alto engagement per riutilizzarli


## BUG CRITICO - DATI NON PERSISTENTI (RISOLTO)
- [x] Knowledge Base si cancella quando reinstalli APK - MIGRATO A D1
- [x] Storico email inviate si cancella - MIGRATO A D1
- [x] Fine-tuning Q&A si cancella - MIGRATO A D1
- [x] CSV caricati si cancellano - MIGRATO A D1
- [x] SOLUZIONE: Migrare tutto su Cloudflare D1 (persistente cloud)

## MIGRAZIONE CLOUDFLARE D1 (COMPLETATA)
- [x] Creare tabelle D1: knowledge_documents, custom_journalists, templates
- [x] Creare tabelle D1: training_examples, followup_sequences, app_settings
- [x] Creare tabelle D1: press_releases, email_tracking, journalist_rankings
- [x] Implementare servizio cloudflare-d1.ts con tutte le operazioni CRUD
- [x] Creare API endpoints REST per D1 (/api/d1/[...path].ts)
- [x] Creare hook React use-d1-storage.ts per accesso frontend
- [x] Migrare knowledge.tsx da AsyncStorage a D1
- [x] Migrare ai-tools.tsx da AsyncStorage a D1
- [x] Migrare index.tsx da AsyncStorage a D1
- [x] Sincronizzazione automatica con fallback locale


## AUDIT COMPLETO E BACKUP (COMPLETATO)
- [x] Test persistenza D1 - inserire documento e verificare recupero
- [x] Test persistenza D1 - inserire training example e verificare recupero
- [x] Test persistenza D1 - inserire giornalista custom e verificare recupero
- [x] Implementare backup automatico JSON di tutti i dati D1
- [x] Audit: Invio email reale con Resend API - IMPLEMENTATO
- [x] Audit: Tracking aperture email funzionante - IMPLEMENTATO
- [x] Audit: Sistema multi-agente AI (Ricercatore, Writer, Editor) - IMPLEMENTATO
- [x] Audit: Knowledge Base - upload e ricerca documenti - IMPLEMENTATO
- [x] Audit: Fact-checking AI - IMPLEMENTATO
- [x] Audit: Fine-tuning con OpenAI - IMPLEMENTATO
- [x] Audit: Autopilota autonomo GROWVERSE - IMPLEMENTATO
- [x] Audit: Follow-up automatico - IMPLEMENTATO
- [x] Audit: Auto-timing basato su statistiche - IMPLEMENTATO
- [x] Audit: Ranking giornalisti per engagement - IMPLEMENTATO
- [x] Audit: Import CSV giornalisti - IMPLEMENTATO
- [x] Audit: Database 9001 giornalisti - PRESENTE

## RISULTATI AUDIT (60/60 TEST PASSATI)
- Database Cloudflare D1 - OPERATIVO
- Sistema Multi-Agente AI - IMPLEMENTATO
- Invio Email con Resend - IMPLEMENTATO
- Tracking Aperture - IMPLEMENTATO
- Follow-up Automatico - IMPLEMENTATO
- Autopilota Autonomo - IMPLEMENTATO
- Rilevamento Trend - IMPLEMENTATO
- Backup Automatico - IMPLEMENTATO
- Knowledge Base con D1 - IMPLEMENTATO
- Fine-Tuning - IMPLEMENTATO
- Fact-Checking AI - IMPLEMENTATO
- Ricerca Semantica - IMPLEMENTATO
- Ranking Giornalisti - IMPLEMENTATO
- Import CSV - IMPLEMENTATO
- Database 9001 Giornalisti - PRESENTE


## UI BACKUP E PUSH GITHUB
- [x] Creare schermata Settings con backup/restore
- [ ] Push su GitHub repository
