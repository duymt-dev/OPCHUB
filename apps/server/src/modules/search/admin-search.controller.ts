import { Controller, Get } from '@nestjs/common';
import { globalSearchQuerySchema, globalSearchResultSchema } from '@opchub/shared/api-domains';
import type { z } from 'zod';
import { type AccessClaims, CurrentUser, RequireAnyAdmin } from '@/common/auth';
import { respond, ZodQuery } from '@/common/http/zod';
import { SearchService } from './search.service';

@Controller('admin')
export class AdminSearchController {
  constructor(private readonly search: SearchService) {}
  @Get('search')
  @RequireAnyAdmin('members.view', 'stores.view', 'projects.view', 'groups.view')
  async get(
    @CurrentUser() user: AccessClaims,
    @ZodQuery(globalSearchQuerySchema) query: z.infer<typeof globalSearchQuerySchema>,
  ) {
    return respond(globalSearchResultSchema, await this.search.search(query.q, user, true));
  }
}
