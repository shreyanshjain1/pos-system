"use client"

import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cardVariants } from '@/lib/motion'

export function Card({ children, className = '', hover = true, ...rest }: Omit<HTMLMotionProps<'div'>, 'ref'> & { className?: string; hover?: boolean }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover={hover ? "hover" : undefined}
      variants={cardVariants}
      className={`bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-stone-200 hover:shadow-md transition-shadow ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export default Card
