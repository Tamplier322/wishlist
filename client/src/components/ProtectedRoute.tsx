import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { baseApi } from '../api/baseApi';
import { useAppDispatch, useAuthStatus } from '../app/hooks';
import { useT } from '../i18n';
import Footer from './Footer';
import Header from './Header';
import Spinner from './Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
}


export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuthStatus();
  const { t } = useT();
  const dispatch = useAppDispatch();

  if (status === 'checking') {
    return (
      <div className="page">
        <Spinner fullPage />
      </div>
    );
  }

  if (status === 'anonymous') return <Navigate to="/" replace />;

  if (status === 'unreachable') {
    return (
      <div className="page">
        <Header />
        <main className="main">
          <div className="container">
            <div className="empty-state">
              <div className="empty-icon">📡</div>
              <h3>{t('errors.unreachableTitle')}</h3>
              <p>{t('errors.unreachableText')}</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => dispatch(baseApi.util.resetApiState())}
              >
                {t('common.retry')}
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page">
      <Header />
      <main className="main">{children}</main>
      <Footer />
    </div>
  );
}
