"use client"
import React, { useRef } from 'react'

type SaleItem = {
  id?: string
  name: string
  qty: number
  price: number
}

type Sale = {
  id?: string
  created_at?: string
  items: SaleItem[]
  total: number
  payment?: number
  change?: number
  cashier?: string
}

function formatCurrency(amount: number, currency = 'PHP') {
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount)
  } catch (e) {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem('pos:settings')
    if (!raw) return { storeName: '', receiptHeader: '', receiptFooter: '', currency: 'PHP', autoClosePrint: true, paperSize: '80' }
    const parsed = JSON.parse(raw)
    return {
      storeName: parsed.storeName || '',
      receiptHeader: parsed.receiptHeader || '',
      receiptFooter: parsed.receiptFooter || '',
      currency: parsed.currency || 'PHP',
      autoClosePrint: parsed.autoClosePrint !== false,
      paperSize: parsed.paperSize || '80',
      // BIR-related settings
      birEnabled: parsed.birEnabled || false,
      birTin: parsed.birTin || '',
      birBusinessAddress: parsed.birBusinessAddress || '',
      birPermit: parsed.birPermit || '',
      birPricesIncludeVat: parsed.birPricesIncludeVat !== false,
      birVatRate: parsed.birVatRate || 12,
    }
  } catch (e) {
    return { storeName: '', receiptHeader: '', receiptFooter: '', currency: 'PHP', autoClosePrint: true, paperSize: '80', birEnabled: false, birTin: '', birBusinessAddress: '', birPermit: '', birPricesIncludeVat: true, birVatRate: 12 }
  }
}

