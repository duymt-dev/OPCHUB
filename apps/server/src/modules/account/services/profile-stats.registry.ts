import { Injectable } from '@nestjs/common';
import type { ProfileStats, ProfileStatsReader } from '../ports';

/**
 * Nhiều domain góp số liệu hồ sơ (nhóm, sự kiện, dự án). Domain đó gọi `register` lúc khởi động
 * (`onModuleInit`) → account không phụ thuộc ngược vào domain khác.
 */
@Injectable()
export class ProfileStatsRegistry {
  private readonly readers: ProfileStatsReader[] = [];

  register(reader: ProfileStatsReader): void {
    this.readers.push(reader);
  }

  async statsOf(userId: string): Promise<ProfileStats> {
    const parts = await Promise.all(this.readers.map((r) => r.statsOf(userId)));
    return parts.reduce<ProfileStats>(
      (acc, p) => ({
        groups: acc.groups + (p.groups ?? 0),
        events: acc.events + (p.events ?? 0),
        projects: acc.projects + (p.projects ?? 0),
      }),
      { groups: 0, events: 0, projects: 0 },
    );
  }
}
