/**
 * Fine-Tuning Management Endpoint
 * Manages training data collection and fine-tuning jobs for personalized AI
 */

import OpenAI from 'openai';

export const config = {
  runtime: 'edge',
};

interface TrainingExample {
  prompt: string;
  completion: string;
  metadata?: {
    format?: string;
    approved?: boolean;
    createdAt?: string;
  };
}

export default async function handler(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const openai = new OpenAI({ apiKey });

  // Handle different actions
  if (request.method === 'GET') {
    // List fine-tuning jobs
    try {
      const jobs = await openai.fineTuning.jobs.list({ limit: 10 });
      
      return new Response(JSON.stringify({
        success: true,
        jobs: jobs.data.map(job => ({
          id: job.id,
          model: job.model,
          status: job.status,
          createdAt: job.created_at,
          finishedAt: job.finished_at,
          trainedTokens: job.trained_tokens,
          fineTunedModel: job.fine_tuned_model,
        })),
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ 
        error: 'Failed to list jobs', 
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { action, examples, jobId } = body;

    switch (action) {
      case 'prepare_training_data': {
        // Convert examples to JSONL format for fine-tuning
        if (!examples || !Array.isArray(examples) || examples.length < 10) {
          return new Response(JSON.stringify({ 
            error: 'Servono almeno 10 esempi per il fine-tuning' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Format for chat fine-tuning
        const trainingData = examples.map((ex: TrainingExample) => ({
          messages: [
            {
              role: 'system',
              content: 'Sei un giornalista professionista che scrive articoli imparziali e di alta qualità.',
            },
            {
              role: 'user',
              content: ex.prompt,
            },
            {
              role: 'assistant',
              content: ex.completion,
            },
          ],
        }));

        // Convert to JSONL
        const jsonl = trainingData.map(item => JSON.stringify(item)).join('\n');

        return new Response(JSON.stringify({
          success: true,
          trainingData: jsonl,
          exampleCount: examples.length,
          estimatedCost: `$${(examples.length * 0.008).toFixed(2)} - $${(examples.length * 0.03).toFixed(2)}`,
          instructions: [
            '1. Salva questo file come training_data.jsonl',
            '2. Caricalo su OpenAI con il pulsante "Start Fine-Tuning"',
            '3. Il training richiede circa 10-30 minuti',
            '4. Una volta completato, il modello sarà disponibile per la generazione',
          ],
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'start_fine_tuning': {
        // Start a fine-tuning job
        const { trainingFileId, modelName } = body;
        
        if (!trainingFileId) {
          return new Response(JSON.stringify({ 
            error: 'Training file ID required' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const job = await openai.fineTuning.jobs.create({
          training_file: trainingFileId,
          model: 'gpt-4o-mini-2024-07-18',
          suffix: modelName || 'gpress-custom',
        });

        return new Response(JSON.stringify({
          success: true,
          job: {
            id: job.id,
            status: job.status,
            model: job.model,
          },
          message: 'Fine-tuning avviato! Riceverai una notifica quando sarà completato.',
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'check_status': {
        // Check fine-tuning job status
        if (!jobId) {
          return new Response(JSON.stringify({ error: 'Job ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const job = await openai.fineTuning.jobs.retrieve(jobId);
        const events = await openai.fineTuning.jobs.listEvents(jobId, { limit: 10 });

        return new Response(JSON.stringify({
          success: true,
          job: {
            id: job.id,
            status: job.status,
            model: job.model,
            fineTunedModel: job.fine_tuned_model,
            createdAt: job.created_at,
            finishedAt: job.finished_at,
            trainedTokens: job.trained_tokens,
            error: job.error,
          },
          events: events.data.map(e => ({
            message: e.message,
            createdAt: e.created_at,
            level: e.level,
          })),
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'upload_training_file': {
        // Upload training file to OpenAI
        const { jsonlContent } = body;
        
        if (!jsonlContent) {
          return new Response(JSON.stringify({ error: 'JSONL content required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Create a file from the JSONL content
        const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
        const file = new File([blob], 'training_data.jsonl', { type: 'application/jsonl' });

        const uploadedFile = await openai.files.create({
          file: file,
          purpose: 'fine-tune',
        });

        return new Response(JSON.stringify({
          success: true,
          file: {
            id: uploadedFile.id,
            filename: uploadedFile.filename,
            bytes: uploadedFile.bytes,
            status: uploadedFile.status,
          },
          message: 'File caricato! Ora puoi avviare il fine-tuning.',
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'list_models': {
        // List available fine-tuned models
        const models = await openai.models.list();
        const fineTunedModels = models.data.filter(m => 
          m.id.includes('ft:') || m.id.includes('gpress')
        );

        return new Response(JSON.stringify({
          success: true,
          models: fineTunedModels.map(m => ({
            id: m.id,
            created: m.created,
            ownedBy: m.owned_by,
          })),
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
    console.error('Fine-tuning error:', error);
    return new Response(JSON.stringify({ 
      error: 'Operation failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
