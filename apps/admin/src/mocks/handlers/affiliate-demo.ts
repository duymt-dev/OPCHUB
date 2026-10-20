import { seedMockAffiliateScenario } from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { API } from './util';

/** Same explicit AF0 precondition as Portal; never changes the default eight-user pack. */
export const affiliateDemoHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    const read = (name: string) =>
      typeof document === 'undefined'
        ? cookies[name]
        : document.cookie
            .split('; ')
            .find((value) => value.startsWith(`${name}=`))
            ?.slice(name.length + 1);
    if (read('opchub-mock-affiliate-demo') === '1')
      seedMockAffiliateScenario({
        paused: read('opchub-mock-affiliate-paused') === '1',
        payout: read('opchub-mock-affiliate-payout') === '1',
      });
    return undefined;
  }),
];
