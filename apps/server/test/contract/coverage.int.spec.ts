import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { keyOf, loadContract } from './contract-table';

const DIR = fileURLToPath(new URL('.', import.meta.url));

/** Mọi `ep(t, 'METHOD', '/pattern', …)` khai báo trong các spec contract */
function declared(): Set<string> {
  const out = new Set<string>();
  const re = /\bep\(\s*t\s*,\s*'(GET|POST|PUT|PATCH|DELETE)'\s*,\s*'([^']+)'/g;
  for (const f of readdirSync(DIR)) {
    if (!f.endsWith('.int.spec.ts') || f === 'coverage.int.spec.ts') continue;
    const src = readFileSync(`${DIR}/${f}`, 'utf8');
    for (const m of src.matchAll(re)) if (m[1] && m[2]) out.add(keyOf(m[1], m[2]));
  }
  return out;
}

describe('Contract coverage (TIP-B61)', () => {
  it('bảng api-contract.md có đúng 203 endpoint (216 − 3 duyệt vào nhóm D-71 − 5 NĐT − 4 YC D-72 − 1 ví dụ HH D-70), không trùng', () => {
    const rows = loadContract();
    expect(rows).toHaveLength(203);
    expect(new Set(rows.map((r) => keyOf(r.method, r.path))).size).toBe(203);
  });

  it('mỗi endpoint trong bảng có ≥ 1 lời gọi contract; không gọi endpoint ngoài bảng', () => {
    const want = new Set(loadContract().map((r) => keyOf(r.method, r.path)));
    const got = declared();
    const missing = [...want].filter((k) => !got.has(k)).sort();
    const extra = [...got].filter((k) => !want.has(k)).sort();
    expect(missing, `thiếu ${missing.length}:\n${missing.join('\n')}`).toEqual([]);
    expect(extra, `ngoài bảng:\n${extra.join('\n')}`).toEqual([]);
  });
});
