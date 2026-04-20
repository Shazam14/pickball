import Link from 'next/link'
import Nav from '@/components/Nav'
import styles from './page.module.css'

export default function Home() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>10 Courts Available Now</div>
          <h1>
            <span className={styles.line1}>Book Your</span>
            <span className={styles.line2}>Court</span>
            <span className={styles.line3}>Cebu City, Cebu</span>
          </h1>
          <p className={styles.heroDesc}>
            Philippines&apos; premier SideOut facility. 10 professional courts,
            real-time availability, instant booking. Play today.
          </p>
          <div className={styles.heroBtns}>
            <Link href="/booking" className="btn-primary">Reserve a Court</Link>
            <Link href="#how-it-works" className="btn-outline">How It Works</Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <div className={styles.statNum}>10</div>
          <div className={styles.statLabel}>Pro Courts</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statNum}>₱500</div>
          <div className={styles.statLabel}>Per Hour</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statNum}>6AM</div>
          <div className={styles.statLabel}>Opens Daily</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statNum}>10PM</div>
          <div className={styles.statLabel}>Last Session</div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>— Simple Process</div>
          <div className={styles.sectionTitle}>How It Works</div>
          <div className={styles.stepsGrid}>
            {[
              { num: '01', title: 'Pick a Date & Court', desc: 'Choose your preferred date, duration and court from real-time availability.' },
              { num: '02', title: 'Lock Your Slot', desc: 'Hit Confirm & Pay — your court is held for 5 minutes while you complete payment.' },
              { num: '03', title: 'Pay via GCash / Maya / BPI', desc: 'Scan the QR code or bank transfer. Enter your reference number to confirm.' },
              { num: '04', title: 'Get Confirmation', desc: 'Receive SMS and email confirmation instantly. Show up and play!' },
            ].map(step => (
              <div key={step.num} className={styles.stepCard}>
                <div className={styles.stepNum}>{step.num}</div>
                <div className={styles.stepTitle}>{step.title}</div>
                <div className={styles.stepDesc}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className={styles.section} id="pricing">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>— Transparent Pricing</div>
          <div className={styles.sectionTitle}>Rates</div>
          <div className={styles.pricingGrid}>
            {[
              { duration: '1 Hour', price: '₱500', tag: null },
              { duration: '2 Hours', price: '₱1,000', tag: 'POPULAR' },
              { duration: '3 Hours', price: '₱1,500', tag: null },
            ].map(p => (
              <div key={p.duration} className={`${styles.priceCard} ${p.tag ? styles.priceCardFeatured : ''}`}>
                {p.tag && <div className={styles.priceTag}>{p.tag}</div>}
                <div className={styles.priceDuration}>{p.duration}</div>
                <div className={styles.priceAmount}>{p.price}</div>
                <div className={styles.pricePer}>per court</div>
                <Link href="/booking" className="btn-primary" style={{ clipPath: 'none', width: '100%', textAlign: 'center', marginTop: 16, display: 'block' }}>
                  Book Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaContent}>
          <div className={styles.ctaTitle}>Ready to Play?</div>
          <div className={styles.ctaSub}>Check real-time availability and book your court in under 2 minutes.</div>
          <Link href="/booking" className="btn-primary" style={{ fontSize: 18, padding: '16px 48px' }}>
            Book a Court Now
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div>
          <div className={styles.footerLogo}>SideOut</div>
          <div className={styles.footerSub}>Cebu City, Cebu, Philippines</div>
        </div>
        <div className={styles.footerText}>
          For inquiries: <span>+63 9XX XXX XXXX</span> · Open daily 6AM–10PM
        </div>
      </footer>
    </>
  )
}
