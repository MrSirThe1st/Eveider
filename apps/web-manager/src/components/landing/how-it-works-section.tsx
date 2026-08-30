import Image from 'next/image';
import { HOW_IT_WORKS_STEPS } from './landing-content';
import styles from './landing.module.css';

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className={`${styles.bentoCard} ${styles.howCard}`}>
      <div className={styles.lifeLayer} aria-hidden="true">
        <Image
          src="/landing/courier.jpg"
          alt=""
          fill
          className={styles.lifeLayerImg}
          sizes="(max-width: 960px) 100vw, 50vw"
        />
      </div>
      <div className={styles.howInner}>
        <p className={styles.kicker}>Comment ça marche</p>
        <h2 className={styles.cardTitle}>Du colis au retrait</h2>
        <ol className={styles.howFlow}>
          {HOW_IT_WORKS_STEPS.map((item, index) => (
            <li key={item.id} className={styles.howStep}>
              <span className={styles.howNum}>{item.step}</span>
              <div>
                <h3 className={styles.stepTitle}>{item.title}</h3>
                <p className={styles.stepBody}>{item.description}</p>
              </div>
              {index < HOW_IT_WORKS_STEPS.length - 1 ? (
                <span className={styles.howConnector} aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
