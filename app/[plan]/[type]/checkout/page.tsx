import React from 'react'

export default async function CheckoutPage({ params }: { params: { plan: string, type: string } }) {
  return (
    <div>
      <h1>Checkout</h1>
      <p>Checkout stub for {params.type}</p>
    </div>
  )
}
