import auth from '../../messages/vi/auth.json';
import common from '../../messages/vi/common.json';
import overview from '../../messages/vi/overview.json';

/** Gộp message theo feature — thêm feature mới thì thêm 1 dòng */
export const messages = { auth, common, overview };

export type Messages = typeof messages;
