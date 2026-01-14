"use client"
"use client"
import React from 'react'
import { motion } from 'framer-motion'

export function Card({ children, className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export default Card
