# Stitch Export Extension — Export All Projects Özelliği

> Bu doküman, stitch-export extension'ına "Export All Projects" batch export özelliğinin eklenme sürecini anlatır.

---

## Başlangıç İsteği

> https://github.com/nsozturk/stitch-export daha önce böyle böyle bir proje yapmıştım. Bu projeyi çekip export all project özelliğini ekleyelim. Extension tek tek projelere arka planda girip export project yapacak ve çıktıları toplayıp tek bir zip yapacak.

---

## Yapılan İşlemler (Adım Adım)

### 1. Repo Klonlama

```bash
cd /Users/ns0bj/Development/Fun/stitch-design
git clone https://github.com/nsozturk/stitch-export.git
```

### 2. Mevcut Kod Analizi

Okunan dosyalar:
- `manifest.json` — Extension manifest (v3)
- `background.js` — Service worker, context menu
- `content.js` — Content script, Export butonu enjeksiyonu
- `utils/extractor.js` — `StitchExtractor`: DOM'dan konuşma çıkarma
- `utils/formatters.js` — `StitchFormatters`: Claude/OpenAI/Simple format dönüşümü
- `utils/downloader.js` — `StitchDownloader`: JSON indirme ve notification
- `popup/popup.html` — Popup UI
- `popup/popup.js` — Popup mantığı
- `popup/popup.css` — Popup stilleri

Mevcut özellikler:
- Tek proje export'u (Claude Code, OpenAI ChatGPT, Custom JSON)
- In-page Export butonu (Share butonunun yanına)
- Context menu (sağ tık → Export Stitch Conversation)
- Clipboard'a kopyalama

### 3. JSZip Kütüphanesi Ekleme

ZIP oluşturma için JSZip eklendi:

```bash
mkdir -p stitch-export/libs
curl -L -o stitch-export/libs/jszip.min.js \
  https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
```

### 4. Manifest Güncellemesi (`manifest.json`)

Değişiklikler:
- `"version": "1.0.0"` → `"version": "1.1.0"`
- `permissions` dizisine `"tabs"` eklendi (arka planda sekme açmak için)

### 5. Background Script Güncellemesi (`background.js`)

#### 5a. JSZip Import

```js
importScripts('libs/jszip.min.js');
```

#### 5b. Batch Export State Yönetimi

```js
let batchExportState = {
  isRunning: false,
  total: 0,
  current: 0,
  projects: [],
  results: [],
  format: 'claude',
  cancelled: false
};
```

#### 5c. Message Handler Güncellemesi

Yeni action'lar eklendi:
- `exportAllProjects` — Batch export başlat
- `getBatchExportState` — Anlık durum sorgula
- `cancelBatchExport` — İptal et
- `batchProgress` — Progress broadcast (background → popup)

#### 5d. Context Menu "Export All" Eklendi

```js
chrome.contextMenus.create({
  id: 'stitch-export-all-context',
  title: 'Export All Stitch Projects',
  contexts: ['page'],
  documentUrlPatterns: ['https://stitch.withgoogle.com/*']
});
```

#### 5e. Dashboard'tan Proje Listesi Çıkarma (`fetchProjectList`)

Stitch dashboard'u (`https://stitch.withgoogle.com/`) arka planda açar, iframe yüklenmesini bekler, 3 denemede proje listesini çıkarır.

Stratejiler:
1. **Iframe src attribute'ları** — `extractIframeProjectUrls()`
2. **Tüm frame'lerde link tarama** — `extractProjectListFromPage()` (allFrames: true)

5 farklı çıkarma stratejisi:
- Tam URL linkler: `a[href*="/projects/"]`
- Relative/hash linkler: `a[href^="#/projects/"]`
- `data-project-id` attribute'ları
- Container içinde regex: `projects/(\d+)`
- `onclick/data-href/data-url` attribute'ları

#### 5f. Tek Proje Export (`exportSingleProject`)

