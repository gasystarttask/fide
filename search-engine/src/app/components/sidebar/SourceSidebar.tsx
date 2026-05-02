import { motion } from "framer-motion";
import type { EntityFact, UIText, VersePreview } from "../types";

type SourceSidebarProps = {
  uiText: UIText;
  selectedCitation: string | null;
  previewLoading: boolean;
  previewError: string | null;
  preview: VersePreview | null;
  graphLoading: boolean;
  graphError: string | null;
  entityFacts: EntityFact[];
  relationSnippets: string[];
  canSubmit: boolean;
  onEntityChipClick: (entityName: string) => void;
};

export function SourceSidebar({
  uiText,
  selectedCitation,
  previewLoading,
  previewError,
  preview,
  graphLoading,
  graphError,
  entityFacts,
  relationSnippets,
  canSubmit,
  onEntityChipClick,
}: SourceSidebarProps) {
  return (
    <aside className="rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm sm:p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">{uiText.sourcePreviewTitle}</h2>
      {!selectedCitation ? (
        <p className="mt-3 text-sm text-stone-500">{uiText.sourcePreviewHint}</p>
      ) : null}

      {selectedCitation ? (
        <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs uppercase tracking-wide text-stone-500">{uiText.citationLabel}</p>
          <p className="text-sm font-medium text-stone-800">{selectedCitation}</p>
        </div>
      ) : null}

      {previewLoading ? (
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <div className="h-3 w-20 animate-pulse rounded bg-indigo-200" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-indigo-100" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-indigo-100" />
        </div>
      ) : null}

      {previewError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{previewError}</p>
      ) : null}

      {preview ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"
        >
          <p className="text-xs uppercase tracking-wide text-emerald-700">{uiText.referenceLabel}</p>
          <p className="text-sm font-semibold text-emerald-900">{preview.reference}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-emerald-900">{preview.text}</p>
          {preview.metadata?.version ? (
            <p className="mt-2 text-xs text-emerald-700">{uiText.versionLabel}: {preview.metadata.version}</p>
          ) : null}
        </motion.div>
      ) : null}

      <div className="mt-4 border-t border-stone-200 pt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-600">{uiText.graphTitle}</h3>
        <div className="mt-3 lg:max-h-[42vh] lg:overflow-y-auto lg:pr-1">
          {graphLoading ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <div className="h-3 w-24 animate-pulse rounded bg-indigo-200" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-indigo-100" />
              <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-indigo-100" />
            </div>
          ) : null}

          {graphError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">{graphError}</p>
          ) : null}

          {!graphLoading && !graphError && entityFacts.length === 0 ? (
            <p className="text-sm text-stone-500">{uiText.noEntities}</p>
          ) : null}

          {entityFacts.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">{uiText.entityChips}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {entityFacts.map((entity) => (
                  <button
                    key={entity.slug}
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => onEntityChipClick(entity.name)}
                    className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {entity.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {relationSnippets.length > 0 ? (
            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">{uiText.relationSnippets}</p>
              <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
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
