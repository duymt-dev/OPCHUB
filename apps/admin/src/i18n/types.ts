export type MessageNode = string | readonly MessageNode[] | { readonly [key: string]: MessageNode };
export type MessageFallbackReason = 'missing' | 'shape' | 'empty';
export type MessageFallback = (key: string, reason: MessageFallbackReason) => void;

export interface LocaleProfile {
  readonly intl: string;
  readonly dayjs: string;
  readonly antd: string;
}
