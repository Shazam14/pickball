import Link from 'next/link'
import Image from 'next/image'
import Nav from '@/components/Nav'
import styles from '../page.module.css'

export default function FacilitiesPage() {
  return (
    <>
      <Nav />

      <section className={styles.section} style={{ paddingTop: 120 }}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>— The Space</div>
          <div className={styles.sectionTitle}>Facilities</div>
          <div className={styles.galleryGrid}>
            {[
              { src: '/facilities/court.jpg', label: 'Courts' },
              { src: '/facilities/cafe.jpg', label: 'Café' },
              { src: '/facilities/lounge.jpg', label: 'Lounge' },
              { src: '/facilities/canteen.jpg', label: 'Canteen' },
              { src: '/facilities/shop.jpg', label: 'Pro Shop' },
              { src: '/facilities/hallway.jpg', label: 'Hallway' },
              { src: '/facilities/restroom-1.jpg', label: 'Restroom' },
              { src: '/facilities/restroom-2.jpg', label: 'Restroom' },
              { src: '/facilities/shower.jpg', label: 'Shower' },
            ].map(item => (
              <figure key={item.src} className={styles.galleryItem}>
                <Image
                  src={item.src}
                  alt={item.label}
                  width={1200}
                  height={800}
                  className={styles.galleryImage}
                  sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                />
                <figcaption className={styles.galleryLabel}>{item.label}</figcaption>
              </figure>
            ))}
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
