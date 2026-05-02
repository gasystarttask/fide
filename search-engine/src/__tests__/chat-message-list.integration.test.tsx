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
        onCitationClick={onCitationClick}
        renderMessageWithCitations={renderMessageWithCitations}
        getMessageText={getMessageText}
      />
    );

    expect(screen.getByText(COPY.en.rateLimitTitle)).toBeTruthy();
    expect(screen.getByText(COPY.en.retrievingContext)).toBeTruthy();
    expect(screen.getByText(COPY.en.assistantStreaming)).toBeTruthy();
    expect(screen.getByText(COPY.en.roleUser)).toBeTruthy();
    expect(screen.getByText(COPY.en.roleAssistant)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "John 3:16" }));
    expect(onCitationClick).toHaveBeenCalledWith("John 3:16");
  });
});
