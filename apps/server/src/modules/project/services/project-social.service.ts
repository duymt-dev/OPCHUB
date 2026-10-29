import { Injectable } from '@nestjs/common';
import type { CommentType } from '@opchub/db';
import type { ProjectCommentView } from '@opchub/shared/api-domains';
import type { AccessClaims } from '@/common/auth';
import { conflict, forbidden, notFound } from '@/common/errors';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MessageService } from '../../chat';
import { ProjectRepository } from '../repositories/project.repository';
import { ProjectSocialRepository } from '../repositories/project-social.repository';

const NOT_FOUND = 'Không tìm thấy dự án';
const NO_COMMENT = 'Không tìm thấy góp ý';

/** Theo dõi, góp ý, xin quyền repo, chia sẻ vào nhóm — mọi thao tác chỉ trên dự án người gọi THẤY */
@Injectable()
export class ProjectSocialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectRepository,
    private readonly repo: ProjectSocialRepository,
    private readonly messages: MessageService,
  ) {}

  private async visible(userId: string, id: string) {
    const p = await this.projects.findVisible(userId, id, new Date());
    if (!p) throw notFound(NOT_FOUND);
    return p;
  }

  async follow(userId: string, id: string, following: boolean) {
    await this.visible(userId, id);
    const followers = await this.prisma.db.$transaction((tx) =>
      this.repo.setFollow(tx, id, userId, following),
    );
    return { followers, followedByMe: following };
  }

  async comments(userId: string, id: string): Promise<{ items: ProjectCommentView[] }> {
    const p = await this.visible(userId, id);
    const { roots, liked } = await this.repo.comments(id, userId);
    return {
      items: roots.map((c) => ({
        id: c.id,
        projectId: id,
        author: {
          name: c.author.fullName,
          avatarUrl: c.author.avatarUrl,
          title: c.author.id === p.ownerId ? 'Chủ dự án' : 'Thành viên OPC Hub',
        },
        type: c.type,
        body: c.body,
        likes: c.likeCount,
        resolved: c.resolvedAt !== null,
        createdAt: c.createdAt.toISOString(),
        likedByMe: liked.has(c.id),
        replies: c.replies.map((r) => ({
          author: { name: r.author.fullName, avatarUrl: r.author.avatarUrl },
          body: r.body,
          isOwner: r.author.id === p.ownerId,
          createdAt: r.createdAt.toISOString(),
        })),
      })),
    };
  }

  async comment(
    userId: string,
    id: string,
    type: CommentType,
    body: string,
  ): Promise<ProjectCommentView> {
    const p = await this.visible(userId, id);
    const c = await this.prisma.db.$transaction((tx) =>
      this.repo.addComment(tx, id, userId, type, body, null),
    );
    return {
      id: c.id,
      projectId: id,
      author: {
        name: c.author.fullName,
        avatarUrl: c.author.avatarUrl,
        title: userId === p.ownerId ? 'Chủ dự án' : 'Thành viên OPC Hub',
      },
      type,
      body,
      likes: 0,
      resolved: false,
      createdAt: c.createdAt.toISOString(),
      likedByMe: false,
      replies: [],
    };
  }

  /** Góp ý thuộc dự án người gọi thấy — không thì 404 (không lộ dự án riêng tư) */
  private async rootComment(userId: string, commentId: string) {
    const c = await this.repo.comment(commentId);
    if (!c || !(await this.projects.findVisible(userId, c.projectId, new Date())))
      throw notFound(NO_COMMENT);
    return c;
  }

  async like(userId: string, commentId: string, liked: boolean) {
    await this.rootComment(userId, commentId);
    const likes = await this.prisma.db.$transaction((tx) =>
      this.repo.setLike(tx, commentId, userId, liked),
    );
    return { likes, likedByMe: liked };
  }

  async reply(userId: string, commentId: string, body: string) {
    const c = await this.rootComment(userId, commentId);
    const r = await this.prisma.db.$transaction((tx) =>
      this.repo.addComment(tx, c.projectId, userId, 'feedback', body, commentId),
    );
    return {
      author: { name: r.author.fullName, avatarUrl: r.author.avatarUrl },
      body,
      isOwner: userId === c.project.ownerId,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async resolve(userId: string, commentId: string, resolved: boolean) {
    const c = await this.rootComment(userId, commentId);
    if (c.project.ownerId !== userId) throw forbidden('Chỉ chủ dự án được thao tác');
    await this.repo.setResolved(commentId, resolved);
    return { resolved };
  }

  async requestRepo(userId: string, id: string): Promise<{ requested: true }> {
    const p = await this.projects.findVisible(userId, id, new Date());
    if (!p || p.repoVisibility !== 'private' || !p.repoUrl) {
      throw notFound('Không tìm thấy repository riêng tư');
    }
    if (!(await this.repo.requestRepo(id, userId))) throw conflict('Bạn đã gửi yêu cầu truy cập');
    return { requested: true };
  }

  /**
   * Chia sẻ vào phòng Chung các nhóm người gọi đang tham gia — đi qua đường gửi tin chat
   * (quyền, rate limit, idempotent theo clientMsgId, phát realtime).
   */
  async share(user: AccessClaims, id: string, groupIds: string[], message: string) {
    const owned = await this.prisma.db.project.findFirst({
      where: { id, ownerId: user.sub, deletedAt: null },
      select: { name: true },
    });
    if (!owned) throw notFound(NOT_FOUND);
    const mine = await this.prisma.db.groupMember.findMany({
      where: { userId: user.sub, status: 'member', groupId: { in: groupIds } },
      select: { groupId: true },
    });
    const rooms = await this.repo.generalRooms(mine.map((m) => m.groupId));
    if (!rooms.length) throw conflict('Chọn ít nhất 1 nhóm để chia sẻ');
    const body = `${message} → ${owned.name}`.trim();
    const stamp = Date.now().toString(36);
    for (const r of rooms) {
      // Gửi tuần tự qua MessageService (mỗi phòng một giao dịch riêng, ack sau commit — S-12)
      await this.messages.send(user, r.id, {
        clientMsgId: `share-${id.slice(0, 36)}-${stamp}`.slice(0, 64),
        kind: 'text',
        body,
        mentions: [],
      });
    }
    return { groupCount: rooms.length };
  }
}
