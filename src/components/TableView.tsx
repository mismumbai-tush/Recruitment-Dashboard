/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  const [itemsPerPage, setItemsPerPage] = useState<number>(20); // Default to 20 per user request
  const [localSearch, setLocalSearch] = useState<string>('');
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});

  // Helper to obtain the primary raw dataset for the active tab
  const getTabRawRows = () => {
    if (activeTab === 'candidates') return candidates;
    if (activeTab === 'mrfs') return mrfs;
    if (activeTab === 'interviews') return interviews;
    return checks;
  };

  // Helper to extract headers from the first raw row of the active tab
  const getTabHeadersAll = () => {
    const rows = getTabRawRows();
    if (rows.length === 0) return [];
    return Object.keys(rows[0].originalData);
  };

  // Auto-discover specifically required filters for each tab
  const filterableCols = useMemo(() => {
    const headers = getTabHeadersAll();
    const cols: { key: string; label: string }[] = [];

    const findMatch = (synonyms: string[]) => {
      const clean = (s: string) => s.toLowerCase().replace(/[\s._\-/[\]()]/g, '');
      const cleanSyns = synonyms.map(clean);
      for (const cs of cleanSyns) {
        const found = headers.find(h => {
          const ch = clean(h);
          return ch === cs || ch.includes(cs) || cs.includes(ch);
        });
        if (found) return found;
      }
      return null;
    };

    if (activeTab === 'candidates') {
      // filters: (Designation)-Position Applying For, unit, status, source
      const desKey = findMatch(['Position Applying For', 'Designation', 'Role', 'Position']);
      const unitKey = findMatch(['Unit', 'Location', 'Branch', 'Department']);
      const statusKey = findMatch(['Status', 'Stage', 'Candidate Status']);
      const sourceKey = findMatch(['Source', 'Source Category', 'Lead Source', 'Channel']);

      if (desKey) cols.push({ key: desKey, label: 'Designation' });
      if (unitKey) cols.push({ key: unitKey, label: 'Unit' });
      if (statusKey) cols.push({ key: statusKey, label: 'Status' });
      if (sourceKey) cols.push({ key: sourceKey, label: 'Source' });
    } 
    else if (activeTab === 'mrfs') {
      // filters: Designation, Unit, status
      const desKey = findMatch(['Required Position', 'Required possion', 'Designation', 'Role', 'Position']);
      const unitKey = findMatch(['Unit', 'Location', 'Branch', 'Department']);
      const statusKey = findMatch(['Status', 'MRF Status', 'Requisition Status']);

      if (desKey) cols.push({ key: desKey, label: 'Designation' });
      if (unitKey) cols.push({ key: unitKey, label: 'Unit' });
      if (statusKey) cols.push({ key: statusKey, label: 'Status' });
    }
    else if (activeTab === 'checks') {
      // filters: Designation, unit/location, status
      const desKey = findMatch(['Designation', 'Position Applying For', 'Role', 'Position']);
      const unitKey = findMatch(['Unit/Location', 'Location/Unit', 'Unit', 'Location', 'Branch']);
      const statusKey = findMatch(['Status', 'Stage', 'Result', 'Validation']);

      if (desKey) cols.push({ key: desKey, label: 'Designation' });
      if (unitKey) cols.push({ key: unitKey, label: 'Unit/Location' });
      if (statusKey) cols.push({ key: statusKey, label: 'Status' });
    }
    else if (activeTab === 'interviews') {
      // filters: Designation, unit/location, status
      const desKey = findMatch(['Designation', 'Position Applying For', 'Role', 'Position']);
      const unitKey = findMatch(['Unit/Location', 'Location/Unit', 'Unit', 'Location', 'Branch']);
      const statusKey = findMatch(['Status', 'Stage', 'Round Status']);

      if (desKey) cols.push({ key: desKey, label: 'Designation' });
      if (unitKey) cols.push({ key: unitKey, label: 'Unit/Location' });
      if (statusKey) cols.push({ key: statusKey, label: 'Status' });
    }

    return cols;
  }, [activeTab, mrfs, candidates, interviews, checks]);

  // Extract unique sorted values for any column key
  const getUniqueValuesForCol = (colKey: string) => {
    const rawRows = getTabRawRows();
    const valuesSet = new Set<string>();
    rawRows.forEach(rowItem => {
      const val = rowItem.originalData[colKey];
      if (val !== undefined && val !== null) {
        const trimmed = String(val).trim();
        if (trimmed) {
          valuesSet.add(trimmed);
        }
      }
    });
    return Array.from(valuesSet).sort();
  };

  // Filter content based on active tab, global search, local search, and dynamic column selectors
  const getFilteredData = () => {
    const rawRows = getTabRawRows();
    let filtered = [...rawRows];

    // 1. Filter by parent query (if any)
    const globQ = searchQuery.trim().toLowerCase();
    if (globQ) {
      filtered = filtered.filter(rowItem => {
        return Object.values(rowItem.originalData).some(val => 
          String(val || '').toLowerCase().includes(globQ)
        );
      });
    }

    // 2. Filter by local search query (if any)
    const locQ = localSearch.trim().toLowerCase();
    if (locQ) {
      filtered = filtered.filter(rowItem => {
        return Object.values(rowItem.originalData).some(val => 
          String(val || '').toLowerCase().includes(locQ)
        );
      });
    }

    // 3. Filter by dynamic categorical local dropdowns
    Object.entries(localFilters).forEach(([colHeader, filterVal]) => {
      if (filterVal) {
        filtered = filtered.filter(rowItem => {
          const cellValue = String(rowItem.originalData[colHeader] || '').trim();
          return cellValue === filterVal;
        });
      }
    });

    return filtered;
  };

  const filteredData = getFilteredData();
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  // Enforce boundary checks
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
    setCurrentPage(1);
    setLocalFilters({}); // Reset custom local dropdown columns on tab change
    setLocalSearch('');  // Reset local sub-search on tab change
  };

  // Status badge helper
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

  const headers = getTabHeadersAll();

  return (
    <div id={id} className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl shadow-xs overflow-hidden flex flex-col">
      
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-100 dark:border-slate-900 overflow-x-auto bg-slate-50/50 dark:bg-slate-950">
        <button
          id="candidates-tab-btn"
          onClick={() => handleTabChange('candidates')}
          className={`px-5 py-4 flex items-center space-x-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === 'candidates'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
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
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
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
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
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
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
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

      {/* Local Controls & Filters Toolbar */}
      <div className="p-4 bg-slate-50/40 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left side: Search input and custom dynamic dropdown columns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Dedicated text search specifically for this table */}
          <div className="relative min-w-[200px] sm:max-w-xs flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder={`Search in current tab...`}
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-8 py-2 w-full text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            />
            {localSearch && (
              <button
                onClick={() => {
                  setLocalSearch('');
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Categorical filter selectors dynamically compiled */}
          {filterableCols.map(col => {
            const options = getUniqueValuesForCol(col.key);
            if (options.length === 0) return null;

            return (
              <div key={col.key} className="flex-1 min-w-[130px] sm:max-w-[195px]">
                <select
                  value={localFilters[col.key] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalFilters(prev => ({
                      ...prev,
                      [col.key]: val
                    }));
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-bold py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-705 dark:text-slate-300 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                >
                  <option value="">All {col.label}</option>
                  {options.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          {/* Separate Reset Filters button inside this table */}
          {(localSearch || Object.values(localFilters).some(Boolean)) && (
            <button
              onClick={() => {
                setLocalSearch('');
                setLocalFilters({});
                setCurrentPage(1);
              }}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 text-left sm:text-center shrink-0 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Right side: customizable page entries selector */}
        <div className="flex items-center gap-2 shrink-0 select-none text-slate-500 dark:text-slate-400 text-xs font-semibold self-end md:self-auto">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs font-bold py-1.5 px-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
          >
            <option value="10">10 entries</option>
            <option value="20">20 entries</option>
            <option value="50">50 entries</option>
            <option value="100">100 entries</option>
            <option value="500">500 entries</option>
          </select>
          <span>entries</span>
        </div>
      </div>

      {/* Spreadsheet grid scrollable container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
              <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-widest text-[9.5px] w-12 text-center">Row</th>
              {headers.map(h => (
                <th key={h} className="py-3 px-4 font-bold text-slate-500 uppercase tracking-widest text-[9.5px]">
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
                        <td key={header} className="py-3.5 px-4 text-slate-600 dark:text-slate-350 max-w-[240px] truncate font-medium">
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
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900 px-5 py-3.5 bg-slate-50/30 dark:bg-slate-950 select-none">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {totalItems === 0 ? (
              'Showing 0 entries'
            ) : (
              <>
                Showing <strong className="font-semibold text-slate-700 dark:text-slate-300">{startIndex + 1}</strong> to{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-300">
                  {Math.min(startIndex + itemsPerPage, totalItems)}
                </strong>{' '}
                of <strong className="font-semibold text-slate-700 dark:text-slate-300">{totalItems}</strong> entries
              </>
            )}
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
                      className={`px-3 py-1 text-xs rounded-md font-semibold ${
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