export default function ThermalReceipt({ sale }: { sale: Sale }) {
  const ref = useRef<HTMLDivElement | null>(null)
  // Ensure server-side default includes the same shape as client settings
  const settings = typeof window !== 'undefined' ? loadSettings() : { storeName: '', receiptHeader: '', receiptFooter: '', currency: 'PHP', autoClosePrint: true, paperSize: '80' }

  const paperWidth = (settings.paperSize === '58') ? 200 : 280
  const css = `
    @page { size: auto; margin: 0; }
    @media print { body { -webkit-print-color-adjust: exact; } }
    body { font-family: monospace, "Courier New", monospace; margin:0; padding:4px; color:#000 }
    .receipt { width: ${paperWidth}px; max-width: 100%; }
    .center { text-align:center }
    .item { display:flex; justify-content:space-between; margin:2px 0; font-size:11px }
    .name { width:62%; overflow:hidden; white-space:nowrap; text-overflow:ellipsis }
    .price { width:38%; text-align:right }
    .hr { border-top:1px solid #000; margin:6px 0 }
    .small { font-size:10px }
    .bold { font-weight:700 }
  `

  function buildHtml() {
    const header = settings.storeName || ''
    const created = sale.created_at ? new Date(sale.created_at).toLocaleString() : new Date().toLocaleString()
    const currency = settings.currency || 'PHP'

    const saleIdShort = sale.id ? String(sale.id).slice(0, 12) : ''

    // Build items HTML
    const itemsHtml = sale.items.map(it => {
      const lineTotal = it.qty * it.price
      return `<div class="item"><div class="name">${escapeHtml(it.name)} ${escapeHtml('(' + it.qty + '×)')}</div><div class="price">${escapeHtml(formatCurrency(lineTotal, currency))}</div></div>`
    }).join('\n')

    // If BIR mode enabled, show BIR-style receipt with VAT breakdown
    if (settings.birEnabled) {
      const vatRate = Number(settings.birVatRate) || 12
      const pricesIncludeVat = !!settings.birPricesIncludeVat
      const total = Number(sale.total || 0)
      let vatAmount = 0
      let vatBase = total
      if (pricesIncludeVat) {
        vatAmount = +(total * (vatRate / (100 + vatRate)))
        vatBase = +(total - vatAmount)
      } else {
        vatAmount = +(total * (vatRate / 100))
        vatBase = total
      }

      return `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Official Receipt</title>
          <style>${css}</style>
        </head>
        <body>
          <div class="receipt">
            <div class="center bold" style="font-size:14px">OFFICIAL RECEIPT</div>
            <div class="center bold" style="font-size:13px">${escapeHtml(header)}</div>
            ${settings.birTin ? `<div class="center small">TIN: ${escapeHtml(settings.birTin)}</div>` : ''}
            ${settings.birBusinessAddress ? `<div class="center small">${escapeHtml(settings.birBusinessAddress)}</div>` : ''}
            ${settings.birPermit ? `<div class="center small">Permit: ${escapeHtml(settings.birPermit)}</div>` : ''}
            <div class="hr"></div>
            <div class="small">Date: ${escapeHtml(created)}</div>
            ${saleIdShort ? `<div class="small">OR #: ${escapeHtml(saleIdShort)}</div>` : ''}
            <div class="hr"></div>
            ${itemsHtml}
            <div class="hr"></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:11px"><div>VATable Sales</div><div>${escapeHtml(formatCurrency(vatBase, currency))}</div></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:11px"><div>VAT ${vatRate}%</div><div>${escapeHtml(formatCurrency(vatAmount, currency))}</div></div>
            <div style="display:flex;justify-content:space-between;font-weight:800;font-size:12px;margin-top:4px"><div>Total</div><div>${escapeHtml(formatCurrency(total, currency))}</div></div>
            ${sale.payment !== undefined ? `<div style="display:flex;justify-content:space-between;font-size:11px"><div>Payment</div><div>${escapeHtml(formatCurrency(sale.payment, currency))}</div></div>` : ''}
            ${sale.change !== undefined ? `<div style="display:flex;justify-content:space-between;font-size:11px"><div>Change</div><div>${escapeHtml(formatCurrency(sale.change, currency))}</div></div>` : ''}
            <div class="hr"></div>
            <div class="center small">This serves as an official receipt for the transaction.</div>
            ${settings.receiptFooter ? `<div class="center small">${escapeHtml(settings.receiptFooter)}</div>` : ''}
          </div>
        </body>
      </html>
      `
    }

    // Default (non-BIR) receipt
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Receipt</title>
          <style>${css}</style>
        </head>
        <body>
          <div class="receipt">
            <div class="center bold" style="font-size:13px">${escapeHtml(header)}</div>
            ${settings.receiptHeader ? `<div class="center small">${escapeHtml(settings.receiptHeader)}</div>` : ''}
            <div class="hr"></div>
            <div class="small">${escapeHtml(created)}</div>
            ${saleIdShort ? `<div class="small">Sale #${escapeHtml(saleIdShort)}</div>` : ''}
            <div class="hr"></div>
            ${itemsHtml}
            <div class="hr"></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:12px;margin-top:4px"><div>Total</div><div>${escapeHtml(formatCurrency(sale.total, currency))}</div></div>
            ${sale.payment !== undefined ? `<div style="display:flex;justify-content:space-between;font-size:11px"><div>Payment</div><div>${escapeHtml(formatCurrency(sale.payment, currency))}</div></div>` : ''}
            ${sale.change !== undefined ? `<div style="display:flex;justify-content:space-between;font-size:11px"><div>Change</div><div>${escapeHtml(formatCurrency(sale.change, currency))}</div></div>` : ''}
            <div class="hr"></div>
            ${settings.receiptFooter ? `<div class="center small">${escapeHtml(settings.receiptFooter)}</div>` : ''}
          </div>
        </body>
      </html>
    `
  }

  function escapeHtml(str: unknown) {
    if (str === null || str === undefined) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function handlePrint() {
    if (typeof window === 'undefined') return
    const html = buildHtml()
    const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0')
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
    // Give browser a moment to render then print
    setTimeout(() => {
      w.focus()
      w.print()
      // optionally auto-close the print window for kiosk/thermal setups
      try {
        const autoClose = !!settings.autoClosePrint
        if (autoClose) {
          setTimeout(() => {
            try { w.close() } catch (e) { /* ignore */ }
          }, 600)
        }
      } catch (err) {
        // ignore
      }
    }, 300)
  }

  return (
    <div>
      <div ref={ref} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handlePrint} style={{ padding: '8px 12px' }}>Print receipt</button>
      </div>
    </div>
  )
}
