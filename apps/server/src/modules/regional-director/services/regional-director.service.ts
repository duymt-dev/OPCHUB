import { Injectable } from '@nestjs/common';
import { type DbTx, Prisma, type RegionalDirectorModel as RegionalDirector } from '@opchub/db';
import {
  REGIONAL_LABELS,
  type RegionalPatch,
  type RegionalRegion,
} from '@opchub/shared/api-domains';
import { AuditService } from '@/common/audit';
import { conflict, notFound } from '@/common/errors';
import { OutboxService } from '@/common/outbox';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RegionalFeeService } from '@/modules/membership-fee';
import { RegionalProjectionRepository } from '@/modules/reporting';
import { RegionalValidationError, regionalSqlState } from '../domain/regional-director.rules';
import { RegionalDirectorRepository } from '../repositories/regional-director.repository';

export interface RegionalActor {
  id: string;
  role: string;
  ip: string | null;
}

@Injectable()
export class RegionalDirectorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: RegionalDirectorRepository,
    private readonly fees: RegionalFeeService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly projection: RegionalProjectionRepository,
  ) {}

  appoint(actor: RegionalActor, region: RegionalRegion, userId: string, now = new Date()) {
    return this.write(async (tx) => {
      const slot = await this.slot(tx, region);
      const member = await this.projection.member(tx, userId);
      if (!member) throw notFound('Không tìm thấy thành viên');
      if (member.status === 'locked')
        throw new RegionalValidationError(
          `Tài khoản ${member.fullName} đang bị khóa – không thể bổ nhiệm.`,
        );
      if (member.accountType === 'investor')
        throw new RegionalValidationError('Nhà đầu tư không làm GĐ Vùng');
      const current = await this.repo.occupied(tx, userId);
      if (current)
        throw conflict(
          `${member.fullName} đang là GĐ Vùng ${REGIONAL_LABELS[current.region]} – mỗi thành viên chỉ phụ trách 1 vùng. Thu hồi ở vùng cũ trước.`,
        );
      if (slot.userId) await this.revokeWithin(tx, actor, slot, now);
      const prev = await this.fees.enter(tx, userId, now);
      const version = slot.version + (slot.userId ? 1 : 0);
      await this.update(
        tx,
        { ...slot, version },
        {
          userId,
          appointedAt: now,
          appointedBy: actor.id,
          prevFeeStatus: prev.prevStatus,
          prevValidUntil: prev.prevValidUntil,
        },
      );
      await this.record(tx, actor, region, userId, member.fullName, 'appoint', now);
      const provinces = await this.repo.provinces(tx, region);
      await this.outbox.add(tx, 'regional_director.appointed', {
        region,
        userId,
        provinces: provinces.map((p) => p.province),
      });
    });
  }

  revoke(actor: RegionalActor, region: RegionalRegion, now = new Date()) {
    return this.write(async (tx) => this.revokeWithin(tx, actor, await this.slot(tx, region), now));
  }

  patch(actor: RegionalActor, region: RegionalRegion, input: RegionalPatch) {
    return this.write(async (tx) => {
      const slot = await this.slot(tx, region);
      if (input.provinces) {
        if (
          (await this.projection.validProvinces(tx, region, input.provinces)) !==
          input.provinces.length
        ) {
          throw new RegionalValidationError(
            `Tỉnh không thuộc ${REGIONAL_LABELS[region]}`,
            'provinces',
          );
        }
        await this.repo.replaceProvinces(tx, region, input.provinces);
      }
      await this.update(tx, slot, input.bank ?? {});
      await this.audit.log(tx, {
        actorId: actor.id,
        action: 'regional_director.update',
        entity: 'regional_director',
        entityId: region,
        tag: 'affiliate',
        ip: actor.ip,
        summary: `Cập nhật GĐ Vùng ${REGIONAL_LABELS[region]}`,
        diff: { region, provinces: input.provinces, bankChanged: Boolean(input.bank) },
      });
    });
  }

  private async revokeWithin(tx: DbTx, actor: RegionalActor, slot: RegionalDirector, now: Date) {
    if (!slot.userId) throw conflict('Vùng này chưa có GĐ Vùng');
    const member = await this.projection.member(tx, slot.userId);
    const fee = await this.fees.leave(
      tx,
      slot.userId,
      {
        prevStatus: slot.prevFeeStatus,
        prevValidUntil: slot.prevValidUntil,
      },
      now,
    );
    await this.update(tx, slot, {
      userId: null,
      appointedAt: null,
      appointedBy: null,
      prevFeeStatus: null,
      prevValidUntil: null,
    });
    await this.record(
      tx,
      actor,
      slot.region,
      slot.userId,
      member?.fullName ?? slot.userId,
      'revoke',
      now,
    );
    await this.outbox.add(tx, 'regional_director.revoked', {
      region: slot.region,
      userId: slot.userId,
      feeStatus: fee.status,
      validUntil: fee.validUntil?.toISOString() ?? null,
      revokedAt: now.toISOString(),
    });
  }

  private async record(
    tx: DbTx,
    actor: RegionalActor,
    region: RegionalRegion,
    userId: string,
    userName: string,
    action: 'appoint' | 'revoke',
    createdAt: Date,
  ) {
    await this.repo.event(tx, {
      region,
      userId,
      userName,
      action,
      createdAt,
      actorId: actor.id,
      actorRole: actor.role,
    });
    await this.audit.log(tx, {
      actorId: actor.id,
      action: `regional_director.${action}`,
      entity: 'regional_director',
      entityId: region,
      tag: 'affiliate',
      ip: actor.ip,
      summary: `${action === 'appoint' ? 'Bổ nhiệm' : 'Thu hồi'} ${userName} · ${REGIONAL_LABELS[region]}`,
      diff: { region, userId, actorRole: actor.role },
    });
  }

  private async slot(tx: DbTx, region: RegionalRegion) {
    const slot = await this.repo.lock(tx, region);
    if (!slot) throw notFound('Không tìm thấy vùng');
    return slot;
  }

  private async update(
    tx: DbTx,
    slot: RegionalDirector,
    data: Prisma.RegionalDirectorUncheckedUpdateManyInput,
  ) {
    if ((await this.repo.update(tx, slot, data)).count !== 1)
      throw conflict('GĐ Vùng vừa được cập nhật bởi thao tác khác');
  }

  private async write(fn: (tx: DbTx) => Promise<unknown>) {
    try {
      await this.prisma.db.$transaction(fn);
      return { updated: true as const };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' ||
          error.code === 'P2034' ||
          (error.code === 'P2010' && regionalSqlState(error.meta) === '55P03'))
      ) {
        throw conflict('GĐ Vùng vừa được cập nhật bởi thao tác khác');
      }
      throw error;
    }
  }
}
