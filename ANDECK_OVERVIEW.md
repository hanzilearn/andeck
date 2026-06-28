# Andeck — Tổng quan dự án v1

> Cập nhật: 26/06/2026 — v1 hoàn tất (Phase 0–7).  
> Production: **https://andeck.onrender.com**  
> Roadmap & phân công chat: [`ANDECK_ROADMAP.md`](./ANDECK_ROADMAP.md)

---

## Mô tả sản phẩm

**Andeck** — web học từ vựng đa ngôn ngữ, port lõi **My Project** từ Hanzi Learn sang kiến trúc generic:

- User tạo **deck** (bộ từ), chọn cặp ngôn ngữ (`zh-vi`, `en-vi`, `ja-vi`, `ko-vi`, `de-vi`)
- Import JSON từ AI (create/append), thêm/sửa/xóa từ thủ công
- Học deck: bảng từ (4 mode), quiz, flashcard, nhãn màu, sao, timer, TTS/mic
- Export JSON (format Andeck); import format legacy Hanzi My Project (`zh-vi`)
- Admin riêng: user, quota deck/từ, xem/xóa deck

**Không có:** HSK, grid cấp độ, `hskAccess`, sync API với Hanzi Learn (v1 chỉ JSON file).

Repo độc lập `D:\andeck` — auth + MongoDB tách hẳn Hanzi Learn (`E:\hanzi-learn`, **không sửa production Hanzi**).

---

## Tech stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Backend | Node.js + Express (`server/`, entry `server.js`) |
| Database | MongoDB Atlas — database **`andeck`** |
| Auth | JWT 30 ngày; token `localStorage` key `andeck_token` |
| Deploy | Render Web Service — subdomain `andeck` |
| Source | GitHub `hanzilearn/andeck`, branch `main` |

---

## Cấu trúc thư mục

```
D:\andeck\
├── public/
│   ├── index.html              App chính (hub deck + học + modals)
│   ├── admin.html              Admin (không tab HSK)
│   ├── stylecss/
│   │   ├── base.css, auth.css
│   │   ├── deck-hub.css, deck-editor.css, deck-import.css
│   │   ├── main-table.css, speech-sound.css
│   │   ├── label-system.css, exam-quiz.css, flashcard.css, timer.css
│   └── modules/
│       ├── 01-config-state.js  State, showOnly, getAuthToken
│       ├── 03-auth.js          Login/register, JWT Andeck
│       ├── 04-main-table.js    Bảng học generic
│       ├── 05-speech-sound.js  TTS/mic theo langPair
│       ├── 06-label-system.js
│       ├── 07-exam-quiz.js
│       ├── 08-flashcard.js
│       ├── 09-timer.js
│       └── deck-features/
│           ├── core.js         Hub, quota, CRUD deck, lang profiles API
│           ├── import.js       Import create/append + Hanzi legacy
│           ├── editor.js       Học deck, CRUD từ, export JSON
│           └── bootstrap.js
├── server/
│   ├── index.js                Listen, MongoDB, seed
│   ├── create-app.js           Express + middleware
│   ├── config.js               PORT, JWT_SECRET, MONGO_URI
│   ├── config/lang-profiles.js zh-vi, en-vi, ja-vi, ko-vi, de-vi
│   ├── middleware/             auth, rate-limit, request-logger
│   ├── models/                 user, deck, label, item, star
│   ├── services/               labels, deck-ids, word-validation
│   ├── db/seed.js              Admin + demo mặc định
│   └── routes/
│       ├── auth.routes.js
│       ├── admin.routes.js
│       ├── decks.routes.js
│       ├── labels.routes.js
│       └── stars.routes.js
├── scripts/
│   └── qa-phase7.mjs           QA tự động (12 kịch bản API)
├── server.js                   Entry: dotenv → server/index
├── .env.example
├── ANDECK_ROADMAP.md
└── ANDECK_OVERVIEW.md          File này
```

**Thứ tự script deck:** `core.js` → `import.js` → `editor.js` → `bootstrap.js`.

