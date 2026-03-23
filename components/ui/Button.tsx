'use client';

import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';
  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    secondary: 'bg-white text-stone-900 border border-stone-300 hover:bg-stone-50 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
  };

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
