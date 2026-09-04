'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Design: design_handoff_prelogin contact card. The design's fields are
// Full name / Work email / Organisation / message, but the backend contract
// (POST /contact/contact-form/, ContactUsRequest) REQUIRES first_name,
// last_name, email, phone_number, message — so a phone field is added in
// the design's input style, the full name is split client-side, and the
// organisation is prefixed into the message.
const schema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .refine(v => v.trim().split(/\s+/).length >= 2, 'Enter your first and last name'),
  email: z.email({ message: 'Enter a valid email address' }),
  organisation: z.string().min(1, 'Organisation name is required'),
  phone_number: z.string().min(7, 'Phone number is required').max(15, 'Max 15 characters'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(400, 'Message must be under 400 characters'),
});

type FormData = z.infer<typeof schema>;

type Status = 'idle' | 'loading' | 'success' | 'error';

const inputClass = (hasError: boolean) =>
  `h-12 w-full px-4 bg-input-bg border-[1.5px] rounded-[11px] font-body text-sm text-ink outline-none transition-all placeholder:text-gray-400 focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,117,255,0.09)] ${
    hasError ? 'border-red-300 bg-red-50' : 'border-hairline'
  }`;

export function ContactForm() {
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
    const nameParts = data.full_name.trim().split(/\s+/);
    const payload = {
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' '),
      email: data.email,
      phone_number: data.phone_number,
      message: `[${data.organisation}] ${data.message}`.slice(0, 500),
    };
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus('success');
        setStatusMsg("Message sent! We'll get back to you within one business day.");
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3.5">
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div>
          <input {...register('full_name')} type="text" placeholder="Full name" aria-label="Full name" className={inputClass(!!errors.full_name)} />
          {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
        </div>
        <div>
          <input {...register('email')} type="email" placeholder="Work email" aria-label="Work email" className={inputClass(!!errors.email)} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div>
          <input {...register('organisation')} type="text" placeholder="Organisation name" aria-label="Organisation name" className={inputClass(!!errors.organisation)} />
          {errors.organisation && <p className="mt-1 text-xs text-red-600">{errors.organisation.message}</p>}
        </div>
        <div>
          <input {...register('phone_number')} type="tel" placeholder="Phone number" aria-label="Phone number" className={inputClass(!!errors.phone_number)} />
          {errors.phone_number && <p className="mt-1 text-xs text-red-600">{errors.phone_number.message}</p>}
        </div>
      </div>
      <div>
        <textarea
          {...register('message')}
          placeholder="Tell us about your facility — size, locations, what you need…"
          aria-label="Message"
          className={`min-h-[140px] w-full px-4 py-3.5 bg-input-bg border-[1.5px] rounded-[11px] font-body text-sm text-ink outline-none transition-all resize-y placeholder:text-gray-400 focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,117,255,0.09)] ${
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
        className="h-[50px] bg-primary text-white rounded-[11px] font-heading text-[15px] font-semibold shadow-btn-primary hover:bg-primary-dark hover:-translate-y-px transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
