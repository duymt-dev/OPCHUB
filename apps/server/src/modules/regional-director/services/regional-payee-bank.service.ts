import { Injectable } from '@nestjs/common';
import { regionalBankSchema, type RegionalRegion } from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { AuditService } from '@/common/audit';
import { notFound, conflict } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RegionalDirectorRepository } from '../repositories/regional-director.repository';
import { RegionalPayeeBankRepository } from '../repositories/regional-payee-bank.repository';
import type { RegionalActor } from './regional-director.service';

@Injectable()
export class RegionalPayeeBankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: RegionalDirectorRepository,
    private readonly banks: RegionalPayeeBankRepository,
    private readonly audit: AuditService,
  ) {}

  save(
    actor: RegionalActor,
    region: RegionalRegion,
    userId: string,
    bank: z.infer<typeof regionalBankSchema>,
  ) {
    return this.prisma.db.$transaction(async (tx) => {
      const slot = await this.slots.lock(tx, region);
      if (!slot) throw notFound('Không tìm thấy vùng');
      if (slot.userId === userId)
        throw conflict('Cập nhật tài khoản GĐ Vùng đương nhiệm tại cấu hình vùng');
      if (!(await this.banks.eligible(tx, region, userId)))
        throw notFound('Không tìm thấy người nhận của vùng');
      await this.banks.save(tx, region, userId, bank, actor.id);
      await this.audit.log(tx, {
        actorId: actor.id,
        ip: actor.ip,
        action: 'regional_director.payee_bank',
        entity: 'regional_director',
        entityId: `${region}:${userId}`,
        tag: 'affiliate',
        summary: 'Cập nhật tài khoản nhận của GĐ Vùng đã thu hồi',
        diff: { region, userId, bankLast4: bank.bankNo.replaceAll(' ', '').slice(-4) },
      });
      return { updated: true as const };
    });
  }
}
