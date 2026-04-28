import Link from 'next/link'
import Image from 'next/image'
import Nav from '@/components/Nav'
import styles from '../page.module.css'

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

export default function FacilitiesPage() {
  return (
    <>
      <Nav />

      <section className={styles.section} style={{ paddingTop: 120 }}>
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
    </>
  )
}
