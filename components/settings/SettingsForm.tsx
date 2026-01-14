"use client"
import React, { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

type Settings = {
  storeName: string
  currency: string
  receiptHeader: string
  receiptFooter: string
  autoClosePrint?: boolean
  paperSize?: string
  preferredPrinter?: string
  scannerDeviceId?: string
  scannerMode?: 'keyboard' | 'camera'
  // BIR optional settings
  birEnabled?: boolean
  birTin?: string
  birBusinessAddress?: string
  birPermit?: string
  birPricesIncludeVat?: boolean
  birVatRate?: number
}

const STORAGE_KEY = 'pos:settings'

const DEFAULTS: Settings = {
  storeName: '',
  currency: 'PHP',
  receiptHeader: '',
  // static footer that promotes RNL STUDIO
  receiptFooter: 'Powered by RNL STUDIO — rnlstudio.online',
  autoClosePrint: true,
  paperSize: '80',
  preferredPrinter: '',
  scannerDeviceId: '',
  scannerMode: 'keyboard',
  birEnabled: false,
  birTin: '',
  birBusinessAddress: '',
  birPermit: '',
  birPricesIncludeVat: true,
  birVatRate: 12,
}

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    let mounted = true
    async function load() {
      // try server first
      try {
        const res = await fetchWithAuth('/api/settings')
        if (res.ok) {
          const json = await res.json()
          if (mounted && json?.data) setSettings(prev => ({ ...prev, ...json.data }))
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULTS, ...(json?.data || {}) })) } catch (_) {}
          return
        }
      } catch (_) {}

      // fallback to localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw && mounted) setSettings(JSON.parse(raw))
      } catch (err) {
        // ignore parse errors
      }
    }

    load()
    // hardware scanner only — no camera enumeration
    return () => { mounted = false }
  }, [])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      // persist certain scanner-related settings immediately so changes take effect without needing Save
      if (key === 'scannerMode' || key === 'scannerDeviceId') {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch (_) {}
        try { window.dispatchEvent(new Event('pos:settings:updated')) } catch (_) {}
      }
      return next
    })
  }

  function handleSave(e?: React.FormEvent) {
    e?.preventDefault()
    const payload = settings
    // optimistically save to localStorage
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)) } catch (_) {}
    // broadcast update so other pages reload settings immediately
    try { window.dispatchEvent(new Event('pos:settings:updated')) } catch (_) {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)

    // try server save; ignore failures (keep localStorage)
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          console.warn('Settings save failed', json?.error)
        }
      } catch (err) {
        console.warn('Settings save network error', err)
      }
    })()
  }

  function handleReset() {
    setSettings(DEFAULTS)
    localStorage.removeItem(STORAGE_KEY)
    try { window.dispatchEvent(new Event('pos:settings:updated')) } catch (_) {}
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  return (
    <form onSubmit={handleSave} className="grid gap-4 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <label className="block">
        <div className="text-xs text-gray-700 mb-2">Store name</div>
        <input
          value={settings.storeName}
          onChange={e => update('storeName', e.target.value)}
          placeholder="e.g. Drayley's Store"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white"
        />
      </label>

      <label className="block">
        <div className="text-xs text-slate-700 mb-2">Currency</div>
        <select
          value={settings.currency}
          onChange={e => update('currency', e.target.value)}
          className="w-40 px-3 py-2 rounded-lg border border-gray-200 bg-white"
        >
          <option value="PHP">PHP — Philippine Peso</option>
          <option value="USD">USD — US Dollar</option>
          <option value="EUR">EUR — Euro</option>
        </select>
      </label>

      <label>
        <div className="text-xs text-slate-700 mb-2">Receipt header</div>
        <textarea
          value={settings.receiptHeader}
          onChange={e => update('receiptHeader', e.target.value)}
          placeholder="Optional header printed on receipts"
          className="w-full min-h-[64px] p-2 rounded-lg border border-gray-200 bg-white"
        />
      </label>

      <label>
        <div className="text-xs text-slate-700 mb-2">Receipt footer (static)</div>
        <div className="w-full min-h-[64px] p-3 rounded-lg border border-gray-200 bg-gray-50">
          <strong>Powered by RNL STUDIO</strong>
          <div className="mt-2 text-sm">rnlstudio.online</div>
        </div>
      </label>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={!!settings.autoClosePrint}
          onChange={e => update('autoClosePrint', e.target.checked)}
          className="h-4 w-4"
        />
        <div className="text-sm text-gray-700">Auto-close print window after printing</div>
      </label>

      <label className="block">
        <div className="text-xs text-slate-700 mb-2">Printer paper size</div>
        <select
          value={settings.paperSize}
          onChange={e => update('paperSize', e.target.value)}
          className="w-40 px-3 py-2 rounded-lg border border-gray-200 bg-white"
        >
          <option value="80">80mm (standard)</option>
          <option value="58">58mm (narrow)</option>
        </select>
      </label>

      <label className="block">
        <div className="text-xs text-slate-700 mb-2">Preferred printer (optional)</div>
        <input
          value={settings.preferredPrinter || ''}
          onChange={e => update('preferredPrinter', e.target.value)}
          placeholder="Printer name (for reference)"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white"
        />
        <div className="text-xs text-gray-500 mt-2">Note: the browser print dialog controls the actual printer selection. This field is saved for convenience.</div>
      </label>

      <label className="block">
        <div className="text-xs text-gray-700 mb-2">Barcode scanner</div>
        <div className="text-sm text-slate-600">Using hardware scanners (keyboard input) only. Hardware scanners emulate a keyboard and type into the focused input.</div>
        <div className="flex gap-3 mt-3 items-center">
          <label className="flex items-center gap-2">
            <input type="radio" name="scannerMode" checked={settings.scannerMode === 'keyboard'} onChange={() => update('scannerMode', 'keyboard')} className="h-4 w-4" />
            <div className="text-sm">Hardware (keyboard)</div>
          </label>
        </div>
      </label>

      <div className="border-t border-gray-200 pt-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={!!settings.birEnabled} onChange={e => update('birEnabled', e.target.checked)} className="h-4 w-4" />
          <div className="text-sm font-semibold">Enable BIR / Official Receipt format (optional)</div>
        </label>

        {settings.birEnabled && (
            <div className="grid gap-3 mt-3">
            <label>
              <div className="text-xs text-gray-700 mb-1">Business TIN</div>
              <input value={settings.birTin || ''} onChange={e => update('birTin', e.target.value)} placeholder="123-456-789-000" className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white" />
            </label>

            <label>
              <div className="text-xs text-gray-700 mb-1">Business Address</div>
              <input value={settings.birBusinessAddress || ''} onChange={e => update('birBusinessAddress', e.target.value)} placeholder="Street, City, Postal" className="w-full px-3 py-2 rounded-md border border-gray-200" />
            </label>

            <label>
              <div className="text-xs text-gray-700 mb-1">Permit / Accreditation (optional)</div>
              <input value={settings.birPermit || ''} onChange={e => update('birPermit', e.target.value)} placeholder="Permit no / Accreditation" className="w-full px-3 py-2 rounded-md border border-gray-200" />
            </label>

            <label className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={!!settings.birPricesIncludeVat} onChange={e => update('birPricesIncludeVat', e.target.checked)} className="h-4 w-4" />
                <div className="text-sm">Prices include VAT</div>
              </div>

              <div>
                <div className="text-xs text-slate-700 mb-1">VAT rate (%)</div>
                  <input type="number" value={settings.birVatRate as number || 12} onChange={e => update('birVatRate', Number(e.target.value || 12))} className="w-24 px-2 py-1 rounded-lg border border-gray-200 bg-white" />
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4 items-center">
        <button type="submit" className="px-4 py-2 rounded-full bg-emerald-600 text-white">Save</button>
        <button type="button" onClick={handleReset} className="px-3 py-2 rounded-lg border">Reset</button>
        {saved && <div className="text-sm text-emerald-600">Saved</div>}
      </div>
    </form>
  )
}
