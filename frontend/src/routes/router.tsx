import { createBrowserRouter, Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { roleHome } from '../auth/roleHome';
import { RoleGuard } from './RoleGuard';
import { AppLayout } from '../layouts/AppLayout';

import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { CataloguePage } from '../pages/CataloguePage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { ComparePage } from '../pages/ComparePage';
import { EmiPage } from '../pages/EmiPage';
import { AdvisorPage } from '../pages/AdvisorPage';
import { PolicyPage } from '../pages/PolicyPage';
import { ProfilePage } from '../pages/ProfilePage';
import { MyApplicationsPage } from '../pages/MyApplicationsPage';
import { ApplicationWizardPage } from '../pages/ApplicationWizardPage';
import { StatusTrackerPage } from '../pages/StatusTrackerPage';
import { OfficerQueuePage } from '../pages/OfficerQueuePage';
import { AnalystReviewPage } from '../pages/AnalystReviewPage';
import { KnowledgePage } from '../pages/KnowledgePage';
import { PolicyLibraryPage } from '../pages/PolicyLibraryPage';
import { PolicyUploadPage } from '../pages/PolicyUploadPage';
import { PolicyDetailPage } from '../pages/PolicyDetailPage';

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

export const router = createBrowserRouter([
  // Public routes
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Authenticated base layout (all 4 roles)
  {
    element: <RoleGuard allow={['CUSTOMER', 'LOAN_OFFICER', 'CREDIT_ANALYST', 'POLICY_ADMIN']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/',
            element: <RootRedirect />,
          },
          {
            path: '/policy',
            element: <PolicyPage />,
          },
          {
            path: '/forbidden',
            element: <ForbiddenPage />,
          },

          // Customer, Officer, Analyst group
          {
            element: <RoleGuard allow={['CUSTOMER', 'LOAN_OFFICER', 'CREDIT_ANALYST']} />,
            children: [
              {
                path: '/products',
                element: <CataloguePage />,
              },
              {
                path: '/products/:productId',
                element: <ProductDetailPage />,
              },
              {
                path: '/compare',
                element: <ComparePage />,
              },
              {
                path: '/emi',
                element: <EmiPage />,
              },
              {
                path: '/advisor',
                element: <AdvisorPage />,
              },
              {
                path: '/applications/:applicationId/status',
                element: <StatusTrackerPage />,
              },
            ],
          },

          // Customer-only group
          {
            element: <RoleGuard allow={['CUSTOMER']} />,
            children: [
              {
                path: '/profile',
                element: <ProfilePage />,
              },
              {
                path: '/applications',
                element: <MyApplicationsPage />,
              },
              {
                path: '/applications/new',
                element: <ApplicationWizardPage />,
              },
              {
                path: '/applications/:applicationId/edit',
                element: <ApplicationWizardPage />,
              },
            ],
          },

          // Loan Officer and Credit Analyst group
          {
            element: <RoleGuard allow={['LOAN_OFFICER', 'CREDIT_ANALYST']} />,
            children: [
              {
                path: '/officer/queue',
                element: <OfficerQueuePage />,
              },
              {
                path: '/analyst/review/:applicationId',
                element: <AnalystReviewPage />,
              },
              {
                path: '/knowledge',
                element: <KnowledgePage />,
              },
            ],
          },

          // Policy Admin group
          {
            element: <RoleGuard allow={['POLICY_ADMIN']} />,
            children: [
              {
                path: '/admin/policies',
                element: <PolicyLibraryPage />,
              },
              {
                path: '/admin/policies/new',
                element: <PolicyUploadPage />,
              },
              {
                path: '/admin/policies/:documentKey',
                element: <PolicyDetailPage />,
              },
            ],
          },
        ],
      },
    ],
  },

  // Catch-all
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
