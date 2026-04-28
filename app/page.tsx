import Link from 'next/link'
import Nav from '@/components/Nav'
import Image from 'next/image'
import styles from './page.module.css'

function HeroGraphic() {
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="220" cy="200" r="168" stroke="rgba(34,197,94,0.07)" strokeWidth="1"/>
      <circle cx="220" cy="200" r="135" stroke="rgba(34,197,94,0.05)" strokeWidth="1"/>
      <g transform="rotate(-40 157 200)">
        <rect x="107" y="58" width="100" height="125" rx="15" fill="#22c55e"/>
        <circle cx="133" cy="84" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="157" cy="84" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="181" cy="84" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="133" cy="110" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="157" cy="110" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="181" cy="110" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="133" cy="136" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="157" cy="136" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="181" cy="136" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="133" cy="162" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="157" cy="162" r="7.5" fill="#000" opacity="0.45"/>
        <circle cx="181" cy="162" r="7.5" fill="#000" opacity="0.45"/>
        <rect x="132" y="183" width="50" height="100" rx="13" fill="#111"/>
        <rect x="132" y="193" width="50" height="5" rx="1" fill="#2a2a2a"/>
        <rect x="132" y="206" width="50" height="5" rx="1" fill="#2a2a2a"/>
        <rect x="132" y="219" width="50" height="5" rx="1" fill="#2a2a2a"/>
        <rect x="132" y="232" width="50" height="5" rx="1" fill="#2a2a2a"/>
        <rect x="132" y="245" width="50" height="5" rx="1" fill="#2a2a2a"/>
        <rect x="132" y="258" width="50" height="5" rx="1" fill="#2a2a2a"/>
      </g>
      <circle cx="242" cy="207" r="104" fill="#22c55e"/>
      <circle cx="210" cy="175" r="12" fill="#000" opacity="0.5"/>
      <circle cx="247" cy="162" r="12" fill="#000" opacity="0.5"/>
      <circle cx="282" cy="178" r="12" fill="#000" opacity="0.5"/>
      <circle cx="302" cy="212" r="12" fill="#000" opacity="0.5"/>
      <circle cx="284" cy="247" r="12" fill="#000" opacity="0.5"/>
      <circle cx="249" cy="261" r="12" fill="#000" opacity="0.5"/>
      <circle cx="214" cy="247" r="12" fill="#000" opacity="0.5"/>
      <circle cx="195" cy="213" r="12" fill="#000" opacity="0.5"/>
      <circle cx="228" cy="194" r="9" fill="#000" opacity="0.3"/>
      <circle cx="255" cy="192" r="9" fill="#000" opacity="0.3"/>
      <circle cx="267" cy="218" r="9" fill="#000" opacity="0.3"/>
      <circle cx="250" cy="240" r="9" fill="#000" opacity="0.3"/>
      <circle cx="222" cy="240" r="9" fill="#000" opacity="0.3"/>
      <circle cx="212" cy="216" r="9" fill="#000" opacity="0.3"/>
    </svg>
  )
}

function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 2a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="10" cy="10" r="8"/>
      <path d="M10 6v4l2.5 2.5"/>
    </svg>
  )
}

function IconPeso() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="10" cy="10" r="8"/>
      <path d="M7 7.5h4a2 2 0 0 1 0 4H7"/>
      <path d="M7 11.5h5M7 14h6"/>
    </svg>
  )
}

function IconPaddle() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="13" y="5" width="18" height="22" rx="5"/>
      <rect x="18" y="27" width="8" height="13" rx="4"/>
      <circle cx="19" cy="13" r="1.8" fill="currentColor" stroke="none"/>
      <circle cx="25" cy="13" r="1.8" fill="currentColor" stroke="none"/>
      <circle cx="19" cy="20" r="1.8" fill="currentColor" stroke="none"/>
      <circle cx="25" cy="20" r="1.8" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function IconRestroom() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="15" cy="9" r="3.5"/>
      <path d="M15 14v12M11 17h8M15 26v8"/>
      <circle cx="29" cy="9" r="3.5"/>
      <path d="M24 14l5 9 5-9M29 23v11"/>
    </svg>
  )
}

function IconCafe() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 6c0-2 2-3 0-5M22 6c0-2 2-3 0-5M28 6c0-2 2-3 0-5"/>
      <path d="M12 11h20l-2 19H14L12 11z"/>
      <path d="M32 15c3.5 0 5.5 5.5 0 8"/>
      <path d="M9 32h26"/>
    </svg>
  )
}

function IconTicket() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 16a4 4 0 0 0 0 12v4h32v-4a4 4 0 0 0 0-12V12H6v4z"/>
      <line x1="20" y1="12" x2="20" y2="32" strokeDasharray="3 3"/>
    </svg>
  )
}

