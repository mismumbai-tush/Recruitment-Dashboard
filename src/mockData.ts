/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MRFRow, CandidateRow, InterviewRow, CheckRow } from './types';

export const MOCK_MRF: MRFRow[] = [
  {
    rowId: 1,
    id: 'MRF-2026-001',
    designation: 'Full Stack Developer',
    unit: 'Tech Mumbai',
    openings: 5,
    status: 'Open',
    date: '2026-04-10',
    originalData: {
      'MRF ID': 'MRF-2026-001',
      'Designation': 'Full Stack Developer',
      'Business Unit': 'Tech Mumbai',
      'No. of Openings': '5',
      'MRF Status': 'Open',
      'Date': '2026-04-10'
    }
  },
  {
    rowId: 2,
    id: 'MRF-2026-002',
    designation: 'Recruitment Specialist',
    unit: 'Corporate HQ',
    openings: 2,
    status: 'Closed',
    date: '2026-03-15',
    originalData: {
      'MRF ID': 'MRF-2026-002',
      'Designation': 'Recruitment Specialist',
      'Business Unit': 'Corporate HQ',
      'No. of Openings': '2',
      'MRF Status': 'Closed',
      'Date': '2026-03-15'
    }
  },
  {
    rowId: 3,
    id: 'MRF-2026-003',
    designation: 'Sales Manager',
    unit: 'Retail West',
    openings: 4,
    status: 'Open',
    date: '2026-04-20',
    originalData: {
      'MRF ID': 'MRF-2026-003',
      'Designation': 'Sales Manager',
      'Business Unit': 'Retail West',
      'No. of Openings': '4',
      'MRF Status': 'Open',
      'Date': '2026-04-20'
    }
  },
  {
    rowId: 4,
    id: 'MRF-2026-004',
    designation: 'Quality Engineer',
    unit: 'Manufacturing Pune',
    openings: 3,
    status: 'Open',
    date: '2026-05-01',
    originalData: {
      'MRF ID': 'MRF-2026-004',
      'Designation': 'Quality Engineer',
      'Business Unit': 'Manufacturing Pune',
      'No. of Openings': '3',
      'MRF Status': 'Open',
      'Date': '2026-05-01'
    }
  },
  {
    rowId: 5,
    id: 'MRF-2026-005',
    designation: 'Operations Associate',
    unit: 'Logistics Center',
    openings: 10,
    status: 'Open',
    date: '2026-05-05',
    originalData: {
      'MRF ID': 'MRF-2026-005',
      'Designation': 'Operations Associate',
      'Business Unit': 'Logistics Center',
      'No. of Openings': '10',
      'MRF Status': 'Open',
      'Date': '2026-05-05'
    }
  },
  {
    rowId: 6,
    id: 'MRF-2026-006',
    designation: 'Data Analyst',
    unit: 'Tech Mumbai',
    openings: 1,
    status: 'Revoked',
    date: '2026-04-01',
    originalData: {
      'MRF ID': 'MRF-2026-006',
      'Designation': 'Data Analyst',
      'Business Unit': 'Tech Mumbai',
      'No. of Openings': '1',
      'MRF Status': 'Revoked',
      'Date': '2026-04-01'
    }
  }
];

