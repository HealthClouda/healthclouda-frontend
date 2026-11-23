'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * If the page has not changed this long after leave(), give the button back.
 * The usual "next page" unmounts the form, so this only fires when navigation
 * lands on the same page: an unknown role sent to /signin, or middleware
 * bouncing a missing session cookie back to this portal's sign-in.
 */
export const LEAVING_RELEASE_MS = 15_000;

/**
 * Keep a form busy after a successful submit until the next page shows.
 * react-hook-form's `isSubmitting` ends when onSubmit returns, which is as soon
 * as router.push() is called, so a successful form looked idle while the next
 * page loaded (w5-b6). Call leave() right before router.push().
 */
export function useLeaving(): [boolean, () => void] {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const leave = useCallback(() => {
    setLeaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLeaving(false), LEAVING_RELEASE_MS);
  }, []);

  return [leaving, leave];
}
