import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext, type AuthValue } from '../auth/AuthContext';
import { RoleGuard } from './RoleGuard';

function renderWithAuth(initialPath: string, authValue: AuthValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/forbidden" element={<div>Forbidden page</div>} />

          {/* Officer & Analyst routes */}
          <Route element={<RoleGuard allow={['LOAN_OFFICER', 'CREDIT_ANALYST']} />}>
            <Route path="/officer/queue" element={<div>Queue content</div>} />
            <Route path="/analyst/review/:id" element={<div>Review content</div>} />
          </Route>

          {/* Admin routes */}
          <Route element={<RoleGuard allow={['POLICY_ADMIN']} />}>
            <Route path="/admin/policies" element={<div>Library content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('RoleGuard', () => {
  it('redirects unauthenticated user at /officer/queue to login', () => {
    const unauthenticated: AuthValue = {
      user: null,
      login: () => {},
      logout: () => {},
    };

    renderWithAuth('/officer/queue', unauthenticated);
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects CUSTOMER at /officer/queue to forbidden', () => {
    const customerAuth: AuthValue = {
      user: {
        username: 'priya.sharma',
        role: 'CUSTOMER',
        customerId: 'CUST-1001',
        displayName: 'Priya Sharma',
        token: 'mock.priya.sharma',
      },
      login: () => {},
      logout: () => {},
    };

    renderWithAuth('/officer/queue', customerAuth);
    expect(screen.getByText('Forbidden page')).toBeInTheDocument();
  });

  it('allows LOAN_OFFICER at /officer/queue to see queue content', () => {
    const officerAuth: AuthValue = {
      user: {
        username: 'officer.kumar',
        role: 'LOAN_OFFICER',
        customerId: null,
        displayName: 'Arjun Kumar',
        token: 'mock.officer.kumar',
      },
      login: () => {},
      logout: () => {},
    };

    renderWithAuth('/officer/queue', officerAuth);
    expect(screen.getByText('Queue content')).toBeInTheDocument();
  });

  it('redirects CUSTOMER at /admin/policies to forbidden', () => {
    const customerAuth: AuthValue = {
      user: {
        username: 'priya.sharma',
        role: 'CUSTOMER',
        customerId: 'CUST-1001',
        displayName: 'Priya Sharma',
        token: 'mock.priya.sharma',
      },
      login: () => {},
      logout: () => {},
    };

    renderWithAuth('/admin/policies', customerAuth);
    expect(screen.getByText('Forbidden page')).toBeInTheDocument();
  });

  it('redirects POLICY_ADMIN at /analyst/review/LA-2026-00418 to forbidden and allows at /admin/policies', () => {
    const adminAuth: AuthValue = {
      user: {
        username: 'admin.rao',
        role: 'POLICY_ADMIN',
        customerId: null,
        displayName: 'Admin Rao',
        token: 'mock.admin.rao',
      },
      login: () => {},
      logout: () => {},
    };

    const { unmount } = renderWithAuth('/analyst/review/LA-2026-00418', adminAuth);
    expect(screen.getByText('Forbidden page')).toBeInTheDocument();
    unmount();

    renderWithAuth('/admin/policies', adminAuth);
    expect(screen.getByText('Library content')).toBeInTheDocument();
  });
});
