import { Controller, Get } from '@nestjs/common';
import { type MemberSuggestion, memberSuggestionSchema } from '@opchub/shared/api-domains';
import { z } from 'zod';
import { respond, ZodQuery } from '@/common/http/zod';
import { ProfileService } from '../services/profile.service';

const suggestQuery = z.object({ q: z.string().max(100).default('') });
const suggestResult = z.object({ items: z.array(memberSuggestionSchema) });

/** `GET /members/suggest?q=` — gợi ý thành viên khi thêm người vào dự án (cần đã đóng phí) */
@Controller('members')
export class MembersController {
  constructor(private readonly profiles: ProfileService) {}

  @Get('suggest')
  async suggest(
    @ZodQuery(suggestQuery) q: z.infer<typeof suggestQuery>,
  ): Promise<{ items: MemberSuggestion[] }> {
    return respond(suggestResult, { items: await this.profiles.suggest(q.q) });
  }
}
