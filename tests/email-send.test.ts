import { describe, it, expect } from 'vitest';

describe('email.send', () => {
  it('should have RESEND_API_KEY environment variable set', () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey?.startsWith('re_')).toBe(true);
  });

  it('should send test email successfully via API', async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not set');
    }

    // Test with a single recipient
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Roberto Romagnino <g.ceo@growverse.net>',
        to: ['test@example.com'],
        subject: 'Test G-Press Email',
        html: '<p>This is a test email from G-Press</p>',
      }),
    });

    // Resend returns 200 for successful sends
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.id).toBeDefined();
  });
});
