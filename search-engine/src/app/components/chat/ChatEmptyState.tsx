import { motion } from "framer-motion";
import type { UIText } from "../../types/ui";
import { Button } from "../ui/Button";
import { BotIcon } from "../ui/icons";

type ChatEmptyStateProps = {
  uiText: UIText;
  canSubmit: boolean;
  onSuggestionClick: (prompt: string) => void;
};

export function ChatEmptyState({ uiText, canSubmit, onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center"
    >
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary"
      >
        <BotIcon className="size-6" />
      </span>

      <div>
        <p className="text-h3 font-semibold text-main">{uiText.emptyStateTitle}</p>
        <p className="mt-1 text-b4 text-medium-gray">{uiText.emptyStateSubtitle}</p>
      </div>

      <div className="flex max-w-md flex-wrap justify-center gap-2">
        {uiText.suggestionPrompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="secondary"
            disabled={!canSubmit}
            onClick={() => onSuggestionClick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
