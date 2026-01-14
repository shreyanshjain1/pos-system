"use client"
import React, { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function SignupPage() {
	if (!isSupabaseConfigured) {
		return (
			<main className="min-h-screen flex items-center justify-center py-12">
				<div className="w-full max-w-lg md:max-w-xl px-6">
					<div className="bg-white rounded-2xl shadow-lg p-12 text-center">
						<h2 className="text-2xl font-semibold mb-3">Supabase not configured</h2>
						<p className="text-sm text-slate-600 mb-4">Create a <strong>.env.local</strong> from <strong>.env.local.example</strong> and set your Supabase keys.</p>
					</div>
				</div>
			</main>
		)
	}
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [message, setMessage] = useState<string | null>(null)
	const router = useRouter()

	async function handleSignup(e?: React.FormEvent) {
		e?.preventDefault()
		setError(null)
		setMessage(null)
		if (password !== confirmPassword) {
			setError('Passwords do not match')
			return
		}
		setLoading(true)
		try {
			const { data, error } = await supabase.auth.signUp({ email, password })
			if (error) throw error

			let userId = (data as any)?.user?.id
			let accessToken = (data as any)?.session?.access_token

			if (!accessToken) {
				const signIn = await supabase.auth.signInWithPassword({ email, password })
				if (signIn.error) {
					setMessage('Check your email to confirm your account. After confirmation, sign in.')
				} else {
					userId = (signIn.data as any)?.user?.id || userId
					accessToken = (signIn.data as any)?.session?.access_token || accessToken
				}
			}

			if (userId && accessToken) {
				// Defensive: ensure token is present before calling server
				if (!accessToken || typeof accessToken !== 'string') {
					setMessage('Account created — please sign in to continue.')
					return
				}

				try {
					const resp = await fetch('/api/onboard', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
						body: JSON.stringify({ user_id: userId })
					})
					const payload = await resp.json()
					if (!resp.ok) throw new Error(payload?.error || 'Onboarding failed')

					try { localStorage.setItem('pos:active-shop', payload?.shop?.id) } catch (e) {}
					router.push('/pos')
					return
				} catch (err: any) {
					setError(err?.message || 'Onboarding failed')
					return
				}
			}
		} catch (err: any) {
			setError(err.message || String(err))
		} finally {
			setLoading(false)
		}
	}

	return (
		<main className="min-h-screen flex items-center justify-center py-12 bg-slate-50">
			<div className="w-full max-w-7xl px-6">
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-12">
					{/* Left visual panel */}
					<div className="md:col-span-7 bg-gradient-to-br from-emerald-600 to-emerald-400 text-white p-12 md:p-16 flex flex-col justify-center">
						<div className="max-w-lg">
							<div className="w-16 h-16 rounded-full bg-white/20 mb-6 flex items-center justify-center text-2xl font-bold">B</div>
							<h3 className="text-3xl md:text-4xl font-bold leading-tight mb-4">Create your account</h3>
							<p className="text-md md:text-lg opacity-90">Set up your account to manage sales, inventory and reporting with your POS.</p>
						</div>
					</div>

					{/* Right form panel */}
					<div className="md:col-span-5 p-8 md:p-12 flex items-center">
						<div className="w-full">
							<h2 className="text-2xl md:text-3xl font-semibold mb-1">Create account</h2>
							<p className="text-sm text-slate-500 mb-6">Create an account to get started</p>

							<form className="space-y-5" onSubmit={handleSignup}>
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
									<Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" type="email" required className="bg-slate-50 py-3 text-base" />
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
									<Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter a password" type="password" required className="bg-slate-50 py-3 text-base" />
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">Confirm password</label>
									<Input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" type="password" required className="bg-slate-50 py-3 text-base" />
								</div>

								{error && (
									<div className="text-red-600 text-sm"><pre className="whitespace-pre-wrap text-xs">{error}</pre></div>
								)}
								{message && <div className="text-green-600 text-sm">{message}</div>}

								<div>
									<Button type="submit" className="w-full h-14 text-base rounded-lg" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
								</div>

								<p className="text-center text-sm text-slate-600">Already have an account? <button type="button" className="text-indigo-600 font-medium" onClick={() => router.push('/login')}>Sign in</button></p>
							</form>
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}
