import {
  DEFAULT_RENEWAL,
  type RenewalMilestone,
  type RenewalSettings,
} from '@opchub/shared/api-domains';
import { RENEWAL_MILESTONES, renewalDaysLeft, renewalMilestoneOf } from '@opchub/shared';

export const FEE_REMINDER_MILESTONES = RENEWAL_MILESTONES;
export type FeeReminderMilestone = RenewalMilestone;
export const REMIND_LOOKAHEAD_DAYS = 31;
export const daysLeft = renewalDaysLeft;
export function dueMilestone(
  validUntil: Date,
  now: Date,
  sent: ReadonlySet<string> = new Set(),
  enabled: RenewalSettings['milestones'] = DEFAULT_RENEWAL.milestones,
): FeeReminderMilestone | null {
  return renewalMilestoneOf(validUntil, now, enabled, sent);
}
