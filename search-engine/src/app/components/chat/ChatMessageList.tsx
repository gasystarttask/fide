import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage, RenderMessageWithCitations, UIText } from "../../types/ui";

type ChatMessageListProps = {
  cooldownSeconds: number;
  uiText: UIText;
  messages: ChatMessage[];
  isRetrieving: boolean;
  isStreaming: boolean;
  errorMessage?: string;
  onCitationClick: (reference: string) => void;
  renderMessageWithCitations: RenderMessageWithCitations;
  getMessageText: (message: { parts?: { type?: string; text?: string }[]; content?: string }) => string;
};

export function ChatMessageList({
  cooldownSeconds,
  uiText,
  messages,
  isRetrieving,
  isStreaming,
  errorMessage,
  onCitationClick,
  renderMessageWithCitations,
  getMessageText,
}: ChatMessageListProps) {
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

          return (
            <motion.article
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`rounded-xl border p-3 ${bubbleClass}`}
            >
              <p className="mb-1 text-b4 font-medium uppercase tracking-wide text-medium-gray">
                {isAssistant ? uiText.roleAssistant : uiText.roleUser}
              </p>
              <p className="whitespace-pre-wrap wrap-break-word text-b3 leading-7 text-main">
                {isAssistant ? renderMessageWithCitations(text, onCitationClick) : text}
              </p>
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
