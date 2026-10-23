import { useState } from 'react';
import { usePolicyAsk } from '../api/hooks/policy';
import type { CustomerSegmentOrAll, LoanTypeOrAll, PolicyAnswer } from '../api/types';
import { ChatPanel, type ChatMessage } from '../components/chat/ChatPanel';
import { ConfidenceBadge } from '../components/chat/ConfidenceBadge';
import { SourceChip } from '../components/chat/SourceChip';
import { Info } from 'lucide-react';

const SUGGESTIONS = [
  'What documents do I need for a home loan if I am self-employed?',
  'What is the processing fee for a personal loan of ₹3 lakh?',
  'Can I foreclose my vehicle loan after six months, and are there any charges?',
  'What is the minimum credit score required for a home loan?',
  'How long does disbursal take after approval?',
];

export function PolicyPage() {
  const [loanType, setLoanType] = useState<LoanTypeOrAll>('ALL');
  const [segment, setSegment] = useState<CustomerSegmentOrAll>('ALL');
  const [messages, setMessages] = useState<ChatMessage<PolicyAnswer>[]>([]);
  const askMutation = usePolicyAsk();

  const handleSend = (text: string) => {
    const userMsg: ChatMessage<PolicyAnswer> = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    askMutation.mutate(
      {
        question: text,
        loanType: loanType === 'ALL' ? undefined : loanType,
        customerSegment: segment === 'ALL' ? undefined : segment,
      },
      {
        onSuccess: (res) => {
          const assistantMsg: ChatMessage<PolicyAnswer> = {
            id: `msg-${Date.now()}-assistant`,
            sender: 'assistant',
            data: res,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        },
        onError: (err) => {
          const errorMsg: ChatMessage<PolicyAnswer> = {
            id: `msg-${Date.now()}-error`,
            sender: 'assistant',
            error: err,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, errorMsg]);
        },
      }
    );
  };

  const handleRetry = (msg: ChatMessage<PolicyAnswer>) => {
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx > 0 && messages[idx - 1].sender === 'user' && messages[idx - 1].content) {
      handleSend(messages[idx - 1].content!);
    }
  };

  const renderAssistant = (msg: ChatMessage<PolicyAnswer>) => {
    const res = msg.data;
    if (!res) return null;

    return (
      <div className="space-y-3">
        <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">{res.answer}</p>

        {res.followUpRequired && (
          <div className="flex items-center gap-2 p-2 rounded bg-info-soft text-info text-xs">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Please confirm with a Kestrel Bank officer before acting on this.</span>
          </div>
        )}

        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex items-center justify-between">
            <ConfidenceBadge confidence={res.confidence} />
            {res.sources.length === 0 && (
              <span className="text-xs text-muted">No approved source found.</span>
            )}
          </div>

          {res.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {res.sources.map((src, i) => (
                <SourceChip key={i} source={src} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-fg">Policy Assistant</h1>
          <p className="text-sm text-muted">
            Ask questions about Kestrel Bank loan policies, fee schedules, foreclosure rules, and KYC requirements.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <label htmlFor="policy-filter-loan-type" className="sr-only">
            Filter by Loan Type
          </label>
          <select
            id="policy-filter-loan-type"
            value={loanType}
            onChange={(e) => setLoanType(e.target.value as LoanTypeOrAll)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-fg focus-ring"
          >
            <option value="ALL">All loan types</option>
            <option value="PERSONAL">Personal</option>
            <option value="HOME">Home</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="EDUCATION">Education</option>
          </select>

          <label htmlFor="policy-filter-segment" className="sr-only">
            Filter by Segment
          </label>
          <select
            id="policy-filter-segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value as CustomerSegmentOrAll)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-fg focus-ring"
          >
            <option value="ALL">All segments</option>
            <option value="SALARIED">Salaried</option>
            <option value="SELF_EMPLOYED">Self-employed</option>
            <option value="STUDENT">Student</option>
          </select>
        </div>
      </div>

      <ChatPanel
        messages={messages}
        onSend={handleSend}
        onRetry={handleRetry}
        pending={askMutation.isPending}
        renderAssistant={renderAssistant}
        disclaimer="Answers come only from Kestrel Bank approved documents."
        placeholder="e.g. Can I foreclose my vehicle loan after six months?"
        suggestions={SUGGESTIONS}
      />
    </div>
  );
}
