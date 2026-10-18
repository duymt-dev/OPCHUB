/**
 * AUDIT-W1 làn A — chạy 6 kiểm cơ học, in console và ghi bảng vào
 * `coding-packs/audit/W1/work/mechanical.generated.md` (bảng thô, ghi đè mỗi lần chạy).
 * Chạy: packages/db/node_modules/.bin/tsx apps/server/test/audit/run-all.audit.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { runC1 } from './c1-outbox.audit';
import { runC2 } from './c2-links.audit';
import { runC3 } from './c3-body-limit.audit';
import { runC4 } from './c4-transitions.audit';
import { runC5 } from './c5-permissions.audit';
import { runC6 } from './c6-env.audit';
import { abs, type CheckResult, printResult } from './lib.audit';

const FILES = [
  'c1-outbox',
  'c2-links',
  'c3-body-limit',
  'c4-transitions',
  'c5-permissions',
  'c6-env',
];
const esc = (s: string): string => s.replace(/\|/g, '\\|');

const results: CheckResult[] = [runC1(), runC2(), runC3(), runC4(), runC5(), runC6()];
const md: string[] = ['# AUDIT-W1 làn A — kết quả thô (sinh tự động bởi run-all.audit.ts)', ''];
for (const r of results) {
  printResult(r);
  md.push(`## Kiểm ${r.id}: ${r.title}`, '');
  md.push(
    `Lệnh: \`packages/db/node_modules/.bin/tsx apps/server/test/audit/${FILES[r.id - 1] ?? ''}.audit.ts\``,
    '',
  );
  md.push(`Đạt: **${r.pass}** · Không đạt: **${r.fail.length}**`, '');
  if (r.fail.length) {
    md.push('| # | Mức | Vị trí | Mô tả |', '|---|---|---|---|');
    r.fail.forEach((f, i) =>
      md.push(`| ${i + 1} | ${f.sev} | \`${esc(f.where)}\` | ${esc(f.what)} |`),
    );
    md.push('');
  }
  const table = r.notes.filter((n) => n.startsWith('|'));
  const other = r.notes.filter((n) => !n.startsWith('|'));
  if (table.length) md.push(...table, '');
  if (other.length) md.push(...other.map((n) => `- ${n}`), '');
}
const outFile = abs('coding-packs/audit/W1/work/mechanical.generated.md');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, md.join('\n'), 'utf8');
process.stdout.write(`\nĐã ghi ${outFile}\n`);
