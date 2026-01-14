import React from 'react'
import Layout from '@/components/layout/Layout'

export const metadata = {
  title: 'Dashboard'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout>{children}</Layout>
  )
}
