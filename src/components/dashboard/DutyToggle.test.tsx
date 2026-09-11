import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DutyToggle } from './DutyToggle';

/**
 * Pre-fix test (GLOBAL-4 companion), written RED:
 *
 * POST /auth/me/toggle-duty/ returns the authoritative state —
 * `{message, is_on_duty, duty_toggled_at}` (verified live 2026-07-05).
 * The pre-fix toggle ignored the response and flipped its local boolean,
 * so a stale client (e.g. duty already toggled from another device or a
 * second tab) would render the OPPOSITE of the real state after clicking.
 */

vi.mock('@/hooks/use-api', () => ({ apiAction: vi.fn() }));
vi.mock('@/store/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}));

import { apiAction } from '@/hooks/use-api';
const apiActionMock = vi.mocked(apiAction);

describe('DutyToggle — server response is the source of truth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports the is_on_duty value RETURNED by the backend, not a local flip', async () => {
    // Stale client: UI thinks off-duty, but the toggle lands on an already
    // on-duty session being turned OFF server-side → backend says false.
    apiActionMock.mockResolvedValue({
      message: 'Duty status updated',
      is_on_duty: false,
      duty_toggled_at: '2026-07-09T22:30:00Z',
    });
    const onToggle = vi.fn();

    render(<DutyToggle isOnDuty={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(onToggle).toHaveBeenCalled());
    // Pre-fix: local flip reported `true`. The backend said `false`.
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('falls back to the local flip when the response has no is_on_duty', async () => {
    apiActionMock.mockResolvedValue({ message: 'ok' });
    const onToggle = vi.fn();

    render(<DutyToggle isOnDuty={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(true));
  });
});
