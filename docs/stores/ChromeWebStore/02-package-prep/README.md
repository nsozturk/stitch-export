# 02 · Package Prep

> **Status:** ⏳ todo

**Duration:** ~10 dk
**Pre-req:** Faz 01 smoke test'leri ✅
**Output:** `stitch-export-1.2.0.zip` — yalnızca prod dosyaları içeren temiz Store ZIP.

---

## 1. Manifest version bump

`manifest.json`'da `"version"` alanı bir önceki Store sürümünden büyük olmalı.

```json
{
  "version": "1.2.0",
  ...
}
```

> v1.2.0 zaten bump'lı. Eğer ileride 1.2.1 vs. çıkacaksa burayı güncelle.

**Geçerli sürüm artış kuralları:**
- `1.1.0` → `1.2.0` ✅
- `1.1.0` → `1.1.1` ✅
- `1.1.0` → `1.0.9` ❌ (Store reddeder)
- `1.1.0` → `1.1.0` ❌ (aynı sürüm reddedilir)

## 2. ZIP'e GİRMEYECEK dosyalar

Bunlar yerel debug/script kalıntısı — Store ZIP'inde olmamalı:

```
.git/                       ← versiyon kontrolü
.DS_Store                   ← macOS metadata
node_modules/               ← varsa
dist/                       ← varsa
*.zip                       ← önceki paketler
screenshots/                ← marketing materyalleri (Store ayrı upload)
docs/                       ← bu dökümantasyon klasörü
PUBLISH.md                  ← yayın notu
BATCH_EXPORT_IMPLEMENTATION.md  ← initial plan
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
update_api.js
update_bg_cancel.js
update_bg_debug.js
update_clicker.js
update_debug_btn.js
update_popup.js
update_popup_css_js.js
update_popup_html.js
update_wait.js
```

> **`debug-helper.js`**: manifest'te `web_accessible_resources` olarak referans veriliyor ama prod'da kullanılmıyor. **İki seçenek**:
> - **A** — Manifest'ten `web_accessible_resources` bloğunu sil, `debug-helper.js`'i ZIP'e dahil etme. **Önerilen**.
> - **B** — Dahil et, manifest'i değiştirme. Reviewer sorabilir ama ret değildir.

## 3. Prod ZIP oluşturma

```bash
cd /Users/ns0bj/Development/Fun/stitch-design/stitch-export

# Temiz geçici klasör
rm -rf /tmp/stitch-export-1.2.0
mkdir -p /tmp/stitch-export-1.2.0

# Sadece prod dosyalarını kopyala
rsync -av \
  --exclude='.git*' \
  --exclude='.DS_Store' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='screenshots/' \
  --exclude='docs/' \
  --exclude='analyze_parsed.js' \
  --exclude='dNS8Mc_*' \
  --exclude='fix_*.js' \
  --exclude='parse_dNS8Mc*.js' \
  --exclude='test-extractor.js' \
  --exclude='update_*.js' \
  --exclude='*.zip' \
  --exclude='PUBLISH.md' \
  --exclude='BATCH_EXPORT_IMPLEMENTATION.md' \
  --exclude='debug-helper.js' \
  ./ /tmp/stitch-export-1.2.0/

# Klasör içeriğini gözden geçir
ls -la /tmp/stitch-export-1.2.0/
tree /tmp/stitch-export-1.2.0/ 2>/dev/null || find /tmp/stitch-export-1.2.0/ -type f

# ZIP'le (.* dosyaları hariç tut)
cd /tmp/stitch-export-1.2.0
zip -r /tmp/stitch-export-1.2.0.zip . -x ".*"
ls -lh /tmp/stitch-export-1.2.0.zip
```

## 4. Beklenen final ZIP içeriği

```
manifest.json                  (version: 1.2.0)
background.js                  (~37 KB — pure-API batch export + badge)
content.js                     (~22 KB)
LICENSE
README.md
popup/
  popup.html                   (debug & copy buttons commented out)
  popup.css                    (theme + spinner keyframes)
  popup.js                     (project count + label updater)
utils/
  extractor.js
  formatters.js
  downloader.js
icons/
  icon.svg                     (yeni master)
  icon.png
  icon16.png
  icon24.png
  icon32.png
  icon64.png
  icon128.png
  icon256.png
libs/
  jszip.min.js
```

Hedef boyut: **< 200 KB**.

## 5. Manifest'ten `web_accessible_resources` kaldırma (opsiyonel ama önerilen)

Eğer A yolunu seçtiysen, ZIP'lemeden önce `manifest.json`'dan şu bloğu sil:

```json
"web_accessible_resources": [
  {
    "resources": ["debug-helper.js"],
    "matches": [
      "https://stitch.withgoogle.com/*",
      "https://*.appspot.com/*"
    ]
  }
],
```

> **Not**: bu silinmeden önce eklentinin yerel test'inde sorun çıkmadığından emin ol — yukarıdaki smoke test'i tekrar yap.

## 6. Final doğrulama

```bash
# ZIP'i geçici bir yere unzip et ve yerel test et
mkdir -p /tmp/stitch-1.2.0-verify
cd /tmp/stitch-1.2.0-verify
unzip /tmp/stitch-export-1.2.0.zip

# Chrome'da: chrome://extensions/ → Load unpacked → /tmp/stitch-1.2.0-verify
# Smoke test'i tekrar koş. Bu kez ZIP içeriğiyle çalışıyor.
```

---

## Sıradaki adım

✅ Hazırsa: [03 · Developer Dashboard](../03-developer-dashboard/index.html)

## Screenshots

- `screenshots/zip-contents.png` — final ZIP içeriğinin Finder/Terminal görüntüsü
- `screenshots/verify-load.png` — temizlenmiş klasörden unpacked load sonrası popup
