# Andeck — Roadmap & Phân công chat

> Cập nhật: 25/06/2026  
> Repo: `D:\andeck` (dự án độc lập, tách khỏi Hanzi Learn)  
> Tham chiếu code gốc: `E:\hanzi-learn` (My Project + module học — **chỉ port, không sửa production**)

---

## 1. Tóm tắt sản phẩm

**Andeck** — web học từ vựng đa ngôn ngữ, lấy **My Project** của Hanzi Learn làm lõi:

- User tạo **deck** (bộ từ), import JSON từ AI, thêm/sửa/xóa từ
- Học deck: bảng từ, quiz, flashcard, nhãn màu, sao, timer
- **Không có HSK**, không grid cấp độ, không `hskAccess`
- Admin riêng: user, quota, xem/xóa deck

Deploy: **subdomain riêng** (vd. `https://andeck.onrender.com` hoặc custom domain sau).

---

## 2. Quyết định đã chốt

| # | Hạng mục | Quyết định |
|---|----------|------------|
| 1 | Tên app | **Andeck** |
| 2 | Deploy | **Subdomain riêng** — service Render riêng, không nằm dưới `hanzilearn.onrender.com` |
| 3 | Auth | **Tài khoản riêng** — User/JWT/MongoDB tách hẳn Hanzi Learn |
| 4 | Ngôn ngữ v1 | **`zh-vi`, `en-vi`, `ja-vi`** (3 cặp — đủ validate kiến trúc generic; thêm lang sau chỉ cần config) |
| 5 | Admin | **Trang admin mới** `public/admin.html` trong repo Andeck |
| 6 | Quota mặc định | **Giống Hanzi My Project:** `deckQuota: 3`, `wordQuota: 50` / deck |
| 7 | Liên kết Hanzi Learn | **v1: không sync API** — chỉ **Export/Import JSON** (file); import hỗ trợ format Andeck + format legacy Hanzi MP (`zh-vi`); sync trực tiếp để backlog |

### Giải thích tối ưu (#4 và #7)

**Ngôn ngữ v1 — tại sao 3 cặp?**

- `zh-vi`: port gần 1:1 từ My Project → ship nhanh, ít bug
- `en-vi`: không bắt buộc cột reading → kiểm tra UI ẩn field optional
- `ja-vi`: reading (furigana) quan trọng → kiểm tra form + import động

Thêm `ko-vi`, `fr-vi`… = **backlog** (chỉ thêm block trong `lang-profiles.js`, không đổi kiến trúc).

**Hanzi Learn — tại sao không sync API v1?**

Auth tách riêng → user Andeck ≠ user Hanzi Learn → gọi API Hanzi cần liên kết tài khoản (phức tạp, không cần lúc launch).

v1 thay bằng:

- **Export JSON** mọi deck (backup, chia sẻ)
- **Import JSON** format Andeck (chuẩn)
- **Import JSON format Hanzi My Project** (chỉ khi `langPair = zh-vi`) — user copy file từ Hanzi, paste vào Andeck, không cần 2 app cùng login

Backlog sau: marketplace, “mở bằng link” nếu cần.

---

## 3. Kiến trúc

```
┌─────────────────────────┐       ┌─────────────────────────┐
│   Hanzi Learn           │       │   Andeck                │
│   hanzilearn.onrender   │       │   andeck.onrender.com   │
│   E:\hanzi-learn        │       │   D:\andeck             │
│   (production, không    │       │   (repo + DB riêng)     │
│    đụng khi build Andeck)│       │                         │
└─────────────────────────┘       └─────────────────────────┘
         │                                    │
         │         Không shared auth          │
         └──────── JSON import (zh-vi) ───────┘  (file-based, v1)
```

### Tech stack (giữ giống Hanzi Learn)

| Layer | Công nghệ |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Backend | Node.js + Express (`server/`) |
| Database | **MongoDB Atlas — database riêng** `andeck` (không dùng chung DB Hanzi) |
| Auth | JWT 30 ngày, collection `users` riêng |
| Deploy | Render Web Service riêng, subdomain `andeck` |

