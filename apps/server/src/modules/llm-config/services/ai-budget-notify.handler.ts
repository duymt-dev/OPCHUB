import { Inject, Injectable } from '@nestjs/common';
import { ADMIN_DIRECTORY_PORT, type AdminDirectoryPort } from '@/common/auth';
import { ENV, type Env } from '@/common/config';
import { NotificationService } from '@/modules/notification';

/** Separate worker-only consumer; llm-config's runtime does not depend on notification. */
@Injectable()
export class AiBudgetNotifyHandler {
  constructor(
    @Inject(ADMIN_DIRECTORY_PORT) private readonly admins: AdminDirectoryPort,
    private readonly notifications: NotificationService,
    @Inject(ENV) private readonly env: Env,
  ) {}
  async send(month: string, level: 'warn' | 'exhausted', eventId: string, pct?: number) {
    const admins = await this.admins.withPermission('settings.general');
    const title =
      level === 'warn'
        ? `Chi phí AI đã đạt ${pct}% ngân sách tháng`
        : `Đã hết ngân sách AI tháng ${month.slice(5)}/${month.slice(0, 4)}`;
    await this.notifications.notify(
      admins.map((admin) => ({
        id: `ai-budget:${month}:${level}:${eventId}:${admin.id}`,
        userId: admin.id,
        realm: 'admin',
        push: 'test',
        type: 'system',
        title,
        body: 'Kiểm tra ngân sách và cấu hình AI Provider trong Cài đặt.',
        link: `${new URL(this.env.ADMIN_URL).pathname.replace(/\/$/, '')}/settings?tab=llm`,
      })),
    );
  }
}
