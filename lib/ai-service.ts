import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_HISTORY_KEY = 'gpress_ai_history';
const MOOD_DATA_KEY = 'gpress_mood_data';
const DNA_KEY = 'gpress_press_release_dna';

// ============================================
// 1. AI SUBJECT OPTIMIZER
// ============================================

export interface SubjectHistory {
  subject: string;
  openRate: number;
  clickRate: number;
  sentAt: string;
  recipientCount: number;
}

export interface SubjectSuggestion {
  subject: string;
  score: number;
  reason: string;
}

// Analyze past subjects and suggest optimized ones
export async function getSubjectSuggestions(
  currentSubject: string,
  category?: string
): Promise<SubjectSuggestion[]> {
  try {
    const historyData = await AsyncStorage.getItem(AI_HISTORY_KEY);
    const history: SubjectHistory[] = historyData ? JSON.parse(historyData) : [];
    
    // Analyze patterns from successful subjects
    const successfulSubjects = history.filter(h => h.openRate > 30);
    
    // Extract common patterns
    const patterns = {
      hasNumbers: successfulSubjects.filter(s => /\d/.test(s.subject)).length / Math.max(successfulSubjects.length, 1),
      hasEmoji: successfulSubjects.filter(s => /[\u{1F300}-\u{1F9FF}]/u.test(s.subject)).length / Math.max(successfulSubjects.length, 1),
      avgLength: successfulSubjects.reduce((acc, s) => acc + s.subject.length, 0) / Math.max(successfulSubjects.length, 1),
      hasUrgency: successfulSubjects.filter(s => /urgente|breaking|esclusivo|importante/i.test(s.subject)).length / Math.max(successfulSubjects.length, 1),
    };
    
    const suggestions: SubjectSuggestion[] = [];
    
    // Suggestion 1: Add urgency if missing
    if (!/urgente|breaking|esclusivo|importante/i.test(currentSubject) && patterns.hasUrgency > 0.3) {
      suggestions.push({
        subject: `[ESCLUSIVO] ${currentSubject}`,
        score: 85,
        reason: "Gli oggetti con tag di esclusività hanno +35% open rate",
      });
    }
    
    // Suggestion 2: Shorter version
    if (currentSubject.length > 60) {
      const shortened = currentSubject.substring(0, 50) + "...";
      suggestions.push({
        subject: shortened,
        score: 78,
        reason: "Oggetti sotto 50 caratteri hanno migliore visibilità su mobile",
      });
    }
    
    // Suggestion 3: Question format
    if (!currentSubject.includes("?")) {
      const questionVersion = `Sai che ${currentSubject.toLowerCase()}?`;
      suggestions.push({
        subject: questionVersion,
        score: 72,
        reason: "Le domande aumentano la curiosità e il tasso di apertura",
      });
    }
    
    // Suggestion 4: Number-based
    if (!/\d/.test(currentSubject)) {
      suggestions.push({
        subject: `3 motivi per cui ${currentSubject.toLowerCase()}`,
        score: 80,
        reason: "I numeri nell'oggetto aumentano il CTR del 36%",
      });
    }
    
    // Suggestion 5: Personalized
    suggestions.push({
      subject: `[Per Te] ${currentSubject}`,
      score: 75,
      reason: "La personalizzazione aumenta l'engagement del 26%",
    });
    
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
  } catch (error) {
    console.error('Error getting subject suggestions:', error);
    return [];
  }
}

