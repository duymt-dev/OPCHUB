import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import {
  type ExportParams,
  exportParamsSchema,
  type ExportStatus,
} from '@opchub/shared/api-domains';
import type { StorageProvider } from '@opchub/integrations';
import { AuditService } from '@/common/audit';
import { notFound } from '@/common/errors';
import { csvCell, toCsv } from '@/common/http/csv';
import { STORAGE } from '@/common/integrations';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { groupCells, groupHead, USER_HEAD, userCells } from './export-csv';
import { ExportRepository } from './export.repository';

const BATCH = 1_000;
/** NA-14: link ký số hết hạn 1 giờ kể từ khi tạo yêu cầu xuất; job 02:00 xoá file sau đó */
const TTL_MS = 3_600_000;
export const URL_TTL_SEC = 3_600;

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
    private readonly audit: AuditService,
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

  /**
   * NA-14 (BUG-017): job `done` còn hạn → ghi `export.download` (commit trước) rồi mới ký link 1 giờ.
   * `queued|running|failed` không ghi audit, `url = null`.
   */
  async status(actorId: string, id: string, ip: string | null = null): Promise<ExportStatus> {
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
    const kind = j.kind === 'users' ? 'users' : 'group_members';
    const base = { id: j.id, kind, status: j.status, rowCount: j.rowCount } as const;
    const fileKey = j.status === 'done' && j.expiresAt > new Date() ? j.fileKey : null;
    if (!fileKey) return { ...base, url: null, expiresInSec: null };
    await this.prisma.db.$transaction((tx) =>
      this.audit.log(tx, {
        actorId,
        action: 'export.download',
        entity: 'export',
        entityId: j.id,
        tag: 'member',
        summary: `tải file xuất ${j.kind} (${j.rowCount ?? 0} dòng)`,
        ip,
      }),
    );
    // link không sống quá hạn của file (≤ 1 giờ)
    const ttl = Math.max(
      1,
      Math.min(URL_TTL_SEC, Math.floor((j.expiresAt.getTime() - Date.now()) / 1000)),
    );
    const url = await this.storage.presignGet(fileKey, ttl, `${j.kind}.csv`);
    return { ...base, url, expiresInSec: ttl };
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

  /**
   * NA-13/NA-14 (job 02:00): file xuất quá hạn → xoá object rồi `file_key = NULL` (giữ dòng cho
   * audit tra cứu). Lỗi storage một file → bỏ qua, lần sau thử lại. Trả số file đã xoá.
   */
  async purgeExpired(now = new Date()): Promise<number> {
    const rows = await this.prisma.db.exportJob.findMany({
      where: { status: 'done', fileKey: { not: null }, expiresAt: { lt: now } },
      select: { id: true, fileKey: true },
      take: 1_000,
    });
    const done: string[] = [];
    for (const r of rows) {
      try {
        if (r.fileKey) await this.storage.delete(r.fileKey);
        done.push(r.id);
      } catch (err) {
        this.logger.warn({ err, id: r.id }, 'Không xoá được file xuất — thử lại lần sau');
      }
    }
    if (done.length) {
      await this.prisma.db.exportJob.updateMany({
        where: { id: { in: done } },
        data: { fileKey: null },
      });
    }
    return done.length;
  }
}
