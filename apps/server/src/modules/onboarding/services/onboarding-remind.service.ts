import { Inject, Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import {
  ONBOARDING_MAIL_DEFAULT,
  ONBOARDING_MESSAGES,
  ONBOARDING_SHORT,
  type OnboardingKey,
  type OnboardingMail,
  onboardingMailSchema,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { ENV, type Env } from '@/common/config';
import { AppError, conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OutboxService } from '@/common/outbox';
import { layout, MailService } from '@/modules/mail';
import { NotificationService } from '@/modules/notification';
import { OnboardingService } from './onboarding.service';

const DAY_SEC = 24 * 3600;
const MAIL_KEY = 'onboarding_mail';

export interface RemindActor {
  id: string;
  ip: string | null;
}

const missingText = (keys: readonly string[]) =>
  keys.map((k) => ONBOARDING_SHORT[k as OnboardingKey] ?? k).join(', ');

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Thay biến `{{ten}}`, `{{con_thieu}}`, `{{link}}` của mẫu tạm (D-88) */
export function renderOnboardingMail(
  tpl: OnboardingMail,
  name: string,
  missing: string,
  link: string,
) {
  const fill = (s: string) =>
    s.replaceAll('{{ten}}', name).replaceAll('{{con_thieu}}', missing).replaceAll('{{link}}', link);
  const text = fill(tpl.body);
  const body = text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replaceAll('\n', '<br>')}</p>`)
    .join('');
  return { subject: fill(tpl.subject), html: layout(fill(tpl.subject), body), text };
}

/**
 * D-88 Admin › Thành viên › "Nhắc": ≤ 1 lần / 24 giờ / thành viên; ghi nhắc + audit + outbox trong một
 * transaction; consumer gửi thông báo trong app + email theo mẫu tạm (Admin sửa ở Email tự động).
 */
@Injectable()
export class OnboardingRemindService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onboarding: OnboardingService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly mail: MailService,
    private readonly notifications: NotificationService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async remind(actor: RemindActor, userId: string): Promise<void> {
    const state = (await this.onboarding.forAdmin([userId])).get(userId);
    if (!state) throw notFound('Không tìm thấy thành viên');
    if (!state.missing.length) throw conflict(ONBOARDING_MESSAGES.remindDone);
    await this.prisma.db.$transaction(async (tx) => {
      // Khoá theo thành viên để hai Admin bấm cùng lúc không nhắc hai lần
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`onb-remind:${userId}`}))`;
      const recent = await tx.onboardingReminder.findFirst({
        where: { userId, kind: 'admin', sentAt: { gt: new Date(Date.now() - DAY_SEC * 1000) } },
        select: { id: true },
      });
      if (recent)
        throw new AppError('RATE_LIMITED', ONBOARDING_MESSAGES.remindTooSoon, undefined, DAY_SEC);
      const r = await tx.onboardingReminder.create({
        data: { userId, kind: 'admin', sentBy: actor.id },
        select: { id: true },
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'member.onboarding_remind',
        entity: 'user',
        entityId: userId,
        tag: 'member',
        summary: `Nhắc hoàn tất hướng dẫn bắt đầu · còn thiếu: ${missingText(state.missing)}`,
        ip: actor.ip,
      });
      await this.outbox.add(tx, 'onboarding.reminded', {
        userId,
        missing: state.missing,
        reminderId: r.id,
      });
    });
  }

  /** Consumer `onboarding.reminded`: thông báo (ID ổn định → retry không nhân bản) + email */
  async deliver(p: { userId: string; missing: string[]; reminderId: string }): Promise<void> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: p.userId },
      select: { email: true, fullName: true },
    });
    if (!user) return;
    const missing = missingText(p.missing);
    const link = `${this.env.PORTAL_URL}/dashboard`;
    await this.notifications.notify([
      {
        id: p.reminderId,
        userId: p.userId,
        type: 'system',
        title: ONBOARDING_MESSAGES.remindTitle,
        body: `Còn thiếu: ${missing}`,
        link: '/dashboard',
      },
    ]);
    // Email gửi ngay trong cùng transaction với dấu "đã gửi" của lần nhắc (retry không gửi lại)
    const tpl = await this.template();
    const m = renderOnboardingMail(tpl, user.fullName, missing, link);
    await this.prisma.db.$transaction(async (tx) => {
      const claimed = await tx.onboardingReminder.updateMany({
        where: { id: p.reminderId, mailedAt: null },
        data: { mailedAt: new Date() },
      });
      if (claimed.count)
        await this.mail.request(tx, {
          to: user.email,
          kind: 'onboarding',
          subject: m.subject,
          html: m.html,
        });
    });
  }

  async template(): Promise<OnboardingMail> {
    const row = await this.prisma.db.appSetting.findUnique({
      where: { key: MAIL_KEY },
      select: { value: true },
    });
    const parsed = onboardingMailSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : ONBOARDING_MAIL_DEFAULT;
  }

  async saveTemplate(actor: RemindActor, tpl: OnboardingMail): Promise<OnboardingMail> {
    await this.prisma.db.$transaction(async (tx: DbTx) => {
      const value = tpl as Prisma.InputJsonValue;
      await tx.appSetting.upsert({
        where: { key: MAIL_KEY },
        create: { key: MAIL_KEY, value },
        update: { value },
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'mail.onboarding.update',
        entity: 'app_setting',
        entityId: MAIL_KEY,
        tag: 'settings',
        summary: 'Sửa mẫu email nhắc hoàn tất hướng dẫn bắt đầu',
        ip: actor.ip,
      });
    });
    return tpl;
  }
}