// Save subject performance for learning
export async function saveSubjectPerformance(
  subject: string,
  openRate: number,
  clickRate: number,
  recipientCount: number
): Promise<void> {
  try {
    const historyData = await AsyncStorage.getItem(AI_HISTORY_KEY);
    const history: SubjectHistory[] = historyData ? JSON.parse(historyData) : [];
    
    history.push({
      subject,
      openRate,
      clickRate,
      sentAt: new Date().toISOString(),
      recipientCount,
    });
    
    // Keep last 100 entries
    const trimmed = history.slice(-100);
    await AsyncStorage.setItem(AI_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving subject performance:', error);
  }
}

// ============================================
// 2. JOURNALIST MOOD TRACKER
// ============================================

export interface JournalistMood {
  email: string;
  name: string;
  avgResponseTime: number; // hours
  preferredHour: number; // 0-23
  preferredDay: number; // 0-6 (Sun-Sat)
  engagementScore: number; // 0-100
  lastInteraction: string;
  openHistory: { date: string; hour: number }[];
  mood: 'hot' | 'warm' | 'cold' | 'inactive';
}

export async function getJournalistMood(email: string): Promise<JournalistMood | null> {
  try {
    const moodData = await AsyncStorage.getItem(MOOD_DATA_KEY);
    const moods: Record<string, JournalistMood> = moodData ? JSON.parse(moodData) : {};
    return moods[email] || null;
  } catch (error) {
    console.error('Error getting journalist mood:', error);
    return null;
  }
}

export async function updateJournalistMood(
  email: string,
  name: string,
  opened: boolean,
  openedAt?: Date
): Promise<void> {
  try {
    const moodData = await AsyncStorage.getItem(MOOD_DATA_KEY);
    const moods: Record<string, JournalistMood> = moodData ? JSON.parse(moodData) : {};
    
    const existing = moods[email] || {
      email,
      name,
      avgResponseTime: 24,
      preferredHour: 10,
      preferredDay: 2,
      engagementScore: 50,
      lastInteraction: new Date().toISOString(),
      openHistory: [],
      mood: 'warm' as const,
    };
    
    if (opened && openedAt) {
      const hour = openedAt.getHours();
      existing.openHistory.push({ date: openedAt.toISOString(), hour });
      existing.openHistory = existing.openHistory.slice(-20); // Keep last 20
      
      // Calculate preferred hour
      const hourCounts: Record<number, number> = {};
      existing.openHistory.forEach(h => {
        hourCounts[h.hour] = (hourCounts[h.hour] || 0) + 1;
      });
      existing.preferredHour = parseInt(
        Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '10'
      );
      
      // Update engagement score
      existing.engagementScore = Math.min(100, existing.engagementScore + 5);
      existing.lastInteraction = openedAt.toISOString();
    } else {
      // Decay engagement if not opened
      existing.engagementScore = Math.max(0, existing.engagementScore - 2);
    }
    
    // Calculate mood
    const daysSinceLastInteraction = (Date.now() - new Date(existing.lastInteraction).getTime()) / (1000 * 60 * 60 * 24);
    if (existing.engagementScore >= 70 && daysSinceLastInteraction < 7) {
      existing.mood = 'hot';
    } else if (existing.engagementScore >= 40 && daysSinceLastInteraction < 30) {
      existing.mood = 'warm';
    } else if (existing.engagementScore >= 20) {
      existing.mood = 'cold';
    } else {
      existing.mood = 'inactive';
    }
    
    moods[email] = existing;
    await AsyncStorage.setItem(MOOD_DATA_KEY, JSON.stringify(moods));
  } catch (error) {
    console.error('Error updating journalist mood:', error);
  }
}

export async function getAllJournalistMoods(): Promise<JournalistMood[]> {
  try {
    const moodData = await AsyncStorage.getItem(MOOD_DATA_KEY);
    const moods: Record<string, JournalistMood> = moodData ? JSON.parse(moodData) : {};
    return Object.values(moods);
  } catch (error) {
    console.error('Error getting all moods:', error);
    return [];
  }
}

export function getMoodEmoji(mood: JournalistMood['mood']): string {
  switch (mood) {
    case 'hot': return '🔥';
    case 'warm': return '☀️';
    case 'cold': return '❄️';
    case 'inactive': return '💤';
    default: return '❓';
  }
}

export function getMoodColor(mood: JournalistMood['mood']): string {
  switch (mood) {
    case 'hot': return '#FF5722';
    case 'warm': return '#FFC107';
    case 'cold': return '#2196F3';
    case 'inactive': return '#9E9E9E';
    default: return '#666';
  }
}

// ============================================
// 3. VIRAL POTENTIAL SCORE
// ============================================

export interface ViralScore {
  score: number; // 0-100
  factors: {
    name: string;
    score: number;
    weight: number;
    tip: string;
  }[];
  recommendation: string;
}

// Trending keywords that increase viral potential
const TRENDING_KEYWORDS = [
  'AI', 'intelligenza artificiale', 'ChatGPT', 'startup', 'innovazione',
  'sostenibilità', 'green', 'metaverso', 'blockchain', 'crypto',
  'record', 'primo', 'esclusivo', 'rivoluzionario', 'breakthrough',
  'milioni', 'miliardi', 'investimento', 'acquisizione', 'IPO',
];

export function calculateViralScore(
  title: string,
  content: string,
  recipientCount: number,
  hasImages: boolean
): ViralScore {
  const factors: ViralScore['factors'] = [];
  
  // Factor 1: Trending keywords (30% weight)
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  const keywordMatches = TRENDING_KEYWORDS.filter(
    kw => titleLower.includes(kw.toLowerCase()) || contentLower.includes(kw.toLowerCase())
  );
  const keywordScore = Math.min(100, keywordMatches.length * 20);
  factors.push({
    name: 'Keyword Trending',
    score: keywordScore,
    weight: 0.3,
    tip: keywordMatches.length > 0 
      ? `Trovate ${keywordMatches.length} keyword trending: ${keywordMatches.slice(0, 3).join(', ')}`
      : 'Aggiungi keyword trending come AI, innovazione, sostenibilità',
  });
  
  // Factor 2: Title length (15% weight)
  const titleLength = title.length;
  let titleScore = 0;
  if (titleLength >= 40 && titleLength <= 70) {
    titleScore = 100;
  } else if (titleLength >= 30 && titleLength <= 90) {
    titleScore = 70;
  } else {
    titleScore = 40;
  }
  factors.push({
    name: 'Lunghezza Titolo',
    score: titleScore,
    weight: 0.15,
    tip: titleLength < 40 ? 'Titolo troppo corto, aggiungi dettagli' : 
         titleLength > 70 ? 'Titolo troppo lungo, sintetizza' : 'Lunghezza ottimale!',
  });
  
  // Factor 3: Content length (15% weight)
  const wordCount = content.split(/\s+/).length;
  let contentScore = 0;
  if (wordCount >= 200 && wordCount <= 500) {
    contentScore = 100;
  } else if (wordCount >= 100 && wordCount <= 800) {
    contentScore = 70;
  } else {
    contentScore = 40;
  }
  factors.push({
    name: 'Lunghezza Contenuto',
    score: contentScore,
    weight: 0.15,
    tip: wordCount < 200 ? 'Contenuto troppo breve, espandi' : 
         wordCount > 500 ? 'Contenuto lungo, considera di sintetizzare' : `${wordCount} parole - perfetto!`,
  });
  
  // Factor 4: Has images (15% weight)
  const imageScore = hasImages ? 100 : 30;
  factors.push({
    name: 'Immagini',
    score: imageScore,
    weight: 0.15,
    tip: hasImages ? 'Ottimo! Le immagini aumentano l\'engagement' : 'Aggiungi immagini per +40% engagement',
  });
  
  // Factor 5: Recipient reach (15% weight)
  let reachScore = 0;
  if (recipientCount >= 1000) {
    reachScore = 100;
  } else if (recipientCount >= 500) {
    reachScore = 80;
  } else if (recipientCount >= 100) {
    reachScore = 60;
  } else {
    reachScore = 40;
  }
  factors.push({
    name: 'Reach Potenziale',
    score: reachScore,
    weight: 0.15,
    tip: `${recipientCount} destinatari - ${recipientCount >= 500 ? 'ottima copertura!' : 'considera di ampliare i destinatari'}`,
  });
  
  // Factor 6: Has numbers/data (10% weight)
  const hasNumbers = /\d+%|\d+\s*(milioni|miliardi|euro|dollari|\$|€)/i.test(content);
  const dataScore = hasNumbers ? 100 : 40;
  factors.push({
    name: 'Dati e Numeri',
    score: dataScore,
    weight: 0.1,
    tip: hasNumbers ? 'Dati concreti trovati - aumenta credibilità' : 'Aggiungi dati e statistiche per maggiore impatto',
  });
  
  // Calculate total score
  const totalScore = Math.round(
    factors.reduce((acc, f) => acc + f.score * f.weight, 0)
  );
  
  // Generate recommendation
  let recommendation = '';
  if (totalScore >= 80) {
    recommendation = '🚀 Potenziale virale ALTO! Questo comunicato ha ottime possibilità di essere ripreso.';
  } else if (totalScore >= 60) {
    recommendation = '📈 Potenziale BUONO. Qualche ottimizzazione può migliorare ulteriormente.';
  } else if (totalScore >= 40) {
    recommendation = '📊 Potenziale MEDIO. Segui i suggerimenti per aumentare l\'impatto.';
  } else {
    recommendation = '⚠️ Potenziale BASSO. Rivedi il contenuto seguendo i suggerimenti.';
  }
  
  return { score: totalScore, factors, recommendation };
}

// ============================================
// 4. SMART EMBARGO ZONES
// ============================================

export interface EmbargoCheck {
  isSafe: boolean;
  warnings: string[];
  suggestions: string[];
  bestTime: Date | null;
}

// Major holidays by country
const HOLIDAYS: Record<string, { date: string; name: string }[]> = {
  IT: [
    { date: '01-01', name: 'Capodanno' },
    { date: '01-06', name: 'Epifania' },
    { date: '04-25', name: 'Festa della Liberazione' },
    { date: '05-01', name: 'Festa del Lavoro' },
    { date: '06-02', name: 'Festa della Repubblica' },
    { date: '08-15', name: 'Ferragosto' },
    { date: '11-01', name: 'Ognissanti' },
    { date: '12-08', name: 'Immacolata' },
    { date: '12-25', name: 'Natale' },
    { date: '12-26', name: 'Santo Stefano' },
  ],
  US: [
    { date: '01-01', name: 'New Year' },
    { date: '07-04', name: 'Independence Day' },
    { date: '11-28', name: 'Thanksgiving' },
    { date: '12-25', name: 'Christmas' },
  ],
  GB: [
    { date: '01-01', name: 'New Year' },
    { date: '12-25', name: 'Christmas' },
    { date: '12-26', name: 'Boxing Day' },
  ],
  FR: [
    { date: '01-01', name: 'Jour de l\'An' },
    { date: '05-01', name: 'Fête du Travail' },
    { date: '07-14', name: 'Fête Nationale' },
    { date: '08-15', name: 'Assomption' },
    { date: '12-25', name: 'Noël' },
  ],
  DE: [
    { date: '01-01', name: 'Neujahr' },
    { date: '05-01', name: 'Tag der Arbeit' },
    { date: '10-03', name: 'Tag der Deutschen Einheit' },
    { date: '12-25', name: 'Weihnachten' },
    { date: '12-26', name: '2. Weihnachtstag' },
  ],
};

// Timezone offsets from UTC
const TIMEZONES: Record<string, number> = {
  IT: 1, FR: 1, DE: 1, ES: 1, // CET
  GB: 0, // GMT
  US: -5, // EST (average)
  CA: -5,
  BR: -3,
  JP: 9,
  AU: 10,
  IN: 5.5,
};

export function checkEmbargoZones(
  scheduledTime: Date,
  targetCountries: string[]
): EmbargoCheck {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  const dayOfWeek = scheduledTime.getDay(); // 0 = Sunday
  const hour = scheduledTime.getHours();
  const monthDay = `${String(scheduledTime.getMonth() + 1).padStart(2, '0')}-${String(scheduledTime.getDate()).padStart(2, '0')}`;
  
  // Check weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    warnings.push('⚠️ Invio programmato nel weekend - open rate tipicamente -40%');
    suggestions.push('Considera di spostare a lunedì mattina');
  }
  
  // Check holidays for each target country
  targetCountries.forEach(country => {
    const countryHolidays = HOLIDAYS[country] || [];
    const holiday = countryHolidays.find(h => h.date === monthDay);
    if (holiday) {
      warnings.push(`🎄 ${country}: ${holiday.name} - giornalisti probabilmente non attivi`);
    }
  });
  
  // Check time of day
  if (hour < 8 || hour > 18) {
    warnings.push('🌙 Orario fuori dalle ore lavorative standard');
    suggestions.push('Gli orari migliori sono 9:00-11:00 e 14:00-16:00');
  }
  
  // Check timezone conflicts
  if (targetCountries.length > 1) {
    const timezones = targetCountries.map(c => TIMEZONES[c] || 0);
    const minTz = Math.min(...timezones);
    const maxTz = Math.max(...timezones);
    if (maxTz - minTz > 6) {
      warnings.push('🌍 I destinatari sono in fusi orari molto diversi');
      suggestions.push('Considera invii separati per regione geografica');
    }
  }
  
  // Calculate best time
  let bestTime: Date | null = null;
  if (warnings.length > 0) {
    bestTime = new Date(scheduledTime);
    // Move to next Tuesday at 10:00
    const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7;
    bestTime.setDate(bestTime.getDate() + daysUntilTuesday);
    bestTime.setHours(10, 0, 0, 0);
  }
  
  return {
    isSafe: warnings.length === 0,
    warnings,
    suggestions,
    bestTime,
  };
}

