# Andeck — Roadmap tính năng Mua gói dung lượng (Thanh toán tự động)

> Cập nhật: 29/06/2026  
> Trạng thái: **Mức 2 — chốt gói + lộ trình 3 phase** (Zalo Pay + duyệt tay, không PayOS)  
> Liên quan: [`ANDECK_ROADMAP.md`](./ANDECK_ROADMAP.md) (v1 đã xong) · [`ANDECK_OVERVIEW.md`](./ANDECK_OVERVIEW.md)  
> Production hiện tại: **https://andeck.onrender.com**

---

## 0. Tóm tắt tính năng

**Mục tiêu:** Khách chọn gói trên web → chuyển tiền → gửi bill qua Zalo → admin duyệt → **cộng `deckQuota` + `totalWordQuota`** (pool từ linh hoạt, không chia đều theo deck).

**Định vị pháp lý (bắt buộc giữ xuyên suốt):**

| Đúng | Tránh |
|------|-------|
| Phần mềm học từ vựng trực tuyến | Game, nạp coin, vật phẩm ảo |
| Gói dung lượng / gia hạn dịch vụ | Điểm thưởng, gem, skin |
| Mua dịch vụ phần mềm (SaaS giáo dục) | Buôn bán trên MXH, chốt đơn Zalo cá nhân |

**Không thuộc phạm vi Nghị định 174/2026** (cấm mua bán vật phẩm **trong trò chơi điện tử**) — vì Andeck không phải game. Vẫn phải tuân thủ thương mại điện tử, thuế, bảo vệ dữ liệu cá nhân, bảo vệ người tiêu dùng.

**Luồng hiện tại (v1):** Hết quota → modal → liên hệ Zalo → admin `PUT /api/admin/users/:email/quota`.

**Luồng mục tiêu (Mức 2 — đã chốt):**

```
Chọn gói trên web → Tạo mã đơn AD-xxxxx
→ Chuyển tiền (Zalo Pay / ngân hàng)
→ Chụp bill + màn hình lịch sử giao dịch Andeck
→ Gửi Zalo kèm mã đơn + email tài khoản
→ Admin duyệt → cộng quota
```

**Lưu ý Zalo Pay:** Không có ô “nội dung chuyển khoản” — **mã đơn gửi qua tin nhắn Zalo**, không ghi vào bill chuyển tiền.

---

## 0.1 Mức 2 — Quy trình chi tiết (Zalo Pay + xác minh bill)

### Tại sao Zalo Pay không tìm được mã chuyển tiền?

| Kênh | Có ô nội dung CK? | Ghi mã AD-xxxxx ở đâu? |
|------|-------------------|-------------------------|
| App ngân hàng (VietQR) | ✅ Có | Ô “Nội dung” / “Lời nhắn” |
| **Zalo Pay** | ❌ Không | **Tin nhắn Zalo** sau khi chuyển |
| Momo cá nhân | ❌ Hầu hết không | Tin nhắn Zalo |

Zalo Pay chỉ ghi: số tiền, thời gian, người nhận — **không cho khách tự nhập memo**. Đây là bình thường, không phải lỗi của bạn.

### Quy trình 4 bước (khách)

1. **Web:** Bấm “Nâng cấp” → chọn gói → nhận **Mã đơn** `AD-20260629-A3F2` + **số tiền chính xác** + QR Zalo Pay / STK.
2. **Chuyển tiền:** Quét QR Zalo Pay (hoặc chuyển ngân hàng) — **không cần** ghi mã vào bill.
3. **Chụp 2 ảnh:**
   - Bill / màn hình **thành công** ngay sau khi trả (Zalo Pay hoặc app NH).
   - Màn hình **Lịch sử đơn hàng** trên Andeck (trang “Đơn của tôi” — hiển thị mã đơn + trạng thái *Chờ xác minh*).
4. **Zalo:** Gửi 2 ảnh + copy sẵn 3 dòng (nút “Copy tin nhắn” trên web):

```
Mã đơn: AD-20260629-A3F2
Email Andeck: user@gmail.com
Gói: Gói 1 — 17.000đ
```

### Quy trình admin (bạn)

1. Mở Zalo → đối chiếu: **mã đơn** + **email** + **số tiền** + **thời gian** trên bill.
2. Vào admin (hoặc trang duyệt đơn) → tìm `AD-...` → **Xác nhận đã nhận tiền** → quota tự cộng.
3. Trả lời Zalo: *“Đã kích hoạt gói X cho user@gmail.com.”*

**Thời gian cam kết trên web:** *“Kích hoạt trong 24h (thường vài giờ).”*

### Tránh nhầm đơn khi nhiều khách cùng gói 17k / 29k

| Cách | Mô tả |
|------|-------|
| **Mã đơn trong Zalo** (bắt buộc) | Admin tra `AD-xxxxx` trong DB — chính xác nhất |
| Số tiền lẻ (tuỳ chọn) | Gói 49k → hiển thị **49.123đ** (123 = suffix từ mã đơn) — khó cho khách, chỉ dùng nếu hay trùng |
| Email trên web | Mỗi đơn gắn JWT user — không cần khách gõ lại nếu đã login |

### Nên hiển thị mấy cách thanh toán?

