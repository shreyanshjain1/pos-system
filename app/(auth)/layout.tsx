import React from 'react'

export const metadata = {
  title: 'Auth'
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Blank layout for auth / landing pages — no sidebar/topbar
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </main>
  )
}
