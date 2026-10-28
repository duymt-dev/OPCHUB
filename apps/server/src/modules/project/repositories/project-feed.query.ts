import { Prisma } from '@opchub/db';
import { usableFeeStatuses } from '@opchub/shared';
import type { ProjectSort } from '@opchub/shared/api-domains';
import type { ExploreFilter } from './project-feed.types';

const ORDER: Record<ProjectSort, string> = {
  new: 'p.published_at DESC, p.id DESC',
  follow: 'p.followers_count DESC, p.id ASC',
  view: 'p.view_count DESC, p.id ASC',
  name: 'p.name ASC, p.id ASC',
};

/** EXISTS keeps fee predicates inside the eligible-owner lookup, rather than OR over LEFT JOINs. */
function visible(userId: string, now: Date) {
  return Prisma.sql`p.status = 'published' AND p.deleted_at IS NULL AND (
    p.owner_id = ${userId} OR EXISTS (
      SELECT 1 FROM users u JOIN membership_fees f ON f.user_id = u.id
      WHERE u.id = p.owner_id
        AND f.status IN (${Prisma.join(usableFeeStatuses().map((status) => Prisma.sql`${status}::membership_fee_status`))})
        AND f.valid_until > ${now}
      AND ((p.visibility = 'public' AND u.status = 'active')
    OR EXISTS (SELECT 1 FROM project_members m WHERE m.project_id = p.id AND m.user_id = ${userId})
    OR EXISTS (
      SELECT 1 FROM project_shares s JOIN groups g ON g.id = s.group_id
      JOIN group_members gm ON gm.group_id = g.id
      WHERE s.project_id = p.id AND gm.user_id = ${userId} AND gm.status = 'member'
    ))
    ))`;
}

function search(value: string) {
  const term = `%${value.replace(/[\\%_]/g, '\\$&')}%`;
  return Prisma.sql`(p.name ILIKE ${term} OR p.summary ILIKE ${term}
    OR p.province ILIKE ${term}
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = p.owner_id AND u.full_name ILIKE ${term})
    OR (p.province = '' AND EXISTS (
      SELECT 1 FROM groups g WHERE g.id = p.group_id AND g.province ILIKE ${term}))
    OR EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND c.name ILIKE ${term}))`;
}

function where(userId: string, f: ExploreFilter, now: Date) {
  const clauses = [visible(userId, now)];
  if (f.storeId) clauses.push(Prisma.sql`p.store_id = ${f.storeId}`);
  if (f.cat)
    clauses.push(
      Prisma.sql`EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id AND c.name = ${f.cat})`,
    );
  if (f.stage === 'fund') {
    clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM project_fundings pf WHERE pf.project_id = p.id)`);
    clauses.push(Prisma.sql`EXISTS (SELECT 1 FROM project_fundraisings fr
      WHERE fr.project_id = p.id AND fr.status = 'active' AND fr.ends_at > ${now})`);
  } else if (f.stage) clauses.push(Prisma.sql`p.stage = ${f.stage}::project_stage`);
  if (f.audience) clauses.push(Prisma.sql`p.audience = ${f.audience}::project_audience`);
  if (f.stages?.length)
    clauses.push(
      Prisma.sql`p.stage IN (${Prisma.join(f.stages.map((stage) => Prisma.sql`${stage}::project_stage`))})`,
    );
  if (f.needs?.length) clauses.push(Prisma.sql`p.needs && ARRAY[${Prisma.join(f.needs)}]::text[]`);
  if (f.provinces?.length)
    clauses.push(Prisma.sql`(p.province IN (${Prisma.join(f.provinces)}) OR (p.province = '' AND
      EXISTS (SELECT 1 FROM groups g WHERE g.id = p.group_id AND g.province IN (${Prisma.join(f.provinces)}))))`);
  if (f.q) clauses.push(search(f.q));
  return Prisma.join(clauses, ' AND ');
}

export function projectFeedQueries(
  userId: string,
  f: ExploreFilter,
  page: number,
  size: number,
  now: Date,
) {
  const predicate = where(userId, f, now);
  return {
    ids: Prisma.sql`SELECT p.id FROM projects p WHERE ${predicate}
      ORDER BY ${Prisma.raw(ORDER[f.sort])} LIMIT ${size} OFFSET ${(page - 1) * size}`,
    count: Prisma.sql`SELECT COUNT(*)::int AS total FROM projects p WHERE ${predicate}`,
  };
}
