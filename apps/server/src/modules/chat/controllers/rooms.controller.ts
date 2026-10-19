import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  chatRoomSchema,
  roomFileSchema,
  roomMembersSchema,
  roomPinSchema,
  roomSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { type AccessClaims, AllowRealm, CurrentUser, SkipMembershipFee } from '@/common/auth';
import { respond } from '@/common/http/zod';
import { RoomService } from '../services/room.service';

const portalRooms = z.object({ items: z.array(chatRoomSchema) });
/** D-26: Admin xem chat chỉ đọc nhận `roomSchema` (bỏ trường theo người xem) */
const adminRooms = z.object({ items: z.array(roomSchema) });
const idSchema = z.object({ id: z.string() });

/**
 * Phòng/chủ đề (Portal + Admin xem chat). Route đọc dùng chung với Admin nên bỏ guard phí;
 * thành viên vẫn bị kiểm phí trong ChatAccessService. NA-09 / D-61: chủ đề chỉ Admin tạo trong form
 * nhóm — không có route tạo/xoá chủ đề phía thành viên.
 */
@Controller()
export class RoomsController {
  constructor(private readonly rooms: RoomService) {}

  @AllowRealm('member', 'admin')
  @SkipMembershipFee()
  @Get('groups/:id/rooms')
  async list(
    @CurrentUser() user: AccessClaims,
    @Param('id') id: string,
  ): Promise<z.infer<typeof portalRooms> | z.infer<typeof adminRooms>> {
    const r = await this.rooms.list(user, id);
    return r.admin
      ? respond(adminRooms, { items: r.items })
      : respond(portalRooms, { items: r.items });
  }

  @Post('rooms/:id/read')
  @HttpCode(200)
  async read(@CurrentUser() user: AccessClaims, @Param('id') id: string): Promise<{ id: string }> {
    return respond(idSchema, await this.rooms.markRead(user, id));
  }

  @SkipMembershipFee()
  @Get('rooms/:id/members')
  async members(@CurrentUser() user: AccessClaims, @Param('id') id: string) {
    return respond(roomMembersSchema, await this.rooms.members(user, id));
  }

  @SkipMembershipFee()
  @Get('rooms/:id/pins')
  async pins(@CurrentUser() user: AccessClaims, @Param('id') id: string) {
    return respond(z.object({ items: z.array(roomPinSchema) }), {
      items: await this.rooms.pins(user, id),
    });
  }

  @SkipMembershipFee()
  @Get('rooms/:id/files')
  async files(@CurrentUser() user: AccessClaims, @Param('id') id: string) {
    return respond(z.object({ items: z.array(roomFileSchema) }), {
      items: await this.rooms.files(user, id),
    });
  }
}
