import { Inject, Injectable } from '@nestjs/common';
import type { UserStatus } from '@opchub/shared';
import type {
  AdminMember,
  AdminMemberPage,
  AdminMemberType,
  ManagedRole,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { AuthStateService } from '@/common/auth';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { toAdminMember } from '../domain/admin-member.mapper';
import { GROUP_ASSIGN_PORT, type GroupAssignPort } from '../ports';
import { AdminUsersRepository } from '../repositories/admin-users.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

export interface Actor {
  id: string;
  ip: string | null;
}

const ROLE_LABEL: Record<ManagedRole, string> = {
  member: 'Thành viên',
  moderator: 'Điều phối viên',
  admin: 'Quản trị viên',
};

/** Màn Thành viên (D-07 → D-17, D-42). Mọi thao tác ghi → audit_logs cùng transaction */
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
  ) {}

  async page(
    type: AdminMemberType | undefined,
    q: string | undefined,
    page: number,
    size: number,
  ): Promise<AdminMemberPage> {
    const [{ ids, total }, counts] = await Promise.all([
      this.repo.pageIds(type, q?.trim() || undefined, size, (page - 1) * size),
      this.repo.counts(),
    ]);
    const [rows, groupMap] = await Promise.all([this.repo.byIds(ids), this.groups.groupsOf(ids)]);
    return {
      items: rows.map((r) => toAdminMember(r, groupMap.get(r.id) ?? [])),
      page,
      size,
      total,
      counts,
    };
  }

  async one(id: string): Promise<AdminMember> {
    const [row] = await this.repo.byIds([id]);
    if (!row) throw notFound('Không tìm thấy thành viên');
    const groups = await this.groups.groupsOf([id]);
    return toAdminMember(row, groups.get(id) ?? []);
  }

  /**
   * Khoá / mở (đơn + hàng loạt, idempotent): cập nhật có điều kiện, bump version, outbox
   * `user.locked` (D-15: dự án ẩn, B32) + `user.session_revoked`; sau commit Redis + thu hồi refresh.
   */
  async setStatus(
    actor: Actor,
    ids: readonly string[],
    status: UserStatus,
    reason: string | null,
    now = new Date(),
  ): Promise<{ id: string; fullName: string }[]> {
    const changed = await this.prisma.db.$transaction(async (tx) => {
      const rows = await this.repo.setStatus(tx, [...new Set(ids)], status, reason);
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
      }
      await this.audit.logMany(
        tx,
        rows.map((r) => ({
          actorId: actor.id,
          action: status === 'locked' ? 'user.lock' : 'user.unlock',
          entity: 'user',
          entityId: r.id,
          tag: 'member' as const,
          summary: `${status === 'locked' ? 'Khóa' : 'Mở khóa'} tài khoản ${r.full_name}`,
          ...(reason ? { diff: { reason } } : {}),
          ip: actor.ip,
        })),
      );
      return rows;
    });
    await this.state.applyStatus(
      changed.map((r) => ({ id: r.id, permVersion: r.perm_version })),
      status === 'locked',
    );
    if (status === 'locked') {
      await this.refresh.revokeAllOfUsers(
        changed.map((r) => r.id),
        now,
      );
    }
    return changed.map((r) => ({ id: r.id, fullName: r.full_name }));
  }

  /** D-42: cần `s.role` (kiểm ở controller); không đổi super_admin; bump version + outbox */
  async setRole(actor: Actor, id: string, role: ManagedRole): Promise<AdminMember> {
    const row = await this.prisma.db.$transaction(async (tx) => {
      const [r] = await this.repo.setRole(tx, id, role);
      if (!r) throw notFound('Không tìm thấy thành viên');
      await this.outbox.add(tx, 'user.role_changed', { userId: id, systemRole: role });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'user.role_change',
        entity: 'user',
        entityId: id,
        tag: 'permission',
        summary: `Đổi vai trò ${ROLE_LABEL[r.from_role as ManagedRole] ?? r.from_role} → ${ROLE_LABEL[role]}`,
        diff: { from: r.from_role, to: role },
        ip: actor.ip,
      });
      return r;
    });
    await this.state.setPermVersion(id, row.perm_version);
    return this.one(id);
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
  ): Promise<number> {
    return this.prisma.db.$transaction(async (tx) => {
      const n = await this.groups.assign(tx, userIds, groupIds);
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'group.assign_members',
        entity: 'group',
        entityId: groupIds.join(',').slice(0, 200),
        tag: 'member',
        summary: `Gán ${userIds.length} thành viên vào ${groupIds.length} nhóm`,
        diff: { userIds: [...userIds], groupIds: [...groupIds] },
        ip: actor.ip,
      });
      return n;
    });
  }
}
