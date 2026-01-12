import React from 'react'

type Props = {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export default function Button({ children, onClick, className = '', disabled = false }: Props) {
  return (
    <button onClick={onClick} className={`btn ${className}`} disabled={disabled}>
      {children}
    </button>
  )
}
