import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BrandLoader, TRACE } from './BrandLoader';
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

  it('stops the sweep and the heartbeat under prefers-reduced-motion', () => {
    // jsdom does not apply media queries, so pin the rule itself.
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.hc-loader-trace\s*\{[^}]*animation:\s*none/);
    // display:none hides the pulse and its glow, which would otherwise sit frozen.
    expect(reduced).toMatch(/\.hc-loader-trace\s*\{[^}]*display:\s*none/);
    expect(reduced).toMatch(/\.hc-loader-logo\s*\{[^}]*animation:\s*none/);
    expect(reduced).toMatch(/\.hc-loader\s*\{[^}]*animation:\s*none/);
  });

  it('is our real logo, not a drawing of a cloud', () => {
    const { container } = render(<BrandLoader />);
    const logo = container.querySelector('image');
    expect(logo).toHaveAttribute('href', '/assets/images/HealthClouda-icon-tight.png');
    // The pulse and its glow run along the logo's own ECG line, so both sit on top of the image.
    expect(logo!.nextElementSibling).toBe(screen.getByTestId('brand-loader-glow'));
    expect(logo!.nextElementSibling!.nextElementSibling).toBe(screen.getByTestId('brand-loader-trace'));
  });

  it('glows with an SVG filter in the brand colour, not a CSS filter Safari may skip', () => {
    const { container } = render(<BrandLoader />);
    const glow = screen.getByTestId('brand-loader-glow');
    const id = glow.getAttribute('filter')!.match(/^url\(#(.+)\)$/)![1];
    expect(container.querySelector(`filter[id="${id}"] feGaussianBlur`)).not.toBeNull();
    for (const p of [glow, screen.getByTestId('brand-loader-trace')]) expect(p).toHaveAttribute('stroke', 'currentColor');
    expect(container.querySelector('svg')).toHaveClass('text-primary');
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const loaderCss = css.slice(css.indexOf('/* BrandLoader'), css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(loaderCss).not.toMatch(/drop-shadow/);
  });

  it('beats when the middle of the pulse crosses the deep spike and the tall peak', () => {
    // Walk the path: the pulse (0.22 long) sweeps offset 0.22 -> -1 over the first
    // 50% of the cycle, so its middle reaches fraction s at (s + 0.11) / 2.44.
    const pts = TRACE.match(/[MLH][^MLH]+/g)!;
    let [x, y] = [0, 0];
    const xy: [number, number][] = [];
    for (const seg of pts) {
      const n = seg.slice(1).trim().split(/\s+/).map(Number);
      if (seg[0] === 'H') x = n[0]; else [x, y] = n;
      xy.push([x, y]);
    }
    const cum = [0];
    for (let i = 1; i < xy.length; i++) cum.push(cum[i - 1] + Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]));
    const at = (i: number) => ((cum[i] / cum[cum.length - 1] + 0.11) / 2.44) * 100;
    const deepSpike = xy.findIndex(([, py]) => py === Math.max(...xy.map((q) => q[1])));
    const tallPeak = xy.findIndex(([, py]) => py === Math.min(...xy.map((q) => q[1])));

    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const beat = css.match(/@keyframes hc-loader-beat \{([\s\S]*?)\n\}/)![1];
    const peaks = [...beat.matchAll(/(\d+)% \{ transform: scale\(1\.0[5-9]\)/g)].map((m) => Number(m[1]));
    expect(peaks).toHaveLength(2);
    expect(Math.abs(peaks[0] - at(deepSpike))).toBeLessThan(1);
    expect(Math.abs(peaks[1] - at(tallPeak))).toBeLessThan(1);
  });
});

describe('src/app/loading.tsx', () => {
  it('shows the loader while a page loads, over the whole screen', () => {
    const { container } = render(<Loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(container.firstElementChild).toHaveClass('hc-loader-screen');
  });
});
