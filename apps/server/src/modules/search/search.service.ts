import { Injectable } from '@nestjs/common';
import type { GlobalSearchResult, SearchHit, SearchKind } from '@opchub/shared/api-domains';
import { type AccessClaims, PermissionCheck } from '@/common/auth';
import { MemberSearchService } from '../account';
import { GroupSearchService } from '../community';
import { NeedSearchService, StoreSearchService } from '../local-business';
import { ProjectSearchService } from '../project';

@Injectable()
export class SearchService {
  constructor(
    private readonly stores: StoreSearchService,
    private readonly needs: NeedSearchService,
    private readonly projects: ProjectSearchService,
    private readonly groups: GroupSearchService,
    private readonly members: MemberSearchService,
    private readonly permissions: PermissionCheck,
  ) {}

  async search(q: string, user: AccessClaims, admin = false): Promise<GlobalSearchResult> {
    const now = new Date();
    const can = admin ? await this.permissions.checker(user) : () => true;
    // Fixed, bounded fan-out; no ORM access or per-result queries in this module.
    const [store, need, project, group, member] = await Promise.all([
      can('stores.view') ? this.stores.search(q, admin, now) : [],
      can('stores.view') ? this.needs.search(q, admin, now) : [],
      can('projects.view') ? this.projects.search(q, user.sub, admin, now) : [],
      can('groups.view') && (admin || user.accountType !== 'investor')
        ? this.groups.search(q, user.sub)
        : [],
      admin && can('members.view') ? this.members.search(q) : [],
    ]);
    const groups: { kind: SearchKind; items: SearchHit[] }[] = [
      { kind: 'store', items: store },
      { kind: 'need', items: need },
      { kind: 'project', items: project },
      { kind: 'group', items: group },
      { kind: 'member', items: member },
    ];
    return { groups: groups.filter((entry) => entry.items.length > 0) };
  }
}
