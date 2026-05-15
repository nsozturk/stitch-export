# 05 · Icons & Screenshots

> **Status:** 🟡 partial — yeni iconlar hazır, screenshot'lar henüz çekilmedi

**Duration:** ~45 dk (screenshot çekimi + crop + upload)
**Pre-req:** Faz 03 — package upload başarılı
**Output:** Store icon güncellendi, en az 1 screenshot yüklendi.

---

## 1. Store icon (128×128)

Store icon, eklenti listing'inin başlığında görünen büyük icon. Toolbar action icon'undan **AYRI** bir asset.

### Mevcut hazır asset

```
/Users/ns0bj/Development/Fun/stitch-design/stitch-export/icons/icon128.png
```

Bu dosya yeni mor/eflatun temalı icon set'in 128×128 versiyonu.

### Yükleme

Dashboard → **Store listing** → **Store icon** alanı → upload `icon128.png`.

Eğer Store 128×128'i kabul etmiyor ve daha büyük versiyon istiyorsa (bazı locale'larda 256×256 önerilir):

```
/Users/ns0bj/Development/Fun/stitch-design/stitch-export/icons/icon256.png
```

> **Önemli**: Store icon arka plan **transparent OLMAMALI**. Eğer mevcut icon128.png transparent ise, dolu mor (#8D6A8A) arka plan ekle.

```bash
# Transparent → dolu mor arka plan (ImageMagick)
convert icons/icon128.png -background "#8D6A8A" -alpha remove -alpha off /tmp/icon128-store.png
```

---

## 2. Screenshots (en az 1, max 5)

| Boyut | Önerilen kullanım |
|---|---|
| **1280×800** | Önerilen — Store'da büyük render edilir |
| **640×400** | Daha küçük, eski format — kabul ediliyor ama yeni listing'lerde önerilmez |

> Format: PNG veya JPG. Önerilen: PNG (lossless).

### Çekilmesi gereken 4-5 ekran

#### Screenshot 1 — Popup main view (Stitch'te)

**Ne göster**: Eklenti popup'ı, Stitch dashboard tab'ında açılmış. Mor tema, **Export All Projects (71)** butonu net görünür.

**Capture**:
1. `chrome://extensions/` → Stitch Export → enable
2. https://stitch.withgoogle.com/ aç (login olmuş olarak)
3. Eklenti popup'ını aç (toolbar icon)
4. Cmd+Shift+4 (macOS) ile popup + tarayıcı bağlamını yakala
5. 1280×800'e crop et (sağ tarafta Stitch görünmeli)

**Dosya**: `screenshots/01-popup-main.png`

#### Screenshot 2 — Batch export progress

**Ne göster**: "Exporting project 35/71: ProjectName" gösteren progress bar dolarken popup.

**Capture**:
1. Stitch dashboard'da iken eklenti popup → **Export All Projects**'e bas
2. Progress bar görünür görünmez ekran fotoğrafı al
3. 1280×800 crop

**Dosya**: `screenshots/02-batch-progress.png`

#### Screenshot 3 — Toolbar badge'ler

**Ne göster**: Üst toolbar'da eklenti iconunun yanında `71` badge'i (list page). Yan yana iki tab gösterilebilir: biri dashboard (71 badge), biri proje detail (EXP badge).

**Capture**:
1. Yan yana iki Chrome window aç (veya tek window içinde iki tab)
2. Sol: dashboard tabı (badge: `71` mor)
3. Sağ: proje detail (badge: `EXP` koyu mor)
4. Toolbar icon'una hover ile tooltip de görünsün (`71 Stitch projects — click to export all`)

**Dosya**: `screenshots/03-badges.png`

#### Screenshot 4 — Exported ZIP structure

**Ne göster**: Finder/Explorer'da açılmış indirilen ZIP — `screens/`, `history/`, `chat.json` klasör yapısı net.

**Capture**:
1. Batch export çalıştır, ZIP'i indir
2. Finder'da ZIP'i unzip et
3. Hierarchical view (column view) ile yapıyı göster:
   ```
   stitch-all-projects-2026-05-15/
     XporterUI_4164.../
       chat.json
       screens/
         Xporter_Login_Gateway_2cde0644.html
         ...
       history/
         turn-001-design-prompt-for-ai-designer/
           ...
   ```
4. 1280×800 crop, mor accent overlay ile vurgu yapılabilir

**Dosya**: `screenshots/04-zip-structure.png`

#### Screenshot 5 — chat.json içeriği (opsiyonel)

**Ne göster**: VS Code'da açılmış chat.json, `generatedScreens` ve `suggestions` alanları collapse olarak görünür.

**Capture**:
1. chat.json dosyasını VS Code (veya benzeri) ile aç
2. Dark theme, mor accent paletinde tema kullan (mümkünse)
3. `turns[0].assistant.generatedScreens` array'ini expand et
4. 1280×800 crop

**Dosya**: `screenshots/05-chat-json.png`

### Yükleme

Dashboard → **Store listing** → **Screenshots** alanı:

1. **Add screenshot** → ilk PNG'yi yükle
2. Sırayla diğer 4'ünü ekle
3. Sürükle-bırakla sırayı ayarla (en güçlü olanı başa)

> Reviewer'ın gördüğü sıra önemli — popup'ı önce, sonra çalışan eklentinin sonuçlarını göster.

---

## 3. Promo tiles (opsiyonel ama önerilen)

Promo tile'lar Store'un "Featured" / "Editor's Pick" bölümlerinde kullanılır. Yoksa eklenti normal listing'de görünür, sadece featured spotlar kaybedilir.

### Small promo tile (440×280) — opsiyonel

**Ne içersin**: 
- Sol tarafta **Stitch Export** logo + tagline ("Export all your Stitch designs")
- Sağ tarafta küçük popup mockup'ı

Mor gradient bg (`linear-gradient(135deg, #8D6A8A 0%, #50384E 100%)`).

**Dosya**: `screenshots/promo-small-440x280.png`

### Marquee promo tile (1400×560) — opsiyonel

**Ne içersin**:
- Geniş hero — Stitch'in design ekranı + eklentinin badge'i + ZIP iniyor görseli
- Headline: "Archive every Stitch design — in 30 seconds"
- Bottom-right: "Free · Open source" rozeti

**Dosya**: `screenshots/promo-marquee-1400x560.png`

Bu ikisini şimdilik **atlayabilirsin** — yayını engellemez, sadece featured spot şansını kaçırır.

---

## 4. Icon tutarlılığı kontrolü

Manifest'teki `icons` ile Store'a yüklediğin store icon **eşleşmeli** (görsel tutarlılık için):

```json
"icons": {
  "16":  "icons/icon16.png",
  "24":  "icons/icon24.png",
  "32":  "icons/icon32.png",
  "64":  "icons/icon64.png",
  "128": "icons/icon128.png"
}
```

Hepsinin aynı SVG master'dan üretildiğini doğrula:

```bash
# Tüm icon PNG'lerin son değiştirme zamanı son commit ile uyumlu mu?
ls -la icons/
file icons/*.png  # tipler doğru mu
```

---

## Sıradaki adım

✅ Hazırsa: [06 · Privacy & Permissions](../06-privacy-permissions/index.html)

## Screenshots ile bu klasör

- `screenshots/01-popup-main.png` — popup main view
- `screenshots/02-batch-progress.png` — batch export progress
- `screenshots/03-badges.png` — toolbar badge'ler (list + detail)
- `screenshots/04-zip-structure.png` — indirilen ZIP yapısı
- `screenshots/05-chat-json.png` — chat.json içeriği (opsiyonel)
- `screenshots/promo-small-440x280.png` — small promo (opsiyonel)
- `screenshots/promo-marquee-1400x560.png` — marquee promo (opsiyonel)
