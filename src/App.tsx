/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  googleSignIn, 
  initAuth, 
  logout, 
  getAccessToken 
} from './lib/firebase';
import { 
  fetchSheetValues, 
  parseMRF, 
  parseCandidates, 
  parseInterviews, 
  parseCheck 
} from './lib/sheets';
import { 
  aggregateMetrics, 
  aggregatePipelineChart, 
  aggregateDesignationInsights, 
  aggregateUnitInsights, 
  extractFilterOptions 
} from './lib/metrics';
import { MRFRow, CandidateRow, InterviewRow, CheckRow, FilterState } from './types';
import { SHEETS_CONFIG } from './config/sheetsConfig';

// Icons
import { 
  Briefcase, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Database, 
  FileSpreadsheet, 
  FileText, 
  HelpCircle, 
  LayoutDashboard, 
  LogOut, 
  Mail, 
  Percent, 
  RefreshCw, 
  Search, 
  Sparkles, 
  User, 
  Users, 
  X 
} from 'lucide-react';

// Subcomponents
import KPICard from './components/KPICard';
import FiltersPanel from './components/FiltersPanel';
import ChartsView from './components/ChartsView';
import TableView from './components/TableView';

// Helper to convert column letters (e.g., 'A', 'B', 'AB') to 0-based index
const colLetterToIdx = (letter: string): number => {
  let column = 0;
  const cleanLetter = letter.toUpperCase().trim();
  for (let i = 0; i < cleanLetter.length; i++) {
    column = column * 26 + (cleanLetter.charCodeAt(i) - 64);
  }
  return column - 1; // 0-indexed
};

