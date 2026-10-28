import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  FolderTree, 
  Smartphone, 
  Mail,
  Send, 
  Phone, 
  CheckCircle2, 
  Search,
  BookOpen
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'start' | 'zirve' | 'channels' | 'sending' | 'phone'>('start');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden text-slate-800 dark:text-zinc-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-700 flex items-center justify-between bg-slate-50 dark:bg-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">Kullanım Kılavuzu & Yardım</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Evrak Gönderici nasıl kullanılır?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-zinc-700 flex gap-2 overflow-x-auto bg-slate-50/50 dark:bg-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab('start')}
            className={`pb-2.5 px-2 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'start'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Hızlı Başlangıç</span>
          </button>
          <button
            onClick={() => setActiveTab('zirve')}
            className={`pb-2.5 px-2 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'zirve'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Zirve Veri Yapısı</span>
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`pb-2.5 px-2 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'channels'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>WhatsApp & E-posta (SMTP)</span>
          </button>
          <button
            onClick={() => setActiveTab('sending')}
            className={`pb-2.5 px-2 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sending'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Evrak Gönderimi</span>
          </button>
          <button
            onClick={() => setActiveTab('phone')}
            className={`pb-2.5 px-2 font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'phone'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Telefon & E-posta Bilgileri</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs leading-relaxed space-y-4">
          {activeTab === 'start' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60">
                <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 mb-1">
                  Uygulamanın Amacı Nedir?
                </h4>
                <p className="text-slate-700 dark:text-zinc-300">
                  Bu uygulama, muhasebe ofisinizin yerel ağındaki Zirve sunucusunda biriken beyanname, tahakkuk ve SGK evraklarını tarar; ilgili mükellefe tek tıkla doğrudan WhatsApp veya E-posta (veya her ikisi) üzerinden PDF olarak iletmenizi ve bu ay kimlere evrak gittiğini/kimlerin beklediğini takip etmenizi sağlar.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-750 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Dönem İlerleme Takibi</span>
                  </div>
                  <p className="text-slate-600 dark:text-zinc-400">
                    Seçilen ayda kaç mükellefin tüm evrakları gitti, kaç tanesinde eksik kaldı anında görün.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-750 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>"Eksik Olanlar" Filtresi</span>
                  </div>
                  <p className="text-slate-600 dark:text-zinc-400">
                    Tek bir tıkla henüz evrakı gitmemiş firmaları filtreleyin, zaman kaybetmeden tamamlayın.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-750 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Çoklu Kanal (WhatsApp & E-posta)</span>
                  </div>
                  <p className="text-slate-600 dark:text-zinc-400">
                    Evrakları WhatsApp, E-posta veya her iki kanaldan aynı anda mükelleflerinize ulaştırın.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-750 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    <span>E-Posta(SMTP) Entegrasyonu</span>
                  </div>
                  <p className="text-slate-600 dark:text-zinc-400">
                    Kendi kurumsal veya Gmail vb mail adresiniz üzerinden gönderim yapın.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'zirve' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Zirve Klasör ve Dosya Yapısı</h4>
              <p className="text-slate-600 dark:text-zinc-300">
                Uygulama, Zirve Müşavir programının standart dosya düzenini tarayarak evrakları otomatik tanır:
              </p>

              <div className="bg-slate-900 dark:bg-zinc-950 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-700">
                <div>zirvedata/</div>
                <div>├── FIRMA_KODU_1/</div>
                <div>│   ├── SirketBilgileri               (Telefon, e-posta ve firma bilgileri)</div>
                <div>│   └── DOKUMANLAR/</div>
                <div>│       ├── BEYANNAME/</div>
                <div>│       │   └── 2026_09_KDV1_BEYAN.pdf</div>
                <div>│       ├── TAHAKKUK/</div>
                <div>│       │   └── 2026_09_KDV1_TAHAKKUK.pdf</div>
                <div>│       └── SGK/</div>
                <div>│           └── 2026_09_SGK_TAHAKKUK.pdf</div>
              </div>

              <div className="space-y-1 text-slate-600 dark:text-zinc-400">
                <p><strong>• Kategori Sınıflandırması:</strong> Evraklar <code>DOKUMANLAR</code> altındaki alt klasör ismine göre (<code>BEYANNAME</code>, <code>TAHAKKUK</code>, <code>SGK</code> vb.) otomatik etiketlenir.</p>
                <p><strong>• Dönem Tespiti:</strong> Dosya adındaki <code>2026_09</code>, <code>2026-09</code>, <code>092026</code> gibi ifadeler taranarak otomatik dönem filtresine atanır.</p>
              </div>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>1. WhatsApp Bağlantısı</span>
                </h4>
                <ol className="list-decimal pl-5 space-y-1 text-slate-700 dark:text-zinc-300">
                  <li>Sağ üstteki <strong>Ayarlar</strong> (çark simgesi) butonuna tıklayın.</li>
                  <li><strong>"WhatsApp'a Bağlan (QR Kod)"</strong> butonuna basın.</li>
                  <li>Telefonunuzda WhatsApp'tan <strong>Bağlı Cihazlar &gt; Cihaz Bağla</strong> ile ekrandaki QR kodu okutun.</li>
                  <li>Yeşil <em>"Bağlı Aktif"</em> yazısını gördüğünüzde işlem tamamdır.</li>
                </ol>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-700">
                <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>2. E-posta (SMTP) Kurulumu</span>
                </h4>
                <p className="text-slate-600 dark:text-zinc-400">
                  E-posta gönderebilmek için Ayarlar menüsündeki SMTP alanına ofisinizin e-posta sunucu bilgilerini girin:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-zinc-300">
                  <li><strong>Host:</strong> Sunucu adresi (örn: <code>mail.sirketiniz.com</code> veya <code>smtp.gmail.com</code>)</li>
                  <li><strong>Port:</strong> Genellikle <code>587</code> (STARTTLS) veya <code>465</code> (SSL/TLS)</li>
                  <li><strong>Kullanıcı Adı ve Parola:</strong> Kurumsal mail hesabınızın parolası (veya Gmail uygulama parolası)</li>
                  <li><strong>Bağlantıyı Test Et:</strong> Bilgileri girdikten sonra butona basarak bağlantıyı anında doğrulayın.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'sending' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Evrak Gönderim Seçenekleri</h4>

              <div className="space-y-2.5">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-750">
                  <span className="font-bold text-slate-900 dark:text-zinc-100">1. Kanal Seçimi (WhatsApp, E-posta, WhatsApp & E-posta)</span>
                  <p className="text-slate-600 dark:text-zinc-400 mt-0.5">
                    Gönderim penceresinde <strong>[WhatsApp]</strong>, <strong>[E-posta]</strong> veya <strong>[WhatsApp & E-posta]</strong> butonlarından birini seçebilirsiniz.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-750">
                  <span className="font-bold text-slate-900 dark:text-zinc-100">2. Tek Bir Evrak Gönderme</span>
                  <p className="text-slate-600 dark:text-zinc-400 mt-0.5">
                    Mükellef kartını açıp ilgili belgenin sağındaki mavi gönder simgesine tıklayarak doğrudan o PDF'i iletebilirsiniz.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-750">
                  <span className="font-bold text-slate-900 dark:text-zinc-100">3. Bir Mükellefin Bekleyenlerini Gönderme</span>
                  <p className="text-slate-600 dark:text-zinc-400 mt-0.5">
                    Mükellef başlığındaki <em>"Bekleyenleri Gönder (X)"</em> butonuna tıklayarak o firmanın o aya ait henüz gitmemiş tüm evraklarını tek pakette iletebilirsiniz.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-750">
                  <span className="font-bold text-slate-900 dark:text-zinc-100">4. Tüm Ofisi Toplu Gönderme</span>
                  <p className="text-slate-600 dark:text-zinc-400 mt-0.5">
                    Üst araç çubuğundaki <em>"Bekleyenleri Toplu Gönder"</em> butonuna basarak o ay henüz evrakı gitmemiş tüm mükellefleri sırayla ve güvenli aralıklarla otomatik gönderebilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'phone' && (
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Telefon ve E-posta Bilgileri</h4>
              <p className="text-slate-600 dark:text-zinc-300">
                Mükellef telefon ve e-posta adresleri her firmanın Zirve klasöründeki <code>SirketBilgileri</code> dosyasından otomatik okunur.
              </p>

              <div className="p-3.5 bg-slate-50 dark:bg-zinc-750 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2">
                <span className="font-semibold text-slate-900 dark:text-zinc-100">Bilgi Değiştirme veya Ekleme:</span>
                <p className="text-slate-600 dark:text-zinc-400">
                  Eğer bir mükellefin telefon veya e-posta adresi eksikse ya da evrakları alan yetkilinin bilgileri farklıysa:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600 dark:text-zinc-400">
                  <li>Mükellef kartında telefonun yanındaki <strong>kalem (düzenle)</strong> simgesine tıklayın.</li>
                  <li>Yeni telefon numarasını, e-posta adresini ve dilerseniz ofis içi özel notunuzu girip kaydedin.</li>
                  <li>Kaydedilen bilgiler yerel veritabanında saklanır ve sonraki tüm gönderimlerde otomatik kullanılır.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-zinc-850 border-t border-slate-100 dark:border-zinc-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 rounded-lg transition-colors"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
