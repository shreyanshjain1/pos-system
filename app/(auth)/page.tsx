import Link from 'next/link'

export default function Home() {
	return (
		<div className="main-content">
			<div className="container" style={{ paddingTop: 80, paddingBottom: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<div style={{ maxWidth: 720, width: '100%' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
						<h1 style={{ fontSize: 28, margin: 0 }}>Store POS</h1>
					</div>

					<div className="card">
						<h2 style={{ marginTop: 0 }}>Welcome</h2>
						<p className="muted">Lightweight point-of-sale for small shops — sign in to connect your store or try the read-only demo.</p>
						<div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
							<Link className="btn" href="/login">Sign In</Link>
							<Link className="btn secondary" href="/demo">Demo Test</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
