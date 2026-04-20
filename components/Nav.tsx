'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import styles from './Nav.module.css'

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <Image src="/sideout_test_white.svg" alt="SideOut Pickleball" width={200} height={60} priority />
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
