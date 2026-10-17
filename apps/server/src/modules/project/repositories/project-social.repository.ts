import { Injectable } from '@nestjs/common';
import type { CommentType, DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

const AUTHOR = { select: { id: true, fullName: true, avatarUrl: true } } as const;

/** Theo dõi, góp ý (+ like, trả lời), xin quyền repo */
@Injectable()
export class ProjectSocialRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Bật/tắt theo dõi idempotent; `followers_count` đổi chỉ khi thật sự thay đổi */
  async setFollow(tx: DbTx, projectId: string, userId: string, on: boolean): Promise<number> {
    const changed = on
      ? (await tx.projectFollow.createMany({ data: [{ projectId, userId }], skipDuplicates: true }))
          .count
      : -(await tx.projectFollow.deleteMany({ where: { projectId, userId } })).count;
    const rows = await tx.$queryRaw<{ followers_count: number }[]>`
      UPDATE projects SET followers_count = GREATEST(followers_count + ${changed}, 0)
      WHERE id = ${projectId} RETURNING followers_count`;
    return rows[0]?.followers_count ?? 0;
  }

  /** Góp ý gốc mới trước, kèm trả lời tăng dần + like của người xem — 2 query cho cả dự án */
  async comments(projectId: string, viewerId: string) {
    const roots = await this.prisma.db.projectComment.findMany({
      where: { projectId, parentId: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
      select: {
        id: true,
        type: true,
        body: true,
        likeCount: true,
        resolvedAt: true,
        createdAt: true,
        author: AUTHOR,
        replies: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { body: true, createdAt: true, author: AUTHOR },
        },
      },
    });
    const liked = roots.length
      ? await this.prisma.db.projectCommentLike.findMany({
          where: { userId: viewerId, commentId: { in: roots.map((r) => r.id) } },
          select: { commentId: true },
        })
      : [];
    return { roots, liked: new Set(liked.map((l) => l.commentId)) };
  }

  async addComment(
    tx: DbTx,
    projectId: string,
    authorId: string,
    type: CommentType,
    body: string,
    parentId: string | null,
  ) {
    const c = await tx.projectComment.create({
      data: { projectId, authorId, type, body, parentId },
      select: { id: true, createdAt: true, author: AUTHOR },
    });
    if (!parentId) {
      await tx.project.update({
        where: { id: projectId },
        data: { commentCount: { increment: 1 } },
      });
    }
    return c;
  }

  /** Góp ý gốc + dự án của nó (kiểm quyền thấy ở service) */
  comment(id: string) {
    return this.prisma.db.projectComment.findFirst({
      where: { id, parentId: null },
      select: { id: true, projectId: true, project: { select: { ownerId: true } } },
    });
  }

  async setLike(tx: DbTx, commentId: string, userId: string, on: boolean): Promise<number> {
    const changed = on
      ? (
          await tx.projectCommentLike.createMany({
            data: [{ commentId, userId }],
            skipDuplicates: true,
          })
        ).count
      : -(await tx.projectCommentLike.deleteMany({ where: { commentId, userId } })).count;
    const rows = await tx.$queryRaw<{ like_count: number }[]>`
      UPDATE project_comments SET like_count = GREATEST(like_count + ${changed}, 0)
      WHERE id = ${commentId} RETURNING like_count`;
    return rows[0]?.like_count ?? 0;
  }

  async setResolved(id: string, resolved: boolean): Promise<void> {
    await this.prisma.db.projectComment.update({
      where: { id },
      data: { resolvedAt: resolved ? new Date() : null },
    });
  }

  /** UQ (project_id, user_id): lặp → false */
  async requestRepo(projectId: string, userId: string): Promise<boolean> {
    const r = await this.prisma.db.repoAccessRequest.createMany({
      data: [{ projectId, userId }],
      skipDuplicates: true,
    });
    return r.count === 1;
  }

  /** Phòng mặc định ("Chung") của các nhóm */
  generalRooms(groupIds: readonly string[]) {
    return this.prisma.db.room.findMany({
      where: { groupId: { in: [...groupIds] }, isDefault: true },
      select: { id: true, groupId: true },
    });
  }
}
