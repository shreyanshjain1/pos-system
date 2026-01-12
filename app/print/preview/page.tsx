import ReceiptPreview from '../../../components/print/ReceiptPreview'
import ThermalReceipt from '../../../components/print/ThermalReceipt'

const SAMPLE = {
  id: 'SAMPLE123',
  created_at: new Date().toISOString(),
  items: [
    { name: 'Coca-Cola 500ml', qty: 2, price: 18 },
    { name: 'Banana Pie', qty: 1, price: 45 },
    { name: 'Coffee Black', qty: 1, price: 35 },
  ],
  total: 18 * 2 + 45 + 35,
  payment: 200,
  change: 200 - (18 * 2 + 45 + 35),
}

export default function PrintPreviewPage() {
  return (
    <main style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1>Receipt Print Preview</h1>
      <p style={{ color: '#555' }}>This shows how the receipt will look on a thermal printer. Use the Print button to open the print dialog.</p>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div>
          <ReceiptPreview
            storeName={'Drayley\'s Store'}
            header={'123 Main St.\nCity'}
            footer={'Thank you for your purchase!'}
            items={SAMPLE.items}
            total={SAMPLE.total}
            payment={SAMPLE.payment}
            change={SAMPLE.change}
            currency={'PHP'}
          />
        </div>

        <div>
          <ThermalReceipt sale={SAMPLE} />
        </div>
      </div>
    </main>
  )
}
