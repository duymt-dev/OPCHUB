import type { MessageFallback, MessageNode } from './types';

function objectOf(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

const isMessageArray = (value: MessageNode): value is readonly MessageNode[] =>
  Array.isArray(value);

/** Source-driven merge: translated properties can neither create keys nor change leaf types. */
export function overlayMessages<T extends MessageNode>(
  source: T,
  translated: unknown,
  onFallback?: MessageFallback,
  key = '',
): T {
  if (typeof source === 'string') {
    // Preserve the intentional blank actions header without reporting a false fallback.
    if (source === '' && translated === '') return source;
    if (typeof translated === 'string' && translated.trim()) return translated as T;
    onFallback?.(
      key,
      translated === undefined ? 'missing' : typeof translated === 'string' ? 'empty' : 'shape',
    );
    return source;
  }
  if (isMessageArray(source)) {
    if (!Array.isArray(translated) || translated.length !== source.length) {
      onFallback?.(key, translated === undefined ? 'missing' : 'shape');
      return source;
    }
    return source.map((value, index) =>
      overlayMessages(value, translated[index], onFallback, `${key}.${index}`),
    ) as unknown as T;
  }
  const object = objectOf(translated);
  if (!object) {
    onFallback?.(key, translated === undefined ? 'missing' : 'shape');
    return source;
  }
  return Object.fromEntries(
    Object.entries(source).map(([child, value]) => [
      child,
      overlayMessages(value, object[child], onFallback, key ? `${key}.${child}` : child),
    ]),
  ) as T;
}
