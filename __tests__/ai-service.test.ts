import { describe, it, expect } from 'vitest';
import {
  getSubjectSuggestions,
  calculateViralScore,
  checkEmbargoZones,
  getJournalistMood,
  getMoodEmoji,
  getMoodColor,
} from '../lib/ai-service';

describe('AI Service', () => {
  describe('getSubjectSuggestions', () => {
    it('should return subject suggestions', async () => {
      const result = await getSubjectSuggestions('Test comunicato stampa', 'technology');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should include score and reason for each suggestion', async () => {
      const result = await getSubjectSuggestions('Lancio prodotto innovativo');
      
      result.forEach((suggestion: { subject: string; score: number; reason: string }) => {
        expect(suggestion.subject).toBeDefined();
        expect(suggestion.score).toBeDefined();
        expect(suggestion.reason).toBeDefined();
        expect(typeof suggestion.subject).toBe('string');
        expect(typeof suggestion.score).toBe('number');
      });
    });
  });

  describe('calculateViralScore', () => {
    it('should return a score between 0 and 100', () => {
      const result = calculateViralScore(
        'Breaking: Nuova scoperta rivoluzionaria AI',
        'Contenuto del comunicato stampa con dettagli importanti su innovazione',
        100,
        true
      );
      
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should include factors analysis', () => {
      const result = calculateViralScore(
        'Titolo test',
        'Contenuto test',
        50,
        false
      );
      
      expect(result.factors).toBeDefined();
      expect(Array.isArray(result.factors)).toBe(true);
      expect(result.factors.length).toBeGreaterThan(0);
      
      result.factors.forEach(factor => {
        expect(factor.name).toBeDefined();
        expect(factor.score).toBeDefined();
        expect(factor.tip).toBeDefined();
      });
    });

    it('should give higher score for trending keywords', () => {
      const withTrending = calculateViralScore(
        'Nuova AI rivoluzionaria per startup',
        'Innovazione nel settore tech',
        100,
        true
      );
      
      const withoutTrending = calculateViralScore(
        'Comunicato stampa generico',
        'Testo senza parole chiave particolari',
        100,
        true
      );
      
      expect(withTrending.score).toBeGreaterThan(withoutTrending.score);
    });
  });

  describe('checkEmbargoZones', () => {
    it('should return embargo check result', () => {
      const testDate = new Date();
      testDate.setHours(10, 0, 0, 0); // 10:00 AM
      
      const result = checkEmbargoZones(testDate, ['IT']);
      
      expect(result).toBeDefined();
      expect(typeof result.isSafe).toBe('boolean');
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should warn about weekend sending', () => {
      const saturday = new Date();
      // Find next Saturday
      const daysUntilSaturday = (6 - saturday.getDay() + 7) % 7 || 7;
      saturday.setDate(saturday.getDate() + daysUntilSaturday);
      saturday.setHours(10, 0, 0, 0);
      
      const result = checkEmbargoZones(saturday, ['IT']);
      
      // Should have warnings about weekend
      expect(result.isSafe).toBe(false);
    });

    it('should suggest best time', () => {
      const testDate = new Date();
      testDate.setHours(3, 0, 0, 0); // 3:00 AM - bad time
      
      const result = checkEmbargoZones(testDate, ['IT']);
      
      expect(result.bestTime).toBeDefined();
      expect(result.bestTime instanceof Date).toBe(true);
    });
  });

  describe('getJournalistMood', () => {
    it('should return mood data or null for journalist', async () => {
      const result = await getJournalistMood('test@example.com');
      
      // Result can be null if no mood data exists for this email
      if (result !== null) {
        expect(result.email).toBe('test@example.com');
        expect(result.mood).toBeDefined();
        expect(['hot', 'warm', 'cold', 'inactive']).toContain(result.mood);
      } else {
        expect(result).toBeNull();
      }
    });

    it('should include engagement metrics when mood exists', async () => {
      const result = await getJournalistMood('journalist@test.com');
      
      // Result can be null if no mood data exists
      if (result) {
        expect(result.avgResponseTime).toBeDefined();
        expect(result.preferredHour).toBeDefined();
        expect(result.preferredDay).toBeDefined();
        expect(result.engagementScore).toBeDefined();
      } else {
        expect(result).toBeNull();
      }
    });
  });

  describe('getMoodEmoji', () => {
    it('should return correct emoji for each mood', () => {
      expect(getMoodEmoji('hot')).toBe('🔥');
      expect(getMoodEmoji('warm')).toBe('☀️');
      expect(getMoodEmoji('cold')).toBe('❄️');
      expect(getMoodEmoji('inactive')).toBe('💤');
    });
  });

  describe('getMoodColor', () => {
    it('should return valid hex color for each mood', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      
      expect(getMoodColor('hot')).toMatch(hexColorRegex);
      expect(getMoodColor('warm')).toMatch(hexColorRegex);
      expect(getMoodColor('cold')).toMatch(hexColorRegex);
      expect(getMoodColor('inactive')).toMatch(hexColorRegex);
    });

    it('should return distinct colors for different moods', () => {
      const colors = [
        getMoodColor('hot'),
        getMoodColor('warm'),
        getMoodColor('cold'),
        getMoodColor('inactive'),
      ];
      
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });
  });
});
