import { Injectable } from '@nestjs/common';
import {
  type MyNeeds,
  type Need,
  type NeedCreate,
  NEED_FIELD_OTHER,
  NEED_MESSAGES,
  STORE_MESSAGES,
} from '@opchub/shared/api-domains';
import { provinces, STORE_FIELDS } from '@opchub/shared/fixtures';
import { AppError, conflict, forbidden, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NeedRepository } from '../repositories/need.repository';
import type { StoreOwner } from './store-owner.service';
import { NeedExploreService } from './need-explore.service';

const PROVINCES = new Set(provinces.map(([name]) => name));
const FIELDS = new Set<string>(STORE_FIELDS);

const invalid = (path: string, message: string) =>
  new AppError('VALIDATION_ERROR', message, [{ path, message }]);

/** Hạn yyyy-mm-dd → 00:00 giờ VN (luật 9: lưu timestamptz UTC) */
const dueAt = (d: string | null) => (d ? new Date(`${d}T00:00:00+07:00`) : null);

/** Nhu cầu của tôi (UP-09, D-75): chủ gian hàng đăng — hiển thị ngay; đóng / mở lại / xoá */
@Injectable()
export class NeedOwnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: NeedRepository,
    private readonly explore: NeedExploreService,
  ) {}

  private async store(u: StoreOwner) {
    if (u.accountType !== 'business') throw forbidden(STORE_MESSAGES.businessOnly);
    return this.prisma.db.store.findUnique({
      where: { ownerId: u.id },
      select: { id: true, name: true, province: true },
    });
  }

  async mine(u: StoreOwner): Promise<MyNeeds> {
    const store = await this.store(u);
    const rows = await this.repo.mine(u.id);
    return { store, items: await this.explore.withSuggestions(rows, u.id) };
  }

  async create(u: StoreOwner, v: NeedCreate): Promise<Need> {
    const store = await this.store(u);
    if (!store) throw conflict(NEED_MESSAGES.noStore);
    const custom = v.field === NEED_FIELD_OTHER;
    if (!custom && !FIELDS.has(v.field)) throw invalid('field', NEED_MESSAGES.field);
    if (!PROVINCES.has(v.province)) throw invalid('province', 'Tỉnh / thành không hợp lệ');
    const row = await this.repo.create({
      storeId: store.id,
      ownerId: u.id,
      type: v.type,
      title: v.title,
      description: v.description,
      field: custom ? v.fieldCustom : v.field,
      fieldCustom: custom,
      quantity: v.quantity,
      budgetMin: v.budgetMin === null ? null : BigInt(v.budgetMin),
      budgetMax: v.budgetMax === null ? null : BigInt(v.budgetMax),
      province: v.province,
      ward: v.ward,
      dueAt: dueAt(v.dueDate),
      scope: v.scope,
      cooperation: v.cooperation,
      standards: v.standards,
      docUrl: v.docUrl,
      contactName: v.contactName,
      phone: v.phone,
      email: v.email,
      channel: v.channel,
    });
    await this.explore.invalidate();
    const [need] = await this.explore.withSuggestions([row], u.id);
    if (!need) throw notFound('Không tìm thấy nhu cầu');
    return need;
  }

  private async owned(u: StoreOwner, id: string) {
    if (u.accountType !== 'business') throw forbidden(STORE_MESSAGES.businessOnly);
    const n = await this.repo.owned(u.id, id);
    if (!n) throw notFound('Không tìm thấy nhu cầu');
    if (n.status === 'hidden') throw conflict(NEED_MESSAGES.hidden);
    return n;
  }

  async step(u: StoreOwner, id: string, action: 'close' | 'reopen'): Promise<Need> {
    await this.owned(u, id);
    if (!(await this.repo.step(u.id, id, action)))
      throw conflict('Nhu cầu đã thay đổi, vui lòng tải lại');
    await this.explore.invalidate();
    const row = await this.repo.byId(id);
    if (!row) throw notFound('Không tìm thấy nhu cầu');
    const [need] = await this.explore.withSuggestions([row], u.id);
    if (!need) throw notFound('Không tìm thấy nhu cầu');
    return need;
  }

  async remove(u: StoreOwner, id: string): Promise<void> {
    await this.owned(u, id);
    if (!(await this.repo.remove(u.id, id))) throw conflict(NEED_MESSAGES.hidden);
    await this.explore.invalidate();
  }
}
