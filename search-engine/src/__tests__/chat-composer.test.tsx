import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatComposer } from "@search/app/components/chat/ChatComposer";
import { COPY } from "@search/app/services/localization";

function renderComposer(overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {}) {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
  const setDraft = vi.fn();

  render(
    <ChatComposer
      draft="Hello"
      setDraft={setDraft}
      onSubmit={onSubmit}
      canSubmit={true}
      cooldownSeconds={0}
      isStreaming={false}
      isRetrieving={false}
      uiText={COPY.en}
      {...overrides}
    />
  );

  return { onSubmit, setDraft };
}

describe("ChatComposer", () => {
  it("submits the form when Enter is pressed without Shift", () => {
    const { onSubmit } = renderComposer();
    const textarea = screen.getByPlaceholderText(COPY.en.inputPlaceholder);

    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not submit and lets Shift+Enter insert a newline", () => {
    const { onSubmit } = renderComposer();
    const textarea = screen.getByPlaceholderText(COPY.en.inputPlaceholder);

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a busy send button while streaming", () => {
    renderComposer({ isStreaming: true, canSubmit: false });

    const button = screen.getByRole("button", { name: COPY.en.inProgressCta });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });
});
