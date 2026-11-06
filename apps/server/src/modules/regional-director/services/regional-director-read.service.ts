import { Injectable } from '@nestjs/common';
import {
  REGIONAL_LABELS,
  type RegionalRegion,
  type RegionalDirectors,
} from '@opchub/shared/api-domains';
import { RegionalDirectorRepository } from '../repositories/regional-director.repository';
import { MemberDirectory } from '@/modules/account';
import { RegionalProjectionRepository } from '@/modules/reporting';

@Injectable()
export class RegionalDirectorReadService {
  constructor(
    private readonly repo: RegionalDirectorRepository,
    private readonly projection: RegionalProjectionRepository,
    private readonly members: MemberDirectory,
  ) {}

  async list(canManage: boolean): Promise<RegionalDirectors> {
    const [slots, history, counts] = await Promise.all([
      this.repo.slots(),
      this.repo.history(),
      this.projection.counts(),
    ]);
    const members = await this.members.byIds(slots.flatMap((s) => (s.userId ? [s.userId] : [])));
    const items = slots.map((s) => ({
      region: s.region,
      label: REGIONAL_LABELS[s.region],
      member: members.find((m) => m.id === s.userId) ?? null,
      provinces: s.provinces.map((p) => p.province),
      affiliateCount: Number(counts.find((c) => c.region === s.region)?.count ?? 0),
      bank: { bankName: s.bankName ?? '', bankNo: s.bankNo ?? '', bankHolder: s.bankHolder ?? '' },
    }));
    return {
      items,
      canManage,
      unassignedProvinces: 34 - items.reduce((n, s) => n + s.provinces.length, 0),
      history: history.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
    };
  }

  async candidates(region: RegionalRegion, q: string) {
    return { items: await this.projection.candidates(region, q) };
  }
}
