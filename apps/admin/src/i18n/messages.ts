import auth from '../../messages/vi/auth.json';
import common from '../../messages/vi/common.json';
import fees from '../../messages/vi/fees.json';
import overview from '../../messages/vi/overview.json';

/** Gộp message theo feature — thêm feature mới thì thêm 1 dòng */
export const messages = {
  auth,
  common,
  overview,
  fees,
};

export type Messages = typeof messages;
