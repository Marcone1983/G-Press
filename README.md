# G-PRESS - Sistema Intelligente di Distribuzione Comunicati Stampa

<div align="center">

![G-Press Logo](./assets/images/icon.png)

**Piattaforma AI-powered per la distribuzione automatizzata di comunicati stampa a 9.001 giornalisti italiani verificati**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./package.json)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](./LICENSE)

[Funzionalità](#funzionalità-principali) •
[Architettura](#architettura-tecnica) •
[Setup](#guida-setup-completa) •
[API](#documentazione-api) •
[White Paper](#white-paper)

</div>

---

## 📑 Indice

1. [White Paper Esecutivo](#white-paper-esecutivo)
2. [Panoramica Tecnica](#panoramica-tecnica)
3. [Architettura del Sistema](#architettura-del-sistema)
4. [Funzionalità Principali](#funzionalità-principali)
5. [Stack Tecnologico](#stack-tecnologico)
6. [Guida Setup Completa](#guida-setup-completa)
7. [Struttura del Progetto](#struttura-del-progetto)
8. [Database Schema](#database-schema-completo)
9. [Sistema AI Multi-Agente](#sistema-ai-multi-agente)
10. [API e Backend](#api-e-backend)
11. [UI/UX e Design](#uiux-e-design-system)
12. [Funzionalità Avanzate](#funzionalità-avanzate)
13. [Testing e Quality Assurance](#testing-e-quality-assurance)
14. [Deployment](#deployment-e-produzione)
15. [Troubleshooting](#troubleshooting)
16. [Roadmap](#roadmap-e-sviluppi-futuri)

---

## 🎯 WHITE PAPER ESECUTIVO

### Visione e Missione

**G-Press** rivoluziona il mercato delle PR trasformando il modello tradizionale di distribuzione comunicati stampa da processo manuale, costoso e inefficiente a **sistema intelligente, automatizzato e data-driven**.

### Il Problema

Il settore tradizionale delle PR soffre di:
- ❌ **Costi elevati**: €200-900/mese senza garanzie di risultato
- ❌ **Zero tracking**: Impossibile sapere chi legge cosa
- ❌ **Comunicazione generica**: Stesso testo a tutti i giornalisti
- ❌ **Database obsoleti**: Email non più valide, contatti vecchi
- ❌ **Nessun apprendimento**: Ogni campagna riparte da zero

### La Soluzione G-Press

G-Press offre una piattaforma che combina:

1. **Database Proprietario**: 9.001 giornalisti italiani verificati e profilati
2. **AI Multi-Agente**: 3 agenti specializzati (Ricercatore, Writer, Editor)
3. **Real-Time Tracking**: Monitoraggio aperture, click, engagement
4. **Autopilota Intelligente**: Generazione automatica basata su trend
5. **Machine Learning**: Sistema che apprende e migliora nel tempo

### Value Proposition

| Metrica | Agenzia Tradizionale | G-Press |
|---------|---------------------|---------|
| Costo mensile | €200-900 | Competitivo |
| Tracciamento | ❌ No | ✅ Real-time |
| Personalizzazione AI | ❌ No | ✅ Sì |
| Follow-up automatici | ❌ No | ✅ Sì |
| Database verificato | ❌ No | ✅ 9.001 contatti |
| Apprendimento | ❌ No | ✅ Continuous learning |
| ROI misurabile | ❌ No | ✅ Dashboard completa |

### Mercato e Opportunità

**Mercato Globale PR**: $107 miliardi (2024), crescita 6.7%/anno

**Target Italiani**:
- 4+ milioni PMI (92% del tessuto imprenditoriale)
- 16.500+ startup innovative
- 18.000+ agenzie di comunicazione
- Aziende Crypto/Web3 con esigenze di visibilità

### Differenziatori Competitivi

#### vs Agenzie Tradizionali
✅ Tracking completo vs ❌ Report vaghi
✅ AI personalizzazione vs ❌ Contenuti generici
✅ Apprendimento continuo vs ❌ Processo statico
✅ Database verificato vs ❌ Liste obsolete

#### vs Email Marketing Tools (Mailchimp, Sendinblue)
✅ Database giornalisti incluso vs ❌ Build manuale
✅ AI specializzata PR vs ❌ Template generici
✅ Follow-up intelligenti vs ❌ Workflow statici
✅ Ranking engagement vs ❌ No profiling

#### vs PR Platforms Enterprise (Cision, Meltwater)
✅ Autopilota autonomo vs ❌ Solo strumenti passivi
✅ Fine-tuning personalizzato vs ❌ Modelli generici
✅ Costo accessibile vs ❌ Pricing enterprise
✅ Focus Italia vs ❌ Database globali generici

### Modello di Business SaaS

```
📊 Tiering Proposto:

🌱 Starter - €49/mese
   → 500 email/mese, tracking base
   → Target: Freelance, micro-imprese

💼 Professional - €149/mese
   → 2.000 email/mese, AI completa
   → Target: PMI, startup

🏢 Business - €399/mese
   → 10.000 email/mese, autopilota
   → Target: Aziende medie

🏆 Enterprise - Custom
   → Illimitato, white-label, API
   → Target: Grandi aziende, agenzie
```

### Barriere all'Ingresso

1. **Tecnologica**: Sistema multi-agente complesso, anni di sviluppo
2. **Data**: 9.001 giornalisti verificati = asset proprietario
3. **Network Effect**: Più utenti = AI più precisa
4. **Switching Cost**: Fine-tuning e Knowledge Base = lock-in naturale

### Proiezioni di Crescita

| Anno | Utenti Attivi | ARR | DB Giornalisti |
|------|---------------|-----|----------------|
| 2025 | 500 | €500K | 15.000 |
| 2026 | 2.000 | €2M | 50.000 |
| 2027 | 5.000 | €5M | 100.000 |
| 2028 | 10.000 | €12M | 200.000 |

### ROI per il Cliente

**Scenario 5 anni**:
- Anno 1: Database consolidato → +50% efficacia
- Anno 2: Modelli predittivi attivi → +100% efficacia
- Anno 3: Ottimizzazione automatica → +150% efficacia
- Anno 4: Autonomia strategica → +200% efficacia
- Anno 5: Leadership settore → +300% efficacia

**vs Agenzia tradizionale**: €12.000 spesi in 5 anni senza ROI misurabile

### Team e Competenze

- **AI/ML Engineering**: Sistema multi-agente, NLP avanzato
- **Backend Architecture**: Node.js, tRPC, serverless scalabile
- **Frontend Development**: React Native cross-platform
- **Data Science**: Modelli predittivi, ranking algorithms
- **PR Domain Expertise**: Database building, content optimization

---

## 📖 PANORAMICA TECNICA

### Che cos'è G-Press?

G-Press è una **applicazione mobile cross-platform** (iOS/Android/Web) costruita con React Native ed Expo, che permette di:

1. **Creare comunicati stampa** con AI o manualmente
2. **Inviarli a 9.001+ giornalisti** italiani verificati
3. **Tracciare aperture e click** in tempo reale
4. **Automatizzare follow-up** intelligenti
5. **Apprendere** dalle interazioni per migliorare nel tempo

### Architettura High-Level

```
┌─────────────────────────────────────────────────────────────┐
│                     G-PRESS SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐     ┌──────────┐ │
│  │   MOBILE     │◄────►│   BACKEND    │◄───►│ EXTERNAL │ │
│  │   APP        │      │   (tRPC)     │     │ SERVICES │ │
│  │              │      │              │     │          │ │
│  │ • React      │      │ • Node.js    │     │ • OpenAI │ │
│  │   Native     │      │ • Express    │     │ • Resend │ │
│  │ • Expo       │      │ • TypeScript │     │ • MySQL  │ │
│  │ • TypeScript │      │              │     │          │ │
│  └──────────────┘      └──────────────┘     └──────────┘ │
│         │                      │                   │       │
│         │                      │                   │       │
│         ▼                      ▼                   ▼       │
│  ┌──────────────┐      ┌──────────────┐    ┌──────────┐ │
│  │   LOCAL      │      │   DATABASE   │    │   SMTP   │ │
│  │   STORAGE    │      │              │    │  SERVER  │ │
│  │              │      │ • Journalists│    │          │ │
│  │ • AsyncStore │      │ • Press Rel. │    │ • Email  │ │
│  │ • D1 Cache   │      │ • Analytics  │    │   Sending│ │
│  └──────────────┘      └──────────────┘    └──────────┘ │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Tecnologie Chiave

- **Frontend**: React Native 0.81.5 + Expo 54.0
- **Backend**: Node.js + Express + tRPC 11.7
- **Database**: MySQL (TiDB compatibile)
- **AI**: OpenAI GPT-4o-mini
- **Email**: Resend API
- **Storage**: Cloudflare D1 (SQLite serverless)
- **Deployment**: Vercel (serverless functions)

---

## 🏗️ ARCHITETTURA DEL SISTEMA

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  React Native Components                       │   │
│  │  • HomeScreen (Invio comunicati)              │   │
│  │  • ContactsScreen (Gestione giornalisti)      │   │
│  │  │  • HistoryScreen (Storico invii)           │   │
│  │  • SettingsScreen (Configurazioni)            │   │
│  │  • StatsScreen (Analytics)                    │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              APPLICATION LAYER                          │
│  ┌────────────────────────────────────────────────┐   │
│  │  Business Logic & State Management             │   │
│  │  • tRPC Clients (Type-safe API calls)         │   │
│  │  • React Query (Data fetching & caching)      │   │
│  │  • Custom Hooks (use-auth, use-storage)       │   │
│  │  • Local State (React useState/Context)       │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              API/COMMUNICATION LAYER                    │
│  ┌────────────────────────────────────────────────┐   │
│  │  tRPC Routers                                  │   │
│  │  • auth (Login/Logout)                        │   │
│  │  • journalists (CRUD operazioni)              │   │
│  │  • pressReleases (Gestione articoli)          │   │
│  │  • email (Invio e tracking)                   │   │
│  │  • ai (Generazione contenuti)                 │   │
│  │  • autopilot (Automazione)                    │   │
│  │  • stats (Analytics)                          │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC LAYER                       │
│  ┌────────────────────────────────────────────────┐   │
│  │  Core Services                                 │   │
│  │  • AI Agents (Ricercatore, Writer, Editor)    │   │
│  │  • Email Service (Resend integration)         │   │
│  │  • Follow-up System                           │   │
│  │  • Autopilot Engine                           │   │
│  │  • Trend Detection                            │   │
│  │  • Learning System                            │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              DATA LAYER                                 │
│  ┌────────────────────────────────────────────────┐   │
│  │  Database & Storage                            │   │
│  │  • MySQL/TiDB (Production DB)                 │   │
│  │  • Cloudflare D1 (Edge storage)               │   │
│  │  • AsyncStorage (Local cache)                 │   │
│  │  • File System (Attachments)                  │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES LAYER                    │
│  ┌────────────────────────────────────────────────┐   │
│  │  Third-party Integrations                      │   │
│  │  • OpenAI API (GPT-4 per AI agents)           │   │
│  │  • Resend API (Email delivery)                │   │
│  │  • Manus OAuth (Authentication)               │   │
│  │  • Cloudflare Workers (Edge compute)          │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
USER ACTION → MOBILE APP → tRPC CLIENT → tRPC SERVER → 
BUSINESS LOGIC → DATABASE → RESPONSE → tRPC CLIENT → 
UI UPDATE
```

**Esempio: Invio Comunicato Stampa**

```
1. User fills form in HomeScreen
2. User presses "Invia a N Giornalisti"
3. Frontend validates input
4. tRPC mutation called: pressReleases.send
5. Server receives request
6. Business logic:
   a. Get filtered journalists from DB
   b. Create press release record
   c. Create distribution records
   d. Generate email HTML
   e. Send via Resend API (batch)
   f. Update distributions with sent status
   g. Schedule follow-ups (48h)
   h. Track events (opens/clicks)
7. Server returns result
8. Frontend shows success message
9. Local storage updated
10. History screen auto-refreshes
```

---

## ⚡ FUNZIONALITÀ PRINCIPALI

### 1. 📝 Creazione e Gestione Comunicati Stampa

**Schermata**: `app/(tabs)/index.tsx`

**Cosa fa:**
- Form completo per creazione comunicati
- Campi: Titolo, Sottotitolo, Contenuto, Nota aziendale, Contatti stampa
- Allegati: Fino a 5 immagini
- Template: Salvataggio e riutilizzo bozze
- Filtri destinatari: Categoria, Paese
- Selezione manuale giornalisti
- Invio con tracking

**Codice chiave:**
```typescript
// app/(tabs)/index.tsx
const handleSend = async () => {
  // Validate inputs
  if (!title.trim() || !content.trim()) {
    Alert.alert("Errore", "Compila i campi obbligatori");
    return;
  }
  
  // Get filtered journalists
  const emails = filteredJournalists.map(j => j.email);
  
  // Save to history
  await saveToHistory({ ...pressRelease });
  
  // Send emails via backend
  const result = await sendEmailsWithAttachments({
    to: emails,
    subject: title,
    html: htmlContent,
    attachments: imageAttachments
  });
  
  // Schedule follow-ups (48h)
  await scheduleFollowUpsForAll(prId, distributions, 2);
  
  // Show result
  Alert.alert("✅ Invio Completato", `${result.sent} email inviate`);
};
```

### 2. 👥 Gestione Database Giornalisti

**Schermata**: `app/(tabs)/contacts.tsx`

**Database incluso:**
- 9.001 giornalisti italiani precaricati da `assets/data/journalists.json`
- Campi: Nome, Email, Testata, Posizione, Categoria, Paese
- Possibilità di aggiungere custom journalists
- Blacklist (esclusione temporanea)
- Import CSV
- Import da LinkedIn

**Features:**
- Ricerca full-text
- Filtri per categoria/paese
- Esportazione CSV
- Sincronizzazione con D1 (persistenza)
- Verifica email
- Statistiche engagement per giornalista

**Codice chiave:**
```typescript
// server/db.ts - Esempio query giornalisti
export async function getAllJournalists(filters?: {
  category?: string;
  country?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  let query = db.select().from(journalists);
  
  if (filters?.category) {
    query = query.where(eq(journalists.category, filters.category));
  }
  if (filters?.country) {
    query = query.where(eq(journalists.country, filters.country));
  }
  if (filters?.isActive !== undefined) {
    query = query.where(eq(journalists.isActive, filters.isActive));
  }
  
  return await query;
}
```

### 3. 🤖 Sistema AI Multi-Agente

**File**: `server/ai-agents.ts`

**Architettura 3 Agenti Specializzati:**

```
┌──────────────────────────────────────────────┐
│         INPUT: Documenti/Brief              │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│   AGENTE 1: IL RICERCATORE                   │
│                                               │
│   🔍 Compiti:                                │
│   • Analisi trend e timing                   │
│   • Identificazione angoli giornalistici     │
│   • Estrazione dati chiave                   │
│   • Profiling target media                   │
│   • Identificazione punti deboli             │
│                                               │
│   Output: Report analisi strutturato         │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│   AGENTE 2: IL WRITER SENIOR                 │
│                                               │
│   ✍️ Compiti:                                │
│   • Scrittura articolo basata su analisi     │
│   • Applicazione tecniche PNL                │
│   • Struttura piramide invertita             │
│   • Ottimizzazione engagement                │
│   • Tone professionale ma coinvolgente       │
│                                               │
│   Tecniche:                                   │
│   • Pattern linguistici persuasivi           │
│   • Ancoraggi emotivi strategici             │
│   • Lead con 5W (Who, What, When, Where, Why)│
│   • Regola del 3 (3 punti chiave)           │
│                                               │
│   Output: Articolo completo (Title + Body)   │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│   AGENTE 3: IL CAPO REDAZIONE                │
│                                               │
│   ✅ Compiti:                                │
│   • Fact-checking                            │
│   • Correzione errori                        │
│   • Ottimizzazione stile                     │
│   • Quality score (1-10)                     │
│   • Validazione pubblicabilità               │
│                                               │
│   Checklist:                                  │
│   • Accuratezza fatti                        │
│   • Struttura corretta                       │
│   • Tono appropriato                         │
│   • Red flags (promozionale, speculazioni)   │
│                                               │
│   Output: Articolo finale + Report revisione │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│         OUTPUT: Articolo Pubblicabile        │
│         + Metadata + Quality Score           │
└──────────────────────────────────────────────┘
```

**Esempio utilizzo:**

```typescript
// server/ai-agents.ts
const result = await runMultiAgentPipeline(documents);

// result.research: analisi del ricercatore
// result.draft: articolo del writer
// result.final: articolo revisionato dall'editor
// result.processingTime: tempi di esecuzione

console.log(result.final.finalArticle.title);
console.log(result.final.finalArticle.content);
console.log(`Quality Score: ${result.final.qualityScore}/10`);
```

### 4. 📧 Sistema Email con Tracking

**File**: `server/email.ts`, `server/email-utility.ts`

**Features:**
- Invio bulk tramite Resend API
- Tracking pixel per aperture
- Link tracking per click
- Gestione bounce/fallimenti
- Retry automatici
- Rate limiting
- HTML responsive templates
- Allegati (immagini, PDF)

**Workflow invio:**

```typescript
// 1. Prepare emails
const emails = journalists.map(j => j.email);

// 2. Generate HTML with tracking
const htmlContent = formatPressReleaseEmail({
  title, subtitle, content,
  boilerplate, contactName, contactEmail
});

// 3. Send via Resend (batch max 100)
const result = await sendEmailUtility({
  to: emails,
  subject: title,
  html: htmlContent,
  attachments: imageAttachments
});

// 4. Track events via webhooks
// Resend calls /api/webhooks/email-events
// Events: sent, delivered, opened, clicked, bounced

// 5. Update analytics
await trackEmailEvent({
  distributionId: dist.id,
  eventType: 'opened',
  timestamp: new Date(),
  userAgent, ipAddress, country, city
});
```

**Email Template Example:**

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial; max-width: 600px; margin: 0 auto; }
    h1 { color: #1E88E5; font-size: 24px; }
    .content { margin: 20px 0; white-space: pre-wrap; }
    .footer { font-size: 12px; color: #999; margin-top: 30px; }
  </style>
</head>
<body>
  <p>Gentile {{journalist.name}},</p>
  <p>Le inviamo il seguente comunicato stampa:</p>
  
  <h1>{{title}}</h1>
  <h2>{{subtitle}}</h2>
  
  <div class="content">{{content}}</div>
  
  <div class="boilerplate">
    <strong>Informazioni sull'azienda:</strong><br>
    {{boilerplate}}
  </div>
  
  <div class="contact">
    <strong>Contatti per la stampa:</strong><br>
    {{contactName}}<br>
    {{contactEmail}}<br>
    {{contactPhone}}
  </div>
  
  <div class="footer">
    <p>Comunicato inviato tramite G-Press.</p>
    <!-- Tracking pixel -->
    <img src="{{tracking_url}}" width="1" height="1" />
  </div>
</body>
</html>
```

### 5. 🔄 Follow-Up Automatici

**File**: `server/follow-up.ts`

**Logica:**
- Se email NON aperta dopo 48h → Follow-up 1
- Se email NON aperta dopo 96h → Follow-up 2
- Se email NON aperta dopo 144h → Follow-up 3
- Max 3 follow-up per evitare spam

**Scheduling:**

```typescript
// server/follow-up.ts
export async function scheduleFollowUpsForAll(
  pressReleaseId: number,
  distributions: Array<{ journalistId: number; distributionId: number }>,
  delayDays: number = 2
) {
  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + delayDays);
  
  for (const { journalistId, distributionId } of distributions) {
    await db.createFollowUp({
      distributionId,
      pressReleaseId,
      journalistId,
      followUpNumber: 1,
      scheduledAt,
      status: 'pending'
    });
  }
}

// Cron job checks pending follow-ups every hour
export async function processFollowUpQueue() {
  const now = new Date();
  const pending = await db.getFollowUpsDue(now);
  
  for (const followUp of pending) {
    const dist = await db.getDistributionById(followUp.distributionId);
    
    // Skip if email was opened
    if (dist.status === 'opened' || dist.status === 'clicked') {
      await db.updateFollowUp(followUp.id, { status: 'skipped' });
      continue;
    }
    
    // Send follow-up
    await sendFollowUpEmail(followUp);
    await db.updateFollowUp(followUp.id, { 
      status: 'sent', 
      sentAt: now 
    });
    
    // Schedule next follow-up if < 3
    if (followUp.followUpNumber < 3) {
      await scheduleNextFollowUp(followUp);
    }
  }
}
```

### 6. 🎯 Autopilota Intelligente

**File**: `server/autopilot-system.ts`

**Funzionalità:**

```
AUTONOMOUS AUTOPILOT = AI che lavora 24/7 in autonomia

┌─────────────────────────────────────────────┐
│  STEP 1: Monitoraggio Trend                 │
│  • Ogni ora controlla news e social media    │
│  • Identifica trend emergenti rilevanti      │
│  • Usa NLP per capire topic e sentiment      │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  STEP 2: Valutazione Opportunità            │
│  • Calcola "virality score" del trend       │
│  • Verifica allineamento con Knowledge Base  │
│  • Stima probabilità di engagement           │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  STEP 3: Generazione Articolo               │
│  • Se trend promettente, attiva AI agents    │
│  • Genera articolo personalizzato            │
│  • Quality check automatico                  │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  STEP 4: Approvazione                       │
│  • Notifica user con preview                │
│  • Attende approvazione (max 24h)           │
│  • Se approvato → invio automatico           │
│  • Se rifiutato → apprende da feedback       │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  STEP 5: Invio Ottimizzato                  │
│  • Seleziona best timing basato su analytics│
│  • Sceglie giornalisti più engaged           │
│  • Invia in batch distribuiti                │
│  • Monitora risultati in real-time           │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│  STEP 6: Apprendimento                      │
│  • Raccoglie metriche (open rate, clicks)   │
│  • Aggiorna modelli predittivi               │
│  • Affina targeting e timing                 │
│  • Migliora qualità articoli futuri          │
└─────────────────────────────────────────────┘
```

**Codice esempio:**

```typescript
// server/autopilot-system.ts
export async function runAutopilotCycle() {
  const userId = 1; // Owner user ID
  
  // 1. Check trends
  const trends = await trendDetection.detectTrends();
  console.log(`[Autopilot] Found ${trends.length} trends`);
  
  // 2. Evaluate opportunities
  const opportunities = trends
    .filter(t => t.viralityScore > 0.7)
    .sort((a, b) => b.viralityScore - a.viralityScore)
    .slice(0, 3);
  
  if (opportunities.length === 0) {
    console.log('[Autopilot] No promising trends');
    return;
  }
  
  // 3. Generate article for best trend
  const bestTrend = opportunities[0];
  const article = await aiAgents.runMultiAgentPipeline(
    bestTrend.description
  );
  
  // 4. Save for approval
  const pendingArticle = await db.createPendingArticle({
    userId,
    trendId: bestTrend.id,
    title: article.final.finalArticle.title,
    content: article.final.finalArticle.content,
    qualityScore: article.final.qualityScore,
    status: 'pending_approval'
  });
  
  // 5. Notify owner
  await notifyOwner({
    title: '🤖 Autopilota: Nuovo Articolo Pronto',
    content: `Titolo: "${article.final.finalArticle.title}"\n\nTrend: ${bestTrend.title}\nQuality: ${article.final.qualityScore}/10\n\nApri l'app per approvare o rifiutare.`
  });
  
  // 6. Update state
  await db.updateAutopilotState(userId, {
    lastCheck: new Date(),
    trendsChecked: trends.length,
    articlesGenerated: 1,
    pendingArticleId: pendingArticle.id
  });
}

// Cron job runs every hour
setInterval(runAutopilotCycle, 60 * 60 * 1000);
```

### 7. 📊 Analytics e Dashboard

**Schermata**: `app/(tabs)/stats.tsx`

**Metriche Tracciate:**

```typescript
interface EmailStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number; // Percentuale
  clickRate: number; // Percentuale
  bounceRate: number; // Percentuale
  
  // Per giornalista
  topJournalists: Array<{
    id: number;
    name: string;
    outlet: string;
    opensCount: number;
    clicksCount: number;
    engagement: number; // Score 0-100
  }>;
  
  // Per orario
  bestSendTimes: Array<{
    dayOfWeek: number; // 0-6
    hourOfDay: number; // 0-23
    openRate: number;
    clickRate: number;
  }>;
  
  // Per categoria
  categoryPerformance: Array<{
    category: string;
    sent: number;
    opened: number;
    clicked: number;
  }>;
}
```

**Dashboard Features:**
- Grafici interattivi (Chart.js o Victory Native)
- Heatmap orari migliori per invio
- Ranking giornalisti per engagement
- Export report PDF/Excel
- Confronto performance tra campagne
- Trend temporali (settimana, mese, anno)

### 8. 🗂️ Knowledge Base

**File**: `server/db.ts` (table `knowledgeDocuments`)

**Scopo**: Database di documenti aziendali che l'AI usa per generare articoli personalizzati

**Funzionalità:**
- Upload documenti (PDF, TXT, MD)
- Categorizzazione automatica
- Indicizzazione full-text
- Versioning
- Fine-tuning AI basato su questi documenti

**Esempio:**

```typescript
// User uploads company info
await db.createKnowledgeDocument({
  userId: 1,
  name: 'Chi Siamo - GROWVERSE',
  category: 'company',
  content: `GROWVERSE è una startup innovativa specializzata in soluzioni AI per il business. Fondata nel 2023, il team comprende esperti in machine learning, NLP e data science...`,
  fileType: 'text/plain',
  fileSize: 5420
});

// AI uses this when generating articles
const knowledgeBase = await db.getUserKnowledgeDocuments(userId);
const context = knowledgeBase.map(doc => doc.content).join('\n\n');

const article = await aiAgents.runMultiAgentPipeline(
  `Brief: ${userInput}\n\nContext aziendale:\n${context}`
);
```

### 9. 🔍 Self-Healing e Auto-Optimization

**File**: `server/self-healing.ts`

**Features:**
- **Auto-retry** su email fallite
- **Blacklist automatica** email con bounce ripetuti
- **A/B testing** subject lines
- **Ottimizzazione timing** basata su analytics
- **Quality control** articoli AI (rigetta se score < 6/10)

```typescript
// Self-healing example
export async function healFailedDistributions() {
  const failed = await db.getFailedDistributions();
  
  for (const dist of failed) {
    // Check journalist status
    const journalist = await db.getJournalistById(dist.journalistId);
    
    // If too many bounces, deactivate
    if (journalist.bounceCount >= 3) {
      await db.updateJournalist(journalist.id, { isActive: false });
      console.log(`[SelfHealing] Deactivated ${journalist.email} (too many bounces)`);
      continue;
    }
    
    // Retry send with exponential backoff
    const retryDelay = Math.pow(2, dist.retryCount) * 1000; // 1s, 2s, 4s, 8s...
    setTimeout(async () => {
      await retryEmailSend(dist);
    }, retryDelay);
  }
}
```

### 10. 📈 Predictive Analytics

**File**: `server/predictive-trend-analysis.ts`, `server/viralita-predittiva.ts`

**Modelli Predittivi:**

1. **Virality Prediction**: Stima probabilità che un articolo diventi virale
   - Input: Titolo, keywords, timing, categoria
   - Output: Score 0-1

2. **Engagement Prediction**: Stima open rate e click rate
   - Input: Subject line, sender, ora invio, giornalista history
   - Output: Probabilità apertura/click

3. **Best Time Prediction**: Suggerisce orario ottimale invio
   - Input: Categoria, paese target, giorno settimana
   - Output: Orario consigliato + confidence

**Esempio:**

```typescript
// server/viralita-predittiva.ts
export async function predictVirality(article: {
  title: string;
  content: string;
  category: string;
  timing: Date;
}): Promise<{
  score: number; // 0-1
  factors: {
    titleQuality: number;
    contentLength: number;
    keywordRelevance: number;
    timingScore: number;
    trendAlignment: number;
  };
  recommendation: string;
}> {
  // Analizza fattori
  const factors = {
    titleQuality: analyzeTitleQuality(article.title),
    contentLength: analyzeContentLength(article.content),
    keywordRelevance: analyzeKeywords(article),
    timingScore: analyzeTimingOpportunity(article.timing),
    trendAlignment: checkTrendAlignment(article)
  };
  
  // Calcola score composito
  const score = (
    factors.titleQuality * 0.3 +
    factors.contentLength * 0.15 +
    factors.keywordRelevance * 0.25 +
    factors.timingScore * 0.2 +
    factors.trendAlignment * 0.1
  );
  
  // Genera raccomandazione
  let recommendation = '';
  if (score >= 0.8) recommendation = 'Eccellente! Alta probabilità viralità';
  else if (score >= 0.6) recommendation = 'Buono, con potenziale discreto';
  else recommendation = 'Migliorabile, considera revisioni';
  
  return { score, factors, recommendation };
}
```

---

## 🛠️ STACK TECNOLOGICO

### Frontend (Mobile App)

```json
{
  "framework": "React Native 0.81.5",
  "runtime": "Expo 54.0",
  "language": "TypeScript 5.9",
  "navigation": "Expo Router 6.0",
  "stateManagement": "React Query (@tanstack/react-query 5.60)",
  "api": "tRPC 11.7 (type-safe)",
  "styling": "StyleSheet + LinearGradient",
  "localStorage": "AsyncStorage + Expo SecureStore",
  "images": "Expo Image + Image Picker",
  "gestures": "React Native Gesture Handler",
  "components": [
    "React Native Picker (dropdowns)",
    "React Native SVG (icons)",
    "Expo Haptics (feedback)",
    "Expo Clipboard",
    "Expo Notifications",
    "Expo Sharing"
  ]
}
```

### Backend (API Server)

```json
{
  "runtime": "Node.js 22.x",
  "framework": "Express 4.21",
  "api": "tRPC 11.7",
  "language": "TypeScript 5.9",
  "orm": "Drizzle ORM 0.44",
  "database": "MySQL 2 (mysql2 3.15)",
  "validation": "Zod 4.1",
  "serialization": "SuperJSON 1.13",
  "auth": "Manus OAuth + Jose JWT 6.1",
  "email": "Resend API 6.6",
  "ai": "OpenAI SDK 6.14 (GPT-4o-mini)",
  "storage": "Cloudflare D1 (SQLite edge)",
  "caching": "LRU Cache 11.2"
}
```

### DevOps & Tools

```json
{
  "deployment": "Vercel (serverless functions)",
  "edge": "Cloudflare Workers",
  "ci": "GitHub Actions",
  "testing": "Vitest 2.1",
  "linting": "ESLint 9.25 + Prettier 3.6",
  "bundling": "esbuild 0.25 + Metro",
  "packageManager": "pnpm 9.12",
  "typescript": "TypeScript 5.9 (strict mode)",
  "environment": ".env files + Vercel env vars"
}
```

### External Services

```json
{
  "email": "Resend (transactional email)",
  "ai": "OpenAI GPT-4o-mini",
  "auth": "Manus OAuth",
  "database": "TiDB Cloud (MySQL compatible)",
  "storage": "Cloudflare R2 (S3 compatible)",
  "cdn": "Cloudflare CDN",
  "monitoring": "Vercel Analytics",
  "errors": "Vercel Error Tracking"
}
```

---

## 🚀 GUIDA SETUP COMPLETA

### Prerequisiti

Assicurati di avere installato:

```bash
# Node.js 22 or higher
node --version  # v22.x.x

# pnpm package manager
npm install -g pnpm@9.12.0

# Expo CLI
npm install -g expo-cli

# Git
git --version
```

### 1. Clone Repository

```bash
git clone https://github.com/Marcone1983/G-Press.git
cd G-Press
```

### 2. Install Dependencies

```bash
# Install all dependencies (frontend + backend)
pnpm install

# This installs:
# - React Native & Expo packages
# - tRPC client & server
# - Drizzle ORM
# - OpenAI SDK
# - Resend email SDK
# - All TypeScript types
```

### 3. Environment Variables

Crea file `.env` nella root del progetto:

```bash
# .env
# ====================================
# DATABASE
# ====================================
DATABASE_URL=mysql://user:password@host:port/database
# Example: mysql://admin:secret@tidb.cloud:4000/gpress

# ====================================
# OPENAI API (per AI agents)
# ====================================
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ====================================
# RESEND API (per email sending)
# ====================================
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ====================================
# MANUS OAUTH (authentication)
# ====================================
VITE_APP_ID=your_app_id_from_manus
OAUTH_SERVER_URL=https://oauth.manus.space
VITE_OAUTH_PORTAL_URL=https://auth.manus.space
OWNER_OPEN_ID=your_manus_user_id
OWNER_NAME=Your Name

# ====================================
# JWT SECRET (session signing)
# ====================================
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# ====================================
# MANUS API (for internal services)
# ====================================
BUILT_IN_FORGE_API_URL=https://api.manus.space
BUILT_IN_FORGE_API_KEY=your_manus_api_key

# ====================================
# EXPO (runtime config)
# ====================================
EXPO_PUBLIC_APP_ID=${VITE_APP_ID}
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_OAUTH_PORTAL_URL=${VITE_OAUTH_PORTAL_URL}
EXPO_PORT=8081
```

**Dove ottenere le chiavi:**

1. **OpenAI API Key**: https://platform.openai.com/api-keys
2. **Resend API Key**: https://resend.com/api-keys
3. **Manus OAuth**: Chiedi accesso al team Manus
4. **Database**: Crea database su TiDB Cloud o MySQL

### 4. Database Setup

```bash
# Generate database schema
pnpm db:push

# Questo comando:
# 1. Legge schema da drizzle/schema.ts
# 2. Genera migrations in drizzle/migrations/
# 3. Applica migrations al database
# 4. Crea tutte le tabelle

# Tabelle create:
# - users (autenticazione)
# - journalists (9001+ giornalisti)
# - pressReleases (comunicati inviati)
# - distributions (tracking invii)
# - emailEvents (aperture/click)
# - emailAnalytics (statistiche aggregate)
# - followUpQueue (follow-up automatici)
# - sendPatterns (pattern di successo appresi)
# - autopilotCampaigns (campagne autopilota)
# - autopilotState (stato autopilota)
# - knowledgeDocuments (knowledge base AI)
# - successfulArticles (cache articoli performanti)
```

**Populate journalists database:**

```bash
# I 9001 giornalisti sono in assets/data/journalists.json
# Vengono caricati automaticamente dall'app al primo avvio
# Oppure importa manualmente:

node scripts/import-journalists.js
```

### 5. Development Server

**Terminale 1: Backend API**

```bash
pnpm dev:server

# Avvia server Express + tRPC su http://localhost:3000
# Hot reload abilitato con tsx watch
# API endpoint: http://localhost:3000/api/trpc
```

**Terminale 2: Metro Bundler (Frontend)**

```bash
pnpm dev:metro

# Avvia Expo Metro Bundler su http://localhost:8081
# Compila React Native bundle
```

**Terminale 3 (Opzionale): Tutto insieme**

```bash
pnpm dev

# Avvia sia server che metro in parallelo
# Usa concurrently per gestire entrambi
```

### 6. Run App

**iOS Simulator:**

```bash
pnpm ios

# Requirements:
# - macOS
# - Xcode installed
# - iOS Simulator running
```

**Android Emulator:**

```bash
pnpm android

# Requirements:
# - Android Studio installed
# - AVD (Android Virtual Device) configured
```

**Web Browser:**

```bash
# Metro già running, poi:
# Premi 'w' nel terminale Metro
# Oppure apri: http://localhost:8081

# La web version è completamente funzionale
```

**Physical Device (Expo Go):**

```bash
# 1. Install Expo Go app on iOS/Android
# 2. Scan QR code shown in terminal
# 3. App loads on device
```

### 7. Build for Production

**iOS:**

```bash
# Create iOS build
eas build --platform ios

# Requirements:
# - Expo Application Services (EAS) account
# - Apple Developer account
# - Configured app.config.ts with bundleIdentifier
```

**Android:**

```bash
# Create Android APK/AAB
eas build --platform android

# Requirements:
# - EAS account
# - Configured app.config.ts with package name
```

**Web:**

```bash
# Build static website
npx expo export:web

# Output: web-build/
# Deploy to Vercel, Netlify, etc.
```

### 8. Deploy Backend

**Vercel (Consigliato):**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Configure:
# - Set environment variables in Vercel dashboard
# - Add DATABASE_URL, OPENAI_API_KEY, RESEND_API_KEY, etc.
# - Set Node.js version to 22.x

# Vercel config already in: vercel.json
```

**Alternative (Self-hosted):**

```bash
# Build server
pnpm build

# Output: dist/index.js

# Run in production
NODE_ENV=production node dist/index.js

# Use PM2 for process management:
pm2 start dist/index.js --name gpress-api
pm2 save
pm2 startup
```

### 9. Database Migrations

Quando modifichi lo schema:

```bash
# 1. Edit drizzle/schema.ts
# Example: add new column
export const journalists = mysqlTable("journalists", {
  // ... existing columns
  instagram: varchar("instagram", { length: 100 }),  // NEW
});

# 2. Generate migration
pnpm db:push

# 3. Migration applicata automaticamente
```

### 10. Testing

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test tests/auth.test.ts

# Watch mode
pnpm test -- --watch
```

### 11. Linting & Formatting

```bash
# Check TypeScript types
pnpm check

# Lint code
pnpm lint

# Fix lint issues
pnpm lint --fix

# Format code
pnpm format
```

### 12. Troubleshooting Setup

**Port già in uso:**

```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 8081 (metro)
lsof -ti:8081 | xargs kill -9
```

**Cache issues:**

```bash
# Clear Metro cache
npx expo start --clear

# Clear npm/pnpm cache
pnpm store prune
rm -rf node_modules
pnpm install
```

**Database connection issues:**

```bash
# Test connection
mysql -h your-host -u your-user -p your-database

# Check DATABASE_URL format:
# mysql://USER:PASSWORD@HOST:PORT/DATABASE
# Example: mysql://admin:pass@tidb.cloud:4000/gpress
```

**Expo/Metro issues:**

```bash
# Reset Expo cache
rm -rf .expo
rm -rf node_modules/.cache

# Reinstall Expo
pnpm add expo@latest

# Update Expo CLI
npm install -g expo-cli@latest
```

---

## 📁 STRUTTURA DEL PROGETTO

```
G-Press/
├── 📱 app/                          # Frontend (React Native screens)
│   ├── (tabs)/                      # Tab navigation screens
│   │   ├── index.tsx                # 🏠 Home - Invio comunicati
│   │   ├── contacts.tsx             # 👥 Gestione giornalisti
│   │   ├── history.tsx              # 📜 Storico invii
│   │   ├── stats.tsx                # 📊 Analytics dashboard
│   │   ├── settings.tsx             # ⚙️ Impostazioni
│   │   ├── knowledge.tsx            # 📚 Knowledge Base
│   │   ├── ai-tools.tsx             # 🤖 AI Tools
│   │   └── _layout.tsx              # Tab bar layout
│   ├── oauth/                       # OAuth callback handlers
│   │   └── callback.tsx             # Manus OAuth redirect
│   └── _layout.tsx                  # Root layout
│
├── 🧩 components/                   # Reusable UI components
│   ├── ui/                          # Basic UI components
│   │   ├── icon-symbol.tsx          # Icon wrapper
│   │   └── collapsible.tsx          # Expandable sections
│   ├── themed-text.tsx              # Text with theme support
│   ├── themed-view.tsx              # View with theme support
│   ├── parallax-scroll-view.tsx    # Parallax scrolling
│   ├── haptic-tab.tsx              # Tab with haptic feedback
│   └── external-link.tsx           # External URL link
│
├── 🔧 server/                       # Backend (Node.js + tRPC)
│   ├── _core/                       # Core backend infrastructure
│   │   ├── index.ts                 # Express server entry point
│   │   ├── trpc.ts                  # tRPC router configuration
│   │   ├── context.ts               # Request context (auth)
│   │   ├── env.ts                   # Environment variables
│   │   ├── cookies.ts               # Cookie management
│   │   ├── notification.ts          # Owner notifications
│   │   ├── systemRouter.ts          # System endpoints
│   │   ├── rateLimiter.ts           # Rate limiting
│   │   ├── dataApi.ts               # Data API integration
│   │   ├── llm.ts                   # LLM (OpenAI) helpers
│   │   ├── voiceTranscription.ts    # Whisper API
│   │   └── imageGeneration.ts       # Image generation API
│   │
│   ├── db.ts                        # Database queries (Drizzle)
│   ├── routers.ts                   # Main tRPC router
│   │
│   ├── 🤖 AI & Content Generation
│   ├── ai-agents.ts                 # Multi-agent system (3 agents)
│   ├── ai.ts                        # AI utilities
│   ├── trend-detection.ts           # Trend monitoring
│   ├── predictive-trend-analysis.ts # Predictive analytics
│   ├── viralita-predittiva.ts       # Virality prediction
│   │
│   ├── 📧 Email System
│   ├── email.ts                     # Email sending logic
│   ├── email-utility.ts             # Resend API integration
│   ├── email-tracking.ts            # Open/click tracking
│   ├── follow-up.ts                 # Auto follow-ups
│   │
│   ├── 🚀 Automation
│   ├── autopilot.ts                 # Manual autopilot
│   ├── autopilot-system.ts          # Autonomous autopilot
│   ├── learning-system.ts           # Machine learning
│   ├── self-healing.ts              # Auto-recovery
│   ├── retargeting-intelligente.ts  # Smart retargeting
│   │
│   ├── 💾 Storage & Cache
│   ├── cloudflare-d1.ts             # D1 database (edge)
│   ├── storage.ts                   # S3/R2 storage
│   ├── backup.ts                    # Backup system
│   └── article-cache.ts             # Successful articles cache
│
├── 🗄️ drizzle/                     # Database ORM
│   ├── schema.ts                    # Database schema definition
│   ├── migrations/                  # SQL migrations
│   │   ├── 0000_init.sql
│   │   ├── 0001_add_journalists.sql
│   │   └── ...
│   └── meta/                        # Drizzle metadata
│       └── _journal.json
│
├── 🎣 hooks/                        # Custom React hooks
│   ├── use-auth.ts                  # Authentication hook
│   ├── use-storage.ts               # AsyncStorage wrapper
│   ├── use-d1-storage.ts            # D1 storage hook
│   ├── use-theme-color.ts           # Theme color hook
│   └── use-color-scheme.ts          # Dark/light mode
│
├── 📚 lib/                          # Utility libraries
│   ├── trpc.ts                      # tRPC client setup
│   ├── auth.ts                      # Auth utilities
│   ├── api.ts                       # API client
│   ├── api-client.ts                # HTTP client
│   ├── email-service.ts             # Email service client
│   ├── auto-timing.ts               # Timing optimization
│   ├── follow-up-service.ts         # Follow-up client
│   ├── email-verification.ts        # Email validation
│   ├── linkedin-import.ts           # LinkedIn scraping
│   └── d1-storage.ts                # D1 client
│
├── 📂 assets/                       # Static assets
│   ├── images/                      # App icons, splash screens
│   │   ├── icon.png                 # App icon
│   │   ├── splash-icon.png          # Splash screen
│   │   ├── favicon.png              # Web favicon
│   │   └── ...
│   ├── data/                        # Static data
│   │   └── journalists.json         # 9001 giornalisti DB
│   └── fonts/                       # Custom fonts
│
├── 🧪 tests/                        # Unit tests
│   ├── auth.logout.test.ts          # Auth tests
│   └── ...
│
├── 🛠️ scripts/                     # Utility scripts
│   ├── reset-project.js             # Reset project script
│   ├── load-env.js                  # Load environment
│   ├── generate_qr.mjs              # QR code generator
│   └── import-journalists.js        # Import CSV journalists
│
├── 🎨 constants/                    # App constants
│   ├── Colors.ts                    # Color palette
│   └── oauth.ts                     # OAuth config
│
├── 📦 shared/                       # Shared code
│   └── const.ts                     # Shared constants
│
├── 📋 Configuration Files
├── package.json                     # Dependencies & scripts
├── pnpm-lock.yaml                   # Lockfile
├── tsconfig.json                    # TypeScript config
├── app.config.ts                    # Expo config
├── metro.config.cjs                 # Metro bundler config
├── drizzle.config.ts                # Drizzle ORM config
├── eslint.config.js                 # ESLint rules
├── vercel.json                      # Vercel deployment
├── .gitignore                       # Git ignore
├── .watchmanconfig                  # Watchman config
│
├── 📄 Documentation
├── README.md                        # ⭐ Questo file
├── design.md                        # Design document
├── todo.md                          # TODO list
├── AUDIT_REPORT.md                  # Security audit
├── PITCH_DECK_CONTENT.md            # Pitch deck
├── TODO_FEATURE_COMPLETE.md         # Feature roadmap
│
├── 📖 White Papers
├── G-PRESS_WHITE_PAPER.md           # White paper IT
├── G-PRESS_WHITE_PAPER_EN.md        # White paper EN
├── G-PRESS_SHOWCASE_WHITEPAPER.md   # Showcase IT
├── G-PRESS_SHOWCASE_WHITEPAPER_EN.md# Showcase EN
│
├── 🎥 Media Files
├── G-PRESS_DEMO_VIDEO.mp4           # Demo video v1
├── G-PRESS_DEMO_VIDEO_v2.mp4        # Demo video v2
├── G-PRESS_Pitch_Deck.pdf           # Pitch deck v1
├── G-PRESS_PITCH_DECK_v2.pdf        # Pitch deck v2
├── Funzionamento.pdf                # How it works
└── *.jpg, *.png, *.webp            # Screenshots


## 🎨 UI/UX E DESIGN SYSTEM

### Color Palette

```typescript
// constants/Colors.ts
export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#F8F9FA',
    tint: '#2E7D32',          // Primary green
    tabIconDefault: '#9E9E9E',
    tabIconSelected: '#2E7D32',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#43A047',          // Lighter green for dark mode
    tabIconDefault: '#687076',
    tabIconSelected: '#43A047',
  },
};
```

### Typography

```typescript
// Font system
const typography = {
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
  },
};
```

### Component Library

**Cards**:
```tsx
// Styled card component
<View style={styles.card}>
  <ThemedText style={styles.cardTitle}>Title</ThemedText>
  {/* Content */}
</View>

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});
```

**Buttons**:
```tsx
// Primary button with gradient
<Pressable style={styles.button}>
  <LinearGradient
    colors={['#2E7D32', '#43A047']}
    style={styles.buttonGradient}
  >
    <ThemedText style={styles.buttonText}>Action</ThemedText>
  </LinearGradient>
</Pressable>
```

**Inputs**:
```tsx
// Styled text input
<TextInput
  style={styles.input}
  placeholder="Enter text..."
  placeholderTextColor="#9E9E9E"
  value={value}
  onChangeText={setValue}
/>

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
});
```

### Screen Layouts

**Tab Navigation**:
```
┌─────────────────────────────────────┐
│           Status Bar                │
├─────────────────────────────────────┤
│                                     │
│         Screen Content              │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  🏠    👥    📊    ⚙️    📜        │
│ Home  Cont  Stats  Sett  Hist      │
└─────────────────────────────────────┘
```

**Home Screen Layout**:
```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │     Hero Header (Gradient)      │ │
│ │  Logo | G-Press | 9001 Giorn.  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Autopilot Status (if active)   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Filtri: Categoria | Paese      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Form Comunicato Stampa         │ │
│ │  • Titolo                       │ │
│ │  • Sottotitolo                  │ │
│ │  • Contenuto (textarea)         │ │
│ │  • Immagini (max 5)             │ │
│ │  • Boilerplate                  │ │
│ │  • Contatti                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  [Invia a N Giornalisti] 📤    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Animations & Haptics

```tsx
// Haptic feedback on interactions
import * as Haptics from 'expo-haptics';

// Success feedback
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error feedback  
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Light tap feedback
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium press feedback
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

**Button press animation**:
```tsx
<Pressable
  style={({ pressed }) => [
    styles.button,
    pressed && { transform: [{ scale: 0.98 }] }
  ]}
  onPress={handlePress}
>
  {/* Content */}
</Pressable>
```

### Responsive Design

```typescript
// Screen size breakpoints
const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
};

// Usage
const isMobile = Dimensions.get('window').width < breakpoints.tablet;
const isTablet = Dimensions.get('window').width >= breakpoints.tablet 
              && Dimensions.get('window').width < breakpoints.desktop;
```

---

## 🧪 TESTING E QUALITY ASSURANCE

### Test Structure

```
tests/
├── auth.logout.test.ts          # Authentication tests
├── journalists.test.ts          # Journalist CRUD tests
├── pressReleases.test.ts        # Press release tests
├── email.test.ts                # Email sending tests
└── ai.test.ts                   # AI generation tests
```

### Unit Test Example

```typescript
// tests/auth.logout.test.ts
import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const mockCtx = createMockContext({ userId: 1 });
    const caller = appRouter.createCaller(mockCtx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(mockCtx.clearedCookies).toHaveLength(1);
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test auth.logout.test.ts

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```

### Code Quality Tools

**ESLint**:
```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint --fix
```

**Prettier**:
```bash
# Format all files
pnpm format
```

**TypeScript**:
```bash
# Type checking
pnpm check
```

---

## 🚀 DEPLOYMENT E PRODUZIONE

### Vercel Deployment

**vercel.json**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/_core/index.ts",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["server/**", "drizzle/**"]
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/_core/index.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Deployment Steps**:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Set environment variables in Vercel dashboard
# DATABASE_URL, OPENAI_API_KEY, RESEND_API_KEY, etc.

# 5. Deploy to production
vercel --prod
```

### Mobile App Distribution

**iOS (TestFlight)**:
```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

**Android (Google Play)**:
```bash
# Build for Android
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

### Environment Variables Checklist

Production deployment requires:

- ✅ `DATABASE_URL` - MySQL connection string
- ✅ `OPENAI_API_KEY` - OpenAI API key
- ✅ `RESEND_API_KEY` - Resend email API key
- ✅ `JWT_SECRET` - Session signing secret
- ✅ `VITE_APP_ID` - Manus OAuth app ID
- ✅ `OAUTH_SERVER_URL` - Manus OAuth server
- ✅ `OWNER_OPEN_ID` - Owner user ID

### Performance Optimization

**Backend**:
- ✅ Database connection pooling
- ✅ Query result caching (LRU cache)
- ✅ Rate limiting per user/IP
- ✅ Serverless function optimization (< 10MB)
- ✅ Database indexes on frequently queried columns

**Frontend**:
- ✅ Image optimization (Expo Image)
- ✅ List virtualization (FlatList)
- ✅ Memoization (useMemo, React.memo)
- ✅ Code splitting (dynamic imports)
- ✅ Bundle size optimization (Metro)

### Monitoring

**Metrics to track**:
- API response times
- Error rates
- Email delivery rates
- Database query performance
- User engagement metrics
- AI generation success rate
- Memory usage (serverless)

---

## 🔧 TROUBLESHOOTING

### Common Issues

**1. Database Connection Errors**

```bash
Error: connect ECONNREFUSED
```

**Solution**:
- Check `DATABASE_URL` format
- Verify database is accessible
- Check firewall/security groups
- Test with: `mysql -h host -u user -p`

**2. OpenAI API Rate Limits**

```bash
Error: Rate limit exceeded
```

**Solution**:
- Implement exponential backoff
- Use caching for repeated queries
- Upgrade OpenAI plan
- Reduce frequency of AI calls

**3. Email Sending Failures**

```bash
Error: Resend API error 429
```

**Solution**:
- Check Resend API limits
- Implement batch sending with delays
- Verify sender domain authentication
- Check email content for spam triggers

**4. Metro Bundler Issues**

```bash
Error: Unable to resolve module
```

**Solution**:
```bash
# Clear cache
npx expo start --clear

# Reset Metro
rm -rf node_modules/.cache
rm -rf .expo

# Reinstall
pnpm install
```

**5. iOS Build Failures**

```bash
Error: No matching provisioning profiles
```

**Solution**:
- Check Apple Developer account
- Verify bundle identifier in app.config.ts
- Regenerate provisioning profiles
- Use EAS Build for automatic provisioning

### Debug Mode

Enable verbose logging:

```typescript
// server/_core/index.ts
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    next();
  });
}
```

### Performance Profiling

```typescript
// Measure function execution time
function measureTime<T>(fn: () => T, label: string): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
  return result;
}

// Usage
const journalists = await measureTime(
  () => db.getAllJournalists(),
  'Get all journalists'
);
```

---

## 🗺️ ROADMAP E SVILUPPI FUTURI

### Q1 2025 - Italia Consolidation

- [ ] Espansione database a 15.000 giornalisti italiani
- [ ] Versione Enterprise con SLA dedicati
- [ ] Integrazione CRM (Salesforce, HubSpot)
- [ ] API pubblica per sviluppatori terzi
- [ ] Dashboard analytics avanzata

### Q2 2025 - Feature Enhancement

- [ ] Integrazione social media (LinkedIn, X/Twitter)
- [ ] A/B testing automatico subject lines
- [ ] Video attachment support
- [ ] Voice-to-text per dettatura comunicati
- [ ] Collaboration tools (team accounts)

### Q3 2025 - AI Enhancement

- [ ] Fine-tuning personalizzato per ogni cliente
- [ ] Multi-language support (EN, FR, DE, ES)
- [ ] Sentiment analysis sui feedback
- [ ] Image generation per visual content
- [ ] Voice synthesis per audio press releases

### Q4 2025 - Internationalization

- [ ] Database UK journalists (10.000+)
- [ ] Database Germany journalists (8.000+)
- [ ] Multi-currency support
- [ ] Localized UI (5 languages)
- [ ] Regional compliance (GDPR, CAN-SPAM)

### 2026 - Global Expansion

- [ ] 50.000+ giornalisti globali
- [ ] White-label solution per agenzie
- [ ] Mobile SDK per app terze
- [ ] Blockchain integration per verificabilità
- [ ] AI-generated press conferences (video)

---

## 📚 RISORSE AGGIUNTIVE

### Documentazione

- **React Native**: https://reactnative.dev/docs/getting-started
- **Expo**: https://docs.expo.dev/
- **tRPC**: https://trpc.io/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs/overview
- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **Resend**: https://resend.com/docs

### Tutorial Interni

1. **Come aggiungere un nuovo campo al database**:
   - Modifica `drizzle/schema.ts`
   - Esegui `pnpm db:push`
   - Aggiorna TypeScript types
   - Aggiorna UI form

2. **Come creare un nuovo AI agent**:
   - Definisci prompt in `server/ai-agents.ts`
   - Aggiungi al pipeline
   - Testa output quality
   - Integra nel router

3. **Come aggiungere una nuova schermata**:
   - Crea file in `app/(tabs)/newscreen.tsx`
   - Aggiungi icona in `_layout.tsx`
   - Implementa UI components
   - Connetti a tRPC API

### Community & Support

- **GitHub Issues**: https://github.com/Marcone1983/G-Press/issues
- **Email**: support@gpress.it (example)
- **Documentation**: Link to wiki or docs site

---

## 🤝 CONTRIBUTING

### Come Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri Pull Request

### Coding Standards

- **TypeScript**: Strict mode abilitato
- **Naming**: camelCase per variabili, PascalCase per componenti
- **Comments**: Spiega il "perché", non il "cosa"
- **Tests**: Aggiungi test per nuove features
- **Lint**: Esegui `pnpm lint` prima di commit

---

## 📄 LICENSE

Proprietary - All rights reserved © 2024 GROWVERSE

---

## 🎯 CONCLUSIONI

**G-Press** rappresenta una soluzione completa e all-in-one per la distribuzione intelligente di comunicati stampa, combinando:

✅ **Database Proprietario**: 9.001 giornalisti italiani verificati
✅ **AI Multi-Agente**: Sistema a 3 agenti specializzati
✅ **Tracking Completo**: Real-time analytics su ogni interazione
✅ **Automazione Avanzata**: Autopilota autonomo con trend detection
✅ **Machine Learning**: Sistema che apprende e migliora nel tempo
✅ **ROI Misurabile**: Metriche concrete per ogni campagna
✅ **Scalabilità**: Architettura serverless pronta per crescita

### Valore Unico

G-Press non è un semplice tool di email marketing, ma un **ecosistema completo** che:

1. **Sostituisce agenzie tradizionali** con tecnologia AI
2. **Garantisce risultati misurabili** con tracking granulare
3. **Apprende continuamente** dai dati di engagement
4. **Automatizza processi manuali** risparmiando tempo e costi
5. **Scala globalmente** mantenendo personalizzazione locale

### Per Sviluppatori

Questa documentazione ti fornisce tutto il necessario per:

- ✅ Configurare ambiente di sviluppo
- ✅ Comprendere l'architettura completa
- ✅ Modificare ed estendere funzionalità
- ✅ Deployare in produzione
- ✅ Mantenere e ottimizzare il sistema

### Next Steps

1. **Setup**: Segui la [Guida Setup](#guida-setup-completa)
2. **Esplora**: Studia il [Database Schema](#database-schema-completo)
3. **Sviluppa**: Comprendi il [Sistema AI](#sistema-ai-multi-agente)
4. **Deploy**: Usa la [Guida Deployment](#deployment-e-produzione)

---

**Creato con ❤️ da GROWVERSE**

*Ultima revisione: Dicembre 2024*

---

## 📞 CONTATTI

Per informazioni, partnership, o supporto tecnico:

- **Website**: [Link to website]
- **Email**: info@growverse.it (example)
- **GitHub**: https://github.com/Marcone1983/G-Press
- **LinkedIn**: [Link to company LinkedIn]

---

<div align="center">

**⭐ Se questo progetto ti è utile, lascia una stella su GitHub! ⭐**

Made with 🚀 by Manus AI & GROWVERSE Team

</div>

