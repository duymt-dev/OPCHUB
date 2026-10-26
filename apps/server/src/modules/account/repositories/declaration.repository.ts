import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

/** Dữ liệu đã có để điền sẵn popup khai báo (V4-607) */
export interface DeclarationRow {
  accountType: 'personal' | 'business' | 'investor';
  registrationRole: string | null;
  opcIntent: string[];
  representative: string;
  position: string | null;
  business: {
    taxCode: string;
    companyName: string;
    mainField: string;
    size: string | null;
    province: string | null;
  } | null;
}

export interface BusinessDeclarationWrite {
  taxCode: string;
  companyName: string;
  mainField: string;
  size: string;
  province: string;
  /** null = giữ trạng thái xác minh hiện có (MST + tên DN không đổi) */
  verification: 'verified' | 'pending' | null;
  lookupRaw: Prisma.InputJsonValue | null;
}

@Injectable()
export class DeclarationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: string): Promise<DeclarationRow | null> {
    const u = await this.prisma.db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        accountType: true,
        registrationRole: true,
        opcIntent: true,
        fullName: true,
        position: true,
        businessProfile: {
          select: {
            taxCode: true,
            companyName: true,
            mainField: true,
            size: true,
            province: true,
          },
        },
      },
    });
    if (!u) return null;
    const b = u.businessProfile;
    return {
      accountType: u.accountType,
      registrationRole: u.registrationRole,
      opcIntent: u.opcIntent,
      representative: u.fullName,
      position: u.position,
      business: b
        ? {
            taxCode: b.taxCode,
            companyName: b.companyName,
            mainField: b.mainField,
            size: b.size,
            province: b.province,
          }
        : null,
    };
  }

  async markPersonal(tx: DbTx, userId: string, persona: string, groupIds: string[], at: Date) {
    await tx.user.update({
      where: { id: userId },
      data: { registrationRole: persona, opcIntent: groupIds, declaredAt: at },
    });
  }

  /** Upsert hồ sơ DN (một DN / tài khoản) + cờ khai báo, cùng transaction */
  async markBusiness(
    tx: DbTx,
    userId: string,
    rep: { name: string; position: string },
    b: BusinessDeclarationWrite,
    groupIds: string[],
    at: Date,
  ) {
    const fields = {
      taxCode: b.taxCode,
      companyName: b.companyName,
      mainField: b.mainField,
      size: b.size,
      province: b.province,
      ...(b.verification
        ? { verification: b.verification, verifiedAt: b.verification === 'verified' ? at : null }
        : {}),
      ...(b.lookupRaw !== null ? { lookupRaw: b.lookupRaw } : {}),
    };
    await tx.businessProfile.upsert({
      where: { userId },
      create: {
        userId,
        representative: rep.name,
        position: rep.position,
        subFields: [],
        ...fields,
        verification: b.verification ?? 'pending',
      },
      update: fields,
    });
    await tx.user.update({
      where: { id: userId },
      data: { opcIntent: groupIds, declaredAt: at },
    });
  }
}