```
┌─ Nâng cấp gói ─────────────────────────────┐
│ Mã đơn: AD-20260629-A3F2    [Copy]         │
│ Số tiền: 17.000đ (hoặc 29.000đ)            │
│                                            │
│ [QR Zalo Pay]  ← chính                    │
│ Hoặc chuyển khoản: STK · Tên · Ngân hàng   │
│ (Chuyển khoản: có thể ghi mã vào nội dung) │
│                                            │
│ Sau khi chuyển:                            │
│ 1. Chụp bill Zalo Pay / ngân hàng          │
│ 2. Chụp trang "Đơn của tôi" trên web       │
│ 3. [Mở Zalo gửi xác minh] ← deep link     │
└────────────────────────────────────────────┘
```

**Deep link Zalo (prefill tin nhắn):**

`https://zalo.me/0792739257?text=Mã đơn AD-20260629-A3F2%0AEmail: user@gmail.com%0AĐã chuyển 17.000đ — đính kèm bill + ảnh web`

(Khách vẫn phải **đính kèm ảnh** tay trong Zalo.)

---

## 0.2 Gói đã chốt (29/06/2026)

**Mô hình quota:**

- **Pool từ tổng** — dùng linh hoạt giữa các deck (không chia đều).
- **Cộng dồn** — mỗi lần admin duyệt đơn: `deckQuota += …` · `totalWordQuota += …` (cộng lên quota hiện tại, gồm free).

| ID | Tên (UI) | Giá | **+Deck** | **+Từ (pool)** |
|----|----------|-----|-----------|----------------|
| `goi1` | **Gói 1** | **17.000đ** | **+10** | **+1.000** |
| `goi2` | **Gói 2** | **29.000đ** | **+20** | **+2.000** |

**Free (v1):** 3 deck · 150 từ tổng (3×50).

**Ví dụ cộng dồn:**

| Trạng thái | Deck | Từ tổng |
|------------|------|---------|
| Free | 3 | 150 |
| + Gói 1 | 13 | 1.150 |
| + Gói 2 (sau Gói 1) | 33 | 3.150 |
| Free + chỉ Gói 2 | 23 | 2.150 |

**Mua lại cùng gói:** mỗi đơn duyệt **cộng thêm** một lần nữa (vd. 2× Gói 1 → +20 deck, +2000 từ).

**Khi admin duyệt đơn (Phase 2):**

```js
user.deckQuota += pkg.deckAdd;
user.totalWordQuota += pkg.wordAdd;
// wordQuota/deck (trần mỗi deck) = totalWordQuota sau khi cộng
```

**QR thanh toán:** `public/img/zalo-pay-qr.png` — VietQR **DINH VAN AN**, nhận từ mọi app (ZaloPay, VCB, …).

**Copy bán hàng:**

- *Gói 1 — 17k:* +10 deck · +1.000 từ tổng  
- *Gói 2 — 29k:* +20 deck · +2.000 từ tổng  

---

## 0.3 Lộ trình 3 giai đoạn (thứ tự đã chốt)

```
Giai đoạn 1 (1A→1D) ──► Giai đoạn 2 ──► Giai đoạn 3 ──► Go-live
  Giao diện mock       Code           Terms/Privacy/Refund
  4 chat riêng         (1 chat)       (1 chat)
```

| Giai đoạn | Tên | Mục tiêu | Go-live? |
|-----------|-----|----------|----------|
| **1** | Giao diện | UI mock — **4 chat** (1A→1D), xem §0.3.1 | Chưa thu tiền |
| **2** | Code | Backend Order, totalWordQuota, admin duyệt, nối UI | Có thể thu tiền thật |
| **3** | Pháp lý web | Terms, Privacy, Refund + footer MST/liên hệ | Nên xong trước quảng cáo rộng |

> **L0–L3 (HKD, PayOS, HĐĐT):** hoãn — xem mục 3–6 bên dưới khi doanh thu lớn.

---

### 0.3.1 Giai đoạn 1 — Giao diện (chia 4 chat)

**Nguyên tắc:** Mỗi chat **một phạm vi nhỏ**, xong thì tick checklist. **Chưa gọi API**, **chưa sửa backend**. Dùng **mock data** trong JS.

```
1A CSS + shell HTML
      ↓
1B Entry hub + modal chọn Gói 1 / Gói 2
      ↓
1C Modal thanh toán (QR, mã đơn, Zalo)
      ↓
1D Đơn của tôi + nối luồng mock + QA UI
```

| Chat | Tên | Phụ thuộc | Trạng thái |
|------|-----|-----------|------------|
| **1A** | CSS + HTML shell | — | ✅ |
| **1B** | Hub entry + modal gói | 1A | ✅ |
| **1C** | Modal thanh toán | 1B | ✅ |
| **1D** | Đơn hàng + wiring mock | 1C | ✅ |

**Input đã có:** QR `public/img/zalo-pay-qr.png` (DINH VAN AN).

**File chính (cả Giai đoạn 1):**

| File | Chat |
|------|------|
| `public/stylecss/pricing.css` | 1A (tạo), 1B–1D (bổ sung) |
| `public/index.html` | 1A (shell modals), 1B–1D (nội dung + nút) |
| `public/modules/10-pricing.js` | 1D (mock state + luồng); 1B–1C có thể stub tối thiểu |

**Thông số gói (mock — phải khớp §0.2):**

| | Gói 1 | Gói 2 |
|--|-------|-------|
| Giá | 17.000đ | 29.000đ |
| +Deck | +10 | +20 |
| +Từ pool | +1.000 | +2.000 |