### Cấu trúc thư mục mục tiêu

```
D:\andeck\
├── public/
│   ├── index.html              App chính (hub deck + học + modals)
│   ├── admin.html              Admin riêng
│   ├── stylecss/
│   │   ├── base.css            Theme Stone (port từ Hanzi)
│   │   ├── auth.css
│   │   ├── main-table.css      Bảng học + header actions
│   │   ├── deck-hub.css        Grid deck (port my-project.css)
│   │   ├── speech-sound.css
│   │   ├── label-system.css
│   │   ├── exam-quiz.css
│   │   ├── flashcard.css
│   │   └── timer.css
│   └── modules/
│       ├── 01-config-state.js  State, showOnly, theme (bỏ HSK screens)
│       ├── 02-lang-profiles.js Cache profile từ API
│       ├── 03-auth.js          Login riêng Andeck
│       ├── 04-main-table.js    Bảng học generic (port 05-main-table.js)
│       ├── 05-speech-sound.js  TTS/mic theo langPair
│       ├── 06-label-system.js
│       ├── 07-exam-quiz.js
│       ├── 08-flashcard.js
│       ├── 09-timer.js
│       └── deck-features/
│           ├── core.js         Hub, quota, CRUD deck
│           ├── import.js       Import create/append + Hanzi legacy
│           ├── editor.js       Học deck, thêm/sửa/xóa từ
│           └── bootstrap.js
├── server/
│   ├── index.js
│   ├── create-app.js
│   ├── config.js
│   ├── config/lang-profiles.js
│   ├── middleware/auth.js, rate-limit.js, request-logger.js
│   ├── models/user.js, deck.js, label.js, item.js, star.js
│   ├── services/labels.js, deck-ids.js
│   ├── db/seed.js              Admin mặc định
│   └── routes/
│       ├── auth.routes.js
│       ├── admin.routes.js
│       ├── decks.routes.js
│       ├── labels.routes.js
│       └── stars.routes.js
├── server.js
├── package.json
├── .env.example
├── ANDECK_ROADMAP.md           File này
└── ANDECK_OVERVIEW.md          Tổng quan sau khi v1 xong (Chat cuối tạo)
```

**Không có:** `private/hsk*`, `vocab.routes.js`, `hsk-cache.js`, `04-hsk-grid.js`, drawer HSK.

---

## 4. Schema

### User

```javascript
{
  email: String,          // unique
  passwordHash: String,
  role: 'user' | 'admin',
  type: 'user' | 'ctv' | 'admin',
  deckQuota: Number,      // default 3
  wordQuota: Number,      // default 50 (per deck)
  zalo: String,
  createdAt: Date
}
```

### Deck (thay Project)

```javascript
{
  email: String,
  deckId: String,         // UUID, unique
  name: String,
  description: String,
  langPair: String,       // 'zh-vi' | 'en-vi' | 'ja-vi' | ...
  words: [{
    id: String,
    primary: String,      // bắt buộc — hanzi / word / 単語
    reading: String,      // pinyin / IPA / furigana
    meaning: String,      // bắt buộc
    exPrimary: String,
    exReading: String,
    exMeaning: String,
    pos: String,
    note: String,
    extra: Mixed
  }],
  isPublic: Boolean,      // default false — marketplace backlog
  createdAt, updatedAt
}
```

### Mapping legacy Hanzi My Project → Andeck (`zh-vi` import)

| Hanzi `Project.words` | Andeck `words` |
|-----------------------|----------------|
| `hanzi` | `primary` |
| `pinyin` | `reading` |
| `meaning` | `meaning` |
| `ex_hanzi` | `exPrimary` |
| `ex_pinyin` | `exReading` |
| `ex_viet` | `exMeaning` |
| `tu_loai` | `pos` |
| `note` | `note` |

---

