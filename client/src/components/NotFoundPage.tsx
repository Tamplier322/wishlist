import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import Header from './Header';
import Footer from './Footer';

export default function NotFoundPage() {
  const { t } = useT();

  return (
    <div className="page">
      <Header publicMode />
      <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon">🧭</div>
          <h3>{t('notFound.title')}</h3>
          <p>{t('notFound.text')}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
            {t('common.backHome')}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
