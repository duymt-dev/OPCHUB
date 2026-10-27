import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { type WelcomeMailPreview, welcomeMailPreviewSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { RedisService } from '@/common/redis/redis.service';
import { AppSettingsService } from '@/modules/settings';
import { MailService } from './mail.service';
import { welcomeMail } from './templates';

const pendingSchema = z.object({
  email: z.string(),
  fullName: z.string(),
  ownPassword: z.boolean().default(false),
});
type WelcomeTo = { email: string; fullName: string; ownPassword: boolean };
const key = (userId: string) => `welcome:unseen:${userId}`;
/** Popup mail chào mừng chỉ hiện trong 30 ngày đầu */
const UNSEEN_TTL_SEC = 30 * 24 * 3600;

/** D-47: mail chào mừng sau kích hoạt (gửi qua outbox) + popup xem trước trong Portal một lần */
@Injectable()
export class WelcomeService {
  constructor(
    private readonly mail: MailService,
    private readonly settings: AppSettingsService,
    private readonly redis: RedisService,
  ) {}

  /** Gọi trong transaction tạo tài khoản; đánh dấu popup sau khi caller commit (`markUnseen`) */
  async request(tx: DbTx, to: WelcomeTo): Promise<void> {
    const r = welcomeMail(await this.settings.welcomeMail(), to.fullName, to);
    await this.mail.request(tx, {
      to: to.email,
      kind: 'welcome',
      subject: r.subject,
      html: r.html,
    });
  }

  async markUnseen(userId: string, to: WelcomeTo): Promise<void> {
    await this.redis.client.set(key(userId), JSON.stringify(to), 'EX', UNSEEN_TTL_SEC);
  }

  /** Lấy rồi xoá — lần sau trả null (204) */
  async take(userId: string): Promise<WelcomeMailPreview | null> {
    const raw = await this.redis.client.getdel(key(userId));
    if (!raw) return null;
    const to = pendingSchema.safeParse(JSON.parse(raw));
    if (!to.success) return null;
    const tpl = await this.settings.welcomeMail();
    return welcomeMailPreviewSchema.parse({
      to: to.data.email,
      subject: tpl.subject,
      intro: tpl.intro,
      loginUrl: tpl.loginUrl,
      rules: tpl.rules,
      attachments: tpl.attachments,
      showAccess: tpl.showAccess,
      ownPassword: to.data.ownPassword,
      showRules: tpl.showRules,
      showGuide: tpl.showGuide,
    });
  }
}
