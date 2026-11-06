import { Controller, Get, Header, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/common/auth';
import { StorePublicService } from '../services/store-public.service';

@Public()
@Controller('public/stores')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class StorePublicController {
  constructor(private readonly stores: StorePublicService) {}
  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=60')
  page(@Param('slug') slug: string) {
    return this.stores.page(slug);
  }
}
