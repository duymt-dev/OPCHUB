import auth from '../../messages/vi/auth.json';
import bots from '../../messages/vi/bots.json';
import common from '../../messages/vi/common.json';
import fees from '../../messages/vi/fees.json';
import groups from '../../messages/vi/groups.json';
import members from '../../messages/vi/members.json';
import overview from '../../messages/vi/overview.json';

/** Gộp message theo feature — thêm feature mới thì thêm 1 dòng import + 1 dòng trong object */
export const messages = {
  auth,
  common,
  overview,
  bots,
  fees,
  members,
  groups,
};

export type Messages = typeof messages;
