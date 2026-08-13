import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SourceSidebar } from "@search/app/components/sidebar/SourceSidebar";
import { COPY } from "@search/app/services/localization";

describe("SourceSidebar integration", () => {
  it("renders preview, graph entities and handles chip click", () => {
    const onEntityChipClick = vi.fn();

    render(
      <SourceSidebar
        uiText={COPY.en}
        selectedCitation="John 3:16"
        previewLoading={false}
        preview={{
          reference: "John 3:16",
          text: "For God so loved the world...",
          metadata: { version: "LSG" },
        }}
        graphLoading={false}
        graphError={null}
        entityFacts={[
          {
            slug: "abraham",
            name: "Abraham",
            type: "person",
            relations: [],
          },
        ]}
        relationSnippets={["Abraham is the father of Isaac."]}
        canSubmit={true}
        onEntityChipClick={onEntityChipClick}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(COPY.en.sourcePreviewTitle)).toBeInTheDocument();
    expect(screen.getAllByText("John 3:16")).toHaveLength(2);
    expect(screen.getByText(/For God so loved the world/)).toBeInTheDocument();
    expect(screen.getByText(`${COPY.en.versionLabel}: LSG`)).toBeInTheDocument();
    expect(screen.getByText(COPY.en.graphTitle)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Abraham" }));
    expect(onEntityChipClick).toHaveBeenCalledWith("Abraham");
  });

  it("shows hint when no citation is selected", () => {
    render(
      <SourceSidebar
        uiText={COPY.en}
        selectedCitation={null}
        previewLoading={false}
        preview={null}
        graphLoading={false}
        graphError={null}
        entityFacts={[]}
        relationSnippets={[]}
        canSubmit={true}
        onEntityChipClick={() => {}}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(COPY.en.sourcePreviewHint)).toBeInTheDocument();
    expect(screen.getByText(COPY.en.noEntities)).toBeInTheDocument();
  });

  it("calls onClose when the mobile close button is clicked", () => {
    const onClose = vi.fn();

    render(
      <SourceSidebar
        uiText={COPY.en}
        selectedCitation={null}
        previewLoading={false}
        preview={null}
        graphLoading={false}
        graphError={null}
        entityFacts={[]}
        relationSnippets={[]}
        canSubmit={true}
        onEntityChipClick={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: COPY.en.closeSidebar }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
