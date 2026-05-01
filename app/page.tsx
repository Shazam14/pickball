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

export default function Home() {
  return (
    <>
      <Nav />

      {/* MOBILE HOME — only shown on small screens */}
      <div className={styles.mobileHome}>
        <Link href="/booking" className={`${styles.mobileTile} ${styles.mobileTilePrimary}`}>
          <div className={styles.mobileTileLabel}>Book Now</div>
          <div className={styles.mobileTileTitle}>Reserve a Court</div>
          <div className={styles.mobileTileMeta}>₱600–700/hr · Real-time availability</div>
        </Link>
        <Link href="/facilities" className={styles.mobileTile}>
          <div className={styles.mobileTileLabel}>Explore</div>
          <div className={styles.mobileTileTitle}>Facilities</div>
          <div className={styles.mobileTileMeta}>10 courts · Café · 8AM–12AM daily</div>
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
              10 professional courts · Open 8AM–12AM · Instant booking
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
              <span>₱600–700/hr</span>
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
          <span>Open 8AM–12AM</span>
        </div>
        <div className={styles.infoDivider} />
        <div className={styles.infoItem}>
          <span className={styles.infoIcon}><IconPeso /></span>
          <span>₱600–700/hr · ₱50 entrance per head</span>
        </div>
      </div>

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
