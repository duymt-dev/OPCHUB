import {
  ONBOARDING_SHORT,
  onboardingAutoRemindBody,
  onboardingAutoRemindTitle,
  type OnboardingAutoRemind,
} from '../../api-domains';
import { members } from '../../fixtures';
import { publishMockNotification } from './notification-runtime';
import { myMockOnboarding } from './onboarding';
import { mockDb } from './store';
import type { MockDb } from './store-types';
import { iso, MOCK_NOW } from './util';

const VN_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** Ngày theo giờ Việt Nam (UTC+7) — như server `vnDayStart` */
const vnDay = (ms: number) => Math.floor((ms + VN_OFFSET_MS) / DAY_MS);

/**
 * userId → ngày VN đã tự nhắc; gắn với MockDb hiện tại nên `resetMockDb()` về seed. Seed: TK demo đã mở Portal
 * trong ngày demo (`MOCK_NOW`) → chuông demo giữ như prototype (Q-V42-708-1); TK mới đăng ký thì được nhắc.
 */
const days = new WeakMap<MockDb, Map<string, number>>();
const seeded = () => new Map(members.map((m) => [m.id, vnDay(MOCK_NOW)]));

/**
 * D-100 / D-115 (prototype v4.2 `_obAutoRemind`): `POST /me/onboarding/auto-remind` — còn thiếu bước và chưa nhắc
 * trong ngày VN → một thông báo `system` link Dashboard (không email). NĐT / đủ 8 bước → `reminded: false`.
 */
export function autoRemindMockOnboarding(userId: string, now = MOCK_NOW): OnboardingAutoRemind {
  const db = mockDb();
  const state = myMockOnboarding(userId);
  if (!state || state.done >= state.total) return { reminded: false };
  let seen = days.get(db);
  if (!seen) {
    seen = seeded();
    days.set(db, seen);
  }
  if (seen.get(userId) === vnDay(now)) return { reminded: false };
  seen.set(userId, vnDay(now));
  const missing = state.steps.filter((s) => !s.done).map((s) => ONBOARDING_SHORT[s.key]);
  publishMockNotification(db, userId, {
    id: `onb-auto-${userId}-${vnDay(now)}`,
    type: 'system',
    title: onboardingAutoRemindTitle(state.total - state.done),
    body: onboardingAutoRemindBody(missing.join(', ')),
    link: '/dashboard',
    read: false,
    createdAt: iso(now),
  });
  return { reminded: true };
}
