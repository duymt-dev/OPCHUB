import { expect, test } from '../server/test';
import { PORTAL_URL } from '../urls';
import { CASES, msg, setLocale, signIn, title } from './helpers/i18n';

/** TIP-V2-117 / D-65: Portal đa ngôn ngữ — đăng nhập, Dashboard, cookie, định dạng số */

test.describe('Portal đa ngôn ngữ (TIP-V2-117, D-65)', () => {
  for (const [code, bundle] of CASES) {
    test(`AC-1/2 ${code}: đăng nhập + Dashboard theo bộ ${bundle}, <html lang>, tiêu đề tab`, async ({
      page,
    }) => {
      await setLocale(page, code);
      await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      await expect(page).toHaveTitle(title(bundle, 'login'));
      await expect(page.getByText(msg(bundle, 'auth', 'login.remember'))).toBeVisible();

      await signIn(page, bundle);
      await expect(page).toHaveTitle(title(bundle, 'dashboard'));
      // D-89 Dashboard v4: lời chào + "Hướng dẫn bắt đầu" (khối hero cũ đã bỏ ở V4-618)
      await expect(
        page.getByText(msg(bundle, 'onboarding', 'greet.lead'), { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(msg('vi', 'onboarding', 'greet.lead'), { exact: true }),
      ).toHaveCount(0);
    });
  }

  test('AC-3 cookie lạ → tiếng Việt', async ({ page }) => {
    await setLocale(page, 'xx');
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page).toHaveTitle(title('vi', 'login'));
  });

  test('AC-5 en: màn đăng nhập v4 theo bộ en (D-89: không còn khối số liệu)', async ({ page }) => {
    await setLocale(page, 'en');
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Welcome back!', { exact: true })).toBeVisible();
    await expect(page.getByText('Or continue with', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Enter email or phone number')).toBeVisible();
  });

  test('AC-6 chọn English ở màn đăng nhập → đăng nhập → Dashboard tiếng Anh, giữ sau tải lại', async ({
    page,
  }) => {
    await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
    // Nút chọn ngôn ngữ hiện cờ quốc gia đang chọn (thay quả địa cầu)
    const langBtn = (name: RegExp) => page.getByRole('button', { name });
    await expect(langBtn(/Tiếng Việt/).locator('img')).toHaveAttribute('src', /\/vn\.png$/);
    await langBtn(/Tiếng Việt/).click();
    await page.getByRole('option', { name: /Toàn cầu/ }).click();
    await expect(langBtn(/English/).locator('img')).toHaveAttribute('src', /\/gb\.png$/);
    await expect(page.getByText(msg('en', 'auth', 'login.remember'))).toBeVisible();
    await signIn(page, 'en');
    const hero = () => page.getByText(msg('en', 'onboarding', 'greet.lead'), { exact: true });
    await expect(hero()).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(hero()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
