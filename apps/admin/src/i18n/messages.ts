import auth from '../../messages/vi/auth.json';
import common from '../../messages/vi/common.json';
import members from '../../messages/vi/members.json';
import overview from '../../messages/vi/overview.json';

/** Gộp message theo feature — thêm feature mới thì thêm 1 dòng import + 1 dòng trong object */
export const messages = {
  auth,
  common,
  overview,
  members,
};

export type Messages = typeof messages;
