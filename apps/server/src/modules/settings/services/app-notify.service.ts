import { Injectable } from '@nestjs/common';
import { appNotifySettingsSchema, type AppNotifyPatch } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationService } from '@/modules/notification';
import { AppSettingsService } from '../app-settings.service';
interface Actor {
  id: string;
  ip: string | null;
}
@Injectable()
export class AppNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppSettingsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
  ) {}
  get() {
    return this.settings.app();
  }
  async patch(actor: Actor, patch: AppNotifyPatch) {
    const after = await this.prisma.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { value: unknown }[]
      >`SELECT value FROM app_settings WHERE key='app' FOR UPDATE`;
      const before = appNotifySettingsSchema.parse(rows[0]?.value);
      const next = appNotifySettingsSchema.parse({
        pwa: patch.pwa ?? before.pwa,
        push: { ...before.push, ...patch.push },
      });
      await tx.appSetting.update({ where: { key: 'app' }, data: { value: next } });
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'settings.app',
        entity: 'settings',
        entityId: 'app',
        tag: 'settings',
        summary: 'Đã lưu cấu hình ứng dụng & thông báo',
        diff: { before, after: next },
      });
      return next;
    });
    await this.settings.invalidate('app');
    return after;
  }
  async test(actor: Actor) {
    await this.prisma.db.$transaction((tx) =>
      this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'settings.app_test',
        entity: 'settings',
        entityId: 'app',
        tag: 'settings',
        summary: 'Gửi thông báo thử',
      }),
    );
    await this.notifications.notify([
      {
        userId: actor.id,
        type: 'system',
        title: 'Thông báo thử từ OPC Hub',
        body: 'Thông báo đẩy đang hoạt động trên thiết bị của bạn.',
        link: '',
      },
    ]);
    return { ok: true as const };
  }
}
