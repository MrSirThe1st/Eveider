import { GeistSans } from 'geist/font/sans';
import { AboutWorksSection } from './about-works-section';
import { ContactBand } from './contact-band';
import { FAQSection } from './faq-section';
import { HeroSection } from './hero-section';
import { LandingFooter } from './landing-footer';
import { LandingHeader } from './landing-header';
import { LandingSmoothScroll } from './landing-smooth-scroll';
import styles from './landing.module.css';
import { MissionBanner } from './mission-banner';
import { ProductCtaSection } from './product-cta-section';
import { SolutionsSection } from './solutions-section';
import { VoicesSection } from './voices-section';

export async function LandingPage() {
  return (
    <LandingSmoothScroll>
      <div className={`${styles.page} ${GeistSans.className}`}>
        <a className="nb-skip-link" href="#contenu-principal">
          Aller au contenu
        </a>
        <LandingHeader />
        <main id="contenu-principal">
          <HeroSection />
          <SolutionsSection />
          <MissionBanner />
          <AboutWorksSection />
          <VoicesSection />
          <ProductCtaSection />
          <FAQSection />
          <ContactBand />
        </main>
        <LandingFooter />
      </div>
    </LandingSmoothScroll>
  );
}
