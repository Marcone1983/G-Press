import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
}

interface SendOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: EmailAttachment[];
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

const DEFAULT_FROM = process.env.EMAIL_FROM || "G-Press <noreply@gpress.app>";

/**
 * Funzione unificata per l'invio di email tramite Resend.
 * Gestisce sia l'invio singolo che l'invio multiplo (bulk).
 */
export async function sendEmailUtility(options: SendOptions): Promise<SendResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  
  const result: SendResult = {
    success: false,
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (!resendApiKey) {
    const errorMsg = "RESEND_API_KEY non configurata. Invio simulato.";
    console.warn(`[Email Utility] ${errorMsg}`);
    
    // Simulazione per sviluppo/demo
    await new Promise(resolve => setTimeout(resolve, 100));
    result.success = true;
    result.sent = recipients.length;
    return result;
  }

  // Resend gestisce automaticamente l'invio a più destinatari se 'to' è un array.
  // Tuttavia, per l'invio bulk (come in sendBulkEmails) è meglio inviare in batch.
  // Per semplicità e per coprire i casi d'uso esistenti, inviamo in batch di 50.
  
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    batches.push(recipients.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const requestBody = {
        from: options.from || DEFAULT_FROM,
        to: batch,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      };

      const response = await resend.emails.send(requestBody);

      if (response.error) {
        console.error(`[Email Utility] Errore Resend per batch di ${batch.length}:`, response.error);
        result.failed += batch.length;
        result.errors.push(response.error.message);
      } else {
        console.log(`[Email Utility] Inviato con successo a ${batch.length} destinatari. ID: ${response.data?.id}`);
        result.sent += batch.length;
      }
    } catch (error: any) {
      console.error(`[Email Utility] Errore di rete/generico per batch di ${batch.length}:`, error);
      result.failed += batch.length;
      result.errors.push(error.message || "Errore di invio sconosciuto");
    }
  }

  result.success = result.failed === 0;
  return result;
}
