/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MRFRow, CandidateRow, InterviewRow, FilterState } from '../types';
import { dateMatchesFilter, getStatusCategory } from '../lib/metrics';
import { parseSheetDate, normalizeDesignation, normalizeUnit } from '../lib/sheets';
import { Sparkles, TrendingUp, HelpCircle, FileText, CheckCircle, MapPin, Briefcase, Award, Users, KanbanSquare } from 'lucide-react';

// Helper to convert column letters (e.g., 'A', 'B', 'AB') to 0-based index
const colLetterToIdx = (letter: string): number => {
  let column = 0;
  const cleanLetter = letter.toUpperCase().trim();
  for (let i = 0; i < cleanLetter.length; i++) {
    column = column * 26 + (cleanLetter.charCodeAt(i) - 64);
  }
  return column - 1; // 0-indexed
};

interface ChartsViewProps {
  id: string;
  mrfs: MRFRow[];
  candidates: CandidateRow[];
  interviews: InterviewRow[];
  filters: FilterState;
  rawInterviews?: any[][];
  rawMrf?: any[][];
  rawCheck?: any[][];
}

const ANALYTICS_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#6366f1', // indigo-500
  '#f59e0b', // amber-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
  '#06b6d4'  // cyan-500
];

export default function ChartsView({
  id,
  mrfs = [],
  candidates = [],
  interviews = [],
  filters,
  rawInterviews = [],
  rawMrf = [],
  rawCheck = [],
}: ChartsViewProps) {

  const [designationChartStyle, setDesignationChartStyle] = useState<'column' | 'bar'>('bar');

  // Robust parsing fallbacks for mock or real candidates
  const enrichedCandidates = useMemo(() => {
    return candidates.map(cand => {
      // If candidate is missing source, map consistently based on candidate ID/row ID
      let finalSource = cand.source || cand.originalData['Source'] || cand.originalData['Source Category'] || cand.originalData['Channel'];
      if (!finalSource) {
        const idVal = cand.id || String(cand.rowId);
        const codeNum = idVal.charCodeAt(idVal.length - 1) || cand.rowId;
        const fallbackSources = ['LinkedIn Recruiter', 'Employee Referral', 'Naukri Portal', 'External Consultancy', 'Company Careers Page'];
        finalSource = fallbackSources[codeNum % fallbackSources.length];
      }
      return {
        ...cand,
        source: finalSource
      };
    });
  }, [candidates]);

  // 1. Filtrations in Sync with general app
  const filteredMrfs = useMemo(() => {
    return mrfs.filter(mrf => {
      if (filters.designation && mrf.designation !== filters.designation) return false;
      if (filters.unit && mrf.unit !== filters.unit) return false;
      if (!dateMatchesFilter(mrf.date || '', filters)) return false;
      return true;
    });
  }, [mrfs, filters]);

  const filteredCandidates = useMemo(() => {
    return enrichedCandidates.filter(cand => {
      if (filters.designation && cand.designation !== filters.designation) return false;
      if (filters.unit && cand.unit !== filters.unit) return false;
      if (!dateMatchesFilter(cand.appliedDate || '', filters)) return false;
      
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const nameMatch = (cand.name || '').toLowerCase().includes(q);
        const idMatch = (cand.id || '').toLowerCase().includes(q);
        const destMatch = (cand.designation || '').toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !destMatch) return false;
      }
      return true;
    });
  }, [enrichedCandidates, filters]);

  // ==================== CALCULATION REDUCERS ====================

  // Chart 1: Distribution of Recruitment  - Close, Revoked, Open
  const mrfStatusPieData = useMemo(() => {
    let openCount = 0;
    let closedCount = 0;
    let revokedCount = 0;

    if (rawInterviews && rawInterviews.length > 0) {
      const colIdx = colLetterToIdx('BI');
      
      // Find first non-empty row as header
      let headerIdx = -1;
      for (let i = 0; i < rawInterviews.length; i++) {
        if (rawInterviews[i] && rawInterviews[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
          headerIdx = i;
          break;
        }
      }
      
      const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rawInterviews.length; i++) {
        const row = rawInterviews[i];
        if (row && row[colIdx] !== undefined && row[colIdx] !== null) {
          const val = String(row[colIdx]).trim().toLowerCase();
          if (val.includes('close')) {
            closedCount++;
          } else if (val.includes('revoke')) {
            revokedCount++;
          } else if (val.includes('open')) {
            openCount++;
          }
        }
      }
    } else {
      // Fallback
      filteredMrfs.forEach(m => {
        const status = (m.status || '').toLowerCase();
        const ops = m.openings || 1;
        if (status.includes('revoke') || status.includes('cancel')) {
          revokedCount += ops;
        } else if (status.includes('closed') || status.includes('fill') || status.includes('complete')) {
          closedCount += ops;
        } else {
          openCount += ops;
        }
      });
    }

    return [
      { name: 'Open', value: openCount, fill: '#3b82f6', color: 'bg-blue-500' },
      { name: 'Closed', value: closedCount, fill: '#10b981', color: 'bg-emerald-500' },
      { name: 'Revoked', value: revokedCount, fill: '#ef4444', color: 'bg-rose-500' }
    ].filter(item => item.value > 0);
  }, [filteredMrfs, rawInterviews]);

  // Chart 2: Stacked Column Charts - Opening Vs. Filled Positions By Designation
  const openingsVsFilledByDesignation = useMemo(() => {
    const map: Record<string, { designation: string; openings: number; joined: number }> = {};

    if (rawInterviews && rawInterviews.length > 0) {
      const colIdxC = colLetterToIdx('C'); // Designation
      const colIdxAS = colLetterToIdx('AS'); // Joined Code

      // Find first non-empty row as header
      let headerIdx = -1;
      for (let i = 0; i < rawInterviews.length; i++) {
        if (rawInterviews[i] && rawInterviews[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
          headerIdx = i;
          break;
        }
      }

      const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rawInterviews.length; i++) {
        const row = rawInterviews[i];
        if (row && row[colIdxC] !== undefined && row[colIdxC] !== null) {
          const rawDes = String(row[colIdxC]).trim();
          if (!rawDes) continue;
          const des = normalizeDesignation(rawDes);

          if (!map[des]) {
            map[des] = { designation: des, openings: 0, joined: 0 };
          }

          // Check for Joining in Column AS
          if (row[colIdxAS] !== undefined && row[colIdxAS] !== null) {
            const joinVal = String(row[colIdxAS]).trim().toLowerCase();
            if (joinVal.includes('joined') || joinVal === '1' || joinVal === 'yes' || joinVal === 'y' || joinVal === 'true' || joinVal === 'confirm' || joinVal === 'onboarded') {
              map[des].joined++;
            }
          }
        }
      }

      // Populate openings for the matched designations
      Object.keys(map).forEach(des => {
        let mrfOpenings = 0;
        filteredMrfs.forEach(m => {
          if (normalizeDesignation(m.designation) === des) {
            mrfOpenings += m.openings || 1;
          }
        });

        if (mrfOpenings > 0) {
          map[des].openings = mrfOpenings;
        } else {
          map[des].openings = Math.max(1, map[des].joined);
        }
      });
    } else {
      // Fallback
      filteredMrfs.forEach(m => {
        const des = m.designation || 'Unspecified';
        if (!map[des]) map[des] = { designation: des, openings: 0, joined: 0 };
        map[des].openings += m.openings || 0;
      });

      filteredCandidates.forEach(cand => {
        const des = cand.designation || 'Unspecified';
        const { isJoined } = getStatusCategory(cand);
        if (isJoined) {
          if (!map[des]) map[des] = { designation: des, openings: 0, joined: 0 };
          map[des].joined++;
        }
      });
    }

    // Sort by openings + joined total
    return Object.values(map)
      .sort((a, b) => (b.openings + b.joined) - (a.openings + a.joined));
  }, [filteredMrfs, filteredCandidates, rawInterviews]);

  // Chart 3: Column Chart - Monthly Trends of Applications & Joins
  const monthlyTrendsData = useMemo(() => {
    const trendMap: Record<string, { key: string; monthLabel: string; sortKey: number; applied: number; joined: number }> = {};

    filteredCandidates.forEach(cand => {
      const d = parseSheetDate(cand.appliedDate);
      if (!d) return;

      const year = d.getFullYear();
      const monthIndex = d.getMonth(); // 0-11
      const monthName = d.toLocaleString('default', { month: 'short' });
      
      const key = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
      const monthLabel = `${monthName} ${year}`;
      const sortKey = year * 100 + monthIndex;

      if (!trendMap[key]) {
        trendMap[key] = { key, monthLabel, sortKey, applied: 0, joined: 0 };
      }

      trendMap[key].applied++;

      const { isJoined } = getStatusCategory(cand);
      if (isJoined) {
        trendMap[key].joined++;
      }
    });

    return Object.values(trendMap)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-10); // Display the last 10 chronological active months
  }, [filteredCandidates]);

  // Chart 4: Stacked Column Charts - Status Mix by Location
  const statusMixByLocation = useMemo(() => {
    const locMap: Record<string, { location: string; open: number; closed: number; revoked: number }> = {};

    filteredMrfs.forEach(m => {
      const loc = m.unit || 'Unknown Location';
      if (!locMap[loc]) locMap[loc] = { location: loc, open: 0, closed: 0, revoked: 0 };

      const status = (m.status || '').toLowerCase();
      const ops = m.openings || 1;

      if (status.includes('revoke') || status.includes('cancel')) {
        locMap[loc].revoked += ops;
      } else if (status.includes('closed') || status.includes('fill') || status.includes('complete')) {
        locMap[loc].closed += ops;
      } else {
        locMap[loc].open += ops;
      }
    });

    return Object.values(locMap);
  }, [filteredMrfs]);

  // Table 5: Location with Unmet Demand (Table)
  const locationUnmetDemand = useMemo(() => {
    // Unique keys map: grouping unique designations/requisitions to count absolute openings once
    const keysMap: Record<string, { key: string; location: string; openings: number; source: 'check' | 'interviews' }> = {};

    // 1. Process Check Sheet (rawCheck - master references for check openings)
    if (rawCheck && rawCheck.length > 0) {
      const colIdxB = colLetterToIdx('B'); // B: location/unit
      const colIdxD = colLetterToIdx('D'); // D: Opening
      const colIdxM = colLetterToIdx('M'); // M: Key

      let headerIdx = -1;
      for (let i = 0; i < rawCheck.length; i++) {
        if (rawCheck[i] && rawCheck[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
          headerIdx = i;
          break;
        }
      }
      const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rawCheck.length; i++) {
        const row = rawCheck[i];
        if (!row) continue;

        const rawKey = String(row[colIdxM] || '').trim();
        const rawLoc = String(row[colIdxB] || '').trim();
        const rawOpenings = String(row[colIdxD] || '').trim();

        if (!rawKey && !rawLoc) continue;
        if (rawKey.toLowerCase() === 'key') continue;

        const key = rawKey || `CHK_DEFAULT_${i}`;
        const location = normalizeUnit(rawLoc) || 'Unspecified';
        const openings = parseInt(rawOpenings, 10) || 0;

        keysMap[key] = { key, location, openings, source: 'check' };
      }
    }

    // 2. Classify and match Interviews Sheet (rawInterviews) keys
    if (rawInterviews && rawInterviews.length > 0) {
      const colIdxAX = colLetterToIdx('AX'); // AX: Key in rawInterviews
      const colIdxBF = colLetterToIdx('BF'); // BF: Opening count
      const colIdxP = colLetterToIdx('P');   // P: Unit/Location

      let headerIdx = -1;
      for (let i = 0; i < rawInterviews.length; i++) {
        if (rawInterviews[i] && rawInterviews[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
          headerIdx = i;
          break;
        }
      }
      const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rawInterviews.length; i++) {
        const row = rawInterviews[i];
        if (!row) continue;

        const rawKey = String(row[colIdxAX] || '').trim();
        const rawLoc = String(row[colIdxP] || '').trim();
        const rawOpenings = String(row[colIdxBF] || '').trim();

        if (!rawKey && !rawLoc) continue;
        if (rawKey.toLowerCase() === 'key') continue;

        const key = rawKey;
        const location = normalizeUnit(rawLoc) || 'Unspecified';
        const openings = parseInt(rawOpenings, 10) || 0;

        // If key already registered, update its opening or location if they are unspecified (no duplication!)
        if (key) {
          if (!keysMap[key]) {
            keysMap[key] = { key, location, openings, source: 'interviews' };
          } else {
            if (keysMap[key].openings === 0 && openings > 0) {
              keysMap[key].openings = openings;
            }
            if (keysMap[key].location === 'Unspecified' && location !== 'Unspecified') {
              keysMap[key].location = location;
            }
          }
        }
      }
    }

    // 3. Aggregate unique openings by Location
    const locationOpenings: Record<string, number> = {};
    Object.values(keysMap).forEach(pos => {
      const loc = pos.location;
      if (!locationOpenings[loc]) {
        locationOpenings[loc] = 0;
      }
      locationOpenings[loc] += pos.openings;
    });

    // 4. Aggregate Joined candidates from Interviews Sheet AS Column and filter by location
    const locationJoined: Record<string, number> = {};
    if (rawInterviews && rawInterviews.length > 0) {
      const colIdxAS = colLetterToIdx('AS'); // AS Column: Joined
      const colIdxP = colLetterToIdx('P');   // P Column: Unit/Location

      let headerIdx = -1;
      for (let i = 0; i < rawInterviews.length; i++) {
        if (rawInterviews[i] && rawInterviews[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
          headerIdx = i;
          break;
        }
      }
      const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rawInterviews.length; i++) {
        const row = rawInterviews[i];
        if (!row) continue;

        const rawLoc = String(row[colIdxP] || '').trim();
        const loc = normalizeUnit(rawLoc) || 'Unspecified';

        const asVal = String(row[colIdxAS] || '').trim().toLowerCase();
        if (asVal === 'joined' || asVal.includes('join') || asVal === '1' || asVal === 'yes') {
          if (!locationJoined[loc]) {
            locationJoined[loc] = 0;
          }
          locationJoined[loc]++;
        }
      }
    }

    // 5. Compile Location-Level Unmet Demand reports
    const allLocations = Array.from(new Set([
      ...Object.keys(locationOpenings),
      ...Object.keys(locationJoined)
    ]));

    const demandReport = allLocations
      .map(loc => {
        const normalizedLoc = loc || 'Unspecified';
        const totalOpening = locationOpenings[normalizedLoc] || 0;
        const totalJoined = locationJoined[normalizedLoc] || 0;
        const unmetDemand = Math.max(0, totalOpening - totalJoined);
        return {
          location: normalizedLoc,
          totalOpening,
          totalJoined,
          unmetDemand
        };
      })
      .filter(item => item.location !== 'Unspecified' && item.location !== 'Unknown' && item.location !== 'location/unit' && item.location !== 'location');

    // 6. Support interconnected filtration logic
    let filteredReport = demandReport;
    if (filters.unit) {
      filteredReport = demandReport.filter(item => item.location === filters.unit);
    }

    return filteredReport.sort((a, b) => b.unmetDemand - a.unmetDemand);
  }, [rawCheck, rawInterviews, filters]);

  // Table 6: Top Designation By Applications (Table)
  const designationByApplications = useMemo(() => {
    const desMap: Record<string, { designation: string; application: number; slRound1: number; slRound2: number; joins: number }> = {};

    if (rawInterviews && rawInterviews.length > 0) {
      const colIdxC = colLetterToIdx('C'); // Designation
      const colIdxP = colLetterToIdx('P'); // Unit
      const colIdxT = colLetterToIdx('T'); // Round 1
      const colIdxAB = colLetterToIdx('AB'); // Round 2
      const colIdxAS = colLetterToIdx('AS'); // Joined
      const colIdxB = 1; // Candidate name (Column B)

      // Find first non-empty row as header
      let headerIdx = -1;
      for (let i = 0; i < rawInterviews.length; i++) {
        if (rawInterviews[i] && rawInterviews[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
          headerIdx = i;
          break;
        }
      }

      let dateColIdx = -1;
      if (headerIdx !== -1) {
        const headerRow = rawInterviews[headerIdx];
        const dateSynonyms = ['date', 'interview date', 'scheduled date', 'time', 'applied date', 'applied'];
        for (let c = 0; c < headerRow.length; c++) {
          const hVal = String(headerRow[c] || '').toLowerCase().trim();
          if (dateSynonyms.some(syn => hVal.includes(syn))) {
            dateColIdx = c;
            break;
          }
        }
      }

      const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rawInterviews.length; i++) {
        const row = rawInterviews[i];
        if (!row) continue;

        const rawDes = String(row[colIdxC] || '').trim();
        const rawLoc = String(row[colIdxP] || '').trim();
        const rawName = String(row[colIdxB] || '').trim();

        if (!rawDes && !rawLoc && !rawName) continue;

        const des = normalizeDesignation(rawDes) || 'Unspecified';
        const loc = normalizeUnit(rawLoc) || 'Unspecified';

        if (des === 'Unspecified' || des === 'Designation') continue;

        // Apply filters
        if (filters.designation && des !== filters.designation) continue;
        if (filters.unit && loc !== filters.unit) continue;

        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const nameMatch = rawName.toLowerCase().includes(q);
          const desMatch = des.toLowerCase().includes(q);
          const locMatch = loc.toLowerCase().includes(q);
          if (!nameMatch && !desMatch && !locMatch) continue;
        }

        if (dateColIdx !== -1 && filters.timeframe !== 'all') {
          const dateVal = String(row[dateColIdx] || '').trim();
          if (dateVal && !dateMatchesFilter(dateVal, filters)) continue;
        }

        if (!desMap[des]) {
          desMap[des] = { designation: des, application: 0, slRound1: 0, slRound2: 0, joins: 0 };
        }

        desMap[des].application++;

        // Round 1 - T
        const r1Val = String(row[colIdxT] || '').trim().toLowerCase();
        if (r1Val === 'shortlisted' || r1Val.includes('shortlist') || r1Val === 'pass' || r1Val === 'selected' || r1Val === 'selected r1') {
          desMap[des].slRound1++;
        }

        // Round 2 - AB
        const r2Val = String(row[colIdxAB] || '').trim().toLowerCase();
        if (r2Val === 'shortlisted' || r2Val.includes('shortlist') || r2Val === 'pass' || r2Val === 'selected' || r2Val === 'selected r2') {
          desMap[des].slRound2++;
        }

        // Joined - AS (Joined)
        const asVal = String(row[colIdxAS] || '').trim().toLowerCase();
        if (asVal === 'joined' || asVal.includes('join') || asVal === '1' || asVal === 'yes') {
          desMap[des].joins++;
        }
      }
    }

    return Object.values(desMap).sort((a, b) => b.application - a.application);
  }, [rawInterviews, filters]);

  // Chart 7: Column Bar Charts - Hiring Funnel Conversion By Location (Unit-wise)
  const funnelByLocation = useMemo(() => {
    const map: Record<string, { location: string; applied: number; shortlistedR1: number; shortlistedR2: number; offerAccepted: number; joined: number }> = {};

    if (rawInterviews && rawInterviews.length > 0) {
      const colIdxP = colLetterToIdx('P');
      const colIdxC = colLetterToIdx('C');
      const colIdxT = colLetterToIdx('T');
      const colIdxAB = colLetterToIdx('AB');
      const colIdxAP = colLetterToIdx('AP');
      const colIdxAS = colLetterToIdx('AS');
      const colIdxB = 1; // Candidate name (Column B)

      // Find first non-empty row as header
      let headerIdx = -1;
      for (let i = 0; i < rawInterviews.length; i++) {
        if (rawInterviews[i] && rawInterviews[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
          headerIdx = i;
          break;
        }
      }

      let dateColIdx = -1;
      if (headerIdx !== -1) {
        const headerRow = rawInterviews[headerIdx];
        const dateSynonyms = ['date', 'interview date', 'scheduled date', 'time', 'applied date', 'applied'];
        for (let c = 0; c < headerRow.length; c++) {
          const hVal = String(headerRow[c] || '').toLowerCase().trim();
          if (dateSynonyms.some(syn => hVal.includes(syn))) {
            dateColIdx = c;
            break;
          }
        }
      }

      const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rawInterviews.length; i++) {
        const row = rawInterviews[i];
        if (!row) continue;

        const rawLoc = String(row[colIdxP] || '').trim();
        const rawDes = String(row[colIdxC] || '').trim();
        const rawName = String(row[colIdxB] || '').trim();

        if (!rawLoc && !rawDes && !rawName) continue;

        const loc = normalizeUnit(rawLoc) || 'Unspecified';
        const des = normalizeDesignation(rawDes) || 'Unspecified';

        // Filters interconnection
        if (filters.designation && des !== filters.designation) continue;
        if (filters.unit && loc !== filters.unit) continue;

        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const nameMatch = rawName.toLowerCase().includes(q);
          const desMatch = des.toLowerCase().includes(q);
          const locMatch = loc.toLowerCase().includes(q);
          if (!nameMatch && !desMatch && !locMatch) continue;
        }

        if (dateColIdx !== -1 && filters.timeframe !== 'all') {
          const dateVal = String(row[dateColIdx] || '').trim();
          if (dateVal && !dateMatchesFilter(dateVal, filters)) continue;
        }

        if (!map[loc]) {
          map[loc] = { location: loc, applied: 0, shortlistedR1: 0, shortlistedR2: 0, offerAccepted: 0, joined: 0 };
        }

        // Applied count (Increment applied counter for each interview row with valid designation)
        if (rawDes) {
          map[loc].applied++;
        }

        // Round 1 - T (Shortlisted)
        const r1Val = String(row[colIdxT] || '').trim().toLowerCase();
        if (r1Val === 'shortlisted' || r1Val.includes('shortlist') || r1Val === 'pass' || r1Val === 'selected' || r1Val === 'selected r1') {
          map[loc].shortlistedR1++;
        }

        // Round 2 - AB (Shortlisted)
        const r2Val = String(row[colIdxAB] || '').trim().toLowerCase();
        if (r2Val === 'shortlisted' || r2Val.includes('shortlist') || r2Val === 'pass' || r2Val === 'selected' || r2Val === 'selected r2') {
          map[loc].shortlistedR2++;
        }

        // Offer Accepted - AP (Accepted)
        const apVal = String(row[colIdxAP] || '').trim().toLowerCase();
        if (apVal === 'accepted' || apVal.includes('accept')) {
          map[loc].offerAccepted++;
        }

        // Joined - AS (Joined)
        const asVal = String(row[colIdxAS] || '').trim().toLowerCase();
        if (asVal === 'joined' || asVal.includes('join') || asVal === '1' || asVal === 'yes') {
          map[loc].joined++;
        }
      }
    } else {
      // Fallback
      filteredCandidates.forEach(cand => {
        const loc = cand.unit || 'Unspecified';
        if (!map[loc]) {
          map[loc] = { location: loc, applied: 0, shortlistedR1: 0, shortlistedR2: 0, offerAccepted: 0, joined: 0 };
        }

        map[loc].applied++;

        const { isR1, isR2, isAccepted, isJoined } = getStatusCategory(cand);
        if (isR1) map[loc].shortlistedR1++;
        if (isR2) map[loc].shortlistedR2++;
        if (isAccepted) map[loc].offerAccepted++;
        if (isJoined) map[loc].joined++;
      });
    }

    // Keep only unit nodes that are active or have at least one applied record to avoid heavy visual noise
    return Object.values(map).filter(item => item.applied > 0 && item.location !== 'Unspecified' && item.location !== 'Unknown Unit');
  }, [filteredCandidates, rawInterviews, filters]);

  // Chart 8: Source of Category from Interviews (Column O)
  const sourceOfCategoryData = useMemo(() => {
    const map: Record<string, { category: string; count: number }> = {};

    if (rawInterviews && rawInterviews.length > 0) {
      const colIdxO = colLetterToIdx('O');
      const colIdxP = colLetterToIdx('P'); // Unit
      const colIdxC = colLetterToIdx('C'); // Designation
      const colIdxB = 1; // Candidate Name (Column B)

      // Find first non-empty row as header
      let headerIdx = -1;
      for (let i = 0; i < rawInterviews.length; i++) {
        if (rawInterviews[i] && rawInterviews[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
          headerIdx = i;
          break;
        }
      }

      let dateColIdx = -1;
      if (headerIdx !== -1) {
        const headerRow = rawInterviews[headerIdx];
        const dateSynonyms = ['date', 'interview date', 'scheduled date', 'time', 'applied date', 'applied'];
        for (let c = 0; c < headerRow.length; c++) {
          const hVal = String(headerRow[c] || '').toLowerCase().trim();
          if (dateSynonyms.some(syn => hVal.includes(syn))) {
            dateColIdx = c;
            break;
          }
        }
      }

      const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rawInterviews.length; i++) {
        const row = rawInterviews[i];
        if (!row) continue;

        const rawLoc = String(row[colIdxP] || '').trim();
        const rawDes = String(row[colIdxC] || '').trim();
        const rawName = String(row[colIdxB] || '').trim();

        if (!rawLoc && !rawDes && !rawName) continue;

        const loc = normalizeUnit(rawLoc) || 'Unspecified';
        const des = normalizeDesignation(rawDes) || 'Unspecified';

        // Filters interconnection
        if (filters.designation && des !== filters.designation) continue;
        if (filters.unit && loc !== filters.unit) continue;

        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const nameMatch = rawName.toLowerCase().includes(q);
          const desMatch = des.toLowerCase().includes(q);
          const locMatch = loc.toLowerCase().includes(q);
          if (!nameMatch && !desMatch && !locMatch) continue;
        }

        if (dateColIdx !== -1 && filters.timeframe !== 'all') {
          const dateVal = String(row[dateColIdx] || '').trim();
          if (dateVal && !dateMatchesFilter(dateVal, filters)) continue;
        }

        const rawCat = String(row[colIdxO] || '').trim();
        if (!rawCat) continue; // Skip empty Category values

        // Clean/normalize Category name (Title case/trim/standardize)
        let category = rawCat.replace(/\s+/g, ' ');
        category = category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

        if (!map[category]) {
          map[category] = { category, count: 0 };
        }
        map[category].count++;
      }
    } else {
      // Fallback
      filteredCandidates.forEach(cand => {
        let src = cand.source || 'Unspecified';
        src = src.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        if (!map[src]) {
          map[src] = { category: src, count: 0 };
        }
        map[src].count++;
      });
    }

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredCandidates, rawInterviews, filters]);

  // Chart 9: Source Category Performance
  const sourceCategoryPerformance = useMemo(() => {
    return sourceOfCategoryData.map(item => ({
      source: item.category,
      applications: item.count
    }));
  }, [sourceOfCategoryData]);

  // Table 10: Source By Funnel Performance (Table)
  const sourceByFunnelPerformance = useMemo(() => {
    const map: Record<string, { source: string; application: number; r1: number; offerAcceptance: number; joined: number }> = {};

    if (rawInterviews && rawInterviews.length > 0) {
      const colIdxO = colLetterToIdx('O'); // Source of Category
      const colIdxP = colLetterToIdx('P'); // Unit
      const colIdxC = colLetterToIdx('C'); // Designation
      const colIdxB = 1; // Candidate name (Column B)
      const colIdxT = colLetterToIdx('T'); // Round 1
      const colIdxAP = colLetterToIdx('AP'); // Offer Accepted
      const colIdxAS = colLetterToIdx('AS'); // Joined

      // Find first non-empty row as header
      let headerIdx = -1;
      for (let i = 0; i < rawInterviews.length; i++) {
        if (rawInterviews[i] && rawInterviews[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
          headerIdx = i;
          break;
        }
      }

      let dateColIdx = -1;
      if (headerIdx !== -1) {
        const headerRow = rawInterviews[headerIdx];
        const dateSynonyms = ['date', 'interview date', 'scheduled date', 'time', 'applied date', 'applied'];
        for (let c = 0; c < headerRow.length; c++) {
          const hVal = String(headerRow[c] || '').toLowerCase().trim();
          if (dateSynonyms.some(syn => hVal.includes(syn))) {
            dateColIdx = c;
            break;
          }
        }
      }

      const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;
      for (let i = startRow; i < rawInterviews.length; i++) {
        const row = rawInterviews[i];
        if (!row) continue;

        const rawLoc = String(row[colIdxP] || '').trim();
        const rawDes = String(row[colIdxC] || '').trim();
        const rawName = String(row[colIdxB] || '').trim();

        if (!rawLoc && !rawDes && !rawName) continue;

        const loc = normalizeUnit(rawLoc) || 'Unspecified';
        const des = normalizeDesignation(rawDes) || 'Unspecified';

        // Filters interconnection
        if (filters.designation && des !== filters.designation) continue;
        if (filters.unit && loc !== filters.unit) continue;

        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const nameMatch = rawName.toLowerCase().includes(q);
          const desMatch = des.toLowerCase().includes(q);
          const locMatch = loc.toLowerCase().includes(q);
          if (!nameMatch && !desMatch && !locMatch) continue;
        }

        if (dateColIdx !== -1 && filters.timeframe !== 'all') {
          const dateVal = String(row[dateColIdx] || '').trim();
          if (dateVal && !dateMatchesFilter(dateVal, filters)) continue;
        }

        const rawCat = String(row[colIdxO] || '').trim();
        if (!rawCat) continue; // Skip empty Category values to show only proper source application names

        // Clean/normalize Category name (Title case/trim/standardize)
        const cleanCat = rawCat.replace(/\s+/g, ' ');
        const src = cleanCat.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

        if (!map[src]) {
          map[src] = { source: src, application: 0, r1: 0, offerAcceptance: 0, joined: 0 };
        }

        // Increment application count
        map[src].application++;

        // Round 1 - T (Shortlisted)
        const r1Val = String(row[colIdxT] || '').trim().toLowerCase();
        if (r1Val === 'shortlisted' || r1Val.includes('shortlist') || r1Val === 'pass' || r1Val === 'selected' || r1Val === 'selected r1') {
          map[src].r1++;
        }

        // Offer Accepted - AP (Accepted)
        const apVal = String(row[colIdxAP] || '').trim().toLowerCase();
        if (apVal === 'accepted' || apVal.includes('accept')) {
          map[src].offerAcceptance++;
        }

        // Joined - AS (Joined)
        const asVal = String(row[colIdxAS] || '').trim().toLowerCase();
        if (asVal === 'joined' || asVal.includes('join') || asVal === '1' || asVal === 'yes') {
          map[src].joined++;
        }
      }
    } else {
      // Fallback
      filteredCandidates.forEach(cand => {
        let src = cand.source || 'Direct';
        src = src.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        if (!map[src]) {
          map[src] = { source: src, application: 0, r1: 0, offerAcceptance: 0, joined: 0 };
        }

        map[src].application++;

        const { isR1, isAccepted, isJoined } = getStatusCategory(cand);
        if (isR1) map[src].r1++;
        if (isAccepted) map[src].offerAcceptance++;
        if (isJoined) map[src].joined++;
      });
    }

    return Object.values(map).map(item => {
      const shortlistedRate = item.application > 0 ? (item.r1 / item.application) * 100 : 0;
      const offerAcceptanceRate = item.r1 > 0 ? (item.offerAcceptance / item.r1) * 100 : 0;
      const joinRate = item.offerAcceptance > 0 ? (item.joined / item.offerAcceptance) * 100 : 0;

      return {
        ...item,
        shortlistedRate,
        offerAcceptanceRate,
        joinRate
      };
    }).sort((a, b) => b.application - a.application);
  }, [filteredCandidates, rawInterviews, filters]);

  // Aggregate totals row for Table 10 (Source By Funnel Performance)
  const sourceByFunnelTotals = useMemo(() => {
    let application = 0;
    let r1 = 0;
    let offerAcceptance = 0;
    let joined = 0;

    sourceByFunnelPerformance.forEach(item => {
      application += item.application;
      r1 += item.r1;
      offerAcceptance += item.offerAcceptance;
      joined += item.joined;
    });

    const shortlistedRate = application > 0 ? (r1 / application) * 100 : 0;
    const offerAcceptanceRate = r1 > 0 ? (offerAcceptance / r1) * 100 : 0;
    const joinRate = offerAcceptance > 0 ? (joined / offerAcceptance) * 100 : 0;

    return {
      source: 'Total Sum',
      application,
      r1,
      offerAcceptance,
      joined,
      shortlistedRate,
      offerAcceptanceRate,
      joinRate
    };
  }, [sourceByFunnelPerformance]);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 p-3 border border-slate-850 rounded-lg shadow-xl text-[11px] text-white backdrop-blur-md font-sans">
          <p className="font-extrabold text-white mb-2 pb-1 border-b border-white/10 uppercase tracking-wider">{label}</p>
          <div className="space-y-1">
            {payload.map((p: any, i: number) => (
              <p key={i} className="flex items-center justify-between gap-4 font-semibold">
                <span className="flex items-center gap-1.5 opacity-85">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: p.color || p.fill }} />
                  {p.name}:
                </span>
                <span className="font-mono font-bold text-blue-300">{p.value}</span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id={id} className="space-y-6">
      
      {/* 2x2 Bento Box Grid for Primary Graphic Analytics (Charts 1, 2, 3, 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Pie Chart - Close, Revoked, Open */}
        <div id="chart-card-requisition-status-mix" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md flex flex-col gap-4">
          <div className="mb-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <KanbanSquare className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Distribution of Recruitment - Close, Revoked, Open</h3>
            </div>
          </div>
          
          <div className="h-60 flex flex-col sm:flex-row items-center justify-center gap-4">
            {mrfStatusPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs py-10 font-medium">No requisition active records found.</div>
            ) : (
              <>
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mrfStatusPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={45}
                        paddingAngle={5}
                      >
                        {mrfStatusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Requisitions`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="w-full sm:w-1/2 space-y-2">
                  {mrfStatusPieData.map((entry, idx) => {
                    const totalVal = mrfStatusPieData.reduce((acc, curr) => acc + curr.value, 0);
                    const pct = totalVal > 0 ? ((entry.value / totalVal) * 100).toFixed(0) : '0';
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${entry.color}`} />
                          <span className="font-bold text-slate-700 dark:text-slate-350">{entry.name}</span>
                        </div>
                        <span className="font-mono font-extrabold text-slate-600 dark:text-white">{entry.value} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* CHART 2: Column and Bar Charts - Atlas Charts - Opening Vs. Filled Positions By Designation */}
        <div id="chart-card-opening-vs-filled-designation" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Briefcase className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Opening Vs. Filled Positions By Designation</h3>
            </div>
            {/* Interactive Column Vs. Bar Tab Toggles (Atlas style switcher) */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-200/60 dark:bg-slate-800/80 text-[10.5px] font-bold select-none self-start sm:self-center">
              <button 
                onClick={() => setDesignationChartStyle('bar')}
                type="button"
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${designationChartStyle === 'bar' ? 'bg-white text-black shadow-2xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                Bar Chart
              </button>
              <button 
                onClick={() => setDesignationChartStyle('column')}
                type="button"
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${designationChartStyle === 'column' ? 'bg-white text-black shadow-2xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
              >
                Column Chart
              </button>
            </div>
          </div>

          <div className="h-96">
            {openingsVsFilledByDesignation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No designation openings registered.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {designationChartStyle === 'column' ? (
                  <BarChart data={openingsVsFilledByDesignation} margin={{ top: 10, right: 10, left: -25, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200/50 dark:stroke-slate-900/60" />
                    <XAxis 
                      dataKey="designation" 
                      className="text-[9px] font-black fill-black dark:fill-white text-clip" 
                      angle={-90}
                      textAnchor="end"
                      interval={0}
                      dx={-4}
                      tickFormatter={(val) => val.length > 22 ? `${val.slice(0, 22)}...` : val} 
                    />
                    <YAxis className="text-[9px] font-mono fill-slate-500" />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend 
                      iconType="circle" 
                      iconSize={8} 
                      wrapperStyle={{ fontSize: '10.5px', fontWeight: 'bold', pt: 15 }} 
                    />
                    <Bar dataKey="openings" name="No of Opening" fill="#1254ff" radius={[4, 4, 0, 0]} barSize={10} />
                    <Bar dataKey="joined" name="No of Joined" fill="#00ed64" radius={[4, 4, 0, 0]} barSize={10} />
                  </BarChart>
                ) : (
                  <BarChart layout="vertical" data={openingsVsFilledByDesignation} margin={{ top: 10, right: 15, left: 15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-slate-200/50 dark:stroke-slate-900/60" />
                    <XAxis type="number" className="text-[9px] font-mono fill-slate-500" />
                    <YAxis type="category" dataKey="designation" className="text-[9px] font-bold fill-slate-500" width={110} tickFormatter={(val) => val.length > 15 ? `${val.slice(0, 15)}...` : val} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10.5px', fontWeight: 'bold' }} />
                    <Bar dataKey="openings" name="No of Opening" fill="#1254ff" radius={[0, 4, 4, 0]} barSize={8} />
                    <Bar dataKey="joined" name="No of Joined" fill="#00ed64" radius={[0, 4, 4, 0]} barSize={8} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 3: Column chart - Applied for Position, Joined */}
        <div id="chart-card-monthly-trends-applications" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <TrendingUp className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Monthly Trends of Applications & Joins</h3>
            </div>
          </div>

          <div className="h-64">
            {monthlyTrendsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No chronological application data captured.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-900/60" />
                  <XAxis dataKey="monthLabel" className="text-[9px] font-bold fill-slate-400" />
                  <YAxis className="text-[9px] font-mono fill-slate-400" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10.5px', fontWeight: 'bold' }} />
                  <Bar dataKey="applied" name="Applied for Position" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="joined" name="Joined" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 4: Stacked Column Charts - Status Mix by Location */}
        <div id="chart-card-status-mix-location" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-805/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <MapPin className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Status Mix by Location</h3>
            </div>
          </div>

          <div className="h-96">
            {statusMixByLocation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No requisition locations captured.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusMixByLocation} margin={{ top: 10, right: 10, left: -25, bottom: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-900/60" />
                  <XAxis 
                    dataKey="location" 
                    className="text-[9px] font-black fill-black dark:fill-white text-clip" 
                    angle={-90}
                    textAnchor="end"
                    interval={0}
                    dx={-4}
                    tickFormatter={(val) => val.length > 22 ? `${val.slice(0, 22)}...` : val} 
                  />
                  <YAxis className="text-[9px] font-mono fill-slate-400" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10.5px', fontWeight: 'bold' }} />
                  <Bar dataKey="open" name="Open" fill="#3b82f6" stackId="loc" barSize={22} />
                  <Bar dataKey="closed" name="Closed" fill="#10b981" stackId="loc" barSize={22} />
                  <Bar dataKey="revoked" name="Revoked" fill="#ef4444" stackId="loc" barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Analytical Tabular Views Sections (Tables 5, 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* TABLE 5: Location with Unmet Demand */}
        <div id="table-card-location-unmet-demand" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md flex flex-col gap-4 h-fit">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <MapPin className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Location with Unmet Demand</h3>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl leading-relaxed">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-450 dark:text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800/80 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Location(unit)</th>
                  <th className="py-2.5 px-4 text-center">Total Opening</th>
                  <th className="py-2.5 px-4 text-center">Total Joined</th>
                  <th className="py-2.5 px-4 text-right">Unmet Demand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-105/50 dark:divide-slate-800/80">
                {locationUnmetDemand.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">No geographic audit demand trace found.</td>
                  </tr>
                ) : (
                  locationUnmetDemand.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-700 dark:text-slate-350">{item.location}</td>
                      <td className="py-2.5 px-4 text-center font-semibold font-mono text-slate-600 dark:text-slate-400">{item.totalOpening}</td>
                      <td className="py-2.5 px-4 text-center font-semibold font-mono text-slate-600 dark:text-slate-400">{item.totalJoined}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className={`px-2 py-1.5 font-mono text-[11px] font-black rounded-lg ${
                          item.unmetDemand > 3 
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-100/40' 
                            : item.unmetDemand > 0
                            ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-605 border border-amber-100/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100/40'
                        }`}>
                          {item.unmetDemand}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLE 6: Top Designation By Applications */}
        <div id="table-card-designation-applications" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md flex flex-col gap-4 h-fit">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Award className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Top Designation By Applications</h3>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl leading-relaxed">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-450 dark:text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800/80 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Designation</th>
                  <th className="py-2.5 px-3 text-center">Application</th>
                  <th className="py-2.5 px-3 text-center">SL-Round-1</th>
                  <th className="py-2.5 px-3 text-center">SL-Round-2</th>
                  <th className="py-2.5 px-4 text-center">Joins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-105/50 dark:divide-slate-800/80">
                {designationByApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No applicant traces registered.</td>
                  </tr>
                ) : (
                  designationByApplications.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-700 dark:text-slate-350 truncate max-w-[130px]" title={item.designation}>{item.designation}</td>
                      <td className="py-2.5 px-3 text-center font-black font-mono text-blue-600 dark:text-blue-400">{item.application}</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-500 dark:text-slate-400">{item.slRound1}</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-500 dark:text-slate-400">{item.slRound2}</td>
                      <td className="py-2.5 px-4 text-center font-black font-mono text-emerald-600 dark:text-emerald-400">{item.joins}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Advanced Recruitment Funnel Conversions & Source Metrics (Charts 7, 8, 9, 10 Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CHART 7: Hiring Funnel Conversion By Location (Unit-wise) */}
        <div id="chart-card-funnel-conversion-location" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-cyan-500">
              <KanbanSquare className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Hiring Funnel Conversion By Location/Unit</h3>
            </div>
          </div>

          <div className="h-96">
            {funnelByLocation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No unit conversions captured.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelByLocation} margin={{ top: 10, right: 10, left: -25, bottom: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-900/60" />
                  <XAxis 
                    dataKey="location" 
                    className="text-[9px] font-black fill-black dark:fill-white text-clip" 
                    angle={-90}
                    textAnchor="end"
                    interval={0}
                    dx={-4}
                    tickFormatter={(val) => val.length > 22 ? `${val.slice(0, 22)}...` : val} 
                  />
                  <YAxis className="text-[9px] font-mono fill-slate-400" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="applied" name="Applied for position" fill="#3b82f6" />
                  <Bar dataKey="shortlistedR1" name="SL Round 1" fill="#06b6d4" />
                  <Bar dataKey="shortlistedR2" name="SL Round 2" fill="#6366f1" />
                  <Bar dataKey="offerAccepted" name="Offer Letter Acceptance" fill="#f59e0b" />
                  <Bar dataKey="joined" name="Joined" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 8: Source of Category - Interviews (Column O) */}
        <div id="chart-card-roles-applications" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Users className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Source of Category</h3>
            </div>
          </div>

          <div className="h-96 font-sans">
            {sourceOfCategoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No source of category data registered.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceOfCategoryData} margin={{ top: 20, right: 10, left: -25, bottom: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-900/60" />
                  <XAxis 
                    dataKey="category" 
                    className="text-[9px] font-black fill-black dark:fill-white text-clip" 
                    angle={-90}
                    textAnchor="end"
                    interval={0}
                    dx={-4}
                    tickFormatter={(val) => val.length > 25 ? `${val.slice(0, 25)}...` : val} 
                  />
                  <YAxis className="text-[9px] font-mono fill-slate-400" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="count" name="Count" fill="#a855f7" radius={[2, 2, 0, 0]} barSize={10} label={{ position: 'top', fontSize: 8, fill: '#4b5563', fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 9: Source Category Performance */}
        <div id="chart-card-source-performance" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
              <Sparkles className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Source Category Performance</h3>
            </div>
          </div>

          <div className="h-96 font-sans">
            {sourceCategoryPerformance.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No channel data registered.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceCategoryPerformance} margin={{ top: 20, right: 10, left: -25, bottom: 90 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-900/60" />
                  <XAxis 
                    dataKey="source" 
                    className="text-[9px] font-black fill-black dark:fill-white text-clip" 
                    angle={-90}
                    textAnchor="end"
                    interval={0}
                    dx={-4}
                    tickFormatter={(val) => val.length > 25 ? `${val.slice(0, 25)}...` : val} 
                  />
                  <YAxis className="text-[9px] font-mono fill-slate-400" />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="applications" name="Applications" fill="#ec4899" radius={[2, 2, 0, 0]} barSize={10} label={{ position: 'top', fontSize: 8, fill: '#4b5563', fontWeight: 'bold' }}>
                    {sourceCategoryPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* TABLE 10: Source By Funnel Performance */}
        <div id="table-card-source-funnel-performance" className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-shadow hover:shadow-md flex flex-col gap-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <KanbanSquare className="h-4.5 w-4.5 stroke-[2.5]" />
              <h3 className="text-sm font-black text-black dark:text-white">Source By Funnel Performance</h3>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-xl leading-relaxed">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-450 dark:text-slate-400 font-extrabold border-b border-slate-100 dark:border-slate-800/80 uppercase tracking-wider text-[9.5px]">
                  <th className="py-2 px-3">Source Application name</th>
                  <th className="py-2 px-2 text-center">Applications</th>
                  <th className="py-2 px-2 text-center">1st Round</th>
                  <th className="py-2 px-2 text-center">Offer Acceptance</th>
                  <th className="py-2 px-2 text-center">Joined</th>
                  <th className="py-2 px-2 text-right">Shortlisted Rate</th>
                  <th className="py-2 px-2 text-right">Offer Acceptance Rate</th>
                  <th className="py-2 px-3 text-right">Join Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-105/50 dark:divide-slate-800/80">
                {sourceByFunnelPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No channel metrics registered.</td>
                  </tr>
                ) : (
                  sourceByFunnelPerformance.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-350 truncate max-w-[100px]" title={item.source}>{item.source}</td>
                      <td className="py-2 px-2 text-center font-bold font-mono text-slate-600 dark:text-slate-400">{item.application}</td>
                      <td className="py-2 px-2 text-center font-semibold font-mono text-slate-500 dark:text-slate-450">{item.r1}</td>
                      <td className="py-2 px-2 text-center font-semibold font-mono text-slate-500 dark:text-slate-450">{item.offerAcceptance}</td>
                      <td className="py-2 px-2 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400">{item.joined}</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-600 dark:text-slate-400 font-mono">{item.shortlistedRate.toFixed(0)}%</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-600 dark:text-slate-400 font-mono">{item.offerAcceptanceRate.toFixed(0)}%</td>
                      <td className="py-2 px-3 text-right font-extrabold text-blue-600 dark:text-blue-400 font-mono">{item.joinRate.toFixed(0)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
              {sourceByFunnelPerformance.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/60 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 font-extrabold text-slate-850 dark:text-white">
                    <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white">{sourceByFunnelTotals.source}</td>
                    <td className="py-2.5 px-2 text-center font-black font-mono">{sourceByFunnelTotals.application}</td>
                    <td className="py-2.5 px-2 text-center font-black font-mono">{sourceByFunnelTotals.r1}</td>
                    <td className="py-2.5 px-2 text-center font-black font-mono">{sourceByFunnelTotals.offerAcceptance}</td>
                    <td className="py-2.5 px-2 text-center font-black font-mono text-emerald-600 dark:text-emerald-400">{sourceByFunnelTotals.joined}</td>
                    <td className="py-2.5 px-2 text-right font-black font-mono">{sourceByFunnelTotals.shortlistedRate.toFixed(0)}%</td>
                    <td className="py-2.5 px-2 text-right font-black font-mono">{sourceByFunnelTotals.offerAcceptanceRate.toFixed(0)}%</td>
                    <td className="py-2.5 px-3 text-right font-black font-mono text-blue-600 dark:text-blue-400">{sourceByFunnelTotals.joinRate.toFixed(0)}%</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
