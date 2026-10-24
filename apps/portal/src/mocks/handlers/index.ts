import { accountHandlers } from './account';
import { affiliateHandlers } from './affiliate';
import { authHandlers } from './auth';
import { mockRefreshHandlers } from './mock-auth-session';
import { chatHandlers } from './chat';
import { communityHandlers } from './community';
import { contentHandlers } from './content';
import { declarationHandlers } from './declaration';
import { fundraisingHandlers } from './fundraising';
import { investorBridgeHandlers } from './investor-bridge';
import { listHandlers } from './lists';
import { membershipHandlers } from './membership';
import { projectHandlers } from './projects';
import { registerHandlers } from './register';
import { profileHandlers } from './profile';
import { sessionHandlers } from './session';
import { shellHandlers } from './shell';
import { ssoHandlers } from './sso';
import { storeHandlers } from './stores';

export const handlers = [...authHandlers, ...listHandlers, ...registerHandlers, ...ssoHandlers];
handlers.unshift(...affiliateHandlers);
handlers.unshift(...mockRefreshHandlers);
handlers.push(...shellHandlers);
handlers.push(...communityHandlers, ...contentHandlers, ...accountHandlers);
handlers.unshift(...chatHandlers);
handlers.unshift(...membershipHandlers);
handlers.push(...profileHandlers);
handlers.unshift(...declarationHandlers);
handlers.unshift(...projectHandlers);
// V4-610 Gói Gọi vốn: route riêng + gộp cookie chung với Admin trước handler dự án
handlers.unshift(...fundraisingHandlers);
// V4-608 Gian hàng địa phương: cookie trạng thái chung với Admin
handlers.unshift(...storeHandlers);
// Luồng nhà đầu tư chung với Admin MSW (TIP-V2-107): gộp cookie trước mọi handler domain
handlers.unshift(...investorBridgeHandlers);
// Giả lập TK bị khoá giữa phiên (TIP-V2-104): đứng đầu để chặn mọi request khi cookie bật
handlers.unshift(...sessionHandlers);
import { affiliateDemoHandlers } from './affiliate-demo';
handlers.unshift(...affiliateDemoHandlers);
