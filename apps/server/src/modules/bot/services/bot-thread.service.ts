import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  type BotSettings,
  botSettingsSchema,
  type BotThread,
  type botSettingsPatchSchema,
} from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PersonaMessageService } from '@/modules/chat';
import { AppSettingsService } from '@/modules/settings';
import { storedLinesSchema, toThread } from '../bot.mapper';
import { type Actor, BotCatalogService } from './bot-catalog.service';

const VN_OFFSET_MS = 7 * 3_600_000;
const vnMidnight = (now: Date) =>
  new Date(Math.floor((now.getTime() + VN_OFFSET_MS) / 86_400_000) * 86_400_000 - VN_OFFSET_MS);

/**
 * Hội thoại mô phỏng (D-04: luôn duyệt trước khi đăng). Run → `pending`; duyệt → UPDATE
 * `pending → posted` có điều kiện rồi đăng qua PersonaMessageService (S-11) + ghi `bot_activity`.
 */
@Injectable()
export class BotThreadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: BotCatalogService,
    private readonly personaMessages: PersonaMessageService,
    private readonly settings: AppSettingsService,
  ) {}

  async list(): Promise<BotThread[]> {
    const rows = await this.prisma.db.botThread.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    const personaIds = new Set<string>();
    const groupIds = new Set<string>();
    for (const r of rows) {
      r.groupIds.forEach((g) => groupIds.add(g));
      storedLinesSchema
        .catch([])
        .parse(r.lines)
        .forEach((l) => personaIds.add(l.personaId));
    }
    const [personas, groups] = await Promise.all([
      this.prisma.db.persona.findMany({
        where: { id: { in: [...personaIds] } },
        select: { id: true, name: true, title: true, color: true, avatarUrl: true },
      }),
      this.prisma.db.group.findMany({
        where: { id: { in: [...groupIds] } },
        select: { id: true, name: true },
      }),
    ]);
    const pm = new Map(personas.map((p) => [p.id, p]));
    const gm = new Map(groups.map((g) => [g.id, g.name]));
    return rows.map((r) => toThread(r, pm, gm));
  }

  /** "Chạy ngay": chụp dòng thoại hiện tại thành hội thoại chờ duyệt (202) */
  async run(actor: Actor, scriptId: string): Promise<{ threadId: string; status: 'pending' }> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const sc = await tx.botScript.findUnique({
        where: { id: scriptId },
        select: { topic: true, groupIds: true, lines: true },
      });
      if (!sc) throw notFound('Không tìm thấy kịch bản');
      const t = await tx.botThread.create({
        data: {
          scriptId,
          topic: sc.topic,
          groupIds: sc.groupIds,
          lines: storedLinesSchema.parse(sc.lines),
        },
        select: { id: true },
      });
      await this.catalog.log(
        tx,
        actor,
        'script.run',
        'script',
        scriptId,
        `chạy kịch bản ${sc.topic}`,
      );
      return { threadId: t.id, status: 'pending' as const };
    });
  }

  async approve(
    actor: Actor,
    id: string,
    now = new Date(),
  ): Promise<{ id: string; status: 'posted'; groupCount: number }> {
    const t = await this.prisma.db.$transaction(async (tx: DbTx) => {
      const rows = await tx.botThread.updateManyAndReturn({
        where: { id, status: 'pending' },
        data: { status: 'posted', postedAt: now },
        select: { topic: true, groupIds: true, lines: true },
      });
      const row = rows[0];
      if (!row) {
        const exists = await tx.botThread.findUnique({ where: { id }, select: { id: true } });
        throw exists ? conflict('Hội thoại đã được đăng') : notFound('Không tìm thấy hội thoại');
      }
      await this.catalog.log(
        tx,
        actor,
        'bot_thread.approve',
        'bot_thread',
        id,
        `duyệt hội thoại ${row.topic}`,
      );
      return row;
    });
    const lines = storedLinesSchema.parse(t.lines);
    const posted = await this.personaMessages.post(`bot-${id}`, t.groupIds, lines);
    const groups = await this.prisma.db.group.findMany({
      where: { id: { in: t.groupIds } },
      select: { name: true },
    });
    await this.prisma.db.botActivity.create({
      data: {
        text: `Đã đăng “${t.topic}” vào ${groups.map((g) => g.name).join(', ')}`,
        messages: posted,
      },
    });
    return { id, status: 'posted', groupCount: t.groupIds.length };
  }

  /** "Bỏ": chỉ khi đang chờ duyệt */
  discard(actor: Actor, id: string): Promise<{ id: string }> {
    return this.prisma.db.$transaction(async (tx: DbTx) => {
      const rows = await tx.$queryRaw<{ topic: string }[]>`
        DELETE FROM bot_threads WHERE id = ${id} AND status = 'pending' RETURNING topic`;
      const r = rows[0];
      if (!r) {
        const exists = await tx.botThread.findUnique({ where: { id }, select: { id: true } });
        throw exists
          ? conflict('Chỉ bỏ được hội thoại đang chờ duyệt')
          : notFound('Không tìm thấy hội thoại');
      }
      await this.catalog.log(
        tx,
        actor,
        'bot_thread.reject',
        'bot_thread',
        id,
        `bỏ hội thoại ${r.topic}`,
      );
      return { id };
    });
  }

  async activity(now = new Date()) {
    const [items, today] = await Promise.all([
      this.prisma.db.botActivity.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 40,
        select: { id: true, text: true, createdAt: true },
      }),
      this.prisma.db.botActivity.aggregate({
        where: { createdAt: { gte: vnMidnight(now) } },
        _sum: { messages: true },
      }),
    ]);
    return {
      items: items.map((a) => ({ id: a.id, text: a.text, createdAt: a.createdAt.toISOString() })),
      todayCount: today._sum.messages ?? 0,
    };
  }

  getSettings(): Promise<BotSettings> {
    return this.settings.get('bot', botSettingsSchema);
  }

  async patchSettings(
    actor: Actor,
    p: z.output<typeof botSettingsPatchSchema>,
  ): Promise<BotSettings> {
    const next = botSettingsSchema.parse({ ...(await this.getSettings()), ...p });
    await this.prisma.db.$transaction(async (tx: DbTx) => {
      await tx.appSetting.update({ where: { key: 'bot' }, data: { value: next } });
      await this.catalog.log(
        tx,
        actor,
        'bot_settings.update',
        'bot_settings',
        'bot',
        'cập nhật cài đặt bot',
      );
    });
    await this.settings.invalidate('bot');
    return next;
  }
}
