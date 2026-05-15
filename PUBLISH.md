# Chrome Web Store — Yeni Sürüm Yayınlama Rehberi

> Bu eklenti zaten Chrome Web Store'da yayında. Yeni sürüm `1.2.0` için bu adımları izle.

## 0. Bu sürümde ne değişti?

- ✅ **Batch export pure-API**: 71 proje ~12 dk → ~30 sn (24× hız).
- ✅ **Tek tab + 10 paralel API + 6 paralel HTML indirme**.
- ✅ **Zengin chat export**: her turn için generated screens + follow-up suggestions.
- ✅ **Yeni ZIP yapısı**: `screens/` (final) + `history/turn-NNN-slug/` (per-turn) + `chat.json` (referanslı).
- ✅ **Icon badge**: list page'de proje sayısı (max "999+"), detail page'de "EXP" hatırlatıcı. Tema renkleri (#8D6A8A, #745472).
- ✅ **Yeni icon set** (yeni `.svg` master + tüm boyutlar yenilendi).
- ✅ Debug "Extract All Links" butonu gizlendi (HTML'de yorum satırı — ileride lazım olursa).
- ✅ Manifest version `1.1.0` → `1.2.0`.

> Store listing açıklamasını güncellersen "What's new" alanına yukarıdaki satırların kısa özetini koy.

---

## 1. Yerelde son kontrol

```bash
cd /Users/ns0bj/Development/Fun/stitch-design/stitch-export

# Syntax sanity
node -c background.js && node -c content.js && node -c popup/popup.js

# Manifest validasyonu (manuel göz kontrolü)
cat manifest.json
```

Ardından `chrome://extensions/` → **Developer mode** → **Load unpacked** ile bu klasörü yükle ve test et:

- [ ] Popup açılıyor.
- [ ] **Export All Projects** çalışıyor, ~30 sn'de bitiyor.
- [ ] İndirilen ZIP içinde `screens/`, `history/`, `chat.json` var.
- [ ] Tek proje export (`Export Conversation`) hâlâ çalışıyor.
- [ ] Context menu (sağ tık → Export Stitch Conversation) çalışıyor.
- [ ] Yeni iconlar toolbar'da düzgün görünüyor.
- [ ] Console'da `[Stitch Export]` log'ları görünür, hata yok.

---

## 2. ZIP paketini hazırla

Chrome Web Store ZIP'inde sadece prod kodu olmalı. Yerel debug/script kalıntılarını DAHİL ETME.

### Temizlenecek dosyalar (ZIP'e GİRMEMELİ)

Bu dosyalar deneme/debug kalıntısı — Store ZIP'inde olmamalı:

```
analyze_parsed.js
dNS8Mc_inner.json
dNS8Mc_parsed.json
dNS8Mc_raw.txt
fix_cancel.js
fix_cancel_fetch.js
fix_debug_btn.js
fix_debug_btn_not_on_stitch.js
fix_popup_race.js
parse_dNS8Mc.js
parse_dNS8Mc_v2.js
test-extractor.js
update_*.js
debug-helper.js    ← manifest'te web_accessible_resources olarak referans ama prod'da kullanılmıyor
.DS_Store
screenshots/
.git/
```

### Prod ZIP'i oluştur

```bash
cd /Users/ns0bj/Development/Fun/stitch-design/stitch-export

# Geçici clean klasör
rm -rf /tmp/stitch-export-1.2.0
mkdir -p /tmp/stitch-export-1.2.0

# Sadece prod dosyalarını kopyala
rsync -av \
  --exclude='.git*' \
  --exclude='.DS_Store' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='screenshots/' \
  --exclude='analyze_parsed.js' \
  --exclude='dNS8Mc_*' \
  --exclude='fix_*.js' \
  --exclude='parse_dNS8Mc*.js' \
  --exclude='test-extractor.js' \
  --exclude='update_*.js' \
  --exclude='*.zip' \
  --exclude='PUBLISH.md' \
  --exclude='BATCH_EXPORT_IMPLEMENTATION.md' \
  ./ /tmp/stitch-export-1.2.0/

# Manifest debug-helper.js referansını kaldır (opsiyonel — kullanılmıyorsa)
# Eğer debug-helper.js prod'da gerekmiyorsa manifest'ten web_accessible_resources bloğunu temizle

# Klasör içeriğini kontrol et
ls -la /tmp/stitch-export-1.2.0/

# ZIP'le
cd /tmp/stitch-export-1.2.0
zip -r /tmp/stitch-export-1.2.0.zip . -x ".*"
ls -lh /tmp/stitch-export-1.2.0.zip
```

ZIP içinde sadece şunlar olmalı:

```
manifest.json
background.js
content.js
popup/
  popup.html
  popup.css
  popup.js
utils/
  extractor.js
  formatters.js
  downloader.js
icons/
  icon.svg
  icon.png
  icon16.png  icon24.png  icon32.png  icon64.png  icon128.png  icon256.png
libs/
  jszip.min.js
LICENSE
README.md
```

> **Not**: Manifest'te `web_accessible_resources` → `debug-helper.js` referansı var ama prod'da kullanılmıyorsa o satırı manifest'ten silip debug-helper.js'i ZIP'e DAHİL ETME. Aksi halde Store inceleme reviewer'ı sorabilir.

---

## 3. Chrome Web Store Developer Dashboard

1. **Aç**: https://chrome.google.com/webstore/devconsole
2. Sol menüden **Stitch Export** eklentini seç.
3. Sol panelden **Package** sekmesine git.
4. **Upload new package** → biraz önce oluşturduğun `/tmp/stitch-export-1.2.0.zip`'i yükle.
5. Eğer ZIP içinde manifest sürümü Store'daki mevcut sürümle aynıysa upload reddedilir — manifest'te `1.2.0` olduğundan emin ol.

### Sürüm doğrulama hataları

| Hata | Çözüm |
|---|---|
| "Version must be greater than..." | manifest.json `"version"` Store'daki mevcuttan büyük olmalı (örn. `1.1.0` → `1.2.0`). |
| "Manifest version 3 required" | `"manifest_version": 3` zaten ✓. |
| "Disallowed permission" | `tabs` izni "moderate risk" — gerekçesini Privacy practices bölümünde açıkla. |

---

## 4. Store Listing güncellemeleri

Sol menü → **Store listing**.

### a) Icon (Store Icon — 128×128)

- Mevcut Store icon eski tasarım olduğundan **değiştir**:
  - **Store icon** alanına yeni `icons/icon128.png` veya `icons/icon256.png`'i yükle (Store 128×128 ister; gerekirse resize et).
- Toolbar/action icon (eklenti bar'daki) zaten `manifest.json` üzerinden geliyor — ekstra upload gerekmez.

### b) Screenshots

Eğer UI/akış değiştiyse yeni screenshot'lar yükle:
- 1280×800 veya 640×400 boyutunda PNG/JPG.
- En az 1, en fazla 5.
- Önerilen: yeni popup'ın "Export All Projects" akışını gösteren 3-4 ekran.

### c) Description / "What's new"

Mevcut açıklamanın altına yeni özellikleri ekle (Türkçe destek varsa hem TR hem EN):

```
v1.2.0
• Batch export 24× faster (pure-API, no UI automation)
• Rich chat export: per-turn screens + follow-up suggestions
• New ZIP structure with history/ folders per conversation turn
• Refreshed icons
```

### d) Privacy practices

`tabs` permission'ı için güncel bir gerekçe:

> "Used to open the Stitch dashboard in a background tab to authenticate the user's batch export request. No tab data is collected or transmitted externally."

### e) Single purpose

Mevcut tek amaç ifadesi geçerli — sadece güncelleme: "Export Stitch design conversations and projects."

---

## 5. Submit + review

1. Sağ üstte **Save draft** → ardından **Submit for review**.
2. Onay süresi tipik olarak **1-3 iş günü**, bazen aynı gün.
3. Reviewer'a hızlı not (opsiyonel "Note for reviewer" alanına):
   > "1.2.0 changes batch export to a pure-API approach (uses existing user session on stitch.withgoogle.com). No external network requests other than to Google's own Stitch backend and CDN."

---

## 6. Yayınlandıktan sonra

- [ ] Eklentinin Store sayfasında **1.2.0** göründüğünü doğrula.
- [ ] Manuel olarak "Update extensions" yapıp güncel sürümün local'e indiğini test et.
- [ ] README.md'de Store link + sürüm değişikliklerini güncelle.
- [ ] Git'te tag at:
  ```bash
  git add -A
  git commit -m "release: v1.2.0 — pure-API batch export + rich chat history"
  git tag v1.2.0
  git push && git push --tags
  ```

---

## Hızlı referans: dosya kontrol listesi

ZIP'e **gir**ecek:

- [x] `manifest.json` (version `1.2.0`)
- [x] `background.js`
- [x] `content.js`
- [x] `popup/` (html, css, js)
- [x] `utils/` (extractor, formatters, downloader)
- [x] `icons/` (yeni set: svg + tüm png boyutları)
- [x] `libs/jszip.min.js`
- [x] `LICENSE`, `README.md`

ZIP'e **girmeyecek**:

- [ ] `.git/`, `.DS_Store`, `node_modules/`, `dist/`, `*.zip`
- [ ] `screenshots/`
- [ ] Tüm `fix_*.js`, `update_*.js`, `parse_*.js`, `analyze_*.js`, `test-*.js`
- [ ] `dNS8Mc_inner.json`, `dNS8Mc_parsed.json`, `dNS8Mc_raw.txt`
- [ ] `BATCH_EXPORT_IMPLEMENTATION.md`, `PUBLISH.md` (bu dosya)
- [ ] `debug-helper.js` (manifest'te referans varsa onu da temizle)
