import React from 'react'

export default async function DashboardPage({ params }: { params: { plan: string, type: string } }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Plan: {params.plan} — Type: {params.type}</p>
      <p>This is a stub dashboard for your POS.</p>
    </div>
  )
}
