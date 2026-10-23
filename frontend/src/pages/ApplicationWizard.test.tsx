import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { API_BASE } from '../api/client';
import { applications } from '../mocks/fixtures';
import { AuthContext, type AuthValue } from '../auth/AuthContext';
import { ApplicationWizardPage } from './ApplicationWizardPage';
import type { LoanApplicationDraft } from '../api/types';

function setupWizardTest(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const authValue: AuthValue = {
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

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/applications/:applicationId/edit" element={<ApplicationWizardPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('ApplicationWizard', () => {
  it('resumes at currentStep 2 (Employment & income) for LA-2026-00420', async () => {
    setupWizardTest('/applications/LA-2026-00420/edit');

    // Wait for data load and currentStep 2 to be rendered
    await waitFor(() => {
      expect(screen.getAllByText(/Employment & income/i).length).toBeGreaterThan(0);
      expect(screen.getByLabelText(/Employment type/i)).toBeInTheDocument();
    });
  });

  it('saves draft on click and sends updated step to API', async () => {
    let captured: { id: unknown; body: LoanApplicationDraft } | null = null;
    const fixtureDraft = applications.find((a) => a.applicationId === 'LA-2026-00420')!;

    server.use(
      http.put(`${API_BASE}/api/applications/:id`, async ({ request, params }) => {
        captured = { id: params.id, body: await request.json() as LoanApplicationDraft };
        return HttpResponse.json({ ...fixtureDraft, ...captured.body });
      })
    );

    setupWizardTest('/applications/LA-2026-00420/edit');

    await waitFor(() => {
      expect(screen.getByLabelText(/Employment type/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const saveButton = screen.getByRole('button', { name: /^Save draft$/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(captured?.id).toBe('LA-2026-00420');
      expect(captured?.body.currentStep).toBe(2);
    });
  });

  it('shows a failed draft save without advancing or losing the entered fields', async () => {
    server.use(http.put(`${API_BASE}/api/applications/:id`, () => HttpResponse.json({status:503,code:'INTERNAL',message:'Saving is temporarily unavailable. Try again.',timestamp:new Date().toISOString()},{status:503})));
    setupWizardTest('/applications/LA-2026-00420/edit');
    const employment=await screen.findByLabelText(/Employment type/i);
    await userEvent.setup().clear(employment);
    await userEvent.setup().type(employment,'Retail consultant');
    await userEvent.setup().click(screen.getByRole('button',{name:/^Save draft$/i}));
    expect(await screen.findByText('Saving is temporarily unavailable. Try again.')).toBeInTheDocument();
    expect(employment).toHaveValue('Retail consultant');
  });
});