## 5. Language profiles v1

File: `server/config/lang-profiles.js`

| langPair | primaryLabel | readingLabel | TTS | Speech recog | Quiz mode “từ gốc” |
|----------|--------------|--------------|-----|--------------|-------------------|
| `zh-vi` | Chữ Hán | Pinyin | `zh-CN` | `zh-CN` | Có |
| `en-vi` | Từ tiếng Anh | Phiên âm (tuỳ chọn) | `en-US` | `en-US` | Có |
| `ja-vi` | Từ tiếng Nhật | Furigana / Romaji | `ja-JP` | `ja-JP` | Có |

API: `GET /api/decks/lang-profiles` → frontend render form, cột bảng, import prompt.

**Required mọi profile:** `primary`, `meaning`.

---

## 6. Tính năng v1 (checklist hoàn thành)

### Hub deck (port My Project hub)

- [x] Grid deck, pill quota `{totalWords}/{deckQuota×wordQuota} từ`
- [x] Tạo deck (chọn `langPair` + tên)
- [x] Đổi tên / reset từ / xóa deck
- [ ] Nút **upfile** hub → import mode **create**
- [ ] “Bắt đầu học” → màn bảng từ

### Học deck

- [ ] Bảng: 4 mode (Tất cả, KT từ gốc, KT nghĩa, KT phát âm*)
- [ ] Tìm kiếm, shuffle, ẩn reading (nếu profile có reading)
- [ ] TTS + mic theo `langPair`
- [ ] Nhãn màu (max 8), sao, quiz (≥4 từ), flashcard, timer (≥768px)
- [ ] Header: upfile append → Thêm từ → Sửa → Xóa

### Import

- [ ] Modal import AI JSON — mode create / append
- [ ] Prompt động theo `langPair`
- [ ] Parse + validate + quota slice (max 500/request)
- [ ] Import file JSON format **Hanzi legacy** (`zh-vi` only)

### Export

- [ ] Tải JSON deck (format Andeck chuẩn)

### Auth & Admin

- [x] Login / đổi MK / JWT
- [ ] `admin.html`: danh sách user, quota deck/từ, xem/xóa deck user, seed admin

### Deploy

- [ ] Render service `andeck`, env riêng, MongoDB database `andeck`
- [ ] QA checklist (mục 10)

\*Mode phát âm: ẩn nếu trình duyệt/lang không hỗ trợ (hiếm với zh/en/ja).

---

## 7. Backend API (tóm tắt)

### Auth — `auth.routes.js`

- `POST /api/login`
- `GET /api/me`
- `POST /api/change-password`

### Decks — `decks.routes.js`

- `GET /api/decks/lang-profiles`
- `GET /api/decks` — list + `deckQuota`, `wordQuota`, `totalWords`
- `POST /api/decks`
- `POST /api/decks/import` — create deck + words
- `GET /PUT /DELETE /api/decks/:id`
- `POST /api/decks/:id/words`
- `POST /api/decks/:id/words/bulk` — max 500
- `PUT /api/decks/:id/words/:wordId`
- `DELETE /api/decks/:id/words/:wordId`
- `DELETE /api/decks/:id/words` — reset
- `GET /api/decks/:id/export` — JSON download

### Labels / Stars — port pattern Hanzi

- `currentLevel = 'deck_<deckId>'`

### Admin — `admin.routes.js`

- CRUD user (không HSK)
- `PUT /api/admin/users/:email/quota` — `{ deckQuota, wordQuota }`
- List / delete deck của user

Tất cả (trừ login): `Authorization: Bearer <token>`.

---

## 8. Roadmap theo phase

