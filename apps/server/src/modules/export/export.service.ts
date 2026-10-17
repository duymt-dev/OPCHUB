import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  type ExportParams,
  exportParamsSchema,
  type ExportStatus,
} from '@opchub/shared/api-domains';
import type { StorageProvider } from '@opchub/integrations';
import { notFound } from '@/common/errors';
import { csvCell, toCsv } from '@/common/http/csv';
import { STORAGE } from '@/common/integrations';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { groupCells, groupHead, USER_HEAD, userCells } from './export-csv';
import { ExportRepository } from './export.repository';

const BATCH = 1_000;
const TTL_MS = 24 * 3_600_000;
const URL_TTL_SEC = 300;

/**
 * Xuất dữ liệu bất đồng bộ (luật 10, B43). Caller ghi audit trong CÙNG transaction với `request`.
 * Worker dựng CSV theo lô keyset → `storage.put(exports/{id}.csv)` → `done`; chỉ người tạo xem.
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ExportRepository,
    private readonly outbox: OutboxService,
    @Inject(STORAGE) private readonly storage: StorageProvider,
  ) {}

  async request(
    tx: DbTx,
    actorId: string,
    params: ExportParams,
    now = new Date(),
  ): Promise<string> {
    const job = await tx.exportJob.create({
      data: {
        kind: params.kind,
        params,
        requestedBy: actorId,
        expiresAt: new Date(now.getTime() + TTL_MS),
      },
      select: { id: true },
    });
    await this.outbox.add(tx, 'export.requested', { exportJobId: job.id });
    return job.id;
  }

  async status(actorId: string, id: string): Promise<ExportStatus> {
    const j = await this.prisma.db.exportJob.findFirst({
      where: { id, requestedBy: actorId },
      select: {
        id: true,
        kind: true,
        status: true,
        rowCount: true,
        fileKey: true,
        expiresAt: true,
      },
    });
    if (!j) throw notFound('Không tìm thấy yêu cầu xuất');
    const live = j.status === 'done' && j.fileKey && j.expiresAt > new Date();
    return {
      id: j.id,
      kind: j.kind === 'users' ? 'users' : 'group_members',
      status: j.status,
      rowCount: j.rowCount,
      url:
        live && j.fileKey
          ? await this.storage.presignGet(j.fileKey, URL_TTL_SEC, `${j.kind}.csv`)
          : null,
    };
  }

  /** Worker `export.run` — queued → running (có điều kiện) → done | failed */
  async run(id: string): Promise<void> {
    const claimed = await this.prisma.db.exportJob.updateManyAndReturn({
      where: { id, status: 'queued' },
      data: { status: 'running' },
      select: { params: true },
    });
    const job = claimed[0];
    if (!job) return;
    try {
      const { csv, rows } = await this.build(exportParamsSchema.parse(job.params));
      const fileKey = `exports/${id}.csv`;
      await this.storage.put(fileKey, csv, 'text/csv; charset=utf-8');
      await this.prisma.db.exportJob.updateMany({
        where: { id, status: 'running' },
        data: { status: 'done', fileKey, rowCount: rows },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi xuất dữ liệu';
      await this.prisma.db.exportJob.updateMany({
        where: { id, status: 'running' },
        data: { status: 'failed', error: msg.slice(0, 500) },
      });
      this.logger.warn({ exportJobId: id }, 'Xuất dữ liệu lỗi');
    }
  }

  private async build(p: ExportParams): Promise<{ csv: string; rows: number }> {
    const lines: string[] = [];
    if (p.kind === 'users') {
      let after = '';
      for (;;) {
        const batch = await this.repo.users(p.userIds, after, BATCH);
        lines.push(...batch.map((r) => userCells(r).map(csvCell).join(',')));
        const last = batch.at(-1);
        if (!last || batch.length < BATCH) break;
        after = last.id;
      }
      return {
        csv: toCsv(USER_HEAD, []) + lines.map((l) => `\n${l}`).join(''),
        rows: lines.length,
      };
    }
    const status = p.status === 'all' ? null : p.status;
    let after = { groupId: '', userId: '' };
    for (;;) {
      const batch = await this.repo.members(p.groupIds, status, after, BATCH);
      lines.push(...batch.map((r) => groupCells(r, p.fields).map(csvCell).join(',')));
      const last = batch.at(-1);
      if (!last || batch.length < BATCH) break;
      const [groupId = '', userId = ''] = last.key.split('|');
      after = { groupId, userId };
    }
    return {
      csv: toCsv(groupHead(p.fields), []) + lines.map((l) => `\n${l}`).join(''),
      rows: lines.length,
    };
  }
}