---

#### Chat 1A — CSS + HTML shell

**Mục tiêu:** Khung modal + style Stone, **chưa** logic JS.

**Deliverables:**

- [x] `public/stylecss/pricing.css` — overlay, modal, thẻ gói, nút primary/secondary (theme Stone, **không** game shop)
- [x] `public/index.html`: link `pricing.css`
- [x] Shell rỗng (ẩn): `#adUpgradeModal`, `#adPaymentModal`, `#adOrdersPanel` — đủ `id` cho chat sau
- [x] Nút đóng overlay, `aria-label`, responsive cơ bản

**Không làm:** JS luồng, nội dung gói chi tiết, QR, API.

**Prompt mở chat 1A:**

```
Đọc D:\andeck\ANDECK_PAYMENT_ROADMAP.md §0.3.1 Chat 1A.
Tạo public/stylecss/pricing.css + shell 3 modal trong index.html (#adUpgradeModal, #adPaymentModal, #adOrdersPanel).
Theme Stone giống Andeck. Chưa viết logic JS, chưa backend.
Tick checklist 1A trong roadmap khi xong.
```

**Block:** Chat 1B.

---

#### Chat 1B — Hub entry + modal chọn gói

**Mục tiêu:** User thấy nút **Nâng cấp** và modal **Gói 1 / Gói 2**.

**Deliverables:**

- [x] Hub quota pills: nút **Nâng cấp** (`#adUpgradeBtn`)
- [x] Modal hết quota (`#adQuotaLimitOverlay`): thêm **Mua gói** (mở `#adUpgradeModal`) — giữ **Liên hệ Zalo**
- [x] Avatar dropdown: mục **Nâng cấp gói** / **Đơn hàng** (đơn hàng mở panel — nội dung đủ ở 1D)
- [x] `#adUpgradeModal` nội dung: 2 thẻ **Gói 1** (17k, +10 deck, +1000 từ) · **Gói 2** (29k, +20 deck, +2000 từ)
- [x] Ghi chú UI: *“Cộng dồn lên gói hiện tại”* · *“Từ dùng linh hoạt, không chia đều deck”*
- [x] Click gói → (tạm) `alert` hoặc stub mở payment — **1D** nối đầy đủ

**Không làm:** Modal thanh toán đầy đủ, QR, danh sách đơn, API.

**Prompt mở chat 1B:**

```
Đọc D:\andeck\ANDECK_PAYMENT_ROADMAP.md §0.3.1 Chat 1B.
Hoàn thiện modal chọn Gói 1/Gói 2, nút Nâng cấp hub, cập nhật modal quota limit, avatar menu.
Dùng pricing.css từ 1A. Mock only, chưa backend. Tick checklist 1B.
```

**Phụ thuộc:** 1A xong.

**Block:** Chat 1C.

---

#### Chat 1C — Modal thanh toán

**Mục tiêu:** Sau chọn gói → màn **chuyển tiền + Zalo**.

**Deliverables:**

- [x] `#adPaymentModal` đầy đủ:
  - Mã đơn mock `AD-YYYYMMDD-XXXX` + nút **Copy**
  - Số tiền đúng gói (17k / 29k)
  - Ảnh QR: `public/img/zalo-pay-qr.png`
  - Dòng: *QR nhận tiền từ mọi app · DINH VAN AN*
- [x] Hướng dẫn 3 bước: (1) Chuyển tiền (2) Chụp bill + chụp **Đơn của tôi** trên web (3) Gửi Zalo
- [x] Nút **Copy tin nhắn Zalo** (mã đơn + email mock + tên gói + số tiền)
- [x] Nút **Mở Zalo** → `https://zalo.me/0792739257?text=...`
- [x] Ghi *“Kích hoạt trong 24h”*
- [x] Checkbox placeholder *“Đồng ý điều khoản”* (disabled/link `#` — Legal chat 3 làm trang thật)

**Không làm:** API tạo đơn, admin, lưu MongoDB.

**Prompt mở chat 1C:**

```
Đọc D:\andeck\ANDECK_PAYMENT_ROADMAP.md §0.3.1 Chat 1C.
Làm modal #adPaymentModal: QR zalo-pay-qr.png, mã đơn mock, copy/open Zalo, hướng dẫn bill.
Mở từ modal chọn gói (1B). Mock only. Tick checklist 1C.
```

**Phụ thuộc:** 1B xong.

**Block:** Chat 1D.

---

#### Chat 1D — Đơn của tôi + wiring mock + QA UI

**Mục tiêu:** Luồng end-to-end **trên frontend**, danh sách đơn mock.

**Deliverables:**

- [x] `public/modules/10-pricing.js` — mock orders trong `sessionStorage` hoặc biến module
- [x] Luồng: Nâng cấp → chọn Gói 1/2 → Payment → *“Tạo đơn”* → thêm đơn **Chờ xác minh** → mở `#adOrdersPanel`
- [x] `#adOrdersPanel`: bảng/card — mã đơn, gói, số tiền, ngày, trạng thái (*Chờ xác minh* / *Đã kích hoạt* mock)
- [x] Hub quota pill: hiển thị **`x/y từ`** (pool) — `y` mock theo user (free 150); tooltip bỏ công thức `deck×word` nếu có thể (chỉ UI, backend sửa ở G2)
- [x] Include script trong `index.html` (sau `deck-features/bootstrap.js`)
- [x] **QA UI-only** (tick khi pass):

