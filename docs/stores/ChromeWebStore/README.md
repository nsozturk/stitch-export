# Stitch Export · Chrome Web Store Launch Guide

> **Status:** v1.1.0 yayında → v1.2.0 yayınlanacak

8 fazlık, kronolojik, ekran görüntüsü odaklı Chrome Web Store yayın yol haritası.
01'den 08'e sırayla ilerle.

## Master checklist

- [ ] **01 · Prerequisites** — Chrome Developer hesabı + 2FA + unpacked install çalışıyor
- [ ] **02 · Package Prep** — Prod ZIP oluştur, dev artefactları ayıkla, manifest version validate
- [ ] **03 · Developer Dashboard** — Dashboard'a giriş, mevcut item'ı bul, ZIP upload
- [ ] **04 · Store Listing** — Title, summary, description, "What's new" v1.2.0 notu
- [ ] **05 · Icons & Screenshots** — Store icon 128×128, screenshot'lar 1280×800, opsiyonel promo tile
- [ ] **06 · Privacy & Permissions** — Single purpose declaration + permission justifications (özellikle `tabs`)
- [ ] **07 · Submit for Review** — Submit + reviewer note + 1-3 gün bekleme
- [ ] **08 · Post-Launch** — Yayını doğrula, analytics, git tag, kullanıcı geri bildirimi

---

## App constants

| Alan | Değer |
|---|---|
| **Eklenti adı** | Stitch Export |
| **Yeni versiyon** | 1.2.0 |
| **Önceki versiyon** | 1.1.0 |
| **Manifest version** | 3 |
| **Author** | nsozturk &lt;telepenu@gmail.com&gt; |
| **Single purpose** | Export Stitch design conversations and projects |
| **Primary category** | Developer Tools |
| **Secondary category** | Productivity |
| **GitHub** | https://github.com/nsozturk/stitch-export |
| **Store URL** | (Store'dan otomatik üretilir, yayın sonrası ekle) |

### Permissions (manifest.json)

| Permission | Gerekçe |
|---|---|
| `activeTab` | Aktif sekmeden conversation çekme |
| `scripting` | Sayfa context'ine extraction script enjeksiyonu |
| `contextMenus` | Sağ tık → "Export Stitch Conversation" |
| `downloads` | JSON / ZIP dosyalarını kullanıcıya indirme |
| `tabs` | Batch export sırasında dashboard sekmesi açma + badge için URL tespiti |

### Host permissions

| Host | Gerekçe |
|---|---|
| `https://stitch.withgoogle.com/*` | Eklentinin çalıştığı ana host |
| `https://*.appspot.com/*` | Stitch'in arka uç servisleri |
| `https://contribution.usercontent.google.com/*` | Üretilen HTML tasarım dosyalarını indirme |
| `https://lh3.googleusercontent.com/*` | Screenshot URL'leri (chat export'ta referans) |

---

## v1.2.0 değişiklikleri (Store "What's new")

- **24× hızlı batch export** — 71 proje ~12 dk yerine ~30 sn (pure API, UI otomasyonu yok)
- **Zengin chat export** — her turn için üretilen tasarımlar + follow-up öneri prompt'ları
- **Yeni ZIP yapısı** — `screens/` (final) + `history/turn-NNN-{slug}/` (per-turn) + referanslı `chat.json`
- **Icon badge** — list sayfasında proje sayısı, detail sayfasında "EXP" hatırlatıcı, tema renkleriyle
- **Yenilenmiş icon set**
- **UI sadeleştirme** — debug & copy-to-clipboard butonları kaldırıldı

---

## Hızlı erişim

- [01 · Prerequisites](01-prerequisites/index.html)
- [02 · Package Prep](02-package-prep/index.html)
- [03 · Developer Dashboard](03-developer-dashboard/index.html)
- [04 · Store Listing](04-store-listing/index.html)
- [05 · Icons & Screenshots](05-icons-and-screenshots/index.html)
- [06 · Privacy & Permissions](06-privacy-permissions/index.html)
- [07 · Submit for Review](07-submit-review/index.html)
- [08 · Post-Launch](08-post-launch/index.html)
- [STATUS](STATUS.md) — canlı yayın durumu
