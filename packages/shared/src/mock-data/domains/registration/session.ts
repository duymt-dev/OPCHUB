import type { Me } from '../../../api';
import { newMemberMe } from '../../auth';
import { mockDb } from '../store';
import { normalizeRegistrationEmail, registeredMockProfiles } from './state';

/** Public session data only; authentication is the Portal mock adapter's job. */
export function registeredMockSession(email: string): Me | undefined {
  const profile = registeredMockProfiles().find(
    (row) => row.email === normalizeRegistrationEmail(email),
  );
  if (!profile) return undefined;
  const fee = mockDb().fees.find((row) => row.userId === profile.id);
  if (!fee) return undefined;
  return {
    ...newMemberMe(profile.email, profile.fullName),
    accountType: profile.accountType,
    status: profile.status,
    membershipFee: {
      status: fee.status,
      validUntil: fee.validUntil,
      amount: fee.amount,
      transferRef: `OPCHUB ${fee.memberCode}`,
    },
  };
}