Her proje için:
1. Yeni sekme açar (`active: false`)
2. Sekme yüklenene kadar bekler (`waitForTabLoad`)
3. iframe yüklenmesi için 5 saniye bekler
4. 3 denemede `StitchExtractor.extractConversation()` çağırır (iframe yavaş yüklenirse)
5. Başarılı olursa JSON'u toplar
6. Sekmeyi kapatır

#### 5g. ZIP Oluşturma (`createZipFromResults`)

```js
const zip = new JSZip();
const folder = zip.folder(folderName);

for (const result of results) {
  folder.file(filename, JSON.stringify(result.data, null, 2));
}

return await zip.generateAsync({ type: 'base64' });
```

#### 5h. İndirme

```js
await chrome.downloads.download({
  url: 'data:application/zip;base64,' + zipBase64,
  filename: `stitch-all-exports-${format}-${timestamp}.zip`,
  saveAs: true
});
```

### 6. Popup UI Güncellemesi (`popup/popup.html`)

#### 6a. "Export All Projects" Butonu

```html
<button id="exportAllButton" class="btn btn-primary btn-batch">
  <svg>...</svg>
  Export All Projects
</button>
```

#### 6b. Batch Export Progress UI

```html
<div id="batchExportState" class="state hidden">
  <div class="batch-progress-container">
    <h3>Exporting All Projects</h3>
    <div class="progress-bar-wrapper">
      <div id="batchProgressBar" class="progress-bar" style="width: 0%"></div>
    </div>
    <p id="batchProgressText">Initializing...</p>
    <p id="batchProgressCount">0 / 0 projects</p>
    <button id="cancelBatchButton" class="btn btn-secondary btn-small">Cancel</button>
  </div>
</div>
```

#### 6c. "Not on Stitch" State'e de Export All Butonu

Kullanıcı Stitch sayfasında değilken de batch export başlatabilir.

### 7. Popup JS Güncellemesi (`popup/popup.js`)

#### 7a. Yeni State: `BATCH_EXPORT`

```js
const AppState = {
  NOT_ON_STITCH: 'notOnStitch',
  READY: 'ready',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  BATCH_EXPORT: 'batchExport'
};
```

#### 7b. `handleExportAll()` — Batch Export Başlatma

1. State'i `BATCH_EXPORT` yapar
2. Seçili formatı alır
3. Background'a `exportAllProjects` mesajı gönderir
4. Sonuç gelince `SUCCESS` veya `ERROR` state'ine geçer

#### 7c. `handleCancelBatch()` — İptal

```js
await chrome.runtime.sendMessage({ action: 'cancelBatchExport' });
```

#### 7d. Progress UI Güncelleme

Background'dan gelen `batchProgress` mesajlarını dinler:
- Progress bar width günceller
- Metin ve sayaç günceller

### 8. Popup CSS Güncellemesi (`popup/popup.css`)

Yeni stiller eklendi:
- `.batch-progress-container`
- `.progress-bar-wrapper` + `.progress-bar` (yeşil/mavi gradient)
- `.batch-progress-text` + `.batch-progress-count`
- `.btn-batch` (yeşil gradient buton)
- `.btn-small`

### 9. README Güncellemesi

- "Export All Projects" özelliği dokümante edildi
- Batch export kullanım adımları eklendi
- `tabs` permission'ı açıklandı
- Versiyon 1.1.0

---

## Mimari Akış Diyagramı

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Popup UI   │────▶│  Background SW  │────▶│  Dashboard Tab   │
│             │     │                 │     │  (background)    │
└─────────────┘     └─────────────────┘     └──────────────────┘
                            │                        │
                            ▼                        ▼
                     ┌──────────────┐      ┌───────────────┐
                     │  JSZip       │      │  Iframe       │
                     │  (base64)    │      │  (appspot)    │
                     └──────────────┘      └───────────────┘
                            │                        │
                            ▼                        ▼
                     ┌──────────────┐      ┌───────────────┐
                     │  chrome.     │      │  extract      │
                     │  downloads   │      │  project list │
                     └──────────────┘      └───────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  User gets   │
                     │  .zip file   │
                     └──────────────┘
