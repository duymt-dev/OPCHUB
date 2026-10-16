import auth from '../../messages/vi/auth.json';
import common from '../../messages/vi/common.json';
import community from '../../messages/vi/community.json';

/** Gộp message theo feature — thêm feature mới thì thêm 1 dòng */
export const messages = { auth, common, community };

export type Messages = typeof messages;
