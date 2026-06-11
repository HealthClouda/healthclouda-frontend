'use client';

import Image from 'next/image';

const CARDS = [
  {
    title: 'Drink More Water',
    img: '/assets/images/P-1.png',
    body: 'Your brain runs on water. Keep a reusable bottle with you and aim for 8 glasses daily.',
  },
  {
    title: 'Mental Health is Health',
    img: '/assets/images/P-2.png',
    body: 'Listen to your emotions. If you\'re constantly tired or demotivated, reach out — early support is free.',
  },
  {
    title: 'Wash & Protect',
    img: '/assets/images/P-3.png',
    body: 'Frequent handwashing reduces infections. Carry sanitizer and mask up if you feel unwell.',
  },
  {
    title: 'Eat Real Food',
    img: '/assets/images/P-4.png',
    body: 'Good care needs good fuel. Choose whole foods over processed snacks — your body and mind will thank you.',
  },
  {
    title: 'Morning Light Matters',
    img: '/assets/images/P-5.png',
    body: '10 minutes of morning sunlight boosts energy and focus. It helps your body produce serotonin for a happier mood.',
  },
  {
    title: 'Rest Well',
    img: '/assets/images/P-6.png',
    body: 'Quality rest helps your immune system and focus. Aim for 7–8 hours — rest is part of progress.',
  },
];

// Duplicate cards for seamless infinite loop
const DOUBLED = [...CARDS, ...CARDS];

export function WellbeingCarousel() {
  return (
    <div className="overflow-hidden py-2">
      <div
        className="flex gap-5"
        style={{
          animation: 'carousel-scroll 32s linear infinite',
          width: `${DOUBLED.length * (260 + 20)}px`,
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused')}
        onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.animationPlayState = 'running')}
      >
        {DOUBLED.map((card, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[260px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative h-40 bg-gradient-to-br from-blue-50 to-indigo-50">
              <Image
                src={card.img}
                alt={card.title}
                fill
                className="object-cover"
                sizes="260px"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{card.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{card.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}