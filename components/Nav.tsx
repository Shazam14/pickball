'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoSVG from './LogoSVG'
import styles from './Nav.module.css'

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <LogoSVG width={200} />
      </Link>

      <ul className={styles.links}>
        <li><Link href="/#facilities">Facilities</Link></li>
        <li><Link href="/#pricing">Pricing</Link></li>
        <li><Link href="/#how-it-works">How It Works</Link></li>
        <li>
          <Link
            href="/booking"
            className={pathname === '/booking' ? styles.ctaActive : styles.cta}
          >
            Reserve a Court
          </Link>
        </li>
      </ul>
    </nav>
  )
}