| # | Kịch bản | Pass |
|---|----------|------|
| 1 | Hub → Nâng cấp → thấy 2 gói | ✅ |
| 2 | Hết quota modal → Mua gói → cùng modal | ✅ |
| 3 | Chọn Gói 1 → payment 17k + QR | ✅ |
| 4 | Copy tin Zalo + deep link hoạt động | ✅ |
| 5 | Tạo đơn → Đơn của tôi có dòng *Chờ xác minh* | ✅ |
| 6 | F5 → đơn vẫn còn (sessionStorage) | ✅ |
| 7 | Dark/light theme modal OK · Mobile ~375px | ✅ |

**Không làm:** `POST /api/orders`, admin verify, `totalWordQuota` backend.

**Prompt mở chat 1D:**

```
Đọc D:\andeck\ANDECK_PAYMENT_ROADMAP.md §0.3.1 Chat 1D.
Tạo public/modules/10-pricing.js: mock orders, nối luồng upgrade→payment→orders panel.
Hub quota pool display (mock). QA checklist §1D. Chưa backend. Tick checklist 1D.
```

**Phụ thuộc:** 1C xong.

**Sau 1D:** Giai đoạn 1 coi như **xong** ✅ — review UI rồi mới mở **Giai đoạn 2**.

---

### Giai đoạn 2 — Code

**Deliverables:**

- [ ] `server/config/packages.js` — `goi1` / `goi2` (`deckAdd`, `wordAdd`, giá)
- [ ] `User.totalWordQuota` + migration mặc định = `deckQuota × wordQuota` cho user cũ
- [ ] `server/models/order.js` — `pending` → `verified` → `applied`
- [ ] API: `GET /api/packages` · `POST /api/orders` · `GET /api/orders/mine` · `POST /api/admin/orders/:id/verify`
- [ ] Sửa quota: hub + import + backend enforce **tổng từ pool**
- [ ] `admin.html`: tab **Đơn chờ** + nút *Đã nhận tiền → kích hoạt*
- [ ] Nối UI Phase 1 với API (bỏ mock)

**Checklist trước bật production:**

- [ ] Test: tạo đơn → admin verify → quota **cộng dồn** đúng (+10/+1000 hoặc +20/+2000)
- [ ] Test: 1000 từ vào 1 deck sau khi mua Gói 1 PASS
- [ ] Template Zalo admin: duyệt / từ chối

---

### Giai đoạn 3 — Terms / Privacy / Refund (+ footer)

**Deliverables:**

- [ ] `public/terms.html` — Điều khoản sử dụng
- [ ] `public/privacy.html` — Chính sách bảo mật (Luật BVDLCN 2026)
- [ ] `public/refund.html` — Hoàn tiền (chưa kích hoạt / lỗi hệ thống / đã dùng pool)
- [ ] Footer `index.html` + `admin.html`: link 3 trang + email + Zalo (+ placeholder MST nếu chưa có HKD)
- [ ] Checkbox trước **Tạo đơn**: đồng ý Terms + Refund
- [ ] Cập nhật link checkbox **Đăng ký** → trang thật

**Go-live tối thiểu:** Giai đoạn **2 + 3** xong. Giai đoạn 1 có thể deploy riêng để preview UI.

---

## 0.4 Câu hỏi còn mở

| # | Câu hỏi | Trạng thái |
|---|---------|------------|
| 1 | Tên gói Cơ bản/Nâng cao | ✅ **Gói 1 / Gói 2** |
| 2 | Set absolute vs cộng dồn | ✅ **Cộng dồn** |
| 3 | Ảnh QR Zalo Pay | ✅ `public/img/zalo-pay-qr.png` |
| 4 | STK ngân hàng trên UI | Tuỳ chọn, Phase 1 |

---

## 1. Quyết định đã chốt

| # | Hạng mục | Quyết định |
|---|----------|------------|
| 1 | Phương án thanh toán | **Mức 2** — Zalo Pay + bill + Zalo xác minh, admin duyệt |
| 2 | Gói 1 | **17.000đ** · **+10 deck** · **+1.000 từ** (pool) |
| 3 | Gói 2 | **29.000đ** · **+20 deck** · **+2.000 từ** (pool) |
| 4 | Mô hình từ | **Pool linh hoạt** — không chia đều theo deck |
| 5 | Sau khi duyệt đơn | **Cộng dồn** lên quota hiện tại |
| 6 | Tên hiển thị | **Gói 1** / **Gói 2** |
| 7 | Thứ tự triển khai | **1 UI → 2 Code → 3 Terms/Privacy/Refund** |
| 8 | HKD / PayOS / HĐĐT | **Hoãn** |
| 9 | Zalo CSKH | `0792 739 257` |
| 10 | QR thanh toán | `public/img/zalo-pay-qr.png` — DINH VAN AN |

---

## 2. Lộ trình tổng thể

**Đang làm (Mức 2):**

```
Giai đoạn 1A→1D (UI mock) ──► Giai đoạn 2 (Code) ──► Giai đoạn 3 (Legal) ──► Go-live
```

| Giai đoạn | Thời gian ước tính |
|-----------|-------------------|
| 1A CSS/shell | 0,5 ngày |
| 1B Modal gói | 0,5 ngày |
| 1C Thanh toán | 0,5 ngày |
| 1D Wiring + QA UI | 1 ngày |
| 2 — Code | 2–4 ngày |
| 3 — Legal web | 1–2 ngày |

