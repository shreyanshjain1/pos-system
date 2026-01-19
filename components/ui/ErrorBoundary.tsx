'use client'

import React, { ReactNode, ReactElement } from 'react'
import Card from './Card'
import Button from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactElement
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  level?: 'page' | 'component'
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    })

    // Log to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call optional error handler (e.g., for error reporting)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError)
      }

      // Default error UI
      const level = this.props.level || 'page'
      const isPage = level === 'page'

      return (
        <div className={isPage ? 'min-h-screen flex items-center justify-center bg-gray-50 p-6' : 'p-6'}>
          <Card className={isPage ? 'max-w-2xl w-full' : ''}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4v2m0 4v2M6.343 3.665c-.464-.885-.464-1.449 0-1.449.464 0 .464.564 0 1.449m11.314 0c.464-.885.464-1.449 0-1.449-.464 0-.464.564 0 1.449m0 12c.464.885.464 1.449 0 1.449-.464 0-.464-.564 0-1.449m-11.314 0c-.464.885-.464 1.449 0 1.449.464 0 .464-.564 0-1.449"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
                <p className="mt-2 text-sm text-gray-600">
                  {isPage
                    ? 'An unexpected error occurred while loading this page. Please try refreshing or contact support if the problem persists.'
                    : 'An unexpected error occurred in this component. Please try again.'}
                </p>

                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 p-4 bg-gray-100 rounded-lg text-sm font-mono text-red-600 overflow-auto max-h-48">
                    <summary className="cursor-pointer font-bold text-gray-700 mb-2">Error Details (Dev Only)</summary>
                    <div>
                      <div className="mb-2">
                        <strong>Error:</strong>
                        <pre className="whitespace-pre-wrap break-words">{this.state.error.toString()}</pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Stack:</strong>
                          <pre className="whitespace-pre-wrap break-words text-xs">{this.state.errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="mt-6 flex gap-3">
                  <Button onClick={this.resetError}>Try Again</Button>
                  {isPage && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        window.location.href = '/dashboard'
                      }}
                    >
                      Go to Dashboard
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
