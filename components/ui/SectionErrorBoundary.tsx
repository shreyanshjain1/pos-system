'use client'

import React from 'react'
import ErrorBoundary from './ErrorBoundary'

interface SectionErrorBoundaryProps {
  children: React.ReactNode
  section?: string
}

/**
 * Wraps a section of the page with error boundary
 * Shows error without taking down entire page
 */
export default function SectionErrorBoundary({ children, section = 'Section' }: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="component"
      fallback={(error, reset) => (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex gap-3">
            <div className="flex-shrink-0 text-red-600">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">{section} Error</h3>
              <p className="mt-1 text-sm text-red-700">{error.message}</p>
              <button
                onClick={reset}
                className="mt-3 inline-flex text-sm font-medium text-red-700 hover:text-red-600 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}
