import React from 'react'
import AuthGate from '@/components/auth/AuthGate'
import Layout from '@/components/layout/Layout'

export const metadata = {
  title: 'Dashboard'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Layout>{children}</Layout>
    </AuthGate>
  )
}
