import SettingsForm from '@/components/settings/SettingsForm'

export const metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
  return (
    <main style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 12 }}>Settings</h1>
      <p style={{ color: '#555', marginBottom: 20 }}>Configure store preferences and receipt text.</p>
      <SettingsForm />
    </main>
  )
}
