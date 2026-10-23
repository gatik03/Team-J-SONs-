import { useEffect } from 'react';
import { useProfile } from '../../../api/hooks/customers';
import { Field } from '../../ui/Field';

export interface StepEmploymentProps {
  employmentType?: string;
  monthlyIncome?: number;
  existingMonthlyObligations?: number;
  errors?: Record<string, string>;
  onChange: (patch: {
    employmentType?: string;
    monthlyIncome?: number;
    existingMonthlyObligations?: number;
  }) => void;
}

export function StepEmployment({
  employmentType,
  monthlyIncome,
  existingMonthlyObligations,
  errors = {},
  onChange,
}: StepEmploymentProps) {
  const { data: profile } = useProfile();

  useEffect(() => {
    if (profile) {
      const patch: {
        employmentType?: string;
        monthlyIncome?: number;
        existingMonthlyObligations?: number;
      } = {};

      if (!employmentType && profile.employmentType) {
        patch.employmentType = profile.employmentType;
      }
      if (monthlyIncome === undefined && profile.monthlyIncome !== undefined) {
        patch.monthlyIncome = profile.monthlyIncome;
      }
      if (
        existingMonthlyObligations === undefined &&
        profile.existingMonthlyObligations !== undefined
      ) {
        patch.existingMonthlyObligations = profile.existingMonthlyObligations;
      }

      if (Object.keys(patch).length > 0) {
        onChange(patch);
      }
    }
  }, [profile]);

  return (
    <div className="space-y-4">
      <Field
        id="step-employment-type"
        label="Employment type / Occupation"
        error={errors.employmentType}
        required
      >
        <input
          type="text"
          value={employmentType ?? ''}
          onChange={(e) => onChange({ employmentType: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
          placeholder="e.g. Private sector salaried"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="step-monthly-income"
          label="Net monthly income (₹)"
          error={errors.monthlyIncome}
          required
        >
          <input
            type="number"
            min={0}
            value={monthlyIncome ?? ''}
            onChange={(e) =>
              onChange({ monthlyIncome: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
            placeholder="e.g. 60000"
          />
        </Field>

        <Field
          id="step-obligations"
          label="Existing monthly EMI / loan obligations (₹)"
          error={errors.existingMonthlyObligations}
          required
        >
          <input
            type="number"
            min={0}
            value={existingMonthlyObligations ?? ''}
            onChange={(e) =>
              onChange({
                existingMonthlyObligations: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-sm"
            placeholder="e.g. 8000"
          />
        </Field>
      </div>
    </div>
  );
}
