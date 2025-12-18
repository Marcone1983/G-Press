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

## Funzionalità Avanzate v1.3
- [x] Anteprima email - vedere come apparirà l'email prima di inviarla (pulsante 👁 accanto a Invia)
- [x] Gruppi di destinatari - salvare gruppi per invii ricorrenti (es. "Tech Italia", "Business USA")
- [x] Statistiche per giornalista - vedere quali giornalisti aprono più spesso le email (tab "Per Giornalista")

## AUDIT UFFICIO STAMPA - Funzionalità Mancanti

### Cosa fa un ufficio stampa professionale:
1. ✅ Gestione database giornalisti (FATTO - 9001 contatti)
2. ✅ Invio comunicati stampa (FATTO - con Resend)
3. ✅ Tracking aperture/click (FATTO - statistiche)
4. ✅ Template comunicati (FATTO - salvabili)
5. ✅ Allegati/immagini (FATTO)
6. [ ] **MEDIA MONITORING** - Monitorare menzioni del brand online
7. [ ] **FOLLOW-UP AUTOMATICO** - Reinviare a chi non ha aperto dopo X giorni
8. [ ] **EMBARGO** - Programmare invio a data/ora specifica
9. [ ] **A/B TESTING** - Testare oggetti email diversi per vedere quale funziona meglio
10. [ ] **RASSEGNA STAMPA** - Raccogliere articoli pubblicati che parlano di te

## G-Press v2.0 - INNOVAZIONI TECNOLOGICHE UNICHE

### Funzionalità implementate:
- [x] **1. INVIO PROGRAMMATO (EMBARGO)** - Scegli data e ora per l'invio automatico
- [x] **2. FOLLOW-UP INTELLIGENTE** - Reinvio automatico a chi non ha aperto dopo 24/48/72h con oggetto diverso
- [x] **3. A/B TESTING OGGETTO** - Testa 2 oggetti sul 20% dei contatti, poi invia il migliore al resto
- [x] **4. SCORE GIORNALISTI** - Punteggio automatico basato su engagement (tier: top/good/average/low/inactive)
- [x] **5. SUGGERIMENTI ORARIO** - Suggerisce orario migliore per inviare basato su statistiche aperture


## G-Press v3.0 - AUTOPILOT & FUNZIONALITÀ KILLER

### Già Implementate:
- [x] 1. Invio programmato (embargo)
- [x] 2. Follow-up intelligente
- [x] 3. A/B testing oggetto
- [x] 4. Score giornalisti
- [x] 5. Suggerimenti orario

### Da Implementare:
- [x] 6. **AUTOPILOT MODE** - Carica documento, l'app fa tutto da sola (sceglie destinatari, orario, invia, follow-up)
- [x] 7. **LEADERBOARD** - Classifica giornalisti che aprono di più (retargeting visivo)
- [x] 8. **UPLOAD DOCUMENTO** - Carica PDF/Word e l'app estrae titolo e contenuto
- [x] 9. **SMART TARGETING** - L'app sceglie automaticamente i destinatari migliori basandosi su score
- [x] 10. **SMART TIMING** - Invia automaticamente all'orario con più aperture storiche
- [x] 11. **AUTO FOLLOW-UP CHAIN** - Sequenza di 3 follow-up automatici con oggetti diversi (in Autopilot)
- [x] 12. **TREND ANALYSIS** - Mostra trend aperture nel tempo (tab Trend nelle Statistiche)
- [x] 13. **TAG GIORNALISTI** - Tagga i giornalisti per argomento/interesse (in Autopilot Smart Targeting)
- [x] 14. **EMAIL TEMPLATES** - Template professionali pre-costruiti (nuova pagina Templates)
- [x] 15. **ALERT APERTURE** - Notifica quando un giornalista top apre (integrato in Autopilot con notifiche locali)

