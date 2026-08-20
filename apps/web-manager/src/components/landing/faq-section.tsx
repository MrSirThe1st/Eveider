'use client';

import { useState } from 'react';
import { FAQ_ITEMS } from './landing-content';
import styles from './home.module.css';

export function FAQSection() {
  const [activeId, setActiveId] = useState<(typeof FAQ_ITEMS)[number]['id']>(FAQ_ITEMS[0].id);
  const active = FAQ_ITEMS.find((item) => item.id === activeId) ?? FAQ_ITEMS[0];

  return (
    <section id="faq" className={styles.faq} aria-labelledby="faq-heading">
      <div className={styles.shell}>
        <div className={styles.sectionHead}>
          <h2 id="faq-heading" className={styles.display}>
            Besoin d’<em>aide</em> ?
          </h2>
        </div>
        <div className={styles.faqBoard}>
          <div className={styles.faqQuestions} role="tablist" aria-label="Questions fréquentes">
            {FAQ_ITEMS.map((item) => {
              const selected = item.id === active.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`faq-tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls="faq-panel"
                  className={selected ? `${styles.faqTab} ${styles.faqTabActive}` : styles.faqTab}
                  onClick={() => setActiveId(item.id)}
                >
                  {item.question}
                </button>
              );
            })}
          </div>
          <div
            className={styles.faqPanel}
            role="tabpanel"
            id="faq-panel"
            aria-labelledby={`faq-tab-${active.id}`}
          >
            <h3 className={styles.faqPanelTitle}>{active.question}</h3>
            <p key={active.id} className={styles.faqPanelBody}>
              {active.answer}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
