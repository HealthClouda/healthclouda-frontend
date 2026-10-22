import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BrandLoader } from './BrandLoader';
import Loading from '@/app/loading';

describe('BrandLoader (stand-up w2-k3)', () => {
  it('announces itself as a status, with "Loading…" by default', () => {
    render(<BrandLoader />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('takes a label that says what is loading', () => {
    render(<BrandLoader label="Loading dashboard" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard');
  });

  it('is silent to a screen reader when decorative, so visible text is not read twice', () => {
    const { container } = render(<BrandLoader decorative label="Should not be read" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Should not be read')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws the sweep on a path measured in fractions of the line', () => {
    render(<BrandLoader />);
    const trace = screen.getByTestId('brand-loader-trace');
    // The sweep's dash numbers in globals.css assume pathLength=1.
    expect(trace).toHaveAttribute('pathLength', '1');
    expect(trace).toHaveClass('hc-loader-trace');
  });

  it('stops the sweep under prefers-reduced-motion', () => {
    // jsdom does not apply media queries, so pin the rule itself.
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.hc-loader-trace\s*\{[^}]*animation:\s*none/);
    expect(reduced).toMatch(/\.hc-loader\s*\{[^}]*animation:\s*none/);
  });
});

describe('src/app/loading.tsx', () => {
  it('shows the loader while a page loads', () => {
    render(<Loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});
