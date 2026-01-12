"use client"
import React, { useEffect, useRef, useState } from 'react'

export default function BarcodeScanner({ onDetected, onClose, deviceId, continueScanning = true }: { onDetected: (code: string) => void; onClose: () => void; deviceId?: string; continueScanning?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let detector: any = null
    let mounted = true

    async function start() {
      try {
        if (!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
          setSupported(false)
          return
        }
        const constraints: MediaStreamConstraints = { video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' } }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream

        const BarcodeDetectorClass = (window as any).BarcodeDetector
        if (!BarcodeDetectorClass) {
          setSupported(false)
          return
        }

        detector = new BarcodeDetectorClass({ formats: ['ean_13', 'ean_8', 'qr_code', 'code_128', 'code_39'] })
        setSupported(true)

        const scan = async () => {
          try {
            if (!videoRef.current) return
            const results = await detector.detect(videoRef.current)
            if (results && results.length) {
              const code = results[0].rawValue || results[0].rawData || ''
              if (code) {
                onDetected(String(code))
                if (!continueScanning) return
                // small pause before next scan to avoid duplicates
                await new Promise(res => setTimeout(res, 700))
              }
            }
          } catch (err: any) {
            // ignore detection errors
          }
          rafRef.current = requestAnimationFrame(scan)
        }

        rafRef.current = requestAnimationFrame(scan)
      } catch (err: any) {
        console.error('Barcode scanner error', err)
        setError(err?.message || String(err))
      }
    }

    start()

    return () => {
      mounted = false
      try {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      } catch (_) {}
      try {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      } catch (_) {}
    }
  }, [onDetected])

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: 320, height: 'auto', borderRadius: 6, background: '#000' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13 }}>
          {supported === null && 'Initializing camera…'}
          {supported === false && 'Barcode scanning not supported in this browser. Use a hardware scanner or enter barcode manually.'}
          {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
