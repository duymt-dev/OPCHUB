import { Injectable } from '@nestjs/common';
import { MemberSearchRepository } from '../repositories/member-global-search.query';

@Injectable()
export class MemberSearchService {
  constructor(private readonly repo: MemberSearchRepository) {}
  async search(q: string) {
    return (await this.repo.search(q)).map(({ status, ...hit }) => ({
      ...hit,
      sub: status === 'locked' ? `${hit.sub} · Đã khóa` : hit.sub,
    }));
  }
}
