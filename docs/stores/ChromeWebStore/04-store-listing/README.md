# 04 · Store Listing

> **Status:** ⏳ todo

**Duration:** ~30 dk (yazı + URL'ler + dil)
**Pre-req:** Faz 03 — package upload başarılı
**Output:** Store listing tüm metadata'lar dolduruldu, "What's new" v1.2.0 notu hazır.

---

## Canonical metadata

Dashboard → **Store listing** sekmesine gir. Aşağıdaki alanları doldur.

### Name (eklenti adı — 45 char max)

```
Stitch Export
```

> Önceki yayında zaten bu. Değişiklik yok.

### Summary (kısa açıklama — 132 char max)

```
Export Stitch design conversations and projects to LLM-compatible formats (Claude Code, ChatGPT). Batch export all projects to ZIP.
```

> 130 char. Stitch'in Google Stitch design tool'u olduğunu ima etmiyor ama "Stitch design conversations" net.

### Description (detaylı açıklama — 16,000 char max)

```
Stitch Export is a Chrome extension that exports your conversations and
generated designs from stitch.withgoogle.com — Google's AI-powered UI
design tool — to formats compatible with Claude Code, ChatGPT, and any
LLM workflow.

## What it does

• Export single conversation — extract the chat history of the current
  Stitch project as a structured JSON file. Supports Claude Code,
  OpenAI ChatGPT, and a customizable role-mapping format.

• Export all projects (batch) — with one click, archive every Stitch
  project you've ever created into a single ZIP. Each project folder
  contains:
  - chat.json — full per-turn conversation with references to the
    designs generated in each turn and the follow-up suggestion prompts
  - screens/ — final HTML designs (current state)
  - history/turn-NNN-{slug}/ — designs generated in each individual
    conversation turn, preserving the full history

• Icon badge — at a glance, see how many projects you have on Stitch
  (badge on the toolbar icon) and a small "EXP" reminder when you're
  on a project page that you can export it.

## How it works

The extension uses Stitch's own batch API endpoints to fetch project
data, screen instances, and chat sessions. HTML files are downloaded
directly from Google's content CDN. No screen scraping, no UI
automation — the batch export of 70+ projects completes in about 30
seconds.

Your Stitch login session is used (via cookies) — the extension never
sees or transmits your password. No external servers are contacted
other than Google's own Stitch backend.

## Use cases

• Archive your Stitch design history before it's lost
• Feed Stitch-generated designs as context to other LLMs
• Compare different design iterations across conversation turns
• Backup designs for offline reference

## What's new in v1.2.0

• Batch export now uses Stitch's API directly — 24× faster than v1.1.x
• Rich chat export — every assistant turn now includes references to
  the designs it generated and the follow-up suggestion prompts
• New ZIP structure with screens/ (final state) + history/ (per-turn
  designs) + chat.json (full metadata with file references)
• Toolbar icon badge — project count on the list page, export
  reminder on project pages
• Refreshed icon set in the new purple/mauve theme

## Privacy

This extension:
• Runs only on stitch.withgoogle.com and Google CDN domains
• Uses your existing Stitch session — no separate authentication
• Stores nothing remotely — exports are local downloads only
• Collects no analytics, no telemetry, no usage tracking

Source code: https://github.com/nsozturk/stitch-export
Support: support via GitHub issues
```

### Category

| Field | Value |
|---|---|
| **Primary category** | Developer Tools |
| **Secondary category** | Productivity |

### Language

| Field | Value |
|---|---|
| **Default language** | English (US) |
| **Additional languages (opsiyonel)** | Türkçe — eğer çevirmek istersen |

> Türkçe çeviri opsiyonel. Mevcut yayın muhtemelen sadece İngilizce. Bunu değiştirme yapacaksan ekstra metadata seti gerekir, faz 07'den önce karar ver.

### What's new (yeni sürüm notu — opsiyonel ama önerilen)

Listing'in "What's new" alanı (eğer Dashboard'da görüyorsan; bazı listing template'lerinde yok). Eğer var:

```
v1.2.0
• Batch export 24× faster — 70+ projects in 30 seconds (pure API)
• Rich chat export — per-turn designs + follow-up suggestions
• New ZIP layout: screens/ + history/turn-NNN/ + chat.json
• Toolbar badge: project count on dashboard, EXP reminder on project pages
• Refreshed icons + UI polish
```

### Support URL

```
https://github.com/nsozturk/stitch-export/issues
```

> **Zorunlu**. Privacy practices'i tamamlamak için bu URL'in canlı olması lazım.

### Homepage URL (opsiyonel)

```
https://github.com/nsozturk/stitch-export
```

### Single purpose statement

```
Export Stitch design conversations and projects to LLM-compatible formats and ZIP archives.
```

---

## Form doldururken dikkat

- **Image alt text** — Description'da SVG/image referansı yok, ama eğer eklerssen alt text gerekir.
- **Promo text** — Bazı listing template'lerinde "promotional text" alanı var; description'ın ilk 132 karakteri kullan.
- **Listing freshness** — Description'ın v1.2.0 özelliklerini içermesi reviewer'ı hızlandırır.

---

## Sıradaki adım

✅ Hazırsa: [05 · Icons & Screenshots](../05-icons-and-screenshots/index.html)

## Screenshots

- `screenshots/01-listing-form.png` — doldurulmuş Store listing formu
- `screenshots/02-description-preview.png` — markdown render edilmiş açıklamanın önizleme görüntüsü
