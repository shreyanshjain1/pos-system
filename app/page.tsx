import Link from 'next/link'
import Button from '@/components/ui/Button'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.fullPage}>
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <div className={styles.authLinks}>
            <Link href="/login" className={styles.signInLink}>Sign in</Link>
          </div>
          <div>
            <div className={`${styles.eyebrow} ${styles.reveal} ${styles['delay-1']}`}>New • Fast setup</div>
            <h1 className={`${styles.title} ${styles.reveal} ${styles['delay-2']}`}>Sell faster. Delight customers. Grow your shop.</h1>
            <p className={`${styles.subtitle} ${styles.reveal} ${styles['delay-3']}`}>A modern, lightweight point-of-sale built for small shops — lightning-fast checkout, receipts, inventory, and intuitive hardware support.</p>

            <div className={`${styles.ctaGroup} ${styles.reveal} ${styles['delay-2']}`}>
              <Link href="/signup">
                <Button className={`cta-primary ${styles.ctaButtonPrimary} ${styles.ctaPulse}`}>Get started — free</Button>
              </Link>

              <Link href="/demo">
                <Button className={`cta-secondary ${styles.ctaButtonSecondary}`}>Try demo</Button>
              </Link>
            </div>

            <div className={`${styles.featureGrid} ${styles.reveal} ${styles['delay-3']}`}>
              <div className={styles.featureCard}>
                <h3>Fast Checkout</h3>
                <p>Minimal UI optimized for speed — supports keyboard scanners and thermal printing.</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Inventory</h3>
                <p>Simple product management, categories, and quick search.</p>
              </div>
              <div className={styles.featureCard}>
                <h3>Secure Multi-Store</h3>
                <p>Shop-scoped data and permissions — keep stores isolated and safe.</p>
              </div>
            </div>
          </div>

          <div className={styles.previewWrapper}>
            <div className="" style={{position:'relative'}}>
              <div className={styles.blob} aria-hidden="true" />
              <div className={`${styles.previewCard} ${styles.previewFloat} ${styles.reveal} ${styles['delay-2']}`}>
              <div className={styles.previewHeader}>
                <div>
                  <p style={{opacity:0.9,margin:0}}>Checkout preview</p>
                  <p style={{fontSize:22,fontWeight:700,margin:4}}>Quick sale • £12.50</p>
                </div>
                <div style={{textAlign:'right'}}>
                  <p style={{opacity:0.85,margin:0,fontSize:12}}>Receipt</p>
                  <p style={{margin:0,fontWeight:600,fontSize:13}}>Thermal • A7</p>
                </div>
              </div>

              <div className={styles.previewItem}>
                <div className={styles.previewRow}><span>Blue T-shirt</span><span>£8.00</span></div>
                <div className={styles.previewRow}><span>Plastic Bag</span><span>£0.50</span></div>
                <div style={{borderTop:'1px solid rgba(255,255,255,0.2)',marginTop:12,paddingTop:10,display:'flex',justifyContent:'space-between',fontWeight:700}}>
                  <span>Total</span>
                  <span>£12.50</span>
                </div>
              </div>
              </div>
            </div>

            <div style={{marginTop:12,color:'var(--muted)'}}>No hardware? No problem — try the demo to experience the flow.</div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 style={{margin:0,fontSize:24,fontWeight:700,color:'var(--brand)'}}>Built for small shops</h2>
          <div style={{height:14}} />
          <div className={styles.sectionGrid}>
            <div className={styles.sectionCard}>
              <h4 style={{margin:0,marginBottom:8}}>Simple pricing</h4>
              <p style={{margin:0,color:'var(--muted)'}}>Transparent, affordable plans — start free and scale as you grow.</p>
            </div>
            <div className={styles.sectionCard}>
              <h4 style={{margin:0,marginBottom:8}}>Fast onboarding</h4>
              <p style={{margin:0,color:'var(--muted)'}}>Get up and running in minutes with guided setup and demo data.</p>
            </div>
            <div className={styles.sectionCard}>
              <h4 style={{margin:0,marginBottom:8}}>Reliable support</h4>
              <p style={{margin:0,color:'var(--muted)'}}>We're here to help with setup, hardware, and migration.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
