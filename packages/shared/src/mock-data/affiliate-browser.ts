/** Browser-only mock entry: keep DOM transport out of the Node/server domain barrel. */
export { createMockAffiliateBridge } from './domains/affiliate-persistence/client';
export { installMockAffiliateHost } from './domains/affiliate-persistence/host';
export { subscribeMockChatRooms } from './domains/community-persistence/chat-events';
