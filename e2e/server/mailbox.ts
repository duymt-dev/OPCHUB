import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { env } from '../env';

/**
 * TD-035: hộp thư giả của e2e server — FakeMailProvider (worker) ghi mỗi thư thành
 * `<FAKE_MAIL_DIR>/<email>/<epochMs>-<messageId>.json`. Không lưu token trong DB, không có
 * endpoint HTTP đọc thư: test đọc thẳng thư mục trên đĩa (cùng máy với worker).
 */

const mailSchema = z.object({
  to: z.string(),
  subject: z.string(),
  html: z.string(),
  sentAt: z.string(),
});

/** Như `mailboxDirName` của adapter: chữ thường, ký tự ngoài `[a-z0-9._@+-]` → `_` */
const dirOf = (email: string) =>
  email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._@+-]/g, '_')
    .replace(/^\.+/, '_');

const POLL_MS = 250;

async function newest(email: string, since: number): Promise<string | null> {
  if (!env.FAKE_MAIL_DIR) throw new Error('Thiếu FAKE_MAIL_DIR — xem e2e/server/README.md');
  const dir = join(env.FAKE_MAIL_DIR, dirOf(email));
  const files = await readdir(dir).catch(() => [] as string[]);
  const sorted = files.filter((f) => f.endsWith('.json')).sort((a, b) => b.localeCompare(a));
  for (const f of sorted) {
    const m = mailSchema.parse(JSON.parse(await readFile(join(dir, f), 'utf8')));
    if (Date.parse(m.sentAt) >= since) return m.html;
  }
  return null;
}

/** Thư mới nhất gửi tới `email` có `sentAt >= since` (poll tới `timeoutMs`); trả `html` */
export async function lastMailTo(
  email: string,
  { since, timeoutMs = 10_000 }: { since: number; timeoutMs?: number },
): Promise<string> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const html = await newest(email, since);
    if (html !== null) return html;
    if (Date.now() > end) throw new Error(`Không có thư mới tới ${email} sau ${timeoutMs}ms`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

/** href đầu tiên trong thư chứa `path` (VD `/reset-password`); `&amp;` được giải mã */
export function linkFrom(html: string, path: string): string {
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = (m[1] ?? '').replace(/&amp;/g, '&');
    if (href.includes(path)) return href;
  }
  throw new Error(`Thư không có link chứa ${path}`);
}
