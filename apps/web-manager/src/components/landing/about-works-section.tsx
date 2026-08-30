import { PRODUCT_FEATURES } from './landing-content';
import styles from './home.module.css';

export function AboutWorksSection() {
  return (
    <section id="a-propos" className={styles.about}>
      <div className={styles.shell}>
        <div className={styles.aboutGrid}>
          <div>
            <h2 className={styles.display}>
              Un réseau pensé pour <em>simplifier la livraison.</em>
            </h2>
            <p className={styles.lede}>
              Eveider relie le colis, le dépôt en casier et le retrait. Le chauffeur dessert le
              casier. Le client récupère son colis quand il le peut.
            </p>
          </div>
          <ul className={styles.featureList}>
            {PRODUCT_FEATURES.map((item) => (
              <li key={item.id}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
