import { motion } from "framer-motion";
import type { EntityFact, UIText, VersePreview } from "../../types/ui";
import { Button } from "../ui/Button";
import { CloseIcon } from "../ui/icons";

type SourceSidebarProps = {
  uiText: UIText;
  selectedCitation: string | null;
  previewLoading: boolean;
  preview: VersePreview | null;
  graphLoading: boolean;
  graphError: string | null;
  entityFacts: EntityFact[];
  relationSnippets: string[];
  canSubmit: boolean;
  onEntityChipClick: (entityName: string) => void;
  onClose: () => void;
};

export function SourceSidebar({
  uiText,
  selectedCitation,
  previewLoading,
  preview,
  graphLoading,
  graphError,
  entityFacts,
  relationSnippets,
  canSubmit,
  onEntityChipClick,
  onClose,
}: SourceSidebarProps) {
  return (
    <aside className="h-full overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5 lg:h-auto lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-b4 font-semibold uppercase tracking-wide text-medium-gray">{uiText.sourcePreviewTitle}</h2>
        <Button
          type="button"
          variant="ghost"
          tone="primary"
          size="sm"
          className="lg:hidden"
          aria-label={uiText.closeSidebar}
          onClick={onClose}
        >
          <CloseIcon className="size-4" />
        </Button>
      </div>
      {!selectedCitation ? (
        <p className="mt-3 text-b4 text-dark-gray">{uiText.sourcePreviewHint}</p>
      ) : null}

      {selectedCitation ? (
        <div className="mt-3 rounded-xl border border-border bg-surface-alt p-3">
          <p className="text-xs uppercase tracking-wide text-dark-gray">{uiText.citationLabel}</p>
          <p className="text-b4 font-medium text-main">{selectedCitation}</p>
        </div>
      ) : null}

      {previewLoading ? (
        <div className="mt-3 rounded-xl border border-primary/25 bg-surface-alt p-3">
          <div className="h-3 w-20 animate-pulse rounded bg-primary/20" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-primary/10" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-primary/10" />
        </div>
      ) : null}

      {preview ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl border border-success/30 bg-success/10 p-3"
        >
          <p className="text-xs uppercase tracking-wide text-success">{uiText.referenceLabel}</p>
          <p className="text-b4 font-semibold text-main">{preview.reference}</p>
          <p className="mt-2 whitespace-pre-wrap text-b4 leading-6 text-light-gray">{preview.text}</p>
          {preview.metadata?.version ? (
            <p className="mt-2 text-xs text-success">{uiText.versionLabel}: {preview.metadata.version}</p>
          ) : null}
        </motion.div>
      ) : null}

      <div className="mt-4 border-t border-border pt-4">
        <h3 className="text-b4 font-semibold uppercase tracking-wide text-medium-gray">{uiText.graphTitle}</h3>
        <div className="mt-3 lg:max-h-[42vh] lg:overflow-y-auto lg:pr-1">
          {graphLoading ? (
            <div className="rounded-xl border border-primary/25 bg-surface-alt p-3">
              <div className="h-3 w-24 animate-pulse rounded bg-primary/20" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-primary/10" />
              <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-primary/10" />
            </div>
          ) : null}

          {!graphLoading && !graphError && entityFacts.length === 0 ? (
            <p className="text-b4 text-dark-gray">{uiText.noEntities}</p>
          ) : null}

          {entityFacts.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-dark-gray">{uiText.entityChips}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {entityFacts.map((entity) => (
                  <Button
                    key={entity.slug}
                    type="button"
                    variant="ghost"
                    tone="accent"
                    size="sm"
                    disabled={!canSubmit}
                    onClick={() => onEntityChipClick(entity.name)}
                  >
                    {entity.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {relationSnippets.length > 0 ? (
            <div className="mt-3 rounded-xl border border-border bg-surface-alt p-3">
              <p className="text-xs uppercase tracking-wide text-dark-gray">{uiText.relationSnippets}</p>
              <ul className="mt-2 space-y-1.5 text-b4 text-light-gray">
                {relationSnippets.map((snippet) => (
                  <li key={snippet}>{snippet}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
