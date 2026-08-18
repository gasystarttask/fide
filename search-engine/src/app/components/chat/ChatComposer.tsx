import { useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import type { UIText } from "../../types/ui";
import { Button } from "../ui/Button";
import { SendIcon, StopIcon } from "../ui/icons";

type ChatComposerProps = {
  draft: string;
  setDraft: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
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
  onStop,
  canSubmit,
  cooldownSeconds,
  isStreaming,
  isRetrieving,
  uiText,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const isCoolingDown = cooldownSeconds > 0;

  return (
    <form className="mt-4 flex shrink-0 items-end gap-2 border-t border-border pt-4" onSubmit={onSubmit}>
      <div className="flex min-w-0 flex-1 items-end rounded-2xl border border-border-strong bg-surface-alt px-3 py-2 transition-colors focus-within:border-accent">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={uiText.inputPlaceholder}
          rows={1}
          className="scrollbar-styled max-h-32 flex-1 resize-none bg-transparent text-b3 text-main outline-none placeholder:text-dark-gray"
        />
      </div>

      {isCoolingDown ? (
        <Button type="submit" disabled>
          {uiText.retryCta(cooldownSeconds)}
        </Button>
      ) : isStreaming ? (
        <Button type="button" aria-label={uiText.stopGenerating} onClick={onStop}>
          <StopIcon className="size-4" />
        </Button>
      ) : (
        <Button
          type="submit"
          aria-label={uiText.sendCta}
          disabled={!canSubmit || !draft.trim()}
          loading={isRetrieving}
        >
          <SendIcon className="size-4" />
        </Button>
      )}
    </form>
  );
}
