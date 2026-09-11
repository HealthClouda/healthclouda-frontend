'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

// Design: design_handoff_prelogin org landing — "Your Wellbeing Matters..."
// carousel. Card copy is final (lifted from the design's data). Cards are
// doubled for a seamless infinite loop; auto-scrolls at 0.7px/frame and
// pauses on hover. (Design's arrow buttons dropped — Bastoh, 2026-07-13.)
const CARDS = [
  {
    img: '/assets/images/P-1.png',
    title: 'Stay Hydrated',
    body: 'Proper hydration supports focus, recovery, and overall health. Keep water accessible throughout your day.',
  },
  {
    img: '/assets/images/P-2.png',
    title: 'Prioritize Mental Wellness',
    body: 'Stress affects everyone. Take breaks, talk to someone, and remember that seeking support is a sign of strength.',
  },
  {
    img: '/assets/images/P-3.png',
    title: 'Practice Hand Hygiene',
    body: 'Regular handwashing is the simplest way to prevent infection. Use soap and water for at least 20 seconds.',
  },
  {
    img: '/assets/images/P-4.png',
    title: 'Move Your Body',
    body: 'Even short walks between tasks boost circulation and reduce fatigue. Aim for at least 30 minutes of activity daily.',
  },
  {
    img: '/assets/images/P-5.png',
    title: 'Get Quality Sleep',
    body: 'Rest is essential for immunity and performance. Maintain a consistent sleep schedule and aim for 7–8 hours.',
  },
  {
    img: '/assets/images/P-6.png',
    title: 'Nourish Your Body',
    body: 'Balanced meals fuel your day. Prioritize whole foods, fruits, and vegetables over processed alternatives.',
  },
];

const DOUBLED = [...CARDS, ...CARDS];
const SPEED = 0.7; // px per frame, per the design prototype

export function WellbeingCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const paused = useRef(false);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      const t = trackRef.current;
      if (t && !paused.current) {
        offset.current += SPEED;
        const card = t.children[0] as HTMLElement | undefined;
        if (card) {
          const gap = parseFloat(getComputedStyle(t).gap) || 24;
          const loopAt = (card.offsetWidth + gap) * CARDS.length;
          if (offset.current >= loopAt) offset.current -= loopAt;
        }
        t.style.transform = `translateX(-${offset.current}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden pt-2 pb-6"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
    >
      <div ref={trackRef} className="flex gap-6 w-max will-change-transform">
        {DOUBLED.map((card, i) => (
          <div
            key={i}
            className="w-[300px] flex-shrink-0 flex flex-col gap-2 bg-white rounded-[20px] border border-hairline shadow-[0_2px_8px_rgba(0,0,0,0.07)] p-5 transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,117,255,0.12)]"
          >
            <Image
              src={card.img}
              alt={card.title}
              width={260}
              height={180}
              className="w-full h-[180px] object-cover rounded-xl bg-chip"
            />
            <h6 className="font-heading text-base font-bold text-ink mt-2">{card.title}</h6>
            <p className="font-body text-sm text-gray-500 leading-[1.55]">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
