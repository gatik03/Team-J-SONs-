import { useState } from 'react';
import { useAdvisorChat } from '../api/hooks/advisor';
import type { AdvisorResponse } from '../api/types';
import { ChatPanel, type ChatMessage } from '../components/chat/ChatPanel';
import { RecommendationCard } from '../components/advisor/RecommendationCard';
import { Money } from '../components/ui/Money';

export function AdvisorPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage<AdvisorResponse>[]>([]);
  const chatMutation = useAdvisorChat();

  const handleSend = (text: string) => {
    const userMsg: ChatMessage<AdvisorResponse> = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);

    chatMutation.mutate(
      { message: text, conversationId },
      {
        onSuccess: (res) => {
          if (res.conversationId) {
            setConversationId(res.conversationId);
          }
          const assistantMsg: ChatMessage<AdvisorResponse> = {
            id: `msg-${Date.now()}-assistant`,
            sender: 'assistant',
            data: res,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        },
        onError: (err) => {
          const errorMsg: ChatMessage<AdvisorResponse> = {
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

  const handleRetry = (msg: ChatMessage<AdvisorResponse>) => {
    // Find preceding user message
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx > 0 && messages[idx - 1].sender === 'user' && messages[idx - 1].content) {
      handleSend(messages[idx - 1].content!);
    }
  };

  const renderAssistant = (msg: ChatMessage<AdvisorResponse>) => {
    const res = msg.data;
    if (!res) return null;

    if (res.clarifyingQuestion) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-fg leading-relaxed">{res.clarifyingQuestion}</p>
          <p className="text-[11px] text-muted border-t border-border pt-2 italic">
            {res.disclaimer}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-fg">
            Understood: <span className="italic">{res.interpretedRequirement}</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2.5 py-1 rounded bg-surface border border-border text-xs text-muted">
              Amount: <Money amount={res.loanAmount} />
            </span>
            <span className="px-2.5 py-1 rounded bg-surface border border-border text-xs text-muted">
              Monthly income: <Money amount={res.monthlyIncome} />
            </span>
            <span className="px-2.5 py-1 rounded bg-surface border border-border text-xs text-muted">
              Max EMI: <Money amount={res.maxPreferredEmi} />
            </span>
          </div>
        </div>

        {res.recommendations.length > 0 && (
          <div className="space-y-3">
            {res.recommendations.map((rec) => (
              <RecommendationCard key={rec.productId} rec={rec} />
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted border-t border-border pt-2 italic">
          {res.disclaimer}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 font-bold text-fg">Loan Advisor</h1>
        <p className="text-sm text-muted">
          Tell us about your loan requirements, monthly income, or budget in natural language to get tailored recommendations.
        </p>
      </div>

      <ChatPanel
        messages={messages}
        onSend={handleSend}
        onRetry={handleRetry}
        pending={chatMutation.isPending}
        renderAssistant={renderAssistant}
        disclaimer="AI recommendations are indicative only. Final approval is subject to credit assessment."
        suggestions={[
          'I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000.',
          'I want a home loan of ₹40 lakh for 20 years. My monthly salary is ₹90,000.',
        ]}
      />
    </div>
  );
}
