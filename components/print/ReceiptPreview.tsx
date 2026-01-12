"use client"
import React from 'react'

type Item = { name: string; qty: number; price: number }

function formatCurrency(amount: number, currency = 'PHP') {
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount)
  } catch (e) {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export default function ReceiptPreview({
  storeName = 'Store',
  header = '',
  footer = '',
  items = [],
  total = 0,
  payment,
  change,
  currency = 'PHP',
}: {
  storeName?: string
  header?: string
  footer?: string
  items?: Item[]
  total?: number
  payment?: number
  change?: number
  currency?: string
}) {
  return (
    <div style={{ fontFamily: 'monospace', width: 260, padding: 8, background: '#fff', color: '#000' }}>
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{storeName}</div>
      {header && <div style={{ textAlign: 'center', fontSize: 11, color: '#444', whiteSpace: 'pre-wrap' }}>{header}</div>}
      <div style={{ height: 6 }} />
      <div style={{ borderTop: '1px solid #222', margin: '6px 0' }} />

      <div style={{ fontSize: 10, color: '#222', marginBottom: 6 }}>{new Date().toLocaleString()}</div>

      <div>
        {items.map((it, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0', fontSize: 11 }}>
            <div style={{ width: '62%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
            <div style={{ width: '38%', textAlign: 'right' }}>{it.qty} × {formatCurrency(it.price, currency)}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #222', margin: '6px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12 }}>
        <div>Total</div>
        <div>{formatCurrency(total, currency)}</div>
      </div>
      {payment !== undefined && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <div>Payment</div>
          <div>{formatCurrency(payment, currency)}</div>
        </div>
      )}
      {change !== undefined && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <div>Change</div>
          <div>{formatCurrency(change, currency)}</div>
        </div>
      )}

      <div style={{ borderTop: '1px solid #222', margin: '6px 0' }} />
      {footer && <div style={{ textAlign: 'center', fontSize: 11, color: '#444', whiteSpace: 'pre-wrap' }}>{footer}</div>}
    </div>
  )
}
