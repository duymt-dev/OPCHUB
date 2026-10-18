import { accountHandlers } from './account';
import { authHandlers } from './auth';
import { chatHandlers } from './chat';
import { communityHandlers } from './community';
import { contentHandlers } from './content';
import { investorBridgeHandlers } from './investor-bridge';
import { listHandlers } from './lists';
import { membershipHandlers } from './membership';
import { projectHandlers } from './projects';
import { registerHandlers } from './register';
import { profileHandlers } from './profile';
import { sessionHandlers } from './session';
import { shellHandlers } from './shell';
import { ssoHandlers } from './sso';

export const handlers = [...authHandlers, ...listHandlers, ...registerHandlers, ...ssoHandlers];
handlers.push(...shellHandlers);
handlers.push(...communityHandlers, ...contentHandlers, ...accountHandlers);
handlers.unshift(...chatHandlers);
handlers.unshift(...membershipHandlers);
handlers.push(...profileHandlers);
handlers.unshift(...projectHandlers);
// Luồng nhà đầu tư chung với Admin MSW (TIP-V2-107): gộp cookie trước mọi handler domain
handlers.unshift(...investorBridgeHandlers);
// Giả lập TK bị khoá giữa phiên (TIP-V2-104): đứng đầu để chặn mọi request khi cookie bật
handlers.unshift(...sessionHandlers);