// ============================================
// 5. PRESS RELEASE DNA
// ============================================

export interface PressReleaseDNA {
  id: string;
  title: string;
  sentAt: string;
  totalRecipients: number;
  openChain: {
    email: string;
    name: string;
    openedAt: string;
    position: number; // 1 = first opener
  }[];
  forwardChain: {
    from: string;
    to: string;
    forwardedAt: string;
  }[];
  viralScore: number;
  reach: number; // estimated total reach including forwards
  topOpeners: string[]; // first 5 to open
  avgTimeToOpen: number; // hours
}

export async function createPressReleaseDNA(
  id: string,
  title: string,
  recipientCount: number
): Promise<PressReleaseDNA> {
  const dna: PressReleaseDNA = {
    id,
    title,
    sentAt: new Date().toISOString(),
    totalRecipients: recipientCount,
    openChain: [],
    forwardChain: [],
    viralScore: 0,
    reach: recipientCount,
    topOpeners: [],
    avgTimeToOpen: 0,
  };
  
  // Save to storage
  const dnaData = await AsyncStorage.getItem(DNA_KEY);
  const allDna: Record<string, PressReleaseDNA> = dnaData ? JSON.parse(dnaData) : {};
  allDna[id] = dna;
  await AsyncStorage.setItem(DNA_KEY, JSON.stringify(allDna));
  
  return dna;
}

