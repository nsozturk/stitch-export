# 06 · Privacy & Permissions

> **Status:** ⏳ todo

**Duration:** ~30 dk (her permission için justification yazma)
**Pre-req:** Faz 03 — package upload başarılı
**Output:** Privacy practices formu eksiksiz doldurulmuş, single purpose net.

---

Chrome Web Store inceleme sürecinin en sıkı kısmı bu. Bir tane red yersen yeniden submit etmek gerekiyor → 1-3 gün daha bekleme. Bu yüzden **dikkatli doldur**.

Dashboard → **Privacy practices** sekmesi.

## 1. Single purpose

Tek satırlık tanım. Açık ve dar olmalı.

```
Export Stitch design conversations and projects to LLM-compatible formats and ZIP archives.
```

> Eski ifadende "everything Stitch" gibi belirsiz bir şey vardıysa **mutlaka değiştir** — single purpose'ı genişletmek "policy violation" olabilir.

## 2. Permission justifications

Her permission için neden gerektiğini açıkla. Reviewer **literal olarak okuyor**.

### `activeTab`

```
Used to extract the conversation data and screen DOM from the currently active
Stitch project tab when the user explicitly clicks "Export Conversation" or
selects "Export Stitch Conversation" from the right-click menu. No background
access — fires only on user interaction.
```

### `scripting`

```
Required by Manifest V3 to inject the page-context extraction script into the
active Stitch tab. The injected script reads window-level auth tokens
(FdrFJe, SNlM0e) which are already present in the page's HTML and calls
Stitch's own batchexecute API endpoints to retrieve project data.
```

### `contextMenus`

```
Adds two right-click menu items on stitch.withgoogle.com pages:
"Export Stitch Conversation" (single project) and
"Export All Stitch Projects" (batch). Both items are visible only on Stitch
domains and only act when the user clicks them.
```

### `downloads`

```
Used to save the exported conversation JSON files and the batch export ZIP
archive to the user's local Downloads folder. All saves use the standard
chrome.downloads.download API with saveAs:true, so the user sees and
controls the file location.
```

### `tabs` ⚠️ MODERATE RISK

```
Required for two features:

1. Toolbar icon badge — to detect when the user is on stitch.withgoogle.com
   (list page → badge shows project count; project page → "EXP" reminder),
   the extension reads tab URL changes via chrome.tabs.onUpdated. The badge
   text only reflects the destination URL category; no URL content is stored
   or transmitted.

2. Batch export — opens a single background tab on stitch.withgoogle.com to
   read API auth tokens, fires API calls in that tab context, and closes the
   tab when done. The tab is non-active (background) for the user's
   convenience and is removed after the export completes.

No tab data is sent to any external server. The extension does not enumerate
or read content from non-Stitch tabs.
```

> Bu en kritik. Reviewer tabs permission'ını yakından okur. Yukarıdaki gerekçe açık ve doğru — kopyala yapıştır.

## 3. Host permissions justification

### `https://stitch.withgoogle.com/*`

```
Primary host of the Stitch design tool. The extension's content scripts,
context menu items, and batch export workflow all operate exclusively on this
host. The single legitimate purpose of the extension is to export user data
from this site.
```

### `https://*.appspot.com/*`

```
Stitch is hosted on an internal Google appspot backend; some API responses
and asset references resolve through *.appspot.com subdomains. The extension
needs to read these responses (read-only, via the user's existing session)
to assemble the export.
```

### `https://contribution.usercontent.google.com/*`

```
Stitch publishes generated HTML design files on this Google CDN. To bundle a
project's design files into the export ZIP, the extension fetches each HTML
file directly from this CDN. Download URLs are signed tokens returned by
Stitch's API — no cookies or session data are sent.
```

### `https://lh3.googleusercontent.com/*`

```
Stitch generates screenshot URLs for each design on this Google CDN. The
extension references (does not necessarily download) these URLs in the
exported chat.json so users can preview designs alongside the conversation
history.
```

