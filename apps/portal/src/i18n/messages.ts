import auth from '../../messages/vi/auth.json';
import common from '../../messages/vi/common.json';
import community from '../../messages/vi/community.json';
import dashboard from '../../messages/vi/dashboard.json';
import shell from '../../messages/vi/shell.json';

/** Gộp message theo feature — thêm feature mới thì thêm 1 dòng */
export const messages = { auth, common, community, dashboard, shell };

export type Messages = typeof messages;
