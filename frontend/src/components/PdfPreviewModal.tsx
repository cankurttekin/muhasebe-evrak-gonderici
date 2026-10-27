import React from 'react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';
import { ZirveDoc, api } from '../api';

interface PdfPreviewModalProps {
  doc: ZirveDoc | null;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ doc, onClose }) => {
  if (!doc) return null;

  const previewUrl = api.getPreviewUrl(doc.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-slate-800 dark:text-zinc-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-850">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm">{doc.fileName}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {doc.category} • {doc.period} • {(doc.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={previewUrl}
              download={doc.fileName}
              className="p-2 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              title="İndir"
            >
              <Download className="w-4 h-4" />
            </a>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              title="Yeni Sekmede Aç"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content iframe */}
        <div className="flex-1 bg-slate-100 dark:bg-zinc-900 p-2">
          <iframe
            src={previewUrl}
            title={doc.fileName}
            className="w-full h-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white"
          />
        </div>
      </div>
    </div>
  );
};
