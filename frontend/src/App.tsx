import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Send, 
  RotateCw, 
  CheckCircle2, 
  Clock,
  ChevronsDown,
  ChevronsUp,
  Code2
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DashboardStats } from './components/DashboardStats';
import { MukellefCard } from './components/MukellefCard';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { PhoneEditModal } from './components/PhoneEditModal';
import { BulkSendModal } from './components/BulkSendModal';
import { SendHistoryModal } from './components/SendHistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { DashboardSummary, Mukellef, ZirveDoc, WhatsAppStatus, api } from './api';
import { useTheme } from './useTheme';

export const App: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);

  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isSending = false;

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<ZirveDoc | null>(null);
  const [editPhoneMukellef, setEditPhoneMukellef] = useState<Mukellef | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  // Bulk send modal state
  const [sendModalConfig, setSendModalConfig] = useState<{
    isOpen: boolean;
    targetMukellef?: Mukellef | null;
    selectedDocIds: string[];
    isMultiMukellef: boolean;
    selectedMukellefCodes: string[];
  }>({
    isOpen: false,
    selectedDocIds: [],
    isMultiMukellef: false,
    selectedMukellefCodes: []
  });

  const fetchData = useCallback(async (period?: string) => {
    setIsLoading(true);
    try {
      const summary = await api.getSummary(period, searchTerm, statusFilter);
      setData(summary);
      if (!selectedPeriod && summary.selectedPeriod) {
        setSelectedPeriod(summary.selectedPeriod);
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, selectedPeriod]);

  const fetchWaStatus = useCallback(async () => {
    try {
      const status = await api.getWhatsAppStatus();
      setWaStatus(status);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedPeriod || undefined);
    fetchWaStatus();
  }, [selectedPeriod, searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(timer);
  }, [fetchWaStatus]);

  // Selection handlers
  const handleToggleDocSelect = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllMukellefDocs = (_mukellefCode: string, docIds: string[]) => {
    setSelectedDocIds(prev => Array.from(new Set([...prev, ...docIds])));
  };

  const handleDeselectAllMukellefDocs = (docIds: string[]) => {
    setSelectedDocIds(prev => prev.filter(id => !docIds.includes(id)));
  };

  const handleClearSelection = () => {
    setSelectedDocIds([]);
  };

  // Send action triggers
  const handleSendSingleDoc = (mukellef: Mukellef, doc: ZirveDoc) => {
    setSendModalConfig({
      isOpen: true,
      targetMukellef: mukellef,
      selectedDocIds: [doc.id],
      isMultiMukellef: false,
      selectedMukellefCodes: []
    });
  };

  const handleSendBatchMukellef = (mukellef: Mukellef, docIds: string[]) => {
    setSendModalConfig({
      isOpen: true,
      targetMukellef: mukellef,
      selectedDocIds: docIds,
      isMultiMukellef: false,
      selectedMukellefCodes: []
    });
  };

  const handleSendSelectedDocs = () => {
    if (selectedDocIds.length === 0 || !data) return;

    const relatedMukellefs = data.mukellefler.filter(m => 
      m.documents.some(d => selectedDocIds.includes(d.id))
    );

    if (relatedMukellefs.length === 1) {
      setSendModalConfig({
        isOpen: true,
        targetMukellef: relatedMukellefs[0],
        selectedDocIds,
        isMultiMukellef: false,
        selectedMukellefCodes: []
      });
    } else {
      setSendModalConfig({
        isOpen: true,
        targetMukellef: null,
        selectedDocIds,
        isMultiMukellef: true,
        selectedMukellefCodes: relatedMukellefs.map(m => m.code)
      });
    }
  };

  const handleSendAllPendingThisMonth = () => {
    if (!data) return;
    const pendingMukellefs = data.mukellefler.filter(m => m.pendingDocs > 0);
    setSendModalConfig({
      isOpen: true,
      targetMukellef: null,
      selectedDocIds: [],
      isMultiMukellef: true,
      selectedMukellefCodes: pendingMukellefs.map(m => m.code)
    });
  };

  const isConnected = waStatus?.status === 'CONNECTED';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col font-sans text-slate-800 dark:text-zinc-100 transition-colors">
      {/* Navbar */}
      <Navbar
        periods={data?.periods || []}
        selectedPeriod={selectedPeriod}
        onPeriodChange={(p) => {
          setSelectedPeriod(p);
          setSelectedDocIds([]);
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onRefresh={() => fetchData(selectedPeriod)}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 w-full space-y-3.5">
        {/* Top Dashboard Metrics */}
        {data && (
          <DashboardStats
            stats={data.stats}
            totalMukellefs={data.totalMukellefs}
          />
        )}

        {/* Toolbar & Filters */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-2.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Status Filter Tabs & Expand All */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                  : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              Tümü ({data?.totalMukellefs || 0})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/60 dark:border-amber-800'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Eksik / Bekleyenler ({data?.stats.pendingMukellefs || 0})</span>
            </button>
            <button
              onClick={() => setStatusFilter('ALL_SENT')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === 'ALL_SENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Tamamlananlar ({data?.stats.fullySentMukellefs || 0})</span>
            </button>

            {/* Expand / Collapse All Button */}
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-1 hidden sm:block" />
            <button
              onClick={() => setIsAllExpanded(!isAllExpanded)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors whitespace-nowrap"
              title={isAllExpanded ? 'Tüm listeleri daralt' : 'Tüm listeleri genişlet'}
            >
              {isAllExpanded ? (
                <>
                  <ChevronsUp className="w-3 h-3" />
                  <span>Tümünü Daralt</span>
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3 h-3" />
                  <span>Tümünü Genişlet</span>
                </>
              )}
            </button>
          </div>

          {/* Search and Global Action */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Mükellef ara (ünvan, kod)..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-200 dark:border-zinc-750 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-zinc-850 text-slate-800 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800"
              />
            </div>

            {/* Quick Bulk Action Button */}
            {data && data.stats.pendingDocs > 0 && (
              <button
                onClick={handleSendAllPendingThisMonth}
                disabled={isSending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 dark:shadow-none transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Bekleyenleri Toplu Gönder</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Items Floating Action Bar */}
        {selectedDocIds.length > 0 && (
          <div className="bg-slate-900 dark:bg-zinc-900 text-white px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-750 dark:border-zinc-800 flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span className="text-xs font-medium">
                <strong className="text-blue-300 font-bold">{selectedDocIds.length}</strong> evrak seçildi
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearSelection}
                className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-800 dark:hover:bg-zinc-800 transition-colors"
              >
                Temizle
              </button>
              <button
                onClick={handleSendSelectedDocs}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
              >
                <Send className="w-3 h-3" />
                <span>Seçilenleri Gönder ({selectedDocIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Mükellef Cards List */}
        <div className="space-y-2.5">
          {isLoading && !data ? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-8 text-center space-y-2">
              <RotateCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Zirve evrakları taranıyor...</p>
            </div>
          ) : !data || data.mukellefler.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-8 text-center space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300">Mükellef veya Evrak Bulunamadı</h4>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Arama kriterlerinize veya seçilen döneme ait evrak bulunamadı.
              </p>
            </div>
          ) : (
            data.mukellefler.map((mukellef) => (
              <MukellefCard
                key={mukellef.code}
                mukellef={mukellef}
                selectedDocIds={selectedDocIds}
                isExpandedControlled={isAllExpanded}
                onToggleDocSelect={handleToggleDocSelect}
                onSelectAllMukellefDocs={handleSelectAllMukellefDocs}
                onDeselectAllMukellefDocs={handleDeselectAllMukellefDocs}
                onPreviewDoc={(doc) => setPreviewDoc(doc)}
                onSendSingleDoc={handleSendSingleDoc}
                onSendBatchMukellef={handleSendBatchMukellef}
                onEditPhone={(m) => setEditPhoneMukellef(m)}
                isSending={isSending}
              />
            ))
          )}
        </div>
      </main>

      {/* Footer with Developer Credit & Color-coded WhatsApp status */}
      <footer className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 mt-auto text-xs text-slate-500 dark:text-zinc-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>Evrak İletim Paneli</span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-zinc-300">
              <Code2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span> <a href="https://cankurttekin.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">cankurttekin</a></span>
            </span>
          </div>

          {/* Color-coded WhatsApp status in footer: RED when disconnected, GREEN when connected */}
          <div className="flex items-center gap-3 text-[11px]">
            <span>Dönem: {selectedPeriod || '-'}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <span>WhatsApp:</span>
              {isConnected ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Bağlı ({waStatus?.connectedPhone || 'Aktif'})
                </span>
              ) : (
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  Bağlı Değil
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PdfPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <PhoneEditModal
        mukellef={editPhoneMukellef}
        onClose={() => setEditPhoneMukellef(null)}
        onSuccess={() => fetchData(selectedPeriod)}
      />

      <BulkSendModal
        isOpen={sendModalConfig.isOpen}
        onClose={() => setSendModalConfig(prev => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          fetchData(selectedPeriod);
          setSelectedDocIds([]);
        }}
        targetMukellef={sendModalConfig.targetMukellef}
        selectedDocIds={sendModalConfig.selectedDocIds}
        isMultiMukellef={sendModalConfig.isMultiMukellef}
        period={selectedPeriod}
        selectedMukellefCodes={sendModalConfig.selectedMukellefCodes}
      />

      <SendHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        waStatus={waStatus}
        onWaStatusChange={fetchWaStatus}
        currentTheme={theme}
        onThemeChange={setTheme}
      />
    </div>
  );
};

export default App;
