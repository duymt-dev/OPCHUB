import { authHandlers } from './auth';
import { listHandlers } from './lists';

export const handlers = [...authHandlers, ...listHandlers];
