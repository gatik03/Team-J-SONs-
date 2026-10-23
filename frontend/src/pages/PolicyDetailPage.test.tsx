import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { API_BASE } from '../api/client';
import { AuthContext, type AuthValue } from '../auth/AuthContext';
import { PolicyDetailPage } from './PolicyDetailPage';
import type { PolicyVersion } from '../api/types';

function setupPolicyDetailTest(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const authValue: AuthValue = {
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

  localStorage.setItem('ll-auth', JSON.stringify(authValue.user));

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/admin/policies/:documentKey" element={<PolicyDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('PolicyDetailPage', () => {
  it('shows Retire button and no Publish button on ACTIVE v2026.3', async () => {
    setupPolicyDetailTest('/admin/policies/VEHICLE-TNC?version=KB-001');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Retire$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Publish$/i })).not.toBeInTheDocument();
    });
  });

  it('shows Publish button and no Retire button on DRAFT v2026.4', async () => {
    const draftRow: PolicyVersion = {
      documentId: 'KB-101',
      documentKey: 'VEHICLE-TNC',
      title: 'Vehicle Loan Terms and Conditions',
      version: '2026.4',
      effectiveDate: '2026-10-23',
      loanType: 'VEHICLE',
      documentType: 'TERMS_AND_CONDITIONS',
      audience: 'CUSTOMER',
      customerSegment: 'ALL',
      chunkCount: 9,
      status: 'DRAFT',
      createdBy: 'admin.rao',
      publishedBy: null,
      publishedAt: null,
      retiredAt: null,
      retiredReason: null,
      ingestedAt: '2026-10-23T10:00:00.000Z',
      changeNote: 'Foreclosure terms updated to 3 EMIs',
      servingState: 'DRAFT',
    };

    server.use(
      http.get(`${API_BASE}/api/admin/policies/:documentKey/versions`, () => {
        return HttpResponse.json([draftRow]);
      })
    );

    setupPolicyDetailTest('/admin/policies/VEHICLE-TNC?version=KB-101');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Publish$/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Retire$/i })).not.toBeInTheDocument();
    });
  });

  it('enforces min length in RetireDialog and calls retire endpoint', async () => {
    let captured: { reason?: string } | null = null;

    server.use(
      http.post(`${API_BASE}/api/admin/policies/versions/:documentId/retire`, async ({ request }) => {
        captured = (await request.json()) as { reason?: string };
        return HttpResponse.json({
          documentId: 'KB-001',
          documentKey: 'VEHICLE-TNC',
          version: '2026.3',
          status: 'RETIRED',
          servingState: 'RETIRED',
        });
      })
    );

    setupPolicyDetailTest('/admin/policies/VEHICLE-TNC?version=KB-001');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Retire$/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^Retire$/i }));

    const confirmButton = screen.getByRole('button', { name: /^Retire v2026\.3$/i });
    expect(confirmButton).toBeDisabled();

    const textarea = screen.getByLabelText(/Reason/i);
    await user.type(textarea, 'abc');
    expect(confirmButton).toBeDisabled();

    await user.clear(textarea);
    await user.type(textarea, 'Wrong foreclosure terms');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    await waitFor(() => {
      expect(captured?.reason).toBe('Wrong foreclosure terms');
    });
  });
});
