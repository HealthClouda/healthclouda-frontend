'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * `false` in the server render and during hydration, `true` once React is
 * running in the browser — FLAG-057.
 *
 * Auth forms keep their submit button disabled until this is `true`. Before
 * hydration a click (or Enter) is handled by the browser itself, which submits
 * the form natively; the forms also declare `method="post"` so that even then
 * no field reaches the URL, but a disabled button stops the native submit
 * outright.
 *
 * `useSyncExternalStore` rather than `useEffect` + `useState`: the server
 * snapshot is used during hydration and the client snapshot afterwards, with
 * no extra effect-driven render and no hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
