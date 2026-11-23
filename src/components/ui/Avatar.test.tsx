import { describe, it, expect } from 'vitest';
import { AVATAR_COLOURS } from './Avatar';

/**
 * w5-b6 walk (23 Nov): avatars pick a colour from a fixed palette by name.
 * Red was in it, so some organisations and people (Third Clinic, a patient)
 * wore a red circle, which reads as an error or a warning next to a row.
 * Checked by hue, so no shade of red can slip back in (review of #227).
 */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe('Avatar palette', () => {
  it('has no red: red means danger elsewhere in the app', () => {
    const reds = AVATAR_COLOURS.filter((c) => { const h = hue(c); return h < 15 || h > 345; });
    expect(reds).toEqual([]);
  });

  it('the hue check itself catches red (control)', () => {
    expect(hue('#dc2626') < 15 || hue('#dc2626') > 345).toBe(true);
    expect(hue('#ef4444') < 15 || hue('#ef4444') > 345).toBe(true);
  });
});
