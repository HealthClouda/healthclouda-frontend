import '@testing-library/jest-dom';

/**
 * jsdom implements no `window.matchMedia`, and FLAG-203's viewport gate fails
 * closed without it — so every dashboard test would render the small-screen
 * notice instead of the dashboard and assert against an empty shell.
 *
 * Default to a **desktop** viewport, which is what those tests have always
 * implicitly assumed. Tests that exercise the gate itself replace this.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: true, // `(min-width: 768px)` → wide
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
