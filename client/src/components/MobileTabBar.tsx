import type { ComponentProps } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useAuthStatus } from '../app/hooks';
import { toggleTheme } from '../features/ui/uiSlice';
import { useT } from '../i18n';
import Icon from './Icon';

type TabIcon = ComponentProps<typeof Icon>['name'];

interface TabDefinition {
  to: string;
  icon: TabIcon;
  label: string;
}

export default function MobileTabBar() {
  const { t } = useT();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { status } = useAuthStatus();
  const theme = useAppSelector((state) => state.ui.theme);
  const isAuthenticated = status === 'authenticated';

  const hidden =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/s/') ||
    location.pathname.startsWith('/invite/');

  if (hidden) return null;

  const tabs: TabDefinition[] = [];
  if (isAuthenticated) {
    tabs.push({ to: '/dashboard', icon: 'grid', label: t('tabbar.dashboard') });
  }
  tabs.push({ to: '/guest', icon: 'sparkles', label: t('tabbar.guest') });
  if (isAuthenticated) {
    tabs.push({ to: '/profile', icon: 'user', label: t('tabbar.profile') });
  }

  return (
    <nav className="mobile-tabbar" aria-label={t('tabbar.aria')}>
      {tabs.map((tab) => {
        const active =
          location.pathname === tab.to ||
          (tab.to === '/dashboard' && location.pathname.startsWith('/wishlist/'));
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`mobile-tab ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={tab.icon} size={20} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className="mobile-tab"
        onClick={() => dispatch(toggleTheme())}
        aria-label={t('common.toggleTheme')}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
        <span>{t('tabbar.theme')}</span>
      </button>
    </nav>
  );
}
