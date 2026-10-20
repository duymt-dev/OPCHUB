import { seedMockAffiliateScenario } from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { API } from './util';

/** Test/demo precondition only: no production handler or component reads this cookie. */
export const affiliateDemoHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    const cookie =
      typeof document === 'undefined'
        ? cookies['opchub-mock-affiliate-demo']
        : document.cookie
            .split('; ')
            .find((v) => v.startsWith('opchub-mock-affiliate-demo='))
            ?.split('=')[1];
    if (cookie === '1') seedMockAffiliateScenario();
    return undefined;
  }),
];
