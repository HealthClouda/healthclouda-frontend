import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ENDPOINTS } from '@/lib/config';
import { useToastStore } from '@/store/toast';
import type { User } from '@/types/auth';

/**
 * FLAG-611 — the frontend half. Backend #249 (FLAG-620): a signed-in
 * `POST /auth/change-password/ {old_password, new_password}` ends the user's
 * other sessions and answers `{message, other_sessions_ended}`. A refusal is
 * DRF's raw field errors (the view returns `serializer.errors`, so there is no
 * `error`/`details` wrapper): `{old_password: ['Old password is incorrect']}`.
 */

const replaceMock = vi.fn();
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: vi.fn() }),
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
import { ChangePasswordForm, passwordChangedMessage } from './ChangePasswordForm';
import { ForcedPasswordChange } from './ForcedPasswordChange';
import { Sidebar } from '@/components/layout/Sidebar';
const dataGetMock = vi.mocked(dataGet);
const dataActionMock = vi.mocked(dataAction);

const NEW = 'N3w-Strong#Pass';

function fill(current: string, next: string, confirm = next) {
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: confirm } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
});

describe('FLAG-611 — ChangePasswordForm', () => {
  it('posts the current and new password to the change-password endpoint', async () => {
    dataActionMock.mockResolvedValue({ message: 'Password changed successfully', other_sessions_ended: 2 });
    const onChanged = vi.fn();
    render(<ChangePasswordForm onChanged={onChanged} />);
    fill('Old#Pass1', NEW);
    submit();

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(2));
    expect(dataActionMock).toHaveBeenCalledWith(ENDPOINTS.CHANGE_PW, 'POST', { old_password: 'Old#Pass1', new_password: NEW });
  });

  it('will not send a new password that breaks the rules, or a confirmation that does not match', async () => {
    render(<ChangePasswordForm onChanged={vi.fn()} />);
    fill('Old#Pass1', 'short');
    submit();
    fill('Old#Pass1', NEW, 'N3w-Strong#Pasz');
    submit();
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(dataActionMock).not.toHaveBeenCalled();
  });

  it('shows a wrong current password at that field, from the raw DRF body', async () => {
    dataActionMock.mockRejectedValue(new ClientApiError(400, { old_password: ['Old password is incorrect'] }, 'Request failed (HTTP 400)'));
    render(<ChangePasswordForm onChanged={vi.fn()} />);
    fill('Wrong#Pass1', NEW);
    submit();

    const alert = await screen.findByText('Old password is incorrect');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('also reads the wrapped {details} shape for the new password', async () => {
    dataActionMock.mockRejectedValue(new ClientApiError(
      400, { error: 'new_password: Too common.', details: { new_password: ['Too common.'] } }, 'new_password: Too common.',
    ));
    render(<ChangePasswordForm onChanged={vi.fn()} />);
    fill('Old#Pass1', NEW);
    submit();
    expect(await screen.findByText('Too common.')).toBeInTheDocument();
  });

  it('says how many other devices were signed out', () => {
    expect(passwordChangedMessage(0)).toBe('Password changed.');
    expect(passwordChangedMessage(1)).toBe('Password changed. You’ve been signed out on 1 other device.');
    expect(passwordChangedMessage(3)).toBe('Password changed. You’ve been signed out on 3 other devices.');
  });
});

const user = {
  id: 'd1', email: 'doctor@demo.test', first_name: 'Emeka', last_name: 'Okafor',
  role: 'DOCTOR', organization_slug: 'demo-clinic', organization_name: 'Demo Clinic',
} as unknown as User;

describe('FLAG-611 — Change password from the sidebar, on every dashboard', () => {
  it('opens the form in a panel and confirms with the signed-out count', async () => {
    dataActionMock.mockResolvedValue({ message: 'ok', other_sessions_ended: 2 });
    render(<Sidebar navItems={[]} activePage="" onPageChange={vi.fn()} user={user} isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    const dialog = await screen.findByRole('dialog', { name: 'Change password' });
    fill('Old#Pass1', NEW);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change password' }));

    await waitFor(() => expect(useToastStore.getState().toasts.map(t => t.message))
      .toContain('Password changed. You’ve been signed out on 2 other devices.'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Change password' })).toBeNull());
  });

  it('FLAG-068: the name keeps its own row; the account actions sit on the row below', () => {
    // #178 put the button in the name's row, and a 230px sidebar left the
    // name ~1px wide. jsdom can't measure that, so pin the structure instead:
    // the name's row must not also hold either button.
    render(<Sidebar navItems={[]} activePage="" onPageChange={vi.fn()} user={user} isOpen onClose={vi.fn()} />);
    const nameRow = screen.getByText('Emeka Okafor').closest('div.flex') as HTMLElement;
    expect(within(nameRow).getByText('Demo Clinic')).toBeInTheDocument();
    expect(within(nameRow).queryByRole('button')).toBeNull();

    const changePw = screen.getByRole('button', { name: 'Change password' });
    const signOut = screen.getByRole('button', { name: 'Sign out' });
    expect(changePw.parentElement).toBe(signOut.parentElement);
    expect(nameRow.contains(changePw)).toBe(false);
  });
});

describe('FLAG-611 — the forced change page', () => {
  it('after the change, sends the user to their own dashboard from /auth/me/', async () => {
    dataActionMock.mockResolvedValue({ message: 'ok', other_sessions_ended: 0 });
    dataGetMock.mockResolvedValue({ role: 'NURSE', organization: { slug: 'demo-clinic', name: 'Demo Clinic' } });
    render(<ForcedPasswordChange />);
    expect(screen.getByRole('heading', { name: /choose a new password/i })).toBeInTheDocument();
    fill('Temp#Pass1', NEW);
    submit();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/demo-clinic/nurse'));
    expect(dataGetMock).toHaveBeenCalledWith(ENDPOINTS.ME);
  });

  it('a patient goes to the slug-less patient portal', async () => {
    dataActionMock.mockResolvedValue({ message: 'ok', other_sessions_ended: 0 });
    dataGetMock.mockResolvedValue({ role: 'PATIENT', organization: null });
    render(<ForcedPasswordChange />);
    fill('Temp#Pass1', NEW);
    submit();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/patient'));
  });

  it('offers Sign out instead, which ends the session and goes to sign in', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);
    render(<ForcedPasswordChange />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out instead' }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/signin'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    vi.unstubAllGlobals();
  });
});
