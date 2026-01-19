"use client"
import React, { useEffect, useRef, useState } from 'react'

export default function CameraScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose?: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const detectorRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true
    async function start() {
      setError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!mounted) return
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }

        // try BarcodeDetector if available
        const BarcodeDetector = (window as any).BarcodeDetector || (window as any).BarcodeDetector
        if (BarcodeDetector) {
          try {
            detectorRef.current = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] })
            setScanning(true)
            requestAnimationFrame(scanLoop)
          } catch (e) {
            // fall back to video-based manual scanning UI
            setError('Camera scanner not available')
          }
        } else {
          setError('Camera barcode detection not supported in this browser')
        }
      } catch (e: unknown) {
        setError('Unable to access camera')
      }
    }

    let raf = 0
    async function scanLoop() {
      try {
        if (!videoRef.current || !detectorRef.current) return
        const video = videoRef.current
        const bitmap = await createImageBitmap(video as any)
        const results = await detectorRef.current.detect(bitmap)
        if (results && results.length > 0) {
          const code = results[0].rawValue
          if (code) {
            onDetected(code)
            // stop stream
            try { const s = (videoRef.current?.srcObject as MediaStream); s?.getTracks().forEach(t => t.stop()) } catch (_) {}
            setScanning(false)
            if (onClose) onClose()
            return
          }
        }
      } catch (_) {}
      raf = requestAnimationFrame(scanLoop)
    }

    start()
    return () => {
      mounted = false
      try { if (videoRef.current) { const s = videoRef.current.srcObject as MediaStream | null; s?.getTracks().forEach(t => t.stop()) } } catch (_) {}
      try { cancelAnimationFrame(raf) } catch (_) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full h-64 bg-black rounded-md overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <div className="flex gap-2">
        <button className="btn" onClick={() => {
          try { if (videoRef.current) { const s = videoRef.current.srcObject as MediaStream | null; s?.getTracks().forEach(t => t.stop()) } } catch (_) {}
          if (onClose) onClose()
        }}>Close</button>
      </div>
    </div>
  )
}
