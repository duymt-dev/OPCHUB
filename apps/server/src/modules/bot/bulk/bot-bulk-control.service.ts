import { Injectable } from '@nestjs/common';
import {
  botBulkCreateSchema,
  botBulkItemSchema,
  type BotBulkCreate,
  type BotBulkSelection,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { AppError, conflict, notFound } from '@/common/errors';
import { parseClean } from '@/common/html/sanitize-input';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { GroupTargetsService } from '@/modules/community';
import { lockBotExecution } from '../repositories/execution-lock';
import { type Actor, BotCatalogService } from '../services/bot-catalog.service';
import { BotConversationTypesService } from './bot-conversation-types.service';
import { BotBulkRepository } from './bot-bulk.repository';
import { BotBulkPersonasRepository } from './bot-bulk-personas.repository';
import { BotBulkReadService } from './bot-bulk-read.service';
import { BotBulkLinesRepository } from './bot-bulk-lines.repository';
import { BotBulkSaveRepository } from './bot-bulk-save.repository';
import { retryBulk } from './bot-bulk-state';

@Injectable()
export class BotBulkControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: BotBulkRepository,
    private readonly read: BotBulkReadService,
    private readonly types: BotConversationTypesService,
    private readonly personas: BotBulkPersonasRepository,
    private readonly groups: GroupTargetsService,
    private readonly lines: BotBulkLinesRepository,
    private readonly scripts: BotBulkSaveRepository,
    private readonly outbox: OutboxService,
    private readonly catalog: BotCatalogService,
    private readonly audit: AuditService,
  ) {}

  async create(actor: Actor, input: BotBulkCreate, now = new Date()) {
    const clean = parseClean(botBulkCreateSchema, input);
    const id = await this.prisma.db.$transaction(async (tx) => {
      await this.repository.lock(tx, `${actor.id}:${clean.requestId}`);
      const previous = await this.repository.byRequest(tx, actor.id, clean.requestId);
      if (previous) return previous.id;
      if (!(await this.groups.allLive(tx, clean.groupIds))) {
        throw new AppError('VALIDATION_ERROR', 'Nhóm đích không hợp lệ', [
          { path: 'groupIds', message: 'Chọn các nhóm còn hoạt động' },
        ]);
      }
      if ((await this.personas.candidates(tx, clean.groupIds)).length < 2)
        throw conflict('Cần ít nhất 2 persona đang bật');
      const type = await this.types.get(clean.typeId, tx);
      const row = await this.repository.create(tx, {
        requestId: clean.requestId,
        actorId: actor.id,
        topics: clean.topics,
        typeName: type.name,
        typeDescription: type.description,
        perTopic: clean.perTopic,
        turns: clean.turns,
        delayMinutes: clean.delayMinutes,
        groupIds: clean.groupIds,
        total: clean.topics.length * clean.perTopic,
        nextAt: now,
      });
      await this.catalog.log(
        tx,
        actor,
        'bot.bulk.create',
        'bot_bulk_batch',
        row.id,
        `Yêu cầu AI tạo ${row.total} kịch bản`,
      );
      await this.outbox.add(tx, 'bot.bulk_due', {
        batchId: row.id,
        cursor: 0,
        attempt: 0,
        at: now.toISOString(),
      });
      return row.id;
    });
    return this.read.get(id);
  }

  async retry(actor: Actor, id: string, now = new Date()) {
    await this.prisma.db.$transaction(async (tx) => {
      await this.repository.lock(tx, id);
      const batch = await this.repository.find(tx, id);
      if (!batch) throw notFound('Không tìm thấy đợt tạo kịch bản');
      const changed = await this.repository.transition(tx, batch, retryBulk(batch, now));
      if (!changed.count) throw conflict('Trạng thái đợt tạo đã thay đổi');
      await this.catalog.log(
        tx,
        actor,
        'bot.bulk.retry',
        'bot_bulk_batch',
        id,
        'Thử lại đợt tạo kịch bản AI',
      );
      await this.outbox.add(tx, 'bot.bulk_due', {
        batchId: id,
        cursor: batch.cursor,
        attempt: 0,
        at: now.toISOString(),
      });
    });
    return this.read.get(id);
  }

  async select(actor: Actor, id: string, input: BotBulkSelection) {
    await this.prisma.db.$transaction(async (tx) => {
      await this.repository.lock(tx, id);
      if (!(await this.repository.find(tx, id))) throw notFound('Không tìm thấy đợt tạo kịch bản');
      const rows = await this.repository.selectionRows(tx, id, input.itemIds);
      if (rows.length !== input.itemIds.length)
        throw notFound('Không tìm thấy kết quả trong đợt tạo này');
      if (rows.some((row) => row.savedScriptId))
        throw conflict('Kịch bản đã lưu không thể bỏ chọn để xoá');
      await this.repository.select(tx, id, input.itemIds, input.selected);
      await this.catalog.log(
        tx,
        actor,
        'bot.bulk.selection',
        'bot_bulk_batch',
        id,
        `${input.selected ? 'Chọn' : 'Bỏ chọn'} ${rows.length} kịch bản AI`,
      );
    });
    return this.read.get(id);
  }

  save(actor: Actor, id: string) {
    return this.prisma.db.$transaction(async (tx) => {
      await this.repository.lock(tx, id);
      const batch = await this.repository.find(tx, id);
      if (!batch) throw notFound('Không tìm thấy đợt tạo kịch bản');
      if (batch.status !== 'done') throw conflict('Chờ AI tạo xong trước khi lưu kịch bản');
      await lockBotExecution(tx);
      const selected = await this.repository.selected(tx, id);
      if (!selected.length) {
        const [counts] = await this.repository.counts(tx, id);
        if (!counts?.savedCount) throw conflict('Chọn ít nhất 1 kịch bản để lưu');
        return { saved: 0, scriptIds: [] };
      }
      if (!(await this.groups.allLive(tx, batch.groupIds)))
        throw conflict('Nhóm đích không còn khả dụng');
      // Defensive parsing of stored results; the provider never supplies script/persona IDs to save.
      for (const item of selected) botBulkItemSchema.shape.lines.parse(item.lines);
      if (
        await this.lines.savedCollision(
          tx,
          selected.flatMap((item) => item.lineHashes),
        )
      ) {
        throw conflict(
          'Nội dung đã trùng với kịch bản được lưu sau khi tạo. Bỏ chọn kết quả trùng hoặc tạo đợt mới.',
        );
      }
      const saved = await this.scripts.save(tx, batch);
      await this.audit.logMany(
        tx,
        saved.map((script) => ({
          actorId: actor.id,
          ip: actor.ip,
          action: 'script.create',
          entity: 'script',
          entityId: script.id,
          tag: 'moderation' as const,
          summary: `Thêm kịch bản AI ${script.topic}`,
        })),
      );
      await this.catalog.log(
        tx,
        actor,
        'bot.bulk.save',
        'bot_bulk_batch',
        id,
        `Lưu ${saved.length} kịch bản AI đã chọn`,
      );
      return { saved: saved.length, scriptIds: saved.map((script) => script.id) };
    });
  }
}
