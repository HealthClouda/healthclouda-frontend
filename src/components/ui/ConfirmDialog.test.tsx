import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

afterEach(cleanup);

/**
 * Review of #232: each confirm style pins its icon, its chip colour and its
 * button, so a later edit can't quietly turn Activate amber or Suspend blue.
 */
describe('ConfirmDialog styles', () => {
  it.each([
    ['primary', 'info', 'bg-chip text-primary', 'bg-primary'],
    // Darker amber (warning-strong): plain warning on its pale chip is ~2.9:1, under the 3:1 icons need.
    ['warning', 'warning', 'bg-warning-bg text-warning-strong', 'bg-primary'],
    ['danger', 'warning', 'bg-danger-bg text-danger', 'bg-danger'],
  ] as const)('%s: %s icon, "%s" chip, %s button', (variant, icon, chip, button) => {
    render(<ConfirmDialog open onClose={() => {}} onConfirm={() => {}} title="T" description="D" confirmLabel="Go" confirmVariant={variant} />);
    const svg = document.querySelector(`[data-icon="${icon}"]`)!;
    expect(svg).not.toBeNull();
    expect(svg.parentElement!.className).toContain(chip);
    expect(screen.getByRole('button', { name: 'Go' }).className).toMatch(new RegExp(`(^|\\s)${button}(\\s|$)`));
  });
});
