# G-Press - TODOLIST FEATURE COMPLETE

## 🚨 PRIORITÀ CRITICA - AUTOPILOTA AUTONOMO

### 1. Sistema Autopilota Completamente Autonomo
- [ ] **Cron Job ogni ora** - Controllo automatico trend senza intervento utente
- [ ] **Trend Detection** - API per rilevare trend del momento (Google Trends, News API, social)
- [ ] **Generazione automatica articoli** - Basata sui trend rilevati, NON su input utente
- [ ] **Sistema di approvazione** - Notifica push/email al proprietario per approvare prima dell'invio
- [ ] **Invio automatico dopo approvazione** - 1286 email/giorno per 7 giorni = 9000 giornalisti
- [ ] **Dashboard autopilota** - Mostra stato, trend rilevati, articoli in attesa approvazione

### 2. Sistema Multi-Agente AI (3 Agenti)
- [ ] **Agente Ricercatore** - Cerca trend, raccoglie dati, analizza fonti dalla Knowledge Base
- [ ] **Agente Writer** - Scrive articolo basato sui dati del Ricercatore
- [ ] **Agente Capo Redazione** - Controlla qualità, identifica punti deboli, suggerisce miglioramenti
- [ ] **Orchestrazione automatica** - I 3 agenti devono collaborare senza intervento umano
- [ ] **Pipeline completa** - Ricercatore → Writer → Capo Redazione → Approvazione utente → Invio

### 3. Ranking Giornalisti
- [ ] **Score engagement** - Calcolo basato su aperture, click, risposte
- [ ] **Priorità invio** - I giornalisti con score alto ricevono email prima
- [ ] **Aggiornamento automatico** - Score si aggiorna dopo ogni campagna
- [ ] **Visualizzazione ranking** - Lista giornalisti ordinata per engagement
- [ ] **Segmentazione intelligente** - Gruppi A/B/C basati su performance

### 4. Learning e Miglioramento Continuo
- [ ] **Apprendimento giornaliero** - Analisi aperture, click, bounce ogni giorno
- [ ] **Orari ottimali per paese** - Impara quando inviare per ogni timezone
- [ ] **Ottimizzazione subject** - Impara quali oggetti funzionano meglio
- [ ] **Ottimizzazione contenuto** - Impara quali stili/toni generano più engagement
- [ ] **Report settimanale** - Statistiche di miglioramento nel tempo

### 5. Trend Detection e Contenuti
- [ ] **Integrazione Google Trends** - Rilevamento trend in tempo reale
- [ ] **Analisi News API** - Cosa sta succedendo nel settore
- [ ] **Utilizzo Knowledge Base** - Articoli basati SOLO su documenti caricati, non inventati
- [ ] **Fact-checking automatico** - Verifica fatti prima di generare articolo
- [ ] **Personalizzazione per categoria** - Trend diversi per Crypto, Tech, Finance, etc.

---

## 📊 STATO ATTUALE

| Feature | Stato | Note |
|---------|-------|------|
| Autopilota Autonomo | ❌ MANCANTE | Solo bottone manuale che appare dopo input utente |
| Multi-Agente AI | ⚠️ PARZIALE | Codice esiste ma non integrato nel flusso automatico |
| Ranking Giornalisti | ❌ MANCANTE | Non implementato |
| Learning | ⚠️ PARZIALE | Tracking eventi esiste, ma non learning |
| Trend Detection | ❌ MANCANTE | Non implementato |
| Invio Email | ✅ FATTO | Funziona con Resend API |
| Knowledge Base | ✅ FATTO | Caricamento documenti funziona |

---

## 🎯 ORDINE DI IMPLEMENTAZIONE

1. **Trend Detection API** - Base per tutto il resto
2. **Cron Job Autopilota** - Controllo automatico ogni ora
3. **Pipeline Multi-Agente** - Ricercatore → Writer → Editor
4. **Sistema Approvazione** - Notifica + UI per approvare
5. **Ranking Giornalisti** - Score e priorità
6. **Learning System** - Miglioramento continuo

---

## ⏱️ STIMA TEMPO

- Trend Detection: 2-3 ore
- Cron Job + Autopilota: 2-3 ore
- Multi-Agente Pipeline: 3-4 ore
- Sistema Approvazione: 2 ore
- Ranking Giornalisti: 2 ore
- Learning System: 3-4 ore

**TOTALE: ~15-18 ore di sviluppo**
