import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';
import { SlidePanel } from './SlidePanel';

afterEach(cleanup);

/**
 * w5-b6 walk (23 Nov): a confirm dialog opened from inside a `space-y-4`
 * wrapper took that wrapper's 16px bottom margin, so its dimmed backdrop
 * stopped short of the window bottom. Same cause as SlidePanel; same fix.
 */
describe('Modal renders outside the page layout', () => {
  it('is not inside the wrapper it was opened from', () => {
    const { getByTestId } = render(
      <div data-testid="wrap" className="space-y-4">
        <p>page content</p>
        <Modal open onClose={() => {}} title="Suspend user">body</Modal>
      </div>,
    );
    expect(getByTestId('wrap').textContent).not.toContain('Suspend user');
    expect(document.body.textContent).toContain('Suspend user');
  });
});

/**
 * Review of #225: a confirm dialog opened from inside a panel (Reset password
 * in the user details panel). Both listened for Escape on window, so one press
 * closed the dialog AND the panel the admin was working in.
 */
describe('Escape in a dialog opened over a panel', () => {
  it('closes the dialog only', () => {
    const closePanel = vi.fn();
    const closeModal = vi.fn();
    render(
      <SlidePanel open onClose={closePanel} title="User details">
        <Modal open onClose={closeModal} title="Reset password">body</Modal>
      </SlidePanel>,
    );
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(closePanel).not.toHaveBeenCalled();
  });
});
