# 08 · Post-Launch

> **Status:** ⏳ todo (yayından sonra başlar)

**Duration:** ongoing
**Pre-req:** Faz 07 — yayın onaylandı ve canlıya çıktı
**Output:** Yayın doğrulandı, git tag atıldı, analytics izleniyor.

---

## 1. Yayın doğrulama

E-mail bildirimi geldikten sonra:

1. **Store sayfasını aç** (link e-mail içinde):
   ```
   https://chrome.google.com/webstore/detail/stitch-export/[item-id]
   ```
2. Şunları gözden geçir:
   - [ ] **Sürüm numarası**: `1.2.0` görünüyor mu
   - [ ] **Açıklama**: yeni description ve "What's new" görünüyor
   - [ ] **Screenshot'lar**: yeni 4-5 görsel doğru sırada
   - [ ] **Store icon**: yeni mor icon görünüyor
   - [ ] **Permissions listesi**: kullanıcının göreceği permission özetinde `tabs` var (önceki sürümde yoktu — Chrome otomatik permission upgrade uyarısı çıkarır)

## 2. Permission upgrade prompt

`tabs` permission'ı v1.2.0'da **yeni eklendi** (önceki yayında yoktu). Chrome bunu fark eder ve mevcut kullanıcılara şu davranışı uygular:

- **Otomatik update durdurulur** kullanıcı yeni permission'ı onaylayana kadar
- Kullanıcı eklenti popup'ını veya `chrome://extensions/` açtığında Chrome bir prompt gösterir:
  > "Stitch Export needs new permissions: Read your browsing history"
- Kullanıcı **Allow** der → v1.2.0'a güncelleme tamamlanır
- **Deny** der → v1.1.0'da kalır

Bu **normal Chrome davranışı**, bir şey yapamayız. Ama:
- Store description'da yeni permission'ın **neye yaradığını** açıklamak güncelleme oranını artırır
- Faz 04'teki description'da "Toolbar icon badge needs tabs permission to detect Stitch tabs" cümlesi tam buna hizmet eder

## 3. Yerel git tag

```bash
cd /Users/ns0bj/Development/Fun/stitch-design/stitch-export

# Tüm değişiklikleri commit'le (henüz commit'lemediysen)
git add -A
git commit -m "release: v1.2.0 — pure-API batch export + rich chat history"

# Tag at
git tag -a v1.2.0 -m "v1.2.0 — Chrome Web Store release

Highlights:
- Batch export 24× faster (pure API)
- Rich chat export with per-turn screens + suggestions
- New ZIP layout: screens/ + history/ + chat.json
- Toolbar badge
- Refreshed icons"

# Push (eğer remote varsa)
git push
git push --tags

# GitHub release oluşturmak için:
gh release create v1.2.0 \
  --title "v1.2.0 — Pure-API batch export" \
  --notes-file PUBLISH.md \
  /tmp/stitch-export-1.2.0.zip
```

## 4. Yayın arşivleme

İndirilen `stitch-export-1.2.0.zip`'i kaybetme:

```bash
mkdir -p releases
cp /tmp/stitch-export-1.2.0.zip releases/
git add releases/stitch-export-1.2.0.zip
git commit -m "archive: stitch-export-1.2.0.zip release package"
```

> İleride rollback istersen veya audit yaparsan, yayınlanmış tam ZIP'e ihtiyacın olacak.

## 5. Analytics izleme

Dashboard → **Analytics** sekmesi şunları gösterir:

| Metrik | Anlamı |
|---|---|
| **Active users** | Aktif kullanıcı sayısı (haftalık) |
| **Weekly installs** | Yeni install'lar |
| **Uninstalls** | Kaybedilen kullanıcılar |
| **Update rate** | v1.2.0'a güncel olan kullanıcı oranı |
| **Ratings** | 1-5 yıldız ortalaması + son review'lar |

İlk 7 gün:
- [ ] Update rate %50+'a ulaştı mı (yeni `tabs` permission accept oranı)
- [ ] Ret raporları (e-mail) — `chrome:webstore.permission_denied` gibi
- [ ] Negatif review var mı → varsa GitHub Issues'a taşı

## 6. Kullanıcı geri bildirimi takibi

| Kanal | Nasıl izlenir |
|---|---|
| **Store reviews** | Dashboard → Reviews sekmesi → yeni review e-mail bildirimi gelir |
| **GitHub Issues** | Repo'yu watch et |
| **E-mail (telepenu@gmail.com)** | Eski usul |

Yeni issue/review geldiğinde:
1. Hızlı yanıt ver (24 saat içinde — Chrome Web Store ratings algoritmasında ölü hesap penalty'si var)
2. Reproducible bug ise GitHub'da issue aç
3. Feature request ise milestone'a ekle

## 7. Sonraki sürüm planı

Bir sonraki minor (`1.3.0`) için potansiyel iş yükü:

- [ ] Screenshot URL download (şu an sadece referans, indirme yok)
- [ ] Markdown export (şu an sadece JSON)
- [ ] Selective project picker (tümü değil, seçilen N proje)
- [ ] Auto-export on schedule (haftalık backup)
- [ ] Custom server endpoint (kullanıcı kendi cloud'una sync edebilir)

Hangi feature'ın talep gördüğünü analytics + review'lar belirleyecek — speculative geliştirme yapma.

## 8. Hot patch süreci

Eğer v1.2.0 üretimde bug çıkarırsa:

1. Bug'ı GitHub Issues'da reproduce et
2. Yerel'de fix yaz, smoke test'i tekrar yap
3. Manifest version → `1.2.1`
4. **Tüm fazları kısaltılmış olarak tekrar yap** (02-03-07):
   - Yeni ZIP oluştur (faz 02)
   - Dashboard'a yükle (faz 03)
   - Submit (faz 07) — reviewer note'a "minor bug fix: <issue link>" yaz
5. Description ve screenshot'ları değiştirme — gereksiz delay yaratır

> Patch update'leri genelde **6-24 saatte** review geçer (büyük değişiklik yok).

---

## Yayın tamamlandı 🎉

Yapılan iş özeti:

- ✅ v1.1.0 → v1.2.0 yayında
- ✅ Pure-API batch export (24× hızlanma)
- ✅ Zengin chat export
- ✅ Toolbar badge
- ✅ Refreshed iconlar
- ✅ Privacy policy live
- ✅ Source code GitHub'da public
- ✅ Git tag + GitHub release

## Screenshots

- `screenshots/01-published-store-page.png` — yayında olan Store detay sayfası
- `screenshots/02-permission-upgrade-prompt.png` — kullanıcının gördüğü permission upgrade prompt
- `screenshots/03-analytics-week-1.png` — Analytics sekmesinden ilk hafta metrikleri
- `screenshots/04-github-release.png` — GitHub release sayfası
