import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import EmptyIllustration from './EmptyIllustration';
import Footer from './Footer';
import Header from './Header';
import Icon from './Icon';

export default function NotFoundPage() {
  const { t } = useT();

  return (
    <div className="page">
      <Header publicMode />
      <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <EmptyIllustration icon="search" tone="sand" />
          <h3>{t('notFound.title')}</h3>
          <p>{t('notFound.text')}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
            <Icon name="arrow-right" size={15} />
            {t('common.backHome')}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