---

## Auth & tài khoản seed

JWT riêng Andeck — user Hanzi Learn **không** login được Andeck (và ngược lại).

| Email | Mật khẩu | Role | Ghi chú |
|-------|----------|------|---------|
| `admin1` | `Andinhlinh2@` | admin | Seed lần đầu kết nối MongoDB |
| `admin2` | `Andinhlinh2@` | admin | |
| `demo` | `demo123` | user | Quota mặc định 3 deck × 50 từ |

Đăng ký user mới: form register (`POST /api/register`) — email hợp lệ, MK ≥ 6 ký tự.

Token lưu `localStorage.andeck_token`. Mọi API (trừ login/register): `Authorization: Bearer <token>`.

---

## Backend API (tóm tắt)

### Auth — `auth.routes.js`

- `POST /api/register` — đăng ký
- `POST /api/login` — body `{ username, password }`
- `GET /api/me` — quota + profile
- `POST /api/change-password`

### Decks — `decks.routes.js`

- `GET /api/decks/lang-profiles` — cấu hình UI theo lang (dropdown tạo deck / import lấy danh sách từ đây, không hardcode frontend)
- `GET /api/decks` — list + `deckQuota`, `wordQuota`, `totalWords`
- `POST /api/decks` — tạo deck (chọn `langPair`)
- `POST /api/decks/import` — create deck + words (max 500/request)
- `GET /PUT /DELETE /api/decks/:id`
- `POST /api/decks/:id/words` · `PUT/DELETE .../words/:wordId`
- `POST /api/decks/:id/words/bulk` — append import
- `DELETE /api/decks/:id/words` — reset từ
- `GET /api/decks/:id/export` — JSON download (format Andeck)

### Labels / Stars

- `currentLevel = 'deck_<deckId>'` — pattern port từ Hanzi

### Admin — `admin.routes.js`

- `GET/POST /api/admin/users`
- `PUT /api/admin/users/:email/quota` — `{ deckQuota, wordQuota }`
- `PUT /api/admin/users/:email/reset-password`
- `DELETE /api/admin/users/:email`
- `GET /api/admin/users/:email/decks`
- `DELETE /api/admin/decks/:deckId`

### Health

- `GET /api/health` — `{ ok, app: "andeck", version }`

---

## Language profiles v1

| langPair | primary | reading | TTS | Speech |
|----------|---------|---------|-----|--------|
| `zh-vi` | Chữ Hán | Pinyin | `zh-CN` | `zh-CN` |
| `en-vi` | Từ tiếng Anh | Phiên âm (tuỳ chọn) | `en-US` | `en-US` |
| `ja-vi` | Từ tiếng Nhật | Furigana | `ja-JP` | `ja-JP` |
| `ko-vi` | Từ tiếng Hàn | Romanization | `ko-KR` | `ko-KR` |
| `de-vi` | Từ tiếng Đức | Phiên âm | `de-DE` | `de-DE` |

Bắt buộc mọi profile: `primary`, `meaning`.

**Import legacy Hanzi** (`zh-vi` only): field `hanzi`, `pinyin`, `ex_hanzi`, `ex_pinyin`, `ex_viet`, `tu_loai` → map sang schema Andeck (frontend `import.js` + backend `word-validation.js`).

---

## Quota mặc định

- `deckQuota`: **3** deck / user
- `wordQuota`: **50** từ / deck
- Import tối đa **500** phần tử / request; client slice + `overQuota` khi vượt

Admin có thể tăng quota qua `admin.html`; user refresh `/api/me` thấy giá trị mới.

---

## Dev local

**Yêu cầu:** Node.js 18+, MongoDB (Atlas hoặc local `mongodb://127.0.0.1:27017/andeck`).

```bash
cd D:\andeck
npm install
copy .env.example .env    # Windows — điền MONGO_URI, JWT_SECRET
npm start
```

- App: http://localhost:3000  
- Admin: http://localhost:3000/admin.html  

