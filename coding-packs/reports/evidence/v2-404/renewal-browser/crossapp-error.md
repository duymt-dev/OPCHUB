# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: behavior\affiliate-cross-app.spec.ts >> REQ-308 REQ-309 REQ-310 REQ-410 bank/rate/policy cross Portal and Admin origins and survive F5
- Location: behavior\affiliate-cross-app.spec.ts:14:1

# Error details

```
Error: locator.check: Clicking the checkbox did not change its state
Call log:
  - waiting for getByRole('row').filter({ hasText: 'Kiều Văn Sơn' }).filter({ hasText: 'Lê Thu Hà' }).getByRole('checkbox')
    - locator resolved to <input type="checkbox" aria-label="Select row 6" class="ant-checkbox-input"/>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - performing click action
    - click action done
    - waiting for scheduled navigations to finish
    - navigations have finished

```

# Page snapshot

```yaml
- generic [ref=f6e1]:
  - alert [ref=f6e2]
  - generic [ref=f6e3]:
    - complementary [ref=f6e4]:
      - generic [ref=f6e5]:
        - img "OPC HUB ASEAN – One Person Company Hub" [ref=f6e7]
        - button "Thu gọn sidebar" [expanded] [ref=f6e8] [cursor=pointer]
      - navigation "MENU" [ref=f6e11]:
        - link "Dashboard" [ref=f6e13] [cursor=pointer]:
          - /url: /dashboard
        - link "Cộng đồng" [ref=f6e17] [cursor=pointer]:
          - /url: /community
        - link "Chat nhóm" [ref=f6e21] [cursor=pointer]:
          - /url: /chat
        - link "Sự kiện sắp tới" [ref=f6e25] [cursor=pointer]:
          - /url: /events
        - link "Dự án OPC" [ref=f6e29] [cursor=pointer]:
          - /url: /projects
        - link "Affiliate" [ref=f6e33] [cursor=pointer]:
          - /url: /affiliate
        - link "Gói dịch vụ" [ref=f6e37] [cursor=pointer]:
          - /url: /services
      - region "Sự kiện sắp tới" [ref=f6e43]:
        - generic [ref=f6e44]:
          - generic [ref=f6e45]: Sự kiện sắp tới
          - button "Xem tất cả" [ref=f6e46] [cursor=pointer]
        - 'button "OPC Meetup #12 – Vận hành doanh nghiệp một mình T5, 22/10 · 19:30 · Offline" [ref=f6e47] [cursor=pointer]':
          - generic [aria-hidden] [ref=f6e48]:
            - generic [ref=f6e49]: T5
            - generic [ref=f6e50]: "22"
          - generic [ref=f6e51]:
            - generic [ref=f6e52]: "OPC Meetup #12 – Vận hành doanh nghiệp một mình"
            - generic [ref=f6e53]: T5, 22/10 · 19:30 · Offline
        - 'button "Workshop: Tự động hoá bán hàng bằng AI T7, 25/10 · 09:00 · Online" [ref=f6e54] [cursor=pointer]':
          - generic [aria-hidden] [ref=f6e55]:
            - generic [ref=f6e56]: T7
            - generic [ref=f6e57]: "25"
          - generic [ref=f6e58]:
            - generic [ref=f6e59]: "Workshop: Tự động hoá bán hàng bằng AI"
            - generic [ref=f6e60]: T7, 25/10 · 09:00 · Online
        - 'button "AMA: Thuế & kế toán cho công ty TNHH MTV T4, 29/10 · 20:00 · Online" [ref=f6e61] [cursor=pointer]':
          - generic [aria-hidden] [ref=f6e62]:
            - generic [ref=f6e63]: T4
            - generic [ref=f6e64]: "29"
          - generic [ref=f6e65]:
            - generic [ref=f6e66]: "AMA: Thuế & kế toán cho công ty TNHH MTV"
            - generic [ref=f6e67]: T4, 29/10 · 20:00 · Online
    - generic [ref=f6e68]:
      - banner [ref=f6e69]:
        - generic [ref=f6e70]:
          - button "Trang chủ" [ref=f6e71] [cursor=pointer]
          - generic [ref=f6e74]: ›
          - generic [ref=f6e75]: Affiliate
        - search [ref=f6e77]: Tìm kiếm...
        - button "Thông báo" [ref=f6e81] [cursor=pointer]:
          - generic [ref=f6e84]: "1"
        - button "Tiếng Việt" [ref=f6e86] [cursor=pointer]
        - button "Lê Thu Hà Founder OPC" [ref=f6e92] [cursor=pointer]:
          - generic [aria-hidden] [ref=f6e93]: TH
          - generic [ref=f6e94]:
            - generic [ref=f6e95]: Lê Thu Hà
            - generic [ref=f6e96]: Founder OPC
      - main [ref=f6e99]:
        - generic [ref=f6e100]:
          - generic [ref=f6e102]:
            - heading "Affiliate" [level=1] [ref=f6e104]
            - generic [ref=f6e105]: 01/10/2026 – 15/10/2026
          - generic [ref=f6e111]:
            - generic [ref=f6e112]:
              - generic [ref=f6e113]:
                - generic [ref=f6e114]: CHƯƠNG TRÌNH AFFILIATE OPC HUB
                - heading "Giới thiệu thành viên mới, nhận 31% hoa hồng" [level=2] [ref=f6e115]
                - paragraph [ref=f6e116]: Mỗi người đăng ký qua link của bạn và thanh toán phí thành viên 12 tháng, bạn nhận 186.000đ. Link được ghi nhận trong 45 ngày.
                - generic [ref=f6e117]:
                  - generic [ref=f6e118]:
                    - generic [ref=f6e119]: Tài khoản nhận hoa hồng · chuyển khoản ngày cuối tháng
                    - button "Sửa" [ref=f6e120] [cursor=pointer]
                  - generic [ref=f6e121]: LE THU HA
                  - generic [ref=f6e122]: BIDV · 715917091871
              - generic [ref=f6e123]:
                - generic [ref=f6e124]: Link giới thiệu của bạn
                - generic [ref=f6e125]:
                  - generic "http://localhost:3236/r/HAOPC" [ref=f6e126]
                  - button "Sao chép" [ref=f6e127] [cursor=pointer]
                - generic [ref=f6e131]:
                  - generic [ref=f6e132]: Mã giới thiệu
                  - button "Sao chép mã" [ref=f6e133] [cursor=pointer]: HAOPC
                  - generic [ref=f6e134]:
                    - link "Chia sẻ Facebook" [ref=f6e135] [cursor=pointer]:
                      - /url: https://www.facebook.com/sharer/sharer.php?u=http%3A%2F%2Flocalhost%3A3236%2Fr%2FHAOPC
                      - img "facebook" [ref=f6e136]
                    - link "Chia sẻ Zalo" [ref=f6e139] [cursor=pointer]:
                      - /url: https://zalo.me/share?url=http%3A%2F%2Flocalhost%3A3236%2Fr%2FHAOPC
                      - text: Zalo
                    - link "Gửi email" [ref=f6e140] [cursor=pointer]:
                      - /url: mailto:?subject=M%E1%BB%9Di%20b%E1%BA%A1n%20tham%20gia%20OPC%20Hub&body=http%3A%2F%2Flocalhost%3A3236%2Fr%2FHAOPC
                      - img "mail" [ref=f6e141]
            - generic [ref=f6e144]:
              - generic [ref=f6e145]:
                - generic [ref=f6e146]: Lượt nhấp link
                - generic [ref=f6e147]: "905"
                - generic [ref=f6e148]: 30 ngày gần nhất
              - generic [ref=f6e149]:
                - generic [ref=f6e150]: Thành viên đã thanh toán
                - generic [ref=f6e151]: "13"
                - generic [ref=f6e152]: Tỷ lệ chuyển đổi 1.4%
              - generic [ref=f6e153]:
                - generic [ref=f6e154]: Hoa hồng tháng này
                - generic [ref=f6e155]: 930.000đ
                - generic [ref=f6e156]: Chi trả ngày 31/10/2026
              - generic [ref=f6e157]:
                - generic [ref=f6e158]: Tồn kỳ trước chưa chi
                - generic [ref=f6e159]: 0đ
                - generic [ref=f6e160]: Không có khoản tồn
              - generic [ref=f6e161]:
                - generic [ref=f6e162]: Đã nhận
                - generic [ref=f6e163]: 1.200.000đ
                - generic [ref=f6e164]: Tổng các kỳ đã chi trả
            - tablist "Affiliate" [ref=f6e166]:
              - tab "Thành viên đã giới thiệu 14" [ref=f6e167] [cursor=pointer]:
                - generic [ref=f6e168]: Thành viên đã giới thiệu
                - generic [ref=f6e169]: "14"
              - tab "Lịch sử nhận tiền 2" [active] [selected] [ref=f6e170] [cursor=pointer]:
                - generic [ref=f6e171]: Lịch sử nhận tiền
                - generic [ref=f6e172]: "2"
            - tabpanel "Lịch sử nhận tiền 2" [ref=f6e173]:
              - generic [ref=f6e174]:
                - generic [ref=f6e175]:
                  - generic [ref=f6e176]:
                    - heading "Lịch sử nhận tiền" [level=3] [ref=f6e177]
                    - paragraph [ref=f6e178]: Hoa hồng được chuyển khoản 1 lần vào ngày cuối mỗi tháng
                  - generic [ref=f6e179]:
                    - generic [ref=f6e180]: Tổng đã nhận · 2 kỳ
                    - generic [ref=f6e181]: 1.200.000đ
                - table [ref=f6e190]:
                  - rowgroup [ref=f6e198]:
                    - row [ref=f6e199]:
                      - columnheader "Kỳ chi trả" [ref=f6e200]
                      - columnheader "Ngày nhận" [ref=f6e201]
                      - columnheader "Tên chủ tài khoản" [ref=f6e202]
                      - columnheader "Ngân hàng · STK" [ref=f6e203]
                      - columnheader "Số tiền" [ref=f6e204]
                      - columnheader "Trạng thái" [ref=f6e205]
                  - rowgroup [ref=f6e206]:
                    - row [ref=f6e207]:
                      - cell "Tháng 09/2026" [ref=f6e208]
                      - cell "30/09/2026" [ref=f6e209]
                      - cell "LE THU HA" [ref=f6e210]
                      - cell "ACB · 24681357" [ref=f6e211]
                      - cell "900.000đ" [ref=f6e212]
                      - cell "Đã chuyển khoản" [ref=f6e213]
                    - row [ref=f6e215]:
                      - cell "Tháng 08/2026" [ref=f6e216]
                      - cell "31/08/2026" [ref=f6e217]
                      - cell "LE THU HA" [ref=f6e218]
                      - cell "ACB · 24681357" [ref=f6e219]
                      - cell "300.000đ" [ref=f6e220]
                      - cell "Đã chuyển khoản" [ref=f6e221]
```