| Phase | Mục tiêu | Chat | Trạng thái |
|-------|----------|------|------------|
| **0** | Scaffold repo, package, env, lang-profiles, model draft | A | ✅ |
| **1** | Backend: auth + decks API + quota | B | ✅ |
| **2** | Frontend: auth + hub deck | C | ✅ |
| **3** | Editor từ + import AI (create/append) | D | ⬜ |
| **4** | Bảng học + TTS/mic generic | E | ⬜ |
| **5** | Quiz, flashcard, labels, stars, timer | F | ⬜ |
| **6** | Admin + export JSON + Hanzi legacy import | G | ⬜ |
| **7** | Deploy Render + QA + ANDECK_OVERVIEW.md | H | ⬜ |

**Backlog (mỗi hạng mục = 1 chat riêng):**

- Thêm lang: `ko-vi`, `fr-vi`, `de-vi`…
- Marketplace (`isPublic`, browse)
- CSV import
- Zalo CSKH modal (port từ Hanzi)
- Custom domain
- API sync Hanzi Learn (chỉ khi có nhu cầu + liên kết tài khoản)

---

## 9. Phân công từng chat

Mỗi chat: copy **Prompt mở chat** vào session mới. Đính kèm `@ANDECK_ROADMAP.md`.  
Code tham chiếu Hanzi: `E:\hanzi-learn` (đọc, port — **không commit vào repo Hanzi**).

---

### Chat A — Phase 0: Scaffold

**Deliverables:**

- [x] `package.json`, `server.js`, `.env.example`
- [x] `server/` skeleton: `index.js`, `create-app.js`, `config.js`
- [x] `server/config/lang-profiles.js` — zh/en/ja
- [x] `server/models/deck.js`, `user.js` (draft)
- [x] `public/index.html` shell + `admin.html` placeholder
- [x] `db/seed.js` — admin mặc định
- [x] Cập nhật Phase 0 → ✅ trong file này

**Prompt:**

```
Đọc D:\andeck\ANDECK_ROADMAP.md — làm Chat A (Phase 0).
Scaffold repo Andeck tại D:\andeck: package.json, server skeleton, lang-profiles, models draft, HTML shell.
Tham khảo cấu trúc E:\hanzi-learn nhưng không copy HSK. Chưa làm API CRUD đầy đủ.
Cập nhật checklist Phase 0 trong roadmap khi xong.
```

**Phụ thuộc:** Không  
**Block:** Chat B

---

### Chat B — Phase 1: Backend API

**Deliverables:**

- [x] `decks.routes.js` — full API mục 7
- [x] `auth.routes.js`, `middleware/auth.js`, `rate-limit.js`
- [x] `admin.routes.js` (skeleton — chi tiết admin UI ở Chat G)
- [x] `labels.routes.js`, `stars.routes.js` (port từ Hanzi, đổi `project_` → `deck_`)
- [x] Validate word theo lang profile
- [x] Test curl/Postman

**Prompt:**

```
Đọc D:\andeck\ANDECK_ROADMAP.md — làm Chat B (Phase 1).
Implement backend Andeck: auth, decks CRUD + import/bulk, quota (deckQuota 3, wordQuota 50).
Tham khảo E:\hanzi-learn\server\routes\projects.routes.js — đổi schema generic.
Cập nhật Phase 1 trong roadmap.
```

**Phụ thuộc:** Chat A  
**Block:** Chat C, D

---

### Chat C — Phase 2: Frontend hub

**Deliverables:**

- [x] `03-auth.js`, `deck-features/core.js`, `bootstrap.js`
- [x] `deck-hub.css` — UI giống My Project hub Hanzi (theme Stone)
- [x] Grid deck, create/rename/delete/reset, quota pills
- [x] Chọn `langPair` khi tạo deck
- [x] Flow: login → hub → click “Bắt đầu học” (shell tới Chat D)

**Prompt:**

```
Đọc D:\andeck\ANDECK_ROADMAP.md — làm Chat C (Phase 2).
Frontend hub Andeck: auth, list deck, CRUD, chọn langPair. API đã có từ Chat B.
Port UI từ E:\hanzi-learn\public\modules\myproject-features\core.js + my-project.css.
Branding: Andeck. Cập nhật Phase 2.
```

