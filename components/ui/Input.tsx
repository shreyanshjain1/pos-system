import React from 'react'

export default function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${props.className ?? ''}`}
    />
  )
}
