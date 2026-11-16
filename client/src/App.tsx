import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStatus } from './app/hooks';
import ProtectedRoute from './components/ProtectedRoute';
import TopProgressBar from './components/TopProgressBar';
import Toasts from './components/Toasts';
import ProfilePage from './features/auth/ProfilePage';
import LandingPage from './features/auth/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import DashboardPage from './features/wishlists/DashboardPage';
import WishlistPage from './features/wishlists/WishlistPage';
import GuestPage from './features/guest/GuestPage';
import InviteLandingPage from './features/invites/InviteLandingPage';
import SharedWishlistPage from './features/wishlists/SharedWishlistPage';
import NotFoundPage from './components/NotFoundPage';

export default function App() {
  const { status } = useAuthStatus();
  const isAuthenticated = status === 'authenticated';

  return (
    <>
      <TopProgressBar />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
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
        <Route path="/guest" element={<GuestPage />} />
        <Route path="/invite/:code" element={<InviteLandingPage />} />
        <Route path="/s/:slug" element={<SharedWishlistPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toasts />
    </>
  );
}
