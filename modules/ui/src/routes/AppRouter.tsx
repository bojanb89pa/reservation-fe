import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

import { HomePage } from '../pages/HomePage';
import { RegisterPage } from '../pages/RegisterPage';
import { OAuthCallbackPage } from '../pages/OAuthCallbackPage';
import { BusinessListPage } from '../pages/BusinessListPage';
import { BusinessByCategoryPage } from '../pages/BusinessByCategoryPage';
import { BusinessDetailPage } from '../pages/BusinessDetailPage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { ReservationHeldPage } from '../pages/ReservationHeldPage';

import { MyReservationsPage } from '../pages/MyReservationsPage';
import { BusinessOnboardingPage } from '../pages/BusinessOnboardingPage';
import { DashboardLayout } from '../pages/dashboard/DashboardLayout';
import { DashboardOverviewPage } from '../pages/dashboard/DashboardOverviewPage';
import { DashboardBusinessesPage } from '../pages/dashboard/DashboardBusinessesPage';
import { DashboardBusinessPage } from '../pages/dashboard/DashboardBusinessPage';
import { DashboardMyBusinessesPage } from '../pages/dashboard/DashboardMyBusinessesPage';
import { DashboardCategoriesPage } from '../pages/dashboard/DashboardCategoriesPage';
import { DashboardReservationsPage } from '../pages/dashboard/DashboardReservationsPage';

function PublicLayout() {
  const { pathname } = useLocation();

  // New page: scroll to top, then ease the content in (no hard cuts).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <>
      <Header />
      <motion.main
        key={pathname}
        style={{ flex: 1 }}
        initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ type: 'spring', stiffness: 130, damping: 20, mass: 0.9 }}
      >
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="callback" element={<OAuthCallbackPage />} />
          <Route path="search" element={<SearchResultsPage />} />
          <Route path="businesses" element={<BusinessListPage />} />
          <Route path="businesses/category/:categoryId" element={<BusinessByCategoryPage />} />
          <Route path="businesses/:id" element={<BusinessDetailPage />} />
          <Route path="reservation/:id/held" element={<ReservationHeldPage />} />
          <Route path="my-reservations" element={<MyReservationsPage />} />
          <Route path="business-onboarding" element={<BusinessOnboardingPage />} />
        </Routes>
      </motion.main>
      <Footer />
    </>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="dashboard/*" element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardOverviewPage />} />
          <Route path="businesses" element={<DashboardBusinessesPage />} />
          <Route path="businesses/:id" element={<DashboardBusinessPage />} />
          <Route path="my-businesses" element={<DashboardMyBusinessesPage />} />
          <Route element={<AdminRoute />}>
            <Route path="categories" element={<DashboardCategoriesPage />} />
          </Route>
          <Route path="reservations" element={<DashboardReservationsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<PublicLayout />} />
    </Routes>
  );
}
