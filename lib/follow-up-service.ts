/**
 * Auto-Follow-Up Service for G-Press
 * Manages automatic follow-up email sequences when journalists don't open
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gpress_followup_sequences';

export interface FollowUpStep {
  id: string;
  delayHours: number; // Hours after previous step
  subject: string;
  template: string;
  sent: boolean;
  sentAt?: string;
  opened?: boolean;
}

export interface FollowUpSequence {
  id: string;
  originalEmailId: string;
  recipientEmail: string;
  recipientName: string;
  articleTitle: string;
  steps: FollowUpStep[];
  status: 'active' | 'completed' | 'stopped';
  createdAt: string;
  stoppedReason?: 'opened' | 'manual' | 'completed' | 'bounced';
}

export interface FollowUpConfig {
  enabled: boolean;
  steps: {
    delayHours: number;
    subjectPrefix: string;
    template: string;
  }[];
}

// Default follow-up configuration
export const DEFAULT_FOLLOWUP_CONFIG: FollowUpConfig = {
  enabled: true,
  steps: [
    {
      delayHours: 24,
      subjectPrefix: 'Promemoria: ',
      template: `Gentile {{name}},

Le scrivo per un cortese promemoria riguardo al comunicato stampa che Le ho inviato ieri.

{{original_subject}}

Resto a disposizione per qualsiasi informazione aggiuntiva.

Cordiali saluti`,
    },
    {
      delayHours: 48,
      subjectPrefix: 'Seguito: ',
      template: `Gentile {{name}},

Mi permetto di ricontattarLa in merito al comunicato stampa inviato alcuni giorni fa.

Se desidera approfondire l'argomento o organizzare un'intervista, sono a completa disposizione.

{{original_subject}}

Cordiali saluti`,
    },
    {
      delayHours: 72,
      subjectPrefix: 'Ultimo promemoria: ',
      template: `Gentile {{name}},

Questo è l'ultimo promemoria riguardo al comunicato stampa che Le ho inviato.

Se l'argomento non è di Suo interesse, La prego di ignorare questo messaggio.

{{original_subject}}

Grazie per l'attenzione.
Cordiali saluti`,
    },
  ],
};

/**
 * Load all follow-up sequences from storage
 */
export async function loadFollowUpSequences(): Promise<FollowUpSequence[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[FollowUp] Error loading sequences:', error);
    return [];
  }
}

/**
 * Save follow-up sequences to storage
 */
export async function saveFollowUpSequences(sequences: FollowUpSequence[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sequences));
  } catch (error) {
    console.error('[FollowUp] Error saving sequences:', error);
  }
}

/**
 * Create a new follow-up sequence for an email
 */
