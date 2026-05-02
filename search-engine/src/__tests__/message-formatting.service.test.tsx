import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { getMessageText, renderMessageWithCitations } from "@search/app/services/messageFormatting";

describe("message formatting service", () => {
  it("gets text from content and text parts", () => {
    expect(getMessageText({ content: "plain content" })).toBe("plain content");
    expect(
      getMessageText({
        parts: [
          { type: "text", text: "Hello" },
          { type: "reasoning", text: "hidden" },
          { type: "text", text: " world" },
        ],
      })
    ).toBe("Hello world");
  });

  it("renders clickable citations and forwards selected references", () => {
    const onCitationClick = vi.fn();
    const text = "See [John 3:16; Romans 8:28] and (Genesis 1:1).";

    render(<div>{renderMessageWithCitations(text, onCitationClick)}</div>);

    fireEvent.click(screen.getByRole("button", { name: "John 3:16" }));
    fireEvent.click(screen.getByRole("button", { name: "Romans 8:28" }));
    fireEvent.click(screen.getByRole("button", { name: "Genesis 1:1" }));

    expect(onCitationClick).toHaveBeenCalledTimes(3);
    expect(onCitationClick).toHaveBeenNthCalledWith(1, "John 3:16");
    expect(onCitationClick).toHaveBeenNthCalledWith(2, "Romans 8:28");
    expect(onCitationClick).toHaveBeenNthCalledWith(3, "Genesis 1:1");
  });

  it("renders text wrapped in double-stars as bold", () => {
    render(<div>{renderMessageWithCitations("This is **important** text.", vi.fn())}</div>);

    expect(screen.getByText("important")).toBeInTheDocument();
    expect(screen.getByText("important").tagName).toBe("STRONG");
  });

  it("renders mixed bold markdown and clickable citations", () => {
    const onCitationClick = vi.fn();
    render(<div>{renderMessageWithCitations("**Important** [John 3:16]", onCitationClick)}</div>);

    expect(screen.getByText("Important").tagName).toBe("STRONG");
    fireEvent.click(screen.getByRole("button", { name: "John 3:16" }));
    expect(onCitationClick).toHaveBeenCalledWith("John 3:16");
  });
});
