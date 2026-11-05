import { Injectable } from '@nestjs/common';
import type { SearchHit } from '@opchub/shared/api-domains';
import { NeedSearchRepository } from '../repositories/need-search.query';
import { localSearchHit } from './store-search.service';

@Injectable()
export class NeedSearchService {
  constructor(private readonly repo: NeedSearchRepository) {}
  async search(q: string, admin: boolean, now: Date): Promise<SearchHit[]> {
    return (await this.repo.search(q, admin, now)).map((row) => localSearchHit(row, admin));
  }
}
