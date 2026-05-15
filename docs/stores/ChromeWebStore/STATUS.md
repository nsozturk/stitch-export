# STATUS · Stitch Export Chrome Web Store

> Canlı yayın durumu. Her fazın bitince ✅, devam ediyorsa 🟡, açıksa ⏳ olarak işaretle.

## Anlık durum

| Faz | Konu | Durum |
|---|---|---|
| 01 | Prerequisites | ✅ (zaten Store'da yayında) |
| 02 | Package Prep | ⏳ |
| 03 | Developer Dashboard | ⏳ |
| 04 | Store Listing | ⏳ |
| 05 | Icons & Screenshots | 🟡 yeni iconlar hazır, screenshot'lar yenilenecek |
| 06 | Privacy & Permissions | ⏳ |
| 07 | Submit for Review | ⏳ |
| 08 | Post-Launch | ⏳ |

## v1.2.0 yayın takvimi

| Tarih | Olay |
|---|---|
| 2026-05-15 | v1.2.0 kod tamamlandı (pure-API batch export + zengin chat) |
| TBD | Prod ZIP üretildi |
| TBD | Developer Dashboard upload |
| TBD | Submit for review |
| TBD | Yayın canlıya çıktı |

## Önceki sürümler

| Sürüm | Tarih | Ana değişiklik |
|---|---|---|
| 1.1.0 | (yayında) | Initial batch export |
| 1.0.x | — | Tek proje export |

## Bilinen riskler

- **`tabs` permission** Chrome Web Store tarafından "moderate risk" sayılıyor. Reviewer not'unda batch export ve badge URL tespiti için gerekli olduğunu netçe açıkla.
- **`host_permissions` listesi geniş** — özellikle `*.appspot.com` reviewer'ı yavaşlatabilir. Stitch'in arka uç host'u olduğunu belirt.
- **Privacy policy URL** gerekiyor — eklenti hiçbir veriyi toplamasa bile listing'de boş bırakılırsa retroactive update'ler red yiyebilir.
