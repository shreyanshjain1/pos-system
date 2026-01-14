"use client"
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Modal'}
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-lg"
          >
            {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
            <div>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
