/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';

interface KPICardProps {
  id: string;
  title: string;
  value: string | number;
  iconName: keyof typeof Icons;
  description?: string;
  change?: string; // Change representation, e.g., "+3 this month"
  colorTheme?: 'blue' | 'green' | 'teal' | 'orange' | 'indigo' | 'rose' | 'amber';
  loading?: boolean;
}

export default function KPICard({
  id,
  title,
  value,
  iconName,
  description,
  change,
  colorTheme = 'blue',
  loading = false,
}: KPICardProps) {
  const IconComponent = Icons[iconName] as React.ComponentType<any>;

  const themeColors = {
    blue: {
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
      accent: 'border-l-4 border-l-blue-500',
    },
    green: {
      text: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-50 dark:bg-green-900/30',
      accent: 'border-l-4 border-l-green-500',
    },
    teal: {
      text: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-50 dark:bg-teal-900/30',
      accent: 'border-l-4 border-l-teal-500',
    },
    orange: {
      text: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-50 dark:bg-orange-900/30',
      accent: 'border-l-4 border-l-orange-500',
    },
    indigo: {
      text: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
      accent: 'border-l-4 border-l-indigo-500',
    },
    rose: {
      text: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-900/30',
      accent: 'border-l-4 border-l-rose-500',
    },
    amber: {
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-900/30',
      accent: 'border-l-4 border-l-amber-500',
    },
  };

  const colors = themeColors[colorTheme] || themeColors.blue;

  return (
    <motion.div
      id={id}
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
      className={`relative p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200/80 dark:border-slate-700/85 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[110px] ${colors.accent}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="space-y-1 min-w-0 flex-1">
          {/* Label: Clear high-contrast text */}
          <p className="text-[10px] sm:text-[11px] font-extrabold tracking-wider text-slate-500 dark:text-slate-400 uppercase leading-snug line-clamp-2 min-h-[28px]" title={title}>
            {title}
          </p>
          {loading ? (
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
          ) : (
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 leading-none">
              {value}
            </h3>
          )}
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${colors.iconBg} ${colors.text} flex items-center justify-center shadow-xs`}>
          {IconComponent && <IconComponent className="h-4 w-4 stroke-[2.5]" />}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-1 leading-tight text-[10px]">
        {description && (
          <span 
            className={`text-slate-400 dark:text-slate-500 font-semibold truncate ${
              change ? 'max-w-[62%]' : 'w-full'
            }`} 
            title={description}
          >
            {description}
          </span>
        )}
        {change && !loading && (
          <span className={`font-bold shrink-0 ml-auto px-1.5 py-0.5 rounded text-[9px] ${
            change.startsWith('+') || (change.includes('%') && !change.startsWith('0')) 
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700/50'
          }`}>
            {change}
          </span>
        )}
      </div>
    </motion.div>
  );
}
