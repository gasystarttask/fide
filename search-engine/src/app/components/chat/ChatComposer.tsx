import type { FormEvent } from "react";
import type { UIText } from "../types";

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
    <form className="mt-4 shrink-0 flex flex-col gap-2 border-t border-stone-200 pt-4 sm:flex-row" onSubmit={onSubmit}>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={uiText.inputPlaceholder}
        className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 outline-none ring-indigo-400 focus:ring"
      />
      <button
        type="submit"
        disabled={!canSubmit || !draft.trim()}
        className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-stone-400"
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
