import type { RenewalMilestone, RenewalSettings } from '../api-domains/renewal';

export const RENEWAL_MILESTONES = ['D30', 'D7', 'D1'] as const;
const vnDay = (d: Date) => Math.floor((d.getTime() + 7 * 3_600_000) / 86_400_000);
export const renewalDaysLeft = (until: Date, now: Date) => vnDay(until) - vnDay(now);

/** Choose only the current window; disabled/sent windows never fall back to an earlier one. */
export function nextRenewalMilestone(
  daysLeft: number,
  enabled: RenewalSettings['milestones'],
): RenewalMilestone | null {
  if (daysLeft <= 0 || daysLeft > 30) return null;
  const m = daysLeft === 1 ? 'D1' : daysLeft <= 7 ? 'D7' : 'D30';
  return enabled[m === 'D1' ? 'd1' : m === 'D7' ? 'd7' : 'd30'] ? m : null;
}

export function renewalMilestoneOf(
  validUntil: Date,
  now: Date,
  enabled: RenewalSettings['milestones'],
  sent: ReadonlySet<string> = new Set(),
): RenewalMilestone | null {
  const m = nextRenewalMilestone(renewalDaysLeft(validUntil, now), enabled);
  return m && !sent.has(m) ? m : null;
}
