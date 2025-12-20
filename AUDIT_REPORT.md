# G-Press Enterprise Audit Report

**Data**: 20 Dicembre 2024  
**Auditor**: Senior Enterprise Architect  
**Versione**: 4f860c88  
**Linee di codice totali**: 14,076

---

## EXECUTIVE SUMMARY

G-Press è un'applicazione mobile per la distribuzione di comunicati stampa con 9,001 giornalisti nel database. L'architettura è solida ma presenta **vulnerabilità di sicurezza critiche** e **funzionalità disconnesse** che richiedono intervento immediato.

**Rischio complessivo**: 🔴 ALTO

---

## 1. PROBLEMI CRITICI (P0) - DA CORREGGERE IMMEDIATAMENTE

### 1.1 🔴 VULNERABILITÀ SICUREZZA: Endpoint pubblici sensibili

**File**: `server/routers.ts`

| Endpoint | Problema | Rischio |
|----------|----------|---------|
| `email.send` (L333) | `publicProcedure` - Chiunque può inviare email | CRITICO - Spam/Abuse |
| `autonomousAutopilot.runCycle` (L463) | `publicProcedure` - Chiunque può triggerare autopilota | CRITICO - DoS |
| `autonomousAutopilot.getStatus` (L468) | `publicProcedure` - Espone stato interno | MEDIO |
| `trends.detect` (L505) | `publicProcedure` - Consuma API esterne | MEDIO |
| `journalists.list` (L31) | `publicProcedure` - Espone 9000 email | CRITICO - Data leak |

**FIX RICHIESTO**: Convertire tutti in `protectedProcedure` o aggiungere API key validation.

### 1.2 🔴 WEBHOOK RESEND SENZA VERIFICA FIRMA

**File**: `api/webhooks/resend.ts`

```typescript
// PROBLEMA: Nessuna verifica del signing secret
export default async function handler(req: any, res: any) {
  const event = req.body as ResendWebhookEvent; // ← Accetta qualsiasi payload!
```

**FIX RICHIESTO**: Implementare verifica HMAC con `RESEND_WEBHOOK_SECRET`.

### 1.3 🔴 KNOWLEDGE BASE NON PERSISTENTE

**File**: `server/autopilot-system.ts` (L74-85)

```typescript
async function getKnowledgeBaseDocuments(): Promise<KnowledgeDocument[]> {
  // TODO: Implementare storage server-side per i documenti
  return []; // ← RITORNA SEMPRE VUOTO!
}
```

**IMPATTO**: L'autopilota non può MAI generare articoli perché non ha accesso ai documenti.

---

## 2. PROBLEMI MAGGIORI (P1) - DA CORREGGERE ENTRO 1 SETTIMANA

### 2.1 🟠 CRON JOB AUTOPILOTA NON FUNZIONANTE

**File**: `server/routers.ts` (L417-420)

```typescript
processHourlyBatch: publicProcedure.mutation(async () => {
  // This will be called by cron, processes all active autopilot campaigns
  return { processed: true, timestamp: new Date().toISOString() };
  // ← NON FA NULLA! Solo return statico
});
```

**FIX RICHIESTO**: Implementare logica reale che chiama `autopilotSystem.runAutopilotCycle()`.

### 2.2 🟠 DUPLICAZIONE CODICE EMAIL

Esistono 3 sistemi di invio email non coordinati:
1. `server/email.ts` - `sendPressRelease()` e `sendBulkEmails()`
2. `lib/email-service.ts` - `sendEmailsWithAttachments()`
3. `server/follow-up.ts` - `sendFollowUpEmail()`

**FIX RICHIESTO**: Consolidare in un unico servizio email.

### 2.3 🟠 STATO AUTOPILOTA IN MEMORIA

**File**: `server/autopilot-system.ts` (L323-334)

```typescript
let autopilotState: AutopilotStatus = {
  active: false,
  // ...
};
```

**PROBLEMA**: Lo stato si perde ad ogni restart del server Vercel (serverless).

**FIX RICHIESTO**: Persistere stato in database.

### 2.4 🟠 MANCANZA RATE LIMITING

Nessun rate limiting su:
- Invio email (può inviare migliaia di email in loop)
- Chiamate AI (può consumare tutto il budget OpenAI)
- Trend detection (può abusare API esterne)

---

## 3. PROBLEMI MINORI (P2) - DA CORREGGERE ENTRO 1 MESE

