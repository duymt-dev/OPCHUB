import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';

/** G3a — P-49 → P-54, P-16: Sự kiện sắp tới (app mới, MSW) */

const SEARCH = 'Tìm sự kiện theo tên, địa điểm...';
const MEETUP = 'OPC Meetup #12 – Vận hành doanh nghiệp một mình';

const toast = (page: Page) =>
  page.getByRole('status').filter({ visible: true, hasNot: page.locator('*') });
const card = (page: Page, title: string) =>
  page.locator('article').filter({ has: page.getByRole('button', { name: title, exact: true }) });

async function login(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill('an.nguyen@mediasoft.vn');
  await page.locator('input[type=password]').fill('User@2026');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function openEvents(page: Page) {
  await login(page);
  await page.locator('aside').getByRole('link', { name: 'Sự kiện sắp tới', exact: true }).click();
  await expect(page.getByText('SỰ KIỆN NỔI BẬT')).toBeVisible();
}

test.describe('Sự kiện', () => {
  test('lọc chip + tìm ghi vào URL, rỗng có thông báo', async ({ page }) => {
    await openEvents(page);
    await expect(page.getByText('5 / 5 sự kiện')).toBeVisible();
    await page.getByRole('radio', { name: 'Đã đăng ký' }).click();
    await expect(page).toHaveURL(/filter=mine/);
    await expect(page.locator('article')).toHaveCount(1);
    await expect(page.locator('article')).toContainText('Workshop: Tự động hoá bán hàng bằng AI');
    await page.getByRole('radio', { name: 'Online' }).click();
    await expect(page.locator('article')).toHaveCount(2);
    await page.getByRole('radio', { name: 'Tất cả' }).click();
    await page.getByPlaceholder(SEARCH).fill('zzzz');
    await expect(page.getByText('Không có sự kiện phù hợp.')).toBeVisible();
    await expect(page).toHaveURL(/q=zzzz/);
    // Sang màn khác rồi Back: lọc/tìm đọc lại từ URL
    await page.locator('aside').getByText('Dashboard', { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goBack();
    await expect(page.getByPlaceholder(SEARCH)).toHaveValue('zzzz');
  });

  test('đăng ký → toast + số chỗ tăng + thông báo; huỷ → về như cũ', async ({ page }) => {
    await openEvents(page);
    const c = card(page, MEETUP);
    await c.getByRole('button', { name: 'Đăng ký tham gia' }).click();
    await expect(toast(page)).toHaveText('Đăng ký thành công – email xác nhận đã được gửi');
    await expect(c).toContainText('55/80');
    await page.getByRole('button', { name: 'Thông báo' }).click();
    await expect(page.getByText(`Đã đăng ký: ${MEETUP}`)).toBeVisible();
    await page.keyboard.press('Escape');
    await c.getByRole('button', { name: 'Huỷ đăng ký' }).click();
    await expect(toast(page)).toHaveText('Đã huỷ đăng ký');
    await expect(c).toContainText('54/80');
  });

  test('chi tiết có URL /events/:id, bản đồ cho offline, Esc đóng', async ({ page }) => {
    await openEvents(page);
    await card(page, MEETUP).getByRole('button', { name: 'Chi tiết' }).click();
    const dialog = page.getByRole('dialog', { name: MEETUP });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/events\/e1$/);
    await expect(dialog.getByText('Tầng 5, 18 Tam Trinh, Hai Bà Trưng, Hà Nội')).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Chỉ đường ↗' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/events$/);

    // Online: không có bản đồ
    await card(page, 'AMA: Thuế & kế toán cho công ty TNHH MTV')
      .getByRole('button', { name: 'Chi tiết' })
      .click();
    await expect(page).toHaveURL(/\/events\/e3$/);
    await expect(page.getByRole('link', { name: 'Chỉ đường ↗' })).toHaveCount(0);
  });

  test('EV-R01 AT-EV01 AT-EV02 REQ-344 link Meet chỉ hiện sau khi đăng ký; đăng ký xong thấy ngay', async ({
    page,
  }) => {
    await openEvents(page);
    // An đã đăng ký Workshop (e2) → thấy phòng họp
    await card(page, 'Workshop: Tự động hoá bán hàng bằng AI')
      .getByRole('button', { name: 'Chi tiết' })
      .click();
    const mine = page.getByRole('dialog', { name: 'Workshop: Tự động hoá bán hàng bằng AI' });
    await expect(mine.getByText('Phòng họp trực tuyến (Google Meet)')).toBeVisible();
    await expect(
      mine.getByRole('link', { name: /^meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/ }),
    ).toBeVisible();
    await expect(mine.getByRole('button', { name: 'Vào phòng họp' })).toBeVisible();
    await mine.getByRole('button', { name: 'Sao chép' }).click();
    await expect(toast(page)).toHaveText('Đã sao chép link phòng họp');
    await page.keyboard.press('Escape');

    // Chưa đăng ký (e1) → chỉ ghi chú, không có link
    await card(page, MEETUP).getByRole('button', { name: 'Chi tiết' }).click();
    const d = page.getByRole('dialog', { name: MEETUP });
    await expect(
      d.getByText('Link phòng họp Google Meet hiển thị sau khi bạn đăng ký tham gia.'),
    ).toBeVisible();
    await expect(d.getByRole('link', { name: /meet\.google\.com/ })).toHaveCount(0);
    await d.getByRole('button', { name: 'Đăng ký tham gia' }).click();
    await expect(d.getByRole('button', { name: 'Vào phòng họp' })).toBeVisible();
    await expect(d.getByRole('link', { name: /^meet\.google\.com\// })).toBeVisible();
    // AT-EV02: thông báo "Đã đăng ký" kèm link phòng họp
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Thông báo' }).click();
    await expect(
      page.getByText(/^Link phòng họp: meet\.google\.com\/[a-z-]+ · Chúng tôi sẽ nhắc bạn/).first(),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await card(page, MEETUP).getByRole('button', { name: 'Chi tiết' }).click();
    await d.getByRole('button', { name: 'Huỷ đăng ký' }).click();
    await expect(
      d.getByText('Link phòng họp Google Meet hiển thị sau khi bạn đăng ký tham gia.'),
    ).toBeVisible();
  });

  test('hết chỗ: nút "Hết chỗ" không đăng ký được (P-54)', async ({ page }) => {
    await openEvents(page);
    const c = card(page, 'Demo Day – Dự án cộng đồng Q4');
    // aria-disabled: bấm vẫn nhận sự kiện nhưng không đăng ký
    await c.getByRole('button', { name: 'Hết chỗ' }).click({ force: true });
    await expect(toast(page)).toHaveCount(0);
    await expect(c).toContainText('120/120');
    await c.getByRole('button', { name: 'Chi tiết' }).click();
    const dialog = page.getByRole('dialog', { name: 'Demo Day – Dự án cộng đồng Q4' });
    await expect(dialog.getByRole('button', { name: 'Hết chỗ' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await dialog.getByRole('button', { name: 'Đóng' }).click();
    await expect(dialog).toBeHidden();
  });

  test('BUG-011 card dùng coverUrl của API (chưa có → ảnh mặc định tự host)', async ({ page }) => {
    const list = page.waitForResponse((r) => /\/v1\/events(\?|$)/.test(r.url()) && r.ok());
    await openEvents(page);
    const body = (await (await list).json()) as {
      items: { title: string; coverUrl: string | null }[];
    };
    const ev = body.items.find((e) => e.title === MEETUP);
    const img = card(page, MEETUP).locator('img').first();
    await expect(img).toHaveAttribute('src', ev?.coverUrl ?? '/images/cover-default.svg');
    const srcs = await page
      .locator('img')
      .evaluateAll((els) => els.map((e) => e.getAttribute('src') ?? ''));
    expect(srcs.filter((s) => /unsplash|picsum/.test(s))).toEqual([]);
  });
});
