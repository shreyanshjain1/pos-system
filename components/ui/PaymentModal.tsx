"use client"
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  amount: string
  title: string
  description?: string
}

export default function PaymentModal({ isOpen, onClose, amount, title, description }: PaymentModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative my-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Header */}
              <div className="mb-4 sm:mb-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-stone-900 text-center mb-2">{title}</h3>
                {description && (
                  <p className="text-xs sm:text-sm text-stone-600 text-center">{description}</p>
                )}
              </div>

              {/* Amount */}
              <div className="bg-stone-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border border-stone-200">
                <p className="text-xs sm:text-sm text-stone-600 text-center mb-1">Total Amount</p>
                <p className="text-2xl sm:text-3xl font-bold text-stone-900 text-center">{amount}</p>
              </div>

              {/* QR Code */}
              <div className="bg-white border-2 border-stone-300 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="aspect-square bg-white rounded-lg flex items-center justify-center mb-3">
                  <img 
                    src="/payment-qr.png" 
                    alt="InstaPay QR Code" 
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <p className="text-xs text-stone-600 text-center font-medium mb-1">
                  Scan with InstaPay
                </p>
                <p className="text-xs text-stone-500 text-center">
                  Use your mobile banking app to scan and pay
                </p>
              </div>

              {/* Payment Instructions */}
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <h4 className="font-semibold text-stone-900 text-sm">Payment Instructions:</h4>
                <ol className="space-y-2 text-sm text-stone-700">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span>Scan the QR code above with your banking app</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span>Complete the payment of <strong>{amount}</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span>Take a screenshot of your payment confirmation</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                    <span>Message us on Facebook with the screenshot to confirm your payment</span>
                  </li>
                </ol>
                
                {title.toLowerCase().includes('supply') && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      <strong>Note:</strong> This is an initial payment estimate. Final amount may vary as product prices can change. We'll confirm the exact total before delivery.
                    </p>
                  </div>
                )}
              </div>

              {/* Facebook Contact Button */}
              <a
                href="https://www.facebook.com/rnlstudio"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 mb-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Message us on Facebook
              </a>

              <button
                onClick={onClose}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
