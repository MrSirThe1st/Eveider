'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { VOICES } from './landing-content';
import styles from './home.module.css';

const AUTOPLAY_MS = 5500;

export function VoicesSection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = VOICES.length;
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const go = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused || reduceMotion.current || count < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, count, index]);

  return (
    <section className={styles.voices} aria-labelledby="voices-heading">
      <div className={styles.shell}>
        <h2 id="voices-heading" className={styles.voicesTitle}>
          Témoignages
        </h2>

        <div
          className={styles.voiceStage}
          role="region"
          aria-roledescription="carousel"
          aria-label="Témoignages"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <button
            type="button"
            className={`${styles.voiceArrow} ${styles.voiceArrowPrev}`}
            aria-label="Témoignage précédent"
            onClick={() => go(index - 1)}
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>

          <div className={styles.voiceViewport}>
            <div
              className={styles.voiceTrack}
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {VOICES.map((voice) => (
                <article key={voice.id} className={styles.voiceCard}>
                  <div className={styles.voiceQuote}>
                    <blockquote>“{voice.quote}”</blockquote>
                    <p>
                      <strong>{voice.lens}</strong>
                    </p>
                  </div>
                  <div className={styles.voicePhoto}>
                    <img src={voice.image} alt={voice.imageAlt} width={800} height={1000} />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`${styles.voiceArrow} ${styles.voiceArrowNext}`}
            aria-label="Témoignage suivant"
            onClick={() => go(index + 1)}
          >
            <ChevronRight size={22} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.voiceNav} role="tablist" aria-label="Témoignages">
          {VOICES.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={i === index ? `${styles.voiceDot} ${styles.voiceDotOn}` : styles.voiceDot}
              onClick={() => go(i)}
            >
              <span className="sr-only">{item.lens}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
