"use client"

import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { buttonVariants } from '@/lib/motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = Omit<HTMLMotionProps<'button'>, 'ref'> & { variant?: Variant; intent?: Variant; className?: string; size?: 'sm' | 'md' | 'lg' }

export default function Button({
  children,
  variant = 'primary',
  intent,
  className = '',
  size = 'md',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-xl font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors'
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base'
  }

  const variants: Record<Variant, string> = {
    primary: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
    secondary: 'bg-white text-stone-900 border border-stone-300 hover:bg-stone-50 shadow-sm',
    ghost: 'bg-transparent text-stone-700 hover:bg-stone-100',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  }

  const chosen = intent ?? variant

  return (
    <motion.button
      whileHover="hover"
      whileTap="tap"
      variants={buttonVariants}
      className={`${base} ${sizes[size]} ${variants[chosen]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
