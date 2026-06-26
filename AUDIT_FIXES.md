# Andeck — Logic Audit (Chat K)

> So sánh Andeck `D:\andeck` vs Hanzi Learn `E:\hanzi-learn\public\modules\`  
> Ngày: 26/06/2026 — sau merge Chat I+J  
> Phạm vi: logic port, không feature mới, không HSK

---

## Tóm tắt

| Mức | Tìm thấy | Đã sửa |
|-----|----------|--------|
| P0 | 2 | 2 |
| P1 | 5 | 5 |
| P2 | 4 | 0 (ghi nhận) |
| OK / không bug | 12 cặp | — |

---

## Bảng audit

| Màn hình | Bug | Fix | File | P |
|----------|-----|-----|------|---|
| Học deck → Quiz/FC | Vào Quiz/Flashcard khi đang **edit/delete mode** — `emActive`/`dmActive` không thoát (Hanzi `showOnly` gọi `emExit`/`dmExit` khi rời `app-screen`) | `showOnly`: gọi `emExit`/`dmExit` khi `id !== 'app-screen'` hoặc không có `_currentDeckId` | `01-config-state.js` | P0 |
| Hub / Login | Nút header học (upfile, export, thêm/sửa/xóa) chỉ set `display` trong `loadDeckStudy`, không ẩn khi rời màn (logic Hanzi nằm trong `showOnly`) | `showOnly`: ẩn 5 nút khi không phải `app-screen && _currentDeckId` | `01-config-state.js` | P1 |
| Hub ← Bảng học | `backFromDeckStudy` không xóa `VOCAB`, `currentLevel`, `starred`, `adDeckWords` — state cũ leak sang hub / deck khác | Thêm `adResetStudySession()`; `backFromDeckStudy` gọi reset đầy đủ | `01-config-state.js`, `editor.js` | P0 |
| Logout / đổi user | `adResetSessionState` chỉ reset `AD.decks`, không reset state học (`VOCAB`, `currentLevel`, …) — Hanzi `logout` xóa trực tiếp | `adResetSessionState` gọi `adResetStudySession()` | `deck-features/core.js` | P1 |
| Xóa deck đang học | `confirmAdDelete` về hub nhưng `currentLevel`/`VOCAB` vẫn giữ `deck_<id>` đã xóa | Gọi `adResetStudySession()` trước `showOnly('deck-hub-screen')` | `deck-features/core.js` | P1 |
| Chuyển deck | Nút ⭐ filter (`hide-starred-btn`) giữ class `on-red`/`on-red-slash` của deck trước — Hanzi `loadProjectData` reset UI filter | `adSyncFilterButtonUi()` sau set `currentLevel`; gọi trong `loadDeckStudy` | `deck-features/editor.js`, `04-main-table.js` | P1 |
| Chuyển deck | `loadDeckStudy` không reset `starFilter` / trạng thái ⭐ khi mở deck mới | Bổ sung reset trong `adResetStudyUiState` | `04-main-table.js` | P1 |
| Flashcard | Deck 0 từ vẫn mở setup FC (crash UI rỗng) | Guard `n < 1` + toast trước `_openFlashcardSetup()` | `08-flashcard.js` | P2→fixed |
| Timer | Timer chỉ trên hub — đúng thiết kế Andeck (Hanzi còn `tmr-icon-btn-app` cho HSK) | Không đổi — `showOnly` giữ timer hub-only | `01-config-state.js` | OK |
| Quiz | Min 4 từ — wrapper `adShowExamSetup` đã có | Không đổi | `07-exam-quiz.js` | OK |
| Labels/Stars | `currentLevel = 'deck_<deckId>'`, API `/api/level-data?level=` | Khớp Hanzi `project_<id>` | `editor.js`, `06-label-system.js` | OK |
| Import append | Quota slice `min(deckRem, globalRem)`, confirm overage | Khớp Hanzi + thêm cap per-deck Andeck | `deck-features/import.js` | OK |
| Import create | Cap `min(globalRem, wordQuota)` per deck | Đúng schema Andeck 3×50 | `deck-features/import.js` | OK |
| Export → import | Unwrap `format: andeck`, round-trip QA 12/12 | Không bug | `import.js`, API | OK |
| Field generic | Bảng/FC/Quiz dùng `primary`/`reading`; CSS class `td-hanzi` chỉ tên class | Không leak field Hanzi vào payload | `04-main-table.js`, `08-flashcard.js` | OK |
| Auth | Token `andeck_token`, reset session qua `adResetSessionState` | Bổ sung reset study state | `03-auth.js`, `core.js` | P1 |
| TTS | `langPair` → profile TTS zh/en/ja | Khớp Hanzi pattern | `05-speech-sound.js` | OK |
| Hub CRUD | Deck quota, reset reload `loadDeckStudy` nếu đang học | Đã có | `deck-features/core.js` | OK |
| VOCAB sync | CRUD/import gọi `loadDeckStudy` + `loadAdDecks` | Đã có | `editor.js`, `import.js` | OK |
| `showOnly` hub | Clear `_currentDeckId` + `adClearLayoutProfile` | Bổ sung `adClearLayoutProfile` khi về hub/login | `01-config-state.js` | P1 |

---

## P2 — ghi nhận, chưa sửa (chấp nhận v1)

| Màn hình | Ghi chú |
|----------|---------|
| CSS class names | `td-hanzi`, `fc-hanzi`, `quiz-q-hanzi` — chỉ CSS, data dùng `primary`/`reading` |
| Flashcard min 4 | Hanzi gốc không chặn FC <4; chỉ Quiz cần ≥4 (multiple choice). Andeck giữ parity |
| `02-lang-profiles.js` | File Andeck riêng, không có cặp Hanzi — OK |
| Admin / server | Ngoài phạm vi cặp module frontend — QA API 12/12 pass |

---

## Diff đã apply (Chat K)

1. **`01-config-state.js`** — `adResetStudySession()`, `showOnly()` port logic header + em/dm exit, `backFromDeckStudy()` reset đầy đủ  
2. **`deck-features/core.js`** — `adResetSessionState`, `confirmAdDelete` reset study  
3. **`deck-features/editor.js`** — `adClearDeckWords`, `adSyncFilterButtonUi`, sync filter khi load deck  
4. **`04-main-table.js`** — `adResetStudyUiState` reset `starFilter` + nút ⭐  
5. **`08-flashcard.js`** — guard deck rỗng  

---

## Manual test checklist

### Roadmap mục 10 (12 kịch bản)

| # | Kịch bản | Cách test | Kỳ vọng |
|---|----------|-----------|---------|
| 1 | Login Andeck | Register/login `demo` / TK mới | Token `andeck_token`; không login Hanzi |
| 2 | Deck `en-vi` + 5 từ | Tạo deck en-vi, thêm 5 từ thủ công | Hub count 5; bảng hiện 5 dòng |
| 3 | Hub upfile create | Hub → upfile → JSON hợp lệ `[{primary,meaning,...}]` | Deck mới + từ; vào học OK |
| 4 | Header upfile append | Đang học deck → header upfile → append JSON | Từ vào **cùng** deck, không tạo deck mới |
| 5 | Quota 3 deck | Tạo/import đủ 3 deck → hub upfile create | Modal giới hạn deck |
| 6 | Quota 50 từ/deck | Deck 50/50 → append hoặc thêm thủ công | Chặn quota từ |
| 7 | Hanzi legacy zh-vi | Deck zh-vi → import `[{hanzi,pinyin,meaning}]` | Map sang primary/reading |
| 8 | Export round-trip | Tải JSON → import create deck mới | Round-trip field đúng |
| 9 | Quiz ≥4 từ | Deck 3 từ → Kiểm tra; deck 4+ → quiz | Toast chặn n&lt;4; quiz chạy n≥4 |
| 10 | TTS 3 lang | Deck zh/en/ja → 🔊 1 từ mỗi deck | Giọng zh-CN / en-US / ja-JP |
| 11 | Admin quota | Admin đổi quota → user F5 / re-login | Hub pill cập nhật |
| 12 | Production | `andeck.onrender.com` login + tạo deck | Health + flow cơ bản |

### Bổ sung Chat K — timer / header / auth / state

| # | Flow | Kỳ vọng |
|---|------|---------|
| T1 | Hub: icon timer hiện; vào học deck: timer **ẩn** | Chỉ `#tmr-icon-btn-select` trên hub |
| T2 | Học deck: header hiện upfile, Tải JSON, Thêm/Sửa/Xóa | 5 nút visible |
| T3 | Học → Quiz setup: không còn mode sửa/xóa active | Bảng không ở edit/delete mode khi quay lại |
| T4 | Học → bật Sửa → Quiz → Thoát quiz → bảng | Không kẹt edit mode |
| T5 | Học deck A (filter nhãn đỏ) → Back hub → học deck B | Nút ⭐ filter khớp state deck B |
| T6 | Back hub từ bảng học | Hub grid refresh; không flash VOCAB deck cũ |
| T7 | Xóa deck đang học (gear hub hoặc admin) | Về hub sạch; không lỗi label API |
| T8 | Logout khi đang học → login lại | Hub sạch; không ghost state |
| T9 | Reset deck (gear) khi đang mở bảng | Bảng reload 0 từ |
| T10 | FC deck 0 từ (edge) | Toast, không mở setup |
| T11 | FC filter nhãn + pool starred | Pool đúng theo `fcFilterIds` / starred |
| T12 | Exam filter nhãn + skip starred | Pool đúng; min 4 từ ở entry |

**Chạy QA API tự động:** `node scripts/qa-phase7.mjs` (12/12 đã pass 26/06).

---

## Map file đã so sánh

| Andeck | Hanzi | Kết luận |
|--------|-------|----------|
| `01-config-state.js` | `01-config-state.js` | **Fixed** — thiếu showOnly header/em/dm |
| `deck-features/core.js` | `myproject-features/core.js` | **Fixed** — session reset |
| `deck-features/editor.js` | `myproject-features/editor.js` | **Fixed** — filter UI sync |
| `deck-features/import.js` | `myproject-features/import.js` | OK |
| `04-main-table.js` | `05-main-table.js` | **Fixed** — study UI reset |
| `05-speech-sound.js` | `06-speech-sound.js` | OK |
| `06-label-system.js` | `07-label-system.js` | OK |
| `07-exam-quiz.js` | `08-exam-quiz.js` | OK (min 4 quiz) |
| `08-flashcard.js` | `09-flashcard.js` | **Fixed** — guard empty |
| `09-timer.js` | `10-timer.js` | OK (identical logic) |
| `03-auth.js` | `03-auth.js` | OK (+ reset via core) |
