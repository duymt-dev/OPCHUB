import { Injectable } from '@nestjs/common';
import type { DbTx, Prisma } from '@opchub/db';
import type { SsoId } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { SessionUser } from '../domain/me.mapper';
import type { PendingRegistration } from '../domain/register.mapper';
import { SESSION_SELECT } from './user.repository';

export const TERMS_VERSION = '2026-10';

export interface NewAccount {
  reg: PendingRegistration;
  verification: 'verified' | 'pending' | null;
  lookupRaw: Prisma.InputJsonValue | null;
  emailVerifiedAt: Date;
  ip: string | null;
  sso?: { provider: SsoId; subject: string };
}

/** Ghi tài khoản mới (bảng của account). Phí + nhóm do domain sở hữu ghi qua port, cùng tx. */
@Injectable()
export class RegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Email/SĐT đã thuộc TK khác (kể cả TK đã xoá mềm — UQ toàn bảng) */
  async taken(email: string, phone: string | null): Promise<{ email: boolean; phone: boolean }> {
    const rows = await this.prisma.db.user.findMany({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
      select: { email: true, phone: true },
      take: 2,
    });
    return {
      email: rows.some((r) => r.email.toLowerCase() === email),
      phone: phone !== null && rows.some((r) => r.phone === phone),
    };
  }

  /** D-41: Mã TV = 'TV' + 6 số từ sequence */
  private async nextMemberCode(tx: DbTx): Promise<string> {
    const [row] = await tx.$queryRaw<{ code: string }[]>`
      SELECT 'TV' || lpad(nextval('member_code_seq')::text, 6, '0') AS code`;
    if (!row) throw new Error('Không sinh được mã thành viên');
    return row.code;
  }

  async create(tx: DbTx, a: NewAccount): Promise<SessionUser> {
    const { reg } = a;
    const user = await tx.user.create({
      data: {
        memberCode: await this.nextMemberCode(tx),
        accountType: reg.accountType,
        fullName: reg.fullName,
        email: reg.email,
        phone: reg.phone,
        passwordHash: reg.passwordHash,
        registrationRole: reg.registrationRole,
        position: reg.position,
        country: reg.country,
        emailVerifiedAt: a.emailVerifiedAt,
      },
      select: SESSION_SELECT,
    });
    if (reg.business) {
      await tx.businessProfile.create({
        data: {
          userId: user.id,
          taxCode: reg.business.taxCode,
          companyName: reg.business.companyName,
          representative: reg.business.representative,
          position: reg.business.position,
          mainField: reg.business.mainField,
          subFields: reg.business.subFields,
          size: reg.business.size,
          country: reg.business.country,
          verification: a.verification ?? 'pending',
          verifiedAt: a.verification === 'verified' ? a.emailVerifiedAt : null,
          ...(a.lookupRaw !== null ? { lookupRaw: a.lookupRaw } : {}),
        },
      });
    }
    await tx.consent.createMany({
      data: (['terms', 'privacy'] as const).map((kind) => ({
        userId: user.id,
        kind,
        version: TERMS_VERSION,
        ip: a.ip,
      })),
    });
    if (a.sso) {
      await tx.authIdentity.create({
        data: {
          userId: user.id,
          provider: a.sso.provider,
          subject: a.sso.subject,
          email: reg.email,
        },
      });
    }
    return user;
  }

  findByIdentity(provider: SsoId, subject: string) {
    return this.prisma.db.authIdentity.findUnique({
      where: { provider_subject: { provider, subject } },
      select: { userId: true },
    });
  }

  findSessionByEmail(email: string): Promise<SessionUser | null> {
    return this.prisma.db.user.findFirst({
      where: { email, deletedAt: null },
      select: SESSION_SELECT,
    });
  }

  countMembers(): Promise<number> {
    return this.prisma.db.user.count({
      where: { deletedAt: null, systemRole: 'member', status: 'active' },
    });
  }
}
