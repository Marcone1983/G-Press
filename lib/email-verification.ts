/**
 * Email Verification Service for G-Press
 * Validates email addresses before sending
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const VERIFICATION_CACHE_KEY = 'gpress_email_verification_cache';
const BOUNCE_LIST_KEY = 'gpress_bounce_list';

export interface EmailVerificationResult {
  email: string;
  valid: boolean;
  reason?: 'syntax' | 'disposable' | 'bounce' | 'mx_invalid' | 'unknown';
  checkedAt: string;
}

export interface BounceRecord {
  email: string;
  bouncedAt: string;
  reason: string;
  permanent: boolean;
}

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
  'throwaway.email', 'fakeinbox.com', 'sharklasers.com', 'yopmail.com',
  'temp-mail.org', 'getnada.com', 'trashmail.com', 'maildrop.cc',
]);

// Known invalid TLDs
const INVALID_TLDS = new Set([
  'invalid', 'test', 'example', 'localhost',
]);

/**
 * Validate email syntax
 */
export function validateEmailSyntax(email: string): boolean {
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return regex.test(email) && email.length <= 254;
}

/**
 * Check if email domain is disposable
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

/**
 * Check if TLD is valid
 */
export function hasValidTLD(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  
  const tld = domain.split('.').pop();
  return tld ? !INVALID_TLDS.has(tld) && tld.length >= 2 : false;
}

/**
 * Load verification cache
 */
async function loadVerificationCache(): Promise<Map<string, EmailVerificationResult>> {
  try {
    const data = await AsyncStorage.getItem(VERIFICATION_CACHE_KEY);
    if (data) {
      const arr: EmailVerificationResult[] = JSON.parse(data);
      return new Map(arr.map(r => [r.email, r]));
    }
  } catch (error) {
    console.error('[EmailVerification] Error loading cache:', error);
  }
  return new Map();
}

/**
 * Save verification cache
 */
async function saveVerificationCache(cache: Map<string, EmailVerificationResult>): Promise<void> {
  try {
    const arr = Array.from(cache.values());
    // Keep only last 30 days
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = arr.filter(r => new Date(r.checkedAt).getTime() > cutoff);
    await AsyncStorage.setItem(VERIFICATION_CACHE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[EmailVerification] Error saving cache:', error);
  }
}

/**
 * Load bounce list
 */
export async function loadBounceList(): Promise<BounceRecord[]> {
  try {
    const data = await AsyncStorage.getItem(BOUNCE_LIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Save bounce list
 */
export async function saveBounceList(list: BounceRecord[]): Promise<void> {
  await AsyncStorage.setItem(BOUNCE_LIST_KEY, JSON.stringify(list));
}

/**
 * Add email to bounce list
 */
export async function addToBounceList(email: string, reason: string, permanent: boolean): Promise<void> {
  const list = await loadBounceList();
  
  // Check if already in list
  if (list.some(b => b.email.toLowerCase() === email.toLowerCase())) {
    return;
  }
  
  list.push({
    email: email.toLowerCase(),
    bouncedAt: new Date().toISOString(),
    reason,
    permanent,
  });
  
  await saveBounceList(list);
}

/**
 * Check if email is in bounce list
 */
export async function isInBounceList(email: string): Promise<boolean> {
  const list = await loadBounceList();
  return list.some(b => b.email.toLowerCase() === email.toLowerCase() && b.permanent);
}

/**
 * Remove email from bounce list
 */
export async function removeFromBounceList(email: string): Promise<void> {
  const list = await loadBounceList();
  const filtered = list.filter(b => b.email.toLowerCase() !== email.toLowerCase());
  await saveBounceList(filtered);
}

/**
 * Verify a single email address
 */
export async function verifyEmail(email: string, useCache = true): Promise<EmailVerificationResult> {
  const normalizedEmail = email.trim().toLowerCase();
  
  // Check cache first
  if (useCache) {
    const cache = await loadVerificationCache();
    const cached = cache.get(normalizedEmail);
    if (cached) {
      // Cache valid for 7 days
      const cacheAge = Date.now() - new Date(cached.checkedAt).getTime();
      if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
        return cached;
      }
    }
  }
  
  // Check bounce list
  if (await isInBounceList(normalizedEmail)) {
    return {
      email: normalizedEmail,
      valid: false,
      reason: 'bounce',
      checkedAt: new Date().toISOString(),
    };
  }
  
  // Validate syntax
  if (!validateEmailSyntax(normalizedEmail)) {
    const result: EmailVerificationResult = {
      email: normalizedEmail,
      valid: false,
      reason: 'syntax',
      checkedAt: new Date().toISOString(),
    };
    
    const cache = await loadVerificationCache();
    cache.set(normalizedEmail, result);
    await saveVerificationCache(cache);
    
    return result;
  }
  
  // Check disposable
  if (isDisposableEmail(normalizedEmail)) {
    const result: EmailVerificationResult = {
      email: normalizedEmail,
      valid: false,
      reason: 'disposable',
      checkedAt: new Date().toISOString(),
    };
    
    const cache = await loadVerificationCache();
    cache.set(normalizedEmail, result);
    await saveVerificationCache(cache);
    
    return result;
  }
  
  // Check TLD
  if (!hasValidTLD(normalizedEmail)) {
    const result: EmailVerificationResult = {
      email: normalizedEmail,
      valid: false,
      reason: 'syntax',
      checkedAt: new Date().toISOString(),
    };
    
    const cache = await loadVerificationCache();
    cache.set(normalizedEmail, result);
    await saveVerificationCache(cache);
    
    return result;
  }
  
  // All basic checks passed
  const result: EmailVerificationResult = {
    email: normalizedEmail,
    valid: true,
    checkedAt: new Date().toISOString(),
  };
  
  const cache = await loadVerificationCache();
  cache.set(normalizedEmail, result);
  await saveVerificationCache(cache);
  
  return result;
}

/**
 * Verify multiple emails in batch
 */
export async function verifyEmails(emails: string[]): Promise<{
  valid: string[];
  invalid: EmailVerificationResult[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    syntaxErrors: number;
    disposable: number;
    bounced: number;
  };
}> {
  const valid: string[] = [];
  const invalid: EmailVerificationResult[] = [];
  const stats = {
    total: emails.length,
    valid: 0,
    invalid: 0,
    syntaxErrors: 0,
    disposable: 0,
    bounced: 0,
  };
  
  for (const email of emails) {
    const result = await verifyEmail(email);
    
    if (result.valid) {
      valid.push(email);
      stats.valid++;
    } else {
      invalid.push(result);
      stats.invalid++;
      
      switch (result.reason) {
        case 'syntax':
          stats.syntaxErrors++;
          break;
        case 'disposable':
          stats.disposable++;
          break;
        case 'bounce':
          stats.bounced++;
          break;
      }
    }
  }
  
  return { valid, invalid, stats };
}

/**
 * Get verification statistics
 */
export async function getVerificationStats(): Promise<{
  totalVerified: number;
  validEmails: number;
  invalidEmails: number;
  bounceListSize: number;
}> {
  const cache = await loadVerificationCache();
  const bounceList = await loadBounceList();
  
  let validCount = 0;
  let invalidCount = 0;
  
  cache.forEach(result => {
    if (result.valid) validCount++;
    else invalidCount++;
  });
  
  return {
    totalVerified: cache.size,
    validEmails: validCount,
    invalidEmails: invalidCount,
    bounceListSize: bounceList.length,
  };
}
