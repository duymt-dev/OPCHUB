import { seedMockAffiliateScenario, seedMockRevenueScenario } from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { API } from './util';

/** Test/demo precondition only: no production handler or component reads this cookie. */
export const affiliateDemoHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    const read = (name: string) =>
      typeof document === 'undefined'
        ? cookies[name]
        : document.cookie
            .split('; ')
            .find((v) => v.startsWith(`${name}=`))
            ?.split('=')[1];
    if (read('opchub-mock-affiliate-demo') === '1')
      seedMockAffiliateScenario({
        paused: read('opchub-mock-affiliate-paused') === '1',
        payout: read('opchub-mock-affiliate-payout') === '1',
      });
    if (read('opchub-mock-revenue-demo') === '1') seedMockRevenueScenario();
    return undefined;
  }),
];
