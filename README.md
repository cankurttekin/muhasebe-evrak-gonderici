# Zirve Müşavir Mükellef WhatsApp Evrak ve Tahakkuk İletim Paneli

Muhasebe ofisleri için **Zirve Müşavir** veritabanındaki mükellef beyanname, tahakkuk ve SGK belgelerini otomatik sınıflandıran, WhatsApp üzerinden tek tek veya toplu olarak mükelleflere ileten ve iletim durumunu takip eden modern web uygulaması.

---

## 🌟 Temel Özellikler

1. **Zirve Veri Yapısı ile %100 Uyumlu:**
   - Server üzerindeki `/zirvedata/FIRMA_KODU/DOKUMANLAR/KATEGORI/belge.pdf` yapısını otomatik tarar.
   - Alt klasör isimlerine göre otomatik sınıflandırır (örn: `BEYANNAME`, `TAHAKKUK`, `SGK` vb.).
   - Dosya adlarındaki dönem bilgilerini (`2026_09`, `2026-09`, `092026` vb.) akıllı algılar.

2. **Telefon ve Mükellef Bilgisi Çözümleme:**
   - Her firmanın `SirketBilgileri` dosyasından telefon numarasını (`phone=...`, `GSM=...`, `YetkiliTel=...`, `Telefon=...`) otomatik çeker.
   - Telefonu eksik veya farklı olan mükellefler için arayüzden doğrudan telefon/yetkili güncelleme imkanı sunar (Zirve verisine dokunulmaz, lokal veritabanında saklanır).

3. **Gönderim ve Eksik Evrak Takibi:**
   - **"Bu Ayın Belgeleri Gönderildi mi?"** göstergesi ile anlık yüzde takibi.
   - **"Eksik / Bekleyenler"** tek tıkla filtreleme: Henüz evrakı gitmeyen veya eksik kalan mükellefleri anında listeler.
   - Evrak bazında gönderim zamanı ve alıcı numarası kaydı (SQLite denetim günlüğü).

4. **WhatsApp Business Entegrasyonu:**
   - **QR Kod ile Doğrudan Bağlantı:** Web arayüzündeki QR kodu WhatsApp Business telefonunuzdan tarayarak cihazı bağlayın.
   - **PDF Evrak İletimi:** Belgeleri doğrudan PDF eki ve açıklama metni olarak mükellefin WhatsApp'ına gönderir.
   - **Tekli, Çoklu veya Toplu Gönderim:** Tek bir evrak, bir firmanın seçili evrakları veya **"Bu Ayın Bekleyenlerini Toplu Gönder"** ile tüm mükellefler sırayla gönderilir.
   - **WhatsApp Web Doğrudan İletişim:** Alternatif olarak tek tıkla tarayıcıda WhatsApp Web sohbetini açma linki.
   - **Simülasyon Modu:** Gerçek WhatsApp bağlamadan tüm sistemi ve evrak akışını test etme modu.

5. **🛡️ %100 Salt Okunur (Read-Only) Güvenlik Garantisi:**
   - Uygulama `zirvedata` klasöründe **asla dosya silmez, taşımaz veya değiştirmez**.
   - Tüm okuma işlemleri salt-okunur dosya akışlarıyla yürütülür.
   - Docker kurulumunda `zirvedata` klasörü `:ro` (read-only) bayrağıyla Linux çekirdeği seviyesinde kilitlenir.

---

## 🚀 Hızlı Başlangıç

### 1. Yerel Kurulum (Node.js ile)

Gereksinimler: Node.js v20+ ve npm.

```bash
# Proje dizinine gidin
cd /home/ck/projects/muhasebe

# Bağımlılıkları derleyin ve uygulamayı tek komutla başlatın
npm run build
npm start
```

Uygulama **http://localhost:5000** adresinde hazır olacaktır!

> **Not:** Eğer makinenizde henüz gerçek Zirve verisi yoksa, uygulama otomatik olarak 6 adet gerçekçi mükellef ve örnek PDF evrakları içeren `./mock_zirvedata` test verisini oluşturur.

---

### 2. Docker / Docker Compose ile Sunucuda Çalıştırma (Önerilen)

Zirve ana sunucunuzda veya yerel ağdaki bir Linux/Windows sunucuda Docker ile çalıştırmak için:

1. `docker-compose.yml` dosyasındaki Zirve yolunu ayarlayın (veya varsayılan `/zirvedata` olarak bırakın):
```yaml
volumes:
  # Sunucunuzdaki Zirve klasörünü buraya bağlayın (:ro salt okunur)
  - /zirvedata:/zirvedata:ro
  - ./data:/app/data
```

2. Konteyneri başlatın:
```bash
docker compose up -d --build
```

Tarayıcınızdan `http://SUNUCU_IP:5000` adresine girerek kullanmaya başlayabilirsiniz.

---

## ⚙️ Ortam Değişkenleri (.env)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `5000` | Web arayüzü ve API portu |
| `ZIRVE_DATA_PATH` | `./mock_zirvedata` | Zirve veri klasörünün yolu |
| `DATA_DIR` | `./backend/data` | SQLite veritabanı ve WhatsApp oturum anahtarları |
| `WA_SIMULATION` | `false` | WhatsApp bağlantısı olmadan test simülasyonu |
| `DEFAULT_MESSAGE_TEMPLATE` | Şablon metni | Mükelleflere gidecek mesaj formatı |

---

## 📱 Kullanım Kılavuzu

1. **Dönem Seçimi:** Sağ üstteki dönem menüsünden ilgili ayı seçin (örn: `Ekim 2026`).
2. **WhatsApp Bağlantısı:** Üst bardaki **"WhatsApp Bağla"** butonuna tıklayın, ekrana gelen QR kodu WhatsApp Business telefonunuzdan tarayın (*Bağlı Cihazlar > Cihaz Bağla*). Test etmek isterseniz aynı pencereden **Simülasyon Modu**'nu açabilirsiniz.
3. **Filtreleme:**
   - **"Eksik / Bekleyenler"** butonuna basarak bu ay henüz evrakı gitmemiş mükellefleri listeleyin.
   - Arama kutusuna mükellef adı, vergi numarası veya kodunu yazarak anında bulun.
4. **Evrak Önizleme:** Evrak satırındaki göz simgesine tıklayarak PDF'i tarayıcıda inceleyin.
5. **Gönderim Seçenekleri:**
   - Evrak satırındaki gönder butonuna basarak tek evrak iletin.
   - Mükellef kartındaki **"Bekleyenleri Gönder"** butonuna basarak o firmanın bekleyen tüm evraklarını iletin.
   - Üstteki **"Bekleyenleri Toplu Gönder"** butonuna basarak tüm firmaların eksik evraklarını sırayla gönderin.
6. **Geçmiş Takibi:** Üst bardaki **"Geçmiş"** butonuna basarak hangi evrakın kime, ne zaman, hangi telefon numarasına gönderildiğini kontrol edin.
