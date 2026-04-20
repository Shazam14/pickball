import Link from 'next/link'
import Image from 'next/image'
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
          <Image
            src="/logo-white.png"
            alt="SideOut Pickleball"
            width={320}
            height={120}
            className={styles.heroLogo}
            priority
          />
          <h1 className={styles.heroTitle}>
            Cebu&apos;s Premier<br />
            <span className={styles.heroGreen}>Pickleball</span> Courts
          </h1>
          <p className={styles.heroDesc}>
            10 professional courts · Open 24/7 · Instant booking
          </p>
          <div className={styles.heroBtns}>
            <Link href="/booking" className="btn-primary" style={{ fontSize: 18, padding: '16px 48px' }}>
              Reserve a Court
            </Link>
            <Link href="#facilities" className="btn-outline">
              Our Facilities
            </Link>
          </div>
        </div>
      </section>

      {/* INFO STRIP */}
      <div className={styles.infoStrip}>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>📍</span>
          <span>Brgy Alang-Alang, Mandaue City, Cebu 6014</span>
        </div>
        <div className={styles.infoDivider} />
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>🕐</span>
          <span>Open 24/7</span>
        </div>
        <div className={styles.infoDivider} />
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>💰</span>
          <span>₱700/hr · ₱50 entrance per head</span>
        </div>
      </div>

      {/* FACILITIES */}
      <section className={styles.section} id="facilities">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>— What We Offer</div>
          <div className={styles.sectionTitle}>Facilities</div>
          <div className={styles.facilitiesGrid}>
            <div className={styles.facilityCard}>
              <div className={styles.facilityIcon}>🏓</div>
              <div className={styles.facilityName}>Courts</div>
              <div className={styles.facilityDesc}>10 professional-grade pickleball courts with proper lighting for day and night play.</div>
            </div>
            <div className={styles.facilityCard}>
              <div className={styles.facilityIcon}>🚻</div>
              <div className={styles.facilityName}>Restrooms</div>
              <div className={styles.facilityDesc}>Clean, well-maintained comfort rooms available for all players and guests.</div>
            </div>
            <div className={styles.facilityCard}>
              <div className={styles.facilityIcon}>☕</div>
              <div className={styles.facilityName}>Café</div>
              <div className={styles.facilityDesc}>On-site café serving refreshments, snacks, and drinks to keep you energized.</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>— Simple Process</div>
          <div className={styles.sectionTitle}>How It Works</div>
          <div className={styles.stepsGrid}>
            {[
              { num: '01', title: 'Pick a Date', desc: 'Choose your preferred date from the calendar.' },
              { num: '02', title: 'Select a Court', desc: 'Pick from 10 available courts based on real-time availability.' },
              { num: '03', title: 'Choose Your Time', desc: 'Select your time slot — green is available, yellow is limited, red is fully booked.' },
              { num: '04', title: 'Pay & Confirm', desc: 'Pay via GCash, Maya, or GoTyme bank transfer. Get instant confirmation.' },
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
          <div className={styles.pricingCards}>
            <div className={styles.priceCard}>
              <div className={styles.priceIcon}>🏓</div>
              <div className={styles.priceName}>Court Rental</div>
              <div className={styles.priceAmount}>₱700</div>
              <div className={styles.pricePer}>per hour</div>
            </div>
            <div className={`${styles.priceCard} ${styles.priceCardFeatured}`}>
              <div className={styles.priceIcon}>🎫</div>
              <div className={styles.priceName}>Entrance Fee</div>
              <div className={styles.priceAmount}>₱50</div>
              <div className={styles.pricePer}>per person</div>
            </div>
          </div>
          <div className={styles.paymentMethods}>
            <div className={styles.paymentLabel}>Accepted Payments</div>
            <div className={styles.paymentIcons}>
              <span className={styles.paymentBadge}>GCash</span>
              <span className={styles.paymentBadge}>Maya</span>
              <span className={styles.paymentBadge}>GoTyme</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaContent}>
          <div className={styles.ctaTitle}>Ready to Play?</div>
          <div className={styles.ctaSub}>Check real-time availability and book your court in under 2 minutes.</div>
          <Link href="/booking" className="btn-primary" style={{ fontSize: 18, padding: '16px 48px' }}>
            Reserve a Court Now
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <Image src="/logo-white.png" alt="SideOut Pickleball" width={140} height={52} />
          <div className={styles.footerAddress}>Brgy Alang-Alang, Mandaue City, Cebu 6014</div>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.footerText}>Open 24/7</div>
          <div className={styles.footerText}>GCash · Maya · GoTyme</div>
        </div>
      </footer>
    </>
  )
}
