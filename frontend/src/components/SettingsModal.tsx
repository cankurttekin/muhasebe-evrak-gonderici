import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Check, 
  HardDrive, 
  MessageSquare, 
  Smartphone, 
  CheckCircle2, 
  RotateCw, 
  LogOut,
  Sun,
  Moon,
  Monitor,
  AlertCircle
} from 'lucide-react';
import { WhatsAppStatus, api } from '../api';
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isWaActionLoading, setIsWaActionLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getSettings().then((res) => {
        if (res.success) {
          setTemplate(res.settings.messageTemplate);
          setDataPath(res.settings.zirveDataPath);
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
      await api.saveSettings({ messageTemplate: template });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
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

  const previewMessage = template
    .replace(/{UNVAN}/g, 'KAYALAR TEKSTİL LTD. ŞTİ.')
    .replace(/{DONEM}/g, '2026-09')
    .replace(/{BELGELER}/g, 'KDV1 Beyannamesi, KDV1 Tahakkuk Fişi, SGK Tahakkuk');

  const isConnected = waStatus?.status === 'CONNECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col text-slate-800 dark:text-zinc-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Ayarlar ve WhatsApp</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Bağlantı durumu, mesaj şablonu ve tema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* SECTION 1: WhatsApp Bağlantısı & Durumu */}
          <div className="bg-slate-50 dark:bg-zinc-750 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-3">
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
                <div className="text-left text-[11px] text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 p-3 rounded-lg border border-slate-200 dark:border-zinc-700 space-y-1">
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

          {/* SECTION 2: Görünüm Teması (Otomatik / Açık / Koyu) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
              Görünüm Teması
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onThemeChange('system')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  currentTheme === 'system'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
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
                    : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
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
                    : 'border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Koyu Tema</span>
              </button>
            </div>
          </div>

          {/* SECTION 3: Mesaj Şablonu */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Varsayılan WhatsApp Mesaj Şablonu</span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Kullanılabilir etiketler: <code className="bg-slate-100 dark:bg-zinc-700 px-1 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">{'{UNVAN}'}</code>, <code className="bg-slate-100 dark:bg-zinc-700 px-1 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">{'{DONEM}'}</code>, <code className="bg-slate-100 dark:bg-zinc-700 px-1 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">{'{BELGELER}'}</code>
              </p>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={3}
                className="w-full text-xs font-sans border border-slate-300 dark:border-zinc-700 rounded-lg p-2.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Live Preview */}
            <div className="bg-slate-50 dark:bg-zinc-750 rounded-xl p-3 border border-slate-200 dark:border-zinc-700">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Mesaj Önizlemesi
              </span>
              <div className="mt-1 text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap font-sans bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                {previewMessage}
              </div>
            </div>

            {/* Data Path */}
            <div className="bg-slate-50 dark:bg-zinc-750 rounded-xl p-2.5 border border-slate-200 dark:border-zinc-700 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Zirve Veri Klasörü
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 p-1.5 rounded border border-slate-200 dark:border-zinc-700 truncate">
                <HardDrive className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{dataPath}</span>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-700">
              <div>
                {saveSuccess && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Şablon Kaydedildi!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Kapat
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 dark:shadow-none transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Kaydediliyor...' : 'Şablonu Kaydet'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