### UI/UX:
- [x] Creata nuova pagina "Autopilot" nella tab bar
- [x] Creata nuova pagina "Templates" nella tab bar
- [x] Aggiunto tab "Trend" nelle Statistiche
- [ ] Separare funzionalità avanzate dalla home
- [ ] Grafica pulita e non schiacciata


## G-Press v4.0 - FUNZIONALITÀ GENIALI E INNOVATIVE

### AUTOMAZIONE INTELLIGENTE:
- [ ] **MEDIA KIT GENERATOR** - Genera automaticamente un media kit PDF professionale con logo, info azienda, comunicati recenti
- [ ] **CALENDARIO EDITORIALE** - Pianifica comunicati stampa con vista calendario, reminder e deadline
- [ ] **BLACKLIST AUTOMATICA** - Rimuove automaticamente chi si disiscrive o segnala spam
- [ ] **WHITELIST VIP** - Giornalisti prioritari che ricevono sempre per primi (con anteprima esclusiva)

### ANALYTICS AVANZATI:
- [x] **HEATMAP APERTURE** - Mappa visuale di quando i giornalisti aprono (per ora e giorno)
- [ ] **COMPETITOR TRACKING** - Traccia se i tuoi comunicati vengono pubblicati (cerca titolo su Google News)
- [ ] **ROI CALCULATOR** - Calcola il valore PR generato (n. pubblicazioni x valore medio)
- [ ] **EXPORT REPORT PDF** - Genera report mensile delle performance in PDF

### GESTIONE CONTATTI PRO:
- [ ] **IMPORT DA LINKEDIN** - Importa contatti giornalisti da LinkedIn (manuale con CSV)
- [ ] **VERIFICA EMAIL** - Controlla se le email sono ancora valide prima dell'invio
- [x] **NOTE GIORNALISTI** - Aggiungi note private su ogni giornalista (preferenze, interessi, ultimo contatto)
- [x] **RELAZIONI** - Traccia le interazioni con ogni giornalista (email inviate, aperte, risposte)
- [x] **VIP LIST** - Giornalisti prioritari evidenziati con badge dorato
- [x] **BLACKLIST** - Blocca giornalisti che non vuoi più contattare

### UX/COMFORT:
- [ ] **DARK MODE** - Tema scuro per l'app
- [x] **QUICK ACTIONS** - Azioni rapide dalla home (nuovo comunicato, ultimo template, gruppo preferito)
- [ ] **WIDGET HOME SCREEN** - Widget per vedere statistiche rapide
- [ ] **SHAKE TO UNDO** - Scuoti per annullare l'ultima azione


## G-Press v5.0 - GENIALATE ESCLUSIVE

### Funzionalità Standard da Implementare:
- [x] **DARK MODE** - Tema scuro per l'app con toggle nelle impostazioni
- [x] **EXPORT REPORT PDF** - Genera report mensile delle performance (Share)
- [x] **COMPETITOR TRACKING** - Verifica se i comunicati vengono pubblicati su Google News

### 🚀 5 GENIALATE ESCLUSIVE G-PRESS:

- [x] **1. AI SUBJECT OPTIMIZER** - Analizza oggetti email passati e suggerisce automaticamente l'oggetto migliore basandosi su pattern di apertura
- [x] **2. JOURNALIST MOOD TRACKER** - Traccia il "mood" di ogni giornalista (velocità apertura, orari preferiti, frequenza engagement) per capire quando contattarlo
- [x] **3. VIRAL POTENTIAL SCORE** - Calcola punteggio di "potenziale virale" del comunicato basandosi su keyword trending, lunghezza, match con interessi destinatari
- [x] **4. SMART EMBARGO ZONES** - Rileva automaticamente fusi orari e festività dei paesi destinatari per evitare invii in momenti morti
- [x] **5. PRESS RELEASE DNA** - Ogni comunicato ha un "DNA" unico che traccia diffusione: chi l'ha aperto per primo, chi l'ha inoltrato, catena di engagement

