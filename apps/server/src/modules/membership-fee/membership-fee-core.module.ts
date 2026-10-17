import { Global, Injectable, Module } from '@nestjs/common';
import { FEE_READER, type FeeReader, type FeeSnapshot } from '../account';
import { MembershipFeeRepository } from './membership-fee.repository';

/** Hiện thực cổng FeeReader cho account (dựng `me` + claim JWT) */
@Injectable()
export class FeeReaderService implements FeeReader {
  constructor(private readonly repo: MembershipFeeRepository) {}

  feeOf(userId: string): Promise<FeeSnapshot | null> {
    return this.repo.findCurrent(userId);
  }
}

/** Service + repository (không controller) — dùng cho cả api, socket, worker */
@Global()
@Module({
  providers: [
    MembershipFeeRepository,
    FeeReaderService,
    { provide: FEE_READER, useExisting: FeeReaderService },
  ],
  exports: [FEE_READER, MembershipFeeRepository],
})
export class MembershipFeeCoreModule {}
