"use client"

import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = Omit<HTMLMotionProps<'button'>, 'ref'> & { variant?: Variant; intent?: Variant; className?: string }

export default function Button({
  children,
  variant = 'primary',
  intent,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-xl font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
  const sizes = 'h-10 px-4 text-sm'

  const variants: Record<Variant, string> = {
    primary: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-95',
    secondary: 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }

  const chosen = intent ?? variant

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`${base} ${sizes} ${variants[chosen]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
