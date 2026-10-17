import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { SsoId } from '@opchub/shared/api-domains';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SESSION_SELECT } from './user.repository';

/** Cột hồ sơ đầy đủ (UP-06) — chỉ bảng của account */
const PROFILE_SELECT = {
  ...SESSION_SELECT,
  phone: true,
  registrationRole: true,
  position: true,
  country: true,
  city: true,
  bio: true,
  createdAt: true,
  businessProfile: {
    select: {
      taxCode: true,
      companyName: true,
      mainField: true,
      size: true,
      position: true,
      website: true,
      verification: true,
    },
  },
  identities: { select: { provider: true } },
} as const;

export interface UserPatch {
  fullName?: string;
  email?: string;
  phone?: string | null;
  registrationRole?: string;
  country?: string;
  city?: string;
  bio?: string;
  avatarUrl?: string | null;
}

export interface BusinessPatch {
  taxCode?: string;
  companyName?: string;
  mainField?: string;
  size?: string;
  position?: string;
  website?: string;
}

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(userId: string) {
    return this.prisma.db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: PROFILE_SELECT,
    });
  }

  /** Email/SĐT đã thuộc TK KHÁC */
  async takenByOther(userId: string, email?: string, phone?: string | null) {
    const or = [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])];
    if (!or.length) return { email: false, phone: false };
    const rows = await this.prisma.db.user.findMany({
      where: { id: { not: userId }, OR: or },
      select: { email: true, phone: true },
      take: 2,
    });
    return {
      email: email !== undefined && rows.some((r) => r.email.toLowerCase() === email),
      phone: phone != null && rows.some((r) => r.phone === phone),
    };
  }

  async update(tx: DbTx, userId: string, user: UserPatch, biz: BusinessPatch | null) {
    if (Object.keys(user).length) await tx.user.update({ where: { id: userId }, data: user });
    if (biz && Object.keys(biz).length) {
      await tx.businessProfile.update({ where: { userId }, data: biz });
    }
  }

  async link(userId: string, provider: SsoId, email: string): Promise<void> {
    // Liên kết thủ công từ hồ sơ: subject giả định theo email cho tới khi có OAuth thật (OQ-04)
    await this.prisma.db.authIdentity.upsert({
      where: { provider_subject: { provider, subject: `${provider}:${email}` } },
      create: { userId, provider, subject: `${provider}:${email}`, email },
      update: {},
    });
  }

  async unlink(userId: string, provider: SsoId): Promise<void> {
    await this.prisma.db.authIdentity.deleteMany({ where: { userId, provider } });
  }

  /**
   * Gợi ý thành viên (dự án thêm thành viên): ILIKE '%…%' trên đúng biểu thức của GIN trigram
   * `users_search` → Bitmap Index Scan. Ký tự đại diện của người dùng được escape.
   */
  suggest(term: string, limit: number) {
    const like = `%${term.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    return this.prisma.db.$queryRaw<
      {
        full_name: string;
        registration_role: string | null;
        position: string | null;
        avatar_url: string | null;
      }[]
    >`
      SELECT full_name, registration_role, position, avatar_url
      FROM users
      WHERE (immutable_unaccent(full_name) || ' ' || email::text) ILIKE immutable_unaccent(${like})
        AND status = 'active' AND deleted_at IS NULL AND system_role = 'member'
      ORDER BY full_name
      LIMIT ${limit}`;
  }
}