export default function Home() {
  return (
    <>
      <Nav />

      {/* MOBILE HOME — only shown on small screens */}
      <div className={styles.mobileHome}>
        <Link href="/booking" className={`${styles.mobileTile} ${styles.mobileTilePrimary}`}>
          <div className={styles.mobileTileLabel}>Book Now</div>
          <div className={styles.mobileTileTitle}>Reserve a Court</div>
          <div className={styles.mobileTileMeta}>₱700/hr · Real-time availability</div>
        </Link>
        <Link href="/facilities" className={styles.mobileTile}>
          <div className={styles.mobileTileLabel}>Explore</div>
          <div className={styles.mobileTileTitle}>Facilities</div>
          <div className={styles.mobileTileMeta}>10 courts · Café · 24/7 access</div>
        </Link>
      </div>

      {/* DESKTOP HOME */}
      <div className={styles.desktopHome}>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Cebu&apos;s Premier<br />
              <span className={styles.heroGreen}>Pickleball</span> Courts
            </h1>
            <p className={styles.heroDesc}>
              10 professional courts · Open 24/7 · Instant booking
            </p>
            <div className={styles.heroBtns}>
              <Link href="/booking" className="btn-primary" style={{ fontSize: 20, padding: '18px 56px', letterSpacing: 3 }}>
                Reserve a Court
              </Link>
              <Link href="/facilities" className="btn-outline">
                View Facilities
              </Link>
            </div>
            <div className={styles.heroMeta}>
              <span>₱700/hr</span>
              <span className={styles.heroDot}>·</span>
              <span>₱50 entrance</span>
              <span className={styles.heroDot}>·</span>
              <span>GCash · Maya · GoTyme</span>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <HeroGraphic />
          </div>
        </div>
      </section>

      {/* INFO STRIP */}
      <div className={styles.infoStrip}>
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}><IconPin /></span>
          <span>Brgy Alang-Alang, Mandaue City, Cebu 6014</span>
        </div>
        <div className={styles.infoDivider} />
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}><IconClock /></span>
          <span>Open 24/7</span>
        </div>
        <div className={styles.infoDivider} />
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}><IconPeso /></span>
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
              <div className={styles.facilityIcon}><IconPaddle /></div>
              <div className={styles.facilityName}>10 Courts</div>
              <div className={styles.facilityDesc}>Professional-grade pickleball courts with full lighting — playable day and night, 24/7.</div>
            </div>
            <div className={styles.facilityCard}>
              <div className={styles.facilityIcon}><IconRestroom /></div>
              <div className={styles.facilityName}>Comfort Rooms</div>
              <div className={styles.facilityDesc}>Clean, well-maintained restrooms available at all times for players and guests.</div>
            </div>
            <div className={styles.facilityCard}>
              <div className={styles.facilityIcon}><IconCafe /></div>
              <div className={styles.facilityName}>Café</div>
              <div className={styles.facilityDesc}>On-site café with refreshments, snacks, and drinks to keep you fueled all game long.</div>
            </div>
          </div>
          <div className={styles.facilitiesCta}>
            <Link href="/booking" className="btn-primary">Reserve a Court Now</Link>
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
              <div className={styles.priceIcon}><IconPaddle /></div>
              <div className={styles.priceName}>Court Rental</div>
              <div className={styles.priceAmount}>₱700</div>
              <div className={styles.pricePer}>per hour</div>
            </div>
            <div className={`${styles.priceCard} ${styles.priceCardFeatured}`}>
              <div className={styles.priceIcon}><IconTicket /></div>
              <div className={styles.priceName}>Entrance Fee</div>
              <div className={styles.priceAmount}>₱50</div>
              <div className={styles.pricePer}>per person</div>
            </div>
          </div>
          <div className={styles.paymentMethods}>
            <div className={styles.paymentLabel}>Accepted Payments</div>
            <div className={styles.paymentIcons}>
              <div className={styles.paymentBadge}>
                <span className={styles.paymentName}>GCash</span>
                <span className={styles.paymentType}>E-Wallet</span>
              </div>
              <div className={styles.paymentBadge}>
                <span className={styles.paymentName}>Maya</span>
                <span className={styles.paymentType}>E-Wallet</span>
              </div>
              <div className={styles.paymentBadge}>
                <span className={styles.paymentName}>GoTyme</span>
                <span className={styles.paymentType}>Bank Transfer</span>
              </div>
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
          <Image src="/sideout_test_white.svg" alt="SideOut Pickleball" width={160} height={48} />
          <div className={styles.footerAddress}>Brgy Alang-Alang, Mandaue City, Cebu 6014</div>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.footerText}>Open 24/7</div>
          <div className={styles.footerText}>GCash · Maya · GoTyme</div>
        </div>
      </footer>

      </div>
    </>
  )
}
