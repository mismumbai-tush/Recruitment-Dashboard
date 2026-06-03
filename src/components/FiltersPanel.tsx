/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FilterState } from '../types';
import { Filter, RefreshCw, Search, X } from 'lucide-react';

interface FiltersPanelProps {
  id: string;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  options: {
    designations: string[];
    units: string[];
    weeks: string[];
    months: string[];
    quarters: string[];
    years: string[];
  };
  onRefresh: () => void;
  loading: boolean;
}

export default function FiltersPanel({
  id,
  filters,
  setFilters,
  options,
  onRefresh,
  loading,
}: FiltersPanelProps) {

  const handleTimeframeChange = (timeframe: FilterState['timeframe']) => {
    let specificPeriod = '';
    // Select first option by default
    if (timeframe === 'week' && options.weeks.length > 0) specificPeriod = options.weeks[0];
    if (timeframe === 'month' && options.months.length > 0) specificPeriod = options.months[0];
    if (timeframe === 'quarter' && options.quarters.length > 0) specificPeriod = options.quarters[0];
    if (timeframe === 'year' && options.years.length > 0) specificPeriod = options.years[0];

    setFilters(prev => ({
      ...prev,
      timeframe,
      specificPeriod,
    }));
  };

  const handlePeriodChange = (specificPeriod: string) => {
    setFilters(prev => ({
      ...prev,
      specificPeriod,
    }));
  };

  const clearFilters = () => {
    setFilters({
      designation: '',
      unit: '',
      timeframe: 'all',
      specificPeriod: '',
      searchQuery: '',
    });
  };

  const isFiltered = filters.designation || filters.unit || filters.timeframe !== 'all' || filters.searchQuery;

  // Render specific period selectors based on time frame selected
  const renderPeriodSelector = () => {
    if (filters.timeframe === 'all') return null;

    let periods: string[] = [];
    let defaultLabel = '';

    if (filters.timeframe === 'week') {
      periods = options.weeks;
      defaultLabel = 'All Weeks';
    } else if (filters.timeframe === 'month') {
      periods = options.months;
      defaultLabel = 'All Months';
    } else if (filters.timeframe === 'quarter') {
      periods = options.quarters;
      defaultLabel = 'All Quarters';
    } else if (filters.timeframe === 'year') {
      periods = options.years;
      defaultLabel = 'All Years';
    }

    if (periods.length === 0) return null;

    return (
      <div className="flex-1 min-w-[130px]">
        <select
          id="select-period-dropdown"
          value={filters.specificPeriod}
          onChange={e => handlePeriodChange(e.target.value)}
          className="w-full px-2.5 py-1.5 h-9 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
        >
          <option value="">{defaultLabel}</option>
          {periods.map(p => (
            <option key={p} value={p}>
              {filters.timeframe === 'month' ? formatMonthName(p) : p}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const formatMonthName = (yearMonth: string) => {
    try {
      const [year, month] = yearMonth.split('-');
      if (!year || !month) return yearMonth;
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch {
      return yearMonth;
    }
  };

  return (
    <div id={id} className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl p-3 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* Filters Group in one horizontal flex container */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 flex-1 min-w-0">
        
        {/* Simple visual section badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
          <Filter className="h-3.5 w-3.5" />
          <span className="text-xs font-bold tracking-tight">Filters</span>
          {isFiltered && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>

        {/* Designation selector */}
        <div className="flex-1 min-w-[140px]">
          <select
            id="select-designation-dropdown"
            value={filters.designation}
            onChange={e => setFilters(prev => ({ ...prev, designation: e.target.value }))}
            className="w-full px-2.5 py-1.5 h-9 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Designations</option>
            {options.designations.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Business Unit selector */}
        <div className="flex-1 min-w-[130px]">
          <select
            id="select-unit-dropdown"
            value={filters.unit}
            onChange={e => setFilters(prev => ({ ...prev, unit: e.target.value }))}
            className="w-full px-2.5 py-1.5 h-9 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Units</option>
            {options.units.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* Timeframe selector */}
        <div className="flex-1 min-w-[110px]">
          <select
            id="select-timeframe-dropdown"
            value={filters.timeframe}
            onChange={e => handleTimeframeChange(e.target.value as FilterState['timeframe'])}
            className="w-full px-2.5 py-1.5 h-9 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
          >
            <option value="all">All-Time</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </select>
        </div>

        {/* Specific Period selector */}
        {renderPeriodSelector()}

        {/* Search Input */}
        <div className="relative flex-2 min-w-[180px]">
          <input
            id="search-query-field"
            type="text"
            placeholder="Search candidate/role..."
            value={filters.searchQuery}
            onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full pl-8 pr-7 py-1.5 h-9 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 placeholder-slate-400"
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
              className="absolute right-2.5 top-2.5 hover:text-rose-500 text-slate-400 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Actions Group aligned to the right */}
      <div className="flex items-center gap-2 shrink-0 justify-end mt-2 lg:mt-0">
        {isFiltered && (
          <button
            id="clear-filters-btn"
            onClick={clearFilters}
            className="flex items-center space-x-1 px-3 py-1.5 h-9 text-xs text-slate-500 hover:text-rose-600 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-150 dark:border-slate-800"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        )}

        <button
          id="sync-sheets-btn"
          disabled={loading}
          onClick={onRefresh}
          className="flex items-center space-x-1.5 px-4 py-1.5 h-9 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-xs hover:shadow-sm transition-all duration-150 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Sheets</span>
        </button>
      </div>
    </div>
  );
}
