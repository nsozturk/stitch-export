# 07 · Submit for Review

> **Status:** ⏳ todo

**Duration:** 1 dk submit + 1-3 gün bekleme
**Pre-req:** Fazlar 02-06 ✅
**Output:** Item "In review" durumunda, reviewer takip ediyor.

---

## Submit-öncesi son checklist

Submit butonuna basmadan hemen önce hepsi ✅ olmalı:

- [ ] **Package** sekmesinde `1.2.0` ZIP yüklü, validasyon hatası yok
- [ ] **Store listing** doldurulmuş: name, summary, description, category, screenshots, store icon
- [ ] **Privacy practices** tüm sorular cevaplı, justifications hazır
- [ ] **Privacy policy URL** alanı dolu ve URL canlı (tarayıcıda açıp doğrula!)
- [ ] **Support URL** canlı (GitHub issues page açılıyor mu?)
- [ ] Distribution settings (Public / Unlisted / Private) doğru seçili
- [ ] Region availability istediğin gibi (default: all regions)

## 1. Submit for review

1. Dashboard → sağ üst → **Submit for review** butonu
2. Tıkla → onay modal'ı açılır
3. **Reviewer note** (opsiyonel ama önerilen) alanını doldur — aşağıdaki taslak:

### Reviewer note taslağı

```
Stitch Export v1.2.0 — what changed since v1.1.0:

• Batch export rewrite: previously the extension opened a tab per project
  and clicked the "Download Project" menu via DOM automation (slow,
  fragile). v1.2.0 calls Stitch's own batchexecute API endpoints
  (ErneX for screen instances, dNS8Mc for chat sessions) inside a
  single background tab, then fetches HTML files directly from
  contribution.usercontent.google.com. No DOM clicks, no UI automation.
  Time: 70 projects in ~30 seconds (was ~12 minutes).

• Rich chat export: the assistant turn parser now reads turn[4][0]
  for generated design references and turn[4][N][2] for follow-up
  suggestion prompts. The export now includes the full per-turn
  history with file references in chat.json.

• Toolbar action badge: reads tab URL via the tabs permission to
  show project count on the Stitch dashboard and an "EXP" reminder
  on project pages. No tab content is read or transmitted.

All network requests go to Google's own domains:
- stitch.withgoogle.com (API)
- *.appspot.com (Stitch backend)
- contribution.usercontent.google.com (HTML CDN)
- lh3.googleusercontent.com (screenshot CDN)

The extension uses the user's existing Stitch login session via
cookies. No password, no session token, no user data is read or
transmitted to any non-Google server. The extension has no remote
servers of its own.

PRIVACY.md is hosted at:
https://github.com/nsozturk/stitch-export/blob/main/PRIVACY.md

Source code is fully open at:
https://github.com/nsozturk/stitch-export
```

4. **Submit** butonuna bas
5. Item durumu "**In review**" olur

> **Screenshot capture noktası**: submit edildikten sonra "In review" status'lu Dashboard → `screenshots/01-in-review.png`

## 2. İnceleme süreci

| Tipik süre | Senaryo |
|---|---|
| **Aynı gün** | Minor update, otomatik onay kuyruğu |
| **1-2 gün** | Standart inceleme |
| **3-5 gün** | Permission değişikliği varsa veya hafta sonu |
| **1+ hafta** | Manual review ile flag'lendi |

E-mail bildirimi gelir:
- ✅ "Your item has been published" — yayında
- ❌ "Your item needs changes" — ret + sebepler

## 3. Olası ret nedenleri ve çözümleri

| Reject reason | Çözüm |
|---|---|
| **Single purpose unclear** | Description'da single purpose'u ilk paragrafta net belirt |
| **`tabs` permission overbroad** | Faz 06'daki gerekçeyi reviewer'a uzun versiyonuyla yapıştır |
| **Privacy policy missing/broken** | URL'in canlı olduğunu doğrula, sayfa "404" değil |
| **Description mismatches code** | Description'da "we sync to cloud" gibi yanlış iddialar varsa düzelt |
| **Permission justification incomplete** | Her permission için ayrı, dar bir gerekçe ekle |
| **Spammy / misleading title** | "Best Stitch tool" gibi superlative ifadeler kaldır |

Ret aldıysan:
1. E-mail'deki "Reasons" listesini oku
2. Faz 06 veya 04'e dön, düzelt
3. Yeniden submit (yeni 1-3 gün bekleme)

## 4. Inceleme sırasında ne yapma

- ❌ Yeni package upload'lama (queue'yu sıfırlar)
- ❌ Distribution settings değiştirme
- ❌ Listing'i radikal değiştirme

**Beklenirken yapabilirsin:**
- ✅ Screenshot'ları cilalama (kabul aldıktan sonra hot update)
- ✅ README.md ve PRIVACY.md GitHub'da güncelleme
- ✅ Bir sonraki feature'ı yerel branch'te geliştirme

## 5. Beta channel (opsiyonel)

Eğer "stable submit etmeden önce trusted user'lara dağıtmak" istersen:

1. Dashboard → **Distribution** → "**Restrict to specific users**"
2. Test grubu için Google Account e-mail listesi gir
3. Submit (private review faster — usually < 1 day)
4. Trusted user'lar feedback ver
5. Distribution → "**Public**" → resubmit

> Stitch Export gibi küçük eklentilerde genelde direkt public submit yeterli.

---

## Sıradaki adım

✅ Submit edildi: [08 · Post-Launch](../08-post-launch/index.html)

## Screenshots

- `screenshots/01-in-review.png` — "In review" status'lu Dashboard
- `screenshots/02-reviewer-note.png` — submit modal'ı reviewer note dolduyken
- `screenshots/03-rejection-email.png` — ret e-postası (eğer geldiyse)
- `screenshots/04-published-email.png` — yayın bildirimi e-postası
