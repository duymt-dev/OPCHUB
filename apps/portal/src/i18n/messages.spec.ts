import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, it } from 'vitest';
import { balanced, hasVietnamese, leaves, tokens } from './message-check';
import { BUNDLES } from './locales';
import { NAMESPACES, messages } from './messages';

const ROOT = join(__dirname, '../../messages');
/** Chuỗi được phép giống tiếng Việt ở bản dịch (tên riêng, mã…): `<ns>.<key>` */
const SAME_OK = new Set<string>([]);

const read = (bundle: string, ns: string): unknown => {
  try {
    return JSON.parse(readFileSync(join(ROOT, bundle, `${ns}.json`), 'utf8')) as unknown;
  } catch {
    return undefined;
  }
};

/** Bộ dịch đã có thư mục — bộ chưa dịch không chạy (Bước 3 thêm dần) */
const present = BUNDLES.filter((b) => b !== 'vi' && readdirSync(ROOT).includes(b));

describe('messages (D-65)', () => {
  it('tiếng Việt: mọi chuỗi parse được bằng ICU', () => {
    for (const ns of NAMESPACES) {
      for (const [k, v] of leaves(messages[ns])) {
        expect(() => new IntlMessageFormat(v, 'vi'), `${ns}.${k}`).not.toThrow();
      }
    }
  });

  describe.each(present)('bộ %s', (bundle) => {
    it.each(NAMESPACES)(
      '%s: đủ khoá, giữ biến/thẻ, ICU hợp lệ, không rỗng, không quên dịch',
      (ns) => {
        const vi = leaves(messages[ns]);
        const tr = leaves(read(bundle, ns));
        expect([...tr.keys()].sort(), `${bundle}/${ns}.json khoá`).toEqual([...vi.keys()].sort());
        for (const [k, src] of vi) {
          const v = tr.get(k) ?? '';
          const at = `${bundle}/${ns}.${k}`;
          expect(v.trim(), `${at} rỗng`).not.toBe('');
          expect(tokens(v), `${at} biến/thẻ`).toEqual(tokens(src));
          expect(balanced(v), `${at} ngoặc`).toBe(true);
          expect(() => new IntlMessageFormat(v, bundle), `${at} ICU`).not.toThrow();
          if (hasVietnamese(src) && !SAME_OK.has(`${ns}.${k}`)) {
            expect(v, `${at} chưa dịch`).not.toBe(src);
          }
        }
      },
    );
  });
});
