import React from 'react'

export function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`card p-4 ${className}`} style={style}>{children}</div>
  )
}

export default Card
