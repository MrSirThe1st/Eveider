import { Package, Truck, Unlock } from 'lucide-react';
import Link from 'next/link';
import { SOLUTIONS } from './landing-content';
import styles from './home.module.css';

const ICONS = {
  deposer: Package,
  acheminer: Truck,
  recuperer: Unlock,
} as const;

export function SolutionsSection() {
  return (
    <section id="comment-ca-marche" className={styles.solutions}>
      <div className={styles.shell}>
        <div className={`${styles.sectionHead} ${styles.solutionsHead}`}>
          <h2 className={styles.display}>
            Déposer, acheminer, récupérer
            <br />
            <em>sans rendez-vous à domicile.</em>
          </h2>
        </div>
        <div className={styles.solutionGrid}>
          {SOLUTIONS.map((item) => {
            const Icon = ICONS[item.id];
            return (
              <article key={item.id} className={styles.solutionCard}>
                <div className={styles.solutionPhoto}>
                  <img src={item.image} alt={item.imageAlt} width={720} height={540} />
                  <span className={styles.solutionMark} aria-hidden="true">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Link href={item.href} className={styles.solutionLink}>
                  En savoir plus
                </Link>
              </article>
            );
          })}
        </div>
        <p className={styles.solutionsFoot}>
          Le casier est le point de rendez-vous. Le destinataire vient quand il peut.
        </p>
      </div>
    </section>
  );
}
