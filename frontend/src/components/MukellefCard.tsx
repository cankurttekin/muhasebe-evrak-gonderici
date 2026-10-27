import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Mail,
  Edit2, 
  ExternalLink, 
  Send, 
  Eye, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  AlertTriangle
} from 'lucide-react';
import { Mukellef, ZirveDoc, api } from '../api';

interface MukellefCardProps {
  mukellef: Mukellef;
  selectedDocIds: string[];
  isExpandedControlled?: boolean;
  onToggleDocSelect: (id: string) => void;
  onSelectAllMukellefDocs: (mukellefCode: string, docIds: string[]) => void;
  onDeselectAllMukellefDocs: (docIds: string[]) => void;
  onPreviewDoc: (doc: ZirveDoc) => void;
  onSendSingleDoc: (mukellef: Mukellef, doc: ZirveDoc) => void;
  onSendBatchMukellef: (mukellef: Mukellef, docIds: string[]) => void;
  onEditPhone: (mukellef: Mukellef) => void;
  isSending: boolean;
}

export const MukellefCard: React.FC<MukellefCardProps> = ({
  mukellef,
  selectedDocIds,
  isExpandedControlled,
  onToggleDocSelect,
  onSelectAllMukellefDocs,
  onDeselectAllMukellefDocs,
  onPreviewDoc,
  onSendSingleDoc,
  onSendBatchMukellef,
  onEditPhone,
  isSending
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (isExpandedControlled !== undefined) {
      setIsExpanded(isExpandedControlled);
    }
  }, [isExpandedControlled]);

  const docsByCategory = React.useMemo(() => {
    const map = new Map<string, ZirveDoc[]>();
    for (const doc of mukellef.documents) {
      const cat = doc.category || 'DOKÜMAN';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(doc);
    }
    return map;
  }, [mukellef.documents]);

  const allMukellefDocIds = mukellef.documents.map(d => d.id);
  const pendingDocIds = mukellef.documents.filter(d => !d.isSent).map(d => d.id);
  const selectedMukellefDocIds = allMukellefDocIds.filter(id => selectedDocIds.includes(id));
  const isAllSelected = allMukellefDocIds.length > 0 && selectedMukellefDocIds.length === allMukellefDocIds.length;
  const isPartiallySelected = selectedMukellefDocIds.length > 0 && !isAllSelected;

  const handleMasterCheckbox = () => {
    if (isAllSelected) {
      onDeselectAllMukellefDocs(allMukellefDocIds);
    } else {
      onSelectAllMukellefDocs(mukellef.code, allMukellefDocIds);
    }
  };

  const getStatusBadge = () => {
    if (mukellef.status === 'ALL_SENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          Tamamı Gönderildi ({mukellef.sentDocs}/{mukellef.totalDocs})
        </span>
      );
    }
    if (mukellef.status === 'PARTIALLY_SENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3" />
          Kısmen Gönderildi ({mukellef.sentDocs}/{mukellef.totalDocs})
        </span>
      );
    }
    if (mukellef.status === 'NOT_SENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          <Clock className="w-3 h-3" />
          Gönderilmedi (0/{mukellef.totalDocs})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-transparent dark:border-zinc-700">
        Evrak Yok
      </span>
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'BEYANNAME':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-850';
      case 'TAHAKKUK':
        return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-850';
      case 'SGK':
        return 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-850';
      default:
        return 'bg-slate-50 dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-750';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-150 hover:border-slate-300 dark:hover:border-zinc-700">
      {/* Header - Compact Dark Gray */}
      <div className="px-3.5 py-2.5 bg-slate-50/70 dark:bg-zinc-850 border-b border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Checkbox & Company details */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(input) => {
              if (input) input.indeterminate = isPartiallySelected;
            }}
            onChange={handleMasterCheckbox}
            className="h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-650 bg-white dark:bg-zinc-800 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate tracking-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={mukellef.name}
              >
                {mukellef.name}
              </h3>
              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-slate-200/60 dark:bg-zinc-800 px-1.5 py-0.2 rounded border border-transparent dark:border-zinc-750">
                {mukellef.code}
              </span>
              {getStatusBadge()}
            </div>

            {/* Sub-info: Phone, Email, Contact, Tax ID */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
              <div className="flex items-center gap-1 font-medium">
                <Phone className="w-3 h-3 text-slate-400" />
                {mukellef.phone ? (
                  <span className="text-slate-700 dark:text-zinc-300">{mukellef.displayPhone || mukellef.phone}</span>
                ) : (
                  <span className="text-rose-500 font-semibold flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Telefon Yok
                  </span>
                )}
                <button
                  onClick={() => onEditPhone(mukellef)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 p-0.5 rounded transition-colors"
                  title="İletişim Bilgilerini Düzenle"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>

                {mukellef.phone && (
                  <a
                    href={api.getWhatsAppWebUrl(mukellef.phone, `Sayın ${mukellef.name}, muhasebe evraklarınız hazırlanmıştır.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 p-0.5 rounded transition-colors"
                    title="WhatsApp Web'de Aç"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-1 font-medium">
                <Mail className="w-3 h-3 text-slate-400" />
                {mukellef.email ? (
                  <span className="text-slate-700 dark:text-zinc-300 truncate max-w-[160px]" title={mukellef.email}>
                    {mukellef.email}
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-zinc-500 text-[10px]">E-posta Yok</span>
                )}
              </div>

              {mukellef.contactPerson && (
                <div className="hidden md:inline">
                  <span className="text-slate-400 dark:text-zinc-500">Yetkili:</span> {mukellef.contactPerson}
                </div>
              )}

              {mukellef.taxNumber && (
                <div className="hidden lg:inline">
                  <span className="text-slate-400 dark:text-zinc-500">VKN:</span> {mukellef.taxNumber}
                </div>
              )}

              <div className="text-slate-400 dark:text-zinc-500">
                • {mukellef.totalDocs} Evrak
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
          {pendingDocIds.length > 0 && (
            <button
              onClick={() => onSendBatchMukellef(mukellef, pendingDocIds)}
              disabled={isSending || (!mukellef.phone && !mukellef.email)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-all shadow-sm ${
                !mukellef.phone && !mukellef.email
                  ? 'bg-slate-300 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
              }`}
            >
              <Send className="w-3 h-3" />
              <span>Bekleyenleri Gönder ({pendingDocIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded hover:bg-slate-200/60 dark:hover:bg-zinc-750 transition-colors"
            title={isExpanded ? 'Daralt' : 'Genişlet'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Documents List - Compact Dark Gray */}
      {isExpanded && (
        <div className="px-3.5 py-2.5 bg-white dark:bg-zinc-900 divide-y divide-slate-100 dark:divide-zinc-800">
          {mukellef.documents.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400 dark:text-zinc-500">
              Bu dönem için henüz taranmış evrak bulunmuyor.
            </div>
          ) : (
            Array.from(docsByCategory.entries()).map(([category, docs]) => (
              <div key={category} className="py-2 first:pt-0 last:pb-0">
                {/* Category header */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded border ${getCategoryColor(category)}`}>
                    {category}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">({docs.length} Belge)</span>
                </div>

                {/* Document rows */}
                <div className="space-y-1">
                  {docs.map((doc) => {
                    const isChecked = selectedDocIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all text-xs ${
                          isChecked 
                            ? 'bg-blue-50/40 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900' 
                            : 'bg-slate-50/50 dark:bg-zinc-850 border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-200 dark:hover:border-zinc-750'
                        }`}
                      >
                        {/* Doc Checkbox & Title */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleDocSelect(doc.id)}
                            className="h-3 w-3 rounded border-slate-300 dark:border-zinc-650 bg-white dark:bg-zinc-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1 flex items-baseline gap-2">
                            <span className="font-semibold text-slate-800 dark:text-zinc-200 truncate">
                              {doc.docType}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate hidden sm:inline">
                              {doc.fileName} • {(doc.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-1.5 ml-2">
                          {doc.isSent ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800" title={doc.lastSentAt ? new Date(doc.lastSentAt).toLocaleString('tr-TR') : 'Gönderildi'}>
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="hidden sm:inline">Gönderildi</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800">
                              <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span className="hidden sm:inline">Bekliyor</span>
                            </span>
                          )}

                          {/* Preview button */}
                          <button
                            onClick={() => onPreviewDoc(doc)}
                            className="p-1 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-100 hover:bg-slate-200/60 dark:hover:bg-zinc-750 rounded transition-colors"
                            title="Önizle"
                          >
                            <Eye className="w-3 h-3" />
                          </button>

                          {/* Send single doc */}
                          <button
                            onClick={() => onSendSingleDoc(mukellef, doc)}
                            disabled={isSending || (!mukellef.phone && !mukellef.email)}
                            className={`p-1 rounded transition-colors ${
                              !mukellef.phone && !mukellef.email
                                ? 'text-slate-300 dark:text-zinc-650 cursor-not-allowed'
                                : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                            }`}
                            title="Bu Belgeyi Gönder (WhatsApp / E-posta)"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
