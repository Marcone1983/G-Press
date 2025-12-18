/**
 * Optimal Send Time Endpoint
 * Calculates the best time to send emails based on recipient timezone and patterns
 */

export const config = {
  runtime: 'edge',
};

interface RecipientData {
  email: string;
  country?: string;
  timezone?: string;
  openHistory?: { hour: number; dayOfWeek: number }[];
}

interface OptimalTimeResult {
  email: string;
  optimalTime: string; // ISO string
  timezone: string;
  confidence: number;
  reason: string;
}

// Country to timezone mapping
const COUNTRY_TIMEZONES: Record<string, string> = {
  'Italia': 'Europe/Rome',
  'USA': 'America/New_York',
  'UK': 'Europe/London',
  'Francia': 'Europe/Paris',
  'Germania': 'Europe/Berlin',
  'Spagna': 'Europe/Madrid',
  'Giappone': 'Asia/Tokyo',
  'Cina': 'Asia/Shanghai',
  'Australia': 'Australia/Sydney',
  'Brasile': 'America/Sao_Paulo',
  'India': 'Asia/Kolkata',
  'Canada': 'America/Toronto',
  'Messico': 'America/Mexico_City',
  'Argentina': 'America/Buenos_Aires',
  'Svizzera': 'Europe/Zurich',
  'Olanda': 'Europe/Amsterdam',
  'Belgio': 'Europe/Brussels',
  'Austria': 'Europe/Vienna',
  'Portogallo': 'Europe/Lisbon',
  'Svezia': 'Europe/Stockholm',
  'Norvegia': 'Europe/Oslo',
  'Danimarca': 'Europe/Copenhagen',
  'Finlandia': 'Europe/Helsinki',
  'Polonia': 'Europe/Warsaw',
  'Russia': 'Europe/Moscow',
  'Corea del Sud': 'Asia/Seoul',
  'Singapore': 'Asia/Singapore',
  'Emirati Arabi': 'Asia/Dubai',
  'Israele': 'Asia/Jerusalem',
  'Sudafrica': 'Africa/Johannesburg',
  'Internazionale': 'UTC',
  'Metaverso': 'UTC',
};

// Best hours to send press releases (local time)
const OPTIMAL_HOURS = {
  weekday: [9, 10, 14, 15], // 9-10 AM and 2-3 PM
  weekend: [10, 11], // Later on weekends
};

// Days ranked by effectiveness (0 = Sunday)
const DAY_EFFECTIVENESS: Record<number, number> = {
  0: 30,  // Sunday - low
  1: 85,  // Monday - good but busy
  2: 95,  // Tuesday - best
  3: 90,  // Wednesday - great
  4: 80,  // Thursday - good
  5: 60,  // Friday - people leaving early
  6: 25,  // Saturday - low
};

function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  } catch {
    return 0;
  }
}

function calculateOptimalTime(recipient: RecipientData): OptimalTimeResult {
  const timezone = recipient.timezone || 
    (recipient.country && COUNTRY_TIMEZONES[recipient.country]) || 
    'Europe/Rome';
  
  const now = new Date();
  const offset = getTimezoneOffset(timezone);
  
  // If we have open history, use it
  if (recipient.openHistory && recipient.openHistory.length >= 3) {
    // Find most common open hour
    const hourCounts: Record<number, number> = {};
    recipient.openHistory.forEach(h => {
      hourCounts[h.hour] = (hourCounts[h.hour] || 0) + 1;
    });
    
    const bestHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (bestHour) {
      const targetHour = parseInt(bestHour[0]);
      const optimalDate = new Date(now);
      
      // Find next occurrence of this hour
      optimalDate.setHours(targetHour - offset, 0, 0, 0);
      if (optimalDate <= now) {
        optimalDate.setDate(optimalDate.getDate() + 1);
      }
      
      return {
        email: recipient.email,
        optimalTime: optimalDate.toISOString(),
        timezone,
        confidence: 90,
        reason: `Basato su ${recipient.openHistory.length} aperture precedenti`,
      };
    }
  }
  
  // Default: find next optimal slot
  const optimalDate = new Date(now);
  let daysToAdd = 0;
  let bestDay = -1;
  let bestScore = 0;
  
  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + i);
    const dayOfWeek = checkDate.getDay();
    const score = DAY_EFFECTIVENESS[dayOfWeek];
    
    if (score > bestScore) {
      bestScore = score;
      bestDay = dayOfWeek;
      daysToAdd = i;
    }
  }
  
  optimalDate.setDate(optimalDate.getDate() + daysToAdd);
  
  // Set optimal hour based on weekday/weekend
  const isWeekend = bestDay === 0 || bestDay === 6;
  const hours = isWeekend ? OPTIMAL_HOURS.weekend : OPTIMAL_HOURS.weekday;
  const targetHour = hours[0]; // Pick first optimal hour
  
  // Convert to UTC considering timezone
  optimalDate.setUTCHours(targetHour - offset, 0, 0, 0);
  
  // If the time has passed today, move to next optimal day
  if (optimalDate <= now) {
    optimalDate.setDate(optimalDate.getDate() + 1);
    // Recalculate for new day
    const newDayOfWeek = optimalDate.getDay();
    const newIsWeekend = newDayOfWeek === 0 || newDayOfWeek === 6;
    const newHours = newIsWeekend ? OPTIMAL_HOURS.weekend : OPTIMAL_HOURS.weekday;
    optimalDate.setUTCHours(newHours[0] - offset, 0, 0, 0);
  }
  
  const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  
  return {
    email: recipient.email,
    optimalTime: optimalDate.toISOString(),
    timezone,
    confidence: 70,
    reason: `${dayNames[optimalDate.getDay()]} alle ${targetHour}:00 (${timezone})`,
  };
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { recipients } = body;

    if (!recipients || !Array.isArray(recipients)) {
      return new Response(JSON.stringify({ error: 'Missing recipients array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = recipients.map(calculateOptimalTime);
    
    // Group by optimal time for batch sending
    const timeGroups: Record<string, OptimalTimeResult[]> = {};
    results.forEach(r => {
      const timeKey = r.optimalTime.substring(0, 13); // Group by hour
      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = [];
      }
      timeGroups[timeKey].push(r);
    });

    return new Response(JSON.stringify({
      success: true,
      results,
      groups: Object.entries(timeGroups).map(([time, recipients]) => ({
        scheduledTime: time + ':00:00.000Z',
        recipientCount: recipients.length,
        recipients: recipients.map(r => r.email),
      })),
      summary: {
        total: results.length,
        averageConfidence: Math.round(
          results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        ),
      },
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Optimal time calculation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Calculation failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
