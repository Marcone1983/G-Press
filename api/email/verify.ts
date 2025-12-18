/**
 * Email Verification Endpoint
 * Validates email addresses before sending
 */

import dns from 'dns';
import { promisify } from 'util';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

const resolveMx = promisify(dns.resolveMx);

interface VerificationResult {
  email: string;
  valid: boolean;
  reason?: string;
  mxRecords?: string[];
  score: number; // 0-100
}

// Common disposable email domains
const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
  'temp-mail.org', '10minutemail.com', 'fakeinbox.com', 'sharklasers.com',
  'yopmail.com', 'trashmail.com', 'getairmail.com', 'dispostable.com',
];

// Common typos in email domains
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gamil.com': 'gmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'outloo.com': 'outlook.com',
  'outlok.com': 'outlook.com',
};

async function verifyEmail(email: string): Promise<VerificationResult> {
  const result: VerificationResult = {
    email,
    valid: false,
    score: 0,
  };

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    result.reason = 'Formato email non valido';
    return result;
  }
  result.score += 20;

  const [localPart, domain] = email.toLowerCase().split('@');

  // Check for disposable domains
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    result.reason = 'Email temporanea/usa e getta';
    result.score = 10;
    return result;
  }
  result.score += 10;

  // Check for common typos
  if (DOMAIN_TYPOS[domain]) {
    result.reason = `Possibile errore di battitura. Intendevi ${localPart}@${DOMAIN_TYPOS[domain]}?`;
    result.score = 30;
    return result;
  }
  result.score += 10;

  // Check local part quality
  if (localPart.length < 2) {
    result.reason = 'Parte locale troppo corta';
    result.score = 20;
    return result;
  }
  result.score += 10;

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /^test/i,
    /^fake/i,
    /^spam/i,
    /^noreply/i,
    /^no-reply/i,
    /^donotreply/i,
    /^admin@/i,
    /^info@/i,
  ];
  
  const isSuspicious = suspiciousPatterns.some(p => p.test(email));
  if (isSuspicious) {
    result.score -= 20;
  }

  // MX record check
  try {
    const mxRecords = await resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      result.mxRecords = mxRecords.map(r => r.exchange);
      result.score += 40;
      result.valid = true;
    } else {
      result.reason = 'Nessun server email trovato per questo dominio';
      return result;
    }
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      result.reason = 'Dominio email non esistente';
      return result;
    }
    // DNS error but might still be valid
    result.score += 20;
    result.valid = true;
    result.reason = 'Verifica DNS non completata, ma formato valido';
  }

  // Final score adjustment
  result.score = Math.min(100, Math.max(0, result.score));
  result.valid = result.score >= 50;

  return result;
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
    const { emails } = body;

    if (!emails || !Array.isArray(emails)) {
      return new Response(JSON.stringify({ error: 'Missing emails array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Limit batch size
    const emailsToVerify = emails.slice(0, 50);
    
    // Verify all emails in parallel
    const results = await Promise.all(
      emailsToVerify.map(email => verifyEmail(email.toLowerCase().trim()))
    );

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.filter(r => !r.valid).length;

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        total: results.length,
        valid: validCount,
        invalid: invalidCount,
        validPercentage: Math.round((validCount / results.length) * 100),
      },
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('Email verification error:', error);
    return new Response(JSON.stringify({ 
      error: 'Verification failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