export const MOCK_CANDIDATES: CandidateRow[] = [
  {
    rowId: 1,
    id: 'CAND-001',
    name: 'Aarav Sharma',
    designation: 'Full Stack Developer',
    unit: 'Tech Mumbai',
    status: 'Joined',
    experience: '4 Years',
    appliedDate: '2026-04-12',
    offerDate: '2026-04-28',
    offerAcceptDate: '2026-04-30',
    joiningDate: '2026-05-15',
    originalData: {
      'Candidate ID': 'CAND-001',
      'Candidate Name': 'Aarav Sharma',
      'Designation': 'Full Stack Developer',
      'Business Unit': 'Tech Mumbai',
      'Candidate Status': 'Joined',
      'Experience': '4 Years',
      'Applied Date': '2026-04-12',
      'Offer Date': '2026-04-28',
      'Offer Accept Date': '2026-04-30',
      'Joining Date': '2026-05-15'
    }
  },
  {
    rowId: 2,
    id: 'CAND-002',
    name: 'Ananya Iyer',
    designation: 'Full Stack Developer',
    unit: 'Tech Mumbai',
    status: 'Offer Accepted',
    experience: '5 Years',
    appliedDate: '2026-04-15',
    offerDate: '2026-05-02',
    offerAcceptDate: '2026-05-05',
    joiningDate: '2026-06-10',
    originalData: {
      'Candidate ID': 'CAND-002',
      'Candidate Name': 'Ananya Iyer',
      'Designation': 'Full Stack Developer',
      'Business Unit': 'Tech Mumbai',
      'Candidate Status': 'Offer Accepted',
      'Experience': '5 Years',
      'Applied Date': '2026-04-15',
      'Offer Date': '2026-05-02',
      'Offer Accept Date': '2026-05-05',
      'Joining Date': ''
    }
  },
  {
    rowId: 3,
    id: 'CAND-003',
    name: 'Rohan Mehta',
    designation: 'Recruitment Specialist',
    unit: 'Corporate HQ',
    status: 'Joined',
    experience: '3 Years',
    appliedDate: '2026-03-18',
    offerDate: '2026-04-02',
    offerAcceptDate: '2026-04-04',
    joiningDate: '2026-04-25',
    originalData: {
      'Candidate ID': 'CAND-003',
      'Candidate Name': 'Rohan Mehta',
      'Designation': 'Recruitment Specialist',
      'Business Unit': 'Corporate HQ',
      'Candidate Status': 'Joined',
      'Experience': '3 Years',
      'Applied Date': '2026-03-18',
      'Offer Date': '2026-04-02',
      'Offer Accept Date': '2026-04-04',
      'Joining Date': '2026-04-25'
    }
  },
  {
    rowId: 4,
    id: 'CAND-004',
    name: 'Priyanka Patel',
    designation: 'Recruitment Specialist',
    unit: 'Corporate HQ',
    status: 'Joined',
    experience: '6 Years',
    appliedDate: '2026-03-20',
    offerDate: '2026-04-05',
    offerAcceptDate: '2026-04-08',
    joiningDate: '2026-05-02',
    originalData: {
      'Candidate ID': 'CAND-004',
      'Candidate Name': 'Priyanka Patel',
      'Designation': 'Recruitment Specialist',
      'Business Unit': 'Corporate HQ',
      'Candidate Status': 'Joined',
      'Experience': '6 Years',
      'Applied Date': '2026-03-20',
      'Offer Date': '2026-04-05',
      'Offer Accept Date': '2026-04-08',
      'Joining Date': '2026-05-02'
    }
  },
  {
    rowId: 5,
    id: 'CAND-005',
    name: 'Aditya Rao',
    designation: 'Sales Manager',
    unit: 'Retail West',
    status: 'Offer Made',
    experience: '8 Years',
    appliedDate: '2026-04-22',
    offerDate: '2026-05-20',
    offerAcceptDate: '',
    joiningDate: '',
    originalData: {
      'Candidate ID': 'CAND-005',
      'Candidate Name': 'Aditya Rao',
      'Designation': 'Sales Manager',
      'Business Unit': 'Retail West',
      'Candidate Status': 'Offer Made',
      'Experience': '8 Years',
      'Applied Date': '2026-04-22',
      'Offer Date': '2026-05-20',
      'Offer Accept Date': '',
      'Joining Date': ''
    }
  },
  {
    rowId: 6,
    id: 'CAND-006',
    name: 'Kavita Deshmukh',
    designation: 'Quality Engineer',
    unit: 'Manufacturing Pune',
    status: 'Shortlisted 2nd Round',
    experience: '2 Years',
    appliedDate: '2026-05-02',
    offerDate: '',
    offerAcceptDate: '',
    joiningDate: '',
    originalData: {
      'Candidate ID': 'CAND-006',
      'Candidate Name': 'Kavita Deshmukh',
      'Designation': 'Quality Engineer',
      'Business Unit': 'Manufacturing Pune',
      'Candidate Status': 'Shortlisted 2nd Round',
      'Experience': '2 Years',
      'Applied Date': '2026-05-02',
      'Offer Date': '',
      'Offer Accept Date': '',
      'Joining Date': ''
    }
  },
  {
    rowId: 7,
    id: 'CAND-007',
    name: 'Siddharth Sen',
    designation: 'Operations Associate',
    unit: 'Logistics Center',
    status: 'Shortlisted 1st Round',
    experience: '1 Year',
    appliedDate: '2026-05-08',
    offerDate: '',
    offerAcceptDate: '',
    joiningDate: '',
    originalData: {
      'Candidate ID': 'CAND-007',
      'Candidate Name': 'Siddharth Sen',
      'Designation': 'Operations Associate',
      'Business Unit': 'Logistics Center',
      'Candidate Status': 'Shortlisted 1st Round',
      'Experience': '1 Year',
      'Applied Date': '2026-05-08',
      'Offer Date': '',
      'Offer Accept Date': '',
      'Joining Date': ''
    }
  },
  {
    rowId: 8,
    id: 'CAND-008',
    name: 'Vikram Joshi',
    designation: 'Sales Manager',
    unit: 'Retail West',
    status: 'Rejected',
    experience: '5 Years',
    appliedDate: '2026-04-25',
    offerDate: '',
    offerAcceptDate: '',
    joiningDate: '',
    originalData: {
      'Candidate ID': 'CAND-008',
      'Candidate Name': 'Vikram Joshi',
      'Designation': 'Sales Manager',
      'Business Unit': 'Retail West',
      'Candidate Status': 'Rejected',
      'Experience': '5 Years',
      'Applied Date': '2026-04-25',
      'Offer Date': '',
      'Offer Accept Date': '',
      'Joining Date': ''
    }
  },
  {
    rowId: 9,
    id: 'CAND-009',
    name: 'Meera Nair',
    designation: 'Operations Associate',
    unit: 'Logistics Center',
    status: 'Joined',
    experience: '2 Years',
    appliedDate: '2026-05-06',
    offerDate: '2026-05-18',
    offerAcceptDate: '2026-05-19',
    joiningDate: '2026-05-28',
    originalData: {
      'Candidate ID': 'CAND-009',
      'Candidate Name': 'Meera Nair',
      'Designation': 'Operations Associate',
      'Business Unit': 'Logistics Center',
      'Candidate Status': 'Joined',
      'Experience': '2 Years',
      'Applied Date': '2026-05-06',
      'Offer Date': '2026-05-18',
      'Offer Accept Date': '2026-05-19',
      'Joining Date': '2026-05-28'
    }
  },
  {
    rowId: 10,
    id: 'CAND-010',
    name: 'Vikranth Reddy',
    designation: 'Full Stack Developer',
    unit: 'Tech Mumbai',
    status: 'Applied',
    experience: '3 Years',
    appliedDate: '2026-05-15',
    offerDate: '',
    offerAcceptDate: '',
    joiningDate: '',
    originalData: {
      'Candidate ID': 'CAND-010',
      'Candidate Name': 'Vikranth Reddy',
      'Designation': 'Full Stack Developer',
      'Business Unit': 'Tech Mumbai',
      'Candidate Status': 'Applied',
      'Experience': '3 Years',
      'Applied Date': '2026-05-15',
      'Offer Date': '',
      'Offer Accept Date': '',
      'Joining Date': ''
    }
  }
];

