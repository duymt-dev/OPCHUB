import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import {
  MODERATION_DEFAULTS,
  type ModerationSettings,
  moderationSettingsSchema,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { PrismaService } from '@/common/prisma/prisma.service';

const KEY = 'moderation';

/** V4-612 (D-77/D-83): "Thời gian khóa" khi vi phạm lần 2+ — `app_settings.moderation`, mặc định 7 */
@Injectable()
export class ModerationSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(db: DbTx | PrismaService['db'] = this.prisma.db): Promise<ModerationSettings> {
    const row = await db.appSetting.findUnique({ where: { key: KEY }, select: { value: true } });
    const parsed = moderationSettingsSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : MODERATION_DEFAULTS;
  }

  async save(
    actor: { id: string; ip: string | null },
    next: ModerationSettings,
  ): Promise<ModerationSettings> {
    await this.prisma.db.$transaction(async (tx) => {
      const value = next as Prisma.InputJsonValue;
      await tx.appSetting.upsert({
        where: { key: KEY },
        create: { key: KEY, value },
        update: { value },
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'moderation.settings.update',
        entity: 'app_setting',
        entityId: KEY,
        tag: 'moderation',
        summary: `Thời gian khóa khi vi phạm: ${next.autoLockDays} ngày`,
        ip: actor.ip,
      });
    });
    return next;
  }
}
