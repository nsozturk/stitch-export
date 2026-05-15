# 03 · Developer Dashboard

> **Status:** ⏳ todo

**Duration:** ~5 dk (manifest validasyonu hızlıysa)
**Pre-req:** Faz 02 — `/tmp/stitch-export-1.2.0.zip` hazır
**Output:** Yeni package Dashboard'a yüklendi, sürüm doğrulandı.

---

## 1. Dashboard'a giriş

1. Tarayıcıda aç: **https://chrome.google.com/webstore/devconsole**
2. Stitch Export'u yöneten Google hesabıyla giriş yap
3. 2FA kodunu gir

Eklentilerin listelendiği dashboard'a gelirsin.

> **Screenshot capture noktası**: dashboard'ın "Items" liste ekranı → `screenshots/01-dashboard-list.png`

## 2. Mevcut "Stitch Export" item'ını seç

Liste içinden **Stitch Export** kartına tıkla. Eğer çok eklentin varsa üst arama kutusuna yaz.

İçeri girdiğinde sol panel:

- Store listing
- Privacy practices
- **Package** ← şimdi buradayız
- Distribution
- Asia Pacific / Europe / vb. region settings
- Analytics
- Permissions

## 3. Package upload

1. Sol menüden **Package** sekmesine git
2. **Upload new package** butonuna bas
3. File picker → `/tmp/stitch-export-1.2.0.zip` seç
4. Yüklenmeyi bekle (10-30 sn)

> **Screenshot capture noktası**: Upload başarılı olduktan sonraki Package sekmesi → `screenshots/02-package-uploaded.png`

## 4. Validasyon hataları

Upload sonrası Chrome şu kontrolleri yapar:

| Hata | Sebep | Çözüm |
|---|---|---|
| "Version must be greater than X" | Manifest version yayındakinden küçük/eşit | `manifest.json`'da `"version"` artır, ZIP'i yeniden oluştur |
| "Manifest version 3 required" | MV2 manifest | `"manifest_version": 3` (zaten ✅) |
| "Could not parse manifest" | JSON sözdizimi hatası | `python3 -m json.tool < manifest.json` ile kontrol |
| "Disallowed permission: X" | Yasak permission istenmiş | Permission'ı kaldır veya alternative ara |
| "Unrecognized manifest key: X" | Geçersiz / typo manifest key | Schema'ya bak |
| "Package too large" | ZIP > 100 MB | Asset'leri compress, asıl dosya boyutunu küçült |

Hata varsa **02'ye dön**, düzelt, yeniden ZIP'le.

## 5. Otomatik permission değerlendirmesi

Chrome upload sırasında manifest permissions'ları okur ve "risk level" belirler.

**Stitch Export'un permissions risk değerlendirmesi:**

| Permission | Risk | Reviewer dikkat eder |
|---|---|---|
| `activeTab` | 🟢 low | otomatik onay |
| `scripting` | 🟢 low | otomatik onay |
| `contextMenus` | 🟢 low | otomatik onay |
| `downloads` | 🟢 low | otomatik onay |
| `tabs` | 🟡 **moderate** | gerekçe ister (faz 06) |
| `host_permissions` (4 host) | 🟡 moderate | tüm host'lar Google domainleri — açıkla |

Hangi izinlerin "moderate" işaretlendiğini Package upload ekranında göreceksin. Bunların gerekçesini **Privacy practices** (faz 06) sekmesinde dolduracağız.

## 6. Henüz submit'leme

Şu an item "**Draft**" durumunda. Submit etmeden önce:

- ✅ Faz 04 — Store listing güncelle (description, what's new)
- ✅ Faz 05 — Screenshot ve iconları yenile
- ✅ Faz 06 — Privacy practices doldurulmuş

Submit butonuna basmak için **Faz 07** beklemek lazım.

## Yanlışlık halinde rollback

Eğer yanlış ZIP yüklediysen:

1. Aynı Package ekranından **Upload new package** ile doğru ZIP'i tekrar yükle (eski upload override edilir).
2. Henüz submit etmediğin için Store'da değişiklik görünmez.

Eğer **submit ettikten sonra** ret yersin veya rollback istersen:

1. Dashboard → Distribution → Visibility → "**Unpublished**"
2. Eski ZIP'i bul (yerel arşivinde tutmadıysan kayıp)
3. Yeni versiyon olarak tekrar yükle

> **İpucu**: Her yayınlanan ZIP'i `releases/stitch-export-X.Y.Z.zip` olarak yerel git'e arşivle.

---

## Sıradaki adım

✅ Hazırsa: [04 · Store Listing](../04-store-listing/index.html)

## Screenshots

- `screenshots/01-dashboard-list.png` — dashboard'da Items list
- `screenshots/02-package-uploaded.png` — başarılı upload sonrası Package sekmesi
- `screenshots/03-permission-review.png` — moderate permission uyarısı (eğer çıkarsa)