---

## 3. Phase L0 — Pháp lý nền tảng (Checklist 3.7 — chi tiết)

> Mục tiêu: Có **tư cách pháp nhân hợp lệ** để bán dịch vụ và ký hợp đồng thanh toán.

### L0.1 — Chọn hình thức kinh doanh

**Hộ kinh doanh cá thể (HKD)**

- Phù hợp: cá nhân, doanh thu nhỏ, MVP
- Đăng ký tại **UBND quận/huyện** nơi cư trú (hoặc online qua Cổng DVC quốc gia)
- Chi phí: ~50.000–100.000đ lệ phí (tùy địa phương)
- Hạn chế: một số cổng (VNPay, Momo) ưu tiên **doanh nghiệp**

**Công ty TNHH 1 thành viên / 2 thành viên**

- Phù hợp: muốn hợp đồng VNPay/Momo, hóa đơn chuyên nghiệp, mở rộng sau
- Đăng ký qua **Sở KH&ĐT** tỉnh/TP (hoặc dịch vụ thành lập ~2–5 triệu)
- Chi phí vận hành: kế toán thuê ngoài ~500k–1,5tr/tháng

**Ngành nghề đề xuất (mã VSIC):**

| Mã | Tên | Ghi chú |
|----|-----|---------|
| **6201** | Lập trình máy tính | Phát triển Andeck |
| **6312** | Cổng thông tin | Hosting web, cung cấp dịch vụ trực tuyến |

Có thể đăng ký **cả hai** ngành phụ.

---

### L0.2 — Đăng ký kinh doanh (từng bước)

**Chuẩn bị hồ sơ (HKD):**

- [ ] CMND/CCCD (bản sao)
- [ ] Ảnh 3×4
- [ ] Giấy tờ chứng minh **quyền sử dụng** địa điểm kinh doanh (sổ đỏ, hợp đồng thuê, giấy xác nhận cư trú…)
- [ ] Tên hộ kinh doanh (VD: *Hộ kinh doanh Nguyễn Văn A* hoặc tên thương hiệu)
- [ ] Danh mục ngành nghề (6201, 6312)

**Chuẩn bị hồ sơ (Công ty TNHH):**

- [ ] CMND/CCCD các thành viên / chủ sở hữu
- [ ] Địa chỉ trụ sở (văn phòng ảo được nếu hợp lệ tại địa phương)
- [ ] Vốn điều lệ (tối thiểu theo luật, thường ghi 10–100 triệu)
- [ ] Tên công ty (VD: *Công ty TNHH Andeck*)
- [ ] Điều lệ công ty, danh sách thành viên
- [ ] (Khuyến nghị) Thuê dịch vụ thành lập công ty nếu chưa quen thủ tục

**Sau khi có Giấy chứng nhận:**

- [ ] Khắc dấu (công ty) hoặc dùng chữ ký số (HKD)
- [ ] Mở **tài khoản ngân hàng** tên đúng HKD/Công ty
- [ ] Đăng ký **mã số thuế** (thường cấp cùng lúc với GCN ĐKKD)

---

### L0.3 — Đăng ký thuế ban đầu

- [ ] Nộp **tờ khai đăng ký thuế** (Mẫu 03/TNCN nếu HKD; Mẫu doanh nghiệp nếu Công ty)
- [ ] Chọn **phương pháp kê khai**:
  - HKD: thường **kê khai trực tiếp** trên doanh thu
  - Công ty: **khấu trừ** GTGT + TNDN (nếu chịu GTGT)
- [ ] Đăng ký **hóa đơn điện tử** (xem Phase L2)
- [ ] (Khuyến nghị) Hẹn **Cục Thuế địa phương** hoặc gửi công văn hỏi: *Andeck có được coi là sản phẩm phần mềm không chịu GTGT không?*

**Tài liệu đính kèm khi hỏi thuế:**

- Mô tả sản phẩm: web học từ vựng, không phải game
- Screenshot giao diện Andeck
- Mô hình doanh thu: bán gói dung lượng (quota deck/từ)
- Tham chiếu: Luật GTGT 2024 khoản 21 Điều 5; Công văn 2965/CT-CS (12/5/2026)

---

### L0.4 — (Khuyến nghị) Đăng ký phần mềm Andeck

Giúp chứng minh **sản phẩm phần mềm** khi làm việc với thuế:

- [ ] Soạn **mô tả kỹ thuật** phần mềm (chức năng, kiến trúc, stack)
- [ ] Nộp hồ sơ đăng ký bản quyền phần mềm / công bố phần mềm theo hướng dẫn **Bộ KH&CN**
- [ ] Lưu giấy xác nhận / mã số phần mềm (nếu được cấp)

Tham khảo: Thông tư hướng dẫn đăng ký phần mềm nội bộ; có thể nhờ đơn vị tư vấn CNTT.

---

### L0.5 — Thông tin công khai trên website (chuẩn bị nội dung)

Thu thập đủ để điền footer + trang “Về chúng tôi” (làm ở Phase L1):

| Trường | Ví dụ |
|--------|-------|
| Tên pháp nhân | Công ty TNHH … / Hộ kinh doanh … |
| Mã số thuế | 0123456789 |
| Địa chỉ trụ sở | Số …, phường …, TP … |
| Email liên hệ | support@andeck.vn |
| Hotline / Zalo CSKH | 0792 xxx xxx |
| Người đại diện | Họ tên (Công ty) |
| Giấy ĐKKD số | … |

