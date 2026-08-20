import styles from './landing.module.css';

export function NetworkSection() {
  return (
    <section
      id="a-propos"
      className={`${styles.bentoCard} ${styles.mapCard}`}
      aria-label="Un réseau de casiers à Kinshasa"
    />
  );
}
