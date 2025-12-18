import { describe, it, expect } from 'vitest';

describe('Resend API Key Validation', () => {
  it('should have RESEND_API_KEY environment variable set', () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    expect(apiKey?.startsWith('re_')).toBe(true);
  });

  it('should be able to validate API key with Resend', async () => {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not set');
    }

    // Test API key by fetching domains (lightweight endpoint)
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // 200 = valid key, 401 = invalid key
    expect(response.status).toBe(200);
  });
});
