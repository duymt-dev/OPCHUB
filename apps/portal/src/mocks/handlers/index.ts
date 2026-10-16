import { accountHandlers } from './account';
import { authHandlers } from './auth';
import { chatHandlers } from './chat';
import { communityHandlers } from './community';
import { contentHandlers } from './content';
import { listHandlers } from './lists';
import { projectHandlers } from './projects';
import { registerHandlers } from './register';
import { shellHandlers } from './shell';
import { ssoHandlers } from './sso';

export const handlers = [...authHandlers, ...listHandlers, ...registerHandlers, ...ssoHandlers];
handlers.push(...shellHandlers);
handlers.push(...communityHandlers, ...contentHandlers, ...accountHandlers);
handlers.unshift(...chatHandlers);
handlers.unshift(...projectHandlers);
