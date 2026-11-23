import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLeaving, LEAVING_RELEASE_MS } from './use-leaving';

/**
 * Review of #226: a form that marks itself busy until the next page loads must
 * never stay busy for good. If the "next page" is the same page (an unknown
 * role sent back to /signin, or middleware bouncing a missing cookie back to
 * the portal's own sign-in), the form never unmounts. The button must come back.
 */
afterEach(() => vi.useRealTimers());

describe('useLeaving', () => {
  it('is busy after leave(), and releases itself if the page never changes', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLeaving());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => { vi.advanceTimersByTime(LEAVING_RELEASE_MS - 1); });
    expect(result.current[0]).toBe(true);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current[0]).toBe(false);
  });

  it('does not touch state after the form is gone', () => {
    vi.useFakeTimers();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useLeaving());
    act(() => result.current[1]());
    unmount();
    act(() => { vi.advanceTimersByTime(LEAVING_RELEASE_MS); });
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
