import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  useApplication,
  useCreateDraft,
  useSaveDraft,
  useSubmitApplication,
} from '../api/hooks/applications';
import type { LoanApplication, LoanApplicationDraft } from '../api/types';
import { FormStepper } from '../components/applications/FormStepper';
import { StepProduct } from '../components/applications/steps/StepProduct';
import { StepEmployment } from '../components/applications/steps/StepEmployment';
import { StepDocuments } from '../components/applications/steps/StepDocuments';
import { StepReview } from '../components/applications/steps/StepReview';
import { Button } from '../components/ui/Button';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Skeleton } from '../components/ui/Skeleton';
import { ApiError } from '../api/client';

const STEPS = [
  'Product & amount',
  'Employment & income',
  'Documents',
  'Review & submit',
];

export function ApplicationWizardPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryProductId = searchParams.get('productId') ?? undefined;

  const { data: existingApp, isLoading: isAppLoading } = useApplication(applicationId);
  const createDraftMutation = useCreateDraft();
  const saveDraftMutation = useSaveDraft(applicationId);
  const submitMutation = useSubmitApplication(applicationId);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [draft, setDraft] = useState<LoanApplicationDraft>({
    productId: queryProductId,
  });
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<unknown>(null);

  // Sync state if editing an existing application
  useEffect(() => {
    if (existingApp) {
      if (existingApp.status !== 'DRAFT') {
        navigate(`/applications/${existingApp.applicationId}/status`, { replace: true });
        return;
      }

      setDraft({
        productId: existingApp.productId,
        requestedAmount: existingApp.requestedAmount,
        tenureMonths: existingApp.tenureMonths,
        purpose: existingApp.purpose,
        employmentType: existingApp.employmentType,
        monthlyIncome: existingApp.monthlyIncome,
        existingMonthlyObligations: existingApp.existingMonthlyObligations,
        currentStep: existingApp.currentStep,
      });

      if (existingApp.currentStep) {
        setCurrentStep(existingApp.currentStep);
        const prevCompleted: number[] = [];
        for (let i = 1; i < existingApp.currentStep; i++) {
          prevCompleted.push(i);
        }
        setCompletedSteps(prevCompleted);
      }
    }
  }, [existingApp, navigate]);

  const showSaveNotice = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSaveNotice(`Draft saved at ${time}`);
    setTimeout(() => setSaveNotice(null), 3000);
  };

  const updateDraft = (patch: Partial<LoanApplicationDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveDraft = async (stepToGo?: number) => {
    setSubmissionError(null);
    try {
    const targetStep = stepToGo ?? currentStep;
    const payload: LoanApplicationDraft = {
      ...draft,
      currentStep: targetStep,
    };

    if (!applicationId) {
      const created = await createDraftMutation.mutateAsync(payload);
      showSaveNotice();
      navigate(`/applications/${created.applicationId}/edit`, { replace: true });
      if (stepToGo) setCurrentStep(stepToGo);
      return created;
    } else {
      const saved = await saveDraftMutation.mutateAsync(payload);
      showSaveNotice();
      if (stepToGo) setCurrentStep(stepToGo);
      return saved;
    }
    } catch (err) {
      setSubmissionError(err);
      return null;
    }
  };

  const handleNext = async () => {
    const nextStep = currentStep + 1;
    setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
    await handleSaveDraft(nextStep);
  };

  const handleBack = async () => {
    const prevStep = Math.max(1, currentStep - 1);
    await handleSaveDraft(prevStep);
  };

  const handleJump = async (step: number) => {
    await handleSaveDraft(step);
  };

  const handleSubmit = async () => {
    if (!applicationId) return;
    setSubmissionError(null);
    setFieldErrors({});

    try {
      await submitMutation.mutateAsync();
      navigate(`/applications/${applicationId}/status`);
    } catch (err) {
      setSubmissionError(err);
      if (err instanceof ApiError && err.body.details) {
        const mapped: Record<string, string> = {};
        for (const d of err.body.details) {
          if (d.field && d.issue) mapped[d.field] = d.issue;
        }
        setFieldErrors(mapped);

        // Jump to first step with error
        if (mapped.productId || mapped.requestedAmount || mapped.tenureMonths || mapped.purpose) {
          setCurrentStep(1);
        } else if (mapped.employmentType || mapped.monthlyIncome || mapped.existingMonthlyObligations) {
          setCurrentStep(2);
        }
      }
    }
  };

  if (applicationId && isAppLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const currentApplicationForReview: LoanApplication = {
    applicationId: applicationId ?? 'NEW',
    customerId: existingApp?.customerId ?? 'CURRENT',
    status: 'DRAFT',
    createdAt: existingApp?.createdAt ?? new Date().toISOString(),
    updatedAt: existingApp?.updatedAt ?? new Date().toISOString(),
    estimatedEmi: existingApp?.estimatedEmi ?? null,
    timeline: existingApp?.timeline ?? [],
    ...draft,
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-fg">
            {applicationId ? `Edit Application (${applicationId})` : 'New Loan Application'}
          </h1>
          <p className="text-sm text-muted">
            Complete the 4-step wizard to apply for your loan. Drafts are automatically preserved.
          </p>
        </div>

        {saveNotice && (
          <div
            role="status"
            aria-live="polite"
            className="px-3 py-1.5 rounded-full bg-success-soft text-success text-xs font-semibold"
          >
            {saveNotice}
          </div>
        )}
      </div>

      <FormStepper
        steps={STEPS}
        current={currentStep}
        completed={completedSteps}
        onJump={handleJump}
      />

      {Boolean(submissionError) && <ErrorAlert error={submissionError} />}

      <div className="bg-surface border border-border rounded-lg shadow-card p-6">
        {currentStep === 1 && (
          <StepProduct
            productId={draft.productId}
            requestedAmount={draft.requestedAmount}
            tenureMonths={draft.tenureMonths}
            purpose={draft.purpose}
            errors={fieldErrors}
            onChange={updateDraft}
          />
        )}

        {currentStep === 2 && (
          <StepEmployment
            employmentType={draft.employmentType}
            monthlyIncome={draft.monthlyIncome}
            existingMonthlyObligations={draft.existingMonthlyObligations}
            errors={fieldErrors}
            onChange={updateDraft}
          />
        )}

        {currentStep === 3 && (
          <div>
            {!applicationId ? (
              <div className="text-center p-6 space-y-4">
                <p className="text-sm text-muted">
                  Please save your application draft first to enable document uploads.
                </p>
                <Button onClick={() => handleSaveDraft(3)}>Save draft & proceed</Button>
              </div>
            ) : (
              <StepDocuments applicationId={applicationId} />
            )}
          </div>
        )}

        {currentStep === 4 && (
          <StepReview application={currentApplicationForReview} />
        )}

        {/* Wizard Controls */}
        <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSaveDraft()}
            loading={createDraftMutation.isPending || saveDraftMutation.isPending}
          >
            Save draft
          </Button>

          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button type="button" variant="ghost" onClick={handleBack}>
                Back
              </Button>
            )}

            {currentStep < 4 ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                loading={submitMutation.isPending}
              >
                Submit application
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
