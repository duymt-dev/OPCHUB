import { Inject, Injectable } from '@nestjs/common';
import {
  type MemberSuggestion,
  PROFILE_MESSAGES,
  type Profile,
  SSO_IDS,
  type SsoId,
  type SsoLinkResult,
  type UpdateProfileRequest,
} from '@opchub/shared/api-domains';
import { registrationRoles } from '@opchub/shared/fixtures';
import { AppError, forbidden, notFound, unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { isValidE164 } from '../domain/register.mapper';
import { toPatch, toProfile, touchesLockedBiz } from '../domain/profile.mapper';
import { FEE_READER, type FeeReader } from '../ports';
import { ProfileRepository } from '../repositories/profile.repository';
import { ProfileStatsRegistry } from './profile-stats.registry';

const SUGGEST_LIMIT = 10;
const MSG = {
  emailTaken: 'Email đã được sử dụng cho tài khoản khác',
  phoneTaken: 'Số điện thoại đã được sử dụng cho tài khoản khác',
  phoneInvalid: 'Số điện thoại không hợp lệ',
} as const;

const fieldError = (code: 'CONFLICT' | 'VALIDATION_ERROR', path: string, message: string) =>
  new AppError(code, message, [{ path, message }]);

/** Hồ sơ cá nhân UP-06 (`GET/PATCH /me`), liên kết SSO, gợi ý thành viên */
@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProfileRepository,
    private readonly stats: ProfileStatsRegistry,
    @Inject(FEE_READER) private readonly fees: FeeReader,
  ) {}

  async get(userId: string): Promise<Profile> {
    const [row, fee, stats] = await Promise.all([
      this.repo.find(userId),
      this.fees.feeOf(userId),
      this.stats.statsOf(userId),
    ]);
    if (!row) throw unauthorized();
    return toProfile(row, fee, stats);
  }

  async update(userId: string, req: UpdateProfileRequest): Promise<Profile> {
    const row = await this.repo.find(userId);
    if (!row) throw unauthorized();
    const { user, biz } = toPatch(req);
    if (touchesLockedBiz(row, biz)) throw forbidden(PROFILE_MESSAGES.bizLocked);
    if (user.phone != null && !isValidE164(user.phone)) {
      throw fieldError('VALIDATION_ERROR', 'phone', MSG.phoneInvalid);
    }
    const emailChanged = user.email !== undefined && user.email !== row.email.toLowerCase();
    const taken = await this.repo.takenByOther(
      userId,
      emailChanged ? user.email : undefined,
      user.phone !== undefined && user.phone !== row.phone ? user.phone : undefined,
    );
    if (taken.email) throw fieldError('CONFLICT', 'email', MSG.emailTaken);
    if (taken.phone) throw fieldError('CONFLICT', 'phone', MSG.phoneTaken);

    // TK cá nhân không có khối DN → bỏ qua khối `business` trong PATCH
    await this.prisma.db.$transaction((tx) =>
      this.repo.update(tx, userId, user, row.businessProfile ? biz : null),
    );
    return this.get(userId);
  }

  async setSso(userId: string, provider: string, linked: boolean): Promise<SsoLinkResult> {
    if (!(SSO_IDS as readonly string[]).includes(provider)) {
      throw notFound('Không hỗ trợ nhà cung cấp này');
    }
    const id = provider as SsoId;
    const row = await this.repo.find(userId);
    if (!row) throw unauthorized();
    if (linked) await this.repo.link(userId, id, row.email);
    else await this.repo.unlink(userId, id);
    return { provider: id, linked };
  }

  async suggest(q: string): Promise<MemberSuggestion[]> {
    const term = q.trim();
    if (term.length < 2) return [];
    const rows = await this.repo.suggest(term, SUGGEST_LIMIT);
    return rows.map((r) => ({
      name: r.full_name,
      subtitle: [registrationRoles.find((x) => x.id === r.registration_role)?.label, r.position]
        .filter(Boolean)
        .join(' · '),
      avatarUrl: r.avatar_url,
    }));
  }
}
