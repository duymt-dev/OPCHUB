import { Inject, Injectable } from '@nestjs/common';
import { type DbTx, Prisma } from '@opchub/db';
import { provinces } from '@opchub/shared/fixtures';
import {
  DIRECTOR_REGION_LABEL,
  type DirectorAppointment,
  type DirectorConfigPatch,
  type DirectorRegion,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { ENV, type Env } from '@/common/config';
import { AppError, conflict, forbidden, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MemberDirectory } from '../../account';
import { AdminDirectoryService } from '../../admin-account';
import { RegionalDirectorFeeService } from '../../membership-fee';
import { directorAppointedMail, directorRevokedMail, MailService } from '../../mail';
import { canAppointDirector, canRevokeDirector } from '../domain/regional-director.state';
import {
  type DirectorLock,
  RegionalDirectorRepository,
} from '../repositories/regional-director.repository';
import type { AffiliateActor } from '../types';

@Injectable()
export class RegionalDirectorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RegionalDirectorRepository,
    private readonly members: MemberDirectory,
    private readonly admins: AdminDirectoryService,
    private readonly fees: RegionalDirectorFeeService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async appoint(actor: AffiliateActor, input: DirectorAppointment, now = new Date()) {
    await this.transaction(async (tx) => {
      const slots = await this.repo.lockAll(tx);
      const slot = this.slot(slots, input.region, input.version);
      if (!canAppointDirector(slot.userId, input.userId, slots)) {
        throw conflict('Vùng hoặc thành viên đã có GĐ Vùng. Hãy thu hồi bổ nhiệm cũ trước.');
      }
      const member = await this.members.lockForDirector(tx, input.userId);
      if (!member || member.deletedAt) throw notFound('Không tìm thấy thành viên đã đăng ký');
      if (member.status !== 'active') throw conflict('Không thể bổ nhiệm thành viên đang bị khóa');
      await this.fees.appoint(tx, member.id);
      if (!(await this.repo.setIncumbent(tx, slot, member.id, now)))
        throw conflict('Vùng vừa được cập nhật');
      await this.record(tx, actor, slot, 'appointed', member, now);
      const config = (await this.repo.slots(tx)).find((row) => row.region === slot.region);
      const rendered = directorAppointedMail(
        member.fullName,
        slot.region,
        config?.provinces.map((p) => p.province) ?? [],
        this.env.PORTAL_URL,
      );
      await this.mail.request(tx, { to: member.email, kind: 'director_appointed', ...rendered });
    });
  }

  async revoke(actor: AffiliateActor, region: DirectorRegion, version: number, now = new Date()) {
    await this.transaction(async (tx) => {
      const slot = this.slot(await this.repo.lockAll(tx), region, version);
      if (!canRevokeDirector(slot.userId) || !slot.userId) throw conflict('Vùng chưa có GĐ Vùng');
      const member = await this.members.lockForDirector(tx, slot.userId);
      if (!member) throw notFound('Không tìm thấy thành viên');
      const fee = await this.fees.revoke(tx, member.id, now);
      if (!(await this.repo.setIncumbent(tx, slot, null, now)))
        throw conflict('Vùng vừa được cập nhật');
      await this.record(tx, actor, slot, 'revoked', member, now);
      const rendered = directorRevokedMail(member.fullName, region, now, fee, this.env.PORTAL_URL);
      await this.mail.request(tx, { to: member.email, kind: 'director_revoked', ...rendered });
    });
  }

  async configure(
    actor: AffiliateActor,
    region: DirectorRegion,
    input: DirectorConfigPatch,
    now = new Date(),
  ) {
    const known = new Set(provinces.map(([name]) => name));
    if (input.provinces.some((name) => !known.has(name)))
      throw new AppError('VALIDATION_ERROR', 'Tỉnh không hợp lệ', [
        { path: 'provinces', message: 'Chỉ chọn tỉnh trong danh mục 34 tỉnh/thành' },
      ]);
    await this.transaction(async (tx) => {
      const slot = this.slot(await this.repo.lockAll(tx), region, input.version);
      const occupied = await this.repo.occupiedProvinces(tx, region, input.provinces);
      if (occupied.length)
        throw conflict(`Tỉnh đã thuộc vùng khác: ${occupied.map((p) => p.province).join(', ')}`);
      if (!(await this.repo.configure(tx, slot, input))) throw conflict('Vùng vừa được cập nhật');
      const member = slot.userId ? await this.members.lockForDirector(tx, slot.userId) : undefined;
      await this.record(tx, actor, slot, 'updated', member ?? null, now, {
        provinces: input.provinces,
        bank: input.bank,
      });
    });
  }

  private slot(slots: DirectorLock[], region: DirectorRegion, version: number) {
    const slot = slots.find((row) => row.region === region);
    if (!slot) throw notFound('Không tìm thấy vùng');
    if (slot.version !== version) throw conflict('Cấu hình đã thay đổi. Vui lòng tải lại.');
    return slot;
  }

  private async record(
    tx: DbTx,
    actor: AffiliateActor,
    slot: DirectorLock,
    action: 'appointed' | 'revoked' | 'updated',
    member: { id: string; fullName: string } | null,
    now: Date,
    extra: Record<string, unknown> = {},
  ) {
    const admin = await this.admins.actor(tx, actor.id);
    if (!admin) throw forbidden('Tài khoản quản trị không còn hoạt động');
    const verb = { appointed: 'Bổ nhiệm', revoked: 'Thu hồi', updated: 'Cập nhật cấu hình' }[
      action
    ];
    const summary = `${verb} GĐ Vùng ${DIRECTOR_REGION_LABEL[slot.region]}${member ? ` · ${member.fullName}` : ''}`;
    const event = await this.repo.append(tx, {
      region: slot.region,
      action,
      userId: member?.id ?? null,
      memberName: member?.fullName ?? null,
      actorId: actor.id,
      actorName: admin.name,
      actorRole: admin.role,
      summary,
      createdAt: now,
    });
    await this.audit.log(tx, {
      actorId: actor.id,
      ip: actor.ip,
      action: `regional_director.${action}`,
      entity: 'regional_director',
      entityId: slot.region,
      tag: 'affiliate',
      summary,
      diff: { region: slot.region, memberId: member?.id ?? null, historyId: event.id, ...extra },
    });
  }

  private async transaction<T>(run: (tx: DbTx) => Promise<T>) {
    try {
      return await this.prisma.db.$transaction(run);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('Vùng, thành viên hoặc tỉnh đã được gán bởi thao tác khác');
      }
      throw error;
    }
  }
}
