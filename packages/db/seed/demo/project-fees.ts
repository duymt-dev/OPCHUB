import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import { buildFees, buildProjects, DAY_MS, MOCK_NOW } from '@opchub/shared/mock-domains';
import { TRIAL_DAYS } from '@opchub/shared';
import type { DbTx } from '../../src/client';
import { requireUserId } from './people';

/** Explicit project-browser dataset: MSW virtual owners represent eligible new members. */
export function projectDemoFees(now: Date) {
  const guests = [...new Set(buildProjects().map((p) => requireUserId(p.ownerName)))].filter((id) =>
    id.startsWith('g-'),
  );
  const expiring = buildFees(false).find((f) => f.userId === 'm3');
  if (!expiring?.validUntil) throw new Error('Missing expiring demo fee');
  return {
    guests: guests.map((userId) => ({
      userId,
      status: 'trial' as const,
      plan: 'personal' as const,
      amount: PRICE_DEFAULTS.per.y,
      validUntil: new Date(now.getTime() + TRIAL_DAYS * DAY_MS),
    })),
    // Preserve the fixture's expiring interval, not an October date that has already passed.
    expiringUntil: new Date(now.getTime() + Date.parse(expiring.validUntil) - MOCK_NOW),
  };
}

export async function seedProjectDemoFees(tx: DbTx, now = new Date()): Promise<void> {
  const data = projectDemoFees(now);
  await tx.membershipFee.createMany({ data: data.guests, skipDuplicates: true });
  await tx.membershipFee.updateMany({
    where: { userId: 'm3', status: 'expiring' },
    data: { validUntil: data.expiringUntil },
  });
}
