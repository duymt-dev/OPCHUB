import { accountHandlers } from './account';
import { authHandlers } from './auth';
import { communityHandlers } from './community';
import { contentHandlers } from './content';
import { listHandlers } from './lists';
import { registerHandlers } from './register';
import { ssoHandlers } from './sso';

export const handlers = [...authHandlers, ...listHandlers, ...registerHandlers, ...ssoHandlers];
handlers.push(...communityHandlers, ...contentHandlers, ...accountHandlers);
