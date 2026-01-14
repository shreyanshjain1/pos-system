import React from 'react'

export default async function SalesHistoryPage({ params }: { params: { plan: string, type: string } }) {
  return (
    <div>
      <h1>Sales history</h1>
      <p>Sales history stub for {params.type}</p>
    </div>
  )
}
