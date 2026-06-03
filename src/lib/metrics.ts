/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MRFRow, CandidateRow, InterviewRow, DashboardMetrics, FilterState } from '../types';
import { parseSheetDate } from './sheets';

// Text classification helpers for robust status checking
export function getStatusCategory(candidate: CandidateRow): {
  isR1: boolean;
  isR2: boolean;
  isOffered: boolean;
  isAccepted: boolean;
  isJoined: boolean;
  isRevoked: boolean;
} {
  const status = (candidate.status || '').toLowerCase();
  const rawDataStr = JSON.stringify(candidate.originalData).toLowerCase();

  // 1. Is Shortlisted Round 1
  const isR1 = status.includes('r1') ||
               status.includes('shortlisted 1') ||
               status.includes('1st round') ||
               status.includes('round 1') ||
               rawDataStr.includes('r1 pass') ||
               rawDataStr.includes('selected r1') ||
               rawDataStr.includes('r1 shortlist');

  // 2. Is Shortlisted Round 2
  const isR2 = status.includes('r2') ||
               status.includes('shortlisted 2') ||
               status.includes('2nd round') ||
               status.includes('round 2') ||
               rawDataStr.includes('r2 pass') ||
               rawDataStr.includes('selected r2') ||
               rawDataStr.includes('r2 shortlist');

  // 3. Offer Made
  const isOffered = status.includes('offer') ||
                    status.includes('offered') ||
                    status.includes('released') ||
                    status.includes('made') ||
                    candidate.offerDate !== '';

  // 4. Offer Accepted
  const isAccepted = status.includes('accepted') ||
                     status.includes('accept') ||
                     status.includes('signed') ||
                     candidate.offerAcceptDate !== '';

  // 5. Candidate Joined
  const isJoined = status.includes('joined') ||
                   status.includes('join') ||
                   status.includes('onboard') ||
                   candidate.joiningDate !== '';

  // 6. Rejected/Revoked
  const isRevoked = status.includes('revoke') ||
                    status.includes('revoked') ||
                    status.includes('cancel') ||
                    status.includes('cancelled') ||
                    status.includes('decline') ||
                    status.includes('declined') ||
                    status.includes('withdrawn') ||
                    status.includes('reject') ||
                    status.includes('rejected') ||
                    status.includes('hold');

  return { isR1, isR2, isOffered, isAccepted, isJoined, isRevoked };
}

// Check if a date matches the active filter timeframe
export function dateMatchesFilter(dateStr: string, filter: FilterState): boolean {
  if (filter.timeframe === 'all' || !filter.specificPeriod) {
    return true;
  }

  const d = parseSheetDate(dateStr);
  if (!d) return false;

  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  // Month code formatted as YYYY-MM
  const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

  // Quarter code formatted as YYYY-QX
  const quarter = Math.ceil(month / 3);
  const quarterStr = `${year}-Q${quarter}`;

  // Week number in the year (approximate)
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  const weekStr = `${year}-W${weekNum}`;

  switch (filter.timeframe) {
    case 'year':
      return String(year) === filter.specificPeriod;
    case 'quarter':
      return quarterStr === filter.specificPeriod;
    case 'month':
      return monthStr === filter.specificPeriod;
    case 'week':
      return weekStr === filter.specificPeriod;
    default:
      return true;
  }
}

