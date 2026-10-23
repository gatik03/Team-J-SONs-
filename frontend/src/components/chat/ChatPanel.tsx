import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { AiTag } from '../ui/AiTag';
import { Button } from '../ui/Button';
import { ErrorAlert } from '../ui/ErrorAlert';
import { ApiError } from '../../api/client';

const USER_BUBBLE = 'bg-primary text-white';
const ASSISTANT_BUBBLE = 'bg-surface-2 text-fg';

export interface ChatMessage<T = unknown> {
  id: string;
  sender: 'user' | 'assistant';
  content?: string;
  data?: T;
  timestamp: string;
  error?: unknown;
}

export interface ChatPanelProps<T = unknown> {
  messages: ChatMessage<T>[];
  onSend: (text: string) => void;
  onRetry?: (message: ChatMessage<T>) => void;
  pending: boolean;
  renderAssistant: (msg: ChatMessage<T>) => React.ReactNode;
  disclaimer: string;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

export function ChatPanel<T = unknown>({
  messages,
  onSend,
  onRetry,
  pending,
  renderAssistant,
  disclaimer,
  placeholder = 'Type your message...',
  suggestions = [],
  className = '',
}: ChatPanelProps<T>) {
  const [input, setInput] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || pending) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={`bg-surface border border-border rounded-lg shadow-card flex flex-col h-[640px] max-h-[85vh] ${className}`}
    >
      {/* Messages Scroll Area */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4"
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center p-6 text-muted text-sm">
            Ask a question or select one of the suggested prompts below to get started.
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className={`${USER_BUBBLE} max-w-[80%] md:max-w-[640px] rounded-lg px-4 py-2.5 shadow-card text-sm`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span className="text-[10px] opacity-75 block text-right mt-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          }

          // Assistant Message
          const isAiUnavailable =
            msg.error instanceof ApiError && msg.error.status === 503;

          return (
            <div key={msg.id} className="flex justify-start">
              <div className={`${ASSISTANT_BUBBLE} max-w-[85%] md:max-w-[640px] rounded-lg p-4 border border-border shadow-card text-sm space-y-2`}>
                <div className="flex items-center gap-2 mb-1">
                  <AiTag />
                  <span className="text-[10px] text-muted">{msg.timestamp}</span>
                </div>

                {msg.error ? (
                  <div className="space-y-2">
                    {isAiUnavailable ? (
                      <div className="space-y-2">
                        <p className="text-danger text-sm font-medium">
                          The AI service is unavailable. Try again in a moment.
                        </p>
                        {onRetry && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onRetry(msg)}
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    ) : (
                      <ErrorAlert error={msg.error} />
                    )}
                  </div>
                ) : (
                  renderAssistant(msg)
                )}
              </div>
            </div>
          );
        })}

        {pending && (
          <div className="flex justify-start">
            <div className="bg-surface-2 text-fg rounded-lg p-3 border border-border flex items-center gap-2">
              <AiTag />
              <div className="flex items-center gap-1.5 text-muted text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-surface-2/50 flex flex-wrap gap-1.5 overflow-x-auto">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSend(suggestion)}
              disabled={pending}
              className="px-2.5 py-1 text-xs rounded-full bg-surface border border-border hover:bg-surface-2 text-muted hover:text-fg transition-colors focus-ring cursor-pointer text-left truncate max-w-full"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Composer Input */}
      <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t border-border bg-surface">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="chat-message-input" className="sr-only">
              Message
            </label>
            <textarea
              id="chat-message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={2}
              disabled={pending}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-fg focus-ring resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={pending || !input.trim()}
            className="h-10 px-4"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Send
          </Button>
        </div>

        <p className="text-[11px] text-muted text-center mt-2">{disclaimer}</p>
      </form>
    </div>
  );
}
