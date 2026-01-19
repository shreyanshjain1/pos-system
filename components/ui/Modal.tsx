"use client"
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { dropdownVariants } from '@/lib/motion'

export default function Modal({ open, onClose, children, title, className }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string; className?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Modal'}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 my-8 max-h-[90vh] overflow-y-auto ${className ?? ''}`}
          >
            {title && <h3 className="text-xl font-bold mb-4 text-stone-900">{title}</h3>}
            <div>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
