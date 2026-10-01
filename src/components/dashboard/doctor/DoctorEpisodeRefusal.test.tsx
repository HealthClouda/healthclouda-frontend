import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DoctorDashboard } from './DoctorDashboard';
import { ENDPOINTS } from '@/lib/config';
import { useToastStore } from '@/store/toast';
import type { User } from '@/types/auth';

/**
 * FLAG-055 — backend FLAG-619 (HealthClouda/healthclouda-backend#247): POST
 * /episodes/ refuses a patient who has died, 400 with the non-disclosing
 * sentence under `details.patient`. The flat `error` the client turns into
 * `err.message` is prefixed with the field name ("patient: …"). The Start
 * episode panel shows the sentence itself, once, inside the panel.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/doctor',
}));

vi.mock('@/lib/client-api', () => ({
  dataGet: vi.fn(),
  dataAction: vi.fn(),
  redirectToSignin: vi.fn(),
  ClientApiError: class ClientApiError extends Error {
    constructor(public status: number, public data: unknown, message: string) {
      super(message);
      this.name = 'ClientApiError';
    }
  },
}));

import { dataGet, dataAction, ClientApiError } from '@/lib/client-api';
const dataGetMock = vi.mocked(dataGet);
const dataActionMock = vi.mocked(dataAction);

const user = {
  id: 'd1', email: 'doctor@demo.test', first_name: 'Emeka', last_name: 'Okafor',
  role: 'DOCTOR', organization_slug: 'demo-clinic', is_on_duty: true,
} as unknown as User;

const SENTENCE = 'This patient cannot be given a new episode at this time. Please escalate to an administrator.';

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  dataGetMock.mockImplementation((path: string) => {
    if (path.startsWith(ENDPOINTS.DOC_MY_PATIENTS)) {
      return Promise.resolve({
        count: 1, next: null, previous: null,
        results: [{ id: 'pat-1', first_name: 'Bola', last_name: 'Probe', created_at: '2026-07-01T10:00:00Z' }],
      });
    }
    return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
  });
});

async function submitEpisode() {
  render(<DoctorDashboard user={user} initialStats={null} slug="demo-clinic" />);
  fireEvent.click(screen.getByRole('button', { name: 'My Patients' }));
  fireEvent.click(await screen.findByRole('button', { name: 'New episode' }));
  await screen.findByLabelText(/Episode type/);
  fireEvent.click(screen.getByRole('button', { name: 'Start episode' }));
}

describe('FLAG-055 — the Start episode panel shows the refusal', () => {
  it('shows the server sentence inside the panel, without the field prefix, and only once', async () => {
    dataActionMock.mockRejectedValueOnce(new ClientApiError(
      400,
      { error: `patient: ${SENTENCE}`, code: 'BAD_REQUEST', details: { patient: [SENTENCE] } },
      `patient: ${SENTENCE}`,
    ));
    await submitEpisode();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(SENTENCE);
    expect(alert.textContent).not.toMatch(/^patient:/);
    // One notice, not a panel alert plus a toast saying the same thing (FLAG-062).
    expect(useToastStore.getState().toasts).toHaveLength(0);
    // The panel stays open so the doctor can read it.
    expect(screen.getByLabelText(/Episode type/)).toBeInTheDocument();
  });

  it('a refusal without field details still shows its message in the panel', async () => {
    dataActionMock.mockRejectedValueOnce(new ClientApiError(400, { error: 'Something else went wrong.' }, 'Something else went wrong.'));
    await submitEpisode();
    expect(await screen.findByRole('alert')).toHaveTextContent('Something else went wrong.');
  });

  it('a later successful save clears the alert', async () => {
    dataActionMock
      .mockRejectedValueOnce(new ClientApiError(400, { details: { patient: [SENTENCE] } }, `patient: ${SENTENCE}`))
      .mockResolvedValueOnce({});
    await submitEpisode();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Start episode' }));
    await waitFor(() => expect(dataActionMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});
