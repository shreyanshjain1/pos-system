"use client"
import React, { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { registerDeviceWithServer } from '@/lib/devices'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginPage() {
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
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [remember, setRemember] = useState(false)
	const router = useRouter()

	async function handleLogin(e?: React.FormEvent) {
		e?.preventDefault()
		setLoading(true)
		setError(null)
		try {
			// signIn with a timeout to avoid UI hanging if network or upstream is unresponsive
			const signInPromise = supabase.auth.signInWithPassword({ email, password })
			const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Sign in request timed out. Check your network.')), 15000))
			const result = await Promise.race([signInPromise, timeout]) as any
			// sign-in result received
			const { data, error } = result || {}
			if (error) throw error

			const accessToken = (data as any)?.session?.access_token
			if (accessToken) {
					// register this client device with the server (non-blocking if it fails)
					try {
						await registerDeviceWithServer(accessToken)
					} catch (e) {
						// non-fatal device registration failure
					}

				let shops: any[] = []
				try {
					const resp = await fetch('/api/user-shops', {
						headers: { Authorization: `Bearer ${accessToken}` }
					})
					if (resp.ok) {
						const payload = await resp.json()
						shops = payload?.data || []
						if (shops.length > 0) {
							try { localStorage.setItem('pos:active-shop', shops[0].id) } catch (e) {}
						} else {
							try { localStorage.removeItem('pos:active-shop') } catch (_) {}
							// no shop -> onboarding
							router.push('/onboard')
							return
						}
					}
				} catch (e) {
					// failed to fetch user shops
				}

				// If user has shops, check BIR acceptance for the active shop
				if (shops.length > 0) {
					try {
						const check = await fetch('/api/check-bir', { headers: { Authorization: `Bearer ${accessToken}` } })
						if (check.ok) {
							const j = await check.json()
							// require both user acceptance and admin approval to go to dashboard
							if (j.accepted && j.approved) {
								router.push('/dashboard')
								return
							} else {
								router.push('/onboarding/bir-accept')
								return
							}
						}
					} catch (e) {
						// failed to check BIR acceptance
					}
				}

			}

			router.push('/pos')
		} catch (err: any) {
				setError(err.message || String(err))
				console.error('Sign-in error:', err)
		} finally {
			setLoading(false)
		}
	}

		// debug helpers removed

	return (
		<main className="min-h-screen flex items-center justify-center py-12 bg-slate-50">
			<div className="w-full max-w-7xl px-6">
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-12">
					{/* Left visual panel */}
					<div className="md:col-span-7 bg-gradient-to-br from-emerald-600 to-emerald-400 text-white p-12 md:p-16 flex flex-col justify-center">
						<div className="max-w-lg">
							<div className="w-16 h-16 rounded-full bg-white/20 mb-6 flex items-center justify-center text-2xl font-bold">B</div>
							<h3 className="text-3xl md:text-4xl font-bold leading-tight mb-4">Welcome back</h3>
							<p className="text-md md:text-lg opacity-90">Manage sales, inventory and reporting with your POS. Please sign in to continue to your dashboard and point-of-sale.</p>
						</div>
					</div>

					{/* Right form panel */}
					<div className="md:col-span-5 p-8 md:p-12 flex items-center">
						<div className="w-full">
							<h2 className="text-2xl md:text-3xl font-semibold mb-1">Sign in</h2>
							<p className="text-sm text-slate-500 mb-6">Sign in to access your POS</p>

							<form className="space-y-5" onSubmit={handleLogin}>
								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
									<Input
										placeholder="Enter your email"
										type="email"
										value={email}
										onChange={e => setEmail(e.target.value)}
										required
										className="bg-slate-50 py-3 text-base"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
									<Input
										placeholder="Enter your password"
										type="password"
										value={password}
										onChange={e => setPassword(e.target.value)}
										required
										className="bg-slate-50 py-3 text-base"
									/>
								</div>

								<div className="flex items-center justify-between">
									<label className="flex items-center gap-3">
										<input id="remember" type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
										<span className="text-sm text-slate-700">Remember me</span>
									</label>
									<button type="button" className="text-indigo-600 hover:underline text-sm" onClick={() => alert('Forgot password flow not implemented')}>Forgot password?</button>
								</div>

								{error && (
									<div className="text-red-600 text-sm">
										<pre className="whitespace-pre-wrap text-xs">{error}</pre>
									</div>
								)}

								<div>
									<Button type="submit" className="w-full h-14 text-base rounded-lg" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</Button>
								</div>

								{/* debug buttons removed */}

								<p className="text-center text-sm text-slate-600">Don't have an account? <button type="button" className="text-indigo-600 font-medium" onClick={() => router.push('/signup')}>Sign up</button></p>
							</form>
						</div>
					</div>
				</div>
			</div>
		</main>
	)
}
