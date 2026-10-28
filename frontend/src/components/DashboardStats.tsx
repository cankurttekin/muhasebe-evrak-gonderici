import React from 'react';
import { Users, FileText, CheckCircle2, Clock } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalDocs: number;
    sentDocs: number;
    pendingDocs: number;
    fullySentMukellefs: number;
    pendingMukellefs: number;
  };
  totalMukellefs: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, totalMukellefs }) => {
  const percentComplete = stats.totalDocs > 0 
    ? Math.round((stats.sentDocs / stats.totalDocs) * 100) 
    : 0;

  return (
    <div className="space-y-2.5">
      {/* Metric Cards Grid - Compact Dark Gray */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Mükellefs */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-3 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Mükellefler</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-zinc-100">{totalMukellefs}</span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">Firma</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Total Docs */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-3 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Evraklar</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-zinc-100">{stats.totalDocs}</span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">PDF</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        {/* Fully Sent */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-3 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Tamamlananlar</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.fullySentMukellefs}</span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">Firma ({stats.sentDocs} evrak)</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-3 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Bekleyenler</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingMukellefs}</span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">Firma ({stats.pendingDocs} bekliyor)</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Progress Bar - Compact Dark Gray */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 px-3.5 py-2 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-zinc-200">Dönem Gönderim Oranı:</span>
          <span className="text-slate-500 dark:text-zinc-400">
            {stats.sentDocs} / {stats.totalDocs} evrak iletildi ({stats.fullySentMukellefs} firma tamamlandı)
          </span>
        </div>
        <div className="flex items-center gap-2 sm:w-56">
          <div className="flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 min-w-[32px] text-right">
            %{percentComplete}
          </span>
        </div>
      </div>
    </div>
  );
};
