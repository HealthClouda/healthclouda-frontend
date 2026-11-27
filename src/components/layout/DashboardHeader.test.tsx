import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardHeader } from './DashboardHeader';
import type { User } from '@/types/auth';

const user = { id: 'u1', first_name: 'Sade', last_name: 'A', role: 'SUPERADMIN' } as unknown as User;

describe('w5-b6 group 4a — notifications dropdown', () => {
  it('closes on Escape and gives focus back to the bell', () => {
    render(<DashboardHeader user={user} pageTitle="Dashboard" onMenuClick={vi.fn()} />);
    const bell = screen.getByRole('button', { name: '0 unread notifications' });
    fireEvent.click(bell);
    bell.focus();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    fireEvent.keyDown(bell, { key: 'Escape' });
    expect(screen.queryByText('Notifications')).toBeNull();
    expect(bell).toHaveFocus();
  });

  it('an Escape meant for something else does not close it or steal focus', () => {
    render(<><DashboardHeader user={user} pageTitle="Dashboard" onMenuClick={vi.fn()} /><button>Elsewhere</button></>);
    fireEvent.click(screen.getByRole('button', { name: '0 unread notifications' }));
    const other = screen.getByRole('button', { name: 'Elsewhere' });
    fireEvent.keyDown(other, { key: 'Escape' });
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('closes when focus leaves the bell and its dropdown', () => {
    render(<><DashboardHeader user={user} pageTitle="Dashboard" onMenuClick={vi.fn()} /><button>Elsewhere</button></>);
    const bell = screen.getByRole('button', { name: '0 unread notifications' });
    fireEvent.click(bell);
    fireEvent.blur(bell, { relatedTarget: screen.getByRole('button', { name: 'Elsewhere' }) });
    expect(screen.queryByText('Notifications')).toBeNull();
  });
});