**Phụ thuộc:** Chat B  
**Block:** Chat D

---

### Chat D — Phase 3: Editor + Import

**Deliverables:**

- [ ] `deck-features/editor.js` — load deck, bảng shell, thêm/sửa/xóa từ
- [ ] `deck-features/import.js` — modal create/append, prompt theo lang
- [ ] Modal `#addWordOverlay`, `#importWordOverlay` trong index.html
- [ ] Form field động theo lang profile
- [ ] Port logic quota/import từ Hanzi `import.js`

**Prompt:**

```
Đọc D:\andeck\ANDECK_ROADMAP.md — làm Chat D (Phase 3).
Word editor + import AI JSON (create/append) cho Andeck.
Tham khảo E:\hanzi-learn\public\modules\myproject-features\editor.js và import.js.
Field generic primary/reading/meaning. Cập nhật Phase 3.
```

**Phụ thuộc:** Chat C  
**Block:** Chat E

---

### Chat E — Phase 4: Bảng học + TTS

**Deliverables:**

- [ ] `04-main-table.js` — port `05-main-table.js`, field generic
- [ ] `05-speech-sound.js` — TTS/mic map từ lang profile
- [ ] 4 chế độ học, search, shuffle, ẩn reading
- [ ] `main-table.css`, `speech-sound.css`

**Prompt:**

```
Đọc D:\andeck\ANDECK_ROADMAP.md — làm Chat E (Phase 4).
Bảng học Andeck: 4 mode, generic columns, TTS/mic theo langPair.
Port E:\hanzi-learn\public\modules\05-main-table.js và 06-speech-sound.js.
Cập nhật Phase 4.
```

**Phụ thuộc:** Chat D  
**Block:** Chat F

---

### Chat F — Phase 5: Quiz, flashcard, labels, timer

**Deliverables:**

- [ ] Port `06-label-system.js`, `07-exam-quiz.js`, `08-flashcard.js`, `09-timer.js`
- [ ] `currentLevel = 'deck_<deckId>'`
- [ ] CSS tương ứng

**Prompt:**

```
Đọc D:\andeck\ANDECK_ROADMAP.md — làm Chat F (Phase 5).
Port quiz, flashcard, labels, stars, timer từ E:\hanzi-learn\public\modules\.
Dùng field generic primary/reading/meaning. Cập nhật Phase 5.
```

**Phụ thuộc:** Chat E  
**Block:** Chat G

---

### Chat G — Phase 6: Admin + Export + Hanzi legacy import

**Deliverables:**

- [ ] `public/admin.html` + JS inline hoặc module — **không tab HSK**
- [ ] Quota user, xem/xóa deck
- [ ] `GET /api/decks/:id/export` + nút UI “Tải JSON”
- [ ] Parser import nhận JSON array Hanzi `{ hanzi, pinyin, meaning... }` khi deck `zh-vi`

**Prompt:**

```
Đọc D:\andeck\ANDECK_ROADMAP.md — làm Chat G (Phase 6).
Admin Andeck mới (không HSK), export JSON, import legacy Hanzi My Project format cho zh-vi.
Tham khảo E:\hanzi-learn\public\admin.html — bỏ phần HSK. Cập nhật Phase 6.
```

**Phụ thuộc:** Chat F  
**Block:** Chat H

---

### Chat H — Phase 7: Deploy + QA + Overview

**Deliverables:**

- [ ] Hướng dẫn deploy Render (subdomain `andeck`)
- [ ] `.env.example` đầy đủ: `MONGO_URI`, `JWT_SECRET`, `PORT`
- [ ] Chạy QA mục 10
- [ ] Tạo `ANDECK_OVERVIEW.md` (giống vai trò `HANZI_LEARN_OVERVIEW.md`)
- [ ] Cập nhật Phase 7 → ✅

**Prompt:**

```
Đọc D:\andeck\ANDECK_ROADMAP.md — làm Chat H (Phase 7).
Deploy checklist Render subdomain andeck, QA đầy đủ, viết ANDECK_OVERVIEW.md.
Cập nhật roadmap hoàn tất v1.
```

