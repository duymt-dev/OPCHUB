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
import { AppError, conflict, forbidden, notFound, unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MediaGcService } from '@/modules/uploads';
import { isValidE164 } from '../domain/register.mapper';
import { toPatch, toProfile, touchesLockedBiz } from '../domain/profile.mapper';
import { FEE_READER, type FeeReader } from '../ports';
import { ProfileRepository } from '../repositories/profile.repository';
import { ProfileStatsRegistry } from './profile-stats.registry';

const SUGGEST_LIMIT = 10;
const MSG = {
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
    private readonly gc: MediaGcService,
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
    // BUG-030: email (tên đăng nhập) không đổi ở đây — schema chặn, đi `/me/email/otp` + `/verify`
    const taken = await this.repo.takenByOther(
      userId,
      undefined,
      user.phone !== undefined && user.phone !== row.phone ? user.phone : undefined,
    );
    if (taken.phone) throw fieldError('CONFLICT', 'phone', MSG.phoneTaken);

    // TK cá nhân không có khối DN → bỏ qua khối `business` trong PATCH
    await this.prisma.db.$transaction(async (tx) => {
      await this.repo.update(tx, userId, user, row.businessProfile ? biz : null);
      // NA-26: avatar cũ vào hàng dọn (job 02:00, ân hạn 24h)
      if (user.avatarUrl !== undefined) {
        await this.gc.enqueueReplaced(tx, row.avatarUrl, user.avatarUrl, 'avatar');
      }
    });
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
    // BUG-030, NA-17: kiểm + xoá trong cùng một câu (repo) → không còn đường đăng nhập thì 409
    else if ((await this.repo.unlink(userId, id)).blocked) throw conflict(PROFILE_MESSAGES.lastSso);
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
