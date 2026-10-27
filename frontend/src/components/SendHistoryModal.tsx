import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, AlertTriangle, History, RefreshCw } from 'lucide-react';
import { SendLogItem, api } from '../api';

interface SendHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendHistoryModal: React.FC<SendHistoryModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SendLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getLogs(150);
      if (res.success) {
        setLogs(res.logs);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      log.mukellef_code.toLowerCase().includes(q) ||
      (log.recipient_name && log.recipient_name.toLowerCase().includes(q)) ||
      log.document_name.toLowerCase().includes(q) ||
      log.phone.includes(q) ||
      log.period.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-slate-800 dark:text-zinc-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Gönderim Geçmişi ve Günlükleri</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Mükelleflere iletilen tüm evrak kayıtları</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-2 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Firma adı, belge adı veya telefon ile ara..."
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 dark:text-zinc-500">
              Kayıt bulunamadı.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-300">
              <thead className="bg-slate-50 dark:bg-zinc-750 text-slate-500 dark:text-zinc-400 uppercase font-semibold text-[10px] tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Tarih</th>
                  <th className="py-2.5 px-3">Mükellef</th>
                  <th className="py-2.5 px-3">Belge</th>
                  <th className="py-2.5 px-3">Dönem</th>
                  <th className="py-2.5 px-3">Telefon</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-700/60">
                {filteredLogs.map((log) => {
                  const dateStr = log.sent_at
                    ? new Date(log.sent_at).toLocaleString('tr-TR')
                    : '-';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-750/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-zinc-100">
                        {log.recipient_name || log.mukellef_code}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-zinc-100 truncate max-w-xs">
                          {log.document_name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500">{log.category}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-zinc-400">{log.period}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{log.phone}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {log.status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            İletildi
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800"
                            title={log.error_message || 'Hata'}
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            Hata
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
