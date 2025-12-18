import { describe, it, expect } from 'vitest';
import {
  getDocumentTypeLabel,
  getFormatLabel,
} from '../lib/knowledge-base';

describe('Knowledge Base Service', () => {
  describe('getDocumentTypeLabel', () => {
    it('should return correct labels for document types', () => {
      expect(getDocumentTypeLabel('whitepaper')).toBe('Whitepaper');
      expect(getDocumentTypeLabel('press_release')).toBe('Press Release');
      expect(getDocumentTypeLabel('innovation')).toBe('Innovazione');
      expect(getDocumentTypeLabel('product')).toBe('Prodotto');
      expect(getDocumentTypeLabel('case_study')).toBe('Case Study');
      expect(getDocumentTypeLabel('other')).toBe('Altro');
    });
  });

  describe('getFormatLabel', () => {
    it('should return correct labels for article formats', () => {
      expect(getFormatLabel('news_brief')).toBe('News Breve');
      expect(getFormatLabel('feature')).toBe('Approfondimento');
      expect(getFormatLabel('interview')).toBe('Intervista');
      expect(getFormatLabel('case_study')).toBe('Case Study');
      expect(getFormatLabel('announcement')).toBe('Annuncio');
    });
  });
});
