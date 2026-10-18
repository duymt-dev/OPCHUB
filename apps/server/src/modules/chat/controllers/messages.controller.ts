import { Controller, Get, HttpCode, Param, Post, Put, Req } from '@nestjs/common';
import {
  type ChatMessage,
  chatMessagePageSchema,
  chatMessageSchema,
  cursorPageSchema,
  messageQuerySchema,
  messageSchema,
  pinMessageSchema,
  reactMessageSchema,
  type SendMessageRequest,
  sendMessageSchema,
} from '@opchub/shared/api-domains';
import type { Request } from 'express';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond, ZodBody, ZodQuery } from '@/common/http/zod';
import { MessageService } from '../services/message.service';

const adminPage = cursorPageSchema(messageSchema);

/** Tin nhắn qua REST — cùng service với socket (`message.send|react|pin`) */
@Controller()
export class MessagesController {
  constructor(private readonly messages: MessageService) {}

  /** Portal: `chatMessagePageSchema` (không `isSimulated`); Admin `c.mod`: `messageSchema` (D-26, D-48) */
  @SkipMembershipFee()
  @Get('rooms/:id/messages')
  async history(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodQuery(messageQuerySchema) q: z.infer<typeof messageQuerySchema>,
  ): Promise<z.infer<typeof chatMessagePageSchema> | z.infer<typeof adminPage>> {
    const r = await this.messages.history(user, id, q);
    return r.admin ? respond(adminPage, r.page) : respond(chatMessagePageSchema, r.page);
  }

  @Post('rooms/:id/messages')
  @HttpCode(201)
  async send(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(sendMessageSchema) body: SendMessageRequest,
  ): Promise<ChatMessage> {
    return respond(chatMessageSchema, await this.messages.send(user, id, body));
  }

  @Post('messages/:id/reactions')
  @HttpCode(200)
  async react(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
    @ZodBody(reactMessageSchema) body: z.infer<typeof reactMessageSchema>,
  ): Promise<ChatMessage> {
    return respond(chatMessageSchema, await this.messages.react(user, id, body.emoji));
  }

  @Put('messages/:id/pin')
  async pin(
    @CurrentUser() user: AccessClaims,
    @Req() req: Request,
    @Param('id') id: string,
    @ZodBody(pinMessageSchema) body: z.infer<typeof pinMessageSchema>,
  ): Promise<ChatMessage> {
    const m = await this.messages.pin(user, id, body.pinned, req.ip ?? null);
    return respond(chatMessageSchema, m);
  }
}
