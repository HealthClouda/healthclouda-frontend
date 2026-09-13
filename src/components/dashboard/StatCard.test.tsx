import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StatCard } from './StatCard';

const icon = <svg data-testid="icon" />;

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Episodes" value={12} icon={icon} />);
    expect(screen.getByText('Episodes')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders — when value is undefined', () => {
    render(<StatCard label="Referrals" icon={icon} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows shimmer skeleton when loading=true and hides value', () => {
    const { container } = render(<StatCard label="Test" value={5} icon={icon} loading />);
    expect(screen.queryByText('5')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders delta text when provided', () => {
    render(<StatCard label="Appts" value={8} icon={icon} delta="+2 this week" deltaPositive />);
    expect(screen.getByText('+2 this week')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handler = vi.fn();
    render(<StatCard label="Click me" value={1} icon={icon} onClick={handler} />);
    await userEvent.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders as a div when onClick is not provided', () => {
    render(<StatCard label="No click" value={3} icon={icon} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});