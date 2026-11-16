import Icon from '../../components/Icon';
import { useT } from '../../i18n';

export default function HeroShowcase() {
  const { t } = useT();

  return (
    <div className="hero-showcase" aria-hidden="true">
      <div className="showcase-glow" />

      <div className="showcase-window">
        <div className="showcase-window-bar">
          <span className="showcase-dot" />
          <span className="showcase-dot" />
          <span className="showcase-dot" />
          <span className="showcase-window-title">wishlist.app</span>
        </div>

        <div className="showcase-window-body">
          <div className="showcase-card">
            <div className="showcase-thumb">
              <Icon name="laptop" size={30} />
            </div>
            <div className="showcase-info">
              <span className="showcase-eyebrow">{t('landing.showcaseEyebrow')}</span>
              <strong>{t('landing.showcaseTitle')}</strong>
              <div className="showcase-meta">
                <span className="showcase-price">
                  <Icon name="wallet" size={13} />
                  {t('landing.showcasePrice')}
                </span>
                <span className="showcase-priority">
                  <Icon name="flame" size={12} />
                  {t('landing.showcasePriority')}
                </span>
              </div>
            </div>
          </div>

          <div className="showcase-mini-row">
            <span className="showcase-mini">
              <Icon name="book" size={14} />
              {t('kinds.bookShort')}
            </span>
            <span className="showcase-mini">
              <Icon name="gamepad" size={14} />
              {t('kinds.gameShort')}
            </span>
            <span className="showcase-mini">
              <Icon name="phone" size={14} />
              {t('kinds.appShort')}
            </span>
          </div>
        </div>
      </div>

      <div className="showcase-float showcase-float-price">
        <Icon name="chart" size={14} />
        {t('landing.showcaseDeal')}
      </div>
      <div className="showcase-float showcase-float-people">
        <Icon name="users" size={14} />
        {t('landing.showcaseMembers')}
      </div>
      <div className="showcase-float showcase-float-done">
        <Icon name="check-circle" size={14} />
        {t('landing.showcasePurchased')}
      </div>

      <span className="showcase-spark showcase-spark-a">
        <Icon name="sparkles" size={20} />
      </span>
      <span className="showcase-spark showcase-spark-b">
        <Icon name="star" size={14} />
      </span>
    </div>
  );
}
