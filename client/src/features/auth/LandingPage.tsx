import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Icon, { type IconName } from '../../components/Icon';
import Reveal from '../../components/Reveal';
import HeroShowcase from './HeroShowcase';
import { useT } from '../../i18n';
import { KIND_SHORT_KEYS } from '../../i18n/labels';
import { KIND_ICONS } from '../../utils/item-icons';
import type { WishKind } from '../../types';

const HERO_KINDS: WishKind[] = ['game', 'skin', 'book', 'app', 'tech', 'other'];

export default function LandingPage() {
  const { t } = useT();

  const features: ReadonlyArray<{ icon: IconName; title: string; text: string }> = [
    { icon: 'folder', title: t('landing.feature1Title'), text: t('landing.feature1Text') },
    { icon: 'cart', title: t('landing.feature2Title'), text: t('landing.feature2Text') },
    { icon: 'users', title: t('landing.feature3Title'), text: t('landing.feature3Text') },
    { icon: 'grid', title: t('landing.feature4Title'), text: t('landing.feature4Text') },
    { icon: 'zap', title: t('landing.feature5Title'), text: t('landing.feature5Text') },
    { icon: 'link', title: t('landing.feature6Title'), text: t('landing.feature6Text') },
  ];

  const steps: ReadonlyArray<{ icon: IconName; title: string; text: string; tag: string }> = [
    {
      icon: 'folder',
      title: t('landing.step1Title'),
      text: t('landing.step1Text'),
      tag: t('landing.step1Tag'),
    },
    {
      icon: 'gift',
      title: t('landing.step2Title'),
      text: t('landing.step2Text'),
      tag: t('landing.step2Tag'),
    },
    {
      icon: 'users',
      title: t('landing.step3Title'),
      text: t('landing.step3Text'),
      tag: t('landing.step3Tag'),
    },
  ];

  return (
    <div className="page landing">
      <Header publicMode />

      <main className="main">
        <section className="hero">
          <div className="hero-badge">
            <Icon name="sparkles" size={14} />
            {t('landing.badge')}
          </div>
          <h1>
            {t('landing.titleLine1')}
            <br />
            <span className="accent">{t('landing.titleLine2')}</span>
          </h1>
          <p>{t('landing.subtitle')}</p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-accent">
              <Icon name="sparkles" size={16} />
              {t('landing.ctaPrimary')}
            </Link>
            <Link to="/guest" className="btn">
              {t('landing.ctaSecondary')}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          <div className="hero-kinds" aria-label={t('landing.kindStripTitle')}>
            {HERO_KINDS.map((kind) => (
              <span className="hero-kind" key={kind}>
                <Icon name={KIND_ICONS[kind]} size={14} />
                {t(KIND_SHORT_KEYS[kind])}
              </span>
            ))}
          </div>

          <HeroShowcase />
        </section>

        <div className="container">
          <section className="landing-section landing-steps-section" id="how-it-works">
            <Reveal className="landing-section-head">
              <span className="landing-eyebrow">{t('landing.stepsEyebrow')}</span>
              <h2>{t('landing.stepsTitle')}</h2>
              <p>{t('landing.stepsSubtitle')}</p>
            </Reveal>

            <div className="landing-steps">
              {steps.map((step, index) => (
                <article
                  key={step.title}
                  className="landing-step"
                  style={{ '--step-index': index } as CSSProperties}
                >
                  <div className="landing-step-window" aria-hidden="true">
                    <div className="landing-step-window-bar">
                      <span className="landing-step-dot" />
                      <span className="landing-step-dot" />
                      <span className="landing-step-dot" />
                      <span className="landing-step-window-title">wishlist.app</span>
                    </div>
                    <div className="landing-step-window-body">
                      <span className="landing-step-icon">
                        <Icon name={step.icon} size={24} />
                      </span>
                      <span className="landing-step-line landing-step-line-strong" />
                      <span className="landing-step-line" />
                      <span className="landing-step-line landing-step-line-short" />
                      <span className="landing-step-pill">
                        <Icon name="check-circle" size={12} />
                        {step.tag}
                      </span>
                    </div>
                  </div>

                  <div className="landing-step-body">
                    <span className="landing-step-number">0{index + 1}</span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-section landing-features-section">
            <Reveal className="landing-section-head">
              <span className="landing-eyebrow">{t('landing.featuresEyebrow')}</span>
              <h2>{t('landing.featuresTitle')}</h2>
              <p>{t('landing.featuresSubtitle')}</p>
            </Reveal>

            <div className="features landing-features">
              {features.map((feature, index) => (
                <Reveal
                  as="article"
                  key={feature.title}
                  className="feature-card"
                  delay={index * 60}
                >
                  <div className="icon-tile" aria-hidden>
                    <Icon name={feature.icon} size={22} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="landing-section landing-share">
            <Reveal from="left" className="landing-share-copy">
              <span className="landing-eyebrow">{t('landing.shareEyebrow')}</span>
              <h2>{t('landing.shareTitle')}</h2>
              <p>{t('landing.shareText')}</p>
              <ul className="landing-share-points">
                <li>
                  <Icon name="check-circle" size={16} />
                  {t('landing.sharePoint1')}
                </li>
                <li>
                  <Icon name="check-circle" size={16} />
                  {t('landing.sharePoint2')}
                </li>
                <li>
                  <Icon name="check-circle" size={16} />
                  {t('landing.sharePoint3')}
                </li>
              </ul>
              <Link to="/guest" className="btn btn-accent">
                {t('landing.shareCta')}
                <Icon name="arrow-right" size={16} />
              </Link>
            </Reveal>

            <Reveal from="right" delay={120} className="landing-share-visual">
              <div className="landing-float landing-float-a">
                <span className="landing-float-icon">
                  <Icon name="users" size={16} />
                </span>
                <div>
                  <strong>{t('landing.showcaseMembers')}</strong>
                  <span>{t('landing.floatMembersHint')}</span>
                </div>
              </div>

              <div className="landing-float landing-float-b">
                <span className="landing-float-icon">
                  <Icon name="chart" size={16} />
                </span>
                <div>
                  <strong>{t('landing.showcaseDeal')}</strong>
                  <span>{t('landing.floatDealHint')}</span>
                </div>
              </div>

              <div className="landing-window">
                <div className="landing-window-bar">
                  <span className="landing-step-dot" />
                  <span className="landing-step-dot" />
                  <span className="landing-step-dot" />
                  <span className="landing-window-title">wishlist.app/share</span>
                </div>
                <div className="landing-window-body">
                  <div className="landing-window-row">
                    <span className="landing-window-thumb">
                      <Icon name="book" size={18} />
                    </span>
                    <div>
                      <strong>{t('landing.showcaseTitle')}</strong>
                      <span>{t('landing.showcaseEyebrow')}</span>
                    </div>
                    <span className="landing-window-badge">
                      <Icon name="lock" size={11} />
                      {t('landing.shareBadge')}
                    </span>
                  </div>
                  <div className="landing-window-row">
                    <span className="landing-window-thumb landing-window-thumb-alt">
                      <Icon name="gamepad" size={18} />
                    </span>
                    <div>
                      <strong>{t('kinds.gameShort')}</strong>
                      <span>{t('landing.showcasePriority')}</span>
                    </div>
                    <span className="landing-window-badge landing-window-badge-done">
                      <Icon name="check" size={11} />
                      {t('landing.showcasePurchased')}
                    </span>
                  </div>
                  <div className="landing-window-row">
                    <span className="landing-window-thumb landing-window-thumb-warm">
                      <Icon name="phone" size={18} />
                    </span>
                    <div>
                      <strong>{t('kinds.appShort')}</strong>
                      <span>{t('landing.showcasePrice')}</span>
                    </div>
                    <span className="landing-window-badge">
                      <Icon name="clock" size={11} />
                      {t('landing.reservedBadge')}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>

          <Reveal from="scale" className="landing-cta">
            <div className="landing-cta-glow" aria-hidden="true" />
            <div className="landing-cta-content">
              <h2>{t('landing.ctaTitle')}</h2>
              <p>{t('landing.ctaText')}</p>
              <div className="hero-actions">
                <Link to="/register" className="btn btn-accent">
                  <Icon name="sparkles" size={16} />
                  {t('landing.ctaPrimary')}
                </Link>
                <Link to="/login" className="btn btn-ghost">
                  {t('landing.ctaLogin')}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </main>

      <Footer />
    </div>
  );
}
