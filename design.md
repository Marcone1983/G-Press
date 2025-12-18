# G-Press - Mobile App Design

## Concept
App mobile essenziale per la distribuzione di comunicati stampa. L'utente carica un articolo e l'app lo invia automaticamente a tutti i contatti giornalistici salvati.

---

## Screen List

### 1. Home (Schermata Principale)
La schermata principale dove l'utente può creare e inviare un nuovo comunicato stampa.

### 2. Contatti
Lista dei contatti giornalistici/testate a cui verranno inviati gli articoli.

### 3. Storico
Archivio dei comunicati stampa inviati in precedenza.

---

## Primary Content and Functionality

### Home Screen
- **Form di creazione articolo:**
  - Campo titolo (obbligatorio)
  - Campo corpo dell'articolo (textarea multilinea)
  - Pulsante "Invia a Tutti" in posizione prominente
- **Contatore contatti:** Mostra quanti destinatari riceveranno l'articolo
- **Feedback invio:** Conferma visiva dopo l'invio

### Contatti Screen
- **Lista contatti:** FlatList con nome, email, testata
- **Pulsante aggiungi:** FAB o header button per aggiungere nuovo contatto
- **Form aggiunta contatto:**
  - Nome
  - Email
  - Testata/Outlet (opzionale)
- **Azioni su contatto:** Swipe per eliminare

### Storico Screen
- **Lista articoli inviati:** Data, titolo, numero destinatari
- **Dettaglio articolo:** Tap per vedere il contenuto completo

---

## Key User Flows

### Flow 1: Invio Articolo (Principale)
1. Utente apre l'app → Home Screen
2. Inserisce titolo dell'articolo
3. Inserisce corpo dell'articolo
4. Tap su "Invia a Tutti"
5. Conferma invio → Articolo inviato a tutti i contatti
6. Feedback di successo con numero di destinatari

### Flow 2: Gestione Contatti
1. Utente tap su tab "Contatti"
2. Visualizza lista contatti esistenti
3. Tap "+" per aggiungere
4. Compila form (nome, email, testata)
5. Salva → Contatto aggiunto alla lista

### Flow 3: Consultazione Storico
1. Utente tap su tab "Storico"
2. Visualizza lista articoli inviati
3. Tap su articolo → Dettaglio con contenuto completo

---

## Color Choices

| Elemento | Colore | Hex |
|----------|--------|-----|
| Primary/Accent | Blu Professionale | #1E88E5 |
| Primary Dark | Blu Scuro | #1565C0 |
| Success | Verde | #43A047 |
| Text Primary | Nero/Grigio Scuro | #212121 |
| Text Secondary | Grigio | #757575 |
| Background | Bianco | #FFFFFF |
| Card/Surface | Grigio Chiaro | #F5F5F5 |
| Danger/Delete | Rosso | #E53935 |

---

## Typography

| Tipo | Size | Weight | Uso |
|------|------|--------|-----|
| Title | 28pt | Bold | Titoli schermata |
| Subtitle | 20pt | SemiBold | Sezioni |
| Body | 16pt | Regular | Testo principale |
| Caption | 14pt | Regular | Info secondarie |
| Button | 16pt | SemiBold | Pulsanti |

---

## Layout Specifications

- **Tab Bar:** 3 tab in basso (Home, Contatti, Storico)
- **Safe Areas:** Rispettate su tutti i dispositivi
- **Touch Targets:** Minimo 44pt
- **Spacing:** Grid 8pt (8, 16, 24, 32)
- **Border Radius:** Cards 12pt, Buttons 8pt, Input 8pt

---

## Components

### Input Field
- Border: 1pt grigio chiaro
- Border radius: 8pt
- Padding: 12pt
- Focus state: Border blu primary

### Primary Button
- Background: Primary blue (#1E88E5)
- Text: Bianco, 16pt semibold
- Padding: 16pt vertical, 24pt horizontal
- Border radius: 8pt
- Full width su mobile

### Contact Card
- Background: Surface (#F5F5F5)
- Padding: 16pt
- Border radius: 12pt
- Shadow: Leggera

### Article Card (Storico)
- Titolo in bold
- Data in caption style
- Numero destinatari badge
