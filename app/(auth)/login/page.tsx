"use client"
import React, { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { registerDeviceWithServer } from '@/lib/devices'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { pageVariants, transitions } from '@/lib/motion'

export default function LoginPage() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [remember, setRemember] = useState(false)
	const router = useRouter()
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

	async function handleLogin(e?: React.FormEvent) {
		e?.preventDefault()
		setLoading(true)
		setError(null)
		try {
			// signIn with a timeout to avoid UI hanging if network or upstream is unresponsive
			const signInPromise = supabase.auth.signInWithPassword({ email, password })
			const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Sign in request timed out. Check your network.')), 15000))
			const result = await Promise.race([signInPromise, timeout]) as unknown
			// sign-in result received
			const data = (result as { data?: unknown })?.data
			const errorObj = (result as { error?: unknown })?.error
			if (errorObj) throw errorObj as Error

			const accessToken = (data as unknown as { session?: { access_token?: string } })?.session?.access_token
			if (accessToken) {
				// Persist session for server-side guards: tell server to set an HttpOnly cookie
				try {
					await fetch('/api/auth/set-session', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ accessToken })
					})
				} catch (e) {
					// non-fatal
				}
					// register this client device with the server (non-blocking if it fails)
					try {
						await registerDeviceWithServer(accessToken)
					} catch (e) {
						// non-fatal device registration failure
					}

				let shops: Record<string, unknown>[] = []
				try {
					const resp = await fetch('/api/user-shops', {
						headers: { Authorization: `Bearer ${accessToken}` }
					})
					if (resp.ok) {
						const payload = await resp.json()
						shops = (payload?.data as unknown as Record<string, unknown>[]) || []
						if (shops.length > 0) {
							try { localStorage.setItem('pos:active-shop', (shops[0]?.id as string | undefined) ?? '') } catch (e) {}
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

								// If user has shops, try auto-claiming the device for the active shop if needed
								try {
									const activeShopId = (shops[0]?.id as string | undefined) ?? ''
									if (activeShopId) {
										try {
											const myDevice = await (await import('@/lib/devices')).getOrCreateDeviceId()
											if (myDevice) {
												await fetch('/api/shops/auto-claim', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ shop_id: activeShopId, device_id: myDevice }) }).catch(() => {})
											}
										} catch (e) {}
									}
								} catch (e) {}

								// If user has shops, check BIR acceptance for the active shop
				if (shops.length > 0) {
					// Returning user: go straight to dashboard
					try { localStorage.setItem('pos:active-shop', (shops[0]?.id as string | undefined) ?? '') } catch (e) {}
					router.push('/dashboard')
					return
				}

			}

			// If no shops found, send to onboard (handled earlier), otherwise default to dashboard
			router.push('/dashboard')
		} catch (err: unknown) {
								const msg = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message?: string }).message) : String(err)
								setError(msg)
								console.error('Sign-in error:', err)
		} finally {
			setLoading(false)
		}
	}

		// debug helpers removed

	return (
		<main className="min-h-screen flex items-center justify-center py-12 bg-stone-50">
			<motion.div 
				className="w-full max-w-7xl px-6"
				variants={pageVariants}
				initial="hidden"
				animate="visible"
			>
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-12">
					{/* Left visual panel */}
					<motion.div 
						className="md:col-span-7 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-12 md:p-16 flex flex-col justify-center"
						initial={{ opacity: 0, x: -40 }}
						animate={{ opacity: 1, x: 0 }}
						transition={transitions.standard}
					>
						<div className="max-w-lg space-y-6">
							<motion.div 
								className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold"
								whileHover={{ scale: 1.05 }}
							>
								R
							</motion.div>
							<div>
								<h3 className="text-4xl font-bold leading-tight mb-4">Welcome back</h3>
								<p className="text-lg opacity-90">Manage sales, inventory and reporting with your POS. Sign in to access your dashboard.</p>
							</div>
						</div>
					</motion.div>

					{/* Right form panel */}
					<motion.div 
						className="md:col-span-5 p-8 md:p-12 flex items-center"
						initial={{ opacity: 0, x: 40 }}
						animate={{ opacity: 1, x: 0 }}
						transition={transitions.standard}
					>
						<div className="w-full">
							<h2 className="text-3xl font-bold mb-2 text-stone-900">Sign in</h2>
							<p className="text-sm text-stone-500 mb-8">Access your POS system</p>

							<form className="space-y-5" onSubmit={handleLogin}>
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.1 }}
								>
									<label className="block text-sm font-medium text-stone-900 mb-2">Email</label>
									<Input
										placeholder="you@example.com"
										type="email"
										value={email}
										onChange={e => setEmail(e.target.value)}
										required
										className="bg-stone-50 py-3 text-base"
									/>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.15 }}
								>
									<label className="block text-sm font-medium text-stone-900 mb-2">Password</label>
									<Input
										placeholder="••••••••"
										type="password"
										value={password}
										onChange={e => setPassword(e.target.value)}
										required
										className="bg-stone-50 py-3 text-base"
									/>
								</motion.div>

								<motion.div 
									className="flex items-center justify-between"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.2 }}
								>
									<label className="flex items-center gap-2">
										<input id="remember" type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-emerald-600" />
										<span className="text-sm text-stone-700">Remember me</span>
									</label>
									<button type="button" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium" onClick={() => alert('Forgot password flow not implemented')}>Forgot password?</button>
								</motion.div>

								{error && (
									<motion.div 
										className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm"
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
									>
										<pre className="whitespace-pre-wrap text-xs">{error}</pre>
									</motion.div>
								)}

								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.25 }}
								>
									<Button type="submit" className="w-full h-12 text-base rounded-xl font-medium" disabled={loading}>
										{loading ? (
											<span className="flex items-center justify-center gap-2">
												<svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
													<circle cx="12" cy="12" r="10" strokeWidth="2" opacity="0.25" fill="none" />
													<path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
												</svg>
												Signing in…
											</span>
										) : 'Sign In'}
									</Button>
								</motion.div>

								<motion.p 
									className="text-center text-sm text-stone-600"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.3 }}
								>
									Don&apos;t have an account? <motion.button 
										type="button" 
										className="text-emerald-600 font-medium hover:text-emerald-700" 
										onClick={() => router.push('/signup')}
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
									>Sign up</motion.button>
								</motion.p>
							</form>
						</div>
					</motion.div>
				</div>
			</motion.div>
		</main>
	)
}
