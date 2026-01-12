"use client"
import React, { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
	const [storeName, setStoreName] = useState('')
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
		if (!storeName || storeName.trim() === '') {
			setError('Store name is required')
			return
		}
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
						body: JSON.stringify({ user_id: userId, shop_name: storeName.trim() })
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
		<main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
			<form className="form" onSubmit={handleSignup}>
				<div style={{ textAlign: 'center', marginBottom: 8 }}>
					<h2 style={{ margin: 0 }}>Create account</h2>
				</div>

				<div className="flex-column">
					<label>Store name</label>
				</div>
				<div className="inputForm">
					<input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Store name" className="input" />
				</div>

				<div className="flex-column">
					<label>Email</label>
				</div>
				<div className="inputForm">
					<input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className="input" />
				</div>

				<div className="flex-column">
					<label>Password</label>
				</div>
				<div className="inputForm">
					<input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="input" />
				</div>

				<div className="flex-column">
					<label>Confirm password</label>
				</div>
				<div className="inputForm">
					<input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" type="password" className="input" />
				</div>

				{error && <div style={{ color: 'red' }}>{error}</div>}
				{message && <div style={{ color: 'green' }}>{message}</div>}

				<button className="button-submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>

				<p className="p">Already have an account? <span className="span" onClick={() => router.push('/login')} style={{ cursor: 'pointer' }}>Sign In</span></p>

			<style jsx>{`
				.form {
					display: flex;
					flex-direction: column;
					gap: 10px;
					background-color: #ffffff;
					padding: 24px;
					width: min(520px, 95vw);
					max-height: calc(100vh - 48px);
					overflow: auto;
					border-radius: 20px;
					box-shadow: 0 6px 24px rgba(16,24,40,0.08);
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
				}

				::placeholder { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; }

				.form button { align-self: flex-end; }

				.flex-column > label { color: #151717; font-weight: 600; }

				.inputForm { border: 1.5px solid #ecedec; border-radius: 10px; height: 50px; display: flex; align-items: center; padding-left: 10px; transition: 0.2s ease-in-out; }

				.input { margin-left: 10px; border-radius: 10px; border: none; width: 100%; height: 100%; }
				.input:focus { outline: none; }
				.inputForm:focus-within { border: 1.5px solid #2d79f3; }

				.flex-row { display: flex; flex-direction: row; align-items: center; gap: 10px; justify-content: space-between; }
				.flex-row > div > label { font-size: 14px; color: black; font-weight: 400; }

				.span { font-size: 14px; margin-left: 5px; color: #2d79f3; font-weight: 500; cursor: pointer; }

				.button-submit { margin: 20px 0 10px 0; background-color: #151717; border: none; color: white; font-size: 15px; font-weight: 500; border-radius: 10px; height: 50px; width: 100%; cursor: pointer; }

				.p { text-align: center; color: black; font-size: 14px; margin: 5px 0; }

				.btn { margin-top: 10px; width: 100%; height: 50px; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-weight: 500; gap: 10px; border: 1px solid #ededef; background-color: white; cursor: pointer; transition: 0.2s ease-in-out; }
				.btn:hover { border: 1px solid #2d79f3; }

				.google { flex: 1; }
				.apple { flex: 1; }
			`}</style>
			</form>
		</main>
	)
}
