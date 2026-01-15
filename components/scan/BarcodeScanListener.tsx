import React, { useEffect } from 'react'
import useBarcodeScanner from '../../hooks/useBarcodeScanner'

type Props = {
  onScan: (code: string) => void
  enabled?: boolean
  endKey?: 'Enter' | 'Tab'
}

export default function BarcodeScanListener({ onScan, enabled = true, endKey = 'Enter' }: Props) {
  const { lastScan, isScanning } = useBarcodeScanner({ endKey })

  useEffect(() => {
    if (!enabled) return
    if (!lastScan) return
    onScan(lastScan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastScan, enabled])

  return (
    <div aria-hidden style={{ position: 'absolute', left: -9999, width: 0, height: 0 }}>
      <input autoComplete="off" tabIndex={-1} />
      {/* visual indicator for debug when enabled */}
      {enabled && <div style={{display: 'none'}} data-scan-active={isScanning} />}
    </div>
  )
}
