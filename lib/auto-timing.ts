/**
 * Auto-Timing Service for G-Press
 * Analyzes open patterns and suggests optimal send times
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const OPEN_HISTORY_KEY = 'gpress_open_history';
const TIMEZONE_CACHE_KEY = 'gpress_timezone_cache';

export interface OpenEvent {
  email: string;
  openedAt: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  timezone?: string;
  country?: string;
}

export interface TimingAnalysis {
  bestDays: { day: number; dayName: string; score: number }[];
  bestHours: { hour: number; score: number }[];
  bestTimeSlots: { day: number; hour: number; score: number }[];
  overallBestTime: { day: number; dayName: string; hour: number; formatted: string };
  sampleSize: number;
}

export interface ScheduleSuggestion {
  suggestedTime: Date;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  alternativeTimes: Date[];
}

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

// Country to timezone mapping (simplified)
const COUNTRY_TIMEZONES: Record<string, string> = {
  'IT': 'Europe/Rome',
  'US': 'America/New_York',
  'UK': 'Europe/London',
  'GB': 'Europe/London',
  'DE': 'Europe/Berlin',
  'FR': 'Europe/Paris',
  'ES': 'Europe/Madrid',
  'JP': 'Asia/Tokyo',
  'CN': 'Asia/Shanghai',
  'AU': 'Australia/Sydney',
  'BR': 'America/Sao_Paulo',
  'IN': 'Asia/Kolkata',
};

// Holidays by country (simplified - major holidays)
const HOLIDAYS: Record<string, string[]> = {
  'IT': ['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26'],
  'US': ['01-01', '07-04', '11-28', '12-25'],
  'UK': ['01-01', '12-25', '12-26'],
  'DE': ['01-01', '05-01', '10-03', '12-25', '12-26'],
  'FR': ['01-01', '05-01', '05-08', '07-14', '11-11', '12-25'],
};

/**
 * Load open history
 */
