import type { ProjectRevisionStatus } from '@opchub/db';
import { PROJECT_STAGE } from '@opchub/shared';
import type { AdminProjectRevision, ProjectDetail } from '@opchub/shared/api-domains';
import { z } from 'zod';
import type {
  FundingWrite,
  ProjectContent,
  TeamWrite,
} from '../repositories/project-write.repository';
import { displayCover, type ProjectRow } from './project.mapper';

/**
 * `project_revisions.data` (REQ-106, D-18): đúng `ProjectSave` đã qua `prepare` — ảnh đã `resolve`,
 * mô tả đã sanitize, đội, gọi vốn, nhóm chia sẻ. Đọc lại bằng zod (jsonb là dữ liệu ngoài code).
 */
const visibility = z.enum(['public', 'private']);
export const revisionDataSchema = z.object({
  name: z.string(),
  category: z.string(),
  categoryId: z.string().nullable(),
  groupId: z.string().nullable(),
  summary: z.string(),
  descriptionHtml: z.string(),
  stage: z.enum(PROJECT_STAGE),
  visibility,
  tags: z.array(z.string()),
  website: z.string().nullable(),
  coverUrl: z.string().nullable(),
  testUrl: z.string().nullable(),
  repoProvider: z.enum(['github', 'gitlab']).nullable(),
  repoUrl: z.string().nullable(),
  repoVisibility: visibility.nullable(),
  deckUrl: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  team: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      avatarUrl: z.string().nullable(),
      isOwner: z.boolean(),
      userId: z.string().nullable(),
    }),
  ),
  /** Tiền là số nguyên (≤ 2^53, đã chặn ở zod đầu vào) — JSON không có bigint */
  funding: z
    .object({
      amount: z.number().int(),
      currency: z.enum(['VND', 'USD']),
      equityPct: z.number(),
      minTicket: z.number().int(),
      useOfFunds: z.string(),
    })
    .nullable(),
  shares: z.array(z.string()),
});
export type RevisionData = z.infer<typeof revisionDataSchema>;

export interface Prepared {
  data: ProjectContent;
  team: TeamWrite[];
  funding: FundingWrite | null;
  shares: string[];
}

export function toRevisionData(p: Prepared, category: string): RevisionData {
  const f = p.funding;
  return {
    ...p.data,
    category,
    team: p.team,
    funding: f
      ? {
          amount: Number(f.amount),
          currency: f.currency,
          equityPct: f.equityPct,
          minTicket: Number(f.minTicket),
          useOfFunds: f.useOfFunds,
        }
      : null,
    shares: p.shares,
  };
}

export function fromRevisionData(d: RevisionData): Prepared {
  const { team, funding, shares } = d;
  return {
    data: {
      name: d.name,
      categoryId: d.categoryId,
      groupId: d.groupId,
      summary: d.summary,
      descriptionHtml: d.descriptionHtml,
      stage: d.stage,
      visibility: d.visibility,
      tags: d.tags,
      website: d.website,
      coverUrl: d.coverUrl,
      testUrl: d.testUrl,
      repoProvider: d.repoProvider,
      repoUrl: d.repoUrl,
      repoVisibility: d.repoVisibility,
      deckUrl: d.deckUrl,
      contactEmail: d.contactEmail,
      contactPhone: d.contactPhone,
    },
    team,
    funding: funding
      ? { ...funding, amount: BigInt(funding.amount), minTicket: BigInt(funding.minTicket) }
      : null,
    shares,
  };
}

const repoOfData = (d: RevisionData) =>
  d.repoProvider && d.repoUrl
    ? { provider: d.repoProvider, url: d.repoUrl, visibility: d.repoVisibility ?? 'public' }
    : null;

/** Gọi vốn hiển thị: số liệu bản sửa + vòng / công cụ / đã huy động của bản đang hiển thị */
function fundingOf(d: RevisionData, r: ProjectRow): ProjectDetail['funding'] {
  if (!d.funding) return null;
  const cur = r.funding;
  return {
    amount: d.funding.amount,
    currency: d.funding.currency,
    equityPercent: d.funding.equityPct,
    round: cur?.round ?? 'Seed',
    instrument: cur?.instrument ?? 'Cổ phần',
    endsAt: (cur?.endsAt ?? cur?.updatedAt ?? r.updatedAt).toISOString(),
    minTicket: d.funding.minTicket,
    raised: cur ? Number(cur.raised) : 0,
    useOfFunds: d.funding.useOfFunds,
  };
}

const teamOf = (d: RevisionData) =>
  d.team.map((m) => ({ name: m.name, role: m.role, avatarUrl: m.avatarUrl, isOwner: m.isOwner }));

/** Form sửa của chủ dự án: nội dung bản sửa mở đè lên bản đang hiển thị (ảnh bìa nguyên bản) */
export function overlayOwnDetail(base: ProjectDetail, r: ProjectRow, d: RevisionData) {
  return {
    ...base,
    name: d.name,
    category: d.category,
    summary: d.summary,
    description: d.descriptionHtml,
    stage: d.stage,
    tags: d.tags,
    website: d.website,
    coverUrl: d.coverUrl,
    testUrl: d.testUrl,
    repo: repoOfData(d),
    deckUrl: d.deckUrl,
    visibility: d.visibility,
    contact: { email: d.contactEmail, phone: d.contactPhone },
    team: teamOf(d),
    funding: fundingOf(d, r),
    groupIds: d.shares,
  } satisfies ProjectDetail;
}

export interface RevisionRow {
  id: string;
  projectId: string;
  status: ProjectRevisionStatus;
  reviewNote: string | null;
  updatedAt: Date;
  data: RevisionData;
}

/** Nội dung bản sửa cho drawer Admin (không diff — SKIP TIP-V2-113) */
export function toAdminRevision(rev: RevisionRow, r: ProjectRow): AdminProjectRevision {
  const d = rev.data;
  return {
    id: rev.id,
    status: rev.status,
    reviewNote: rev.reviewNote,
    updatedAt: rev.updatedAt.toISOString(),
    name: d.name,
    category: d.category,
    summary: d.summary,
    stage: d.stage,
    tags: d.tags,
    website: d.website,
    coverUrl: displayCover(d.coverUrl),
    description: d.descriptionHtml || d.summary,
    testUrl: d.testUrl,
    repo: repoOfData(d),
    visibility: d.visibility,
    team: teamOf(d),
    funding: fundingOf(d, r),
  };
}
