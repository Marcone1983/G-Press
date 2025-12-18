/**
 * Auto Follow-Up Endpoint
 * Manages automatic follow-up email sequences
 */

export const config = {
  runtime: 'edge',
};

interface FollowUpConfig {
  pressReleaseId: string;
  recipients: string[];
  initialSubject: string;
  initialContent: string;
  sequence: {
    delayHours: number;
    subject: string;
    template: 'gentle_reminder' | 'value_add' | 'last_chance' | 'custom';
    customContent?: string;
  }[];
}

interface ScheduledFollowUp {
  id: string;
  pressReleaseId: string;
  recipientEmail: string;
  sequenceStep: number;
  scheduledTime: string;
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'cancelled' | 'opened';
}

// Follow-up email templates
const TEMPLATES = {
  gentle_reminder: {
    subject: (original: string) => `Promemoria: ${original}`,
    content: (originalContent: string) => `
Buongiorno,

Volevo assicurarmi che avesse ricevuto il comunicato stampa che le ho inviato qualche giorno fa.

Capisco che sia molto impegnato/a, ma credo che questa notizia possa essere di interesse per i suoi lettori.

Riepilogo:
${originalContent.substring(0, 500)}...

Resto a disposizione per qualsiasi informazione aggiuntiva o per organizzare un'intervista.

Cordiali saluti
    `.trim(),
  },
  
  value_add: {
    subject: (original: string) => `Nuovi dettagli: ${original}`,
    content: (originalContent: string) => `
Buongiorno,

In seguito al comunicato stampa che le ho inviato, volevo condividere alcuni dettagli aggiuntivi che potrebbero arricchire un eventuale articolo:

• Dati esclusivi disponibili su richiesta
• Possibilità di intervista con il management
• Materiale fotografico in alta risoluzione

Il comunicato originale riguardava:
${originalContent.substring(0, 300)}...

Se desidera approfondire, sono a sua completa disposizione.

Cordiali saluti
    `.trim(),
  },
  
  last_chance: {
    subject: (original: string) => `Ultima opportunità: ${original}`,
    content: (originalContent: string) => `
Buongiorno,

Le scrivo un'ultima volta riguardo al comunicato stampa inviato nei giorni scorsi.

Comprendo perfettamente se l'argomento non rientra nei suoi interessi editoriali attuali. In tal caso, la prego di ignorare questo messaggio.

Tuttavia, se fosse interessato/a a coprire questa notizia, il momento migliore sarebbe adesso, prima che diventi di dominio pubblico.

Riepilogo:
${originalContent.substring(0, 400)}...

Grazie per il suo tempo e la sua attenzione.

Cordiali saluti
    `.trim(),
  },
};

function generateFollowUpContent(
  template: keyof typeof TEMPLATES | 'custom',
  originalSubject: string,
  originalContent: string,
  customContent?: string
): { subject: string; content: string } {
  if (template === 'custom' && customContent) {
    return {
      subject: `Re: ${originalSubject}`,
      content: customContent,
    };
  }
  
  const templateData = TEMPLATES[template as keyof typeof TEMPLATES] || TEMPLATES.gentle_reminder;
  return {
    subject: templateData.subject(originalSubject),
    content: templateData.content(originalContent),
  };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'GET') {
    // Return follow-up templates
    return new Response(JSON.stringify({
      success: true,
      templates: [
        {
          id: 'gentle_reminder',
          name: 'Promemoria Gentile',
          description: 'Un promemoria cortese dopo 48 ore',
          recommendedDelay: 48,
        },
        {
          id: 'value_add',
          name: 'Valore Aggiunto',
          description: 'Offri contenuti extra dopo 72 ore',
          recommendedDelay: 72,
        },
        {
          id: 'last_chance',
          name: 'Ultima Opportunità',
          description: 'Ultimo tentativo dopo 120 ore',
          recommendedDelay: 120,
        },
        {
          id: 'custom',
          name: 'Personalizzato',
          description: 'Scrivi il tuo follow-up',
          recommendedDelay: 48,
        },
      ],
      defaultSequence: [
        { template: 'gentle_reminder', delayHours: 48 },
        { template: 'value_add', delayHours: 96 },
        { template: 'last_chance', delayHours: 168 },
      ],
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { action, config: followUpConfig, followUpId } = body;

    switch (action) {
      case 'create_sequence': {
        if (!followUpConfig) {
          return new Response(JSON.stringify({ error: 'Missing follow-up config' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { pressReleaseId, recipients, initialSubject, initialContent, sequence } = followUpConfig as FollowUpConfig;
        
        const scheduledFollowUps: ScheduledFollowUp[] = [];
        const now = new Date();

        recipients.forEach(email => {
          sequence.forEach((step, index) => {
            const scheduledTime = new Date(now.getTime() + step.delayHours * 60 * 60 * 1000);
            const { subject, content } = generateFollowUpContent(
              step.template,
              initialSubject,
              initialContent,
              step.customContent
            );

            scheduledFollowUps.push({
              id: `${pressReleaseId}-${email}-${index}`,
              pressReleaseId,
              recipientEmail: email,
              sequenceStep: index + 1,
              scheduledTime: scheduledTime.toISOString(),
              subject,
              content,
              status: 'pending',
            });
          });
        });

        return new Response(JSON.stringify({
          success: true,
          message: `Sequenza follow-up creata per ${recipients.length} destinatari`,
          scheduledFollowUps,
          summary: {
            totalEmails: scheduledFollowUps.length,
            recipients: recipients.length,
            steps: sequence.length,
            firstFollowUp: scheduledFollowUps[0]?.scheduledTime,
            lastFollowUp: scheduledFollowUps[scheduledFollowUps.length - 1]?.scheduledTime,
          },
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'cancel': {
        if (!followUpId) {
          return new Response(JSON.stringify({ error: 'Missing follow-up ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // In a real implementation, this would update the database
        return new Response(JSON.stringify({
          success: true,
          message: `Follow-up ${followUpId} cancellato`,
          cancelledId: followUpId,
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'preview': {
        const { template, originalSubject, originalContent, customContent } = body;
        
        if (!template || !originalSubject || !originalContent) {
          return new Response(JSON.stringify({ error: 'Missing preview parameters' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const preview = generateFollowUpContent(
          template,
          originalSubject,
          originalContent,
          customContent
        );

        return new Response(JSON.stringify({
          success: true,
          preview,
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

  } catch (error: any) {
    console.error('Follow-up error:', error);
    return new Response(JSON.stringify({ 
      error: 'Follow-up operation failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
