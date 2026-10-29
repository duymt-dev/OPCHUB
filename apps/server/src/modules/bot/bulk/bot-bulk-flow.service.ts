import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { planBotBulkPersonas, type BulkPersona } from '@opchub/shared';
import type { BotBulkError, BotBulkItem } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OutboxService } from '@/common/outbox';
import { GroupTargetsService } from '@/modules/community';
import { lockBotExecution } from '../repositories/execution-lock';
import { BotCatalogService } from '../services/bot-catalog.service';
import { BotBulkRepository, type BulkBatchRow } from './bot-bulk.repository';
import { BotBulkPersonasRepository } from './bot-bulk-personas.repository';
import { BotBulkLinesRepository, botBulkLineHashes } from './bot-bulk-lines.repository';
import { advanceBulk, failBulk } from './bot-bulk-state';

export interface BulkClaim {
  batchId: string;
  cursor: number;
  claimId: string;
  topic: string;
  typeName: string;
  typeDescription: string;
  personas: BulkPersona[];
  retry: boolean;
}

/** Durable claim/progress boundary. Provider I/O is owned by the separate generation service. */
@Injectable()
export class BotBulkFlowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: BotBulkRepository,
    private readonly personas: BotBulkPersonasRepository,
    private readonly groups: GroupTargetsService,
    private readonly lines: BotBulkLinesRepository,
    private readonly outbox: OutboxService,
    private readonly catalog: BotCatalogService,
  ) {}

  claim(batchId: string, cursor: number, now: Date): Promise<BulkClaim | null> {
    return this.prisma.db.$transaction(async (tx) => {
      await this.repository.lock(tx, batchId);
      const batch = await this.repository.find(tx, batchId);
      if (
        !batch ||
        batch.status !== 'running' ||
        batch.cursor !== cursor ||
        !batch.nextAt ||
        batch.nextAt > now ||
        (batch.leaseUntil && batch.leaseUntil > now)
      )
        return null;
      if (batch.attempts >= 3) {
        await this.fail(tx, batch, 'provider', false, now);
        return null;
      }
      if (!(await this.groups.allLive(tx, batch.groupIds))) {
        await this.fail(tx, batch, 'groups_missing', false, now);
        return null;
      }
      const people = planBotBulkPersonas(
        await this.personas.candidates(tx, batch.groupIds),
        batch.groupIds,
        batch.turns,
        cursor,
      );
      if (!people.length) {
        await this.fail(tx, batch, 'personas_missing', false, now);
        return null;
      }
      const topic = batch.topics[Math.floor(cursor / batch.perTopic)];
      if (!topic) {
        await this.fail(tx, batch, 'invalid_response', false, now);
        return null;
      }
      const claimId = randomUUID();
      const leaseUntil = new Date(now.getTime() + 180_000);
      const changed = await this.repository.transition(tx, batch, {
        claimId,
        leaseUntil,
        nextAt: leaseUntil,
        attempts: { increment: 1 },
      });
      if (!changed.count) return null;
      return {
        batchId,
        cursor,
        claimId,
        topic,
        typeName: batch.typeName,
        typeDescription: batch.typeDescription,
        personas: people,
        retry: batch.attempts > 0,
      };
    });
  }

  finish(claim: BulkClaim, lines: BotBulkItem['lines'], now: Date): Promise<boolean> {
    return this.prisma.db.$transaction(async (tx) => {
      await this.repository.lock(tx, claim.batchId);
      const batch = await this.current(tx, claim, now);
      if (!batch) return false;
      await lockBotExecution(tx);
      const hashes = botBulkLineHashes(lines.map((line) => line.body));
      if (
        (await this.lines.savedCollision(tx, hashes)) ||
        (await this.lines.batchCollision(tx, batch.id, hashes))
      ) {
        await this.fail(tx, batch, 'duplicate', true, now);
        return false;
      }
      const item = await this.repository.createItem(tx, {
        batchId: batch.id,
        ordinal: batch.cursor,
        topic: claim.topic,
        lines,
        lineHashes: hashes,
      });
      const next = advanceBulk(batch, now);
      const changed = await this.repository.transition(tx, batch, next);
      if (!changed.count) throw new Error('Lost bulk generation claim');
      await this.catalog.log(
        tx,
        { id: batch.actorId, ip: null },
        'bot.bulk.item_generated',
        'bot_bulk_item',
        item.id,
        `Tạo kịch bản AI ${claim.topic}`,
      );
      if (next.nextAt)
        await this.outbox.add(tx, 'bot.bulk_due', {
          batchId: batch.id,
          cursor: next.cursor,
          attempt: 0,
          at: next.nextAt.toISOString(),
        });
      return true;
    });
  }

  reject(claim: BulkClaim, error: BotBulkError, retryable: boolean, now: Date) {
    return this.prisma.db.$transaction(async (tx) => {
      await this.repository.lock(tx, claim.batchId);
      const batch = await this.current(tx, claim, now);
      if (batch) await this.fail(tx, batch, error, retryable, now);
    });
  }

  private async current(tx: DbTx, claim: BulkClaim, now: Date) {
    const batch = await this.repository.find(tx, claim.batchId);
    if (
      !batch ||
      batch.status !== 'running' ||
      batch.cursor !== claim.cursor ||
      batch.claimId !== claim.claimId ||
      !batch.leaseUntil ||
      batch.leaseUntil <= now
    )
      return null;
    return batch;
  }

  private async fail(
    tx: DbTx,
    batch: BulkBatchRow,
    error: BotBulkError,
    retryable: boolean,
    now: Date,
  ) {
    const next = failBulk(batch, error, retryable, now);
    const changed = await this.repository.transition(tx, batch, next);
    if (!changed.count) throw new Error('Lost bulk failure transition');
    if (next.nextAt) {
      await this.outbox.add(tx, 'bot.bulk_due', {
        batchId: batch.id,
        cursor: batch.cursor,
        attempt: batch.attempts,
        at: next.nextAt.toISOString(),
      });
    } else {
      await this.catalog.log(
        tx,
        { id: batch.actorId, ip: null },
        'bot.bulk.failed',
        'bot_bulk_batch',
        batch.id,
        `Đợt tạo kịch bản AI báo lỗi: ${error}`,
      );
    }
  }
}
