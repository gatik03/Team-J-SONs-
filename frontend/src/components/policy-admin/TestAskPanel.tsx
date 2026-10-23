import React, { useEffect, useState } from 'react';
import type { PolicyAnswer, PolicyVersion } from '../../api/types';
import { useTestAsk } from '../../api/hooks/policyAdmin';
import { AiTag } from '../ui/AiTag';
import { ConfidenceBadge } from '../chat/ConfidenceBadge';
import { SourceChip } from '../chat/SourceChip';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Info } from 'lucide-react';

export interface TestAskPanelProps {
  version: PolicyVersion;
}

export function TestAskPanel({ version }: TestAskPanelProps) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<PolicyAnswer | null>(null);

  const testAskMutation = useTestAsk(version.documentId);

  // Clear result when version changes
  useEffect(() => {
    setResult(null);
  }, [version.documentId]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    testAskMutation.mutate(
      { question: question.trim() },
      {
        onSuccess: (data) => setResult(data),
      }
    );
  };

  const suggestion = 'Can I foreclose my vehicle loan after six months, and are there any charges?';

  return (
    <div className="border border-border rounded-lg bg-surface p-5 space-y-4 shadow-card">
      <div>
        <h3 className="text-sm font-bold text-fg">Test-Ask This Version</h3>
        <p className="text-xs text-muted">
          Searches only v{version.version} ({version.servingState}). Customers do not see this answer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a test question against this version..."
            className="flex-1 px-3 py-2 border border-border rounded-md bg-surface text-fg focus-ring text-xs"
            aria-label="Test question"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!question.trim() || testAskMutation.isPending}
            loading={testAskMutation.isPending}
          >
            Ask this version
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setQuestion(suggestion)}
          className="text-left text-[11px] text-muted hover:text-fg bg-surface-2 px-2.5 py-1 rounded border border-border focus-ring"
        >
          Suggested: "{suggestion}"
        </button>
      </form>

      {testAskMutation.error && <ErrorAlert error={testAskMutation.error} />}

      {result && (
        <div className="mt-4 p-4 rounded-lg bg-surface-2 border border-border space-y-3">
          <div className="flex items-center gap-2">
            <AiTag />
            <span className="text-xs font-semibold text-fg">Isolated Test Answer</span>
          </div>

          <p className="text-xs text-fg leading-relaxed whitespace-pre-wrap">{result.answer}</p>

          {result.followUpRequired && (
            <div className="flex items-center gap-2 p-2 rounded bg-info-soft text-info text-xs">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Please confirm with a Kestrel Bank officer before acting on this.</span>
            </div>
          )}

          <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
            <ConfidenceBadge confidence={result.confidence} />
            <div className="flex flex-wrap gap-1.5">
              {result.sources.map((src, idx) => (
                <SourceChip key={idx} source={src} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
