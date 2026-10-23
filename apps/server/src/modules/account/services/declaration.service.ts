import { Inject, Injectable } from '@nestjs/common';
import type {
  BusinessDeclaration,
  DeclarationDraft,
  DeclarationRequest,
  Me,
} from '@opchub/shared/api';
import { provinces, registrationRoles } from '@opchub/shared/fixtures';
import { AppError, forbidden, unauthorized } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { businessVerification } from '../domain/register.mapper';
import { GROUP_JOIN_PORT, type GroupJoinPort } from '../ports';
import {
  type BusinessDeclarationWrite,
  type DeclarationRow,
  DeclarationRepository,
} from '../repositories/declaration.repository';
import { BizLookupService } from './biz-lookup.service';
import { MeService } from './me.service';

const MSG = {
  investor: 'Nhà đầu tư không cần khai báo thông tin tham gia',
  wrongType: 'Loại khai báo không khớp loại tài khoản',
  persona: 'Vui lòng chọn bạn là ai',
  groups: 'Vui lòng chọn OPC bạn muốn tham gia',
  province: 'Vui lòng chọn tỉnh/thành đăng ký kinh doanh trong danh sách',
} as const;

const invalid = (path: string, message: string) =>
  new AppError('VALIDATION_ERROR', message, [{ path, message }]);

const PROVINCES = new Set(provinces.map(([name]) => name));
const ROLES = new Set(registrationRoles.map((r) => r.id));

/**
 * V4-607 (UP-02, REQ-504): khai báo sau đăng nhập — `GET/PUT /me/declaration`.
 * Một transaction: hồ sơ + `declared_at` + vào nhóm (NA-18, idempotent). Gọi lại = cập nhật.
 */
@Injectable()
export class DeclarationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: DeclarationRepository,
    private readonly biz: BizLookupService,
    private readonly me: MeService,
    @Inject(GROUP_JOIN_PORT) private readonly groups: GroupJoinPort,
  ) {}

  async draft(userId: string): Promise<DeclarationDraft> {
    const row = await this.load(userId);
    const b = row.business;
    return {
      persona: row.registrationRole,
      groupIds: row.opcIntent,
      business: b
        ? {
            taxCode: b.taxCode,
            companyName: b.companyName,
            mainIndustry: b.mainField,
            size: b.size,
            province: b.province,
          }
        : null,
    };
  }

  async save(userId: string, req: DeclarationRequest, now = new Date()): Promise<Me> {
    const row = await this.load(userId);
    if (req.accountType !== row.accountType) throw forbidden(MSG.wrongType);
    const groupIds = await this.groups.existingGroupIds(req.groupIds);
    if (!groupIds.length) throw invalid('groupIds', MSG.groups);
    if (req.accountType === 'personal') {
      if (!ROLES.has(req.persona)) throw invalid('persona', MSG.persona);
      await this.prisma.db.$transaction(async (tx) => {
        await this.repo.markPersonal(tx, userId, req.persona, groupIds, now);
        await this.groups.requestJoin(tx, userId, groupIds);
      });
    } else {
      if (!PROVINCES.has(req.province)) throw invalid('province', MSG.province);
      const write = await this.businessWrite(row, req);
      await this.prisma.db.$transaction(async (tx) => {
        await this.repo.markBusiness(
          tx,
          userId,
          { name: row.representative, position: row.position ?? '' },
          write,
          groupIds,
          now,
        );
        await this.groups.requestJoin(tx, userId, groupIds);
      });
    }
    return this.me.me(userId);
  }

  private async load(userId: string): Promise<DeclarationRow> {
    const row = await this.repo.find(userId);
    if (!row) throw unauthorized();
    if (row.accountType === 'investor') throw forbidden(MSG.investor);
    return row;
  }

  /** D-66: tra MST như đăng ký; lỗi tra cứu không chặn (D-40). MST + tên giữ nguyên → giữ xác minh */
  private async businessWrite(
    row: DeclarationRow,
    req: BusinessDeclaration,
  ): Promise<BusinessDeclarationWrite> {
    const base = {
      taxCode: req.taxCode,
      companyName: req.companyName,
      mainField: req.mainIndustry,
      size: req.size,
      province: req.province,
    };
    const same =
      row.business?.taxCode === req.taxCode && row.business.companyName === req.companyName;
    if (same) return { ...base, verification: null, lookupRaw: null };
    const found = await this.biz.raw(req.taxCode).catch(() => null);
    return {
      ...base,
      verification: businessVerification(req.companyName, found?.name ?? null),
      lookupRaw: found,
    };
  }
}
