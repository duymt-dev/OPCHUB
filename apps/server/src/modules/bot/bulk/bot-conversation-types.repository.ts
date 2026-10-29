import { Injectable } from '@nestjs/common';
import { Prisma, type DbTx } from '@opchub/db';
import type {
  BotConversationTypeInput,
  BotConversationTypesQuery,
} from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';

const SELECT = { id: true, name: true, description: true } as const;
export type ConversationTypeRow = { id: string; name: string; description: string };

/** ID-only seek first; never load descriptions for rows discarded by pagination. */
export function conversationTypesPageSql(query: BotConversationTypesQuery) {
  const cursor = query.after ? Prisma.sql`WHERE id > ${query.after}` : Prisma.empty;
  return Prisma.sql`
    SELECT t.id, t.name::text AS name, t.description
    FROM (
      SELECT id FROM bot_conversation_types ${cursor}
      ORDER BY id LIMIT ${query.limit + 1}
    ) page
    JOIN bot_conversation_types t ON t.id = page.id
    ORDER BY page.id`;
}

@Injectable()
export class BotConversationTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(query: BotConversationTypesQuery) {
    return this.prisma.db.$queryRaw<ConversationTypeRow[]>(conversationTypesPageSql(query));
  }

  find(id: string, db: Pick<DbTx, 'botConversationType'> = this.prisma.db) {
    return db.botConversationType.findUnique({ where: { id }, select: SELECT });
  }

  create(tx: DbTx, input: BotConversationTypeInput) {
    return tx.botConversationType.create({ data: input, select: SELECT });
  }

  remove(tx: DbTx, id: string) {
    return tx.botConversationType.deleteMany({ where: { id } });
  }
}
