# TIP-V46-812: Đo parity lại toàn bộ màn v4.6 (P1 → P17) + nghiệm thu AT-GDV01 → 07, TC-461 → 494 trên server dev

## HEADER

- TIP-ID: TIP-V46-812
- Project: OPCHUB
- Module: kiểm chứng xuyên domain. Gồm: parity, e2e behavior / server, báo cáo nghiệm thu. Chỉ sửa code khi đo ra **lệch giao diện thật** hoặc **thiếu bằng chứng** (SPEC 6 → 9).
- Priority: P1
- Depends on: V46-801 → 811 (đã merge vào `dev`; `dev` = `682a4b9e`)
- Estimated: L
- REQ / D:
  - REQ-616 → 630 (toàn bộ D17)
  - D-118 (nghiệm thu v4.6)
  - D-134 (parity là số đo tham khảo, không chặn DONE, owner duyệt ảnh; lệch giao diện thật phải sửa; áp ngược cho 801 → 804)
  - D-124 (ẩn Trợ lý), D-125 (không Zalo / Web Push)
  - D-89 / D-93 (prototype thắng đặc tả về giao diện)
  - D-63 (không dùng `onServer` để làm yếu assertion)
  - **Q-V46-812-1 → 5** (cuối file, kèm phương án mặc định)
