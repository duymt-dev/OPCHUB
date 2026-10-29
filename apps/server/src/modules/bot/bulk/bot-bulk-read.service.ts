import { Injectable } from '@nestjs/common';
import {
  botBulkBatchSchema,
  botBulkItemSchema,
  type BotBulkItemsQuery,
} from '@opchub/shared/api-domains';
import { notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { BotBulkRepository } from './bot-bulk.repository';

@Injectable()
export class BotBulkReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: BotBulkRepository,
  ) {}
  async get(id: string) {
    return this.prisma.db.$transaction(
      async (tx) => {
        const row = await this.repository.find(tx, id);
        if (!row) throw notFound('Không tìm thấy đợt tạo kịch bản');
        const [counts] = await this.repository.counts(tx, id);
        return botBulkBatchSchema.parse({
          id: row.id,
          topics: row.topics,
          typeName: row.typeName,
          typeDescription: row.typeDescription,
          perTopic: row.perTopic,
          turns: row.turns,
          delayMinutes: row.delayMinutes,
          groupIds: row.groupIds,
          status: row.status,
          total: row.total,
          cursor: row.cursor,
          error: row.error,
          selectedCount: counts?.selectedCount ?? 0,
          savedCount: counts?.savedCount ?? 0,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        });
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async latest(actorId: string) {
    const row = await this.repository.latest(this.prisma.db, actorId);
    return { batch: row ? await this.get(row.id) : null };
  }
  async items(id: string, query: BotBulkItemsQuery) {
    if (!(await this.repository.find(this.prisma.db, id)))
      throw notFound('Không tìm thấy đợt tạo kịch bản');
    const rows = await this.repository.items(this.prisma.db, id, query);
    const items = rows.slice(0, query.limit).map((row) => botBulkItemSchema.parse(row));
    return {
      items,
      nextCursor: rows.length > query.limit ? (items.at(-1)?.ordinal ?? null) : null,
    };
  }
}
