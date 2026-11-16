import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStatus } from './app/hooks';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';
import TopProgressBar from './components/TopProgressBar';
import Toasts from './components/Toasts';
import ScrollTopButton from './components/ScrollTopButton';
import MobileTabBar from './components/MobileTabBar';
import OfflineIndicator from './components/OfflineIndicator';
import ProfileSetupModal from './features/auth/ProfileSetupModal';

const LandingPage = lazy(() => import('./features/auth/LandingPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ProfilePage = lazy(() => import('./features/auth/ProfilePage'));
const OAuthCallbackPage = lazy(() => import('./features/auth/OAuthCallbackPage'));
const DashboardPage = lazy(() => import('./features/wishlists/DashboardPage'));
const WishlistPage = lazy(() => import('./features/wishlists/WishlistPage'));
const GuestPage = lazy(() => import('./features/guest/GuestPage'));
const InviteLandingPage = lazy(() => import('./features/invites/InviteLandingPage'));
const SharedWishlistPage = lazy(() => import('./features/wishlists/SharedWishlistPage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));

export default function App() {
  const location = useLocation();
  const { status } = useAuthStatus();
  const isAuthenticated = status === 'authenticated';

  return (
    <>
      <TopProgressBar />
      <OfflineIndicator />
      <div className="route-fade" key={location.pathname}>
        <Suspense
          fallback={
            <div className="page">
              <Spinner fullPage />
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
            />
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
            />
            <Route
              path="/register"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wishlist/:id"
              element={
                <ProtectedRoute>
                  <WishlistPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/guest" element={<GuestPage />} />
            <Route path="/invite/:code" element={<InviteLandingPage />} />
            <Route path="/s/:slug" element={<SharedWishlistPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      {isAuthenticated && <ProfileSetupModal />}
      <MobileTabBar />
      <ScrollTopButton />
      <Toasts />
    </>
  );
}
