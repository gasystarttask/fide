import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ChatMessageList } from "@search/app/components/chat/ChatMessageList";
import { COPY } from "@search/app/services/localization";
import { getMessageText, renderMessageWithCitations } from "@search/app/services/messageFormatting";

describe("ChatMessageList integration", () => {
  it("renders stream states, messages, and citation interaction", () => {
    const onCitationClick = vi.fn();

    render(
      <ChatMessageList
        cooldownSeconds={5}
        uiText={COPY.en}
        messages={[
          { id: "u1", role: "user", content: "Who is Jesus?" },
          { id: "a1", role: "assistant", content: "See [John 3:16]." },
        ]}
        isRetrieving={true}
        isStreaming={true}
        canSubmit={false}
        onCitationClick={onCitationClick}
        onSuggestionClick={vi.fn()}
        renderMessageWithCitations={renderMessageWithCitations}
        getMessageText={getMessageText}
      />
    );

    expect(screen.getByText(COPY.en.rateLimitTitle)).toBeInTheDocument();
    expect(screen.getByText(COPY.en.retrievingContext)).toBeInTheDocument();
    expect(screen.getByText(COPY.en.assistantStreaming)).toBeInTheDocument();
    expect(screen.getByText(COPY.en.roleUser)).toBeInTheDocument();
    expect(screen.getByText(COPY.en.roleAssistant)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "John 3:16" }));
    expect(onCitationClick).toHaveBeenCalledWith("John 3:16");
  });

  it("toggles thumbs up/down feedback per message without affecting other messages", () => {
    render(
      <ChatMessageList
        cooldownSeconds={0}
        uiText={COPY.en}
        messages={[
          { id: "a1", role: "assistant", content: "First answer." },
          { id: "a2", role: "assistant", content: "Second answer." },
        ]}
        isRetrieving={false}
        isStreaming={false}
        canSubmit={true}
        onCitationClick={vi.fn()}
        onSuggestionClick={vi.fn()}
        renderMessageWithCitations={renderMessageWithCitations}
        getMessageText={getMessageText}
      />
    );

    const helpfulButtons = screen.getAllByRole("button", { name: COPY.en.feedbackHelpful });
    const notHelpfulButtons = screen.getAllByRole("button", { name: COPY.en.feedbackNotHelpful });

    expect(helpfulButtons[0]).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(helpfulButtons[0]);
    expect(helpfulButtons[0]).toHaveAttribute("aria-pressed", "true");
    expect(notHelpfulButtons[0]).toHaveAttribute("aria-pressed", "false");
    expect(helpfulButtons[1]).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(notHelpfulButtons[0]);
    expect(helpfulButtons[0]).toHaveAttribute("aria-pressed", "false");
    expect(notHelpfulButtons[0]).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(notHelpfulButtons[0]);
    expect(notHelpfulButtons[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("shows the empty state with suggestion chips when there are no messages yet", () => {
    const onSuggestionClick = vi.fn();

    render(
      <ChatMessageList
        cooldownSeconds={0}
        uiText={COPY.en}
        messages={[]}
        isRetrieving={false}
        isStreaming={false}
        canSubmit={true}
        onCitationClick={vi.fn()}
        onSuggestionClick={onSuggestionClick}
        renderMessageWithCitations={renderMessageWithCitations}
        getMessageText={getMessageText}
      />
    );

    expect(screen.getByText(COPY.en.emptyStateTitle)).toBeInTheDocument();

    const firstPrompt = COPY.en.suggestionPrompts[0];
    fireEvent.click(screen.getByRole("button", { name: firstPrompt }));
    expect(onSuggestionClick).toHaveBeenCalledWith(firstPrompt);
  });

  it("hides the empty state once a message or in-flight request exists", () => {
    const { rerender } = render(
      <ChatMessageList
        cooldownSeconds={0}
        uiText={COPY.en}
        messages={[]}
        isRetrieving={true}
        isStreaming={false}
        canSubmit={false}
        onCitationClick={vi.fn()}
        onSuggestionClick={vi.fn()}
        renderMessageWithCitations={renderMessageWithCitations}
        getMessageText={getMessageText}
      />
    );

    expect(screen.queryByText(COPY.en.emptyStateTitle)).not.toBeInTheDocument();

    rerender(
      <ChatMessageList
        cooldownSeconds={0}
        uiText={COPY.en}
        messages={[{ id: "u1", role: "user", content: "Who is Jesus?" }]}
        isRetrieving={false}
        isStreaming={false}
        canSubmit={true}
        onCitationClick={vi.fn()}
        onSuggestionClick={vi.fn()}
        renderMessageWithCitations={renderMessageWithCitations}
        getMessageText={getMessageText}
      />
    );

    expect(screen.queryByText(COPY.en.emptyStateTitle)).not.toBeInTheDocument();
  });
});
