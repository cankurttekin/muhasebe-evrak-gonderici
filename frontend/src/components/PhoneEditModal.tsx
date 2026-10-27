import React, { useState, useEffect } from 'react';
import { X, Phone, Check } from 'lucide-react';
import { Mukellef, api } from '../api';

interface PhoneEditModalProps {
  mukellef: Mukellef | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const PhoneEditModal: React.FC<PhoneEditModalProps> = ({ mukellef, onClose, onSuccess }) => {
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mukellef) {
      setCustomName(mukellef.name || '');
      setCustomPhone(mukellef.phone || '');
      setNotes(mukellef.notes || '');
    }
  }, [mukellef]);

  if (!mukellef) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.updateMukellef(mukellef.code, {
        customName,
        customPhone,
        notes
      });
      onSuccess();
      onClose();
    } catch {
      alert('Güncelleme sırasında bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 w-full max-w-md overflow-hidden text-slate-800 dark:text-zinc-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-850">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Mükellef İletişim Bilgileri</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">{mukellef.code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1">
              Firma Ünvanı
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Firma tam ünvanı..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1 flex items-center justify-between">
              <span>WhatsApp / Cep Telefonu</span>
              <span className="text-[11px] text-slate-400 font-normal">Örn: 0532 123 45 67</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="w-full text-xs pl-9 border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="05XX XXX XX XX"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1">
              Ofis İçi Notlar
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-xs border border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Örn: Yetkili muhasebe sorumlusu Gamze Hanım..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-750 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 dark:shadow-none transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
