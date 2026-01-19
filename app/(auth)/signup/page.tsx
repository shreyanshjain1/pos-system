"use client"
import React, { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { motion } from 'framer-motion'
import { pageVariants, transitions } from '@/lib/motion'

export default function SignupPage() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [message, setMessage] = useState<string | null>(null)
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
			const signResp = await supabase.auth.signUp({ email, password })
			const data = (signResp as unknown as { data?: unknown })?.data
			const errorObj = (signResp as unknown as { error?: unknown })?.error
			if (errorObj) throw errorObj as Error

			let userId = (data as unknown as { user?: { id?: string } })?.user?.id
			let accessToken = (data as unknown as { session?: { access_token?: string } })?.session?.access_token

			if (!accessToken) {
				const signIn = await supabase.auth.signInWithPassword({ email, password })
				const signInError = (signIn as unknown as { error?: unknown })?.error
				const signInData = (signIn as unknown as { data?: unknown })?.data
				if (signInError) {
					setMessage('Check your email to confirm your account. After confirmation, sign in.')
				} else {
					userId = (signInData as unknown as { user?: { id?: string } })?.user?.id || userId
					accessToken = (signInData as unknown as { session?: { access_token?: string } })?.session?.access_token || accessToken
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
					const payload = await resp.json().catch(() => ({} as Record<string, unknown>))
					if (!resp.ok) throw new Error((payload as unknown as { error?: string })?.error || 'Onboarding failed')

					try { localStorage.setItem('pos:active-shop', (payload as unknown as { shop?: { id?: string } })?.shop?.id ?? '') } catch (e) {}
					router.push('/pos')
					return
				} catch (err: unknown) {
					const msg = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message?: string }).message) : String(err)
					setError(msg || 'Onboarding failed')
					return
				}
			}
		} catch (err: unknown) {
			const msg = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message?: string }).message) : String(err)
			setError(msg || String(err))
		} finally {
			setLoading(false)
		}
	}

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
								<h3 className="text-4xl font-bold leading-tight mb-4">Create your account</h3>
								<p className="text-lg opacity-90">Set up your account to manage sales, inventory and reporting with your POS.</p>
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
							<h2 className="text-3xl font-bold mb-2 text-stone-900">Create account</h2>
							<p className="text-sm text-stone-500 mb-8">Get started with RNL POS</p>

							<form className="space-y-5" onSubmit={handleSignup}>
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.1 }}
								>
									<label className="block text-sm font-medium text-stone-900 mb-2">Email</label>
									<Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" required className="bg-stone-50 py-3 text-base" />
								</motion.div>

								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.15 }}
								>
									<label className="block text-sm font-medium text-stone-900 mb-2">Password</label>
									<Input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" required className="bg-stone-50 py-3 text-base" />
								</motion.div>

								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.2 }}
								>
									<label className="block text-sm font-medium text-stone-900 mb-2">Confirm password</label>
									<Input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" type="password" required className="bg-stone-50 py-3 text-base" />
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
								{message && (
									<motion.div 
										className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm"
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
									>
										{message}
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
												Creating account…
											</span>
										) : 'Create account'}
									</Button>
								</motion.div>

								<motion.p 
									className="text-center text-sm text-stone-600"
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.3 }}
								>
									Already have an account? <motion.button 
										type="button" 
										className="text-emerald-600 font-medium hover:text-emerald-700" 
										onClick={() => router.push('/login')}
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
									>Sign in</motion.button>
								</motion.p>
							</form>
						</div>
					</motion.div>
				</div>
			</motion.div>
		</main>
	)
}
