import { Injectable } from '@nestjs/common';
import type { AdminAccount, AdminInvite } from '@opchub/shared/api-domains';
import { createHash, randomBytes } from 'node:crypto';
import { AuditService } from '@/common/audit';
import { AuthStateService } from '@/common/auth/auth-state.service';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PresenceService } from '@/common/realtime/presence.service';
import type { AdminActor } from './admin-actor';

const ROLE_LABEL = { admin: 'Quản trị viên', moderator: 'Điều phối viên' } as const;
const INVITE_TTL_MS = 7 * 86_400_000;
/** Lời mời mang tiền tố để không trùng id user */
const INVITE_PREFIX = 'inv-';

/**
 * Tài khoản quản trị (`s.role`): user có vai trò ≠ member + lời mời đang chờ (Q-G6a-4).
 * Thu hồi user = hạ về member, tăng perm_version, outbox `user.role_changed` (ngắt phiên realtime).
 */
@Injectable()
export class AdminAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly state: AuthStateService,
    private readonly presence: PresenceService,
  ) {}

  async list(now = new Date()): Promise<{ items: AdminAccount[] }> {
    const [users, invites] = await Promise.all([
      this.prisma.db.user.findMany({
        where: { systemRole: { not: 'member' }, deletedAt: null },
        select: {
          id: true,
          fullName: true,
          email: true,
          systemRole: true,
          avatarUrl: true,
          totpSecretEnc: true,
          lastLoginAt: true,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.db.adminInvite.findMany({
        where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        select: { id: true, email: true, systemRole: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    const online = await this.presence.usersOnline(users.map((u) => u.id));
    return {
      items: [
        ...users.map((u) => ({
          id: u.id,
          name: u.fullName,
          email: u.email,
          role: u.systemRole === 'member' ? ('moderator' as const) : u.systemRole,
          avatarUrl: u.avatarUrl,
          twoFactor: u.totpSecretEnc !== null,
          status: 'active' as const,
          online: online.has(u.id),
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        })),
        ...invites.map((i) => ({
          id: `${INVITE_PREFIX}${i.id}`,
          name: i.email.split('@')[0] ?? i.email,
          email: i.email,
          role: i.systemRole === 'admin' ? ('admin' as const) : ('moderator' as const),
          avatarUrl: null,
          twoFactor: false,
          status: 'invited' as const,
          online: false,
          lastLoginAt: null,
        })),
      ],
    };
  }

  /** Email đã là quản trị (user hoặc lời mời đang chờ) → 409. Mail mời gửi ở luồng nhận lời mời */
  async invite(actor: AdminActor, body: AdminInvite, now = new Date()): Promise<AdminAccount> {
    const email = body.email.toLowerCase();
    const [user, pending] = await Promise.all([
      this.prisma.db.user.findFirst({
        where: { email, systemRole: { not: 'member' }, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.db.adminInvite.findFirst({
        where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        select: { id: true },
      }),
    ]);
    if (user || pending) throw conflict('Email này đã có quyền quản trị');
    const token = randomBytes(32).toString('base64url');
    const inv = await this.prisma.db.$transaction(async (tx) => {
      const created = await tx.adminInvite.create({
        data: {
          email,
          systemRole: body.role,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
          invitedBy: actor.id,
        },
        select: { id: true },
      });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'admin.invite',
        entity: 'admin_invite',
        entityId: created.id,
        tag: 'permission',
        summary: `mời ${email} làm ${ROLE_LABEL[body.role]}`,
        ip: actor.ip,
      });
      return created;
    });
    return {
      id: `${INVITE_PREFIX}${inv.id}`,
      name: email.split('@')[0] ?? email,
      email,
      role: body.role,
      avatarUrl: null,
      twoFactor: false,
      status: 'invited',
      online: false,
      lastLoginAt: null,
    };
  }

  async revoke(actor: AdminActor, id: string): Promise<{ id: string }> {
    if (id.startsWith(INVITE_PREFIX)) return this.revokeInvite(actor, id);
    const target = await this.prisma.db.user.findFirst({
      where: { id, systemRole: { not: 'member' }, deletedAt: null },
      select: { fullName: true, systemRole: true },
    });
    if (!target) throw notFound('Không tìm thấy tài khoản quản trị');
    if (target.systemRole === 'super_admin') {
      throw conflict('Không thể thu hồi quyền của chủ sở hữu');
    }
    const version = await this.prisma.db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ perm_version: number }[]>`
        UPDATE users SET system_role = 'member', perm_version = perm_version + 1, updated_at = now()
        WHERE id = ${id} AND system_role IN ('admin', 'moderator') RETURNING perm_version`;
      const v = rows[0]?.perm_version;
      if (v === undefined) throw conflict('Tài khoản đã được cập nhật bởi người khác');
      await this.outbox.add(tx, 'user.role_changed', { userId: id, systemRole: 'member' });
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'admin.revoke',
        entity: 'user',
        entityId: id,
        tag: 'permission',
        summary: `thu hồi quyền quản trị của ${target.fullName}`,
        ip: actor.ip,
      });
      return v;
    });
    await this.state.setPermVersion(id, version);
    return { id };
  }

  private async revokeInvite(actor: AdminActor, id: string): Promise<{ id: string }> {
    const inviteId = id.slice(INVITE_PREFIX.length);
    await this.prisma.db.$transaction(async (tx) => {
      const rows = await tx.adminInvite.updateManyAndReturn({
        where: { id: inviteId, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
        select: { email: true },
      });
      const email = rows[0]?.email;
      if (!email) throw notFound('Không tìm thấy tài khoản quản trị');
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'admin.revoke',
        entity: 'admin_invite',
        entityId: inviteId,
        tag: 'permission',
        summary: `thu hồi quyền quản trị của ${email.split('@')[0] ?? email}`,
        ip: actor.ip,
      });
    });
    return { id };
  }
}
