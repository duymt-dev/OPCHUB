import { Controller, Get, Header, Param, Post, HttpCode, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { storePublicSlugSchema, storeGuestViewBodySchema } from '@opchub/shared/api-domains';
import { ZodBody } from '@/common/http/zod';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/auth';
import { StorePublicService } from '../services/store-public.service';
import { StoreGuestViewService } from '../services/store-guest-view.service';
import { StorePublicLogoService } from '../services/store-public-logo.service';

@Public()
@Controller('public/stores')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class StorePublicController {
  constructor(
    private readonly stores: StorePublicService,
    private readonly views: StoreGuestViewService,
    private readonly logos: StorePublicLogoService,
  ) {}
  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=60')
  page(@Param('slug') slug: string) {
    return this.stores.page(slug);
  }

  @Get(':slug/logo')
  async logo(@Param('slug') slug: string, @Res() res: Response) {
    const logo = await this.logos.logo(storePublicSlugSchema.parse(slug));
    if (!logo) return res.status(204).end();
    return res.type(logo.type ?? 'image/png').send(logo.bytes);
  }

  @Post(':slug/view')
  @HttpCode(204)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async view(
    @Param('slug') slug: string,
    @ZodBody(storeGuestViewBodySchema) _body: object,
    @Req() req: Request,
  ) {
    const parsed = storePublicSlugSchema.parse(slug);
    await this.views.record(
      parsed,
      req.ip ?? '',
      req.get('user-agent') ?? '',
      req.get('authorization'),
    );
  }
}
