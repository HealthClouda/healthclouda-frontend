import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DutyToggle, dutyBannerText } from './DutyToggle';

/**
 * Build 5 / FLAG-044 — the switch became an OFF switch only, and gained a
 * third rendered state (`off_duty_override`). Carries forward the original
 * GLOBAL-4 lesson this file existed for: the SERVER response is the source
 * of truth, never a local flip — a stale client (duty changed from another
 * device or tab) must render what the backend actually says.
 */

vi.mock('@/hooks/use-api', () => ({ apiAction: vi.fn() }));
vi.mock('@/store/toast', () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}));

import { apiAction } from '@/hooks/use-api';
const apiActionMock = vi.mocked(apiAction);

describe('DutyToggle — server response is the source of truth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports whatever the backend returns, not a local flip', async () => {
    // Stale client thinks it is clearing the override, but the backend says
    // the session is still off duty (e.g. changed elsewhere in the meantime).
    apiActionMock.mockResolvedValue({
      message: 'Duty status updated',
      is_on_duty: false,
      off_duty_override: true,
      duty_toggled_at: '2026-07-09T22:30:00Z',
    });
    const onChange = vi.fn();

    render(<DutyToggle isOnDuty={false} offDutyOverride={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalledWith({ isOnDuty: false, offDutyOverride: true });
  });

  it('falls back to a local computation when the response is missing fields', async () => {
    apiActionMock.mockResolvedValue({ message: 'ok' });
    const onChange = vi.fn();

    render(<DutyToggle isOnDuty={true} offDutyOverride={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));

    // On duty, not overridden → clicking switches OFF: target is_on_duty=false.
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ isOnDuty: false, offDutyOverride: true }));
  });
});

describe('DutyToggle — it is an OFF switch, not an on/off pair', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends {is_on_duty: false} when clicked while on duty (switching off)', async () => {
    apiActionMock.mockResolvedValue({ is_on_duty: false, off_duty_override: true });
    render(<DutyToggle isOnDuty={true} offDutyOverride={false} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(apiActionMock).toHaveBeenCalled());
    expect(apiActionMock).toHaveBeenCalledWith(expect.any(String), 'POST', { is_on_duty: false });
  });

  it('sends {is_on_duty: true} when clicked while overridden — this only CLEARS the override', async () => {
    apiActionMock.mockResolvedValue({ is_on_duty: false, off_duty_override: false });
    render(<DutyToggle isOnDuty={false} offDutyOverride={true} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(apiActionMock).toHaveBeenCalled());
    expect(apiActionMock).toHaveBeenCalledWith(expect.any(String), 'POST', { is_on_duty: true });
  });

  it('label says "Back on duty" when overridden and "Go off duty" otherwise — never claims a state the click cannot guarantee', () => {
    const { rerender } = render(<DutyToggle isOnDuty={false} offDutyOverride={true} onChange={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Back on duty');

    rerender(<DutyToggle isOnDuty={true} offDutyOverride={false} onChange={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Go off duty');

    rerender(<DutyToggle isOnDuty={false} offDutyOverride={false} onChange={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Go off duty');
  });
});

describe('dutyBannerText — the three states a clinician reads', () => {
  it('on duty: active and not switched off', () => {
    expect(dutyBannerText({ isOnDuty: true, offDutyOverride: false })).toMatch(/on duty/i);
  });

  it('off duty (you switched off): off_duty_override is true', () => {
    const text = dutyBannerText({ isOnDuty: false, offDutyOverride: true });
    expect(text).toMatch(/off duty/i);
    expect(text).toMatch(/switched/i);
  });

  it('off duty (inactive): neither on duty nor overridden — must not read as broken', () => {
    const text = dutyBannerText({ isOnDuty: false, offDutyOverride: false });
    expect(text).toMatch(/off duty/i);
    expect(text).not.toMatch(/switched/i);
  });
});
