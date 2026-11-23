import { describe, it, expect } from 'vitest';
import { AVATAR_COLOURS } from './Avatar';

/**
 * w5-b6 walk (23 Nov): avatars pick a colour from a fixed palette by name.
 * Red was in it, so some organisations and people (Third Clinic, a patient)
 * wore a red circle, which reads as an error or a warning next to a row.
 */
describe('Avatar palette', () => {
  it('has no red: red means danger elsewhere in the app', () => {
    expect(AVATAR_COLOURS.map((c) => c.toLowerCase())).not.toContain('#dc2626');
  });
});