- **Files touched** (theo giai đoạn, giống TIP-V42-714). Giai đoạn 2 / 3 chỉ được sửa file **đã ghi vào manifest** `TIP-V46-812-manifest.md` **trước khi sửa**, mỗi file kèm lý do và số đo. Sửa ngoài manifest là vi phạm.
  - **Giai đoạn 1 — đo + bản đồ bằng chứng (không đổi code ứng dụng):**
    - `coding-packs/tips/TIP-V46-812-manifest.md` (create): kiểm kê scenario, ảnh, file sửa ở giai đoạn 2 / 3
    - `coding-packs/reports/ui-parity/results.json`, `results.md`, `server/results.json`, `server/results.md` (modify: chỉ qua `e2e/parity/report.ts`, không sửa tay)
    - `coding-packs/reports/ui-parity/diffs/**`, `server/diffs/**` (create / modify / delete: chỉ ảnh của dòng > 3% do reporter sinh)
    - `coding-packs/reports/ui-parity/V4.6-causes.md` (create): bảng nguyên nhân từng màn > 3% (SPEC 4)
    - `coding-packs/reports/ui-parity/screens.md`, `questions.md` (modify: mục V4.6 / TIP-V46-812)
    - `e2e/parity/scenarios/admin-regional.ts` (modify: chỉ đánh dấu `unreachable` cho `D-78-GDV` theo Q-V46-812-2, kèm lý do)
  - **Giai đoạn 2 — sửa lệch giao diện thật:**
    - Ứng viên đã biết từ completion 801 → 806, 811 (xác nhận lại bằng số đo trước khi sửa):
      - `apps/admin/src/features/affiliate/**`: D-120-GCFG / -RO, D-84-POL, D-84-COM-EMPTY, D-85-CUS header, card mobile
      - `apps/portal/src/features/affiliate/**`: P-V46-REG, P-V46-REG-BANNER, P-97 / P-98 (layout / empty referrals / shell)
      - `apps/admin/src/features/settings/components/settings-nav.tsx` + `*.module.css`: nav thêm hàng làm lệch D-66 / 73 / 75 (806), mobile D-67 → 75
      - `apps/admin/src/features/settings/components/{renewal,bank,ai,app-notify}*`: D-V46-RENEW 390, D-V46-BANK, D-V46-AI 390, D-V46-APP 1440
    - Thêm unit / behavior test cho mỗi chỗ sửa: `*.spec.tsx` cạnh component, `e2e/behavior/<màn>.spec.ts` (modify)
  - **Giai đoạn 3 — bổ sung bằng chứng nghiệm thu còn thiếu (SPEC 7):**
    - `e2e/behavior/admin-regional-directors.spec.ts` (modify): AT-GDV02 popup Portal sau đăng nhập lại; TC-462
    - `e2e/behavior/admin-regional-shares.spec.ts` (modify): AT-GDV04 thu hồi giữa tháng → khoản vẫn trong kỳ chi
    - `e2e/behavior/admin-bank-reconcile.spec.ts` (modify: gắn id `TC-481` vào test đang có, không đổi assertion)
    - `e2e/behavior/global-search.spec.ts` (modify): TC-491 với chuỗi đúng "cà phê"
    - `apps/server/test/regional-director/appoint.int.spec.ts` (modify): TC-462 / BR-464 mail + thông báo thu hồi ghi ngày hết hạn, nhãn mail
    - `e2e/behavior/auth-flows.spec.ts` (modify): BR-465 TK hết hạn khóa đăng nhập được (dùng dữ liệu seed / API, không cookie giả)
    - `apps/server/src/modules/mail/templates-regional.ts` + `apps/server/test/mail/*` (modify: **chỉ khi** Q-V46-812-3 giữ mặc định)
    - `packages/shared/src/mock-data/domains/*` (modify: chỉ khi MSW thiếu trạng thái cần cho test trên; ghi manifest)
  - **Giai đoạn 4 — báo cáo:**
    - `coding-packs/reports/V4.6-acceptance.md` (create): bảng tổng (cổng | bằng chứng | kết luận)
    - `coding-packs/reports/V4.6-acceptance-cases.md` (create): AT-GDV01 → 07, 8 dòng TC, BR-461 → 495 + REQ-628 / 629
    - `coding-packs/reports/V4.6-M1-completion.md` (create): 801 → 804, số thật lượt 812
    - `coding-packs/reports/V4.6-M3-completion.md` (create): 808 → 812
    - `coding-packs/reports/TIP-V46-812-completion.md` (create)
    - `coding-packs/reports/V4.6-progress.md` (modify: thêm dòng #12; **không** sửa trạng thái lịch sử dòng 1 → 11, chỉ thêm ghi chú "đo lại ở 812")
- **Parallel-safe with:** none, sequential. Dùng chung `ui-parity/results.*`, `questions.md`, `screens.md`, `V4.6-progress.md` và các file màn 801 → 811. Là TIP cuối của GOAL-V4.6.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-812-parity-acceptance` tách từ `dev` `682a4b9e`.
- **DB / dịch vụ:** 801 → 811 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). Builder **hỏi owner** DB / cổng đích trước khi chạy:
  - `e2e:server`: `globalSetup` chạy `seed:demo` + `flush:dev-cache`, tức là reset dữ liệu demo
  - `test:int`
  - build `.next-server`

  Không tắt / khởi động lại tiến trình HOLD, không dùng launcher khác để lách. Sau khi đo phải seed lại demo (native HOLD).
- **Đặc tả có đúng 15 ca trong phạm vi:**
  - §32.6 **AT-GDV01 → 07**
  - Bảng §33.5 chỉ có **8 dòng TC**: TC-461, 462, 471, 472, 481, 482, 491, 494. Không có TC-463 → 470, 473 → 480, 483 → 490, 492, 493 (đã grep `dac-ta.html`). → Q-V46-812-1.
- **Bản đồ bằng chứng hiện có** (khảo sát `dev` `682a4b9e`; e2e = `e2e/behavior/`, int = `apps/server/test/`):

  | Ca | Nội dung (đặc tả) | Đã có | Còn thiếu |
  |---|---|---|---|
  | AT-GDV01 | Bổ nhiệm TV chưa đóng phí → "Miễn phí · GĐ Vùng", không popup, có tab Vùng của tôi | int `regional-director/appoint` + `realtime`; e2e `admin-regional-directors` "AT-GDV01 …", `portal-my-region` | — |
  | AT-GDV02 | Thu hồi, không còn phí → popup không đóng được, mất tab | int `appoint` "AT-GDV02 …"; e2e "AT-GDV02 AT-GDV07 …" (phía Admin) | Portal: đăng nhập lại thấy popup, không còn tab |
  | AT-GDV03 | Kế toán: không nút Bổ nhiệm / Xóa, khóa chọn | int `appoint`, `permissions`; e2e "AT-GDV03 …" | — |
  | AT-GDV04 | Thu hồi giữa tháng → khoản đã ghi vẫn chi cuối tháng | int `share-payout` "AT-GDV04 …" | e2e luồng thu hồi → Chi trả |
  | AT-GDV05 | Chọn GĐ Vùng miền khác → lỗi, không lưu | int + e2e "AT-GDV05 AT-GDV06 …" | — |
  | AT-GDV06 | TK bị khóa không có trong danh sách / ép chọn → lỗi | như trên | — |
  | AT-GDV07 | Nhật ký: thời gian, thao tác, TV, vùng, vai trò người làm | int `appoint`; e2e "AT-GDV02 AT-GDV07 …" | — |
  | TC-461 | Đổi phòng chat liên tục không treo, đếm đúng | unit `use-mark-read.spec.tsx`; e2e `portal-chat-read` "REQ-622 TC-461 …" | — |
  | TC-462 | Thu hồi GĐ Vùng còn phí cũ → dùng đến hết hạn; **thông báo ghi ngày hết hạn** | int `appoint` (trạng thái active 40 ngày) | Kiểm mail + thông báo có ngày; e2e; xem Q-V46-812-3 |
  | TC-471 | Gửi tất cả khi tắt mọi kênh → "Bật ít nhất 1 kênh gửi" | unit + int + e2e `admin-renewal` "REQ-620 TC-471 …" | — (D-125: 2 kênh) |
  | TC-472 | Gửi 1 TV → Lần gửi cập nhật, lịch sử mail "Nhắc gia hạn", TV có thông báo | unit + int + e2e "REQ-620 TC-472 …" | — |
  | TC-481 | Đúng cú pháp + bật tự kích hoạt → Đã khớp, kích hoạt gói, có nhật ký | int `bank-reconcile-admin` "TC-481 …"; e2e `admin-bank-reconcile` (chưa gắn id) | Gắn id vào e2e |
  | TC-482 | Sai nội dung → Không khớp → Gán → Gán thủ công | int + e2e "REQ-621 TC-482 …" | — |
  | TC-491 | Gõ "cà phê" → nhóm Gian hàng + Nhu cầu, mở đúng trang | int `global-search` ("Zqx cà phê"), e2e "BR-491 …" | e2e dùng đúng chuỗi "cà phê" trên dữ liệu demo |
  | TC-494 | Tắt Google → "Chỉ người có link mới xem được" | int + unit + e2e `store-public-page` "TC-494 …" | — |

  BR không có dòng TC nhưng thuộc phạm vi "100%":
  - BR-463 → int `affiliate/zero-commission-hidden`
  - BR-464 → int `appoint` (chỉ mail bổ nhiệm); e2e `admin-regional-mail` → **thiếu nhãn mail thu hồi**
  - BR-465 → int `account/auto-unlock` → **thiếu e2e**
  - BR-471 → 474 → int `renewal-scheduler`, `fee-reminders`, `trial`, `regional-director/fee-gate`
  - BR-475 → 477 → int `reporting/conversion`; e2e `admin-overview`
  - BR-478 → 480 → int `local-business/need-matches`; e2e `dashboard-need-matches`
  - BR-484 → e2e `admin-bank-reconcile`
  - BR-485 / 486 → int `settings/audit-log-page`, `audit/admin-audit-coverage`; e2e `admin-audit-log`
  - BR-492 / 493 → int `settings/app-notify`; e2e `app-notify`
  - REQ-628 → int `settings/ai-*`; e2e `ai-providers`
  - BR-495 → e2e `portal-my-region` / affiliate
  - Chia sẻ / Chi trả → int `share-*`; e2e `admin-regional-shares`
- **Parity hiện tại** (`ui-parity/results.md`: 500 ảnh, 435 ≤ 3%). SHA rải từ `81556c27` đến `39390b53`, **chưa từng đo cùng một SHA**.

  | P# | Màn | TIP | Scenario | 1440 / 390 |
  |---|---|---|---|---|
  | P1 | Đăng nhập / chào | 807 | A-01 | 0.10 / 0.14 |
  | P2 | Tìm kiếm topbar | 808 | P-V46-SEARCH, D-V46-SEARCH | ≤ 1.00 |
  | P3 | Dashboard nhu cầu phù hợp | 809 | P-01 | 1.01 / 2.97 |
  | P4 | Trang công khai gian hàng | 810 | P-V46-PUBLIC-CARD (P-V46-GUEST `unreachable`) | 1.50 / 2.50 |
  | P5 | Portal Vùng của tôi + banner | 804 | P-V46-REG, -REG-BANNER, P-97 / 98 | **7.35 / 15.27 · 16.61 / 10.86** |
  | P6 | Admin GĐ Vùng / Cấu hình GĐ Vùng | 801 / 802 | D-120-GCFG, -RO, -GDV, -GDV-OPEN | **4.34 / 8.57 · 10.53 / 10.23 · 1.92 / 5.78 · 10.53 / 8.40** |
  | P7 | Affiliate › Chính sách | 803 | D-84-POL | **3.92 / 10.15** |
  | P8 | Affiliate › Hoa hồng tham khảo | 803 | D-84, D-84-COM-*, -AFF, -AFF-Q, D-85, D-85-CUS | **đa số đỏ** |
  | P9 | Phí "Miễn phí · GĐ Vùng" | 801 | D-18-GDV | 0.35 / 1.66 |
  | P10 | Chuyển đổi theo vùng (Tổng quan) | 807 | D-01 | 2.26 / 1.90 |
  | P11 | Nhắc gia hạn | 805 | D-V46-RENEW | **6.36 / 20.60** |
  | P12 | Đối soát ngân hàng | 806 | D-V46-BANK | **11.59 / 7.28** |
  | P13 | AI Provider | 811 | D-V46-AI | **3.50 / 8.54** |
  | P14 | Ứng dụng & thông báo | 811 | D-V46-APP | **11.98 / 3.56** |
  | P15 | Nhật ký hoạt động | 807 | D-75 | **6.73 / 7.97** (native 69.65 / 68.74: 50 dòng thật) |
  | P16 | Marketing › Email EM-GDV1 / 2 | 801 | D-78-GDV | **không có dòng**: prototype không có menu Marketing (C-05) |
  | P17 | Vai trò & phân quyền | 801 / 807 | D-69 | 2.86 / **3.56** |

  - **Màn cũ bị ảnh hưởng:**
    - Cài đặt D-66 → D-75: thêm tab 805 / 806 / 811. 806 làm D-66 / 73 / 75 desktop tụt 0.7 → 6.5%; mobile 5 → 12%.
    - D-07 Thành viên: bộ lọc GĐ Vùng.
    - D-02 / mọi shell: ô tìm kiếm.
    - P-108 / 109 gian hàng.
    - D-100 bảng giá 390: 7.64%, SHA cũ.
  - **Lệch giao diện thật completion đã ghi nhưng chưa sửa:**
    - 801: form / layout Cấu hình GĐ Vùng
    - 803: EMPTY khung / banner / header; D-85-CUS header; D-84-POL nhịp mobile; chiều cao card mobile; BULK 390 9.70 → 14.17
    - 804: layout empty referrals + shell persona m3
- **Gate cũ còn treo:**
  - 801 → 804 vẫn **PARTIAL**:
    - integration lỗi kết nối PG (rerun pass)
    - M1 consumer
    - persona-turn index plan
    - MSW 1 → 13 fail cùng baseline
  - 804-F1 cần "hai lượt full xanh liên tiếp".
  - Chưa có `V4.6-M1-completion.md` và `V4.6-M3-completion.md` (GOAL bắt buộc).
- **Harness:**
  - `e2e/parity/` (`registry.ts`, `types.ts`, `parity.spec.ts`, `report.ts`). `PARITY_IDS='…'` là glob, phân cách bằng dấu phẩy; `E2E_TARGET=server` ghi vào `ui-parity/server/`.
  - Ngưỡng `MAX_DIFF_PCT = 3`, pixelmatch 0.1, khung 1440 × 900 / 390 × 844.
  - Native: `cd e2e && pnpm e2e:server --project behavior|parity` (`playwright.server.config.ts`, `.next-server`, cổng `SERVER_PORTAL_PORT` / `SERVER_ADMIN_PORT`, `API_PROXY_URL`).
  - `results.md` **không có cột nguyên nhân** → nguyên nhân ghi ở `V4.6-causes.md`.
- Mẫu báo cáo nghiệm thu: `coding-packs/tips/TIP-V42-714-acceptance.md`, `reports/V4.2-acceptance{,-e2e,-spec}.md`. Test gắn id ở đầu tiêu đề (`'REQ-621 TC-482 …'`, `'AT-GDV02 AT-GDV07 …'`) để lọc bằng `-g`.

## APPLICABLE STANDARDS

- [frontend/ui-parity](../standards/frontend/ui-parity.md):
  - 1440 + 390, ≤ 3% là mục tiêu
  - D-134: màn > 3% phải có đúng một loại nguyên nhân (dữ liệu / D-xx / giao diện thật); giao diện thật phải sửa
  - không mask mới, không sửa ảnh gốc
- [testing/testing](../standards/testing/testing.md):
  - truy vết id → test
  - ca âm
  - MSW và native cùng assertion
  - không giả thành công
- [frontend/antd-ui](../standards/frontend/antd-ui.md), [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md): khi sửa giao diện ở giai đoạn 2
- [global/code-structure](../standards/global/code-structure.md): trần FE 400 / BE 600 (sửa có thể đẩy file lên gần trần → tách)
- [global/git-workflow](../standards/global/git-workflow.md): commit theo đường dẫn, không merge / force-push / `main`

## TASK

1. Đo lại **toàn bộ** màn v4.6 (P1 → P17) và màn cũ bị ảnh hưởng trên cùng một SHA, ở 1440 và 390, trên cả MSW và server dev. Mỗi màn > 3% phải có nguyên nhân.
2. Sửa hết **lệch giao diện thật** còn tồn từ 801 → 811.
3. Bổ sung bằng chứng còn thiếu để AT-GDV01 → 07 và 8 dòng TC đạt **100% trên server dev** (trừ phần Zalo / Web Push theo D-125).
4. Viết `V4.6-acceptance.md`, M1 / M3 và completion với số thật.

## SPECIFICATIONS

### Giai đoạn 1 — đo cùng một SHA

1. **Kiểm kê.**
   - Liệt kê `ALL_SCENARIOS` (playwright `--list`) vào manifest.
   - Đánh dấu nhóm cho từng scenario: v4.6 (bảng P#), màn cũ bị ảnh hưởng (D-02, D-07, D-18, D-66 → D-75, D-100, P-108 / 109, P-97 / 98), còn lại.
   - Đo **toàn bộ registry**, không chỉ v4.6, để phát hiện tụt ở màn cũ.
2. **Chạy parity**:
   - **Lượt MSW:** `PARITY_IDS='*'` trên bản build MSW production của SHA đầu nhánh.
   - **Lượt native:** chạy cho nhóm v4.6 + màn cũ bị ảnh hưởng, sau khi owner cho phép đích chạy.

   Ghi lỗi, timeout và `unreachable` đúng như kết quả, kèm lý do. Không rerun để chọn lượt đẹp. Nếu phải chạy lại, ghi cả hai lượt.
3. **Baseline gate trên `dev`:**
   - `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`
   - `pnpm e2e` full MSW

   Ghi số để tách lỗi cũ / mới. Nếu còn lỗi PG connection / flake cũ (804-F1), ghi tên test, chạy lại riêng rồi ghi cả hai kết quả.
4. **`V4.6-causes.md`**, bảng `| ID | viewport | % MSW | % native | Loại | Nguyên nhân cụ thể | Bằng chứng | Hành động |`:
   - **Loại:**
     - `dữ liệu`: seed / đồng hồ / persona / số dòng thật
     - `D-xx`: ghi số D
     - `giao diện thật`: → giai đoạn 2
     - `không đo được`: prototype không có màn. Cần D-xx + test hành vi thay thế.
   - Mọi dòng > 3% của nhóm v4.6 và màn cũ bị ảnh hưởng phải có trong bảng.
   - Phân loại bằng **so ảnh cặp + DOM / đo kích thước**, không đoán theo completion cũ.
   - Một màn có nhiều nguyên nhân → ghi từng phần và phần % ước lượng. Nếu phần `giao diện thật` > 0 thì vẫn phải sửa.

### Giai đoạn 2 — sửa lệch giao diện thật

5. Mỗi dòng loại `giao diện thật`:
   - **Trước khi sửa:** ghi file vào manifest, kèm số đo trước.
   - **Sửa:** dùng CSS / layout / cấu trúc đúng prototype v4.6. Không ẩn control, không đổi dữ liệu để khớp ảnh, không thêm `mask`, không đổi ngưỡng, không điều kiện theo viewport chỉ để chụp đẹp.
   - **Sau khi sửa:**
     - đo lại scenario đó + màn chung shell (nhất là thanh tab Cài đặt: sửa nav phải đo lại cả D-66 → D-75, D-V46-*)
     - thêm / cập nhật test hành vi kiểm chữ + bố cục chính
   - Sửa **không** được đổi nghiệp vụ / API / schema. Nếu lệch thật là do nghiệp vụ (prototype làm khác D-xx) thì đổi loại thành `D-xx`, không sửa.
6. Ưu tiên theo thứ tự:
   1. thanh tab Cài đặt (ảnh hưởng ~14 màn)
   2. Affiliate Admin 803 (P7 / P8)
   3. Cấu hình GĐ Vùng 801 (P6)
   4. Portal Vùng của tôi 804 (P5)
   5. 805 / 806 / 811 mobile

   Không đạt ≤ 3% sau khi đã sửa hết phần giao diện thật thì ghi phần còn lại là `dữ liệu` / `D-xx`, có ảnh chứng minh.

### Giai đoạn 3 — bằng chứng nghiệm thu

7. **Bổ sung đúng các chỗ thiếu ở bảng CONTEXT.** Mỗi test gắn id ở đầu tiêu đề, chạy được cả MSW lẫn server với **cùng assertion**:
   - **AT-GDV02:** Admin thu hồi TV không còn phí → Portal đăng nhập lại:
     - popup phí không đóng được (không có nút đóng, Esc không đóng)
     - không còn tab "Vùng của tôi"
   - **AT-GDV04:**
     - tạo khoản chia sẻ trong tháng (qua luồng có sẵn ở seed / API đối soát) → thu hồi GĐ Vùng giữa tháng
     - Admin › Chi trả kỳ cuối tháng vẫn có khoản của người cũ, với tài khoản snapshot (Q-V46-802-2)
   - **TC-462:** thu hồi GĐ Vùng có phí cũ còn hạn:
     - Portal vẫn dùng được, không popup
     - thông báo trong chuông có **ngày hết hạn** `dd/mm/yyyy`
     - int: mail thu hồi chứa đúng ngày (giờ VN); nhãn mail `regional_director` hiện đúng ở lịch sử mail (BR-464)
   - **TC-481:** gắn id vào e2e tự kích hoạt đang có, không đổi assertion.
   - **TC-491:** gõ đúng "cà phê" trên dữ liệu demo:
     - có nhóm Gian hàng + Nhu cầu
     - bấm kết quả mở đúng trang

     Nếu seed demo không có gian hàng / nhu cầu chứa "cà phê" thì thêm **một** dòng seed demo (ghi manifest). Không chặn route.
   - **BR-465:** TK có hạn khóa đã qua → đăng nhập thành công, `status` về `active`. Dữ liệu chuẩn bị qua seed / API Admin khóa có hạn + đồng hồ test sẵn có. Không cookie giả, không chặn response.
8. Chạy nghiệm thu trên **server dev** (native, owner cho phép):
   - `cd e2e && pnpm e2e:server --project behavior -g "AT-GDV|TC-46|TC-47|TC-48|TC-49|BR-46|BR-47|BR-48|BR-49|REQ-62"`
   - full `--project behavior` để kiểm không tụt

   Chép output thật. Không có runtime native thì ghi **NOT RUN**, không lấy MSW thay.
9. Ca nào đỏ trên server mà MSW xanh: đó là lỗi thật (dữ liệu mock lệch server hoặc lỗi server).
   - Sửa theo SPEC 5: ghi manifest, có test, không nới assertion.
   - Lỗi nghiệp vụ chưa có D-xx: ghi `questions.md`, dừng ca đó ở FAIL, làm tiếp ca khác.

### Giai đoạn 4 — báo cáo

10. **`V4.6-acceptance.md`.**
    - Mở đầu: trạng thái `ACCEPTED` / `NOT ACCEPTED`, SHA cuối, PR.
    - Bảng `| Cổng | Bằng chứng | Kết luận |` gồm:
      - parity MSW + native (số ảnh, ≤ 3%, số dòng mỗi loại nguyên nhân)
      - 15 ca
      - BR-461 → 495
      - gate full
      - 12 completion + M1 → M3
      - Git
    - Kết luận `ACCEPTED` chỉ khi:
      - 15 ca PASS trên server
      - mọi dòng > 3% có nguyên nhân và không còn `giao diện thật`
      - gate xanh
11. **`V4.6-acceptance-cases.md`.**
    - Bảng `| ID | Yêu cầu (sau D-xx) | Test (file › tên) | MSW | Server | Ghi chú |` cho 15 ca.
    - Thêm bảng BR-461 → 495 + REQ-628 / 629, trong đó:
      - phần Zalo / Web Push ghi `N/A (D-125)`
      - Trợ lý ghi `N/A (D-124)`
12. **`V4.6-M1-completion.md` (801 → 804):** số thật **lượt 812** cho gate / parity / ca của 801 → 804. Ghi rõ dòng lịch sử PARTIAL ở progress giữ nguyên; trạng thái hiện tại theo số đo 812.
13. **`V4.6-M3-completion.md` (808 → 812)** và **`TIP-V46-812-completion.md`**, ghi:
    - SHA, PR
    - số test từng cổng
    - bảng parity v4.6 trước / sau
    - danh sách file đã sửa ở giai đoạn 2 / 3
    - soát luật cứng 1 → 14
    - phần chưa làm
    - Q-V46-812-x

    Cuối file có bảng tổng GOAL `| TIP | PR | test | parity | chưa làm |` cho 801 → 812.

### Validation

- `results.*` chỉ sinh bằng `report.ts`. Sửa tay là vi phạm.
- `V4.6-causes.md`: mỗi dòng phải có `Loại` thuộc 4 giá trị ở SPEC 4, và đường dẫn ảnh cặp.
- Nhãn id trong tiêu đề test khớp đúng id đặc tả. Không đặt id cho test không kiểm đúng nội dung ca.

### Error Handling

| Trường hợp | Xử lý |
|---|---|
| Owner chưa cho phép DB / cổng native | Làm giai đoạn 1 lượt MSW + giai đoạn 2; lượt native ghi NOT RUN; acceptance = NOT ACCEPTED |
| Scenario timeout / lỗi chụp | Ghi đúng như kết quả trong manifest + causes; sửa locator chỉ khi locator sai (ghi lý do), không tăng timeout |
| Sửa giao diện làm màn khác tụt > 0.5 điểm % | Xử lý trước khi commit; ghi cả số trước / sau |
| Ca đỏ do nghiệp vụ chưa có D-xx | FAIL + `questions.md` Q-V46-812-n; không tự quyết |
| Flake (lần đỏ lần xanh) | Ghi cả hai lượt + nguyên nhân; sửa race nếu là lỗi test; không thêm `retries` / `fixme` |

## ACCEPTANCE CRITERIA

- **AC1 — đo cùng SHA.** Given đầu nhánh 812 When chạy parity toàn registry (MSW) và nhóm v4.6 + màn ảnh hưởng (native) Then:
  - mọi dòng trong `results.*` của các nhóm đó có SHA của lượt 812
  - manifest liệt kê đủ scenario, kể cả `unreachable` có lý do
- **AC2 — nguyên nhân.** Given mọi dòng > 3% thuộc P1 → P17 + màn ảnh hưởng Then `V4.6-causes.md` có đủ dòng, mỗi dòng một loại và ảnh cặp; **không còn dòng loại `giao diện thật`** sau giai đoạn 2.
- **AC3 — không tụt.** Given số đo đầu giai đoạn 1 When kết thúc giai đoạn 2 Then không scenario nào (toàn registry) tăng > 0.5 điểm %. Nếu có, causes ghi nguyên nhân và đã xử lý.
- **AC4 — 15 ca.** Given server dev đã seed When chạy `e2e:server` lọc id Then:
  - AT-GDV01 → 07 và TC-461 / 462 / 471 / 472 / 481 / 482 / 491 / 494 PASS trên server, cùng test PASS trên MSW
  - `V4.6-acceptance-cases.md` ghi file › tên test cho từng ca

  Test mới gồm:
  - `admin-regional-directors.spec.ts` › `AT-GDV02 portal popup after revoke`, `TC-462 valid fee kept and expiry date notified`
  - `admin-regional-shares.spec.ts` › `AT-GDV04 revoke mid-month keeps share in payout`
  - `global-search.spec.ts` › `TC-491 cà phê …`
  - `auth-flows.spec.ts` › `BR-465 expired lock unlocks at login`
  - `appoint.int.spec.ts` › `TC-462 BR-464 revoke mail and notification carry expiry date`
- **AC5 — BR.** Given BR-461 → 495 + REQ-628 / 629 Then mỗi mục có test PASS hoặc ghi `N/A (D-124 / D-125)`. Không mục nào "chưa có bằng chứng".
- **AC6 — gate.** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build` xanh. Full `pnpm e2e` (MSW) và full `e2e:server --project behavior` không tụt so với baseline giai đoạn 1. Ghi số thật.
- **AC7 — báo cáo.** `V4.6-acceptance.md`, `-cases.md`, M1, M3, 812 completion có số thật + SHA. `V4.6-progress.md` có dòng #12. Kết luận đúng điều kiện SPEC 10.

## CONSTRAINTS

- DO NOT:
  - mask mới, đổi `MAX_DIFF_PCT` / threshold, sửa ảnh prototype / baseline
  - đổi FAIL → PASS, sửa tay `results.*`
  - `retries` / `fixme` / `skip` mới / tăng timeout / nới assertion, dùng `onServer` để làm yếu (D-63)
  - ẩn control prototype yêu cầu (trừ Trợ lý D-124, Zalo D-125)
  - đổi dữ liệu / seed để ảnh khớp (trừ **một** dòng seed "cà phê" ở SPEC 7, nếu thiếu)
  - đổi nghiệp vụ / API / schema / migration trong TIP này (trừ Q-V46-812-3 nếu giữ mặc định, chỉ chữ tiêu đề mail)
  - gọi ngân hàng / AI / mail / Zalo / Web Push thật
  - tắt / khởi động lại tiến trình HOLD, chạy trên VPS, sửa `.env`, commit cookie / token / trace có phiên
  - sửa trạng thái lịch sử 801 → 811 trong progress
  - tự merge PR
- REUSE:
  - `e2e/parity/*` (registry, report), `e2e/server/*` (target, global-setup, mailbox, `new-member-acceptance.ts`)
  - helper `e2e/behavior/helpers/*`
  - fixture GĐ Vùng / chia sẻ trong seed demo
  - mẫu báo cáo V4.2-714
- SKIP:
  - đo lại màn ngoài phạm vi v4.6 khác nhóm "ảnh hưởng" ở lượt native (MSW vẫn đo toàn registry)
  - sửa lệch màn cũ **không** do v4.6 gây ra (ghi causes loại tương ứng + questions, không sửa lan)
  - các bổ sung tiếp theo của 807 (giới hạn 100 nhóm), màn nhật ký AI (Q-V46-811-5)

## Câu hỏi chờ owner chốt (builder dùng mặc định nếu chưa có trả lời, ghi `questions.md` › TIP-V46-812)

- **Q-V46-812-1 "TC-461 → 494" chỉ có 8 dòng trong §33.5.**
  - **Mặc định:** nghiệm thu đủ 8 dòng TC + AT-GDV01 → 07, kèm bảng BR-461 → 495 có bằng chứng test (AC5). Không tự nghĩ thêm ca TC không có trong đặc tả.
- **Q-V46-812-2 P16 Marketing › EM-GDV1 / 2 không có trên prototype (C-05).**
  - **Mặc định:** đánh `unreachable` `D-78-GDV`, lý do "prototype v4.6 không có menu Marketing". Bằng chứng thay thế là `admin-regional-mail.spec.ts` + int mail. Owner duyệt ảnh app trong PR.
- **Q-V46-812-3 Tiêu đề mail thu hồi luôn ghi "· vui lòng đóng phí thành viên"**, kể cả khi phí cũ còn hạn (`templates-regional.ts`). Trường hợp này mâu thuẫn TC-462, vì người nhận vẫn dùng được đến hết hạn.
  - **Mặc định:** khi còn hạn, tiêu đề thành "… · phí thành viên cũ còn hạn đến dd/mm/yyyy"; khi hết hạn giữ nguyên. Chỉ đổi chữ, không đổi luồng.
  - Owner muốn giữ nguyên thì bỏ sửa này, TC-462 vẫn kiểm thân mail + thông báo.
- **Q-V46-812-4 Trạng thái 801 → 804 (PARTIAL).**
  - **Mặc định:** không sửa dòng lịch sử. M1 completion ghi số đo lượt 812; nếu xanh thì ghi "đạt ở lượt 812 (`<sha>`)".
- **Q-V46-812-5 Màn native có dữ liệu thật khác prototype** (D-75 nhật ký 50 dòng ≈ 69%, D-01, danh sách dài).
  - **Mặc định:** loại `dữ liệu`, kèm ảnh cặp. Không seed rỗng để khớp ảnh. Owner duyệt ảnh.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-812-parity-acceptance`. Manifest viết **trước** mọi sửa code; chỉ sửa file trong manifest.
- [ ] Hỏi owner DB / cổng / runtime native trước khi chạy `e2e:server` (reset demo), `test:int`, build `.next-server`. Không tắt HOLD. Đo xong thì `seed:demo` trả dữ liệu demo.
- [ ] Baseline `dev` (gate + full MSW) ghi số trước khi sửa.
- [ ] Parity cùng SHA: MSW toàn registry; native nhóm v4.6 + ảnh hưởng. `V4.6-causes.md` đủ dòng, không còn `giao diện thật`.
- [ ] Mỗi AC1 → AC7 ghi PASS / FAIL thật. Chép tóm tắt output: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`, `pnpm e2e`, `pnpm e2e:server --project behavior` (lọc id + full), parity MSW / native.
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **D-134:** parity tham khảo, nhưng lệch giao diện thật phải sửa; không mask / nới / sửa ảnh
  - **D-63 / testing:** MSW và server cùng assertion; không `onServer` làm yếu; không giả thành công; NOT RUN là NOT RUN
  - **D-124 / D-125:** không Trợ lý, không Zalo / Web Push; ghi N/A đúng chỗ
  - **Luật 1:** sửa giao diện không làm file vượt 400 (FE) / 600 (BE)
- [ ] Không `any` / `@ts-ignore` / `console.*`; không secret / cookie / trace phiên trong commit.
- [ ] Ghi Q-V46-812-1 → 5 vào `questions.md`. `screens.md` cập nhật mục V4.6.
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`), `git status --short` sạch, push, PR `base: dev`, không tự merge. Báo `TIP-V46-812-DONE <sha>` kèm bảng tổng GOAL.
- [ ] KHÔNG báo DONE nếu còn gate đỏ, còn ca nghiệm thu FAIL / NOT RUN mà không ghi rõ, hoặc còn dòng `giao diện thật`.

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ; Files touched theo giai đoạn + manifest bắt buộc trước khi sửa (vì chỗ sửa chỉ biết sau khi đo, giống 714)
- [x] Context:
  - 15 ca thật trong đặc tả (đã grep)
  - bản đồ bằng chứng từng ca + chỗ thiếu
  - parity P1 → P17 với số hiện tại
  - màn cũ ảnh hưởng, gate treo 801 → 804, harness, DB / HOLD
- [x] Task 4 việc rõ; SPEC 1 → 13 theo 4 giai đoạn; validation; bảng lỗi
- [x] AC1 → AC7 Given / When / Then, có tên test mới
- [x] Constraints DO NOT / REUSE / SKIP; trích D-134, D-63, D-124 / 125
- [x] Parallel: sequential, TIP cuối
- ⚠️ Gap:
  - Không biết trước khối lượng sửa giai đoạn 2 (803 / 804 nhiều màn đỏ) → có thể lớn hơn L. Nếu builder thấy vượt một PR, tách giai đoạn 2 thành commit theo màn trong cùng nhánh, không tách TIP.
  - Lượt native cần owner cho phép chạy `e2e:server` (reset demo).
  - Q-V46-812-3 là sửa chữ nghiệp vụ nhỏ, cần owner xác nhận khi review.
