import { execSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { OUT_DIR, REPORT_DIR, RESULTS_DIR, ROOT } from './paths';

interface Row {
  id: string;
  name: string;
  viewport: number;
  diffPct: number;
  size: string;
  mask?: string;
  sha?: string;
}

const MAX = 3;
const STORE = join(REPORT_DIR, 'results.json');

const key = (r: Row) => `${r.id}@${r.viewport}`;
const order = (a: Row, b: Row) => {
  const [pa, pb] = [a.id[0] ?? '', b.id[0] ?? ''];
  const rank = (p: string) => ['A', 'P', 'D'].indexOf(p);
  return rank(pa) - rank(pb) || a.id.localeCompare(b.id) || b.viewport - a.viewport;
};

/**
 * globalTeardown: gộp kết quả lần chạy này vào results.json (giữ dòng cũ khi chạy một phần),
 * sinh results.md; chỉ giữ ảnh diff của dòng chưa đạt.
 */
export default function writeReport() {
  if (!existsSync(RESULTS_DIR)) return;
  const fresh: Row[] = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(RESULTS_DIR, f), 'utf8')) as Row);
  if (!fresh.length) return;

  const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  const store = new Map<string, Row>(
    existsSync(STORE)
      ? (JSON.parse(readFileSync(STORE, 'utf8')) as Row[]).map((r) => [key(r), r])
      : [],
  );
  const diffDir = join(REPORT_DIR, 'diffs');
  mkdirSync(diffDir, { recursive: true });

  for (const r of fresh) {
    store.set(key(r), { ...r, sha });
    const kept = join(diffDir, `${r.id}-${r.viewport}.png`);
    if (r.diffPct <= MAX) rmSync(kept, { force: true });
    else copyFileSync(join(OUT_DIR, `${r.id}-${r.viewport}.diff.png`), kept);
  }
  // kết quả lần này đã gộp; xoá để lần chạy sau không gộp lại dữ liệu cũ
  rmSync(RESULTS_DIR, { recursive: true, force: true });

  const rows = [...store.values()].sort(order);
  writeFileSync(STORE, JSON.stringify(rows, null, 1) + '\n');

  const pass = rows.filter((r) => r.diffPct <= MAX).length;
  const lines = rows.map((r) => {
    const ok = r.diffPct <= MAX;
    const note = r.mask ? ` (che: ${r.mask})` : '';
    return `| ${r.id} | ${r.name}${note} | ${r.viewport} | ${r.diffPct.toFixed(2)}% | ${ok ? '✅ đạt' : '❌ chưa đạt'} | ${r.size} | ${r.sha ?? ''} |`;
  });

  writeFileSync(
    join(REPORT_DIR, 'results.md'),
    [
      '# UI parity — kết quả',
      '',
      `> Sinh tự động bởi \`pnpm parity\` (gộp mọi lần chạy, dữ liệu ở results.json). Ngưỡng ≤ ${MAX}% pixel khác (pixelmatch threshold 0.1). SHA = commit lúc đo dòng đó.`,
      `> Đạt ${pass}/${rows.length} ảnh.`,
      '',
      '| ID | Màn | Viewport | % chênh | Trạng thái | Kích thước | SHA |',
      '|---|---|---|---|---|---|---|',
      ...lines,
      '',
    ].join('\n'),
  );
}
