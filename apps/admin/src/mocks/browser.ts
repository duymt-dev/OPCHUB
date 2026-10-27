import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { bridgedAffiliateHandlers } from './affiliate-bridge';
import { startBotBootDelay } from './handlers/bot-runtime';

export const worker = setupWorker(...bridgedAffiliateHandlers(handlers));

// Prototype `_simTick`: bot giả chạy nhịp đầu sau 10 giây kể từ khi mở trang
startBotBootDelay();
