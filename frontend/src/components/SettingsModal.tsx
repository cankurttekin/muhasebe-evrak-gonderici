import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Check, 
  HardDrive, 
  MessageSquare, 
  Smartphone, 
  Mail,
  CheckCircle2, 
  RotateCw, 
  LogOut,
  Sun,
  Moon,
  Monitor,
  AlertCircle,
  Send,
  FolderTree,
  RotateCcw
} from 'lucide-react';
import { WhatsAppStatus, SmtpConfig, DirectoryOption, api } from '../api';
import { ThemeMode } from '../useTheme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  waStatus: WhatsAppStatus | null;
  onWaStatusChange: () => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  waStatus,
  onWaStatusChange,
  currentTheme,
  onThemeChange
}) => {
  const [template, setTemplate] = useState('');
  const [dataPath, setDataPath] = useState('');
  const [directoryOptions, setDirectoryOptions] = useState<DirectoryOption[]>([]);
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: 'Muhasebe Evrak İletim',
    fromEmail: ''
  });
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isWaActionLoading, setIsWaActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getSettings().then((res) => {
        if (res.success) {
          setTemplate(res.settings.messageTemplate || '');
          setDataPath(res.settings.zirveDataPath || '');
          if (res.settings.directoryOptions) {
            setDirectoryOptions(res.settings.directoryOptions);
          }
          if (res.settings.smtp) {
            setSmtp({
              ...res.settings.smtp,
              pass: '' // Do not populate password field
            });
          }
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      onWaStatusChange();
    }, 2500);
    return () => clearInterval(interval);
  }, [isOpen, onWaStatusChange]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.saveSettings({ messageTemplate: template, smtp, directoryOptions });
      setSaveSuccess(true);
      setSmtp(prev => ({
        ...prev,
        hasPassword: prev.hasPassword || Boolean(prev.pass && prev.pass.trim() !== ''),
        pass: '' // Clear input after save
      }));
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await api.testSmtp(smtp);
      setSmtpTestResult(res);
    } catch (err: any) {
      setSmtpTestResult({ success: false, message: err.message || 'Bağlantı testi sırasında hata oluştu' });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleConnectWa = async () => {
    setIsWaActionLoading(true);
    try {
      await api.connectWhatsApp();
      onWaStatusChange();
    } finally {
      setIsWaActionLoading(false);
    }
  };

  const handleDisconnectWa = async () => {
    setIsWaActionLoading(true);
    try {
      await api.disconnectWhatsApp();
      onWaStatusChange();
    } finally {
      setIsWaActionLoading(false);
    }
  };

  const handleToggleDir = (key: string) => {
    setDirectoryOptions(prev =>
      prev.map(item => item.key === key ? { ...item, enabled: !item.enabled } : item)
    );
  };

  const handleResetDefaultDirs = () => {
    const defaultKeys = new Set(['BEYANNAME', 'DILEKCELER', 'ETEBLIGAT', 'EBILDIRGE_HIZMET', 'EBILDIRGE_TAHAKKUK', 'TAHAKKUK']);
    setDirectoryOptions(prev =>
      prev.map(item => ({ ...item, enabled: defaultKeys.has(item.key) }))
    );
  };

  const previewMessage = template
    .replace(/{UNVAN}/g, 'KAYALAR TEKSTİL LTD. ŞTİ.')
    .replace(/{DONEM}/g, '2026-09')
    .replace(/{BELGELER}/g, 'KDV1 Beyannamesi, KDV1 Tahakkuk Fişi, SGK Tahakkuk');

  const isConnected = waStatus?.status === 'CONNECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col text-slate-800 dark:text-zinc-100">
        {/* Header - Dark Gray */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Ayarlar ve İletişim Kanalları</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">WhatsApp, E-posta (SMTP), mesaj şablonu ve tema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 bg-white dark:bg-zinc-900">
          {/* SECTION WhatsApp Bağlantısı & Durumu */}
          <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-xl border border-slate-200 dark:border-zinc-750 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>WhatsApp Bağlantı Durumu:</span>
              </span>

              {/* Status text: RED when not connected, GREEN when connected */}
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Bağlı Aktif ({waStatus.connectedPhone || 'Cihaz'})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Bağlı Değil</span>
                </span>
              )}
            </div>

            {isConnected ? (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-600 dark:text-zinc-300">
                  Evraklar bu telefon üzerinden mükelleflere PDF olarak iletilir.
                </p>
                <button
                  type="button"
                  onClick={handleDisconnectWa}
                  disabled={isWaActionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Bağlantıyı Kes</span>
                </button>
              </div>
            ) : waStatus?.status === 'QR_READY' && waStatus.qrCodeDataUrl ? (
              <div className="text-center py-2 space-y-3">
                <div className="inline-block p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <img
                    src={waStatus.qrCodeDataUrl}
                    alt="WhatsApp QR Code"
                    className="w-48 h-48 mx-auto rounded-lg"
                  />
                </div>
                <div className="text-left text-[11px] text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-200 dark:border-zinc-750 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-zinc-200">Telefonunuzdan Bağlanın:</div>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Telefonunuzda WhatsApp'ı açın (Normal veya Business).</li>
                    <li><strong>Ayarlar &gt; Bağlı Cihazlar &gt; Cihaz Bağla</strong> seçeneğine dokunun.</li>
                    <li>Kamerayı yukarıdaki QR koda tutun.</li>
                  </ol>
                </div>
              </div>
            ) : waStatus?.status === 'CONNECTING' ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-slate-600 dark:text-zinc-300">
                <RotateCw className="w-4 h-4 text-blue-600 animate-spin" />
                <span>QR Kod oluşturuluyor...</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Evrak göndermek için telefonunuzu QR kod ile bağlayın.
                </p>
                <button
                  type="button"
                  onClick={handleConnectWa}
                  disabled={isWaActionLoading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 dark:shadow-none transition-colors whitespace-nowrap"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>WhatsApp'a Bağlan (QR Kod)</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION E-posta (SMTP) Ayarları */}
          <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-xl border border-slate-200 dark:border-zinc-750 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>E-posta (SMTP) Sunucu Ayarları</span>
              </span>
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={isTestingSmtp || !smtp.host || !smtp.user || (!smtp.pass && !smtp.hasPassword)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestingSmtp ? (
                  <>
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Test Ediliyor...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Bağlantıyı Test Et</span>
                  </>
                )}
              </button>
            </div>

            {smtpTestResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                  smtpTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}
              >
                {smtpTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                )}
                <span>{smtpTestResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  SMTP Sunucu Adresi (Host)
                </label>
                <input
                  type="text"
                  value={smtp.host}
                  onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                  placeholder="örn: mail.sirketiniz.com veya smtp.gmail.com"
                  className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={smtp.port}
                  onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value, 10) || 587 })}
                  placeholder="587 veya 465"
                  className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Kullanıcı Adı / E-posta
                </label>
                <input
                  type="text"
                  value={smtp.user}
                  onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
                  placeholder="muhasebe@sirketiniz.com"
                  className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                    Parola / Uygulama Parolası
                  </label>
                  {smtp.hasPassword && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                      Mevcut Parola Kayıtlı
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={smtp.pass || ''}
                  onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                  placeholder={smtp.hasPassword ? '•••••••• (Kayıtlı, değiştirmek için yazın)' : 'Parolanızı girin...'}
                  className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/*
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                  Gmail için: Google Hesabı &gt; Güvenlik &gt; 2 Adımlı Doğrulama &gt; 16 haneli Uygulama Parolası
                </p>
                */}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Gönderici Ad
                </label>
                <input
                  type="text"
                  value={smtp.fromName}
                  onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })}
                  placeholder="Kaya Mali Müşavirlik"
                  className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Gönderici E-posta
                </label>
                <input
                  type="email"
                  value={smtp.fromEmail}
                  onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })}
                  placeholder="muhasebe@sirketiniz.com"
                  className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="smtp-secure"
                checked={smtp.secure}
                onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="smtp-secure" className="text-xs text-slate-600 dark:text-zinc-300 cursor-pointer">
                SSL / TLS Güvenli Bağlantı (Port 465 için işaretleyin, 587/STARTTLS için işaretsiz bırakın)
              </label>
            </div>
          </div>

          {/* SECTION Mesaj Şablonu */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Varsayılan Mesaj Şablonu (WhatsApp ve E-posta)</span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Kullanılabilir etiketler: <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">{'{UNVAN}'}</code>, <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">{'{DONEM}'}</code>, <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">{'{BELGELER}'}</code>
              </p>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={3}
                className="w-full text-xs font-sans border border-slate-300 dark:border-zinc-750 rounded-lg p-2.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Live Preview */}
            <div className="bg-slate-50 dark:bg-zinc-850 rounded-xl p-3 border border-slate-200 dark:border-zinc-750 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-400 tracking-wider">
                Mesaj Önizlemesi
              </span>
              <div className="text-xs text-slate-700 dark:text-zinc-200 whitespace-pre-wrap font-sans bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-750">
                {previewMessage}
              </div>
            </div>

            {/* Data Path */}
            <div className="bg-slate-50 dark:bg-zinc-850 rounded-xl p-2.5 border border-slate-200 dark:border-zinc-750 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-400 tracking-wider">
                Zirve Veri Klasörü
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-1.5 rounded border border-slate-200 dark:border-zinc-750 truncate">
                <HardDrive className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{dataPath}</span>
              </div>
            </div>

            {/* SECTION Dizin Seçenekleri (Directory Options) */}
            <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-xl border border-slate-200 dark:border-zinc-750 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Taranacak Dizinler / Klasör Filtresi
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      DÖKÜMANLAR altından taranacak ve mükelleflere gönderilecek klasörler
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetDefaultDirs}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-750 transition-colors"
                  title="Varsayılan klasör seçimini yükle"
                >
                  <RotateCcw className="w-3 h-3 text-slate-500" />
                  <span>Varsayılana Sıfırla</span>
                </button>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-750 divide-y divide-slate-100 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                {directoryOptions.map((dir) => (
                  <label
                    key={dir.key}
                    className={`flex items-start gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-850/60 transition-colors cursor-pointer ${
                      dir.path.includes('/') ? 'pl-6 bg-slate-50/40 dark:bg-zinc-850/20' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={dir.enabled}
                      onChange={() => handleToggleDir(dir.key)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-medium ${
                          dir.enabled ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-zinc-400 line-through opacity-70'
                        }`}>
                          {dir.path}
                        </span>
                        {dir.enabled ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                            Devre Dışı
                          </span>
                        )}
                      </div>
                      {dir.description && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {dir.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* SECTION Görünüm Teması */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
                Görünüm
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onThemeChange('system')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    currentTheme === 'system'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-zinc-750 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-blue-500" />
                  <span>Otomatik (Sistem)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    currentTheme === 'light'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-zinc-750 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Açık Tema</span>
                </button>
                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    currentTheme === 'dark'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-zinc-750 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Koyu Tema</span>
                </button>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
              <div>
                {saveSuccess && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Ayarlar Başarıyla Kaydedildi!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 dark:shadow-none transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
