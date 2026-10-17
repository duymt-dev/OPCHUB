import type { TestApp } from '../setup/test-app';

/** Helper riêng cho contract `account` (TIP-B61, lane A) */
export const ORIGIN = 'http://localhost:3000';

let n = 0;
export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(n += 1)}@test.opchub.vn`;

/** Giá trị cookie refresh `opchub_rt` trong Set-Cookie */
export function refreshCookie(res: Response): string | undefined {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith('opchub_rt='));
  return raw?.split(';')[0]?.slice('opchub_rt='.length);
}

/** Token đặt lại mật khẩu nằm trong link của mail password_reset mới nhất */
export async function resetTokenOf(t: TestApp, email: string): Promise<string | undefined> {
  const row = await t.prisma.db.mailLog.findFirst({
    where: { to: email, kind: 'password_reset' },
    orderBy: { createdAt: 'desc' },
    select: { bodyHtml: true },
  });
  return /token=([\w-]+)/.exec(row?.bodyHtml ?? '')?.[1];
}
