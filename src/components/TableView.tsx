/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MRFRow, CandidateRow, InterviewRow, CheckRow } from '../types';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Layers, Search, Users } from 'lucide-react';

interface TableViewProps {
  id: string;
  mrfs: MRFRow[];
  candidates: CandidateRow[];
  interviews: InterviewRow[];
  checks: CheckRow[];
  searchQuery: string;
}

type TabType = 'mrfs' | 'candidates' | 'interviews' | 'checks';

export default function TableView({
  id,
  mrfs,
  candidates,
  interviews,
  checks,
  searchQuery,
}: TableViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('candidates');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Filter content based on active tab and global search query
  const getFilteredData = () => {
    const query = searchQuery.trim().toLowerCase();

    if (activeTab === 'candidates') {
      return candidates.filter(cand => {
        if (!query) return true;
        return (
          (cand.name || '').toLowerCase().includes(query) ||
          (cand.id || '').toLowerCase().includes(query) ||
          (cand.designation || '').toLowerCase().includes(query) ||
          (cand.unit || '').toLowerCase().includes(query) ||
          (cand.status || '').toLowerCase().includes(query)
        );
      });
    }

    if (activeTab === 'mrfs') {
      return mrfs.filter(mrf => {
        if (!query) return true;
        return (
          (mrf.id || '').toLowerCase().includes(query) ||
          (mrf.designation || '').toLowerCase().includes(query) ||
          (mrf.unit || '').toLowerCase().includes(query) ||
          (mrf.status || '').toLowerCase().includes(query)
        );
      });
    }

    if (activeTab === 'interviews') {
      return interviews.filter(int => {
        if (!query) return true;
        return (
          (int.candidateName || '').toLowerCase().includes(query) ||
          (int.candidateId || '').toLowerCase().includes(query) ||
          (int.round || '').toLowerCase().includes(query) ||
          (int.status || '').toLowerCase().includes(query) ||
          (int.designation || '').toLowerCase().includes(query)
        );
      });
    }

    // Checks
    return checks.filter(chk => {
      if (!query) return true;
      return JSON.stringify(chk.originalData).toLowerCase().includes(query);
    });
  };

  const filteredData = getFilteredData();
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // Ensure page is in-bounds
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1); // reset page on tab switch
  };

  // Status badge styling helper
  const renderStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    let classes = 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300';

    if (s.includes('joined') || s.includes('joined company') || s.includes('hire') || s.includes('fill')) {
      classes = 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50';
    } else if (s.includes('offer') || s.includes('accept') || s.includes('sign')) {
      classes = 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/50';
    } else if (s.includes('shortlist') || s.includes('selected') || s.includes('pass') || s.includes('clear')) {
      classes = 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50';
    } else if (s.includes('reject') || s.includes('cancel') || s.includes('revoke') || s.includes('decline') || s.includes('withdrawn')) {
      classes = 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50';
    } else if (s.includes('open') || s.includes('active') || s.includes('raising')) {
      classes = 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/50';
    } else if (s.includes('pending') || s.includes('schedule') || s.includes('progress') || s.includes('hold')) {
      classes = 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50';
    }

    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border border-solid ${classes}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  // Dynamically obtain all column headers for the spreadsheet tab to render them perfectly!
  const getTableHeaders = () => {
    if (paginatedData.length === 0) return [];
    // We inspect keys of the first row's original data to display everything dynamically!
    const firstRow = paginatedData[0];
    if ('originalData' in firstRow) {
      return Object.keys(firstRow.originalData);
    }
    return [];
  };

  const headers = getTableHeaders();

  return (
    <div id={id} className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-100 dark:border-slate-900 overflow-x-auto bg-slate-50/50 dark:bg-slate-950">
        <button
          id="candidates-tab-btn"
          onClick={() => handleTabChange('candidates')}
          className={`px-5 py-4 flex items-center space-x-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'candidates'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Candidates</span>
          <span className="bg-slate-200/60 dark:bg-slate-900/60 text-[11px] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded ml-1 font-mono">
            {candidates.length}
          </span>
        </button>

        <button
          id="mrf-tab-btn"
          onClick={() => handleTabChange('mrfs')}
          className={`px-5 py-4 flex items-center space-x-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'mrfs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>MRF (Requisitions)</span>
          <span className="bg-slate-200/60 dark:bg-slate-900/60 text-[11px] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded ml-1 font-mono">
            {mrfs.length}
          </span>
        </button>

        <button
          id="interviews-tab-btn"
          onClick={() => handleTabChange('interviews')}
          className={`px-5 py-4 flex items-center space-x-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'interviews'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Interviews</span>
          <span className="bg-slate-200/60 dark:bg-slate-900/60 text-[11px] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded ml-1 font-mono">
            {interviews.length}
          </span>
        </button>

        <button
          id="checks-tab-btn"
          onClick={() => handleTabChange('checks')}
          className={`px-5 py-4 flex items-center space-x-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'checks'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Cross Checks ("Check")</span>
          <span className="bg-slate-200/60 dark:bg-slate-900/60 text-[11px] text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded ml-1 font-mono">
            {checks.length}
          </span>
        </button>
      </div>

      {/* Spreadsheet grid scrollable container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
              <th className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-widest text-[10px] w-12 text-center">Row</th>
              {headers.map(h => (
                <th key={h} className="py-3 px-4 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 1} className="py-12 text-center text-slate-400 text-sm">
                  No matching items found for your active filter constraints.
                </td>
              </tr>
            ) : (
              paginatedData.map((rowItem) => {
                const original = rowItem.originalData;
                return (
                  <tr key={rowItem.rowId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 font-medium text-center bg-slate-50/20 dark:bg-slate-950 border-r border-slate-50 dark:border-slate-900">{rowItem.rowId}</td>
                    {headers.map(header => {
                      const cellVal = original[header] || '';
                      
                      // Highlight special status columns elegantly
                      const matchHeader = header.toLowerCase().replace(/[\s._-]/g, '');
                      const isStatusCol = matchHeader === 'status' || matchHeader === 'stage';

                      return (
                        <td key={header} className="py-3.5 px-4 text-slate-600 dark:text-slate-350 max-w-[240px] truncate">
                          {isStatusCol ? renderStatusBadge(cellVal) : (cellVal || <span className="text-slate-300 dark:text-slate-700 font-mono">-</span>)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination component */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900 px-5 py-3 bg-slate-50/30 dark:bg-slate-950 select-none">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing <strong className="font-semibold text-slate-700 dark:text-slate-300">{startIndex + 1}</strong> to{' '}
            <strong className="font-semibold text-slate-700 dark:text-slate-300">
              {Math.min(startIndex + itemsPerPage, totalItems)}
            </strong>{' '}
            of <strong className="font-semibold text-slate-700 dark:text-slate-300">{totalItems}</strong> entries
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;

                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="text-slate-400 text-xs px-1">...</span>}
                    <button
                      onClick={() => handlePageChange(p)}
                      className={`px-3 py-1 text-xs rounded-md ${
                        safeCurrentPage === p
                          ? 'bg-blue-600 text-white font-bold'
                          : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
