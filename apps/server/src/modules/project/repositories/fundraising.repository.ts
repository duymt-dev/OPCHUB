import { Injectable } from '@nestjs/common';
import type { DbTx, FundraisingStatus } from '@opchub/db';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  FUNDRAISING_OPEN,
  FUNDRAISING_TRANSITIONS,
  type FundraisingStep,
} from '../domain/fundraising-status';

export const FUNDRAISING_SELECT = {
  id: true,
  projectId: true,
  ownerId: true,
  code: true,
  amount: true,
  status: true,
  legacy: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  project: { select: { name: true } },
} as const satisfies Prisma.ProjectFundraisingSelect;
export type FundraisingRow = Prisma.ProjectFundraisingGetPayload<{
  select: typeof FUNDRAISING_SELECT;
}>;

/** Bảng `project_fundraisings` (V4-610) — đọc theo index (project_id, status), (status, ends_at) */
@Injectable()
export class FundraisingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Khoản đang mở hoặc đang hiệu lực mới nhất của dự án */
  current(tx: DbTx, projectId: string) {
    return tx.projectFundraising.findMany({
      where: { projectId, status: { in: [...FUNDRAISING_OPEN, 'active'] } },
      select: FUNDRAISING_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
    });
  }

  async create(tx: DbTx, d: { projectId: string; ownerId: string; amount: number }) {
    const [seq] = await tx.$queryRaw<{ code: string }[]>`
      SELECT 'GV' || lpad(nextval('fundraising_code_seq')::text, 6, '0') AS code`;
    return tx.projectFundraising.create({
      data: { ...d, code: seq?.code ?? null },
      select: FUNDRAISING_SELECT,
    });
  }

  /** Gói Gọi vốn của tôi: idx (owner_id, created_at DESC) */
  mine(ownerId: string) {
    return this.prisma.db.projectFundraising.findMany({
      where: { ownerId, legacy: false, project: { deletedAt: null } },
      select: FUNDRAISING_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  findOwned(ownerId: string, id: string) {
    return this.prisma.db.projectFundraising.findFirst({
      where: { id, ownerId },
      select: FUNDRAISING_SELECT,
    });
  }

  /** Khoá khoản theo mã CK để đối soát (FOR UPDATE — chạy song song webhook + poll) */
  async lockByCode(tx: DbTx, code: string) {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM project_fundraisings WHERE code = ${code} FOR UPDATE`;
    const id = rows[0]?.id;
    return id
      ? tx.projectFundraising.findUnique({ where: { id }, select: FUNDRAISING_SELECT })
      : null;
  }

  /** Chuyển trạng thái có điều kiện (luật 7). Trả false khi trạng thái hiện tại không khớp */
  async step(
    tx: DbTx,
    id: string,
    step: FundraisingStep,
    data: Prisma.ProjectFundraisingUncheckedUpdateManyInput,
  ): Promise<boolean> {
    const t = FUNDRAISING_TRANSITIONS[step];
    const r = await tx.projectFundraising.updateMany({
      where: { id, status: t.from },
      data: { ...data, status: t.to },
    });
    return r.count === 1;
  }

  /** D-106: dự án đã từng được duyệt một khoản có phí → lần mua sau là gia hạn */
  async everApproved(tx: DbTx, projectId: string): Promise<boolean> {
    const r = await tx.projectFundraising.findFirst({
      where: { projectId, legacy: false, status: { in: ['active', 'expired'] } },
      select: { id: true },
    });
    return r !== null;
  }

  /** Hạn khoản có phí đang hiệu lực của dự án (gia hạn nối tiếp; legacy không tính) */
  async activeEnd(tx: DbTx, projectId: string, exceptId: string): Promise<Date | null> {
    const r = await tx.projectFundraising.aggregate({
      where: { projectId, status: 'active', legacy: false, id: { not: exceptId } },
      _max: { endsAt: true },
    });
    return r._max.endsAt;
  }

  /** Dự án có Gói Gọi vốn đang hiệu lực (1 query cho cả trang — luật 5) */
  async activeAmong(ids: readonly string[], now: Date): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const rows = await this.prisma.db.projectFundraising.findMany({
      where: { projectId: { in: [...ids] }, status: 'active', endsAt: { gt: now } },
      select: { projectId: true },
      distinct: ['projectId'],
    });
    return new Set(rows.map((r) => r.projectId));
  }

  /** Khoản gần nhất không legacy của mỗi dự án (Admin chip, chủ dự án) */
  async latestAmong(ids: readonly string[]): Promise<Map<string, FundraisingRow>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.db.projectFundraising.findMany({
      where: { projectId: { in: [...ids] }, legacy: false },
      select: FUNDRAISING_SELECT,
      orderBy: [{ projectId: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      distinct: ['projectId'],
    });
    return new Map(rows.map((r) => [r.projectId, r]));
  }

  /** Job: khoản hết hạn (idx status, ends_at) */
  due(tx: DbTx, status: FundraisingStatus, until: Date, limit: number) {
    return tx.projectFundraising.findMany({
      where: { status, endsAt: { lte: until } },
      select: { ...FUNDRAISING_SELECT, remindedAt: true },
      orderBy: [{ endsAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  /** Job: khoản còn hạn, hết trong cửa sổ nhắc, chưa nhắc (idx status, ends_at) */
  toRemind(tx: DbTx, now: Date, until: Date, limit: number) {
    return tx.projectFundraising.findMany({
      where: { status: 'active', remindedAt: null, endsAt: { gt: now, lte: until } },
      select: { ...FUNDRAISING_SELECT, remindedAt: true },
      orderBy: [{ endsAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  /** Đổi hàng loạt có điều kiện, trả id thật sự đổi (chạy song song không xử lý hai lần) */
  async expireMany(tx: DbTx, ids: readonly string[], now: Date): Promise<string[]> {
    if (!ids.length) return [];
    const rows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE project_fundraisings SET status = 'expired', updated_at = ${now}
      WHERE id = ANY(${[...ids]}::text[]) AND status = 'active' AND ends_at <= ${now}
      RETURNING id`;
    return rows.map((r) => r.id);
  }

  async claimReminders(tx: DbTx, ids: readonly string[], now: Date): Promise<string[]> {
    if (!ids.length) return [];
    const rows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE project_fundraisings SET reminded_at = ${now}, updated_at = ${now}
      WHERE id = ANY(${[...ids]}::text[]) AND status = 'active' AND reminded_at IS NULL
      RETURNING id`;
    return rows.map((r) => r.id);
  }

  /** Email chủ dự án cho mail nhắc (một query) */
  owners(tx: DbTx, ids: readonly string[]) {
    return tx.user.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, email: true, fullName: true },
    });
  }
}
