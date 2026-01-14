import SettingsForm from '@/components/settings/SettingsForm'

export const metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500">Configure store preferences and receipt text.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SettingsForm />
        </div>

        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-2">Receipt Preview</h3>
            <div className="text-sm text-slate-600">Preview and quick actions for printing can go here.</div>
          </div>
        </div>
      </div>
    </main>
  )
}