---

### Checklist L0 — Hoàn thành khi:

- [ ] Có Giấy chứng nhận đăng ký kinh doanh
- [ ] Có MST
- [ ] Có tài khoản ngân hàng tên HKD/Công ty
- [ ] Đã nộp tờ khai thuế ban đầu
- [ ] (Khuyến nghị) Đã gửi / hẹn hỏi Cục Thuế về GTGT phần mềm
- [ ] Đã ghi đủ thông tin pháp nhân để đưa lên web

---

## 4. Phase L1 — Văn bản pháp lý trên website

> Mục tiêu: User **đọc và đồng ý** trước khi thanh toán; tuân thủ Luật BVDLCN 2026 + TMĐT.

### L1.1 — Ba trang bắt buộc

| Trang | URL đề xuất | Nội dung chính |
|-------|-------------|----------------|
| **Điều khoản sử dụng** | `/terms.html` | Quyền/lỗi dịch vụ, giới hạn trách nhiệm, sở hữu nội dung deck |
| **Chính sách bảo mật** | `/privacy.html` | Dữ liệu thu thập, mục đích, thời hạn lưu, quyền của user |
| **Chính sách hoàn tiền** | `/refund.html` | Điều kiện hoàn, thời hạn, cách khiếu nại |

**Trang bổ sung (khuyến nghị):**

- `/pricing.html` — Bảng giá + mô tả gói (minh bạch trước khi trả tiền)
- Footer mọi trang — Link 3 trang trên + MST + địa chỉ

### L1.2 — Khung nội dung (outline — soạn tiếng Việt)

**Điều khoản sử dụng — các mục:**

1. Giới thiệu dịch vụ (phần mềm học từ vựng, không phải game)
2. Điều kiện sử dụng (≥ 13 tuổi hoặc có sự đồng ý phụ huynh)
3. Tài khoản & bảo mật mật khẩu
4. Gói dung lượng & quota (deck/từ) — **không chuyển nhượng**
5. Thanh toán & hóa đơn
6. Cấm: spam, reverse-engineer, chia sẻ tài khoản trái phép
7. Sở hữu trí tuệ (Andeck vs nội dung deck do user tạo)
8. Giới hạn trách nhiệm
9. Chấm dứt dịch vụ
10. Luật áp dụng: Việt Nam; giải quyết tranh chấp

**Chính sách bảo mật — các mục (Luật BVDLCN 2026):**

1. Chủ quản xử lý dữ liệu (tên DN, MST, email)
2. Loại dữ liệu: email, mật khẩu (hash), deck/từ, log IP, **mã đơn hàng** (không lưu số thẻ)
3. Mục đích xử lý
4. Cơ sở pháp lý (hợp đồng, đồng ý)
5. Bên thứ ba: MongoDB Atlas, Render, **cổng thanh toán** (PayOS/VNPay…)
6. Thời hạn lưu trữ
7. Quyền của chủ thể dữ liệu: truy cập, sửa, xóa, khiếu nại
8. Liên hệ DPO / bộ phận bảo mật

**Chính sách hoàn tiền — gợi ý chính sách:**

| Tình huống | Chính sách đề xuất |
|------------|-------------------|
| Lỗi hệ thống — đã trả, chưa cộng quota | Hoàn 100% hoặc cộng quota trong 24h |
| Mua nhầm gói, **trong 24h**, chưa tăng usage | Hoàn 100% hoặc đổi gói |
| Đã sử dụng quota mới | Không hoàn (hoặc hoàn pro-rata — ghi rõ) |
| Khiếu nại | Email + phản hồi trong **3–5 ngày làm việc** |

### L1.3 — Cập nhật form đăng ký hiện tại

File: `public/index.html` — checkbox consent đã có nhưng link chưa trỏ trang thật:

- [ ] Link “Điều khoản sử dụng” → `/terms.html`
- [ ] Link “Chính sách bảo mật” → `/privacy.html`
- [ ] Checkbox bắt buộc trước **Mua gói** (tương tự register)

### Checklist L1 — Hoàn thành khi:

- [ ] 3 trang HTML public, tiếng Việt, dễ đọc
- [ ] Footer `index.html` + `admin.html` có link + MST + địa chỉ
- [ ] Form register trỏ link thật
- [ ] (Khuyến nghị) Luật sư / tư vấn TMĐT rà soát 1 lần

---

## 5. Phase L2 — Thuế & hóa đơn điện tử

### L2.1 — Chọn nhà cung cấp hóa đơn điện tử (HĐĐT)

| NCC | Ghi chú |
|-----|---------|
| MISA meInvoice | Phổ biến SME |
| Viettel Invoice |  |
| VNPT Invoice |  |
| BKAV |  |

- [ ] Ký hợp đồng HĐĐT
- [ ] Đăng ký **mẫu hóa đơn** (bán hàng hóa/dịch vụ)
- [ ] Thử xuất 1 hóa đơn test

### L2.2 — Quy trình xuất hóa đơn mỗi giao dịch

**Quy trình thủ công (MVP):**

1. Webhook `paid` → lưu Order
2. Admin xuất HĐĐT theo email + tên user (hoặc “Người mua không lấy hóa đơn”)
3. Gửi PDF qua email

