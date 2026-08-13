import type { FormEvent } from "react";
import type { UIText } from "../../types/ui";

type ChatComposerProps = {
  draft: string;
  setDraft: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canSubmit: boolean;
  cooldownSeconds: number;
  isStreaming: boolean;
  isRetrieving: boolean;
  uiText: UIText;
};

export function ChatComposer({
  draft,
  setDraft,
  onSubmit,
  canSubmit,
  cooldownSeconds,
  isStreaming,
  isRetrieving,
  uiText,
}: ChatComposerProps) {
  return (
    <form className="mt-4 shrink-0 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row" onSubmit={onSubmit}>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={uiText.inputPlaceholder}
        className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-alt px-3 py-2 text-b3 text-main outline-none placeholder:text-dark-gray ring-primary focus:ring"
      />
      <button
        type="submit"
        disabled={!canSubmit || !draft.trim()}
        className="rounded-lg bg-primary px-4 py-2 text-b3 font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-medium-gray"
      >
        {cooldownSeconds > 0
          ? uiText.retryCta(cooldownSeconds)
          : isStreaming || isRetrieving
            ? uiText.inProgressCta
            : uiText.sendCta}
      </button>
    </form>
  );
}
