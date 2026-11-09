import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class AiModerationRepository {
  constructor(private readonly prisma: PrismaService) {}
  message(id: string) {
    return this.prisma.db.message.findFirst({
      where: {
        id,
        hiddenAt: null,
        deletedAt: null,
        isSimulated: false,
        personaId: null,
        senderId: { not: null },
        sender: { deletedAt: null },
        kind: 'text',
        room: { group: { deletedAt: null } },
      },
      select: { id: true, body: true, senderId: true, reports: { select: { id: true }, take: 1 } },
    });
  }
  async claim(messageId: string) {
    const row = await this.prisma.db.moderationAiClaim.createMany({
      data: [{ messageId }],
      skipDuplicates: true,
    });
    return row.count === 1;
  }
}
