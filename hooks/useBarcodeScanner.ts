import { useEffect, useRef, useState } from 'react'

export type UseBarcodeScannerOptions = {
  minCharInterval?: number // ms, max interval between chars to consider scanner input
  maxCharInterval?: number // ms, gap to reset buffer
  endKey?: 'Enter' | 'Tab'
}

export default function useBarcodeScanner(opts?: UseBarcodeScannerOptions) {
  const minCharInterval = opts?.minCharInterval ?? 30
  const maxCharInterval = opts?.maxCharInterval ?? 100
  const endKey = opts?.endKey ?? 'Enter'

  const bufferRef = useRef('')
  const lastTimeRef = useRef<number | null>(null)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  function resetBuffer() {
    bufferRef.current = ''
    lastTimeRef.current = null
    setIsScanning(false)
  }

  function onKey(e: KeyboardEvent) {
    if (!e.key) return
    const now = Date.now()
    const last = lastTimeRef.current
    const delta = last ? now - last : Infinity

    // ignore modifier keys
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return

    // treat Tab as Enter if configured
    const treatedKey = (e.key === 'Tab' && endKey === 'Enter') ? 'Enter' : e.key

    if (delta > maxCharInterval) {
      // gap too large - assume human typing; reset buffer unless this key is Enter
      if (treatedKey !== 'Enter') {
        bufferRef.current = ''
      }
    }

    // consider scanning when chars come quickly
    if (delta < minCharInterval) setIsScanning(true)

    if (treatedKey === 'Enter') {
      const code = bufferRef.current.trim()
      if (code.length > 0) setLastScan(code)
      resetBuffer()
      return
    }

    // append printable single-character keys
    if (e.key.length === 1) {
      bufferRef.current += e.key
      lastTimeRef.current = now
    }
  }

  function start() {
    window.addEventListener('keydown', onKey)
  }

  function stop() {
    try { window.removeEventListener('keydown', onKey) } catch (_) {}
    resetBuffer()
  }

  useEffect(() => {
    start()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { lastScan, isScanning, start, stop, resetBuffer }
}
