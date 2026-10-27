import { Inject, Injectable } from '@nestjs/common';
import { fundAmountOf } from '@opchub/shared';
import type { Fundraising, FundraisingPayment } from '@opchub/shared/api-domains';
import { ENV, type Env } from '@/common/config';
import { conflict, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PriceConfigService } from '@/modules/pricing';
import { isLive } from '../domain/fundraising-status';
import { FundraisingRepository, type FundraisingRow } from '../repositories/fundraising.repository';

const NOT_FOUND = 'Không tìm thấy dự án';

export const toFundraising = (r: FundraisingRow): Fundraising => ({
  id: r.id,
  projectId: r.projectId,
  projectName: r.project.name,
  code: r.code,
  amount: r.amount,
  status: r.status,
  endsAt: r.endsAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

/**
 * V4-610 (UP-11, D-82): chủ dự án mua Gói Gọi vốn — mã CK `GV` + 6 số, chuyển khoản cùng tài khoản
 * Vietcombank của phí thành viên; kích hoạt "chờ thẩm định" khi webhook ngân hàng về (D-31).
 */
@Injectable()
export class FundraisingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: FundraisingRepository,
    @Inject(ENV) private readonly env: Env,
    private readonly prices: PriceConfigService,
  ) {}

  private payment(r: FundraisingRow): FundraisingPayment {
    return {
      ...toFundraising(r),
      bank: {
        bankName: this.env.BANK_NAME,
        accountNo: this.env.BANK_ACCOUNT_NO,
        accountName: this.env.BANK_ACCOUNT_NAME,
        bankFullName: this.env.BANK_FULL_NAME,
      },
      transferContent: `OPCHUB ${r.code ?? ''}`.trim(),
    };
  }

  /**
   * Khoản chờ thanh toán của dự án: đã có thì trả lại (cùng mã — idempotent); đang chờ thẩm định /
   * đang gọi vốn còn hạn → 409 (D-106). Khoá dòng dự án để hai request song song không tạo hai mã.
   */
  async start(userId: string, projectId: string, now = new Date()): Promise<FundraisingPayment> {
    const row = await this.prisma.db.$transaction(async (tx) => {
      const own = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM projects WHERE id = ${projectId} AND owner_id = ${userId}
          AND deleted_at IS NULL FOR UPDATE`;
      if (!own.length) throw notFound(NOT_FOUND);
      const cur = await this.repo.current(tx, projectId);
      const open = cur.find((r) => r.status === 'pending_payment');
      if (open) return open;
      if (cur.some((r) => r.status === 'pending_review')) {
        throw conflict('Gói Gọi vốn đang chờ Admin thẩm định');
      }
      // Q-V4-610-2: khoản legacy (khai báo trước V4, không thu) không chặn mua gói có phí
      const live = cur.find(
        (r) => r.status === 'active' && !r.legacy && r.endsAt && r.endsAt > now,
      );
      if (live && isLive(live.endsAt, now)) throw conflict('Dự án đang gọi vốn');
      // D-106 (B2): khoản trước đã hết hạn → giá gia hạn; D-94 5A: giá theo Cấu hình bảng giá
      const amount = fundAmountOf(
        await this.prices.current(),
        await this.repo.everApproved(tx, projectId),
      );
      return this.repo.create(tx, { projectId, ownerId: userId, amount });
    });
    return this.payment(row);
  }

  async mine(userId: string): Promise<{ items: Fundraising[] }> {
    return { items: (await this.repo.mine(userId)).map(toFundraising) };
  }

  /** "Tôi đã chuyển khoản": chỉ ghi nhận (D-31) — đổi trạng thái khi đối soát */
  async confirm(userId: string, id: string) {
    const r = await this.repo.findOwned(userId, id);
    if (!r) throw notFound('Không tìm thấy Gói Gọi vốn');
    return { status: r.status, awaitingWebhook: r.status === 'pending_payment' };
  }
}
