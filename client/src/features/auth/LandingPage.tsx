import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function LandingPage() {
  const { t } = useT();

  const features = [
    { icon: '🗂️', title: t('landing.feature1Title'), text: t('landing.feature1Text') },
    { icon: '🛒', title: t('landing.feature2Title'), text: t('landing.feature2Text') },
    { icon: '👥', title: t('landing.feature3Title'), text: t('landing.feature3Text') },
    { icon: '🎴', title: t('landing.feature4Title'), text: t('landing.feature4Text') },
    { icon: '⚡', title: t('landing.feature5Title'), text: t('landing.feature5Text') },
    { icon: '🔗', title: t('landing.feature6Title'), text: t('landing.feature6Text') },
  ];

  return (
    <div className="page">
      <Header publicMode />

      <main className="main">
        <section className="hero">
          <div className="hero-badge">{t('landing.badge')}</div>
          <h1>
            {t('landing.titleLine1')}
            <br />
            <span className="accent">{t('landing.titleLine2')}</span>
          </h1>
          <p>{t('landing.subtitle')}</p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-accent">
              {t('landing.ctaPrimary')}
            </Link>
            <Link to="/guest" className="btn">
              {t('landing.ctaSecondary')} →
            </Link>
          </div>
        </section>

        <div className="container">
          <section className="features">
            {features.map((feature) => (
              <article key={feature.title} className="feature-card">
                <div className="icon" aria-hidden>
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
