import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Page } from '../../server/test';
import { onServer } from '../../server/api';

/** Prerequisite only; both lanes subsequently execute and assert the same real login. */
export async function expireDemoLock(page: Page) {
  if (!onServer) {
    await page.clock.setSystemTime(new Date(Date.now() + 2 * 86_400_000));
    return;
  }
  const result = spawnSync(
    'pnpm',
    ['--filter', '@opchub/db', 'exec', 'tsx', 'seed/expired-lock.ts'],
    {
      cwd: fileURLToPath(new URL('../../..', import.meta.url)),
      shell: process.platform === 'win32',
      windowsHide: true,
      encoding: 'utf8',
    },
  );
  if (result.status !== 0) throw new Error(`Expired-lock fixture failed: ${result.stderr}`);
}