Biến môi trường — xem [`.env.example`](./.env.example):

| Biến | Mô tả |
|------|--------|
| `MONGO_URI` | Connection string, database name **`andeck`** |
| `JWT_SECRET` | Chuỗi bí mật JWT (khác Hanzi Learn) |
| `PORT` | Mặc định `3000` |

---

## Deploy Render (subdomain riêng)

1. **Web Service mới** trên Render — connect repo GitHub `hanzilearn/andeck`.
2. **Service name:** `andeck` → URL **https://andeck.onrender.com**
3. **Environment:**

   ```
   MONGO_URI=mongodb+srv://.../andeck
   JWT_SECRET=<chuỗi mới, khác Hanzi>
   PORT=3000
   NODE_ENV=production
   ```

   Static: `stylecss/` + `modules/` cache 7 ngày (prod); `index.html` không cache. Font UI (Inter) load sẵn; font học (Noto/Nanum…) lazy theo `langPair` khi mở deck.

4. **Build & start:** `npm install` (auto) · **Start command:** `npm start`
5. Push `main` → Render auto deploy.
6. Sau này: Custom Domain (vd. `andeck.vn`) — CNAME về Render.

Free tier: service sleep riêng — không ảnh hưởng `hanzilearn.onrender.com`.

---

## QA v1 — kết quả (26/06/2026)

Chạy script: `node scripts/qa-phase7.mjs` (mặc định target production).

| # | Kịch bản | Kết quả | Ghi chú |
|---|----------|---------|---------|
| 1 | Đăng ký/login Andeck | **PASS** | JWT riêng; TK Andeck không tồn tại trên Hanzi |
| 2 | Tạo deck `en-vi`, thêm 5 từ | **PASS** | API POST words × 5 |
| 3 | Hub upfile → import create | **PASS** | `POST /api/decks/import` |
| 4 | Header upfile append | **PASS** | `POST .../words/bulk`, cùng deck |
| 5 | 3/3 deck → hub create | **PASS** | HTTP 403 `QUOTA_EXCEEDED` |
| 6 | Deck 50/50 → append | **PASS** | HTTP 400 khi đầy từ |
| 7 | Import Hanzi legacy `zh-vi` | **PASS** | Map hanzi/pinyin/ex_* đúng |
| 8 | Export → import lại | **PASS** | Round-trip format Andeck |
| 9 | Quiz deck ≥4 từ | **PASS** | Deck ≥4 từ; UI chặn n&lt;4 |
| 10 | TTS 3 lang | **PASS** | Profiles: zh-CN, en-US, ja-JP |
| 11 | Admin đổi quota | **PASS** | PUT quota → `/api/me` cập nhật |
| 12 | Production andeck.onrender.com | **PASS** | Health OK, demo login + tạo deck |

**Tổng: 12/12 PASS**

---

## Backlog (sau v1)

- Thêm lang: `fr-vi`… (chỉ thêm block `lang-profiles.js`)
- Marketplace (`isPublic`, browse deck)
- CSV import
- Zalo CSKH modal (port từ Hanzi)
- Custom domain
- API sync Hanzi Learn (cần liên kết tài khoản)

---

## Giao diện

Theme **Đá xám · Stone** + dark/light (`data-theme`) — port từ Hanzi Learn.

Branding: **Andeck** (không drawer HSK).

---

## Ghi chú khi nhờ AI sửa

| Tính năng | File chính |
|-----------|------------|
| Hub deck, quota | `deck-features/core.js` |
| Import create/append, legacy | `deck-features/import.js` |
| Học deck, export JSON | `deck-features/editor.js` |
| Bảng học | `04-main-table.js` |
| TTS/mic | `05-speech-sound.js` |
| Quiz / flashcard / labels / timer | `07`–`09`, `06-label-system.js` |
| Admin UI | `admin.html` |
| API decks | `server/routes/decks.routes.js` |
| Lang config | `server/config/lang-profiles.js` |

**Không thêm HSK** vào repo Andeck v1.
