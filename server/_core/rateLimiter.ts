import { LRUCache } from "lru-cache";

// Configurazione del Rate Limiter: 100 richieste per utente ogni 60 secondi
const MAX_REQUESTS = 100;
const WINDOW_MS = 60 * 1000; // 1 minuto

// Cache per memorizzare il conteggio delle richieste per ogni utente (userId)
// max: numero massimo di elementi nella cache
// ttl: tempo di vita (Time To Live) in millisecondi per ogni elemento
const requestCounts = new LRUCache<number, number>({
  max: 500, // Supporta fino a 500 utenti attivi nella finestra di tempo
  ttl: WINDOW_MS,
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnSet: true,
});

export const rateLimiter = {
  /**
   * Controlla se l'utente ha superato il limite di richieste.
   * @param userId ID dell'utente.
   * @returns true se l'utente è autorizzato, false altrimenti.
   */
  async check(userId: number): Promise<boolean> {
    const currentCount = requestCounts.get(userId) || 0;

    if (currentCount >= MAX_REQUESTS) {
      return false;
    }

    // Incrementa il conteggio e lo salva nella cache
    requestCounts.set(userId, currentCount + 1);
    
    return true;
  },
};
