import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../api/types';

export interface RoleGuardProps {
  allow: Role[];
}

export function RoleGuard({ allow }: RoleGuardProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