### 3.1 🟡 FILE TROPPO GRANDI

| File | Linee | Problema |
|------|-------|----------|
| `index.tsx` | 1,826 | Troppa logica in un componente |
| `contacts.tsx` | 1,365 | Dovrebbe essere splittato |
| `ai-tools.tsx` | 1,141 | Manca separazione concerns |

### 3.2 🟡 TIPI ANY DIFFUSI

```bash
$ grep -r ": any" server/*.ts | wc -l
23
```

23 occorrenze di `: any` nel codice server - riduce type safety.

### 3.3 🟡 CONSOLE.LOG IN PRODUZIONE

```bash
$ grep -r "console.log\|console.error" server/*.ts | wc -l
67
```

67 console.log/error - dovrebbero usare un logger strutturato.

### 3.4 🟡 MANCANZA ERROR BOUNDARIES

Nessun error boundary nei componenti React - crash non gestiti.

---

## 4. ARCHITETTURA - CONNESSIONI MANCANTI

```
┌─────────────────────────────────────────────────────────────────┐
│                        G-PRESS ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   MOBILE     │────▶│   tRPC API   │────▶│   DATABASE   │    │
│  │     APP      │     │              │     │   (MySQL)    │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                    │                    ▲             │
│         │                    │                    │             │
│         ▼                    ▼                    │             │
│  ┌──────────────┐     ┌──────────────┐           │             │
│  │ AsyncStorage │     │   RESEND     │           │             │
│  │  (locale)    │     │   (email)    │           │             │
│  └──────────────┘     └──────────────┘           │             │
│         │                    │                    │             │
│         │ ❌ NON SINCRONIZZATO                   │             │
│         ▼                    ▼                    │             │
│  ┌──────────────┐     ┌──────────────┐           │             │
│  │  Knowledge   │     │   Webhook    │───────────┘             │
│  │    Base      │     │   Handler    │                         │
│  │ (DISCONNESSO)│     │              │                         │
│  └──────────────┘     └──────────────┘                         │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐                         │
│  │  AUTOPILOT   │────▶│   OpenAI     │                         │
│  │   SYSTEM     │     │   (GPT-4o)   │                         │
│  │ (STATO PERSO)│     │              │                         │
│  └──────────────┘     └──────────────┘                         │
│                                                                  │
│  ┌──────────────┐                                               │
│  │    CRON      │                                               │
│  │   (VUOTO)    │ ❌ NON IMPLEMENTATO                          │
│  └──────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

LEGENDA:
✅ Funzionante
❌ Non funzionante / Disconnesso
⚠️ Parzialmente funzionante
```

---

## 5. PIANO DI AZIONE PRIORITIZZATO

### FASE 1 - SICUREZZA (Oggi)
1. ✅ Proteggere endpoint `email.send` con autenticazione
2. ✅ Proteggere endpoint `autonomousAutopilot.*`
3. ✅ Proteggere endpoint `journalists.list` (dati sensibili)
4. ✅ Implementare verifica firma webhook Resend
5. ✅ Aggiungere rate limiting base

### FASE 2 - CONNESSIONI (Domani)
1. ✅ Sincronizzare Knowledge Base con database server
2. ✅ Implementare logica reale nel cron job
3. ✅ Persistere stato autopilota in database
4. ✅ Consolidare servizi email

### FASE 3 - QUALITÀ (Settimana prossima)
1. Rimuovere tipi `any`
2. Implementare logger strutturato
3. Aggiungere error boundaries
4. Splittare componenti grandi

---

## 6. METRICHE ATTUALI

| Metrica | Valore | Target Enterprise |
|---------|--------|-------------------|
| Copertura test | ~10% | >80% |
| Endpoint protetti | 60% | 100% |
| Tipi any | 23 | 0 |
| Console.log | 67 | 0 (usa logger) |
| File >500 linee | 7 | 0 |
| Vulnerabilità critiche | 5 | 0 |

---

## 7. CONCLUSIONI

G-Press ha una buona base funzionale ma **non è pronto per produzione enterprise** a causa di:

1. **Vulnerabilità di sicurezza critiche** che espongono dati e permettono abuse
2. **Funzionalità disconnesse** che non comunicano tra loro
3. **Stato non persistente** che si perde ad ogni deploy

**Raccomandazione**: Implementare FASE 1 (sicurezza) immediatamente prima di qualsiasi altro sviluppo.

---

*Report generato automaticamente durante audit Enterprise*
