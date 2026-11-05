import { Controller, Get } from '@nestjs/common';
import { globalSearchQuerySchema, globalSearchResultSchema } from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { type AccessClaims, AllowAccountTypes, CurrentUser } from '@/common/auth';
import { respond, ZodQuery } from '@/common/http/zod';
import { SearchService } from './search.service';

@Controller()
export class SearchController {
  constructor(private readonly search: SearchService) {}
  @Get('search')
  @AllowAccountTypes('investor')
  async get(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(globalSearchQuerySchema) query: z.infer<typeof globalSearchQuerySchema>,
  ) {
    return respond(globalSearchResultSchema, await this.search.search(query.q, user));
  }
}