```

---

## Hata Giderme Geçmişi

### Hata 1: Dashboard URL Yanlış

**Sorun**: `https://stitch.withgoogle.com/projects` → 404

**Fix**: `https://stitch.withgoogle.com/` olarak düzeltildi.

### Hata 2: "No projects found"

**Sorun**: Stitch dashboard iframe içinde render ediyor (`app-companion-430619.appspot.com`). Eski kod sadece ana frame'e bakıyordu.

**Fix**:
- 3 deneme mekanizması eklendi (6s + 4s + 5s bekleme)
- `extractIframeProjectUrls()` — iframe `src` attributelarından proje ID çıkarma
- `allFrames: true` ile hem ana frame hem iframe'de tarama
- 5 farklı DOM stratejisi eklendi

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|---|---|
| `manifest.json` | `tabs` permission, versiyon 1.1.0 |
| `background.js` | +500 satır: batch export, JSZip, iframe scraping, retry logic |
| `popup/popup.html` | Export All butonu, batch progress UI |
| `popup/popup.js` | `handleExportAll`, `handleCancelBatch`, progress dinleyici |
| `popup/popup.css` | Progress bar, batch container, btn-batch stilleri |
| `libs/jszip.min.js` | Yeni dosya: ZIP oluşturma kütüphanesi |
| `README.md` | Batch export dokümantasyonu |

---

## Kullanım

### Tek Proje Export
1. Stitch proje sayfası aç
2. Extension ikonuna tıkla
3. Format seç → "Export Conversation"

### Tüm Projeleri Export Et
1. Herhangi bir sayfada extension ikonuna tıkla
2. "Export All Projects" butonuna bas
3. Extension arka planda çalışır, progress bar gösterir
4. Tek ZIP dosyası indirilir

### Sağ Tık Menüsü
- Tek proje: Sağ tık → "Export Stitch Conversation"
- Tümü: Sağ tık → "Export All Stitch Projects"

---

## Teknik Notlar

- **Stitch iframe**: Dashboard ve proje sayfaları `app-companion-430619.appspot.com` iframe'i içinde render ediyor
- **Content scripts**: `all_frames: true` sayesinde iframe'e de enjekte ediliyor
- **StitchExtractor**: DOM'da `[data-testid="chat-msg-list"]` içindeki `section` elementlerini tarar
- **Role belirleme**: `img[alt="Stitch avatar"]` → assistant, diğerleri → user
- **Formatlar**: Claude Code (`claude_code`), OpenAI ChatGPT (`openai_chat`), Simple JSON, Custom

---

## Chat Geçmişi

Aşağıdakiler, bu implementasyon sırasında verilen talimatlar ve geri bildirimlerdir:

1. "What did we do so far?" — Önceki oturum özetini istedi.

2. "https://github.com/nsozturk/stitch-export daha önce böyle böyle bir proje yapmıştım. Bu projeyi çekip export all project özelliğini ekleyelim. Extension tek tek projelere arka planda girip export project yapacak ve çıktıları toplayıp tek bir zip yapacak." — Ana istek.

3. "projeler https://stitch.withgoogle.com/ burda link yanlış" — Dashboard URL'sinin yanlış olduğunu bildirdi.

4. "Export Failed — No projects found. Make sure you are logged into stitch.withgoogle.com" — Batch export'un proje bulamadığını rapor etti.

5. "extension için yaptıklarını tek tek bir markdownda anlat." — Bu dokümanı istedi.

6. "ayrıca ne yapmak istediğimi de ekle ayrıca chat geçmişimi de ekle. senin cevaplarını eklemeyebilirsin" — Doküman formatı talimatı.

---

*Son güncelleme: 15 Mayıs 2026*
*Versiyon: 1.1.0*
