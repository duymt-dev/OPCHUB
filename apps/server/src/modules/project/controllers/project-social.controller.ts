import { Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import {
  commentReplySchema,
  commentResolvedSchema,
  createCommentSchema,
  followProjectSchema,
  followResultSchema,
  likeCommentSchema,
  likeResultSchema,
  projectCommentViewSchema,
  projectReplyViewSchema,
  repoAccessResultSchema,
  resolvedResultSchema,
  shareProjectSchema,
  shareResultSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { type AccessClaims, CurrentUser } from '@/common/auth';
import { respond, ZodBody } from '@/common/http/zod';
import { ProjectSocialService } from '../services/project-social.service';

type In<S extends z.ZodType> = z.infer<S>;
const commentListSchema = z.object({ items: z.array(projectCommentViewSchema) });

/** Tương tác dự án (Q-G3b-1): theo dõi, góp ý, like, trả lời, đánh dấu xử lý, repo, chia sẻ */
@Controller()
export class ProjectSocialController {
  constructor(private readonly social: ProjectSocialService) {}

  @Put('projects/:id/follow')
  async follow(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(followProjectSchema) body: In<typeof followProjectSchema>,
  ): Promise<In<typeof followResultSchema>> {
    return respond(followResultSchema, await this.social.follow(user.sub, id, body.following));
  }

  @Get('projects/:id/comments')
  async comments(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
  ): Promise<In<typeof commentListSchema>> {
    return respond(commentListSchema, await this.social.comments(user.sub, id));
  }

  @Post('projects/:id/comments')
  @HttpCode(201)
  async comment(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(createCommentSchema) body: In<typeof createCommentSchema>,
  ): Promise<In<typeof projectCommentViewSchema>> {
    return respond(
      projectCommentViewSchema,
      await this.social.comment(user.sub, id, body.type, body.body),
    );
  }

  @Put('comments/:id/like')
  async like(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(likeCommentSchema) body: In<typeof likeCommentSchema>,
  ): Promise<In<typeof likeResultSchema>> {
    return respond(likeResultSchema, await this.social.like(user.sub, id, body.liked));
  }

  @Post('comments/:id/replies')
  @HttpCode(201)
  async reply(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(commentReplySchema) body: In<typeof commentReplySchema>,
  ): Promise<In<typeof projectReplyViewSchema>> {
    return respond(projectReplyViewSchema, await this.social.reply(user.sub, id, body.body));
  }

  @Put('comments/:id/resolved')
  async resolved(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(commentResolvedSchema) body: In<typeof commentResolvedSchema>,
  ): Promise<In<typeof resolvedResultSchema>> {
    return respond(resolvedResultSchema, await this.social.resolve(user.sub, id, body.resolved));
  }

  @Post('projects/:id/repo-access')
  @HttpCode(201)
  async repoAccess(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
  ): Promise<In<typeof repoAccessResultSchema>> {
    return respond(repoAccessResultSchema, await this.social.requestRepo(user.sub, id));
  }

  @Post('projects/:id/share')
  @HttpCode(200)
  async share(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(shareProjectSchema) body: In<typeof shareProjectSchema>,
  ): Promise<In<typeof shareResultSchema>> {
    return respond(
      shareResultSchema,
      await this.social.share(user, id, body.groupIds, body.message),
    );
  }
}
