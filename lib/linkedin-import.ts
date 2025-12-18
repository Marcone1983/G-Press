/**
 * LinkedIn CSV Import Service for G-Press
 * Parses LinkedIn Connections export and imports contacts
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export interface LinkedInContact {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  position: string;
  connectedOn: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  imported: number;
  duplicates: number;
  errors: number;
  contacts: LinkedInContact[];
  errorMessages: string[];
}

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): string[][] {
  const lines = content.split('\n');
  const rows: string[][] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  
  return rows;
}

/**
 * Detect column indices from header row
 */
function detectColumns(header: string[]): {
  firstName: number;
  lastName: number;
  email: number;
  company: number;
  position: number;
  connectedOn: number;
} {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  
  const indices = {
    firstName: -1,
    lastName: -1,
    email: -1,
    company: -1,
    position: -1,
    connectedOn: -1,
  };
  
  header.forEach((col, i) => {
    const norm = normalize(col);
    if (norm.includes('firstname') || norm === 'first') indices.firstName = i;
    else if (norm.includes('lastname') || norm === 'last') indices.lastName = i;
    else if (norm.includes('email') || norm.includes('emailaddress')) indices.email = i;
    else if (norm.includes('company') || norm.includes('organization')) indices.company = i;
    else if (norm.includes('position') || norm.includes('title') || norm.includes('jobtitle')) indices.position = i;
    else if (norm.includes('connected') || norm.includes('date')) indices.connectedOn = i;
  });
  
  return indices;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Categorize contact based on position/company
 */
export function categorizeContact(position: string, company: string): string {
  const text = `${position} ${company}`.toLowerCase();
  
  if (text.includes('journalist') || text.includes('reporter') || text.includes('editor') || 
      text.includes('correspondent') || text.includes('writer') || text.includes('news')) {
    return 'Giornalismo';
  }
  if (text.includes('tech') || text.includes('software') || text.includes('developer') ||
      text.includes('engineer') || text.includes('startup')) {
    return 'Tecnologia';
  }
  if (text.includes('finance') || text.includes('bank') || text.includes('investment') ||
      text.includes('capital') || text.includes('fund')) {
    return 'Finanza';
  }
  if (text.includes('marketing') || text.includes('pr ') || text.includes('public relations') ||
      text.includes('communications')) {
    return 'Marketing/PR';
  }
  if (text.includes('ceo') || text.includes('founder') || text.includes('director') ||
      text.includes('president') || text.includes('chief')) {
    return 'Executive';
  }
  
  return 'Altro';
}

/**
 * Parse LinkedIn CSV export file
 */
export async function parseLinkedInCSV(content: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    imported: 0,
    duplicates: 0,
    errors: 0,
    contacts: [],
    errorMessages: [],
  };
  
  try {
    const rows = parseCSV(content);
    
    if (rows.length < 2) {
      result.errorMessages.push('File CSV vuoto o senza dati');
      return result;
    }
    
    const header = rows[0];
    const columns = detectColumns(header);
    
    // Check required columns
    if (columns.email === -1) {
      // Try to find any column that might contain emails
      for (let i = 0; i < header.length; i++) {
        const sampleValue = rows[1]?.[i] || '';
        if (isValidEmail(sampleValue)) {
          columns.email = i;
          break;
        }
      }
    }
    
    if (columns.email === -1) {
      result.errorMessages.push('Colonna email non trovata nel file CSV');
      return result;
    }
    
    const seenEmails = new Set<string>();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      result.totalRows++;
      
      try {
        const email = (row[columns.email] || '').trim().toLowerCase();
        
        if (!email || !isValidEmail(email)) {
          result.errors++;
          continue;
        }
        
        if (seenEmails.has(email)) {
          result.duplicates++;
          continue;
        }
        seenEmails.add(email);
        
        const contact: LinkedInContact = {
          firstName: (row[columns.firstName] || '').trim(),
          lastName: (row[columns.lastName] || '').trim(),
          email,
          company: (row[columns.company] || '').trim(),
          position: (row[columns.position] || '').trim(),
          connectedOn: (row[columns.connectedOn] || '').trim(),
        };
        
        result.contacts.push(contact);
        result.imported++;
      } catch (err) {
        result.errors++;
      }
    }
    
    result.success = result.imported > 0;
    
  } catch (error) {
    result.errorMessages.push(`Errore parsing CSV: ${error}`);
  }
  
  return result;
}

/**
 * Pick and import LinkedIn CSV file
 */
export async function pickAndImportLinkedInCSV(): Promise<ImportResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
      copyToCacheDirectory: true,
    });
    
    if (result.canceled || !result.assets?.[0]) {
      return {
        success: false,
        totalRows: 0,
        imported: 0,
        duplicates: 0,
        errors: 0,
        contacts: [],
        errorMessages: ['Selezione file annullata'],
      };
    }
    
    const file = result.assets[0];
    const content = await FileSystem.readAsStringAsync(file.uri);
    
    return parseLinkedInCSV(content);
    
  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      imported: 0,
      duplicates: 0,
      errors: 0,
      contacts: [],
      errorMessages: [`Errore lettura file: ${error}`],
    };
  }
}
