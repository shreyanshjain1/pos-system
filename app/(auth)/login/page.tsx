"use client"
import React, { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
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
			const { data, error } = await supabase.auth.signInWithPassword({ email, password })
			if (error) throw error

			const accessToken = (data as any)?.session?.access_token
			if (accessToken) {
				try {
					const resp = await fetch('/api/user-shops', {
						headers: { Authorization: `Bearer ${accessToken}` }
					})
					if (resp.ok) {
						const payload = await resp.json()
						const shops = payload?.data || []
						if (shops.length > 0) {
							try { localStorage.setItem('pos:active-shop', shops[0].id) } catch (e) {}
						} else {
							try { localStorage.removeItem('pos:active-shop') } catch (_) {}
							router.push('/onboard')
							return
						}
					}
				} catch (e) {
					console.warn('Failed to fetch user shops', e)
				}

			}

			router.push('/pos')
		} catch (err: any) {
			setError(err.message || String(err))
		} finally {
			setLoading(false)
		}
	}

	return (
		<main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
			<form className="form" onSubmit={handleLogin}>
				<div className="flex-column">
					<label>Email </label>
				</div>
				<div className="inputForm">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" viewBox="0 0 32 32" height="20"><g data-name="Layer 3" id="Layer_3"><path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z"></path></g></svg>
					<input
						placeholder="Enter your Email"
						className="input"
						type="email"
						value={email}
						onChange={e => setEmail(e.target.value)}
						required
					/>
				</div>

				<div className="flex-column">
					<label>Password </label>
				</div>
				<div className="inputForm">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" viewBox="-64 0 512 512" height="20"><path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0"></path><path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0"></path></svg>
					<input
						placeholder="Enter your Password"
						className="input"
						type="password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						required
					/>
				</div>

				<div className="flex-row">
					<div>
						<input id="remember" type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
						<label style={{ marginLeft: 8 }}>Remember me </label>
					</div>
					<span className="span">Forgot password?</span>
				</div>

				{error && <div style={{ color: 'red' }}>{error}</div>}

				<button className="button-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>

				<p className="p">Don't have an account? <span className="span" onClick={() => router.push('/signup')} style={{ cursor: 'pointer' }}>Sign Up</span></p>
			</form>

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
		</main>
	)
}
