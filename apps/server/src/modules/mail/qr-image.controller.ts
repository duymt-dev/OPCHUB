import { Controller, Get, Logger, Param, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '@/common/auth';
import { notFound } from '@/common/errors';
import { vietQrImage } from '@/common/integrations/vietqr-image';
import { MailQrToken } from './mail-qr-token';
import { MailQrRegistry } from './mail-qr.registry';

@Controller('public/mail-qr')
@Public()
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class QrImageController {
  private readonly logger = new Logger(QrImageController.name);
  constructor(
    private readonly tokens: MailQrToken,
    private readonly targets: MailQrRegistry,
  ) {}
  @Get(':token.png')
  async image(@Param('token') raw: string, @Res() response: Response) {
    const target = this.tokens.verify(raw);
    const payload = target ? await this.targets.resolve(target) : null;
    if (!payload) throw notFound('Không tìm thấy ảnh');
    let png: Buffer;
    try {
      png = await vietQrImage(payload);
    } catch {
      this.logger.warn('mail_qr_encoding_unavailable');
      throw notFound('Không tìm thấy ảnh');
    }
    response.setHeader('Cache-Control', 'private, max-age=86400');
    response.type('image/png').send(png);
  }
}
