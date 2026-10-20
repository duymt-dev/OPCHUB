import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusTag } from './status-tag';

afterEach(cleanup);
describe('StatusTag line box', () => {
  it('REQ-311 preserves the existing 20px default for other features', () => {
    render(<StatusTag tone="green">Default</StatusTag>);
    expect(screen.getByText('Default').style.lineHeight).toBe('20px');
  });
  it('REQ-311 affiliate can request a 24px bordered badge without CSS overriding inline styles', () => {
    render(
      <StatusTag tone="blue" lineHeight={22}>
        Recorded
      </StatusTag>,
    );
    const tag = screen.getByText('Recorded');
    expect(tag.style.lineHeight).toBe('22px');
    expect(tag.style.borderWidth).toBe('1px');
  });
});
