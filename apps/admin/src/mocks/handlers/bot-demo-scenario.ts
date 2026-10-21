import { seedManualMockBotScenario } from '@opchub/shared/mock-domains';
import { http } from 'msw/http';
import { API } from './util';

/** Run before bot handler execution; identical opt-in to the native seed flag. */
export const botDemoScenarioHandlers = [
  http.all(`${API}/*`, ({ cookies }) => {
    const name = 'opchub-mock-bot-manual';
    const value =
      typeof document === 'undefined'
        ? cookies[name]
        : document.cookie
            .split('; ')
            .find((entry) => entry.startsWith(`${name}=`))
            ?.slice(name.length + 1);
    if (value === '1') seedManualMockBotScenario();
    return undefined;
  }),
];