export async function createFollowUpSequence(params: {
  originalEmailId: string;
  recipientEmail: string;
  recipientName: string;
  articleTitle: string;
  config?: FollowUpConfig;
}): Promise<FollowUpSequence> {
  const config = params.config || DEFAULT_FOLLOWUP_CONFIG;
  
  const sequence: FollowUpSequence = {
    id: `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalEmailId: params.originalEmailId,
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    articleTitle: params.articleTitle,
    status: 'active',
    createdAt: new Date().toISOString(),
    steps: config.steps.map((step, index) => ({
      id: `step_${index + 1}`,
      delayHours: step.delayHours,
      subject: step.subjectPrefix + params.articleTitle,
      template: step.template
        .replace(/\{\{name\}\}/g, params.recipientName)
        .replace(/\{\{original_subject\}\}/g, params.articleTitle),
      sent: false,
    })),
  };

  const sequences = await loadFollowUpSequences();
  sequences.push(sequence);
  await saveFollowUpSequences(sequences);

  return sequence;
}

/**
 * Stop a follow-up sequence (e.g., when email is opened)
 */
export async function stopFollowUpSequence(
  sequenceId: string,
  reason: 'opened' | 'manual' | 'completed' | 'bounced'
): Promise<void> {
  const sequences = await loadFollowUpSequences();
  const index = sequences.findIndex(s => s.id === sequenceId);
  
  if (index !== -1) {
    sequences[index].status = 'stopped';
    sequences[index].stoppedReason = reason;
    await saveFollowUpSequences(sequences);
  }
}

/**
 * Stop all sequences for a specific email
 */
export async function stopSequencesByEmail(recipientEmail: string, reason: 'opened' | 'manual' | 'bounced'): Promise<void> {
  const sequences = await loadFollowUpSequences();
  let updated = false;
  
  sequences.forEach(seq => {
    if (seq.recipientEmail === recipientEmail && seq.status === 'active') {
      seq.status = 'stopped';
      seq.stoppedReason = reason;
      updated = true;
    }
  });
  
  if (updated) {
    await saveFollowUpSequences(sequences);
  }
}

/**
 * Get pending follow-ups that should be sent now
 */
export async function getPendingFollowUps(): Promise<{
  sequence: FollowUpSequence;
  step: FollowUpStep;
}[]> {
  const sequences = await loadFollowUpSequences();
  const now = new Date();
  const pending: { sequence: FollowUpSequence; step: FollowUpStep }[] = [];

  for (const sequence of sequences) {
    if (sequence.status !== 'active') continue;

    // Find the next unsent step
    const lastSentIndex = sequence.steps.findLastIndex(s => s.sent);
    const nextStep = sequence.steps[lastSentIndex + 1];
    
    if (!nextStep) {
      // All steps sent, mark as completed
      sequence.status = 'completed';
      sequence.stoppedReason = 'completed';
      continue;
    }

    // Calculate when this step should be sent
    const baseTime = lastSentIndex === -1 
      ? new Date(sequence.createdAt)
      : new Date(sequence.steps[lastSentIndex].sentAt!);
    
    const sendTime = new Date(baseTime.getTime() + nextStep.delayHours * 60 * 60 * 1000);
    
    if (now >= sendTime) {
      pending.push({ sequence, step: nextStep });
    }
  }

  // Save any status updates
  await saveFollowUpSequences(sequences);

  return pending;
}

/**
 * Mark a follow-up step as sent
 */
export async function markStepAsSent(sequenceId: string, stepId: string): Promise<void> {
  const sequences = await loadFollowUpSequences();
  const sequence = sequences.find(s => s.id === sequenceId);
  
  if (sequence) {
    const step = sequence.steps.find(s => s.id === stepId);
    if (step) {
      step.sent = true;
      step.sentAt = new Date().toISOString();
      await saveFollowUpSequences(sequences);
    }
  }
}

/**
 * Get follow-up statistics
 */
export async function getFollowUpStats(): Promise<{
  totalSequences: number;
  activeSequences: number;
  completedSequences: number;
  stoppedByOpen: number;
  totalFollowUpsSent: number;
}> {
  const sequences = await loadFollowUpSequences();
  
  return {
    totalSequences: sequences.length,
    activeSequences: sequences.filter(s => s.status === 'active').length,
    completedSequences: sequences.filter(s => s.stoppedReason === 'completed').length,
    stoppedByOpen: sequences.filter(s => s.stoppedReason === 'opened').length,
    totalFollowUpsSent: sequences.reduce(
      (sum, seq) => sum + seq.steps.filter(s => s.sent).length,
      0
    ),
  };
}

/**
 * Load follow-up configuration
 */
export async function loadFollowUpConfig(): Promise<FollowUpConfig> {
  try {
    const data = await AsyncStorage.getItem('gpress_followup_config');
    return data ? JSON.parse(data) : DEFAULT_FOLLOWUP_CONFIG;
  } catch (error) {
    return DEFAULT_FOLLOWUP_CONFIG;
  }
}

/**
 * Save follow-up configuration
 */
export async function saveFollowUpConfig(config: FollowUpConfig): Promise<void> {
  await AsyncStorage.setItem('gpress_followup_config', JSON.stringify(config));
}
