import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage, RenderMessageWithCitations, UIText } from "../types";

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
          className="rounded-xl border border-red-200 bg-red-50 p-3"
        >
          <p className="text-sm font-medium text-red-800">{uiText.rateLimitTitle}</p>
          <p className="mt-1 text-sm text-red-700">{uiText.rateLimitRetry(cooldownSeconds)}</p>
        </motion.div>
      ) : null}

      <AnimatePresence initial={false}>
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";
          const bubbleClass = isAssistant
            ? "border-indigo-200 bg-indigo-50"
            : "border-stone-300 bg-stone-100";
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
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                {isAssistant ? uiText.roleAssistant : uiText.roleUser}
              </p>
              <p className="whitespace-pre-wrap wrap-break-word leading-7">
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
          className="rounded-xl border border-indigo-200 bg-indigo-50 p-3"
        >
          <p className="text-sm font-medium text-indigo-900">{uiText.retrievingContext}</p>
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-indigo-200" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-indigo-100" />
        </motion.div>
      ) : null}

      {isStreaming ? <p className="text-xs text-stone-500">{uiText.assistantStreaming}</p> : null}

      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}
    </div>
  );
}
