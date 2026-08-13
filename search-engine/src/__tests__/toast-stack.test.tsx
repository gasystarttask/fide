import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ToastStack } from "@search/app/components/ui/ToastStack";

describe("ToastStack", () => {
  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastStack toasts={[]} onDismiss={vi.fn()} dismissLabel="Dismiss" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each toast's message and dismisses the right one on click", () => {
    const onDismiss = vi.fn();

    render(
      <ToastStack
        toasts={[
          { id: "t1", message: "First failure" },
          { id: "t2", message: "Second failure" },
        ]}
        onDismiss={onDismiss}
        dismissLabel="Dismiss"
      />
    );

    expect(screen.getByText("First failure")).toBeInTheDocument();
    expect(screen.getByText("Second failure")).toBeInTheDocument();

    const dismissButtons = screen.getAllByRole("button", { name: "Dismiss" });
    fireEvent.click(dismissButtons[1]);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith("t2");
  });
});
