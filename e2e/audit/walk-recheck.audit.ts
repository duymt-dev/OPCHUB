import { test } from '@playwright/test';
import { ALL_SCENARIOS } from '../parity/registry';
import { stabilize } from '../parity/stabilize';
import { begin } from '../parity/steps';
import type { StepCtx } from '../parity/types';
import { env } from '../env';
import { finding, record, resetDemo } from './lib';

/**
 * AUDIT-W1 · đi qua MỌI màn trong registry parity (205) phía app trên server thật, ở 1440.
 * Không so ảnh: bắt lỗi chạy thật — request 4xx/5xx, lỗi console/pageerror, chữ "Lỗi hệ thống",
 * tràn ngang, bước thao tác hỏng. Kết quả: work/screens.jsonl (+ finding/ảnh khi có vấn đề).
 * Reset dữ liệu demo mỗi 15 màn (thao tác trước có thể đổi dữ liệu).
 */

const SKIP_STATUS = new Set([401]); // refresh token lần đầu là luồng bình thường

test.describe.configure({ mode: 'serial' });

ALL_SCENARIOS.filter((x) => env.WALK_IDS.split(',').includes(x.id)).forEach((s, i) => {
  test(`${s.id} ${s.name}`, async ({ browser }) => {
    void i;
    resetDemo(s.demo === 'affiliate');
    if (s.unreachable) {
      record('screens-recheck', {
        id: s.id,
        name: s.name,
        result: 'BỎ (unreachable)',
        note: s.unreachable,
      });
      return;
    }
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await stabilize(ctx);
    const page = await ctx.newPage();
    const bad: string[] = [];
    page.on('response', (r) => {
      const u = r.url();
      if (!/\/v1\//.test(u) || SKIP_STATUS.has(r.status())) return;
      if (r.status() >= 400)
        bad.push(`${r.request().method()} ${new URL(u).pathname} → ${r.status()}`);
    });
    page.on('pageerror', (e) => bad.push(`pageerror: ${e.message.slice(0, 120)}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()))
        bad.push(`console: ${m.text().slice(0, 120)}`);
    });
    const c: StepCtx = { page, side: 'app', vw: 1440 };
    let stepErr = '';
    try {
      await begin(c, s);
      if (s.steps) await s.steps(c);
      await page.waitForLoadState('networkidle').catch(() => undefined);
    } catch (e) {
      stepErr = e instanceof Error ? (e.message.split('\n')[0] ?? '') : String(e);
    }
    const sysErr = await page
      .getByText(/Lỗi hệ thống/)
      .count()
      .catch(() => 0);
    const w = await page.evaluate(() => document.documentElement.scrollWidth).catch(() => 0);
    if (sysErr) bad.push('hiện "Lỗi hệ thống"');
    if (w > 1442) bad.push(`tràn ngang ${w}px`);
    if (stepErr) bad.push(`bước thao tác hỏng: ${stepErr.slice(0, 160)}`);
    const uniq = [...new Set(bad)];
    record('screens-recheck', {
      id: s.id,
      name: s.name,
      start: s.start,
      result: uniq.length ? 'CÓ VẤN ĐỀ' : 'OK',
      note: uniq.join(' | ').slice(0, 600),
    });
    if (uniq.length)
      await finding(page, test.info(), {
        key: `walk-${s.id}-recheck`,
        area: s.id[0] === 'D' ? 'Admin' : s.id[0] === 'P' ? 'Portal' : 'Auth',
        screen: `${s.id} ${s.name}`,
        sev: 'S3',
        title: `${s.id} ${s.name}: ${uniq[0]?.slice(0, 120)}`,
        expected: 'Màn chạy không lỗi trên server thật',
        actual: uniq.join(' | ').slice(0, 600),
      });
    await ctx.close();
  });
});