**Phụ thuộc:** Chat G  
**Block:** Không (v1 xong)

---

## 10. QA checklist

| # | Kịch bản | Kỳ vọng |
|---|----------|---------|
| 1 | Đăng ký/login Andeck | Token riêng, không login được Hanzi Learn |
| 2 | Tạo deck `en-vi`, thêm 5 từ thủ công | Lưu OK, hub cập nhật count |
| 3 | Hub upfile → JSON hợp lệ | Tạo deck mới + từ |
| 4 | Đang học deck → header upfile append | Từ vào cùng deck, không tạo deck mới |
| 5 | 3/3 deck → hub upfile create | Chặn quota deck |
| 6 | Deck 50/50 từ → append | Chặn quota từ |
| 7 | Import JSON Hanzi legacy vào deck `zh-vi` | Map field đúng |
| 8 | Export JSON → import lại | Round-trip OK |
| 9 | Quiz deck ≥4 từ | Chạy được |
| 10 | TTS `zh-vi` / `en-vi` / `ja-vi` | Phát âm đúng lang |
| 11 | Admin đổi quota user | User refresh thấy quota mới |
| 12 | Production `andeck.onrender.com` | Login + tạo deck OK |

---

## 11. Deploy Render (subdomain riêng)

1. Tạo **Web Service mới** trên Render, connect repo GitHub `andeck` (push `D:\andeck` lên repo riêng).
2. **Environment:**
   - `MONGO_URI=mongodb+srv://.../`**andeck** (database name riêng)
   - `JWT_SECRET=` chuỗi mới, **khác** Hanzi Learn
   - `PORT=3000`
3. **Service name:** `andeck` → URL mặc định `https://andeck.onrender.com`
4. Sau này: Custom Domain (vd. `andeck.vn`) trỏ CNAME về Render.

**Lưu ý:** Free tier = 1 service sleep riêng — không ảnh hưởng Hanzi Learn.

---

## 12. File Hanzi Learn cần port (map nhanh)

| Andeck | Hanzi Learn (tham chiếu) |
|--------|--------------------------|
| `deck-features/core.js` | `myproject-features/core.js` |
| `deck-features/import.js` | `myproject-features/import.js` |
| `deck-features/editor.js` | `myproject-features/editor.js` |
| `04-main-table.js` | `05-main-table.js` |
| `05-speech-sound.js` | `06-speech-sound.js` |
| `06-label-system.js` | `07-label-system.js` |
| `07-exam-quiz.js` | `08-exam-quiz.js` |
| `08-flashcard.js` | `09-flashcard.js` |
| `09-timer.js` | `10-timer.js` |
| `decks.routes.js` | `projects.routes.js` |
| `deck-hub.css` | `my-project.css` |

**Đổi tên concept:** `Project` → `Deck`, `projectId` → `deckId`, `MP` → `AD` (hoặc `DECK`), `hanzi/pinyin` → `primary/reading`.

---

## 13. Thứ tự chat

```
A → B → C → D → E → F → G → H
```

**Bắt đầu:** Chat A — scaffold `D:\andeck`.

---

## Changelog

| Ngày | Thay đổi |
|------|----------|
| 2025-06-25 | Tạo roadmap Andeck — repo riêng, auth riêng, subdomain, admin mới, quota 3×50, lang v1 zh/en/ja, JSON import/export (no API sync v1) |
| 2026-06-25 | Phase 0 (Chat A): scaffold repo — package, server skeleton, lang-profiles, models draft, HTML shell, seed admin |
| 2026-06-25 | Phase 1 (Chat B): backend auth, decks CRUD/import/bulk/export, quota, labels/stars, admin skeleton |
| 2026-06-25 | Phase 2 (Chat C): frontend auth + hub deck — login/register, CRUD deck, langPair, quota pills, study shell |
