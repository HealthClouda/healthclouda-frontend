import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccessRequestRespond } from './AccessRequestRespond';

/**
 * State-machine tests for the patient access-request respond page (design
 * screens 9–10). All response shapes verified live 2026-07-17 against the
 * seeded local backend @ develop 4356140:
 *
 *   GET 200 → {organization, patient_name, status, expired}
 *   POST 200 → {message}
 *   POST 400 (already responded) → {message: "…already been approved."} ← note
 *     the `message` key (not `error`), which is why the component re-GETs
 *     instead of parsing POST bodies.
 */

let search = '';
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
}));

const pendingInfo = {
  organization: 'Demo Clinic',
  patient_name: 'Chidi Nwosu',
  status: 'PENDING',
  expired: false,
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('AccessRequestRespond', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('renders the pending card from the GET details', async () => {
    search = 'token=t1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes(pendingInfo)));

    render(<AccessRequestRespond />);

    expect(await screen.findByText('Access Request')).toBeInTheDocument();
    expect(screen.getByText('Demo Clinic')).toBeInTheDocument();
    expect(screen.getByText('Chidi Nwosu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve Access' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deny Access' })).toBeInTheDocument();
    // reason/requested_at are backend #71 — absent today, so no Reason row.
    expect(screen.queryByText('Reason')).not.toBeInTheDocument();
  });

  it('renders Reason + Requested rows when the API provides them (backend #71)', async () => {
    search = 'token=t1';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonRes({
          ...pendingInfo,
          reason: 'Referral follow-up',
          requested_at: '2026-07-17T09:42:00Z',
        }),
      ),
    );

    render(<AccessRequestRespond />);

    expect(await screen.findByText('Reason')).toBeInTheDocument();
    expect(screen.getByText('Referral follow-up')).toBeInTheDocument();
    expect(screen.getByText('Requested')).toBeInTheDocument();
  });

  it('maps an already-APPROVED request straight to the Already Approved card', async () => {
    search = 'token=t1';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonRes({ ...pendingInfo, status: 'APPROVED' })),
    );

    render(<AccessRequestRespond />);
    expect(await screen.findByText('Already Approved')).toBeInTheDocument();
  });

  it('maps an expired PENDING request to the Link Expired card', async () => {
    search = 'token=t1';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonRes({ ...pendingInfo, expired: true })),
    );

    render(<AccessRequestRespond />);
    expect(await screen.findByText('Link Expired')).toBeInTheDocument();
  });

  it('shows Invalid Link without calling the API when the token is missing', async () => {
    search = '';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<AccessRequestRespond />);
    expect(await screen.findByText('Invalid Link')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs {token, action:"accept"} on Approve and shows the approved outcome', async () => {
    search = 'token=t1';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes(pendingInfo)) // initial GET
      .mockResolvedValueOnce(jsonRes({ message: 'You have approved access for Demo Clinic.' }));
    vi.stubGlobal('fetch', fetchMock);

    render(<AccessRequestRespond />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve Access' }));

    expect(await screen.findByText('Access Approved')).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toBe('/api/access-request/respond');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      token: 't1',
      action: 'accept',
    });
  });

  it('re-GETs after a rejected POST instead of parsing the message body', async () => {
    search = 'token=t1';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes(pendingInfo)) // initial GET: still pending
      // POST loses the race — someone already denied from another device.
      // Live shape: 400 with a `message` key, NOT `error`.
      .mockResolvedValueOnce(jsonRes({ message: 'This request has already been denied.' }, 400))
      .mockResolvedValueOnce(jsonRes({ ...pendingInfo, status: 'DENIED' })); // re-GET
    vi.stubGlobal('fetch', fetchMock);

    render(<AccessRequestRespond />);
    fireEvent.click(await screen.findByRole('button', { name: 'Deny Access' }));

    expect(await screen.findByText('Already Denied')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('auto-submits when a valid action URL param is present', async () => {
    search = 'token=t1&action=accept';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes(pendingInfo))
      .mockResolvedValueOnce(jsonRes({ message: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    render(<AccessRequestRespond />);

    expect(await screen.findByText('Access Approved')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[1];
    expect((init as RequestInit).method).toBe('POST');
  });

  it('shows the connection-error card with a retry that reloads', async () => {
    search = 'token=t1';
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(jsonRes(pendingInfo));
    vi.stubGlobal('fetch', fetchMock);

    render(<AccessRequestRespond />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try Again' }));

    expect(await screen.findByText('Access Request')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