**Quy trình tự động (Phase sau):**

- Tích hợp API HĐĐT khi Order = paid

### L2.3 — Kê khai thuế định kỳ

- [ ] HKD: kê khai **theo kỳ** (tháng/quý tùy mức doanh thu)
- [ ] Công ty: GTGT + TNDN + (lương nếu có nhân viên)
- [ ] Thuê kế toán hoặc tự kê khai trên **thuedientu.gdt.gov.vn**

### Checklist L2 — Hoàn thành khi:

- [ ] HĐĐT hoạt động, xuất được hóa đơn thử
- [ ] Biết rõ thuế suất áp dụng (0% hay 10%) — có văn bản / email Cục Thuế
- [ ] Quy trình xuất hóa đơn cho mỗi đơn đã ghi trong SOP nội bộ

---

## 6. Phase L3 — Cổng thanh toán

### L3.1 — So sánh & chọn

| Cổng | Hồ sơ | Thời gian duyệt | Phí ~ |
|------|-------|-----------------|-------|
| **PayOS** | DN/HKD + TK ngân hàng | Vài ngày | ~1–2% |
| **SePay** | TK ngân hàng | 1–2 ngày | Thấp |
| **VNPay** | DN, hồ sơ đầy đủ | 1–2 tuần | ~1% |
| **Momo** | DN | 2–4 tuần | Thỏa thuận |

**Đề xuất MVP:** PayOS hoặc SePay (sau khi có L0).

### L3.2 — Hồ sơ thường cần

- [ ] Giấy ĐKKD / GCN HKD
- [ ] MST
- [ ] CMND người đại diện
- [ ] Sao kê / xác nhận tài khoản ngân hàng
- [ ] Ảnh chụp website (có Terms, Privacy, thông tin DN)
- [ ] Mô tả mặt hàng/dịch vụ: *Gói dung lượng phần mềm học từ vựng Andeck*

### L3.3 — Sau khi duyệt

- [ ] Lưu `API Key`, `Checksum Key`, `Webhook URL` vào `.env` (không commit)
- [ ] Cấu hình webhook trỏ `https://andeck.onrender.com/api/payments/webhook` (hoặc domain .vn)
- [ ] Test sandbox: 1 giao dịch thành công + 1 giao dịch hủy

### Checklist L3 — Hoàn thành khi:

- [ ] Hợp đồng cổng thanh toán ký xong
- [ ] Sandbox test PASS
- [ ] Biến môi trường production sẵn sàng trên Render

---

## 7. Phase P1 — Backend (sau pháp lý)

> **Chỉ bắt đầu khi L0 + L1 + L2 + L3 (sandbox) xong.**

### Deliverables

- [ ] `server/models/order.js`
- [ ] `server/models/package.js` — định nghĩa gói (giá server-side)
- [ ] `server/routes/orders.routes.js`
  - `POST /api/orders/create` — tạo order pending + payment link
  - `GET /api/orders/:id` — trạng thái đơn
  - `GET /api/orders/mine` — lịch sử user
- [ ] `POST /api/payments/webhook` — verify signature, idempotent, cộng quota
- [ ] `server/services/quota-from-order.js` — tái dùng logic admin quota
- [ ] Rate limit endpoint tạo đơn
- [ ] Audit log thay đổi quota

### Env mới (`.env.example`)

```
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
PAYMENT_WEBHOOK_PATH=/api/payments/webhook
PAYMENT_RETURN_URL=https://andeck.onrender.com/payment-success.html
```

---

## 8. Phase P2 — Frontend

### Deliverables

- [ ] `public/pricing.html` hoặc modal `#adUpgradeModal`
- [ ] Nút “Nâng cấp” trên hub quota pills
- [ ] Cập nhật `adShowQuotaLimit()` — “Mua thêm” + Zalo CSKH
- [ ] `public/payment-success.html` / `payment-pending.html`
- [ ] Avatar menu: “Gói của tôi” / “Lịch sử đơn hàng”
- [ ] CSS: `stylecss/pricing.css` — giữ theme Stone, **không** style game shop

---

## 9. Phase P3 — Admin & vận hành

- [ ] `admin.html`: tab Orders (pending/paid/refunded)
- [ ] Nút admin: cộng quota thủ công khi lỗi webhook (có log)
- [ ] Email xác nhận đơn (SendGrid / Resend / SMTP)
- [ ] Script QA: `scripts/qa-payment.mjs`
- [ ] SOP nội bộ: xử lý khiếu nại, hoàn tiền

---

## 10. Go-live checklist

- [ ] L0–L3 ✅
- [ ] Terms / Privacy / Refund live + footer MST
- [ ] HĐĐT xuất được
- [ ] Sandbox → Production cổng TT
- [ ] QA: tạo đơn → thanh toán → quota tăng → `/api/me` đúng
- [ ] QA: webhook gọi 2 lần → không double quota
- [ ] Tắt hoặc giảm quảng cáo “chốt đơn Zalo” — chỉ CSKH
- [ ] Backup MongoDB trước ngày mở

---

## 11. Rủi ro pháp lý & cách phòng