## 4. Data usage disclosure

### Hangi data toplanıyor?

| Question | Answer |
|---|---|
| Personally identifiable information (name, email, etc.) | **No** |
| Health information | **No** |
| Financial info | **No** |
| Authentication info (passwords, tokens) | **No** — uses your existing Stitch session cookies, never reads or transmits them |
| Personal communications | **No** — exports Stitch conversations LOCALLY to your machine; not transmitted |
| Location | **No** |
| Web history | **No** |
| User activity | **No** — no analytics, telemetry, or tracking |
| Website content | **No** — reads Stitch page content but only on user-triggered export; not stored or sent |

### Data usage certifications

| Certification | Answer |
|---|---|
| Data is not sold to third parties | ✅ |
| Data is not used for unrelated purposes | ✅ |
| Data is not used for credit-worthiness/loan determination | ✅ |

## 5. Privacy policy URL ⚠️

Chrome Web Store şu durumlarda privacy policy URL **zorunlu** tutar:
- Permission'lardan biri "sensitive" ise (`activeTab`, `tabs`, `scripting`, host permissions hep "potentially sensitive")
- Single purpose'da kullanıcı verisi ima ediyorsa

Sitch Export bu kapsamda. **Bir privacy policy URL'i sağlamak zorundayız**.

### Hızlı çözüm: GitHub-hosted privacy policy

GitHub repo'da `PRIVACY.md` dosyası oluştur, raw URL'i kullan:

```
https://raw.githubusercontent.com/nsozturk/stitch-export/main/PRIVACY.md
```

Ya da daha güzeli — GitHub Pages açıp `https://nsozturk.github.io/stitch-export/privacy.html` gibi bir URL kullan.

### Privacy policy içeriği (taslak)

```markdown
# Stitch Export Privacy Policy

**Last updated:** 2026-05-15

Stitch Export is a Chrome extension that exports your design
conversations and projects from stitch.withgoogle.com to local
files on your machine.

## Data we collect

**None.** The extension does not collect, store, or transmit any
data to any server controlled by us or any third party.

## Data we read

When you actively trigger an export, the extension reads:

- The DOM and embedded API tokens of the active Stitch tab
- The response of Stitch's own API endpoints (project list,
  screen instances, chat sessions)
- HTML design files from Google's contribution.usercontent.google.com CDN

All reads use your existing Stitch login session via standard
browser cookies. The extension never accesses or transmits your
password or session tokens.

## What we do with that data

We pass it directly to a JSON or ZIP file in your browser's
Downloads folder. The file stays on your machine. We have no
servers and collect no analytics.

## Permissions

See the Chrome Web Store listing for a per-permission justification.
All permissions are used solely for the export functionality.

## Contact

GitHub issues: https://github.com/nsozturk/stitch-export/issues
Email: telepenu@gmail.com
```

> **Eylem**: Bu metni `PRIVACY.md` olarak repo köküne ekle, push'la, Dashboard'daki "Privacy policy URL" alanına yapıştır.

## 6. Account access (eğer varsa)

| Field | Answer |
|---|---|
| Does this extension require user login? | **No** — uses your existing Stitch session |
| Does it transfer user data outside the device? | **No** |
| Does it use OAuth or external auth? | **No** |

## 7. Remote code

| Question | Answer |
|---|---|
| Does the extension execute remote code? | **No** — all code bundled in the package; no eval, no remote script load |

> Manifest V3 zaten remote code'u yasak. Ama Privacy practices'te tekrar onaylaman gerekir.

---

## Sıradaki adım

✅ Tüm alanları doldurduysan ve **PRIVACY.md** GitHub'da live ise: [07 · Submit for Review](../07-submit-review/index.html)

## Screenshots

- `screenshots/01-privacy-practices-filled.png` — doldurulmuş Privacy practices formu
- `screenshots/02-permission-justifications.png` — permission listesi gerekçeleriyle
- `screenshots/03-privacy-policy-url.png` — Privacy policy URL alanı dolduğunda
