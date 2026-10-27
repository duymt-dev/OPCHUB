import { Inject, Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { UserStatus } from '@opchub/shared';
import type { AdminMember, AdminMemberPage, AdminMemberFilter } from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { AuthStateService } from '@/common/auth';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { toAdminMember } from '../domain/admin-member.mapper';
import {
  GROUP_ASSIGN_PORT,
  type GroupAssignPort,
  ONBOARDING_PORT,
  type OnboardingPort,
} from '../ports';
import { AdminUsersRepository, type StatusLock } from '../repositories/admin-users.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

export interface StatusRow {
  id: string;
  perm_version: number;
  full_name: string;
}

const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

export interface Actor {
  id: string;
  ip: string | null;
}

/** Màn Thành viên (D-07 → D-17; vai trò quản trị ở `admin_users`, RB-R01). Mọi thao tác ghi → audit_logs cùng transaction */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AdminUsersRepository,
    private readonly refresh: RefreshTokenRepository,
    private readonly state: AuthStateService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    @Inject(GROUP_ASSIGN_PORT) private readonly groups: GroupAssignPort,
    @Inject(ONBOARDING_PORT) private readonly onboarding: OnboardingPort,
  ) {}

  async page(f: AdminMemberFilter, page: number, size: number): Promise<AdminMemberPage> {
    const [{ ids, total }, counts] = await Promise.all([
      this.repo.pageIds(f, size, (page - 1) * size),
      this.repo.counts(),
    ]);
    // Một lô cho cả trang: nhóm + snapshot khởi đầu (V4-611, không N+1)
    const [rows, groupMap, onb] = await Promise.all([
      this.repo.byIds(ids),
      this.groups.groupsOf(ids),
      this.onboarding.forAdmin(ids),
    ]);
    return {
      items: rows.map((r) => toAdminMember(r, groupMap.get(r.id) ?? [], onb.get(r.id))),
      page,
      size,
      total,
      counts,
    };
  }

  async one(id: string): Promise<AdminMember> {
    const [row] = await this.repo.byIds([id]);
    if (!row) throw notFound('Không tìm thấy thành viên');
    const [groups, onb] = await Promise.all([
      this.groups.groupsOf([id]),
      this.onboarding.forAdmin([id]),
    ]);
    return toAdminMember(row, groups.get(id) ?? [], onb.get(id));
  }

  /**
   * Khoá / mở (đơn + hàng loạt, idempotent): cập nhật có điều kiện, bump version, outbox
   * `user.locked` (D-55: nhóm làm chủ → Admin) + `user.session_revoked` | `user.unlocked`;
   * sau commit Redis + thu hồi refresh. V4-612: `days` → khoá có hạn (thủ công).
   */
  async setStatus(
    actor: Actor,
    ids: readonly string[],
    status: UserStatus,
    reason: string | null,
    now = new Date(),
    days?: number,
  ): Promise<{ id: string; fullName: string }[]> {
    const lock: StatusLock = { until: days ? addDays(now, days) : null, kind: 'manual' };
    const changed = await this.prisma.db.$transaction((tx) =>
      this.setStatusTx(tx, actor, ids, status, reason, lock),
    );
    await this.afterStatus(changed, status, now);
    return changed.map((r) => ({ id: r.id, fullName: r.full_name }));
  }

  /**
   * Phần trong transaction của `setStatus` — moderation (V4-612) gọi trong transaction ẩn tin /
   * khôi phục. `actor.id` null = hệ thống (tự khoá / tự mở). Trả dòng đổi để gọi `afterStatus`.
   */
  async setStatusTx(
    tx: DbTx,
    actor: { id: string | null; ip: string | null },
    ids: readonly string[],
    status: UserStatus,
    reason: string | null,
    lock?: StatusLock,
  ): Promise<StatusRow[]> {
    const rows = await this.repo.setStatus(tx, [...new Set(ids)], status, reason, lock);
    if (status === 'locked') {
      await this.outbox.addMany(
        tx,
        'user.locked',
        rows.map((r) => ({ userId: r.id, reason })),
      );
      await this.outbox.addMany(
        tx,
        'user.session_revoked',
        rows.map((r) => ({ userId: r.id, reason: 'locked' as const })),
      );
    } else {
      await this.outbox.addMany(
        tx,
        'user.unlocked',
        rows.map((r) => ({ userId: r.id })),
      );
    }
    const until = lock?.until ? ` đến ${lock.until.toISOString().slice(0, 10)}` : '';
    await this.audit.logMany(
      tx,
      rows.map((r) => ({
        actorId: actor.id,
        action: status === 'locked' ? 'user.lock' : 'user.unlock',
        entity: 'user',
        entityId: r.id,
        tag: 'member' as const,
        summary: `${status === 'locked' ? 'Khóa' : 'Mở khóa'} tài khoản ${r.full_name}${status === 'locked' ? until : ''}`,
        ...(reason ? { diff: { reason } } : {}),
        ip: actor.ip,
      })),
    );
    return rows;
  }

  /** Sau commit: Redis (perm_version + cờ khoá) và thu hồi refresh khi khoá */
  async afterStatus(rows: readonly StatusRow[], status: UserStatus, now = new Date()) {
    await this.state.applyStatus(
      rows.map((r) => ({ id: r.id, permVersion: r.perm_version })),
      status === 'locked',
    );
    if (status === 'locked') {
      await this.refresh.revokeAllOfUsers(
        rows.map((r) => r.id),
        now,
      );
    }
  }

  async decideVerification(
    actor: Actor,
    id: string,
    decision: 'approve' | 'reject',
    reason: string | undefined,
    now = new Date(),
  ): Promise<AdminMember> {
    const to = decision === 'approve' ? 'verified' : 'rejected';
    await this.prisma.db.$transaction(async (tx) => {
      if (!(await this.repo.decideVerification(tx, id, to, now))) {
        throw conflict('Hồ sơ không ở trạng thái chờ xác minh');
      }
      await this.audit.log(tx, {
        actorId: actor.id,
        action: decision === 'approve' ? 'business.verify' : 'business.reject',
        entity: 'user',
        entityId: id,
        tag: 'member',
        summary: decision === 'approve' ? 'Xác minh doanh nghiệp' : 'Từ chối xác minh doanh nghiệp',
        ...(reason ? { diff: { reason } } : {}),
        ip: actor.ip,
      });
    });
    return this.one(id);
  }

  async assignGroups(
    actor: Actor,
    userIds: readonly string[],
    groupIds: readonly string[],
    role: 'member' | 'lecturer' = 'member',
  ): Promise<number> {
    return this.prisma.db.$transaction(async (tx) => {
      const pairs = await this.groups.assign(tx, userIds, groupIds, role);
      // NA-12: mỗi thành viên nhận 1 thông báo cho mỗi nhóm MỚI (consumer ghi theo lô)
      if (pairs.length) await this.outbox.add(tx, 'group.members_assigned', { pairs });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'group.assign_members',
        entity: 'group',
        entityId: groupIds.join(',').slice(0, 200),
        tag: 'member',
        summary: `Gán ${userIds.length} thành viên vào ${groupIds.length} nhóm · ${role}`,
        diff: { userIds: [...userIds], groupIds: [...groupIds], role },
        ip: actor.ip,
      });
      return new Set(pairs.map((p) => p.userId)).size;
    });
  }
}