| Rủi ro | Mức | Phòng tránh |
|--------|-----|-------------|
| Bị hiểu nhầm là bán đồ game (NĐ 174) | TB | Định vị SaaS giáo dục; không dùng từ game; không P2P quota |
| Thuế GTGT sai mức | TB | Công văn Cục Thuế + đăng ký phần mềm |
| Không xuất HĐĐT | Cao | L2 bắt buộc trước go-live |
| Khiếu nại người tiêu dùng | TB | Refund policy rõ; phản hồi ≤ 5 ngày |
| Vi phạm BVDLCN 2026 | TB | Privacy policy đầy đủ; không bán email |
| Chốt đơn trên MXH không qua web | TB | Chỉ thu tiền trên website chính thức |

---

## 12. Chi phí ước tính (tham khảo)

| Hạng mục | Chi phí VND |
|----------|-------------|
| Đăng ký HKD | ~50k–200k |
| Thành lập Công ty TNHH (dịch vụ) | ~2–5 triệu |
| Hóa đơn điện tử / năm | ~500k–2 triệu |
| Kế toán thuê ngoài / tháng | ~500k–1,5 triệu |
| PayOS / giao dịch | ~1–2% doanh thu |
| Luật sư rà soát 3 trang policy | ~2–5 triệu (tuỳ) |
| Đăng ký phần mềm Bộ KH&CN | ~500k–3 triệu (tuỳ) |

---

## 13. Phân công chat

Mỗi chat: copy **Prompt** vào session mới · đính kèm `@ANDECK_PAYMENT_ROADMAP.md` · tick checklist khi xong.

### Giai đoạn 1 — UI (4 chat)

| Chat | Phạm vi | Prompt |
|------|---------|--------|
| **1A** | CSS + shell HTML | §0.3.1 Chat 1A |
| **1B** | Hub + modal Gói 1/2 | §0.3.1 Chat 1B |
| **1C** | Modal thanh toán + Zalo | §0.3.1 Chat 1C |
| **1D** | Đơn hàng + mock + QA | §0.3.1 Chat 1D |

### Giai đoạn 2 — Code (1 chat — có thể tách sau)

| Chat | Phạm vi |
|------|---------|
| **2** | packages.js, Order, totalWordQuota, admin, nối API, bỏ mock |

**Prompt Giai đoạn 2:**

```
Đọc D:\andeck\ANDECK_PAYMENT_ROADMAP.md §0.2 + Giai đoạn 2.
Giai đoạn 1 (1A–1D) đã xong. Implement backend + nối UI: goi1/goi2, cộng dồn quota, admin duyệt đơn.
```

### Giai đoạn 3 — Legal (1 chat)

| Chat | Phạm vi |
|------|---------|
| **3** | terms, privacy, refund, footer, checkbox links |

**Prompt Giai đoạn 3:**

```
Đọc D:\andeck\ANDECK_PAYMENT_ROADMAP.md Giai đoạn 3.
Soạn terms.html, privacy.html, refund.html + footer. Link checkbox register + trước tạo đơn.
```

*(L0–L3 PayOS / HKD — mục 3–6, dùng sau.)*

---

## 14. Nhật ký cập nhật

| Ngày | Ghi chú |
|------|---------|
| 29/06/2026 | Tạo roadmap — ưu tiên Phase L0–L3 trước code |
| 29/06/2026 | Chốt **Mức 2**: Zalo Pay + bill + Zalo xác minh; mã đơn gửi qua chat, không ghi bill CK |
| 29/06/2026 | Chốt gói **17k** (10 deck, 1k từ pool) · **29k** (20 deck, 2k từ pool); lộ trình **UI → Code → Legal** |
| 29/06/2026 | Đổi tên **Gói 1/2**, **cộng dồn** quota; QR `public/img/zalo-pay-qr.png` (DINH VAN AN) |
| 29/06/2026 | Giai đoạn 1 chia **4 chat: 1A→1B→1C→1D** (phân công UI, chưa backend) |
| 29/06/2026 | **Chat 1A xong:** `pricing.css` + shell 3 modal trong `index.html` |
| 29/06/2026 | **Chat 1B xong:** nút Nâng cấp hub, modal Gói 1/2, Mua gói quota limit, avatar menu, JS mở/đóng modal |
| 29/06/2026 | **Chat 1C xong:** payment modal từ chọn gói, mã đơn mock AD-YYYYMMDD-XXXX, Copy/Mở Zalo, QR zalo-pay-qr.png |
| 29/06/2026 | **Chat 1D xong:** `10-pricing.js`, mock orders sessionStorage, panel Đơn của tôi, hub quota pool UI — **Giai đoạn 1 hoàn tất** |

---

## 15. Tài liệu tham khảo (pháp luật VN)

| Văn bản | Liên quan |
|---------|-----------|
| Nghị định 174/2026/NĐ-CP | Xử phạt game — **Andeck không thuộc** nếu định vị đúng |
| Nghị định 52/2024 (sửa 85/2025) | Thông tin người bán TMĐT |
| Luật Bảo vệ dữ liệu cá nhân 2024 (hiệu lực 2026) | Privacy policy |
| Luật GTGT 2024 + CV 2965/CT-CS (2026) | Thuế phần mềm |
| Luật Bảo vệ quyền lợi người tiêu dùng | Hoàn tiền, minh bạch giá |

> **Lưu ý:** Văn bản pháp luật thay đổi — kiểm tra [thuvienphapluat.vn](https://thuvienphapluat.vn) trước khi go-live.

---

*Tài liệu nội bộ Andeck — không thay tư vấn pháp lý chính thức. Nên tham vấn luật sư / kế toán trước khi thu tiền thật.*
