import { Injectable } from '@nestjs/common';
import type { SearchHit } from '@opchub/shared/api-domains';
import { ProjectSearchRepository } from '../repositories/project-search.query';

const STATUS: Record<string, string> = {
  draft: 'Bản nháp',
  pending_review: 'Chờ duyệt',
  hidden: 'Đã ẩn',
  rejected: 'Từ chối',
  needs_changes: 'Cần chỉnh sửa',
};
@Injectable()
export class ProjectSearchService {
  constructor(private readonly repo: ProjectSearchRepository) {}
  async search(q: string, userId: string, admin: boolean, now: Date): Promise<SearchHit[]> {
    return (await this.repo.search(q, userId, admin, now)).map((r) => ({
      id: r.id,
      title: r.title,
      sub: [r.sub, admin ? STATUS[r.status] : undefined].filter(Boolean).join(' · '),
    }));
  }
}
