# 01 · Prerequisites

> **Status:** ✅ done — eklenti zaten Store'da yayında, yeni versiyon için tekrar yapılması gerekmez.

**Duration:** İlk kez yapılıyorsa ~15 dk. Mevcut yayında olan eklenti için **atla**.
**Output:** Aktif Chrome Web Store Developer hesabı + 2FA + working unpacked install.

---

## Chrome Web Store Developer hesabı

> Bu eklenti zaten yayında olduğundan bu adımı atlayabilirsin. Aşağıdaki adımlar, sıfırdan kuran biri için referans.

1. https://chrome.google.com/webstore/devconsole adresine git
2. Aktif bir Google hesabıyla giriş yap
3. **One-time $5 registration fee** öde (kredi kartı + Google Pay)
4. Geliştirici adını seç ("nsozturk" zaten kayıtlı olmalı)

## 2-Step Verification

Chrome Web Store, hesabında 2FA aktif olmasını **zorunlu** tutuyor. Eğer kapalıysa:

1. https://myaccount.google.com/security → **2-Step Verification** → Turn on
2. Authenticator app (Google Authenticator / 1Password) ile setup et
3. Backup codes'ları güvenli bir yere kaydet

## Yerel test ortamı

Yeni versiyonu yüklemeden önce **mutlaka** locally test et:

```bash
cd /Users/ns0bj/Development/Fun/stitch-design/stitch-export

# Syntax check
node -c background.js && node -c content.js && node -c popup/popup.js

# Manifest validasyonu
cat manifest.json | python3 -m json.tool
```

Ardından Chrome'da:

1. `chrome://extensions/` aç
2. Sağ üstte **Developer mode** toggle'ını aç
3. **Load unpacked** → `/Users/ns0bj/Development/Fun/stitch-design/stitch-export` klasörünü seç
4. Eklenti yüklendi, console'u `Inspect views: service worker` ile aç
5. `[Stitch Export] Extension installed` log'u görünmeli

### Smoke test checklist

- [ ] Popup açılıyor (toolbar icon'a tık)
- [ ] Yeni `Export All Projects (NN)` label'ı görünüyor (cached count varsa)
- [ ] Stitch dashboard'da badge: `NN` (sayı)
- [ ] Stitch proje sayfasında badge: `EXP`
- [ ] Batch export çalışıyor, ~30 sn içinde ZIP iniyor
- [ ] İndirilen ZIP içinde `screens/`, `history/`, `chat.json` var
- [ ] Tek proje export'u (popup'tan **Export Conversation**) çalışıyor
- [ ] Context menu (sağ tık) → "Export Stitch Conversation" çalışıyor
- [ ] Service worker console'da hata yok

Eğer testlerden biri başarısız olursa **02'ye geçme**, önce burada düzelt.

---

## Sıradaki adım

✅ Hazırsa: [02 · Package Prep](../02-package-prep/index.html)

## Screenshots

`screenshots/` klasörü bu fazda boş — gerekirse Developer Dashboard giriş ekranını yakala.
