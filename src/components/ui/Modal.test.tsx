import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Modal } from './Modal';

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
