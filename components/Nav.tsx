'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Nav.module.css'

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <ellipse cx="28" cy="18" rx="7" ry="7" fill="#22c55e" opacity="0.9"/>
          <circle cx="28" cy="18" r="3" fill="#000" opacity="0.4"/>
          <circle cx="26" cy="16" r="1" fill="#000" opacity="0.6"/>
          <circle cx="30" cy="16" r="1" fill="#000" opacity="0.6"/>
          <rect x="8" y="22" width="10" height="14" rx="2" fill="#22c55e" transform="rotate(-30 13 29)"/>
          <rect x="17" y="30" width="3" height="8" rx="1" fill="#22c55e" transform="rotate(-30 18 34)"/>
        </svg>
        <div>
          <div className={styles.logoText}>SideOut</div>
          <span className={styles.logoSub}>Cebu City</span>
        </div>
      </div>

      <ul className={styles.links}>
        <li><Link href="/#courts">Courts</Link></li>
        <li><Link href="/#how-it-works">How It Works</Link></li>
        <li><Link href="/#pricing">Pricing</Link></li>
        <li>
          <Link
            href="/booking"
            className={pathname === '/booking' ? styles.ctaActive : styles.cta}
          >
            Book Now
          </Link>
        </li>
      </ul>
    </nav>
  )
}
