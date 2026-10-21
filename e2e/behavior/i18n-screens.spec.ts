import { expect, test } from '../server/test';
import type { Page } from '../server/test';
import { PORTAL_URL } from '../urls';
import {
  CASES,
  msg,
  scrollWidth,
  setLocale,
  signIn,
  title,
  viLeftovers,
  visibleMatches,
} from './helpers/i18n';

/**
 * TIP-V2-117 AC-1: các màn chính của Portal theo từng ngôn ngữ — tiêu đề tab + tiêu đề màn đúng bản
 * dịch, không sót chuỗi giao diện tiếng Việt, không cuộn ngang ở 1440px / 390px; ảnh chụp mỗi màn.
 */

interface Screen {
  path: string;
  /** khoá `common.meta.*`; `/affiliate` không có tiêu đề tab riêng (giữ "OPC Hub") */
  meta?: string;
  /** [namespace, khoá] của tiêu đề hiển thị trên màn */
  heading: [string, string];
}

const SCREENS: Screen[] = [
  { path: '/community', meta: 'community', heading: ['community', 'page.title'] },
  { path: '/chat', meta: 'chat', heading: ['chat', 'page.title'] },
  { path: '/events', meta: 'events', heading: ['events', 'page.title'] },
  { path: '/projects', meta: 'projects', heading: ['projects', 'page.title'] },
  { path: '/affiliate', heading: ['affiliate', 'title'] },
  { path: '/services', meta: 'services', heading: ['services', 'list.title'] },
  { path: '/profile', meta: 'profile', heading: ['profile', 'page.title'] },
];

/** Khung app — có trên mọi màn */
const SHELL_NS = ['common', 'shell', 'membership'];

const DEMO_NAME = 'Nguyễn Văn An';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

/**
 * Chuỗi vi chưa dịch của chính màn đó (namespace màn + khung). Không quét namespace màn khác: dữ
 * liệu server (vd. lĩnh vực dự án do Admin quản lý — D-65 giữ tiếng Việt) có thể trùng chữ với
 * option của màn khác. Tên TK demo là dữ liệu người dùng, trùng placeholder của `profile`.
 */
const leftoversOf = (bundle: string, s: Screen) =>
  viLeftovers(bundle, [...SHELL_NS, s.heading[0]]).filter((v) => v !== DEMO_NAME);

async function checkScreen(page: Page, bundle: string, s: Screen, width: number) {
  const leftovers = leftoversOf(bundle, s);
  await page.goto(`${PORTAL_URL}${s.path}`, { waitUntil: 'networkidle' });
  const [ns, key] = s.heading;
  await expect(page.getByText(msg(bundle, ns, key), { exact: true }).first()).toBeVisible();
  if (s.meta) await expect(page).toHaveTitle(title(bundle, s.meta));
  expect(await visibleMatches(page, leftovers), `${s.path}: chuỗi tiếng Việt sót`).toEqual([]);
  expect(await scrollWidth(page), `${s.path}: cuộn ngang`).toBeLessThanOrEqual(width);
}

for (const vp of VIEWPORTS) {
  test.describe(`Portal đa ngôn ngữ — màn chính ${vp.name} ${vp.width}px (TIP-V2-117)`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const [code, bundle] of CASES) {
      test(`${code}: Cộng đồng, Chat, Sự kiện, Dự án, Affiliate, Gói dịch vụ, Hồ sơ`, async ({
        page,
      }, info) => {
        await setLocale(page, code);
        await page.goto(`${PORTAL_URL}/login`, { waitUntil: 'networkidle' });
        await signIn(page, bundle);

        for (const s of SCREENS) {
          await test.step(s.path, async () => {
            await checkScreen(page, bundle, s, vp.width);
            await info.attach(`${code}-${vp.name}${s.path.replace('/', '-')}.png`, {
              body: await page.screenshot({ fullPage: false }),
              contentType: 'image/png',
            });
          });
        }

        // Thao tác chính: đổi tab Hồ sơ → nội dung tab Bảo mật theo bản dịch
        await page.getByRole('tab', { name: msg(bundle, 'profile', 'tabs.security') }).click();
        await expect(
          page.getByRole('tab', { name: msg(bundle, 'profile', 'tabs.security') }),
        ).toHaveAttribute('aria-selected', 'true');
        expect(await visibleMatches(page, leftoversOf(bundle, SCREENS.at(-1)!))).toEqual([]);
      });
    }
  });
}
