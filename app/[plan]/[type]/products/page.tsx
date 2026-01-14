import React from 'react'

export default async function ProductsPage({ params }: { params: { plan: string, type: string } }) {
  return (
    <div>
      <h1>Products</h1>
      <p>Products list stub for {params.type}</p>
    </div>
  )
}
