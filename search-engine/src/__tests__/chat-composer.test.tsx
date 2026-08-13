import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatComposer } from "@search/app/components/chat/ChatComposer";
import { COPY } from "@search/app/services/localization";

function renderComposer(overrides: Partial<React.ComponentProps<typeof ChatComposer>> = {}) {
  const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
  const setDraft = vi.fn();
  const onStop = vi.fn();

  render(
    <ChatComposer
      draft="Hello"
      setDraft={setDraft}
      onSubmit={onSubmit}
      onStop={onStop}
      canSubmit={true}
      cooldownSeconds={0}
      isStreaming={false}
      isRetrieving={false}
      uiText={COPY.en}
      {...overrides}
    />
  );

  return { onSubmit, setDraft, onStop };
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

  it("renders an icon send button in the ready state", () => {
    renderComposer();

    const button = screen.getByRole("button", { name: COPY.en.sendCta });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("type", "submit");
  });

  it("shows a busy, disabled send button while retrieving", () => {
    renderComposer({ isRetrieving: true, canSubmit: false });

    const button = screen.getByRole("button", { name: COPY.en.sendCta });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("swaps to a clickable stop button while streaming, wired to onStop", () => {
    const { onStop } = renderComposer({ isStreaming: true, canSubmit: false });

    const button = screen.getByRole("button", { name: COPY.en.stopGenerating });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("falls back to retry text during the rate-limit cooldown", () => {
    renderComposer({ cooldownSeconds: 12, canSubmit: false });

    const button = screen.getByRole("button", { name: COPY.en.retryCta(12) });
    expect(button).toBeDisabled();
  });
});
