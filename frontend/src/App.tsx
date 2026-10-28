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
import { UsersModal } from './components/UsersModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { LoginPage } from './components/LoginPage';
import { DashboardSummary, Mukellef, ZirveDoc, WhatsAppStatus, AuthUser, api } from './api';
import { useTheme } from './useTheme';

export const App: React.FC = () => {
  const { theme, setTheme } = useTheme();

  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Data state
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
  const [isUsersModalOpen, setIsUsersModalOpen] = useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);

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

  // Check initial authentication
  useEffect(() => {
    api.onUnauthorized(() => {
      setCurrentUser(null);
    });

    const token = api.getToken();
    if (token) {
      api.getMe()
        .then((res) => {
          if (res.success && res.user) {
            setCurrentUser(res.user);
          } else {
            setCurrentUser(null);
          }
        })
        .catch(() => setCurrentUser(null))
        .finally(() => setIsAuthChecking(false));
    } else {
      setIsAuthChecking(false);
    }
  }, []);

  const fetchData = useCallback(async (period?: string) => {
    if (!api.getToken()) return;
    setIsLoading(true);
    try {
      const summary = await api.getSummary(period, searchTerm, statusFilter);
      if (summary && summary.success) {
        setData(summary);
        if (!selectedPeriod && summary.selectedPeriod) {
          setSelectedPeriod(summary.selectedPeriod);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, selectedPeriod]);

  const fetchWaStatus = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      const status = await api.getWhatsAppStatus();
      if (status) {
        setWaStatus(status);
      }
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData(selectedPeriod || undefined);
      fetchWaStatus();
    }
  }, [currentUser, selectedPeriod, searchTerm, statusFilter]);

  useEffect(() => {
    if (!currentUser) return;
    const timer = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(timer);
  }, [currentUser, fetchWaStatus]);

  // Selection handlers
  const handleToggleDocSelect = (id: string) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllMukellefDocs = (_mukellefCode: string, docIds: string[]) => {
    setSelectedDocIds(prev => {
      const combined = new Set([...prev, ...docIds]);
      return Array.from(combined);
    });
  };

  const handleDeselectAllMukellefDocs = (docIds: string[]) => {
    setSelectedDocIds(prev => prev.filter(id => !docIds.includes(id)));
  };

  const handleSelectAllCurrentView = () => {
    if (!data) return;
    const allIds: string[] = [];
    for (const m of data.mukellefler) {
      for (const d of m.documents) {
        allIds.push(d.id);
      }
    }
    setSelectedDocIds(allIds);
  };

  const handleDeselectAllCurrentView = () => {
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

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  // 1. Loading auth state
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 flex flex-col justify-center items-center text-slate-600 dark:text-zinc-400">
        <RotateCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs font-semibold">Oturum kontrol ediliyor...</span>
      </div>
    );
  }

  // 2. Unauthenticated: Show Login Page
  if (!currentUser) {
    return (
      <LoginPage 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          fetchData();
          fetchWaStatus();
        }} 
      />
    );
  }

  const isConnected = waStatus?.status === 'CONNECTED';

  // 3. Authenticated: Render Main Application
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col font-sans text-slate-800 dark:text-zinc-100 transition-colors">
      {/* Navbar */}
      <Navbar
        periods={data?.periods || []}
        selectedPeriod={selectedPeriod}
        onPeriodChange={(p) => {
          setSelectedPeriod(p);
          fetchData(p);
        }}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onRefresh={() => {
          fetchData(selectedPeriod);
          fetchWaStatus();
        }}
        isLoading={isLoading}
        currentUser={currentUser}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full space-y-4">
        {/* Dashboard Stats */}
        {data && (
          <DashboardStats
            stats={data.stats}
            totalMukellefs={data.totalMukellefs}
          />
        )}

        {/* Toolbar: Search, Filters, Bulk Action Buttons */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-colors">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Firma adı, kod, VKN veya telefon ile ara..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Right: Filters & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-zinc-700 p-0.5 bg-slate-50 dark:bg-zinc-800 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Eksik Olanlar</span>
              </button>
              <button
                onClick={() => setStatusFilter('ALL_SENT')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                  statusFilter === 'ALL_SENT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Tamamlananlar</span>
              </button>
            </div>

            {/* Selection actions if any selected */}
            {selectedDocIds.length > 0 && (
              <button
                onClick={handleSendSelectedDocs}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 dark:shadow-none transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Seçilenleri Gönder ({selectedDocIds.length})</span>
              </button>
            )}

            {/* Bulk send all pending for period */}
            <button
              onClick={handleSendAllPendingThisMonth}
              disabled={!data || data.stats.pendingMukellefs === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 dark:shadow-none transition-colors disabled:bg-slate-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
              title="Bu dönem henüz evrakı gitmemiş tüm mükelleflere sırayla gönder"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bekleyenleri Toplu Gönder</span>
              <span className="sm:hidden">Toplu Gönder</span>
              {data && data.stats.pendingMukellefs > 0 && (
                <span className="bg-indigo-800/80 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {data.stats.pendingMukellefs}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* List Controls: Count & Select All */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 px-1">
          <div className="flex items-center gap-2">
            <span>
              Toplam <strong>{data?.mukellefler.length || 0}</strong> mükellef listeleniyor
            </span>
            {selectedDocIds.length > 0 && (
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                ({selectedDocIds.length} evrak seçildi)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAllExpanded(!isAllExpanded)}
              className="flex items-center gap-1 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {isAllExpanded ? (
                <>
                  <ChevronsUp className="w-3.5 h-3.5" />
                  <span>Tümünü Daralt</span>
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3.5 h-3.5" />
                  <span>Tümünü Genişlet</span>
                </>
              )}
            </button>

            {selectedDocIds.length > 0 ? (
              <button
                onClick={handleDeselectAllCurrentView}
                className="text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Seçimi Temizle
              </button>
            ) : (
              <button
                onClick={handleSelectAllCurrentView}
                className="text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Tüm Evrakları Seç
              </button>
            )}
          </div>
        </div>

        {/* Mukellef Cards List */}
        {isLoading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-400 dark:text-zinc-500 space-y-3">
            <RotateCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm font-medium">Zirve klasörleri ve evraklar taranıyor...</p>
          </div>
        ) : !data || data.mukellefler.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center text-slate-400 dark:text-zinc-500 space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
              Kayıt Bulunamadı
            </p>
            <p className="text-xs">
              Arama kriterlerine veya seçilen döneme ({selectedPeriod}) uygun mükellef bulunamadı.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.mukellefler.map((mukellef) => (
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
            ))}
          </div>
        )}
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

      {/* Admin User Management Modal */}
      <UsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </div>
  );
};

export default App;
