import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage, RenderMessageWithCitations, UIText } from "../../types/ui";
import { Button } from "../ui/Button";
import { BotIcon, ThumbsDownIcon, ThumbsUpIcon, UserIcon } from "../ui/icons";
import { ChatEmptyState } from "./ChatEmptyState";

type ChatMessageListProps = {
  cooldownSeconds: number;
  uiText: UIText;
  messages: ChatMessage[];
  isRetrieving: boolean;
  isStreaming: boolean;
  canSubmit: boolean;
  errorMessage?: string;
  onCitationClick: (reference: string) => void;
  onSuggestionClick: (prompt: string) => void;
  renderMessageWithCitations: RenderMessageWithCitations;
  getMessageText: (message: { parts?: { type?: string; text?: string }[]; content?: string }) => string;
};

type FeedbackValue = "up" | "down";

export function ChatMessageList({
  cooldownSeconds,
  uiText,
  messages,
  isRetrieving,
  isStreaming,
  canSubmit,
  errorMessage,
  onCitationClick,
  onSuggestionClick,
  renderMessageWithCitations,
  getMessageText,
}: ChatMessageListProps) {
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<Record<string, FeedbackValue>>({});

  function toggleFeedback(messageId: string, value: FeedbackValue) {
    setFeedbackByMessageId((current) => {
      const next = { ...current };
      if (next[messageId] === value) {
        delete next[messageId];
      } else {
        next[messageId] = value;
      }
      return next;
    });
  }

  if (messages.length === 0 && !isRetrieving && !isStreaming && cooldownSeconds === 0 && !errorMessage) {
    return (
      <div className="h-full">
        <ChatEmptyState uiText={uiText} canSubmit={canSubmit} onSuggestionClick={onSuggestionClick} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cooldownSeconds > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-danger/30 bg-danger/10 p-3"
        >
          <p className="text-b4 font-medium text-danger">{uiText.rateLimitTitle}</p>
          <p className="mt-1 text-b4 text-danger/90">{uiText.rateLimitRetry(cooldownSeconds)}</p>
        </motion.div>
      ) : null}

      <AnimatePresence initial={false}>
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";
          const bubbleClass = isAssistant
            ? "border-primary/25 bg-surface-alt"
            : "border-border bg-surface";
          const text = getMessageText(message);
          const feedback = feedbackByMessageId[message.id];

          return (
            <motion.article
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2"
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                  isAssistant ? "bg-primary/15 text-primary" : "bg-surface-alt text-medium-gray"
                }`}
              >
                {isAssistant ? <BotIcon className="size-4" /> : <UserIcon className="size-4" />}
              </span>

              <div className={`min-w-0 flex-1 rounded-xl border p-3 ${bubbleClass}`}>
                <p className="mb-1 text-b4 font-medium uppercase tracking-wide text-medium-gray">
                  {isAssistant ? uiText.roleAssistant : uiText.roleUser}
                </p>
                <div className="wrap-break-word text-b3 leading-7 text-main">
                  {isAssistant ? (
                    renderMessageWithCitations(text, onCitationClick)
                  ) : (
                    <p className="whitespace-pre-wrap">{text}</p>
                  )}
                </div>

                {isAssistant && text ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant={feedback === "up" ? "ghost" : "secondary"}
                      tone="primary"
                      size="sm"
                      aria-pressed={feedback === "up"}
                      aria-label={uiText.feedbackHelpful}
                      onClick={() => toggleFeedback(message.id, "up")}
                    >
                      <ThumbsUpIcon className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant={feedback === "down" ? "ghost" : "secondary"}
                      tone="primary"
                      size="sm"
                      aria-pressed={feedback === "down"}
                      aria-label={uiText.feedbackNotHelpful}
                      onClick={() => toggleFeedback(message.id, "down")}
                    >
                      <ThumbsDownIcon className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>

      {isRetrieving ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-primary/25 bg-surface-alt p-3"
        >
          <p className="text-b4 font-medium text-light-gray">{uiText.retrievingContext}</p>
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-primary/20" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-primary/10" />
        </motion.div>
      ) : null}

      {isStreaming ? <p className="text-b4 text-dark-gray">{uiText.assistantStreaming}</p> : null}

      {errorMessage ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-2 text-b4 text-danger">{errorMessage}</p>
      ) : null}
    </div>
  );
}
