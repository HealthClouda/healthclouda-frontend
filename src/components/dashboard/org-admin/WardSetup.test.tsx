import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ENDPOINTS } from '@/lib/config';
import { useToastStore } from '@/store/toast';
import type { User } from '@/types/auth';

/**
 * FLAG-072 — the org admin adds, edits and deletes wards from Wards & Beds
 * (owner, 6 Oct). Backend FLAG-624 makes this the org admin's alone.
 * Contract: POST /ward/ and PATCH /ward/<id>/ {name, category,
 * category_other, gender, total_beds}; DELETE /ward/<id>/. Refusals arrive as
 * {error, details: {field: [msg]}} or a flat {error}.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/org-admin',
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
import { WardSetupPanel } from './WardSetupPanel';
import { OrgAdminDashboard } from './OrgAdminDashboard';
const dataGetMock = vi.mocked(dataGet);
const dataActionMock = vi.mocked(dataAction);

const WARD = {
  id: 'w1', name: 'General Ward', category: 'MEDICAL', category_other: '', gender: 'O', total_beds: 6,
};

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  dataGetMock.mockImplementation((path: string) => {
    if (path === ENDPOINTS.WARD('w1')) return Promise.resolve(WARD);
    if (path.startsWith(ENDPOINTS.ORG_ADMIN_WARDS_OVERVIEW)) {
      return Promise.resolve([{ id: 'w1', name: 'General Ward', total_beds: 6, occupied_beds: 4 }]);
    }
    return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
  });
});

function change(id: string, value: string) {
  fireEvent.change(document.getElementById(id) as HTMLElement, { target: { value } });
}

describe('FLAG-072 — add a ward', () => {
  it('sends the ward with its number of beds, then refreshes and closes', async () => {
    dataActionMock.mockResolvedValue({ id: 'w2' });
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<WardSetupPanel target={{ kind: 'add' }} onClose={onClose} onSaved={onSaved} />);

    change('ward-name', 'Children');
    change('ward-category', 'PAEDIATRIC');
    change('ward-gender', 'F');
    change('ward-total-beds', '3');
    fireEvent.click(screen.getByRole('button', { name: 'Add ward' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalledWith(ENDPOINTS.WARDS, 'POST', {
      name: 'Children', category: 'PAEDIATRIC', category_other: '', gender: 'F', total_beds: 3,
    }));
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(useToastStore.getState().toasts.map(t => t.message)).toContain('Children added with 3 beds');
  });

  it('asks what kind of ward only when the type is Other, and requires it then', async () => {
    render(<WardSetupPanel target={{ kind: 'add' }} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(document.getElementById('ward-category-other')).toBeNull();

    change('ward-name', 'Dialysis');
    change('ward-category', 'OTHER');
    expect(document.getElementById('ward-category-other')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add ward' }));

    expect(await screen.findByText('Say what kind of ward this is.')).toBeInTheDocument();
    expect(dataActionMock).not.toHaveBeenCalled();
  });

  it('will not send a name-less ward or an impossible bed count', async () => {
    render(<WardSetupPanel target={{ kind: 'add' }} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add ward' }));
    expect(await screen.findByText('Give the ward a name.')).toBeInTheDocument();

    change('ward-name', 'X');
    change('ward-total-beds', '2.5');
    fireEvent.click(screen.getByRole('button', { name: 'Add ward' }));
    expect(await screen.findByText(/whole number from 0 to 200/)).toBeInTheDocument();
    expect(dataActionMock).not.toHaveBeenCalled();
  });

  it('shows a taken name under the name field, in the backend’s words', async () => {
    const msg = 'A ward with this name already exists in your organization.';
    dataActionMock.mockRejectedValue(new ClientApiError(400, { error: `name: ${msg}`, details: { name: [msg] } }, `name: ${msg}`));
    const onClose = vi.fn();
    render(<WardSetupPanel target={{ kind: 'add' }} onClose={onClose} onSaved={vi.fn()} />);
    change('ward-name', 'General Ward');
    fireEvent.click(screen.getByRole('button', { name: 'Add ward' }));

    expect(await screen.findByText(msg)).toBeInTheDocument();
    expect(document.getElementById('ward-name')).toHaveAttribute('aria-invalid', 'true');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('FLAG-072 — edit and delete a ward', () => {
  it('fills the form from the ward and saves with PATCH', async () => {
    dataActionMock.mockResolvedValue(WARD);
    render(<WardSetupPanel target={{ kind: 'edit', id: 'w1', name: 'General Ward' }} onClose={vi.fn()} onSaved={vi.fn()} />);

    await waitFor(() => expect((document.getElementById('ward-name') as HTMLInputElement).value).toBe('General Ward'));
    expect((document.getElementById('ward-total-beds') as HTMLInputElement).value).toBe('6');
    change('ward-total-beds', '8');
    fireEvent.click(screen.getByRole('button', { name: 'Save ward' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalledWith(ENDPOINTS.WARD('w1'), 'PATCH', expect.objectContaining({ total_beds: 8 })));
  });

  it('shows the backend’s refusal when fewer beds would remove an occupied one', async () => {
    const msg = 'Cannot reduce to 2 beds. 4 bed(s) are currently occupied and cannot be removed. Discharge those patients first.';
    dataActionMock.mockRejectedValue(new ClientApiError(400, { error: msg }, msg));
    render(<WardSetupPanel target={{ kind: 'edit', id: 'w1', name: 'General Ward' }} onClose={vi.fn()} onSaved={vi.fn()} />);
    await waitFor(() => expect((document.getElementById('ward-total-beds') as HTMLInputElement).value).toBe('6'));
    change('ward-total-beds', '2');
    fireEvent.click(screen.getByRole('button', { name: 'Save ward' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Confirm removing beds' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Remove 4 beds' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(msg);
  });

  // #187 review: Number('') is 0, so an emptied box went out as total_beds: 0
  // and the backend removed every bed nobody was in.
  it('an emptied bed box is refused, never sent as 0', async () => {
    render(<WardSetupPanel target={{ kind: 'edit', id: 'w1', name: 'General Ward' }} onClose={vi.fn()} onSaved={vi.fn()} />);
    await waitFor(() => expect((document.getElementById('ward-total-beds') as HTMLInputElement).value).toBe('6'));
    change('ward-total-beds', '');
    fireEvent.click(screen.getByRole('button', { name: 'Save ward' }));

    expect(await screen.findByText('Enter a whole number from 0 to 200.')).toBeInTheDocument();
    expect(dataActionMock).not.toHaveBeenCalled();
  });

  it('lowering the bed count asks first, saying how many beds go', async () => {
    dataActionMock.mockResolvedValue(WARD);
    render(<WardSetupPanel target={{ kind: 'edit', id: 'w1', name: 'General Ward' }} onClose={vi.fn()} onSaved={vi.fn()} />);
    await waitFor(() => expect((document.getElementById('ward-total-beds') as HTMLInputElement).value).toBe('6'));
    change('ward-total-beds', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Save ward' }));

    const confirm = screen.getByRole('alertdialog', { name: 'Confirm removing beds' });
    expect(confirm).toHaveTextContent('This removes 1 bed from General Ward, including any that are reserved or under maintenance.');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Keep them' }));
    expect(dataActionMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save ward' }));
    fireEvent.click(within(screen.getByRole('alertdialog', { name: 'Confirm removing beds' })).getByRole('button', { name: 'Remove 1 bed' }));
    await waitFor(() => expect(dataActionMock).toHaveBeenCalledWith(ENDPOINTS.WARD('w1'), 'PATCH', expect.objectContaining({ total_beds: 5 })));
  });

  // #187 review: after a failed load the form still held the PREVIOUS ward,
  // and Save sent its name, type, gender and bed count onto this one.
  it('a ward that fails to load cannot be saved, and never shows the previous ward', async () => {
    const { rerender } = render(<WardSetupPanel target={{ kind: 'edit', id: 'w1', name: 'General Ward' }} onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByDisplayValue('General Ward');

    dataGetMock.mockRejectedValueOnce(new Error('Network down'));
    rerender(<WardSetupPanel target={{ kind: 'edit', id: 'w2', name: 'Children' }} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    expect(screen.queryByDisplayValue('General Ward')).toBeNull();
    const save = screen.getByRole('button', { name: 'Save ward' });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(dataActionMock).not.toHaveBeenCalled();
  });

  it('deletes only after a confirm step, and shows a refusal if a bed is occupied', async () => {
    const msg = 'Cannot delete ward with occupied beds. Discharge all patients first.';
    dataActionMock.mockRejectedValueOnce(new ClientApiError(400, { error: msg }, msg));
    render(<WardSetupPanel target={{ kind: 'edit', id: 'w1', name: 'General Ward' }} onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByDisplayValue('General Ward');

    fireEvent.click(screen.getByRole('button', { name: 'Delete this ward' }));
    expect(dataActionMock).not.toHaveBeenCalled();
    const confirm = screen.getByRole('alertdialog', { name: 'Confirm deleting the ward' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete ward' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalledWith(ENDPOINTS.WARD('w1'), 'DELETE', undefined));
    expect(await screen.findByText(msg)).toBeInTheDocument();
  });

  it('a new ward has no Delete', () => {
    render(<WardSetupPanel target={{ kind: 'add' }} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Delete this ward' })).toBeNull();
  });
});

describe('FLAG-072 — on the Wards & Beds page', () => {
  it('offers Add ward, and Edit on each ward', async () => {
    const user = {
      id: 'oa1', email: 'admin@demo.test', first_name: 'Amaka', last_name: 'Eze',
      role: 'ORGANIZATION_ADMIN', organization_slug: 'demo-clinic',
    } as unknown as User;
    render(<OrgAdminDashboard user={user} initialStats={null} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Wards & Beds' }));

    expect(await screen.findByRole('button', { name: 'Add ward' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit General Ward' }));
    expect(await screen.findByRole('dialog', { name: 'Edit General Ward' })).toBeInTheDocument();
  });
});
