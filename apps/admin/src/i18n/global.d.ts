import type { Messages } from './messages';

declare module 'next-intl' {
  interface AppConfig {
    Locale: string;
    Messages: Messages;
  }
}
