import { Phone } from 'lucide-react';
import styles from './home.module.css';

export function HeroSection() {
  return (
    <section id="casiers" className={styles.hero}>
      <div className={styles.heroTracks} aria-hidden="true">
        <div className={styles.heroTracksBand} />
      </div>
      <div className={styles.shell}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <h1 className={styles.display}>
              La livraison et le retrait de colis, <em>simplement.</em>
            </h1>
            <p className={styles.lede}>
              Un réseau de casiers : on dépose, on retire, on suit — sans compte.
            </p>
            <a className={styles.heroCall} href="tel:+243810000000">
              <span className={styles.heroCallIcon} aria-hidden="true">
                <Phone size={16} strokeWidth={2.2} />
              </span>
              <span className={styles.heroCallLabel}>Call us:</span>
              <span className={styles.heroCallNumber}>+243 81 000 0000</span>
            </a>
          </div>
          <div className={styles.heroCanvas}>
            <img
              className={styles.heroLocker}
              src="/landing/locker.png"
              alt="Casier intelligent Eveider"
              width={1264}
              height={842}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