export async function recordDNAOpen(
  pressReleaseId: string,
  email: string,
  name: string
): Promise<void> {
  try {
    const dnaData = await AsyncStorage.getItem(DNA_KEY);
    const allDna: Record<string, PressReleaseDNA> = dnaData ? JSON.parse(dnaData) : {};
    
    const dna = allDna[pressReleaseId];
    if (!dna) return;
    
    // Check if already recorded
    if (dna.openChain.find(o => o.email === email)) return;
    
    const position = dna.openChain.length + 1;
    dna.openChain.push({
      email,
      name,
      openedAt: new Date().toISOString(),
      position,
    });
    
    // Update top openers
    if (dna.topOpeners.length < 5) {
      dna.topOpeners.push(name || email);
    }
    
    // Calculate avg time to open
    const sentTime = new Date(dna.sentAt).getTime();
    const totalTime = dna.openChain.reduce((acc, o) => {
      return acc + (new Date(o.openedAt).getTime() - sentTime);
    }, 0);
    dna.avgTimeToOpen = totalTime / dna.openChain.length / (1000 * 60 * 60); // hours
    
    // Update viral score based on open velocity
    const openRate = (dna.openChain.length / dna.totalRecipients) * 100;
    dna.viralScore = Math.min(100, Math.round(openRate * 2));
    
    allDna[pressReleaseId] = dna;
    await AsyncStorage.setItem(DNA_KEY, JSON.stringify(allDna));
  } catch (error) {
    console.error('Error recording DNA open:', error);
  }
}

export async function getPressReleaseDNA(id: string): Promise<PressReleaseDNA | null> {
  try {
    const dnaData = await AsyncStorage.getItem(DNA_KEY);
    const allDna: Record<string, PressReleaseDNA> = dnaData ? JSON.parse(dnaData) : {};
    return allDna[id] || null;
  } catch (error) {
    console.error('Error getting DNA:', error);
    return null;
  }
}

export async function getAllPressReleaseDNA(): Promise<PressReleaseDNA[]> {
  try {
    const dnaData = await AsyncStorage.getItem(DNA_KEY);
    const allDna: Record<string, PressReleaseDNA> = dnaData ? JSON.parse(dnaData) : {};
    return Object.values(allDna).sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  } catch (error) {
    console.error('Error getting all DNA:', error);
    return [];
  }
}
