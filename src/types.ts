/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GSheetResponse {
  range: string;
  majorDimension: string;
  values: string[][];
}

// Low-level representation of parsed sheet rows
export interface MRFRow {
  rowId: number;
  id?: string;
  designation?: string;
  unit?: string;
  openings?: number;
  status?: string; // Open, Closed, Revoked
  date?: string; // Requisition date
  originalData: Record<string, string>;
}

export interface CandidateRow {
  rowId: number;
  id?: string;
  name?: string;
  designation?: string;
  unit?: string;
  status?: string; // Applied, Shortlisted, Offered, Accepted, Joined, Declined/Revoked, Rejected
  experience?: string;
  appliedDate?: string;
  offerDate?: string;
  offerAcceptDate?: string;
  joiningDate?: string;
  source?: string;
  originalData: Record<string, string>;
}

export interface InterviewRow {
  rowId: number;
  candidateId?: string;
  candidateName?: string;
  designation?: string;
  round?: string; // Round 1, Round 2
  status?: string; // Shortlisted, Rejected, Pending
  date?: string;
  originalData: Record<string, string>;
}

export interface CheckRow {
  rowId: number;
  originalData: Record<string, string>;
}

export interface DashboardMetrics {
  totalOpenings: number;
  appliedCount: number;
  shortlistedR1Count: number;
  shortlistedR2Count: number;
  offerMadeCount: number;
  offerAcceptedCount: number;
  joinedCount: number;
  offerAcceptanceRate: number; // % offer letter accepted
  joiningRate: number; // Joining % (joined / accepted)
  avgOpeningToOfferAcceptDays: number;
  avgOfferAcceptToJoiningDays: number;
  avgTimeToHireDays: number;
  openPositionsCount: number;
  revokedPositionsCount: number;
  closedPositionsCount: number;
}

export interface FilterState {
  designation: string;
  unit: string;
  timeframe: 'all' | 'week' | 'month' | 'quarter' | 'year';
  specificPeriod: string; // e.g., "2026-05", "2026-Q2"
  searchQuery: string;
}
