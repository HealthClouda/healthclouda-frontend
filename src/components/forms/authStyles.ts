// Shared auth-screen styles (design_handoff_prelogin auth canvas).
// Inputs: 48px tall, 1.5px border, 11px radius, left icon at 13px, Lato 14.5px,
// rest bg #fafbff → focus bg white + border primary + 3px ring rgba(0,117,255,0.09).
export const authInputBase =
  'h-12 w-full rounded-[11px] border-[1.5px] bg-input-bg pl-11 pr-4 font-body text-[14.5px] text-ink outline-none transition-colors placeholder:text-[#9ca3af] focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,117,255,0.09)]';

// Primary button: 48px, primary bg, 11px radius, Inter 15px 600, primary shadow,
// hover darken; disabled = 0.7 opacity + not-allowed.
export const authPrimaryBtn =
  'flex h-12 w-full items-center justify-center rounded-[11px] bg-primary font-heading text-[15px] font-semibold text-white shadow-btn-primary transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-primary';

// Field label: Inter 13px 600, ink-muted #374151.
export const authLabel = 'block font-heading text-[13px] font-semibold text-[#374151]';
