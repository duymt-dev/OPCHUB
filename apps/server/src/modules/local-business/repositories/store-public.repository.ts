import { Injectable } from '@nestjs/common';
import { Prisma } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';
import { visibleStoreSql } from './search-visibility.query';
import type { StorePublicPatch, StorePublicPage } from '@opchub/shared/api-domains';

/** Safe schema-derived row; JSON is validated/projected before any anonymous response. */
type PublicRow = Omit<
  StorePublicPage,
  'seo' | 'items' | 'team' | 'certs' | 'videos' | 'socials'
> & {
  id: string;
  seoIndex: boolean;
  seoTitle: string;
  seoDesc: string;
  team: unknown;
  certs: unknown;
  videos: unknown;
  socials: unknown;
};

/** Exact production SQL, also exercised by the 10k-row plan regression. */
export const storePublicQuery = (slug: string, now: Date) => Prisma.sql`
      SELECT s.id,s.slug,s.name,s.slogan,s.field,s.province,s.ward,s.intro,
        s.logo_url AS "logoUrl",s.cover_url AS "coverUrl",s.vision,s.mission,s.gallery,
        s.videos,s.team,s.certs,s.phone,s.email,s.website,s.address,s.phones,s.emails,
        s.addresses,s.socials,s.seo_index AS "seoIndex",s.seo_title AS "seoTitle",s.seo_desc AS "seoDesc"
      FROM stores s WHERE s.slug=${slug} AND ${visibleStoreSql(now)}`;

@Injectable()
export class StorePublicRepository {
  constructor(private readonly prisma: PrismaService) {}

  owner(ownerId: string) {
    return this.prisma.db.store.findUnique({
      where: { ownerId },
      select: {
        slug: true,
        name: true,
        field: true,
        province: true,
        slogan: true,
        intro: true,
        status: true,
        seoIndex: true,
        seoTitle: true,
        seoDesc: true,
      },
    });
  }

  /** Visibility is checked inside the unique slug lookup, before any business payload. */
  async page(slug: string, now: Date) {
    const [row] = await this.prisma.db.$queryRaw<PublicRow[]>(storePublicQuery(slug, now));
    if (!row) return null;
    const items = await this.prisma.db.storeItem.findMany({
      where: { storeId: row.id },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      take: 50,
      select: { name: true, kind: true, description: true, imageUrl: true, price: true },
    });
    return { ...row, items };
  }

  patch(ownerId: string, input: StorePublicPatch) {
    return this.prisma.db.store.updateMany({
      where: { ownerId, status: { not: 'hidden' } },
      data: {
        ...(input.seoIndex !== undefined ? { seoIndex: input.seoIndex } : {}),
        ...(input.title !== undefined ? { seoTitle: input.title } : {}),
        ...(input.desc !== undefined ? { seoDesc: input.desc } : {}),
      },
    });
  }

  slugs(ids: readonly string[]) {
    return this.prisma.db.store.findMany({
      where: { id: { in: [...ids] } },
      select: { slug: true },
    });
  }
}
