import type { AppPushKind, PushRealm } from '@opchub/shared/api-domains';

/** Explicit caller metadata, never inferred from the in-app notification type. */
export interface PushIntent {
  push?: AppPushKind | 'test';
  realm?: PushRealm;
}
