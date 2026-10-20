import { describe, expect, it, vi } from 'vitest';
import { revealAffiliateTab } from './use-affiliate-tab-visibility';

function strip(left: number, right: number) {
  const container = document.createElement('div');
  const button = document.createElement('button');
  button.setAttribute('aria-selected', 'true');
  container.append(button);
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 300, 280, 40));
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(left, 300, right - left, 40),
  );
  return container;
}

describe('REQ-312 horizontal detail tab visibility', () => {
  it('reveals a clipped active customer tab including its trailing API count', () => {
    const container = strip(220, 380);
    revealAffiliateTab(container);
    expect(container.scrollLeft).toBe(80);
    expect(container.scrollTop).toBe(0);
  });
  it('reveals the first tab when switching back from a scrolled customer tab', () => {
    const container = strip(-60, 170);
    container.scrollLeft = 80;
    revealAffiliateTab(container);
    expect(container.scrollLeft).toBe(0);
  });
  it('does not disturb an already visible tab or an empty strip', () => {
    const container = strip(40, 200);
    container.scrollLeft = 30;
    revealAffiliateTab(container);
    expect(container.scrollLeft).toBe(30);
    container.replaceChildren();
    revealAffiliateTab(container);
    expect(container.scrollLeft).toBe(30);
  });
});
