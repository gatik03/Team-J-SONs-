import { Check } from 'lucide-react';

export interface FormStepperProps {
  steps: string[];
  current: number; // 1-indexed
  completed: number[];
  onJump: (step: number) => void;
}

export function FormStepper({ steps, current, completed, onJump }: FormStepperProps) {
  const total = steps.length;
  const progressPercent = Math.round((current / total) * 100);

  return (
    <div className="space-y-3">
      {/* Mobile view */}
      <div className="md:hidden space-y-1.5">
        <div className="flex justify-between items-center text-xs font-semibold text-fg">
          <span>
            Step {current} of {total}: {steps[current - 1]}
          </span>
          <span className="text-muted">{progressPercent}%</span>
        </div>
        <div className="w-full bg-border h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Desktop view */}
      <ol className="hidden md:flex items-center w-full justify-between gap-2 border-b border-border pb-4">
        {steps.map((title, idx) => {
          const stepNum = idx + 1;
          const isCurrent = stepNum === current;
          const isCompleted = completed.includes(stepNum);

          return (
            <li key={stepNum} className="flex-1 flex items-center">
              {isCompleted ? (
                <button
                  type="button"
                  onClick={() => onJump(stepNum)}
                  className="flex items-center gap-2 group text-left focus-ring rounded-md p-1 cursor-pointer"
                >
                  <span className="w-7 h-7 rounded-full bg-success text-white flex items-center justify-center text-xs font-bold">
                    <Check className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-medium text-fg group-hover:text-primary">
                    {title}
                  </span>
                </button>
              ) : (
                <div
                  className="flex items-center gap-2 p-1"
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCurrent
                        ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                        : 'bg-n200 dark:bg-n700 text-muted'
                    }`}
                  >
                    {stepNum}
                  </span>
                  <span
                    className={`text-xs ${
                      isCurrent ? 'font-bold text-primary' : 'font-medium text-muted'
                    }`}
                  >
                    {title}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
