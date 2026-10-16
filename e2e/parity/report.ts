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
}

const MAX = 3;

/** globalTeardown: gộp kết quả từng ảnh thành results.md; chỉ chép ảnh diff của dòng chưa đạt */
export default function writeReport() {
  if (!existsSync(RESULTS_DIR)) return;
  const rows: Row[] = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(RESULTS_DIR, f), 'utf8')) as Row)
    .sort((a, b) => a.id.localeCompare(b.id) || b.viewport - a.viewport);
  if (!rows.length) return;

  const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  const diffDir = join(REPORT_DIR, 'diffs');
  mkdirSync(diffDir, { recursive: true });

  const lines = rows.map((r) => {
    const ok = r.diffPct <= MAX;
    const kept = join(diffDir, `${r.id}-${r.viewport}.png`);
    if (ok) rmSync(kept, { force: true });
    else copyFileSync(join(OUT_DIR, `${r.id}-${r.viewport}.diff.png`), kept);
    return `| ${r.id} | ${r.name} | ${r.viewport} | ${r.diffPct.toFixed(2)}% | ${ok ? '✅ đạt' : '❌ chưa đạt'} | ${r.size} | ${sha} |`;
  });

  writeFileSync(
    join(REPORT_DIR, 'results.md'),
    [
      '# UI parity — kết quả',
      '',
      `> Sinh tự động bởi \`pnpm parity\`. Ngưỡng ≤ ${MAX}% pixel khác (pixelmatch threshold 0.1). SHA = commit đã chụp.`,
      '',
      '| ID | Màn | Viewport | % chênh | Trạng thái | Kích thước | SHA |',
      '|---|---|---|---|---|---|---|',
      ...lines,
      '',
    ].join('\n'),
  );
}
