import { logger } from '@/lib/logger';
import { bundleOf } from './locales';
import type { Bundle } from './locales';
import { overlayMessages } from './message-overlay';
import { messages, NAMESPACES, SETTINGS_PARTS } from './source-messages';
import type { Messages, Namespace } from './source-messages';
import type { MessageFallback } from './types';

export type CatalogReader = (bundle: Bundle, file: string) => Promise<unknown>;

const readCatalog: CatalogReader = async (bundle, file) => {
  // Keep each variable to one path segment. Bundler globs do not reliably match
  // a slash inside `file`; otherwise all six settings parts silently fall back.
  const part = SETTINGS_PARTS.find((name) => file === `settings/${name}`);
  const imported: unknown = part
    ? await import(`../../messages/${bundle}/settings/${part}.json`)
    : await import(`../../messages/${bundle}/${file}.json`);
  return imported && typeof imported === 'object' && 'default' in imported
    ? imported.default
    : imported;
};

async function readNamespace(bundle: Bundle, namespace: Namespace, reader: CatalogReader) {
  if (namespace === 'botOptions') return reader(bundle, 'bot-options');
  if (namespace !== 'settings') return reader(bundle, namespace);
  const parts = await Promise.all(SETTINGS_PARTS.map((part) => reader(bundle, `settings/${part}`)));
  const result: Record<string, unknown> = {};
  for (const part of parts) {
    if (!part || typeof part !== 'object' || Array.isArray(part)) {
      throw new Error('Invalid settings catalog part');
    }
    for (const [key, value] of Object.entries(part)) {
      if (Object.hasOwn(result, key)) throw new Error('Duplicate settings catalog key');
      result[key] = value;
    }
  }
  return result;
}

/** Allowlist before import; injected readers isolate tests without process-wide locale state. */
export async function loadMessages(
  selectedLocale: string | undefined,
  reader: CatalogReader = readCatalog,
  onFallback?: MessageFallback,
): Promise<Messages> {
  const bundle = bundleOf(selectedLocale);
  if (bundle === 'vi') return messages;
  const parts = await Promise.all(
    NAMESPACES.map(async (namespace) => {
      let translated: unknown;
      try {
        translated = await readNamespace(bundle, namespace, reader);
      } catch {
        // No exception payload: an import failure may include local filesystem details.
        logger.warn('i18n', new Error(`Catalog unavailable: ${bundle}/${namespace}`));
      }
      const fallbacks: string[] = [];
      const value = overlayMessages(
        messages[namespace],
        translated,
        (key, reason) => {
          fallbacks.push(key);
          onFallback?.(key, reason);
        },
        namespace,
      );
      if (fallbacks.length) {
        logger.warn('i18n', new Error(`Catalog fallback: ${bundle}/${namespace}/${fallbacks[0]}`));
      }
      return [namespace, value] as const;
    }),
  );
  return Object.fromEntries(parts) as Messages;
}
