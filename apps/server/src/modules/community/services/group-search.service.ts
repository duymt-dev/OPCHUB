import { Injectable } from '@nestjs/common';
import { GroupSearchRepository } from '../repositories/group-search.query';

@Injectable()
export class GroupSearchService {
  constructor(private readonly repo: GroupSearchRepository) {}
  search(q: string, userId: string) {
    return this.repo.search(q, userId);
  }
}
