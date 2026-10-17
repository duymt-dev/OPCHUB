import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { ChatMessage } from '@opchub/shared/api-domains';
import { clientEvents } from '@opchub/shared/socket';
import { forbidden } from '@/common/errors';
import { MEMBERS_ONLY, MessageService } from '@/modules/chat';
import { type Ack, type AppSocket, toAck } from './socket-types';

/**
 * `message.send|react|pin` — cùng MessageService với REST. `send` chỉ nhận phòng đã `room.join`
 * (cache quyền S-02). Ack sau commit (S-12); phát `message.new` qua kênh `socket:room`.
 */
@WebSocketGateway()
export class MessageGateway {
  constructor(private readonly messages: MessageService) {}

  @SubscribeMessage('message.send')
  send(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<ChatMessage>> {
    return toAck(async () => {
      const { roomId, ...msg } = clientEvents['message.send'].payload.parse(body);
      if (!socket.data.rooms.has(roomId)) throw forbidden(MEMBERS_ONLY);
      return this.messages.send(socket.data.user, roomId, msg);
    });
  }

  @SubscribeMessage('message.react')
  react(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<ChatMessage>> {
    return toAck(async () => {
      const p = clientEvents['message.react'].payload.parse(body);
      return this.messages.react(socket.data.user, p.messageId, p.emoji);
    });
  }

  @SubscribeMessage('message.pin')
  pin(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<ChatMessage>> {
    return toAck(async () => {
      const p = clientEvents['message.pin'].payload.parse(body);
      return this.messages.pin(socket.data.user, p.messageId, p.pinned);
    });
  }
}