// Calculate days difference between dates
export function getDaysDiff(d1Str: string, d2Str: string): number | null {
  const date1 = parseSheetDate(d1Str);
  const date2 = parseSheetDate(d2Str);
  if (!date1 || !date2) return null;
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Aggregate overall recruiting funnel KPIs
export function aggregateMetrics(
  mrfs: MRFRow[],
  candidates: CandidateRow[],
  interviews: InterviewRow[],
  filter: FilterState
): DashboardMetrics {
  // 1. Filter MRF
  const filteredMRFs = mrfs.filter(mrf => {
    if (filter.designation && mrf.designation !== filter.designation) return false;
    if (filter.unit && mrf.unit !== filter.unit) return false;
    if (!dateMatchesFilter(mrf.date || '', filter)) return false;
    return true;
  });

  // Calculate MRF status counters
  let totalOpenings = 0;
  let openPositionsCount = 0;
  let revokedPositionsCount = 0;
  let closedPositionsCount = 0;

  filteredMRFs.forEach(mrf => {
    const status = (mrf.status || '').toLowerCase();
    const ops = mrf.openings || 0;
    
    totalOpenings += ops;

    if (status.includes('revoke') || status.includes('cancel')) {
      revokedPositionsCount += ops;
    } else if (status.includes('closed') || status.includes('fill') || status.includes('complete')) {
      closedPositionsCount += ops;
    } else {
      openPositionsCount += ops;
    }
  });

  // 2. Filter Candidates
  const filteredCandidates = candidates.filter(cand => {
    if (filter.designation && cand.designation !== filter.designation) return false;
    if (filter.unit && cand.unit !== filter.unit) return false;
    
    // Apply time-frame filter comparing candidate's appliedDate
    if (!dateMatchesFilter(cand.appliedDate || '', filter)) return false;

    // Apply text search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      const nameMatch = (cand.name || '').toLowerCase().includes(query);
      const idMatch = (cand.id || '').toLowerCase().includes(query);
      const destMatch = (cand.designation || '').toLowerCase().includes(query);
      if (!nameMatch && !idMatch && !destMatch) return false;
    }

    return true;
  });

  // Calculate candidate status counters
  let appliedCount = filteredCandidates.length;
  let shortlistedR1Count = 0;
  let shortlistedR2Count = 0;
  let offerMadeCount = 0;
  let offerAcceptedCount = 0;
  let joinedCount = 0;

  // Let's also fetch R1/R2 shortlists from Interviews tab as a fallback/additional source
  // We match interviews targeting our filtered candidates
  const candidateNamesSet = new Set(filteredCandidates.map(c => (c.name || '').toLowerCase()));
  const candidateIdsSet = new Set(filteredCandidates.map(c => (c.id || '').toLowerCase()).filter(Boolean));

  const relevantInterviews = interviews.filter(int => {
    const nameMatch = candNameMatches(int.candidateName || '', candidateNamesSet);
    const idMatch = int.candidateId ? candidateIdsSet.has(int.candidateId.toLowerCase()) : false;
    return nameMatch || idMatch;
  });

  filteredCandidates.forEach(cand => {
    const { isR1, isR2, isOffered, isAccepted, isJoined } = getStatusCategory(cand);

    // Primary source checking
    if (isR1) shortlistedR1Count++;
    if (isR2) shortlistedR2Count++;
    if (isOffered) offerMadeCount++;
    if (isAccepted) offerAcceptedCount++;
    if (isJoined) joinedCount++;
  });

  // Fallback / cross-validate shortlist metrics using Interviews tab if candidate status doesn't have it parsed
  relevantInterviews.forEach(int => {
    const r = (int.round || '').toLowerCase();
    const s = (int.status || '').toLowerCase();
    const passed = s.includes('shortlist') || s.includes('pass') || s.includes('selected') || s.includes('clear');

    if (passed) {
      if (r.includes('r1') || r.includes('1st') || r.includes('round 1')) {
        // Only increment if candidate status wasn't already classified
        shortlistedR1Count = Math.max(shortlistedR1Count, uniqueRoundInterviewsCount(relevantInterviews, '1'));
      }
      if (r.includes('r2') || r.includes('2nd') || r.includes('round 2')) {
        shortlistedR2Count = Math.max(shortlistedR2Count, uniqueRoundInterviewsCount(relevantInterviews, '2'));
      }
    }
  });

  // Calculated Rates
  // % offer Letter Accepted = (Offer Accepted) / (Offer Made) * 100
  const offerAcceptanceRate = offerMadeCount > 0 ? (offerAcceptedCount / offerMadeCount) * 100 : 0;
  // Joining % = (Joined Count) / (Offer Accepted) * 100
  const joiningRate = offerAcceptedCount > 0 ? (joinedCount / offerAcceptedCount) * 100 : 0;

  // Average time calculation (days)
  let sumOpToOfferAcceptDays = 0;
  let countOpToOfferAccept = 0;

  let sumOfferAcceptToJoinDays = 0;
  let countOfferAcceptToJoin = 0;

  let sumTimeToHireDays = 0;
  let countTimeToHire = 0;

  filteredCandidates.forEach(cand => {
    // 1. Applied (Opening equivalents) to Offer Accept Date
    if (cand.appliedDate && cand.offerAcceptDate) {
      const diff = getDaysDiff(cand.appliedDate, cand.offerAcceptDate);
      if (diff !== null && diff >= 0) {
        sumOpToOfferAcceptDays += diff;
        countOpToOfferAccept++;
      }
    }

    // 2. Offer Accept to Joining
    if (cand.offerAcceptDate && cand.joiningDate) {
      const diff = getDaysDiff(cand.offerAcceptDate, cand.joiningDate);
      if (diff !== null && diff >= 0) {
        sumOfferAcceptToJoinDays += diff;
        countOfferAcceptToJoin++;
      }
    }

    // 3. Time to Hire = Applied to Joined
    if (cand.appliedDate && cand.joiningDate) {
      const diff = getDaysDiff(cand.appliedDate, cand.joiningDate);
      if (diff !== null && diff >= 0) {
        sumTimeToHireDays += diff;
        countTimeToHire++;
      }
    }
  });

  const avgOpeningToOfferAcceptDays = countOpToOfferAccept > 0 ? Math.round(sumOpToOfferAcceptDays / countOpToOfferAccept) : 0;
  const avgOfferAcceptToJoiningDays = countOfferAcceptToJoin > 0 ? Math.round(sumOfferAcceptToJoinDays / countOfferAcceptToJoin) : 0;
  const avgTimeToHireDays = countTimeToHire > 0 ? Math.round(sumTimeToHireDays / countTimeToHire) : 0;

  return {
    totalOpenings,
    appliedCount,
    shortlistedR1Count,
    shortlistedR2Count,
    offerMadeCount,
    offerAcceptedCount,
    joinedCount,
    offerAcceptanceRate,
    joiningRate,
    avgOpeningToOfferAcceptDays,
    avgOfferAcceptToJoiningDays,
    avgTimeToHireDays,
    openPositionsCount,
    revokedPositionsCount,
    closedPositionsCount
  };
}

