'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Design: design_handoff_prelogin org landing — "Message the Health Centre"
// card. Backend contract (verified live 2026-07-13): POST /org/<slug>/contact/
// with {name, email, phone, message} — ALL required (OrgContactCreateRequest).
// Goes to the org's inbox, not HealthClouda (README decision 4).
const schema = z.object({
  name: z.string().min(1, 'Full name is required').max(200, 'Max 200 characters'),
  email: z.email({ message: 'Enter a valid email address' }),
  phone: z.string().min(7, 'Phone number is required').max(20, 'Max 20 characters'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be under 1000 characters'),
});

type FormData = z.infer<typeof schema>;

type Status = 'idle' | 'loading' | 'success' | 'error';

const inputClass = (hasError: boolean) =>
  `h-12 w-full px-4 bg-input-bg border-[1.5px] rounded-[11px] font-body text-[14.5px] text-ink outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,117,255,0.09)] ${
    hasError ? 'border-red-300 bg-red-50' : 'border-hairline'
  }`;

export function OrgContactForm({ slug }: { slug: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setStatus('loading');
    setStatusMsg('');
    try {
      const res = await fetch(`/api/contact/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setStatus('success');
        setStatusMsg('Message sent to the Health Centre — they will get back to you.');
        reset();
        setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 5000);
      } else {
        const body = await res.json().catch(() => ({}));
        setStatus('error');
        setStatusMsg(body?.detail ?? body?.error ?? 'Something went wrong. Please try again.');
        setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 4000);
      }
    } catch {
      setStatus('error');
      setStatusMsg('Network error. Please check your connection and try again.');
      setTimeout(() => { setStatus('idle'); setStatusMsg(''); }, 4000);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div>
        <input {...register('name')} type="text" placeholder="Full Name*" aria-label="Full Name" className={inputClass(!!errors.name)} />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <input {...register('email')} type="email" placeholder="Your Email*" aria-label="Your Email" className={inputClass(!!errors.email)} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <input {...register('phone')} type="tel" placeholder="Phone Number*" aria-label="Phone Number" className={inputClass(!!errors.phone)} />
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
      </div>
      <div>
        <textarea
          {...register('message')}
          placeholder="Message*"
          aria-label="Message"
          className={`h-[140px] w-full px-4 py-3 bg-input-bg border-[1.5px] rounded-[11px] font-body text-[14.5px] text-ink outline-none transition-all resize-y placeholder:text-gray-400 focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,117,255,0.09)] ${
            errors.message ? 'border-red-300 bg-red-50' : 'border-hairline'
          }`}
        />
        {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>}
      </div>

      {statusMsg && (
        <div
          role="status"
          className={`px-4 py-3 rounded-[11px] text-sm font-medium ${
            status === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {statusMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="h-12 w-full bg-primary text-white rounded-[11px] font-heading text-[15px] font-semibold shadow-btn-primary hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Sending…' : 'Submit'}
      </button>
    </form>
  );
}
