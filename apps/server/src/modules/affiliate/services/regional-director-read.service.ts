import { Injectable } from '@nestjs/common';
import { provinces } from '@opchub/shared/fixtures';
import {
  DIRECTOR_REGIONS,
  affiliateBankSchema,
  type DirectorHistoryQuery,
  type DirectorMemberQuery,
} from '@opchub/shared/api-domains';
import { MemberDirectory } from '../../account';
import { ProvinceDirectoryService } from '../../community';
import { RegionalDirectorRepository } from '../repositories/regional-director.repository';

@Injectable()
export class RegionalDirectorReadService {
  constructor(
    private readonly repo: RegionalDirectorRepository,
    private readonly members: MemberDirectory,
    private readonly community: ProvinceDirectoryService,
  ) {}

  async config() {
    const rows = await this.repo.slots();
    const ids = rows.flatMap((row) => (row.userId ? [row.userId] : []));
    const [people, affiliates] = await Promise.all([
      this.members.directorContacts(ids),
      this.repo.affiliateUserIds(),
    ]);
    const memberships = await this.community.provincesOf(affiliates.map((a) => a.userId));
    const assigned = new Set(rows.flatMap((row) => row.provinces.map((p) => p.province)));
    const slots = DIRECTOR_REGIONS.flatMap((region) => {
      const row = rows.find((slot) => slot.region === region);
      if (!row) return [];
      const person = people.find((p) => p.id === row.userId);
      const names = new Set(row.provinces.map((p) => p.province));
      return [
        {
          region,
          version: row.version,
          provinces: [...names],
          bank:
            row.bankName && row.bankNo && row.bankHolder
              ? affiliateBankSchema.parse({
                  bankName: row.bankName,
                  bankNo: row.bankNo,
                  bankHolder: row.bankHolder,
                })
              : null,
          incumbent:
            person && row.appointedAt
              ? { ...person, appointedAt: row.appointedAt.toISOString() }
              : null,
          affiliateCount: memberships.filter((m) => names.has(m.province)).length,
        },
      ];
    });
    return {
      slots,
      unassignedProvinces: provinces.map(([name]) => name).filter((p) => !assigned.has(p)),
    };
  }

  async candidates(query: DirectorMemberQuery) {
    const slots = await this.repo.slots();
    return this.members.directorCandidates(
      query,
      slots.flatMap((slot) => (slot.userId ? [slot.userId] : [])),
    );
  }

  async history(query: DirectorHistoryQuery) {
    const rows = await this.repo.history(query);
    const items = rows.slice(0, query.size).map((row) => ({ ...row, at: row.at.toISOString() }));
    const last = items.at(-1);
    return {
      items,
      nextCursor: rows.length > query.size && last ? { at: last.at, id: last.id } : null,
    };
  }
}
