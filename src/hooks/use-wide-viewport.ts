'use client';

import { useEffect, useState } from 'react';

/**
 * Staff dashboards must not mount below this width — FLAG-203.
 * Matches Tailwind's `md` breakpoint, which the design uses for the same split.
 */
export const DASHBOARD_MIN_WIDTH = 768;

/**
 * `unknown` is the server render and the first client paint: nobody has measured
 * a viewport yet. It is deliberately NOT treated as "wide".
 */
export type ViewportGate = 'unknown' | 'narrow' | 'wide';

/**
 * Whether the viewport is wide enough to mount a staff dashboard — FLAG-203.
 *
 * 🔴 **This is a PHI control, not a layout helper.** The previous gate was
 * `hidden md:flex`: pure CSS, so the dashboard still mounted below 768px, still
 * ran every `useApi` call in it, and the patient records still landed in that
 * device's DOM. `display: none` hides pixels, not data. Callers must use this to
 * decide whether to **render** the subtree, never merely to style it.
 *
 * **It fails closed.** Until `matchMedia` has answered, the state is `unknown`
 * and the caller must not mount. That covers the server render, the first client
 * paint, and any environment without `matchMedia` — in every one of those we do
 * not know the viewport, and "don't know" must not resolve to "show the records".
 * The cost is one frame of a neutral placeholder on desktop; FLAG-203 anticipated
 * exactly that trade ("a JS check that accepts a brief flash").
 *
 * ⚠️ **This closes only the client-fetched half of FLAG-203.** Anything the
 * *server* already fetched and passed as props — `initialStats`, the `user`
 * object — is serialized into the HTML before this hook exists, and is
 * byte-identical for a phone and a desktop. That half needs a server-side device
 * hint in the page files; see the flag.
 */
export function useWideViewport(): ViewportGate {
  const [gate, setGate] = useState<ViewportGate>('unknown');

  useEffect(() => {
    // No `matchMedia` (SSR, older jsdom, exotic runtime) → stay `unknown`, which
    // the caller reads as DENY. Guessing "probably desktop" here is the whole bug.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(`(min-width: ${DASHBOARD_MIN_WIDTH}px)`);
    setGate(query.matches ? 'wide' : 'narrow');

    // Resizing across the breakpoint must unmount the dashboard, not just hide
    // it — dragging a window narrow is the same leak as opening it on a phone.
    const onChange = (event: MediaQueryListEvent) => setGate(event.matches ? 'wide' : 'narrow');
    if (typeof query.addEventListener !== 'function') return;
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return gate;
}
