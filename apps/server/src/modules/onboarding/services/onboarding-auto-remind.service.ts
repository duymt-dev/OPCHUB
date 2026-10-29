import { Injectable } from '@nestjs/common';
import {
  ONBOARDING_SHORT,
  onboardingAutoRemindBody,
  onboardingAutoRemindTitle,
} from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationService } from '@/modules/notification';
import { OnboardingService } from './onboarding.service';

const TOTAL = 8;
const VN_OFFSET_MS = 7 * 3_600_000;

/** 00:00 hôm nay theo giờ Việt Nam (UTC+7, không DST) ở dạng UTC */
export const vnDayStart = (now: Date): Date => {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - VN_OFFSET_MS);
};

/**
 * D-100 / D-115 (prototype v4.2 `_obAutoRemind`): lần mở Portal đầu tiên trong ngày VN, còn thiếu bước
 * khởi đầu → thông báo trong app (không email), tối đa 1 lần / ngày / người. Khoá theo người chống hai tab.
 */
@Injectable()
export class OnboardingAutoRemindService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onboarding: OnboardingService,
    private readonly notifications: NotificationService,
  ) {}

  async remind(userId: string, now = new Date()): Promise<boolean> {
    const state = await this.onboarding.mine(userId);
    if (!state || state.done >= TOTAL) return false;
    const missing = state.steps.filter((s) => !s.done).map((s) => ONBOARDING_SHORT[s.key]);
    const id = await this.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`onb-auto:${userId}`}))`;
      const today = await tx.onboardingReminder.findFirst({
        where: { userId, kind: 'auto', sentAt: { gte: vnDayStart(now) } },
        select: { id: true },
      });
      if (today) return null;
      const r = await tx.onboardingReminder.create({
        data: { userId, kind: 'auto', sentAt: now },
        select: { id: true },
      });
      return r.id;
    });
    if (!id) return false;
    // ID thông báo = ID lần nhắc → gọi lại không nhân bản
    await this.notifications.notify([
      {
        id,
        userId,
        type: 'system',
        title: onboardingAutoRemindTitle(TOTAL - state.done),
        body: onboardingAutoRemindBody(missing.join(', ')),
        link: '/dashboard',
      },
    ]);
    return true;
  }
}
