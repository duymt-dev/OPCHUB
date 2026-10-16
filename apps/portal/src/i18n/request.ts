import { getRequestConfig } from 'next-intl/server';
import { messages } from './messages';

/** MVP chỉ một ngôn ngữ, không prefix URL */
export default getRequestConfig(() =>
  Promise.resolve({ locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh', messages }),
);
