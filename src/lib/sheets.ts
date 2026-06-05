/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MRFRow, CandidateRow, InterviewRow, CheckRow, GSheetResponse } from '../types';

// Helper to convert Google Sheets / Excel date formats or custom typed dates to standard Date
export function parseSheetDate(val: any): Date | null {
  if (!val) return null;
  val = String(val).trim();
  if (!val) return null;

  // Excel/Sheets numeric representation (serial date number, offset from 1900-01-01)
  if (/^\d{5}(\.\d+)?$/.test(val)) {
    const serial = parseFloat(val);
    const date = new Date((serial - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }

  // Standard Date parse
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  // Handle formats like dd-mm-yyyy or dd/mm/yyyy
  const parts = val.split(/[-/.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1; // 0-based index
    let year = parseInt(parts[2], 10);

    // Swap if year looks like the first parameter (yyyy-mm-dd)
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      day = parseInt(parts[2], 10);
    }

    if (year < 100) year += 2000;

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

// Case-insensitive, punctuation and whitespace stripping synonym matcher
export function getValueBySynonyms(row: Record<string, string>, synonyms: string[]): string {
  const clean = (s: string) => s.toLowerCase().replace(/[\s._-]/g, '');
  const cleanSynonyms = synonyms.map(clean);

  for (const cs of cleanSynonyms) {
    const matchedKey = Object.keys(row).find(k => {
      const ck = clean(k);
      return ck === cs || ck.includes(cs) || cs.includes(ck);
    });
    if (matchedKey) return row[matchedKey];
  }
  return '';
}

// Helper to normalize designation spelling, spacing, and capitalization
export function normalizeDesignation(raw: string): string {
  if (!raw) return '';
  // Trim and standardize spacing
  const clean = raw.trim().replace(/\s+/g, ' ');
  // Replace hyphens and underscores with space for simpler exact comparison
  const lower = clean.toLowerCase().replace(/[-_]/g, ' ');
  
  // Handle MIS / MIS Executive synonyms (mis, mis executive, misexective, etc.)
  if (
    lower === 'mis' ||
    lower === 'mis executive' || 
    lower === 'misexective' || 
    lower === 'mis exec' || 
    lower === 'misexecutive' ||
    lower === 'misexec' ||
    lower.includes('mis ') ||
    (lower.includes('mis') && (lower.includes('exec') || lower.includes('exe')))
  ) {
    return 'MIS Executive';
  }

  // Handle HR Head / HR-HEAD / HR_HEAD synonyms
  if (
    lower === 'hr head' ||
    lower.includes('hr head') ||
    lower.includes('hrhead') ||
    (lower.includes('hr') && lower.includes('head'))
  ) {
    return 'HR Head';
  }

  // Handle JR Accountant / Jr accountant / JR Accounant synonyms
  if (
    (lower.startsWith('jr') && (lower.includes('accountant') || lower.includes('accounant') || lower.includes('acc'))) ||
    lower.includes('junior accountant') ||
    lower.includes('jr accountant') ||
    lower.includes('jr accounant')
  ) {
    return 'Jr. Accountant';
  }
  
  // Clean up casing and format properly
  return clean.split(' ').map(word => {
    const wl = word.toLowerCase();
    if (wl === 'mis') return 'MIS';
    if (wl === 'hr') return 'HR';
    if (wl === 'qa') return 'QA';
    if (wl === 'it') return 'IT';
    if (wl === 'ui/ux' || wl === 'ui' || wl === 'ux') return wl.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// Helper to normalize unit spelling, spacing, and capitalization
export function normalizeUnit(raw: string): string {
  if (!raw) return '';
  // Trim and standardize spacing
  const clean = raw.trim().replace(/\s+/g, ' ');
  const lower = clean.toLowerCase();

  // "Ahemdabad" (with typo) or "Ahmedabad" or "AHEMDABAD" or "ahmedabad"
  if (lower.startsWith('ahm') || lower.startsWith('ahe')) {
    return 'Ahmedabad';
  }
  
  // EMB or Embroidery or EMBROIDERY
  if (lower === 'emb' || lower === 'embroidery') {
    return 'Embroidery';
  }
  
  // EHU or Eye hook unit (EHU / Eye hook unit)
  if (
    lower === 'ehu' || 
    lower === 'eye hook' || 
    lower === 'eyehook' || 
    lower === 'eye hook unit' || 
    lower === 'eyehook unit' ||
    lower.includes('eye hook') ||
    lower.includes('eye-hook') ||
    lower.includes('eyehook') ||
    lower.includes('ehu /') ||
    lower.includes('/ ehu')
  ) {
    return 'EHU / Eye Hook Unit';
  }

  // Clean up casing and format properly
  return clean.split(' ').map(word => {
    const wl = word.toLowerCase();
    if (wl === 'emb') return 'EMB';
    if (wl === 'ehu') return 'EHU';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// Find header row and parse tabular data
export function extractHeadersAndRows(values: string[][]) {
  if (!values || values.length === 0) return { headers: [], rows: [] };

  // Find first non-empty row that likely represents the header
  let headerIndex = -1;
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (row && row.some(cell => cell && typeof cell === 'string' && cell.trim() !== '')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return { headers: [], rows: [] };

  const rawHeaders = (values[headerIndex] || []).map(h => String(h).trim());
  const rows: Record<string, string>[] = [];

  for (let i = headerIndex + 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.every(cell => !cell || String(cell).trim() === '')) {
      continue; // Skip completely empty rows
    }

    const rowObj: Record<string, string> = {};
    rawHeaders.forEach((header, idx) => {
      if (header) {
        rowObj[header] = row[idx] !== undefined ? String(row[idx]).trim() : '';
      }
    });
    rows.push(rowObj);
  }

  return { headers: rawHeaders, rows };
}

// Synonyms for mapping Sheets columns safely
const SYNONYMS = {
  designation: ['required position', 'required possion', 'designation', 'desgination', 'role', 'position', 'job title', 'title', 'trade'],
  unit: ['unit', 'location', 'department', 'dept', 'branch', 'entity', 'division', 'factory', 'plant'],
  openings: ['openings', 'no of openings', 'no of opening', 'no. of. opening', 'vacancy', 'count', 'mrf count', 'needed', 'requirements'],
  status: ['status', 'stage', 'hiring status', 'mrf status', 'requisition status', 'candidate status', 'state', 'current status'],
  date: ['date', 'mrf date', 'requisition date', 'creation date', 'raised date', 'opened date', 'start date'],
  candidateName: ['candidate name', 'name', 'applicant name', 'candidate', 'applicant'],
  candidateId: ['candidate id', 'id', 'cid', 'application id', 'app id', 'candidateid'],
  appliedDate: ['applied date', 'applied', 'application date', 'date of application', 'registration date', 'date'],
  offerDate: ['offer date', 'offer made date', 'offered date', 'offered on', 'offer letter date', 'date of offer'],
  offerAcceptDate: ['offer accept date', 'offer acceptance date', 'accepted date', 'accepted on', 'date of acceptance'],
  joiningDate: ['joining date', 'date of joining', 'doj', 'joining on', 'joining_date', 'joined date', 'actual joining date'],
  source: ['source', 'source category', 'lead source', 'channel', 'referred by', 'ref source', 'platform']
};

export function parseMRF(values: string[][]): MRFRow[] {
  const { rows } = extractHeadersAndRows(values);
  return rows.map((row, idx) => {
    const designation = normalizeDesignation(getValueBySynonyms(row, SYNONYMS.designation));
    const unit = normalizeUnit(getValueBySynonyms(row, SYNONYMS.unit));
    const rawOpenings = getValueBySynonyms(row, SYNONYMS.openings);
    const status = getValueBySynonyms(row, SYNONYMS.status) || 'Open';
    const date = getValueBySynonyms(row, SYNONYMS.date);

    let openings = parseInt(rawOpenings, 10);
    if (isNaN(openings)) {
      openings = 1; // Default to 1 opening if not specified/unreadable
    }

    return {
      rowId: idx + 1,
      id: getValueBySynonyms(row, ['mrf id', 'requisition id', 'id']),
      designation: designation || 'Unknown Designation',
      unit: unit || 'Unknown Unit',
      openings,
      status,
      date,
      originalData: row
    };
  });
}

export function parseCandidates(values: string[][]): CandidateRow[] {
  const { rows } = extractHeadersAndRows(values);
  return rows.map((row, idx) => {
    const name = getValueBySynonyms(row, SYNONYMS.candidateName);
    const designation = normalizeDesignation(getValueBySynonyms(row, SYNONYMS.designation));
    const unit = normalizeUnit(getValueBySynonyms(row, SYNONYMS.unit));
    const status = getValueBySynonyms(row, SYNONYMS.status);
    const appliedDate = getValueBySynonyms(row, SYNONYMS.appliedDate);
    const offerDate = getValueBySynonyms(row, SYNONYMS.offerDate);
    const offerAcceptDate = getValueBySynonyms(row, SYNONYMS.offerAcceptDate);
    const joiningDate = getValueBySynonyms(row, SYNONYMS.joiningDate);
    const experience = getValueBySynonyms(row, ['experience', 'exp', 'years of experience', 'yr exp']);
    const source = getValueBySynonyms(row, SYNONYMS.source) || 'Direct Recruitment';

    return {
      rowId: idx + 1,
      id: getValueBySynonyms(row, SYNONYMS.candidateId),
      name: name || 'Unknown Candidate',
      designation: designation || 'Unspecified',
      unit: unit || 'Unspecified',
      status: status || 'Applied',
      experience,
      appliedDate,
      offerDate,
      offerAcceptDate,
      joiningDate,
      source,
      originalData: row
    };
  });
}

export function parseInterviews(values: string[][]): InterviewRow[] {
  const { rows } = extractHeadersAndRows(values);
  return rows.map((row, idx) => {
    const candidateName = getValueBySynonyms(row, SYNONYMS.candidateName);
    const candidateId = getValueBySynonyms(row, SYNONYMS.candidateId);
    const designation = normalizeDesignation(getValueBySynonyms(row, SYNONYMS.designation));
    const round = getValueBySynonyms(row, ['round', 'interview round', 'stage']);
    const status = getValueBySynonyms(row, SYNONYMS.status);
    const date = getValueBySynonyms(row, ['date', 'interview date', 'scheduled date', 'time']);

    return {
      rowId: idx + 1,
      candidateId,
      candidateName,
      designation,
      round,
      status,
      date,
      originalData: row
    };
  });
}

export function parseCheck(values: string[][]): CheckRow[] {
  const { rows } = extractHeadersAndRows(values);
  return rows.map((row, idx) => ({
    rowId: idx + 1,
    originalData: row
  }));
}

// Single core fetch function that fetches a range from a spreadsheet ID
export async function fetchSheetValues(spreadsheetId: string, range: string, accessToken: string): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch sheet "${range}": ${response.status} - ${errText}`);
  }

  const data: GSheetResponse = await response.json();
  return data.values || [];
}
