import { useT } from '../i18n';

export default function Footer() {
  const { t } = useT();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="logo" style={{ marginBottom: 6 }}>
            <span className="logo-mark">🎁</span>
            Wishlist
          </div>
          <p className="footer-tagline">{t('footer.tagline')}</p>
        </div>
        <div className="footer-links">
          <span>{t('footer.categories')}</span>
          <span>{t('footer.offers')}</span>
          <span>{t('footer.shared')}</span>
        </div>
      </div>
    </footer>
  );
}