export const MOCK_INTERVIEWS: InterviewRow[] = [
  {
    rowId: 1,
    candidateId: 'CAND-001',
    candidateName: 'Aarav Sharma',
    designation: 'Full Stack Developer',
    round: 'Round 1 technical',
    status: 'Shortlisted',
    date: '2026-04-18',
    originalData: {
      'Candidate ID': 'CAND-001',
      'Candidate Name': 'Aarav Sharma',
      'Designation': 'Full Stack Developer',
      'Interview Round': 'Round 1 Technical',
      'Interview Status': 'Shortlisted',
      'Interview Date': '2026-04-18'
    }
  },
  {
    rowId: 2,
    candidateId: 'CAND-001',
    candidateName: 'Aarav Sharma',
    designation: 'Full Stack Developer',
    round: 'Round 2 Director',
    status: 'Shortlisted',
    date: '2026-04-25',
    originalData: {
      'Candidate ID': 'CAND-001',
      'Candidate Name': 'Aarav Sharma',
      'Designation': 'Full Stack Developer',
      'Interview Round': 'Round 2 Director',
      'Interview Status': 'Shortlisted',
      'Interview Date': '2026-04-25'
    }
  },
  {
    rowId: 3,
    candidateId: 'CAND-006',
    candidateName: 'Kavita Deshmukh',
    designation: 'Quality Engineer',
    round: 'Round 1 HR screening',
    status: 'Shortlisted',
    date: '2026-05-07',
    originalData: {
      'Candidate ID': 'CAND-006',
      'Candidate Name': 'Kavita Deshmukh',
      'Designation': 'Quality Engineer',
      'Interview Round': 'Round 1 HR Screening',
      'Interview Status': 'Shortlisted',
      'Interview Date': '2026-05-07'
    }
  },
  {
    rowId: 4,
    candidateId: 'CAND-007',
    candidateName: 'Siddharth Sen',
    designation: 'Operations Associate',
    round: 'Round 1 Ops test',
    status: 'Shortlisted',
    date: '2026-05-12',
    originalData: {
      'Candidate ID': 'CAND-007',
      'Candidate Name': 'Siddharth Sen',
      'Designation': 'Operations Associate',
      'Interview Round': 'Round 1 Ops Test',
      'Interview Status': 'Shortlisted',
      'Interview Date': '2026-05-12'
    }
  }
];

