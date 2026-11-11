import { cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { ApiError } from '@/lib/api-client';
import { LocalImageUploadError } from '@/lib/image-upload-error';
import { uploadImage } from '@/lib/upload-image';
import source from '../../messages/vi/ui.json';
import english from '../../messages/en/ui.json';
import { useUploadImage } from './use-upload-image';

vi.mock('@/lib/upload-image', () => ({ uploadImage: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
const file = new File(['test'], 'test.png', { type: 'image/png' });
function mount() {
  const current = { locale: 'vi' as 'vi' | 'en' };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider
      locale={current.locale}
      messages={{ ui: current.locale === 'vi' ? source : english }}
    >
      {children}
    </NextIntlClientProvider>
  );
  return { ...renderHook(() => useUploadImage(), { wrapper }), current };
}

describe('D-141 AC824-10/12 typed Admin upload translation', () => {
  it.each(['imageType', 'imageUpload'] as const)(
    'translates only local %s in the live locale',
    async (code) => {
      vi.mocked(uploadImage).mockRejectedValue(new LocalImageUploadError(code));
      const h = mount();
      await expect(h.result.current(file, 'avatar')).rejects.toMatchObject({
        message: source.errors[code],
      });
      h.current.locale = 'en';
      h.rerender();
      await expect(h.result.current(file, 'avatar')).rejects.toMatchObject({
        message: english.errors[code],
      });
    },
  );
  it('a locale switch while upload is in flight uses the latest translator on failure', async () => {
    let reject: (error: unknown) => void = () => {
      throw new Error('not started');
    };
    vi.mocked(uploadImage).mockImplementation(
      () =>
        new Promise<string>((_, fail) => {
          reject = fail;
        }),
    );
    const h = mount();
    const pending = h.result.current(file, 'avatar').catch((error: unknown) => error);
    h.current.locale = 'en';
    h.rerender();
    reject(new LocalImageUploadError('imageUpload'));
    expect(await pending).toMatchObject({ message: english.errors.imageUpload });
  });
  it('raw API text is not translated by matching text, code or field content', async () => {
    const raw = new ApiError('VALIDATION_ERROR', 400, source.errors.imageType, [
      { path: 'avatarUrl', message: source.errors.imageUpload },
    ]);
    vi.mocked(uploadImage).mockRejectedValue(raw);
    const h = mount();
    h.current.locale = 'en';
    h.rerender();
    await expect(h.result.current(file, 'avatar')).rejects.toBe(raw);
  });
  it('success preserves the exact file, kind and public URL', async () => {
    vi.mocked(uploadImage).mockResolvedValue('/uploads/unchanged.png');
    const h = mount();
    expect(await h.result.current(file, 'event-cover')).toBe('/uploads/unchanged.png');
    expect(uploadImage).toHaveBeenCalledWith(file, 'event-cover');
  });
  it('all five real consumers opt in; direct/aliased raw imports in production features fail', () => {
    const root = join(__dirname, '../features');
    function files(path: string): string[] {
      return readdirSync(path, { withFileTypes: true })
        .flatMap((entry) =>
          entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)],
        )
        .filter((file) => /\.tsx?$/.test(file) && !/\.(spec|test)\./.test(file));
    }
    const consumers: string[] = [];
    for (const file of files(root)) {
      const text = readFileSync(file, 'utf8');
      const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      for (const statement of ast.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
          continue;
        expect(statement.moduleSpecifier.text, file).not.toBe('@/lib/upload-image');
        if (statement.moduleSpecifier.text === '@/i18n/use-upload-image')
          consumers.push(file.replaceAll('\\', '/'));
      }
    }
    expect(consumers.map((file) => file.slice(file.indexOf('/features/') + 10)).sort()).toEqual([
      'bots/components/persona-drawer.tsx',
      'events/components/event-form.tsx',
      'groups/components/group-form.tsx',
      'profile/hooks/use-admin-profile.ts',
      'settings/components/logo-picker.tsx',
    ]);
    const fixture = ts.createSourceFile(
      'fixture.ts',
      "import { uploadImage as renamed } from '@/lib/upload-image';",
      ts.ScriptTarget.Latest,
      true,
    );
    expect(
      fixture.statements.some(
        (node) =>
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier) &&
          node.moduleSpecifier.text === '@/lib/upload-image',
      ),
    ).toBe(true);
  });
});
