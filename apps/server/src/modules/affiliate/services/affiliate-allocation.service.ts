import { Injectable } from '@nestjs/common';
import type { AffiliateStatus, DbTx } from '@opchub/db';
import { affiliateCode } from '../domain/affiliate-code';
import { AffiliateAllocationRepository } from '../repositories/affiliate-allocation.repository';
import { AffiliateRepository } from '../repositories/affiliate.repository';

export interface AffiliateCandidate {
  userId: string;
  fullName: string;
  status: AffiliateStatus;
}

/** Sinh mã ở app, đọc mã đã dùng một lần, không query theo từng người/thử mã. */
@Injectable()
export class AffiliateAllocationService {
  constructor(
    private readonly repo: AffiliateAllocationRepository,
    private readonly affiliates: AffiliateRepository,
  ) {}

  async ensure(tx: DbTx, members: AffiliateCandidate[]): Promise<number> {
    if (!members.length) return 0;
    await this.repo.lock(tx);
    const existing = new Set(
      (
        await this.repo.existingUsers(
          tx,
          members.map((m) => m.userId),
        )
      ).map((r) => r.userId),
    );
    const missing = members.filter((m) => !existing.has(m.userId));
    if (!missing.length) return 0;
    // 20 lần hậu tố 2 số, sau đó duyệt đủ 900 hậu tố 3 số.
    const candidates = missing.map((m) =>
      Array.from({ length: 920 }, (_, i) => affiliateCode(m.fullName, i)),
    );
    const used = new Set(
      (await this.repo.takenCodes(tx, [...new Set(candidates.flat())])).map((r) => r.code),
    );
    const rate = await this.affiliates.defaultRate(tx);
    const rows = missing.map((m, i) => {
      const code = candidates[i]?.find((c) => !used.has(c));
      if (!code) throw new Error(`Không sinh được mã đại lý cho ${m.userId}`);
      used.add(code);
      return { userId: m.userId, code, rate, status: m.status };
    });
    return this.repo.insertBatch(tx, rows);
  }
}
