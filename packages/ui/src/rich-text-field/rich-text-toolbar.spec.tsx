import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_RICH_TEXT_LABELS } from './labels';
import { RichTextToolbar } from './rich-text-toolbar';

const run = vi.hoisted(() => vi.fn());
vi.mock('./toolbar', () => ({
  groups: () => [
    [
      { key: 'a', title: 'Insert link', label: 'Link', run: 'link' },
      { key: 'b', title: 'Bold', label: 'B', run },
    ],
  ],
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setup(
  keyboardControls?: boolean,
  editor: Editor | null = {
    getAttributes: () => ({ href: 'https://example.com/raw' }),
  } as unknown as Editor,
) {
  const onLink = vi.fn();
  render(
    <RichTextToolbar
      editor={editor}
      labels={DEFAULT_RICH_TEXT_LABELS}
      onLink={onLink}
      {...(keyboardControls === undefined ? {} : { keyboardControls })}
    />,
  );
  return {
    onLink,
    editor,
    link: screen.getByTitle('Insert link'),
    bold: screen.getByTitle('Bold'),
  };
}

it('D-141 AC824-09 preserves default mouse activation and raw href without enabling keyboard', () => {
  const { link, bold, onLink, editor } = setup();
  fireEvent.keyDown(link, { key: 'Enter' });
  fireEvent.keyDown(link, { key: ' ' });
  expect(onLink).not.toHaveBeenCalled();
  fireEvent.mouseDown(link);
  expect(onLink).toHaveBeenCalledExactlyOnceWith('https://example.com/raw');
  fireEvent.mouseDown(bold);
  expect(run).toHaveBeenCalledExactlyOnceWith(editor);
});

it.each(['Enter', ' '])(
  'D-141 AC824-09 single activation for %s, ignoring repeat and other keys',
  (key) => {
    const { link, bold, onLink, editor } = setup(true);
    fireEvent.keyDown(link, { key: 'ArrowDown' });
    fireEvent.keyDown(link, { key, repeat: true });
    expect(onLink).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(link, { key })).toBe(false);
    fireEvent.keyUp(link, { key });
    fireEvent.click(link);
    expect(onLink).toHaveBeenCalledExactlyOnceWith('https://example.com/raw');
    fireEvent.keyDown(bold, { key });
    expect(run).toHaveBeenCalledExactlyOnceWith(editor);
  },
);

it('D-141 AC824-09 does not act before the editor is ready', () => {
  const { link, bold, onLink } = setup(true, null);
  fireEvent.keyDown(link, { key: 'Enter' });
  fireEvent.mouseDown(bold);
  expect(onLink).not.toHaveBeenCalled();
  expect(run).not.toHaveBeenCalled();
});

it('D-141 AC824-09 retains empty-link fallback for a non-string editor attribute', () => {
  const { link, onLink } = setup(true, {
    getAttributes: () => ({ href: null }),
  } as unknown as Editor);
  fireEvent.keyDown(link, { key: 'Enter' });
  expect(onLink).toHaveBeenCalledExactlyOnceWith('');
});
