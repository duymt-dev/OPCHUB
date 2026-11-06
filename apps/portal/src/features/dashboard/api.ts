import { needMatchesSchema } from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

export const needMatchKeys = {
  mine: (userId: string | undefined) => ['dashboard', 'need-matches', userId] as const,
};
export const fetchNeedMatches = () => api('/me/needs/matches', { schema: needMatchesSchema });
