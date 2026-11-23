import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SlidePanel } from './SlidePanel';
import { Toaster } from './Toaster';
import { useToastStore } from '@/store/toast';

/**
 * FLAG-062 — toasts sit bottom-right, exactly where a slide panel's footer
 * buttons are, and warning/error toasts stay until dismissed. On 28 Sep a
 * nurse's "Awaiting doctor confirmation" warning covered the next panel's
 * "Record outcome" button. While any panel is open the page is marked, and the
 * toaster (class `hc-toaster`) moves left of the 440px panel — see globals.css.
 */
afterEach(() => { cleanup(); useToastStore.setState({ toasts: [] }); });

describe('FLAG-062 — toasts never cover an open slide panel', () => {
  it('marks the page while a panel is open, and clears it when the panel closes', () => {
    const { rerender } = render(<SlidePanel open onClose={() => {}} title="A">x</SlidePanel>);
    expect(document.body.hasAttribute('data-panel-open')).toBe(true);
    rerender(<SlidePanel open={false} onClose={() => {}} title="A">x</SlidePanel>);
    expect(document.body.hasAttribute('data-panel-open')).toBe(false);
  });

  it('keeps the mark while a second panel is still open', () => {
    const { rerender } = render(<>
      <SlidePanel open onClose={() => {}} title="A">a</SlidePanel>
      <SlidePanel open onClose={() => {}} title="B">b</SlidePanel>
    </>);
    rerender(<>
      <SlidePanel open={false} onClose={() => {}} title="A">a</SlidePanel>
      <SlidePanel open onClose={() => {}} title="B">b</SlidePanel>
    </>);
    expect(document.body.hasAttribute('data-panel-open')).toBe(true);
  });

  it('the toaster carries the class the panel-open rule targets', () => {
    useToastStore.setState({ toasts: [{ id: 't1', type: 'warning', message: 'Awaiting doctor confirmation.' }] });
    const { container } = render(<Toaster />);
    expect(container.querySelector('.hc-toaster')).not.toBeNull();
  });
});

/**
 * w5-b6 walk (23 Nov): the panel's backdrop stopped 16px short of the window
 * bottom on every superadmin panel. The panel was rendered inside the page's
 * `space-y-4` wrapper, which gives every child but the last a 16px bottom
 * margin, and a margin shrinks a `fixed inset-0` box. Rendered onto <body>, no
 * page layout can reach it.
 */
describe('SlidePanel renders outside the page layout', () => {
  it('puts the panel and its backdrop on <body>, not inside the wrapper it was opened from', () => {
    const { getByTestId } = render(
      <div data-testid="wrap" className="space-y-4">
        <p>page content</p>
        <SlidePanel open onClose={() => {}} title="A">x</SlidePanel>
      </div>,
    );
    const wrap = getByTestId('wrap');
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(wrap.contains(dialog)).toBe(false);
    expect(wrap.querySelector('[aria-hidden]')).toBeNull();
  });
});

/**
 * w5-b6 / review of #225: errors stay until dismissed (WCAG 2.2.1), so a
 * "Please fill in all required fields" raised inside a panel outlived the
 * panel. Closing a panel clears the errors raised while it was open. Errors
 * from before it opened, and warnings, are not its business and stay.
 */
describe('closing a panel clears the errors it raised', () => {
  it('removes errors raised while open, keeps earlier errors and warnings', () => {
    const add = useToastStore.getState().add;
    add('Failed to update duty status', 'error');
    const { rerender } = render(<SlidePanel open onClose={() => {}} title="Add Organisation">x</SlidePanel>);
    add('Please fill in all required fields', 'error');
    add('Awaiting doctor confirmation.', 'warning');
    rerender(<SlidePanel open={false} onClose={() => {}} title="Add Organisation">x</SlidePanel>);
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual([
      'Failed to update duty status',
      'Awaiting doctor confirmation.',
    ]);
  });
});
