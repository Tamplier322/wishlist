import Icon from './Icon';
import { useT } from '../i18n';

export default function Footer() {
  const { t } = useT();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="logo" style={{ marginBottom: 6 }}>
            <span className="logo-mark">
              <Icon name="gift" size={16} />
            </span>
            Wishlist
          </div>
          <p className="footer-tagline">{t('footer.tagline')}</p>
        </div>
        <div className="footer-links">
          <span>
            <Icon name="folder" size={14} />
            {t('footer.categories')}
          </span>
          <span>
            <Icon name="cart" size={14} />
            {t('footer.offers')}
          </span>
          <span>
            <Icon name="users" size={14} />
            {t('footer.shared')}
          </span>
        </div>
      </div>
    </footer>
  );
}
