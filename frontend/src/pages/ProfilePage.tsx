import React, { useEffect, useState } from 'react';
import { useProfile, useUpdateProfile } from '../api/hooks/customers';
import type { CustomerSegment } from '../api/types';
import { formatDate } from '../lib/formatDate';
import { Card } from '../components/ui/Card';
import { Field } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { ApiError } from '../api/client';

export function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile();
  const updateMutation = useUpdateProfile();

  const [employmentType, setEmploymentType] = useState('');
  const [segment, setSegment] = useState<CustomerSegment>('SALARIED');
  const [monthlyIncome, setMonthlyIncome] = useState<string>('0');
  const [existingMonthlyObligations, setExistingMonthlyObligations] = useState<string>('0');
  const [location, setLocation] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setEmploymentType(profile.employmentType ?? '');
      setSegment(profile.segment ?? 'SALARIED');
      setMonthlyIncome(String(profile.monthlyIncome ?? 0));
      setExistingMonthlyObligations(String(profile.existingMonthlyObligations ?? 0));
      setLocation(profile.location ?? '');
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);
    setFieldErrors({});

    updateMutation.mutate(
      {
        employmentType,
        segment,
        monthlyIncome: Math.max(0, parseInt(monthlyIncome, 10) || 0),
        existingMonthlyObligations: Math.max(0, parseInt(existingMonthlyObligations, 10) || 0),
        location,
      },
      {
        onSuccess: () => {
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 4000);
        },
        onError: (err) => {
          if (err instanceof ApiError && err.body.details) {
            const mapped: Record<string, string> = {};
            for (const d of err.body.details) {
              if (d.field && d.issue) mapped[d.field] = d.issue;
            }
            setFieldErrors(mapped);
          }
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-h1 font-bold text-fg">Customer Profile</h1>
        <ErrorAlert error={error} />
      </div>
    );
  }

  const kycTone =
    profile.kycStatus === 'VERIFIED'
      ? 'success'
      : profile.kycStatus === 'FAILED'
      ? 'danger'
      : 'warn';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-h1 font-bold text-fg">Customer Profile</h1>
        <p className="text-sm text-muted">
          View your registered personal identity details and maintain your current financial status.
        </p>
      </div>

      {savedSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 bg-success-soft text-success text-sm font-medium rounded-md border border-success/20"
        >
          Profile saved successfully.
        </div>
      )}

      {updateMutation.error && <ErrorAlert error={updateMutation.error} />}

      {/* Read-only identity info */}
      <Card title="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted block">Full name</span>
            <span className="font-semibold text-fg">{profile.fullName}</span>
          </div>

          <div>
            <span className="text-xs text-muted block">KYC Verification status</span>
            <Badge tone={kycTone} className="mt-0.5">
              {profile.kycStatus}
            </Badge>
          </div>

          <div>
            <span className="text-xs text-muted block">Email address</span>
            <span className="text-fg">{profile.email}</span>
          </div>

          <div>
            <span className="text-xs text-muted block">Phone number</span>
            <span className="text-fg">{profile.phone}</span>
          </div>

          <div>
            <span className="text-xs text-muted block">Date of birth</span>
            <span className="text-fg">{formatDate(profile.dateOfBirth)}</span>
          </div>

          <div>
            <span className="text-xs text-muted block">Customer ID</span>
            <span className="font-mono text-xs text-muted">{profile.customerId}</span>
          </div>
        </div>
      </Card>

      {/* Editable employment & financial info */}
      <Card title="Employment & Financial Profile">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="profile-employment" label="Employment type" error={fieldErrors.employmentType} required>
            <input
              type="text"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
              placeholder="e.g. Private sector salaried"
            />
          </Field>

          <Field id="profile-segment" label="Customer segment" error={fieldErrors.segment} required>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as CustomerSegment)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
            >
              <option value="SALARIED">Salaried</option>
              <option value="SELF_EMPLOYED">Self-employed</option>
              <option value="STUDENT">Student</option>
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              id="profile-income"
              label="Monthly income (₹)"
              error={fieldErrors.monthlyIncome}
              required
            >
              <input
                type="number"
                min={0}
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value.replace(/[^0-9]/g, ''))}
                required
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
              />
            </Field>

            <Field
              id="profile-obligations"
              label="Existing monthly obligations (₹)"
              error={fieldErrors.existingMonthlyObligations}
              required
            >
              <input
                type="number"
                min={0}
                value={existingMonthlyObligations}
                onChange={(e) => setExistingMonthlyObligations(e.target.value.replace(/[^0-9]/g, ''))}
                required
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
              />
            </Field>
          </div>

          <Field id="profile-location" label="Location / City" error={fieldErrors.location}>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
              placeholder="e.g. Pune"
            />
          </Field>

          <div className="pt-2 flex justify-end">
            <Button type="submit" loading={updateMutation.isPending}>
              Save profile
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
