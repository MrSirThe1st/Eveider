import Image from 'next/image';
import styles from './landing.module.css';

type LockerVisualProps = {
  variant?: 'unit' | 'street' | 'product';
  caption?: string;
  className?: string;
  priority?: boolean;
};

const PHOTOS = {
  unit: {
    src: '/landing/locker-unit.jpg',
    alt: 'Station de casiers à colis, compartiments et écran',
  },
  street: {
    src: '/landing/locker-street.jpg',
    alt: 'Station de casiers en ville, vélo cargo chargé de colis',
  },
  product: {
    src: '/landing/locker.png',
    alt: 'Casier intelligent Eveider, dépôt et retrait de colis',
  },
} as const;

export function LockerVisual({
  variant = 'product',
  caption,
  className,
  priority = false,
}: LockerVisualProps) {
  const photo = PHOTOS[variant];

  if (variant === 'product') {
    return (
      <figure className={`${styles.lockerPop} ${className ?? ''}`.trim()}>
        <Image
          src={photo.src}
          alt={photo.alt}
          width={1264}
          height={842}
          className={styles.lockerPopImg}
          sizes="(max-width: 960px) 92vw, 560px"
          priority={priority}
        />
      </figure>
    );
  }

  return (
    <div className={`${styles.lockerStage} ${className ?? ''}`.trim()}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        className={styles.lockerPhoto}
        sizes="(max-width: 900px) 100vw, 560px"
        priority={priority}
      />
      {caption ? <p className={styles.lockerCaption}>{caption}</p> : null}
    </div>
  );
}