export async function loadOpenHistory(): Promise<OpenEvent[]> {
  try {
    const data = await AsyncStorage.getItem(OPEN_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Save open history
 */
export async function saveOpenHistory(history: OpenEvent[]): Promise<void> {
  // Keep only last 90 days
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const filtered = history.filter(e => new Date(e.openedAt).getTime() > cutoff);
  await AsyncStorage.setItem(OPEN_HISTORY_KEY, JSON.stringify(filtered));
}

/**
 * Record an email open event
 */
export async function recordOpenEvent(email: string, country?: string): Promise<void> {
  const now = new Date();
  const event: OpenEvent = {
    email,
    openedAt: now.toISOString(),
    dayOfWeek: now.getDay(),
    hour: now.getHours(),
    country,
    timezone: country ? COUNTRY_TIMEZONES[country] : undefined,
  };
  
  const history = await loadOpenHistory();
  history.push(event);
  await saveOpenHistory(history);
}

/**
 * Analyze open patterns
 */
export async function analyzeOpenPatterns(): Promise<TimingAnalysis> {
  const history = await loadOpenHistory();
  
  // Initialize counters
  const dayScores = new Array(7).fill(0);
  const hourScores = new Array(24).fill(0);
  const slotScores: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  
  // Count opens by day and hour
  for (const event of history) {
    dayScores[event.dayOfWeek]++;
    hourScores[event.hour]++;
    slotScores[event.dayOfWeek][event.hour]++;
  }
  
  // Normalize scores
  const maxDay = Math.max(...dayScores, 1);
  const maxHour = Math.max(...hourScores, 1);
  
  const bestDays = dayScores
    .map((score, day) => ({
      day,
      dayName: DAY_NAMES[day],
      score: Math.round((score / maxDay) * 100),
    }))
    .sort((a, b) => b.score - a.score);
  
  const bestHours = hourScores
    .map((score, hour) => ({
      hour,
      score: Math.round((score / maxHour) * 100),
    }))
    .sort((a, b) => b.score - a.score);
  
  // Find best time slots
  const bestTimeSlots: { day: number; hour: number; score: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (slotScores[day][hour] > 0) {
        bestTimeSlots.push({
          day,
          hour,
          score: slotScores[day][hour],
        });
      }
    }
  }
  bestTimeSlots.sort((a, b) => b.score - a.score);
  
  // Determine overall best time
  const topSlot = bestTimeSlots[0] || { day: 2, hour: 10 }; // Default: Tuesday 10am
  
  return {
    bestDays,
    bestHours: bestHours.slice(0, 10),
    bestTimeSlots: bestTimeSlots.slice(0, 10),
    overallBestTime: {
      day: topSlot.day,
      dayName: DAY_NAMES[topSlot.day],
      hour: topSlot.hour,
      formatted: `${DAY_NAMES[topSlot.day]} alle ${topSlot.hour}:00`,
    },
    sampleSize: history.length,
  };
}

/**
 * Check if date is a holiday
 */
function isHoliday(date: Date, country: string): boolean {
  const holidays = HOLIDAYS[country] || [];
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return holidays.includes(monthDay);
}

/**
 * Check if time is during business hours
 */
function isBusinessHours(hour: number): boolean {
  return hour >= 9 && hour <= 18;
}

/**
 * Get next occurrence of a specific day and hour
 */
function getNextOccurrence(targetDay: number, targetHour: number): Date {
  const now = new Date();
  const result = new Date(now);
  
  // Set to target hour
  result.setHours(targetHour, 0, 0, 0);
  
  // Calculate days until target day
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  
  if (daysUntil < 0 || (daysUntil === 0 && now.getHours() >= targetHour)) {
    daysUntil += 7;
  }
  
  result.setDate(result.getDate() + daysUntil);
  
  return result;
}

/**
 * Get optimal send time suggestion
 */
export async function getSendTimeSuggestion(
  recipientCountries: string[] = ['IT']
): Promise<ScheduleSuggestion> {
  const analysis = await analyzeOpenPatterns();
  const now = new Date();
  
  // Determine confidence based on sample size
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (analysis.sampleSize >= 100) confidence = 'high';
  else if (analysis.sampleSize >= 20) confidence = 'medium';
  
  // If not enough data, use default business hours
  if (analysis.sampleSize < 5) {
    // Default: Tuesday or Wednesday at 10am
    const defaultTime = getNextOccurrence(2, 10); // Tuesday 10am
    
    return {
      suggestedTime: defaultTime,
      reason: 'Orario consigliato basato su best practices (martedì mattina)',
      confidence: 'low',
      alternativeTimes: [
        getNextOccurrence(3, 10), // Wednesday 10am
        getNextOccurrence(2, 14), // Tuesday 2pm
        getNextOccurrence(4, 10), // Thursday 10am
      ],
    };
  }
  
  // Use analyzed best time
  const bestTime = analysis.overallBestTime;
  let suggestedTime = getNextOccurrence(bestTime.day, bestTime.hour);
  
  // Check for holidays in recipient countries
  const primaryCountry = recipientCountries[0] || 'IT';
  while (isHoliday(suggestedTime, primaryCountry)) {
    suggestedTime.setDate(suggestedTime.getDate() + 1);
  }
  
  // Generate alternatives
  const alternatives: Date[] = [];
  for (const slot of analysis.bestTimeSlots.slice(1, 4)) {
    const altTime = getNextOccurrence(slot.day, slot.hour);
    if (!isHoliday(altTime, primaryCountry)) {
      alternatives.push(altTime);
    }
  }
  
  return {
    suggestedTime,
    reason: `Basato su ${analysis.sampleSize} aperture analizzate - ${bestTime.formatted}`,
    confidence,
    alternativeTimes: alternatives,
  };
}

/**
 * Get embargo zones (times to avoid)
 */
export function getEmbargoZones(country: string): {
  holidays: string[];
  avoidHours: number[];
  timezone: string;
} {
  return {
    holidays: HOLIDAYS[country] || [],
    avoidHours: [0, 1, 2, 3, 4, 5, 6, 22, 23], // Avoid late night/early morning
    timezone: COUNTRY_TIMEZONES[country] || 'UTC',
  };
}

/**
 * Check if current time is good for sending
 */
export function isGoodTimeToSend(country: string = 'IT'): {
  isGood: boolean;
  reason?: string;
  suggestedWait?: number; // minutes to wait
} {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Weekend
  if (day === 0 || day === 6) {
    const hoursUntilMonday = day === 0 ? 24 + 9 : 24 + 24 + 9;
    return {
      isGood: false,
      reason: 'È weekend - i giornalisti potrebbero non leggere',
      suggestedWait: hoursUntilMonday * 60,
    };
  }
  
  // Too early
  if (hour < 8) {
    return {
      isGood: false,
      reason: 'Troppo presto - aspetta le 9:00',
      suggestedWait: (9 - hour) * 60,
    };
  }
  
  // Too late
  if (hour >= 19) {
    return {
      isGood: false,
      reason: 'Troppo tardi - meglio domani mattina',
      suggestedWait: (24 - hour + 9) * 60,
    };
  }
  
  // Lunch time (less optimal but ok)
  if (hour >= 12 && hour <= 14) {
    return {
      isGood: true,
      reason: 'Orario pranzo - potrebbe essere meno efficace',
    };
  }
  
  // Holiday check
  if (isHoliday(now, country)) {
    return {
      isGood: false,
      reason: 'Oggi è festivo - meglio aspettare',
      suggestedWait: 24 * 60,
    };
  }
  
  return { isGood: true };
}
