# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: behavior\affiliate-agent-creation.spec.ts >> AT-AF01 first confirmed fee creates one automatic agent visible to Admin after F5
- Location: behavior\affiliate-agent-creation.spec.ts:7:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/register\?ref=HAOPC$/
Received string:  "http://localhost:3236/r/HAOPC"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × locator resolved to <html lang="vi">…</html>
       - unexpected value "http://localhost:3236/r/HAOPC"

```

```yaml
- alert
```

# Test source

```ts
  1  | import { expect, type Page } from '../../server/test';
  2  | import { onServer, payFee } from '../../server/api';
  3  | import { PORTAL_URL } from '../../urls';
  4  | 
  5  | export async function registerReferral(page: Page) {
  6  |   const email = `affiliate-${Date.now()}@test.vn`;
  7  |   await page.goto(`${PORTAL_URL}/r/HAOPC`);
> 8  |   await expect(page).toHaveURL(/\/register\?ref=HAOPC$/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  9  |   await page.getByRole('button', { name: /^Cá nhân/ }).click();
  10 |   await expect(page.getByPlaceholder('VD: OPCAN26')).toHaveValue('HAOPC');
  11 |   await expect(page.getByText('✓ Được giới thiệu bởi Lê Thu Hà', { exact: true })).toBeVisible();
  12 |   await page.getByPlaceholder('Nguyễn Văn An').fill('Nguyễn Affiliate Trà My');
  13 |   const checked = page.waitForResponse(
  14 |     (r) => r.url().includes('/affiliate/codes/HAOPC?email=') && r.ok(),
  15 |   );
  16 |   await page.getByPlaceholder('ban@congty.vn').fill(email);
  17 |   await page.getByRole('radio', { name: /Chuyên gia/ }).click();
  18 |   await page.getByText(/không hoàn lại sau khi thanh toán/).click();
  19 |   await checked;
  20 |   await expect(page.getByText('✓ Được giới thiệu bởi Lê Thu Hà', { exact: true })).toBeVisible();
  21 |   await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  22 |   await expect(page.getByRole('dialog', { name: 'Xác thực email' })).toBeVisible();
  23 |   await page.getByLabel('Mã OTP').fill('123456');
  24 |   await page.getByRole('button', { name: 'Xác nhận & kích hoạt tài khoản' }).click();
  25 |   await expect(page).toHaveURL(/\/community$/);
  26 |   const welcome = page.getByRole('dialog', { name: 'Đã gửi email chào mừng' });
  27 |   await expect(welcome).toBeVisible({ timeout: 20_000 });
  28 |   await welcome.getByRole('button', { name: 'Đóng', exact: true }).click();
  29 |   return email;
  30 | }
  31 | 
  32 | export async function payAndOpenAffiliate(page: Page) {
  33 |   await page.getByRole('button', { name: /Đăng ký thành viên ngay/ }).click();
  34 |   await expect(page).toHaveURL(/\/membership\/pay$/);
  35 |   await page.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true }).click();
  36 |   // Same bank-event precondition: MSW schedules its fake webhook; native uses FakeBank.
  37 |   if (onServer) await payFee(page, { reload: false });
  38 |   await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
  39 |   await page.getByRole('link', { name: 'Affiliate', exact: true }).click();
  40 |   await expect(
  41 |     page.getByRole('heading', {
  42 |       name: 'Giới thiệu thành viên mới, nhận 20% hoa hồng',
  43 |     }),
  44 |   ).toBeVisible({ timeout: 20_000 });
  45 | }
  46 | 
  47 | export async function ownerSignIn(page: Page) {
  48 |   await page.locator('button[data-m="me"]').click();
  49 |   const loggedOut = page.waitForResponse((r) => r.url().endsWith('/auth/logout') && r.ok());
  50 |   await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
  51 |   await loggedOut;
  52 |   await expect(page).toHaveURL(/\/login$/);
  53 |   await page.locator('input[type=email]').fill('ha.le@opcmedia.vn');
[redacted]
  55 |   await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  56 |   await expect(page).toHaveURL(/\/dashboard$/);
  57 |   await expect(page.getByRole('dialog', { name: 'Đã gửi email chào mừng' })).toHaveCount(0);
  58 |   await page.getByRole('link', { name: 'Affiliate', exact: true }).click();
  59 | }
  60 | 
```