import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { AppError } from '@/common/errors';
import type { ReferralPort } from '../ports';

/** Account không import Affiliate ngược: domain đăng ký cổng khi onModuleInit. */
@Injectable()
export class ReferralRegistry implements ReferralPort {
  private delegate: ReferralPort | undefined;

  register(port: ReferralPort): void {
    this.delegate = port;
  }

  async validate(code: string, email: string): Promise<void> {
    if (!this.delegate) throw new AppError('CONFLICT', 'Chương trình giới thiệu chưa sẵn sàng');
    await this.delegate.validate(code, email);
  }

  async attach(tx: DbTx, userId: string, code: string): Promise<void> {
    if (!this.delegate) throw new AppError('CONFLICT', 'Chương trình giới thiệu chưa sẵn sàng');
    await this.delegate.attach(tx, userId, code);
  }

  /** Chưa nạp module Affiliate (process không cần) → bỏ qua; worker backfill tạo bù khi khởi động */
  async enroll(tx: DbTx, userId: string): Promise<void> {
    await this.delegate?.enroll(tx, userId);
  }
}
