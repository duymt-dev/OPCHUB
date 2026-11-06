import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { env } from '../../env';

export function acceptancePrerequisite(
  mode:
    | 'events-list'
    | 'events-portal'
    | 'events-open'
    | 'events-upcoming'
    | 'marketing-summary'
    | 'pending-project',
) {
  if (env.E2E_TARGET !== 'server') return;
  const result = spawnSync(
    'pnpm',
    ['--filter', '@opchub/db', 'exec', 'tsx', 'seed/acceptance-prerequisites.ts', mode],
    {
      cwd: fileURLToPath(new URL('../../..', import.meta.url)),
      shell: process.platform === 'win32',
      windowsHide: true,
      encoding: 'utf8',
    },
  );
  if (result.status !== 0)
    throw new Error(`Acceptance prerequisite ${mode} failed: ${result.stderr}`);
}