# Test source

```ts
  1  | import { test, expect, type Page } from '../server/test';
  2  | import { ADMIN_URL, PORTAL_URL } from '../urls';
  3  | 
  4  | test.use({ affiliateDemo: true });
[redacted]
  6  |   await page.goto(`${origin}/login`);
  7  |   await page.locator('input[type=email]').fill(email);
[redacted]
  9  |   await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  10 |   await expect(page).not.toHaveURL(/\/login$/);
  11 |   await page.goto(`${origin}/affiliate`);
  12 | }
  13 | 
  14 | test('REQ-308 REQ-309 REQ-310 REQ-410 bank/rate/policy cross Portal and Admin origins and survive F5', async ({
  15 |   page,
  16 |   context,
  17 | }) => {
  18 |   await login(page, PORTAL_URL, 'ha.le@opcmedia.vn', 'User@2026');
  19 |   await expect(page.getByText('HAOPC', { exact: true })).toBeVisible();
  20 |   await page.getByRole('button', { name: 'Sửa', exact: true }).click();
  21 |   await page.getByLabel('Ngân hàng', { exact: true }).selectOption('BIDV');
  22 |   await page.getByLabel('Số tài khoản', { exact: true }).fill('715917091871');
  23 |   await page.getByLabel('Tên chủ tài khoản', { exact: true }).fill('LE THU HA');
  24 |   await page.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click();
  25 |   await expect(page.getByText('BIDV · 715917091871', { exact: true })).toBeVisible();
  26 | 
  27 |   const admin = await context.newPage();
  28 |   await login(admin, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  29 |   await admin.getByRole('tab', { name: /^Affiliate/ }).click();
  30 |   await admin.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('HAOPC');
  31 |   await admin.getByRole('link', { name: 'Lê Thu Hà', exact: true }).click();
  32 |   await expect(admin.getByLabel('Tài khoản nhận hoa hồng', { exact: true })).toContainText(
  33 |     'BIDV · 715917091871',
  34 |   );
  35 |   await admin.getByRole('button', { name: 'Sửa (Admin)', exact: true }).click();
  36 |   const dialog = admin.getByRole('dialog', { name: 'Đặt tỷ lệ hoa hồng', exact: true });
  37 |   await dialog.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng (%)', exact: true }).fill('31');
  38 |   await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  39 |   await expect(dialog).toHaveCount(0);
  40 |   await admin.reload();
  41 |   await expect(admin.getByText('31%', { exact: true })).toBeVisible();
  42 |   await page.reload();
  43 |   await expect(
  44 |     page.getByRole('heading', { name: 'Giới thiệu thành viên mới, nhận 31% hoa hồng' }),
  45 |   ).toBeVisible();
  46 |   await expect(page.getByText('BIDV · 715917091871', { exact: true })).toBeVisible();
  47 | 
  48 |   await admin.goto(`${ADMIN_URL}/affiliate?tab=cfg`);
  49 |   await admin
  50 |     .getByRole('spinbutton', { name: 'Thời gian ghi nhận link (ngày)', exact: true })
  51 |     .fill('45');
  52 |   await admin.getByRole('button', { name: 'Lưu chính sách', exact: true }).click();
  53 |   await expect(
  54 |     admin.getByRole('status').filter({ hasText: 'Đã lưu chính sách affiliate' }),
  55 |   ).toBeVisible();
  56 |   await page.reload();
  57 |   await expect(page.getByText(/Link được ghi nhận trong 45 ngày/)).toBeVisible();
  58 |   // Existing paid bank snapshots must not become the newly edited live bank.
  59 |   await page.getByRole('tab', { name: /^Lịch sử nhận tiền/ }).click();
  60 |   await expect(page.getByText('ACB · 24681357', { exact: true }).first()).toBeVisible();
  61 | 
  62 |   await admin.goto(`${ADMIN_URL}/affiliate`);
  63 |   await admin.getByPlaceholder('Tìm thành viên hoặc affiliate...').fill('Kiều Văn Sơn');
  64 |   const commission = admin
  65 |     .getByRole('row')
  66 |     .filter({ hasText: 'Kiều Văn Sơn' })
  67 |     .filter({ hasText: 'Lê Thu Hà' });
  68 |   await expect(commission).toHaveCount(1);
> 69 |   await commission.getByRole('checkbox').check();
     |                                          ^ Error: locator.check: Clicking the checkbox did not change its state
  70 |   await admin.getByRole('button', { name: 'Hủy', exact: true }).click();
  71 |   const cancel = admin.getByRole('dialog', { name: 'Hủy hoa hồng', exact: true });
  72 |   await expect(cancel.getByRole('button', { name: 'Xác nhận', exact: true })).toBeDisabled();
  73 |   await cancel.getByLabel('Lý do hủy', { exact: true }).fill('Kiểm tra đồng bộ hai ứng dụng');
  74 |   await cancel.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  75 |   await expect(cancel).toHaveCount(0);
  76 |   await page.goto(`${PORTAL_URL}/affiliate`);
  77 |   const cancelled = page.getByRole('row').filter({ hasText: 'Kiều Văn S.' });
  78 |   await expect(cancelled).toContainText('Đã hủy');
  79 |   await expect(cancelled.locator('[title="Kiểm tra đồng bộ hai ứng dụng"]')).toBeVisible();
  80 | });
  81 | 
```