// Helpers for interview matching and count aggregations
function candNameMatches(interviewName: string, nameSet: Set<string>): boolean {
  if (!interviewName) return false;
  return nameSet.has(interviewName.toLowerCase().trim());
}

function uniqueRoundInterviewsCount(ints: InterviewRow[], roundNumStr: string): number {
  const uniqCandidates = new Set<string>();
  ints.forEach(int => {
    const r = (int.round || '').toLowerCase();
    const s = (int.status || '').toLowerCase();
    const passed = s.includes('shortlist') || s.includes('pass') || s.includes('selected') || s.includes('clear');
    if (passed && (r.includes(`r${roundNumStr}`) || r.includes(`${roundNumStr}st`) || r.includes(`${roundNumStr}nd`) || r.includes(`round ${roundNumStr}`))) {
      uniqCandidates.add((int.candidateName || '').toLowerCase().trim());
    }
  });
  return uniqCandidates.size;
}

// Aggregate Month-wise pipeline distribution for charts
export function aggregatePipelineChart(candidates: CandidateRow[]) {
  const monthsData: Record<string, { month: string; applied: number; offered: number; joined: number }> = {};

  candidates.forEach(cand => {
    const d = parseSheetDate(cand.appliedDate);
    if (!d) return;

    const year = d.getFullYear();
    const month = d.toLocaleString('default', { month: 'short' });
    const key = `${year}-${d.getMonth().toString().padStart(2, '0')} (${month} ${year})`;

    if (!monthsData[key]) {
      monthsData[key] = { month: `${month} ${year}`, applied: 0, offered: 0, joined: 0 };
    }

    monthsData[key].applied++;

    const { isOffered, isJoined } = getStatusCategory(cand);
    if (isOffered) monthsData[key].offered++;
    if (isJoined) monthsData[key].joined++;
  });

  return Object.keys(monthsData)
    .sort() // Sort by year-month chronologically
    .map(key => monthsData[key]);
}

