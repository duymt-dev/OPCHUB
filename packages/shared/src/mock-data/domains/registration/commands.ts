import { registerBusinessSchema, registerPersonalSchema, type Me } from '../../../api';
import { newMemberMe } from '../../auth';
import { attachMockAffiliate } from '../affiliate';
import { joinOnRegister } from '../ops-community';
import { mockDb } from '../store';
import { businessRegistrationProfile, personalRegistrationProfile } from './profile';
import { requestRegistrationMail } from './mail';
import { normalizeRegistrationEmail, registrationState } from './state';
import type { PendingRegistration } from './schema';
import { publicPersonalRegistrationSchema, publicBusinessRegistrationSchema } from './schema';

const OTP_TTL = 600000;
const PENDING_TTL = 1800000;
export function beginMockRegistration(
  kind: 'personal' | 'business',
  input: unknown,
  now = Date.now(),
) {
  let pending: PendingRegistration;
  if (kind === 'personal') {
    const data = registerPersonalSchema.parse(input);
    pending = {
      profile: personalRegistrationProfile(data, now),
      groupIds: [...new Set(data.groupIds)],
      metadata: { accountType: 'personal', input: publicPersonalRegistrationSchema.parse(data) },
      ...(data.referralCode ? { referralCode: data.referralCode } : {}),
      expiresAt: now + PENDING_TTL,
      otpExpiresAt: now + OTP_TTL,
    };
  } else {
    const data = registerBusinessSchema.parse(input);
    pending = {
      profile: businessRegistrationProfile(data, now),
      groupIds: [...new Set(data.groupIds)],
      metadata: { accountType: 'business', input: publicBusinessRegistrationSchema.parse(data) },
      ...(data.referralCode ? { referralCode: data.referralCode } : {}),
      expiresAt: now + PENDING_TTL,
      otpExpiresAt: now + OTP_TTL,
    };
  }
  registrationState().pending.set(pending.profile.email, pending);
  requestRegistrationMail('otp', pending.profile.email, pending.profile.fullName, now);
}

export function pendingMockRegistration(email: string, now = Date.now()) {
  const row = registrationState().pending.get(normalizeRegistrationEmail(email));
  return row && row.expiresAt > now ? row : undefined;
}

export function resendMockRegistration(email: string, now = Date.now()): boolean {
  const pending = pendingMockRegistration(email, now);
  if (!pending) return false;
  pending.otpExpiresAt = now + OTP_TTL;
  requestRegistrationMail('otp', pending.profile.email, pending.profile.fullName, now);
  return true;
}

/** Runs within the same existing mock lease as profile/fee/group/mail changes. */
export function activateMockRegistration(email: string, now = Date.now()): Me | undefined {
  const pending = pendingMockRegistration(email, now);
  if (!pending || pending.otpExpiresAt <= now) return undefined;
  const profile = { ...pending.profile, createdAt: new Date(now).toISOString() };
  const me: Me = {
    ...newMemberMe(profile.email, profile.fullName),
    accountType: profile.accountType,
  };
  attachMockAffiliate(me, pending.referralCode);
  joinOnRegister(me.id, me.fullName, pending.groupIds);
  registrationState().profiles.set(me.id, profile);
  registrationState().metadata.set(me.id, pending.metadata);
  mockDb().userStatus.set(me.id, 'active');
  registrationState().pending.delete(profile.email);
  requestRegistrationMail('welcome', profile.email, profile.fullName, now);
  return me;
}
