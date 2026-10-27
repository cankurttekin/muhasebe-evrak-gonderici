import React, { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle2, RotateCw, Smartphone, Mail } from 'lucide-react';
import { Mukellef, api } from '../api';

interface BulkSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetMukellef?: Mukellef | null;
  selectedDocIds?: string[];
  isMultiMukellef?: boolean;
  period: string;
  selectedMukellefCodes?: string[];
  defaultTemplate?: string;
}

export const BulkSendModal: React.FC<BulkSendModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetMukellef,
  selectedDocIds = [],
  isMultiMukellef = false,
  period,
  selectedMukellefCodes = [],
  defaultTemplate = ''
}) => {
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'BOTH'>('WHATSAPP');
  const [customMessage, setCustomMessage] = useState(defaultTemplate);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const isWaNeeded = channel === 'WHATSAPP' || channel === 'BOTH';
  const isEmailNeeded = channel === 'EMAIL' || channel === 'BOTH';
  const hasWaRecipient = Boolean(targetMukellef?.phone);
  const hasEmailRecipient = Boolean(targetMukellef?.email);

  const canSend = !isMultiMukellef
    ? selectedDocIds.length > 0 &&
      (!isWaNeeded || hasWaRecipient) &&
      (!isEmailNeeded || hasEmailRecipient)
    : true;

  const handleSend = async () => {
    setIsSending(true);
    setResult(null);

    try {
      if (!isMultiMukellef && targetMukellef) {
        const res = await api.sendBatch({
          mukellefCode: targetMukellef.code,
          documentIds: selectedDocIds,
          channel,
          customPhone: targetMukellef.phone,
          customEmail: targetMukellef.email,
          customMessage: customMessage || undefined
        });

        const isOk = res.success && res.sentCount > 0;
        setResult({
          success: isOk,
          sentCount: res.sentCount || 0,
          failedCount: res.failedCount || 0,
          error: res.error || (res.results && res.results.find((r: any) => !r.success)?.error)
        });

        if (isOk) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        }
      } else {
        const res = await api.sendBulk({
          period,
          mukellefCodes: selectedMukellefCodes.length > 0 ? selectedMukellefCodes : undefined,
          channel,
          onlyPending: true,
          customMessage: customMessage || undefined
        });

        const isOk = res.success && res.totalSent > 0;
        setResult({
          success: isOk,
          sentCount: res.totalSent || 0,
          failedCount: res.totalFailed || 0,
          error: res.error
        });

        if (isOk) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        }
      }
    } catch (err: any) {
      setResult({
        success: false,
        sentCount: 0,
        failedCount: selectedDocIds.length || 1,
        error: err.message || 'Gönderim sırasında hata oluştu'
      });
    } finally {
      setIsSending(false);
    }
  };

  const renderResultMessage = () => {
    if (!result) return null;
    if (result.sentCount === 0 && result.failedCount > 0) {
      return (
        <div>
          <div className="font-bold">Gönderim Yapılamadı</div>
          <div>{result.failedCount} evrak gönderilemedi.{result.error ? ` Sebep: ${result.error}` : ''}</div>
        </div>
      );
    }
    if (result.sentCount > 0 && result.failedCount > 0) {
      return (
        <div>
          <div className="font-bold">Kısmi Gönderim</div>
          <div>{result.sentCount} evrak başarıyla gönderildi, {result.failedCount} evrak gönderilemedi.{result.error ? ` (${result.error})` : ''}</div>
        </div>
      );
    }
    return (
      <div>
        <div className="font-bold">Gönderim Başarılı!</div>
        <div>{result.sentCount} evrak başarıyla iletildi.</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 w-full max-w-lg overflow-hidden flex flex-col text-slate-800 dark:text-zinc-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Send className="w-4 h-4 ml-0.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                {isMultiMukellef ? 'Toplu Evrak Gönderimi' : 'Mükellefe Evrak Gönderimi'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {isMultiMukellef
                  ? `${selectedMukellefCodes.length || 'Tüm'} Mükellef • ${period} Dönemi`
                  : `${targetMukellef?.name} (${selectedDocIds.length} Belge)`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1.5">
              İletim Kanalı
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  channel === 'WHATSAPP'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-750'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  channel === 'EMAIL'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-750'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>E-posta</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('BOTH')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  channel === 'BOTH'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-750'
                }`}
              >
                <Send className="w-3.5 h-3.5 text-indigo-500" />
                <span>Her İkisi</span>
              </button>
            </div>
          </div>

          {/* Details Summary */}
          <div className="bg-slate-50 dark:bg-zinc-750 rounded-xl p-3.5 border border-slate-200 dark:border-zinc-700 text-xs space-y-2">
            {!isMultiMukellef && targetMukellef ? (
              <>
                <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                  <span>Alıcı:</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100">{targetMukellef.name}</span>
                </div>

                {isWaNeeded && (
                  <div className="flex justify-between items-center text-slate-600 dark:text-zinc-300">
                    <span>WhatsApp Tel:</span>
                    {hasWaRecipient ? (
                      <span className="font-mono font-medium text-slate-900 dark:text-zinc-100">
                        {targetMukellef.displayPhone || targetMukellef.phone}
                      </span>
                    ) : (
                      <span className="text-rose-500 font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Telefon Yok
                      </span>
                    )}
                  </div>
                )}

                {isEmailNeeded && (
                  <div className="flex justify-between items-center text-slate-600 dark:text-zinc-300">
                    <span>E-posta:</span>
                    {hasEmailRecipient ? (
                      <span className="font-mono font-medium text-slate-900 dark:text-zinc-100">
                        {targetMukellef.email}
                      </span>
                    ) : (
                      <span className="text-rose-500 font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> E-posta Yok
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                  <span>Gönderilecek Evrak:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{selectedDocIds.length} Adet PDF</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                  <span>Hedef Kitle:</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100">
                    {selectedMukellefCodes.length > 0 
                      ? `${selectedMukellefCodes.length} Seçili Mükellef` 
                      : 'Tüm Bekleyen Mükellefler'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                  <span>Dönem:</span>
                  <span className="font-bold text-slate-900 dark:text-zinc-100">{period}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                  <span>Kanal:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {channel === 'WHATSAPP' && '📱 Yalnızca WhatsApp'}
                    {channel === 'EMAIL' && '✉️ Yalnızca E-posta'}
                    {channel === 'BOTH' && '🚀 WhatsApp ve E-posta'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-200 dark:border-zinc-700">
                  Sadece henüz bu dönem evrakları gönderilmemiş mükelleflere sırayla iletilecektir.
                </p>
              </>
            )}
          </div>

          {/* Message Template */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1 flex items-center justify-between">
              <span>İletilecek Mesaj Metni</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {'{UNVAN}'}, {'{DONEM}'}, {'{BELGELER}'} otomatik doldurulur
              </span>
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              disabled={isSending}
              className="w-full text-xs font-sans border border-slate-300 dark:border-zinc-700 rounded-lg p-2.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mükellefe iletilecek mesaj metni..."
            />
          </div>

          {/* Result Alert */}
          {result && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                result.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              {renderResultMessage()}
            </div>
          )}

          {isSending && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>
                {channel === 'WHATSAPP' && 'Evraklar WhatsApp üzerinden iletiliyor, lütfen bekleyin...'}
                {channel === 'EMAIL' && 'Evraklar E-posta üzerinden iletiliyor, lütfen bekleyin...'}
                {channel === 'BOTH' && 'Evraklar WhatsApp ve E-posta üzerinden iletiliyor, lütfen bekleyin...'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-zinc-850 border-t border-slate-100 dark:border-zinc-700 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-750 transition-colors"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !canSend}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 dark:shadow-none transition-colors disabled:bg-slate-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'Gönderiliyor...' : 'Gönderimi Başlat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