export const MOCK_CHECK: CheckRow[] = [
  {
    rowId: 1,
    originalData: {
      'Validation Item': 'Candidate Aarav Sharma background verified',
      'Status': 'Passed',
      'Coordinator': 'Shalini Singh'
    }
  },
  {
    rowId: 2,
    originalData: {
      'Validation Item': 'MRF openings budget cross-check',
      'Status': 'Valid',
      'Coordinator': 'Shalini Singh'
    }
  }
];

export const getPaddedMockRawInterviews = (): string[][] => {
  const data = [
    // Header (1: name, 2: des, 14: source, 15: unit, 19: r1, 27: r2, 41: ap, 44: as (joined), 49: ax (key), 57: bf (opening))
    { 1: 'Candidate Name', 2: 'Designation', 3: 'Interview Date', 14: 'Source of Category', 15: 'Unit', 19: 'Round 1', 27: 'Round 2', 41: 'Offer Accepted', 44: 'Joined', 49: 'Key', 57: 'Opening', 60: 'MRF Status' },
    // Rows
    { 1: 'Aarav Sharma', 2: 'Full Stack Developer', 3: '2026-04-18', 14: 'LinkedIn', 15: 'Tech Mumbai', 19: 'Shortlisted', 27: 'Shortlisted', 41: 'Accepted', 44: 'Joined', 49: 'KEY-FSD', 57: '6', 60: 'Open' },
    { 1: 'Ananya Iyer', 2: 'Full Stack Developer', 3: '2026-04-15', 14: 'Naukri', 15: 'Tech Mumbai', 19: 'Shortlisted', 27: 'Shortlisted', 41: 'Accepted', 44: '', 49: 'KEY-FSD', 57: '6', 60: 'Open' },
    { 1: 'Kabir Mehta', 2: 'Sales Manager', 3: '2026-04-22', 14: 'Direct Reference', 15: 'Retail West', 19: 'Shortlisted', 27: 'Shortlisted', 41: 'Accepted', 44: 'Joined', 49: 'KEY-SM', 57: '3', 60: 'Open' },
    { 1: 'Rohan Joshi', 2: 'Data Analyst', 3: '2026-04-20', 14: 'Consultancy', 15: 'Tech Mumbai', 19: 'Shortlisted', 27: 'Shortlisted', 41: '', 44: '', 49: 'KEY-DA', 57: '2', 60: 'Open' },
    { 1: 'Sneha Patil', 2: 'Recruitment Specialist', 3: '2026-04-25', 14: 'Walk-in', 15: 'Corporate HQ', 19: 'Shortlisted', 27: '', 41: '', 44: '', 49: 'KEY-RS', 57: '1', 60: 'Open' },
    { 1: 'Kavita Deshmukh', 2: 'Quality Engineer', 3: '2026-05-07', 14: 'Naukri', 15: 'Manufacturing Pune', 19: 'Shortlisted', 27: 'Shortlisted', 41: 'Accepted', 44: 'Joined', 49: 'KEY-QE', 57: '1', 60: 'Open' },
    { 1: 'Siddharth Sen', 2: 'Operations Associate', 3: '2026-05-12', 14: 'LinkedIn', 15: 'Logistics Center', 19: 'Shortlisted', 27: 'Shortlisted', 41: 'Accepted', 44: 'Joined', 49: 'KEY-OA', 57: '4', 60: 'Open' },
    { 1: 'Priya Rao', 2: 'Full Stack Developer', 3: '2026-05-14', 14: 'Consultancy', 15: 'Tech Mumbai', 19: '', 27: '', 41: '', 44: '', 49: 'KEY-FSD', 57: '6', 60: 'Open' },
    { 1: 'Meera Nair', 2: 'Operations Associate', 3: '2026-05-06', 14: 'Direct Reference', 15: 'Logistics Center', 19: 'Shortlisted', 27: 'Shortlisted', 41: 'Accepted', 44: 'Joined', 49: 'KEY-OA', 57: '4', 60: 'Open' },
    { 1: 'Vikranth Reddy', 2: 'Full Stack Developer', 3: '2026-05-15', 14: 'LinkedIn', 15: 'Tech Mumbai', 19: '', 27: '', 41: '', 44: '', 49: 'KEY-FSD', 57: '6', 60: 'Open' }
  ];

  return data.map(obj => {
    const arr = Array(65).fill('');
    Object.entries(obj).forEach(([idx, val]) => {
      arr[Number(idx)] = val;
    });
    return arr;
  });
};

export const getPaddedMockRawCheck = (): string[][] => {
  const data = [
    // Header (1: unit, 3: opening, 8: joined, 9: remaining, 12: key)
    { 1: 'location/unit', 3: 'Opening', 8: 'Joined', 9: 'Remaining', 12: 'Key' },
    // Rows matching Designation/Unit keys
    { 1: 'Tech Mumbai', 3: '6', 8: '4', 9: '2', 12: 'KEY-FSD' },
    { 1: 'Retail West', 3: '3', 8: '2', 9: '1', 12: 'KEY-SM' },
    { 1: 'Manufacturing Pune', 3: '1', 8: '1', 9: '0', 12: 'KEY-QE' },
    { 1: 'Logistics Center', 3: '4', 8: '4', 9: '0', 12: 'KEY-OA' },
    { 1: 'Corporate HQ', 3: '1', 8: '0', 9: '1', 12: 'KEY-RS' },
    { 1: 'Tech Mumbai', 3: '2', 8: '0', 9: '2', 12: 'KEY-DA' }
  ];

  return data.map(obj => {
    const arr = Array(20).fill('');
    Object.entries(obj).forEach(([idx, val]) => {
      arr[Number(idx)] = val;
    });
    return arr;
  });
};
