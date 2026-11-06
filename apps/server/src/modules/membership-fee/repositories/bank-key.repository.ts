import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class BankKeyRepository {
  constructor(private readonly prisma: PrismaService) {}
  read() {
    return this.prisma.db.bankWebhookKey.findUnique({
      where: { id: 1 },
      select: { keyEnc: true, hint: true },
    });
  }
  rotate(tx: DbTx, keyEnc: Uint8Array<ArrayBuffer>, hint: string, actorId: string) {
    const data = { keyEnc, hint, rotatedBy: actorId, rotatedAt: new Date() };
    return tx.bankWebhookKey.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  }
}