// Aggregate designation performance for table & bar chart insights
export function aggregateDesignationInsights(candidates: CandidateRow[], mrfs: MRFRow[]) {
  const designMap: Record<string, {
    designation: string;
    openings: number;
    applied: number;
    offered: number;
    joined: number;
  }> = {};

  // Aggregate openings from MRF
  mrfs.forEach(mrf => {
    const des = mrf.designation || 'Unspecified';
    if (!designMap[des]) {
      designMap[des] = { designation: des, openings: 0, applied: 0, offered: 0, joined: 0 };
    }
    designMap[des].openings += mrf.openings || 0;
  });

  // Aggregate candidates metrics
  candidates.forEach(cand => {
    const des = cand.designation || 'Unspecified';
    if (!designMap[des]) {
      designMap[des] = { designation: des, openings: 0, applied: 0, offered: 0, joined: 0 };
    }
    designMap[des].applied++;

    const { isOffered, isJoined } = getStatusCategory(cand);
    if (isOffered) designMap[des].offered++;
    if (isJoined) designMap[des].joined++;
  });

  return Object.values(designMap).filter(d => d.applied > 0 || d.openings > 0);
}

// Aggregate unit recruitment performance
export function aggregateUnitInsights(candidates: CandidateRow[]) {
  const unitMap: Record<string, {
    unit: string;
    applied: number;
    offered: number;
    joined: number;
  }> = {};

  candidates.forEach(cand => {
    const unit = cand.unit || 'Unspecified';
    if (!unitMap[unit]) {
      unitMap[unit] = { unit, applied: 0, offered: 0, joined: 0 };
    }
    unitMap[unit].applied++;

    const { isOffered, isJoined } = getStatusCategory(cand);
    if (isOffered) unitMap[unit].offered++;
    if (isJoined) unitMap[unit].joined++;
  });

  return Object.values(unitMap);
}

// Extract filter options dynamically from data sets
export function extractFilterOptions(mrfs: MRFRow[], candidates: CandidateRow[], interviews?: InterviewRow[]) {
  const designationsSet = new Set<string>();
  const unitsSet = new Set<string>();
  const timeframeOptionsMap: Record<string, Set<string>> = {
    week: new Set(),
    month: new Set(),
    quarter: new Set(),
    year: new Set()
  };

  // Collect designations only from Interview tab (column C)
  if (interviews && interviews.length > 0) {
    interviews.forEach(i => {
      if (i.designation && i.designation !== 'Unspecified' && i.designation !== 'Unknown Designation') {
        designationsSet.add(i.designation);
      }
    });
  } else {
    // Fallback if interviews are empty
    mrfs.forEach(m => {
      if (m.designation && m.designation !== 'Unknown Designation') designationsSet.add(m.designation);
    });
    candidates.forEach(c => {
      if (c.designation && c.designation !== 'Unspecified') designationsSet.add(c.designation);
    });
  }

  // Collect units and dates from MRFs
  mrfs.forEach(m => {
    if (m.unit && m.unit !== 'Unknown Unit') unitsSet.add(m.unit);
    addDateToTimeframeOptions(m.date, timeframeOptionsMap);
  });

  // Collect units and dates from Candidates
  candidates.forEach(c => {
    if (c.unit && c.unit !== 'Unspecified') unitsSet.add(c.unit);
    addDateToTimeframeOptions(c.appliedDate, timeframeOptionsMap);
  });

  return {
    designations: Array.from(designationsSet).sort(),
    units: Array.from(unitsSet).sort(),
    weeks: Array.from(timeframeOptionsMap.week).sort().reverse(),
    months: Array.from(timeframeOptionsMap.month).sort().reverse(),
    quarters: Array.from(timeframeOptionsMap.quarter).sort().reverse(),
    years: Array.from(timeframeOptionsMap.year).sort().reverse()
  };
}

function addDateToTimeframeOptions(dateStr: string | undefined, map: Record<string, Set<string>>) {
  if (!dateStr) return;
  const d = parseSheetDate(dateStr);
  if (!d) return;

  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  // Year: YYYY
  map.year.add(String(year));

  // Quarter: YYYY-QX
  const quarter = Math.ceil(month / 3);
  map.quarter.add(`${year}-Q${quarter}`);

  // Month: YYYY-MM
  map.month.add(`${year}-${month.toString().padStart(2, '0')}`);

  // Week: YYYY-WXX
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  map.week.add(`${year}-W${weekNum}`);
}
