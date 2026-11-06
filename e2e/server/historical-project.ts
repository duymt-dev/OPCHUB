import type { Page } from './test';
import { env } from '../env';
import { acceptancePrerequisite } from '../behavior/helpers/acceptance-prerequisites';

/** Badge coverage for historical moderation data, never the D108 create workflow. */
export async function addHistoricalPendingProject(page: Page): Promise<void> {
  if (env.E2E_TARGET === 'server') {
    acceptancePrerequisite('pending-project');
    return;
  }
  await page.evaluate(async () => {
    await fetch('/v1/__mock/projects/submit', { method: 'POST' });
  });
}
