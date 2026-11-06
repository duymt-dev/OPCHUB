import { Injectable } from '@nestjs/common';
import type { SearchHit } from '@opchub/shared/api-domains';
import { StoreSearchRepository, type StoreSearchRow } from '../repositories/store-search.query';

const STATUS: Record<string, string> = { draft: 'Bản nháp', hidden: 'Đã ẩn', closed: 'Đã đóng' };
export function localSearchHit(row: StoreSearchRow, admin: boolean): SearchHit {
  return {
    id: row.id,
    title: row.title,
    sub: [row.field, row.province, admin ? STATUS[row.status] : ''].filter(Boolean).join(' · '),
  };
}
@Injectable()
export class StoreSearchService {
  constructor(private readonly repo: StoreSearchRepository) {}
  async search(q: string, admin: boolean, now: Date): Promise<SearchHit[]> {
    return (await this.repo.search(q, admin, now)).map((row) => localSearchHit(row, admin));
  }
}
