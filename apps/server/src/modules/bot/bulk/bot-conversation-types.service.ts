import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import {
  BUILTIN_BOT_CONVERSATION_TYPES,
  botConversationTypeInputSchema,
  type BotConversationTypeInput,
  type BotConversationTypesQuery,
} from '@opchub/shared/api-domains';
import { conflict, notFound } from '@/common/errors';
import { parseClean } from '@/common/html/sanitize-input';
import { PrismaService } from '@/common/prisma/prisma.service';
import { type Actor, BotCatalogService } from '../services/bot-catalog.service';
import { BotConversationTypesRepository } from './bot-conversation-types.repository';

@Injectable()
export class BotConversationTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: BotConversationTypesRepository,
    private readonly catalog: BotCatalogService,
  ) {}

  async list(query: BotConversationTypesQuery) {
    const rows = await this.repository.list(query);
    const items = rows.slice(0, query.limit).map((row) => ({ ...row, custom: true }));
    return {
      builtins: [...BUILTIN_BOT_CONVERSATION_TYPES],
      items,
      nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async get(id: string, db?: Pick<DbTx, 'botConversationType'>) {
    const builtin = BUILTIN_BOT_CONVERSATION_TYPES.find((type) => type.id === id);
    if (builtin) return { ...builtin };
    const row = await this.repository.find(id, db);
    if (!row) throw notFound('Không tìm thấy loại hội thoại');
    return { ...row, custom: true };
  }

  async create(actor: Actor, input: BotConversationTypeInput) {
    const clean = parseClean(botConversationTypeInputSchema, input);
    if (
      BUILTIN_BOT_CONVERSATION_TYPES.some(
        (type) => type.name.toLowerCase() === clean.name.toLowerCase(),
      )
    ) {
      throw conflict('Loại hội thoại đã tồn tại');
    }
    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const row = await this.repository.create(tx, clean);
        await this.catalog.log(
          tx,
          actor,
          'bot.conversation_type.create',
          'bot_conversation_type',
          row.id,
          `Thêm loại hội thoại ${row.name}`,
        );
        return { ...row, custom: true };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('Loại hội thoại đã tồn tại');
      }
      throw error;
    }
  }

  remove(actor: Actor, id: string) {
    if (BUILTIN_BOT_CONVERSATION_TYPES.some((type) => type.id === id)) {
      throw conflict('Không thể xoá loại hội thoại mặc định');
    }
    return this.prisma.db.$transaction(async (tx) => {
      const result = await this.repository.remove(tx, id);
      if (!result.count) throw notFound('Không tìm thấy loại hội thoại');
      // Saved scripts retain their type label; deleting a definition never mutates old dialogue.
      await this.catalog.log(
        tx,
        actor,
        'bot.conversation_type.delete',
        'bot_conversation_type',
        id,
        'Xoá loại hội thoại tuỳ chỉnh',
      );
      return { id };
    });
  }
}