// Helper to sum a column in a raw string list
const sumRawColumn = (sheet: any[][], colLetter: string): number => {
  if (!sheet || sheet.length === 0) return 0;
  const colIdx = colLetterToIdx(colLetter);
  
  // Find first non-empty row (header)
  let headerIdx = -1;
  for (let i = 0; i < sheet.length; i++) {
    if (sheet[i] && sheet[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return 0;
  
  let sum = 0;
  let hasNumbers = false;
  for (let i = headerIdx + 1; i < sheet.length; i++) {
    const row = sheet[i];
    if (row && row[colIdx] !== undefined && row[colIdx] !== null) {
      const valStr = String(row[colIdx]).trim().replace(/,/g, '');
      if (valStr !== '') {
        const num = parseFloat(valStr);
        if (!isNaN(num)) {
          sum += num;
          hasNumbers = true;
        }
      }
    }
  }
  return hasNumbers ? sum : 0;
};

// Helper to count non-empty entries (equivalent to COUNTA) in a column
const countaRawColumn = (sheet: any[][], colLetter: string): number => {
  if (!sheet || sheet.length === 0) return 0;
  const colIdx = colLetterToIdx(colLetter);
  
  // Find first non-empty row as header
  let headerIdx = -1;
  for (let i = 0; i < sheet.length; i++) {
    if (sheet[i] && sheet[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return 0;
  
  let count = 0;
  for (let i = headerIdx + 1; i < sheet.length; i++) {
    const row = sheet[i];
    if (row && row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '') {
      count++;
    }
  }
  return count;
};

// Helper to count a specific status/keyword in a column of a raw sheet
const countValueInRawColumn = (sheet: any[][], colLetter: string, targetValue: string): number => {
  if (!sheet || sheet.length === 0) return 0;
  const colIdx = colLetterToIdx(colLetter);
  
  // Find first non-empty row as header
  let headerIdx = -1;
  for (let i = 0; i < sheet.length; i++) {
    if (sheet[i] && sheet[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return 0;
  
  let count = 0;
  for (let i = headerIdx + 1; i < sheet.length; i++) {
    const row = sheet[i];
    if (row && row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim().toLowerCase() === targetValue.toLowerCase()) {
      count++;
    }
  }
  return count;
};

function sanitizeSpreadsheetId(id: string): string {
  if (!id) return '';
  let cleaned = id.trim();
  
  // Extract ID from full URL if the user pasted a complete spreadsheet link
  if (cleaned.includes('/d/')) {
    const matches = cleaned.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      cleaned = matches[1];
    }
  }

  // Handle accidental double duplication (e.g. ID pasted twice without spaces, resulting in 88+ characters)
  if (cleaned.length > 20 && cleaned.length % 2 === 0) {
    const halfLen = cleaned.length / 2;
    const firstHalf = cleaned.substring(0, halfLen);
    const secondHalf = cleaned.substring(halfLen);
    if (firstHalf === secondHalf) {
      cleaned = firstHalf;
    }
  }

  return cleaned;
}

const DEFAULT_SPREADSHEET_ID = SHEETS_CONFIG.appsScriptUrl || SHEETS_CONFIG.spreadsheetId || '';

export default function App() {
  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [signInLoading, setSignInLoading] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Connection settings
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    const savedUrl = localStorage.getItem('recruitment_apps_script_url');
    const savedId = localStorage.getItem('recruitment_spreadsheet_id');
    if (savedUrl || savedId) return false;
    return !SHEETS_CONFIG.appsScriptUrl;
  });
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    const rawVal = localStorage.getItem('recruitment_apps_script_url') || localStorage.getItem('recruitment_spreadsheet_id') || SHEETS_CONFIG.appsScriptUrl || SHEETS_CONFIG.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    if (rawVal.startsWith('https://script.google.com/') || rawVal.includes('/macros/')) {
      return rawVal;
    }
    return sanitizeSpreadsheetId(rawVal);
  });
  const [customSpreadsheetId, setCustomSpreadsheetId] = useState<string>(() => {
    const rawVal = localStorage.getItem('recruitment_spreadsheet_id') || SHEETS_CONFIG.spreadsheetId || '';
    return sanitizeSpreadsheetId(rawVal);
  });
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem('recruitment_apps_script_url') || SHEETS_CONFIG.appsScriptUrl || '';
  });
  const [editingSpreadsheetId, setEditingSpreadsheetId] = useState<string>(() => {
    const rawVal = localStorage.getItem('recruitment_spreadsheet_id') || SHEETS_CONFIG.spreadsheetId || '';
    return sanitizeSpreadsheetId(rawVal);
  });
  const [editingAppsScriptUrl, setEditingAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem('recruitment_apps_script_url') || SHEETS_CONFIG.appsScriptUrl || '';
  });
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Live Sheet Data state
  const [mrfs, setMrfs] = useState<MRFRow[]>(() => {
    try {
      const cached = localStorage.getItem('cached_mrfs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [candidates, setCandidates] = useState<CandidateRow[]>(() => {
    try {
      const cached = localStorage.getItem('cached_candidates');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [interviews, setInterviews] = useState<InterviewRow[]>(() => {
    try {
      const cached = localStorage.getItem('cached_interviews');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [checks, setChecks] = useState<CheckRow[]>(() => {
    try {
      const cached = localStorage.getItem('cached_checks');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Raw Sheet Matrices for direct KPI calculations (COUNTA, sums by column letters)
  const [rawMrf, setRawMrf] = useState<string[][]>(() => {
    try {
      const cached = localStorage.getItem('cached_raw_mrf');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [rawCandidates, setRawCandidates] = useState<string[][]>(() => {
    try {
      const cached = localStorage.getItem('cached_raw_candidates');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [rawInterviews, setRawInterviews] = useState<string[][]>(() => {
    try {
      const cached = localStorage.getItem('cached_raw_interviews');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [rawCheck, setRawCheck] = useState<string[][]>(() => {
    try {
      const cached = localStorage.getItem('cached_raw_check');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Loading & Error notifications
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return localStorage.getItem('cached_last_synced_time') || 'Ready';
  });

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    designation: '',
    unit: '',
    timeframe: 'all',
    specificPeriod: '',
    searchQuery: '',
  });

  // Watch Authentication State
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsDemoMode(false);
        setAuthInitialized(true);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthInitialized(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Auto-sanitize corrupt local storage values on mount
  useEffect(() => {
    const storedId = localStorage.getItem('recruitment_spreadsheet_id');
    if (storedId) {
      const sanitized = sanitizeSpreadsheetId(storedId);
      if (sanitized !== storedId) {
        localStorage.setItem('recruitment_spreadsheet_id', sanitized);
        setCustomSpreadsheetId(sanitized);
        setEditingSpreadsheetId(sanitized);
        setSpreadsheetId(prev => {
          if (prev.startsWith('https://script.google.com/') || prev.includes('/macros/')) {
            return prev;
          }
          return sanitized;
        });
      }
    }
  }, []);

  // Sync Google Sheet Data
  const syncGoogleSheets = async (targetId: string, currentToken: string | null, triggerType: 'auto' | 'manual' = 'auto') => {
    // Determine active spreadsheet ID (either targetId or customSpreadsheetId)
    let activeSpreadsheetId = customSpreadsheetId || SHEETS_CONFIG.spreadsheetId;
    if (targetId && !targetId.startsWith('https://script.google.com/') && !targetId.includes('/macros/')) {
      activeSpreadsheetId = targetId;
    }
    activeSpreadsheetId = sanitizeSpreadsheetId(activeSpreadsheetId);

    // Determine Apps Script URL to fetch
    const activeAppsScriptUrl = appsScriptUrl || SHEETS_CONFIG.appsScriptUrl;

    // Determine whether we are fetching through Apps Script or standard OAuth Sheets API
    const isAppsScriptUrl = targetId.startsWith('https://script.google.com/') || targetId.includes('/macros/') || !!activeAppsScriptUrl;
    const finalTargetId = isAppsScriptUrl ? (targetId.startsWith('https://script.google.com/') ? targetId : activeAppsScriptUrl) : targetId;

    if (!isAppsScriptUrl && !currentToken) {
      if (triggerType === 'manual') {
        setSyncError('Authentication token is missing. Please sign in with Google or use Google Apps Script.');
      }
      return;
    }

    setSyncing(true);
    if (triggerType === 'manual') {
      setSyncError(null);
    }

    try {
      let rawMrf: string[][] = [];
      let rawCandidates: string[][] = [];
      let rawInterviews: string[][] = [];
      let rawCheck: string[][] = [];

      if (isAppsScriptUrl) {
        // Construct target URL with parameter updates
        let finalUrl = finalTargetId;
        try {
          const urlObj = new URL(finalTargetId);
          if (activeSpreadsheetId) {
            urlObj.searchParams.set('spreadsheetId', activeSpreadsheetId);
          }
          if (SHEETS_CONFIG.tabs.mrf) {
            urlObj.searchParams.set('tabMRF', SHEETS_CONFIG.tabs.mrf);
          }
          if (SHEETS_CONFIG.tabs.candidates) {
            urlObj.searchParams.set('tabCandidates', SHEETS_CONFIG.tabs.candidates);
          }
          if (SHEETS_CONFIG.tabs.interviews) {
            urlObj.searchParams.set('tabInterviews', SHEETS_CONFIG.tabs.interviews);
          }
          if (SHEETS_CONFIG.tabs.check) {
            urlObj.searchParams.set('tabCheck', SHEETS_CONFIG.tabs.check);
          }
          finalUrl = urlObj.toString();
        } catch (e) {
          console.warn('Could not parse target URL as URL object, fetching raw URL instead:', e);
        }

        // Fetch everything from Google Apps Script in a single fast call
        const response = await fetch(finalUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch from Google Apps Script: ${response.statusText}`);
        }
        const data = await response.json();
        
        // Handle custom application errors output by the script
        if (data && data.error) {
          throw new Error(data.error);
        }
        
        // Match the configured sheets tab names or standard fallbacks
        const mrfKey = SHEETS_CONFIG.tabs.mrf;
        const candidatesKey = SHEETS_CONFIG.tabs.candidates;
        const interviewsKey = SHEETS_CONFIG.tabs.interviews;
        const checkKey = SHEETS_CONFIG.tabs.check;

        rawMrf = data[mrfKey] || data.MRF || [];
        rawCandidates = data[candidatesKey] || data.Candidates || [];
        rawInterviews = data[interviewsKey] || data.Interviews || [];
        rawCheck = data[checkKey] || data.check || [];
      } else {
        // Fetch 4 tabs in parallel using Google Sheets REST API V4
        const [resMrf, resCandidates, resInterviews, resCheck] = await Promise.all([
          fetchSheetValues(targetId, 'MRF!A1:Z500', currentToken!).catch(err => {
            console.warn('Failed to fetch MRF page:', err);
            return [];
          }),
          fetchSheetValues(targetId, 'Candidates!A1:Z1500', currentToken!).catch(err => {
            console.warn('Failed to fetch Candidates page:', err);
            return [];
          }),
          fetchSheetValues(targetId, 'Interviews!A1:Z1500', currentToken!).catch(err => {
            console.warn('Failed to fetch Interviews page:', err);
            return [];
          }),
          fetchSheetValues(targetId, 'check!A1:Z1000', currentToken!).catch(err => {
            console.warn('Failed to fetch check page:', err);
            return [];
          }),
        ]);
        rawMrf = resMrf;
        rawCandidates = resCandidates;
        rawInterviews = resInterviews;
        rawCheck = resCheck;
      }

      if (rawMrf.length === 0 && rawCandidates.length === 0) {
        throw new Error('Spreadsheet pages could not be fetched or tabs are completely empty. Please confirm that your Google Sheet has tab sheets named exactly "MRF", "Candidates", "Interviews", "check".');
      }

      // Parse loaded matrices
      const parsedMrf = parseMRF(rawMrf);
      const parsedCandidates = parseCandidates(rawCandidates);
      const parsedInterviews = parseInterviews(rawInterviews);
      const parsedCheck = parseCheck(rawCheck);

      setMrfs(parsedMrf);
      setCandidates(parsedCandidates);
      setInterviews(parsedInterviews);
      setChecks(parsedCheck);

      setRawMrf(rawMrf);
      setRawCandidates(rawCandidates);
      setRawInterviews(rawInterviews);
      setRawCheck(rawCheck);

      // Save to cache for instant sub-second future boots
      try {
        localStorage.setItem('cached_mrfs', JSON.stringify(parsedMrf));
        localStorage.setItem('cached_candidates', JSON.stringify(parsedCandidates));
        localStorage.setItem('cached_interviews', JSON.stringify(parsedInterviews));
        localStorage.setItem('cached_checks', JSON.stringify(parsedCheck));
        localStorage.setItem('cached_raw_mrf', JSON.stringify(rawMrf));
        localStorage.setItem('cached_raw_candidates', JSON.stringify(rawCandidates));
        localStorage.setItem('cached_raw_interviews', JSON.stringify(rawInterviews));
        localStorage.setItem('cached_raw_check', JSON.stringify(rawCheck));
        localStorage.setItem('cached_last_synced_time', new Date().toLocaleTimeString());
      } catch (cacheErr) {
        console.warn('Failed to commit cache:', cacheErr);
      }

      setIsDemoMode(false);
      setLastSyncedTime(new Date().toLocaleTimeString());
      setSyncError(null);
    } catch (err: any) {
      console.warn('Sync connection warning:', err);
      let friendlyMessage = err.message || String(err);
      if (friendlyMessage.includes('403') || friendlyMessage.includes('permission') || friendlyMessage.includes('Forbidden')) {
        friendlyMessage = 'Permission Denied (403). Please make sure you have authorized with the Google Account that has access to this spreadsheet, or verify that the file isn\'t protected by your enterprise domains.';
      } else if (friendlyMessage.includes('404') || friendlyMessage.includes('not found') || friendlyMessage.includes('NotFound')) {
        friendlyMessage = 'Spreadsheet Not Found (404). Please double-check that your spreadsheet ID is exactly correct and your internet connection is active.';
      } else if (friendlyMessage.includes('400') || friendlyMessage.includes('invalid') || friendlyMessage.includes('BadRequest')) {
        friendlyMessage = 'Invalid Request (400). Please check if your sheet tabs are named exactly "MRF", "Candidates", "Interviews", "check" (case-sensitive) and contain valid database header rows.';
      }
      
      if (triggerType === 'manual') {
        setSyncError(friendlyMessage);
      } else {
        console.warn('Automatic initial Google Sheet fetch skipped or offline.');
      }
      
      setIsDemoMode(true); // Fallback to demo mode so user understands stale visuals
    } finally {
      setSyncing(false);
    }
  };

  // Perform sync when logged in or when user alters Spreadsheet ID / Apps Script Web App URL
  useEffect(() => {
    // Determine whether we have configured custom credentials
    const activeAppsScriptUrl = appsScriptUrl || SHEETS_CONFIG.appsScriptUrl;
    const isAppsScriptUrl = spreadsheetId.startsWith('https://script.google.com/') || spreadsheetId.includes('/macros/') || !!activeAppsScriptUrl;

    if (isAppsScriptUrl) {
      const fetchId = spreadsheetId.startsWith('https://script.google.com/') ? spreadsheetId : activeAppsScriptUrl;
      syncGoogleSheets(fetchId, null);
    } else if (accessToken) {
      syncGoogleSheets(spreadsheetId, accessToken);
    } else {
      // Initial state is cleanly empty
      setMrfs([]);
      setCandidates([]);
      setInterviews([]);
      setChecks([]);
      setIsDemoMode(true);
      setLastSyncedTime('Ready');
    }
  }, [accessToken, spreadsheetId, appsScriptUrl]);

  const handleSignIn = async () => {
    if (signInLoading) return;
    setSignInLoading(true);
    setSyncError(null);
    try {
      const authResult = await googleSignIn();
      if (authResult) {
        setUser(authResult.user);
        setAccessToken(authResult.accessToken);
        setIsDemoMode(false);
      }
    } catch (err: any) {
      console.error('Sign-in failed', err);
      const errMsg = err?.message || String(err);
      if (
        !errMsg.includes('auth/cancelled-popup-request') &&
        !errMsg.includes('popup-closed-by-user') &&
        !errMsg.includes('auth/popup-closed-by-user')
      ) {
        setSyncError(`Sign-in failed: ${errMsg}`);
      }
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setIsDemoMode(true);
    setFilters({
      designation: '',
      unit: '',
      timeframe: 'all',
      specificPeriod: '',
      searchQuery: '',
    });
  };

  const saveCustomSpreadsheetId = () => {
    const trimmedId = editingSpreadsheetId.trim();
    const trimmedUrl = editingAppsScriptUrl.trim();

    const finalId = sanitizeSpreadsheetId(trimmedId);

    setCustomSpreadsheetId(finalId);
    setSpreadsheetId(finalId);
    setEditingSpreadsheetId(finalId);
    localStorage.setItem('recruitment_spreadsheet_id', finalId);

    setAppsScriptUrl(trimmedUrl);
    setEditingAppsScriptUrl(trimmedUrl);
    localStorage.setItem('recruitment_apps_script_url', trimmedUrl);

    setShowConfigModal(false);
    setIsDemoMode(false);

    // Sync automatically with updated settings
    if (trimmedUrl) {
      syncGoogleSheets(trimmedUrl, null, 'manual');
    } else if (finalId && (finalId.startsWith('https://script.google.com/') || finalId.includes('/macros/'))) {
      syncGoogleSheets(finalId, null, 'manual');
    } else if (accessToken) {
      syncGoogleSheets(finalId, accessToken, 'manual');
    } else {
      setSyncError('Saved custom Google Sheets configurations! Click "Connect Google Sheets" or click the "Sync Sheets" (or manual refresh button) to pull its real data.');
    }
  };

  const resetToDefaults = () => {
    localStorage.removeItem('recruitment_spreadsheet_id');
    localStorage.removeItem('recruitment_apps_script_url');
    
    // Clear cached sheets data
    localStorage.removeItem('cached_mrfs');
    localStorage.removeItem('cached_candidates');
    localStorage.removeItem('cached_interviews');
    localStorage.removeItem('cached_checks');
    localStorage.removeItem('cached_raw_mrf');
    localStorage.removeItem('cached_raw_candidates');
    localStorage.removeItem('cached_raw_interviews');
    localStorage.removeItem('cached_raw_check');
    localStorage.removeItem('cached_last_synced_time');

    setCustomSpreadsheetId('');
    const defaultUrl = SHEETS_CONFIG.appsScriptUrl || '';
    const defaultId = SHEETS_CONFIG.spreadsheetId || '';
    
    setSpreadsheetId(defaultUrl || defaultId);
    setEditingSpreadsheetId(defaultId);
    setAppsScriptUrl(defaultUrl);
    setEditingAppsScriptUrl(defaultUrl);
    
    setSyncError(null);
    setShowConfigModal(false);
    
    // Automatically trigger fresh sync using the newly reset defaults from sheetsConfig
    if (defaultUrl) {
      syncGoogleSheets(defaultUrl, null, 'manual');
    } else if (defaultId && accessToken) {
      syncGoogleSheets(defaultId, accessToken, 'manual');
    } else {
      setMrfs([]);
      setCandidates([]);
      setInterviews([]);
      setChecks([]);
      
      // Reset raw state matrices
      setRawMrf([]);
      setRawCandidates([]);
      setRawInterviews([]);
      setRawCheck([]);

      setIsDemoMode(true);
      setLastSyncedTime('Ready');
    }
  };

  // Trigger manual refresh
  const triggerRefresh = () => {
    const activeAppsScriptUrl = appsScriptUrl || SHEETS_CONFIG.appsScriptUrl;
    const isAppsScriptUrl = spreadsheetId.startsWith('https://script.google.com/') || spreadsheetId.includes('/macros/') || !!activeAppsScriptUrl;

    if (isAppsScriptUrl) {
      const fetchId = (spreadsheetId.startsWith('https://script.google.com/') || spreadsheetId.includes('/macros/')) ? spreadsheetId : activeAppsScriptUrl;
      syncGoogleSheets(fetchId, null, 'manual');
    } else if (accessToken) {
      syncGoogleSheets(spreadsheetId, accessToken, 'manual');
    } else {
      // Just toast / pulse mock data sync for feedback on Demo Mode
      setSyncing(true);
      setTimeout(() => {
        setSyncing(false);
        setLastSyncedTime(new Date().toLocaleTimeString() + ' (Demo Mode Refreshed)');
      }, 600);
    }
  };

  // Compute calculated metrics & option fields
  const activeMetrics = aggregateMetrics(mrfs, candidates, interviews, filters);
  const filterOptions = extractFilterOptions(mrfs, candidates, interviews);

  // Check if any filter is active so that KPIs are interconnected
  const hasActiveFilter = !!(filters.designation || filters.unit || filters.timeframe !== 'all' || filters.searchQuery);

  // Dynamically calculate KPIs according to direct Google Sheets column formulas requested by user
  const checkJoined = (!hasActiveFilter && rawCheck.length > 0) ? sumRawColumn(rawCheck, 'I') : activeMetrics.joinedCount;
  const checkOpening = (!hasActiveFilter && rawCheck.length > 0) ? sumRawColumn(rawCheck, 'D') : activeMetrics.totalOpenings;
  const checkRemaining = (!hasActiveFilter && rawCheck.length > 0) ? sumRawColumn(rawCheck, 'J') : activeMetrics.openPositionsCount;
  
  const fillRateDivisor = checkOpening > 0 ? checkOpening : (checkRemaining > 0 ? checkRemaining : (activeMetrics.totalOpenings || 1));
  const fillRatePercentage = (checkJoined / (fillRateDivisor || 1)) * 100;

  const totalApplicantVal = (!hasActiveFilter && rawInterviews.length > 0) ? countaRawColumn(rawInterviews, 'B') : activeMetrics.appliedCount;
  const totalJoinedVal = checkJoined;
  const totalOpeningVal = checkOpening;
  const openPositionsVal = checkRemaining;
  const fillRateLabel = `${fillRatePercentage.toFixed(0)}%`;
  const totalAcceptedVal = (!hasActiveFilter && rawInterviews.length > 0) ? countValueInRawColumn(rawInterviews, 'AP', 'Accepted') : activeMetrics.offerAcceptedCount;
  const shortlistedR1Val = (!hasActiveFilter && rawInterviews.length > 0) ? countValueInRawColumn(rawInterviews, 'T', 'Shortlisted') : activeMetrics.shortlistedR1Count;
  const shortlistedR2Val = (!hasActiveFilter && rawInterviews.length > 0) ? countValueInRawColumn(rawInterviews, 'AB', 'Shortlisted') : activeMetrics.shortlistedR2Count;

  // Compute data subsets for Recharts graphs
  const monthlyTimeline = aggregatePipelineChart(candidates);
  const designationInsightsList = aggregateDesignationInsights(candidates, mrfs);
  const unitInsightsList = aggregateUnitInsights(candidates);

  return (
    <div id="recruitment-portal-container" className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans flex flex-col antialiased transition-colors duration-200">
      {/* 1. Header Navigation Rail */}
      <header className="bg-white dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <img 
            referrerPolicy="no-referrer" 
            src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500" 
            alt="GINZA Logo" 
            className="h-9 w-auto object-contain rounded-md border border-slate-200/80 bg-white p-0.5 shadow-2xs" 
          />
          <div className="h-7 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-black dark:text-black flex items-center gap-2">
              HR Recruitment Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              GINZA GLOBAL RECRUITMENT OPERATIONS
            </p>
          </div>
        </div>

        {/* Sync Status Info & Manual Refresh Trigger */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5 bg-slate-50 dark:bg-slate-800/55 border border-slate-150 dark:border-slate-800 rounded-xl px-3.5 py-1.5 select-none">
            {syncing ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            ) : syncError ? (
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            ) : (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            
            <div className="flex flex-col text-left text-xs">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                {syncing ? 'Syncing...' : syncError ? 'Connection Issue' : 'Live Google Sheet'}
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-350 font-semibold leading-tight">
                {syncError ? 'Review Settings' : lastSyncedTime || 'Syncing now...'}
              </span>
            </div>

            <button
              onClick={() => {
                const activeAppsScriptUrl = appsScriptUrl || SHEETS_CONFIG.appsScriptUrl;
                const isAppsScriptUrl = spreadsheetId.startsWith('https://script.google.com/') || spreadsheetId.includes('/macros/') || !!activeAppsScriptUrl;
                const fetchId = isAppsScriptUrl ? (spreadsheetId.startsWith('https://script.google.com/') ? spreadsheetId : activeAppsScriptUrl) : spreadsheetId;
                syncGoogleSheets(fetchId, null, 'manual');
              }}
              disabled={syncing}
              title="Refresh Live Data"
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-755 rounded-lg transition-colors cursor-pointer ml-1 disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            <button
              onClick={() => {
                setEditingSpreadsheetId(customSpreadsheetId || SHEETS_CONFIG.spreadsheetId);
                setEditingAppsScriptUrl(appsScriptUrl || SHEETS_CONFIG.appsScriptUrl);
                setShowConfigModal(true);
              }}
              title="Configure Google Sheet Sync"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-755 rounded-lg transition-colors cursor-pointer ml-1.5"
            >
              <Database className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Error Display Banner */}
      {syncError && (
        <div className="bg-rose-50 border-b border-rose-150 py-4 px-6 flex items-start space-x-3 text-xs text-rose-800">
          <HelpCircle className="h-5 w-5 text-rose-500 shrink-0 self-center" />
          <div className="flex-1">
            <span className="font-bold">Google Sheet Connection Alert:</span> {syncError}
            <div className="mt-2 text-[11px] text-slate-600 bg-white/70 border border-slate-200/50 rounded-lg p-2.5 space-y-1">
              <p className="font-bold text-slate-700">How to establish connection successfully:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Make sure your Google Sheets configurations inside the code file <code className="bg-slate-100 px-1 font-mono text-rose-600 select-all">/src/config/sheetsConfig.ts</code> match your spreadsheet exactly.</li>
                <li>Ensure that your Google Sheets file contains tab pages named exactly: <strong className="font-bold text-slate-800">MRF</strong>, <strong className="font-bold text-slate-800">Candidates</strong>, <strong className="font-bold text-slate-800">Interviews</strong>, and <strong className="font-bold text-slate-800">check</strong> (case-sensitive).</li>
                <li>Your Google Apps Script Web App must be deployed with parameter Execute As set to <strong className="font-bold">"Me"</strong> and Who has access set to <strong className="font-bold">"Anyone"</strong>. Do not choose only "Myself".</li>
              </ol>
            </div>
            
            {/* Direct recovery actions inside the banner */}
            <div className="mt-3 flex items-center gap-2.5">
              <button
                onClick={resetToDefaults}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer text-[10.5px] border border-rose-700"
              >
                Reset to Code File Defaults
              </button>
              <button
                onClick={() => {
                  setEditingSpreadsheetId(customSpreadsheetId || SHEETS_CONFIG.spreadsheetId);
                  setEditingAppsScriptUrl(appsScriptUrl || SHEETS_CONFIG.appsScriptUrl);
                  setShowConfigModal(true);
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-lg shadow-xs transition-colors cursor-pointer text-[10.5px]"
              >
                Open Connection Panel
              </button>
            </div>
          </div>
          <button onClick={() => setSyncError(null)} className="hover:bg-rose-150 p-1.5 rounded transition-colors self-start">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}



      {/* Main Container */}
      <main className="flex-1 p-6 space-y-6 w-full max-w-none">
        
        {/* Filters Panel */}
        <FiltersPanel 
          id="filters-navigation-panel"
          filters={filters}
          setFilters={setFilters}
          options={filterOptions}
          onRefresh={triggerRefresh}
          loading={syncing && mrfs.length === 0}
        />

        {/* 4. Unified key performance indicators (KPIs) exactly matching user requirements */}
        <section id="unified-kpi-grid-section" className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Performance Indicators (KPIs)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KPICard
              id="kpi-total-applicant"
              title="Total Applicant"
              value={totalApplicantVal}
              iconName="Users"
              description="Candidates applied for role"
              colorTheme="blue"
              loading={syncing && mrfs.length === 0}
            />
            <KPICard
              id="kpi-total-joined"
              title="Total Joined"
              value={totalJoinedVal}
              iconName="CheckCircle"
              description="Onboarded candidates"
              colorTheme="green"
              loading={syncing && mrfs.length === 0}
            />
            <KPICard
              id="kpi-total-opening"
              title="Total Opening"
              value={totalOpeningVal}
              iconName="Briefcase"
              description="Hiring targets from MRF"
              colorTheme="indigo"
              loading={syncing && mrfs.length === 0}
            />
            <KPICard
              id="kpi-open-positions"
              title="Open Positions (Remaining)"
              value={openPositionsVal}
              iconName="HelpCircle"
              description="Active active vacancies"
              colorTheme="amber"
              loading={syncing && mrfs.length === 0}
            />
            <KPICard
              id="kpi-fill-rate"
              title="Fill Rate (Joins Vs Opening)"
              value={fillRateLabel}
              iconName="Percent"
              description="Joins vs Opening ratio"
              colorTheme="teal"
              loading={syncing && mrfs.length === 0}
            />
            <KPICard
              id="kpi-total-accepted"
              title="Total Accepted"
              value={totalAcceptedVal}
              iconName="FileText"
              description="Offer letters signed"
              colorTheme="orange"
              loading={syncing && mrfs.length === 0}
            />
            <KPICard
              id="kpi-r1-selected"
              title="1st Round Selected"
              value={shortlistedR1Val}
              iconName="CheckCircle"
              description="Cleared screening round"
              colorTheme="teal"
              loading={syncing && mrfs.length === 0}
            />
            <KPICard
              id="kpi-r2-selected"
              title="2nd Round Selected"
              value={shortlistedR2Val}
              iconName="CheckCircle"
              description="Cleared final assessment"
              colorTheme="indigo"
              loading={syncing && mrfs.length === 0}
            />
          </div>
        </section>

        {/* 7. Analytical Insights & Visualizations (10 Charts & Analytical Tables Panel) */}
        <section id="analytical-insights-section" className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Analytical Insights & Visualizations</h2>
          <ChartsView 
            id="analytical-insights-charts"
            mrfs={mrfs}
            candidates={candidates}
            interviews={interviews}
            filters={filters}
            rawInterviews={rawInterviews}
            rawMrf={rawMrf}
            rawCheck={rawCheck}
          />
        </section>

        {/* Tabular Inspector Spreadsheet */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tabs Detail Spreadsheet Inspector</h2>
          <TableView 
            id="detailed-table-explorer"
            mrfs={mrfs}
            candidates={candidates}
            interviews={interviews}
            checks={checks}
            searchQuery={filters.searchQuery}
          />
        </section>
      </main>



      {/* Footer credits */}
      <footer className="bg-white border-t border-slate-100 text-center py-6 text-xs text-slate-400 select-none font-medium">
        Recruitment Intelligence Dashboard &bull; Powered by Google Sheets Rest API
      </footer>

      {/* Google Sheets Config Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfigModal(false)}
              className="absolute inset-0 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs"
            />
            
            {/* Modal card content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 text-left z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Google Sheets Connection Panel</h3>
                    <p className="text-[11px] text-slate-450 dark:text-slate-400">Establish dynamic sync with your live spreadsheet</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Controls */}
              <div className="space-y-4 text-xs">
                {/* Spreadsheet ID */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Google Spreadsheet ID or URL (Live Sheet)
                  </label>
                  <input
                    type="text"
                    value={editingSpreadsheetId}
                    onChange={(e) => setEditingSpreadsheetId(e.target.value)}
                    placeholder="e.g., 1vm0QcEvXniTJhLZEhegemqncddZgaExsyP6ONlJKyK8"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 text-slate-850 dark:text-slate-100 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    This is the long alphanumeric code in your Sheet's URL. E.g. https://docs.google.com/spreadsheets/d/<span className="font-extrabold text-blue-500 font-mono">YOUR_ID_HERE</span>/edit
                  </p>
                </div>

                {/* Web App URL */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Google Apps Script Web App URL (/exec URL)
                  </label>
                  <input
                    type="text"
                    value={editingAppsScriptUrl}
                    onChange={(e) => setEditingAppsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 text-slate-855 dark:text-slate-100 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Paste your deployed Web App link ending in <span className="font-mono font-bold text-teal-600">/exec</span> to fetch live data instantly without Google popup auth barriers.
                  </p>
                </div>

                {/* Tab Info Alert */}
                <div className="p-3 bg-amber-50/50 dark:bg-amber-955/15 border border-amber-100/40 dark:border-amber-900/30 rounded-xl text-amber-700 dark:text-amber-400 text-[10.5px] leading-relaxed">
                  <span className="font-bold">Required Sheet Tabs Alert:</span> Your spreadsheet MUST contain sheets named exactly <strong>MRF</strong>, <strong>Candidates</strong>, <strong>Interviews</strong>, and <strong>check</strong> (case-insensitive).
                </div>

                {/* Google Apps Script Code block drawer */}
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
                  <div className="px-3.5 py-2 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                      Google Apps Script Snippet (Copy this)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const codeText = `function doGet(e) {
  var defaultSpreadsheetId = "${editingSpreadsheetId || "1vm0QcEvXniTJhLZEhegemqncddZgaExsyP6ONlJKyK8"}"; 
  var spreadsheetId = defaultSpreadsheetId;
  if (e && e.parameter && e.parameter.spreadsheetId) {
    spreadsheetId = e.parameter.spreadsheetId;
  }
  var tabMRF = (e && e.parameter && e.parameter.tabMRF) || "MRF";
  var tabCandidates = (e && e.parameter && e.parameter.tabCandidates) || "Candidates";
  var tabInterviews = (e && e.parameter && e.parameter.tabInterviews) || "Interviews";
  var tabCheck = (e && e.parameter && e.parameter.tabCheck) || "check";
  var ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      error: "Could not open spreadsheet ID '" + spreadsheetId + "'. Please ensure: (1) Anyone with link is set as Viewer. (2) Apps Script is set to execute as Me with access Anyone."
    })).setMimeType(ContentService.MimeType.JSON);
  }
  var getSheetValues = function(expectedName) {
    var sheet = ss.getSheetByName(expectedName);
    if (!sheet) {
      var allSheets = ss.getSheets();
      for (var i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getName().toLowerCase().trim() === expectedName.toLowerCase().trim()) {
          sheet = allSheets[i];
          break;
        }
      }
    }
    if (!sheet) return [];
    var range = sheet.getDataRange();
    if (!range) return [];
    return range.getValues();
  };
  var data = {
    MRF: getSheetValues(tabMRF),
    Candidates: getSheetValues(tabCandidates),
    Interviews: getSheetValues(tabInterviews),
    check: getSheetValues(tabCheck),
    syncedAt: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;
                        navigator.clipboard.writeText(codeText);
                        alert("Google Apps Script code copied to clipboard successfully!");
                      }}
                      className="px-2 py-1 text-[9.5px] font-extrabold text-blue-600 bg-blue-55 hover:bg-blue-100 rounded-md transition-colors border border-blue-100 cursor-pointer"
                    >
                      Copy Script
                    </button>
                  </div>
                  <pre className="p-3 text-[9.5px] font-mono whitespace-pre text-slate-600 dark:text-slate-405 overflow-x-auto max-h-40 leading-relaxed">
{`function doGet(e) {
  var defaultSpreadsheetId = "${editingSpreadsheetId || "YOUR_SPREADSHEET_ID"}"; 
  var spreadsheetId = defaultSpreadsheetId;
  
  if (e && e.parameter && e.parameter.spreadsheetId) {
    spreadsheetId = e.parameter.spreadsheetId;
  }
  
  var tabMRF = (e && e.parameter && e.parameter.tabMRF) || "MRF";
  var tabCandidates = (e && e.parameter && e.parameter.tabCandidates) || "Candidates";
  var tabInterviews = (e && e.parameter && e.parameter.tabInterviews) || "Interviews";
  var tabCheck = (e && e.parameter && e.parameter.tabCheck) || "check";
  
  var ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      error: "Error opening Spreadsheet: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var getSheetValues = function(expectedName) {
    var sheet = ss.getSheetByName(expectedName);
    if (!sheet) {
      var allSheets = ss.getSheets();
      for (var i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getName().toLowerCase().trim() === expectedName.toLowerCase().trim()) {
          sheet = allSheets[i];
          break;
        }
      }
    }
    if (!sheet) return [];
    var range = sheet.getDataRange();
    if (!range) return [];
    return range.getValues();
  };
  
  var data = {
    MRF: getSheetValues(tabMRF),
    Candidates: getSheetValues(tabCandidates),
    Interviews: getSheetValues(tabInterviews),
    check: getSheetValues(tabCheck),
    syncedAt: new Date().toISOString()
  };
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`}
                  </pre>
                </div>
              </div>

              {/* Deployment Instructions Step checklist */}
              <div className="space-y-2 text-[11px] leading-relaxed dark:text-slate-350">
                <span className="font-black uppercase text-[10px] text-slate-500 tracking-wider">Deployment Steps:</span>
                <ol className="list-decimal pl-4 text-slate-500 space-y-1 text-[10px]">
                  <li>In your Google Sheet, click <strong>Extensions</strong> &rarr; <strong>Apps Script</strong>.</li>
                  <li>Paste the copied script and click the top **Save** disk icon.</li>
                  <li>Click <strong>Deploy</strong> &rarr; <strong>New Deployment</strong>. Click the gear icon next to Select Type, select <strong>Web App</strong>.</li>
                  <li>Under Execute As select <strong>Me</strong>, and under Who has access select <strong>Anyone</strong>.</li>
                  <li>Deploy and copy the generated Web App URL. Paste it in the input above.</li>
                </ol>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={resetToDefaults}
                  className="px-4 py-2 text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl transition-colors cursor-pointer mr-auto border border-amber-200/30 dark:border-amber-900/10"
                >
                  Reset to Code File Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCustomSpreadsheetId}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
                >
                  Save and Connect
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
