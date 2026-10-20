# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: behavior\affiliate-concurrent.spec.ts >> REQ-308 REQ-410 concurrent tabs preserve both agent writes across origins and reload
- Location: behavior\affiliate-concurrent.spec.ts:16:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('31%', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('31%', { exact: true }) with timeout 5000ms
  - waiting for getByText('31%', { exact: true })

```

```yaml
- alert
- img "OPC HUB ASEAN – One Person Company Hub"
- text: "0 thành viên đang trực tuyến CỘNG ĐỒNG DOANH NGHIỆP MỘT NGƯỜI · ASEAN Kết nối, học hỏi và cùng phát triển với founder khắp ASEAN. Một nền tảng cho founder, freelancer và chuyên gia từ 10 quốc gia: chat nội bộ theo nhóm, sự kiện hằng tuần và dự án công khai. +22 thành viên mới tháng này 65 Thành viên 34 Cộng đồng 0 Sự kiện mỗi năm “Nhờ OPC Hub, mình tìm được kế toán, cộng tác viên và cả khách hàng đầu tiên chỉ trong tháng đầu tham gia.” Lê Minh Anh · Founder LeadPilot · Việt Nam Có mặt tại"
- img "VN"
- img "TH"
- img "ID"
- img "MY"
- img "PH"
- img "SG"
- img "MM"
- img "KH"
- img "LA"
- img "BN"
- text: © 2026 OPC Hub ASEAN Cần hỗ trợ?
- link "Liên hệ":
  - /url: "#"
- button "Tiếng Việt"
- heading "Chào mừng trở lại" [level=1]
- text: Đăng nhập để tiếp tục với cộng đồng OPC Hub ASEAN.
- tablist:
  - tab "Đăng nhập" [selected]
  - tab "Đăng ký"
- text: Email
- textbox "Email":
  - /placeholder: email@domain.com
- text: Mật khẩu
- textbox "Mật khẩu Hiện":
  - /placeholder: Mật khẩu
- button "Hiện"
- checkbox "Ghi nhớ đăng nhập" [checked]
- text: Ghi nhớ đăng nhập
- button "Quên mật khẩu?"
- button "Đăng nhập"
- text: hoặc tiếp tục với
- button "Google"
- button "Facebook"
- button "LinkedIn"
- button "ChatGPT"
- button "Gemini"
- button "DeepSeek"
- text: Điều khoản Bảo mật
```

# Test source

```ts
  1  | import { test, expect, type Page } from '../server/test';
  2  | import { ADMIN_URL, PORTAL_URL } from '../urls';
  3  | import { openAffiliateDetail, signInAffiliate } from './helpers/affiliate-session';
  4  |
  5  | test.use({ affiliateDemo: true });
  6  |
  7  | async function prepareRate(page: Page, code: string, name: string, rate: string) {
  8  |   await signInAffiliate(page, ADMIN_URL, 'admin@opchub.community', 'Admin@2026');
  9  |   await openAffiliateDetail(page, code, name);
  10 |   await page.getByRole('button', { name: 'Sửa (Admin)', exact: true }).click();
  11 |   const dialog = page.getByRole('form', { name: 'Đặt tỷ lệ hoa hồng', exact: true });
  12 |   await dialog.getByRole('spinbutton', { name: 'Tỷ lệ hoa hồng (%)', exact: true }).fill(rate);
  13 |   return dialog;
  14 | }
  15 |
  16 | test('REQ-308 REQ-410 concurrent tabs preserve both agent writes across origins and reload', async ({
  17 |   page,
  18 |   context,
  19 | }) => {
  20 |   const second = await context.newPage();
  21 |   const ha = await prepareRate(page, 'HAOPC', 'Lê Thu Hà', '31');
  22 |   const khoa = await prepareRate(second, 'KHOAOPC', 'Trần Minh Khoa', '33');
  23 |   const firstResponse = page.waitForResponse(
  24 |     (r) => r.request().method() === 'PATCH' && /\/admin\/affiliates\/[^/]+$/.test(r.url()),
  25 |   );
  26 |   const secondResponse = second.waitForResponse(
  27 |     (r) => r.request().method() === 'PATCH' && /\/admin\/affiliates\/[^/]+$/.test(r.url()),
  28 |   );
  29 |   await Promise.all([
  30 |     ha.getByRole('button', { name: 'Lưu', exact: true }).click(),
  31 |     khoa.getByRole('button', { name: 'Lưu', exact: true }).click(),
  32 |   ]);
  33 |   expect((await firstResponse).status()).toBe(200);
  34 |   expect((await secondResponse).status()).toBe(200);
  35 |   await expect(ha).toHaveCount(0);
  36 |   await expect(khoa).toHaveCount(0);
  37 |   await Promise.all([page.reload(), second.reload()]);
> 38 |   await expect(page.getByText('31%', { exact: true })).toBeVisible();
     |                                                        ^ Error: expect(locator).toBeVisible() failed
  39 |   await expect(second.getByText('33%', { exact: true })).toBeVisible();
  40 |
  41 |   const owner = await context.newPage();
  42 |   await signInAffiliate(owner, PORTAL_URL, 'ha.le@opcmedia.vn', 'User@2026');
  43 |   await expect(
  44 |     owner.getByRole('heading', { name: 'Giới thiệu thành viên mới, nhận 31% hoa hồng' }),
  45 |   ).toBeVisible();
  46 |   await page.goto(`${ADMIN_URL}/affiliate?tab=aff`);
  47 |   await page.getByPlaceholder('Tìm tên, mã giới thiệu, email...').fill('KHOAOPC');
  48 |   await expect(page.getByRole('row').filter({ hasText: 'KHOAOPC' })).toContainText('33%');
  49 | });
  50 |
```
