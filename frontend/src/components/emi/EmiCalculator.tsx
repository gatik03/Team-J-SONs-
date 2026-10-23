import { useEffect, useState } from 'react';
import { useEmi } from '../../api/hooks/emi';
import { formatInr } from '../../lib/formatInr';
import { Money } from '../ui/Money';
import { Skeleton } from '../ui/Skeleton';
import { ErrorAlert } from '../ui/ErrorAlert';
import { EmiTable } from './EmiTable';

export interface EmiCalculatorProps {
  defaultPrincipal?: number;
  defaultRate?: number;
  defaultTenure?: number;
  rateBounds?: [number, number];
  tenureBounds?: [number, number];
}

const DEBOUNCE_MS = 300;

export function EmiCalculator({
  defaultPrincipal = 500000,
  defaultRate = 11,
  defaultTenure = 60,
  rateBounds = [0, 30],
  tenureBounds = [1, 360],
}: EmiCalculatorProps) {
  const [principalInput, setPrincipalInput] = useState<string>(String(defaultPrincipal));
  const [rateInput, setRateInput] = useState<string>(String(defaultRate));
  const [tenureInput, setTenureInput] = useState<string>(String(defaultTenure));

  const [debouncedParams, setDebouncedParams] = useState<{
    principal: number;
    annualRate: number;
    tenureMonths: number;
  } | null>(() => ({
    principal: defaultPrincipal,
    annualRate: defaultRate,
    tenureMonths: defaultTenure,
  }));

  const numPrincipal = Number(principalInput);
  const numRate = Number(rateInput);
  const numTenure = Number(tenureInput);

  const principalError =
    !principalInput || isNaN(numPrincipal) || numPrincipal <= 0
      ? 'Please enter a valid loan amount'
      : undefined;

  const rateError =
    !rateInput || isNaN(numRate) || numRate < rateBounds[0] || numRate > rateBounds[1]
      ? `Rate must be between ${rateBounds[0]}% and ${rateBounds[1]}%`
      : undefined;

  const tenureError =
    !tenureInput || isNaN(numTenure) || numTenure < tenureBounds[0] || numTenure > tenureBounds[1]
      ? `Tenure must be between ${tenureBounds[0]} and ${tenureBounds[1]} months`
      : undefined;

  const hasError = Boolean(principalError || rateError || tenureError);

  useEffect(() => {
    if (hasError) {
      setDebouncedParams(null);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedParams({
        principal: numPrincipal,
        annualRate: numRate,
        tenureMonths: numTenure,
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [principalInput, rateInput, tenureInput, hasError, numPrincipal, numRate, numTenure]);

  const { data: emiResult, isLoading, error } = useEmi(debouncedParams);

  return (
    <div className="bg-surface border border-border rounded-lg shadow-card p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Controls Column */}
        <div className="space-y-5">
          {/* Principal */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="emi-principal" className="text-sm font-medium text-fg">
                Loan amount
              </label>
              {!principalError && numPrincipal > 0 && (
                <span className="text-xs text-muted font-medium">
                  {formatInr(numPrincipal)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted font-semibold">₹</span>
              <input
                id="emi-principal"
                type="number"
                value={principalInput}
                onChange={(e) => setPrincipalInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full pl-8 pr-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring font-medium"
                min={1}
              />
            </div>
            {principalError && (
              <p className="text-xs text-danger font-medium" role="alert">
                {principalError}
              </p>
            )}
          </div>

          {/* Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="emi-rate" className="text-sm font-medium text-fg">
                Interest rate (% p.a.)
              </label>
              <span className="text-sm font-semibold text-fg">{rateInput}%</span>
            </div>
            <input
              id="emi-rate-slider"
              type="range"
              min={rateBounds[0]}
              max={rateBounds[1]}
              step="0.1"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="w-full accent-primary cursor-pointer focus-ring"
              aria-label="Interest rate slider"
            />
            <input
              id="emi-rate"
              type="number"
              step="0.1"
              min={rateBounds[0]}
              max={rateBounds[1]}
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-fg focus-ring"
            />
            {rateError && (
              <p className="text-xs text-danger font-medium" role="alert">
                {rateError}
              </p>
            )}
          </div>

          {/* Tenure */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="emi-tenure" className="text-sm font-medium text-fg">
                Tenure (months)
              </label>
              <span className="text-sm font-semibold text-fg">{tenureInput} months</span>
            </div>
            <input
              id="emi-tenure-slider"
              type="range"
              min={tenureBounds[0]}
              max={tenureBounds[1]}
              value={tenureInput}
              onChange={(e) => setTenureInput(e.target.value)}
              className="w-full accent-primary cursor-pointer focus-ring"
              aria-label="Tenure slider"
            />
            <input
              id="emi-tenure"
              type="number"
              min={tenureBounds[0]}
              max={tenureBounds[1]}
              value={tenureInput}
              onChange={(e) => setTenureInput(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-surface text-fg focus-ring"
            />
            {tenureError && (
              <p className="text-xs text-danger font-medium" role="alert">
                {tenureError}
              </p>
            )}
          </div>
        </div>

        {/* Results Column */}
        <div className="bg-surface-2 p-6 rounded-lg space-y-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
              Estimated Monthly EMI
            </span>

            {isLoading && <Skeleton className="h-12 w-48 my-2" />}

            {!isLoading && emiResult && (
              <div className="text-display font-bold text-primary">
                <Money amount={emiResult.emi} />
                <span className="text-xs font-normal text-muted ml-2">/ month</span>
              </div>
            )}

            {!isLoading && !emiResult && !hasError && (
              <div className="text-display font-bold text-muted">—</div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
              <div>
                <span className="text-xs text-muted block">Total Interest</span>
                <span className="text-h3 font-semibold text-fg">
                  {isLoading ? <Skeleton className="h-6 w-24" /> : <Money amount={emiResult?.totalInterest} />}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted block">Total Payment (P + I)</span>
                <span className="text-h3 font-semibold text-fg">
                  {isLoading ? <Skeleton className="h-6 w-28" /> : <Money amount={emiResult?.totalPayment} />}
                </span>
              </div>
            </div>
          </div>

          {error && <ErrorAlert error={error} />}
        </div>
      </div>

      {/* Amortization Schedule Accordion */}
      {emiResult && emiResult.schedule && (
        <details className="mt-4 group border border-border rounded-lg bg-surface">
          <summary className="px-5 py-3 cursor-pointer text-sm font-semibold text-fg flex items-center justify-between hover:bg-surface-2 rounded-lg focus-ring">
            <span>Amortization schedule ({emiResult.schedule.length} months)</span>
            <span className="text-xs text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-5 border-t border-border">
            <EmiTable schedule={emiResult.schedule} />
          </div>
        </details>
      )}
    </div>
  );
}
