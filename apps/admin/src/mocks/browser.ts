import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { bridgedAffiliateHandlers } from './affiliate-bridge';

export const worker = setupWorker(...bridgedAffiliateHandlers(handlers));
