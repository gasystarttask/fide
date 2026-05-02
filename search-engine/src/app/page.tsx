"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessageList } from "./components/chat/ChatMessageList";
import { ChatComposer } from "./components/chat/ChatComposer";
import { SourceSidebar } from "./components/sidebar/SourceSidebar";
import type { ChatPart, EntityFact, UIText, VersePreview } from "./components/types";

type HybridSearchResponse = {
  entityFacts?: EntityFact[];
};

type Locale = "en" | "fr";

const LOCALE_STORAGE_KEY = "fide.ui.locale";

const CITATION_REGEX = /(\[([^\]]+\d+:\d+(?:-\d+)?)\]|\(([^\)]+\d+:\d+(?:-\d+)?)\)|\*\*([^\*]+\d+:\d+(?:-\d+)?)\*\*)/g;

const COPY = {
  en: {
    defaultDraft: "Who is Jesus?",
    title: "Bible Chat Scholar",
    subtitle: "Streaming response with interactive Bible citations.",
    roleAssistant: "Assistant",
    roleUser: "You",
    rateLimitTitle: "GitHub Models has temporarily rate-limited this token.",
    rateLimitRetry: (seconds: number) => `Try again in ${seconds}s.`,
    retrievingContext: "Searching biblical context...",
    assistantStreaming: "The assistant is typing in real time...",
    inputPlaceholder: "Ask a Bible question (e.g., Who is Jesus?)",
    retryCta: (seconds: number) => `Retry in ${seconds}s`,
    inProgressCta: "In progress...",
    sendCta: "Send",
    sourcePreviewTitle: "Source preview",
    sourcePreviewHint: "Click a citation like [Genesis 46:19] to view the full verse text.",
    citationLabel: "Citation",
    referenceLabel: "Reference",
    versionLabel: "Version",
    graphTitle: "Knowledge graph",
    noEntities: "No suggested entities yet.",
    entityChips: "Entity Chips",
    relationSnippets: "Relation Snippets",
    unknownError: "Unknown error",
    graphLoadError: "Unable to load graph.",
    verseLoadError: "Unable to load verse.",
    relationTemplates: {
      FATHER_OF: (source: string, target: string) => `${source} is the father of ${target}.`,
      MOTHER_OF: (source: string, target: string) => `${source} is the mother of ${target}.`,
      SON_OF: (source: string, target: string) => `${source} is the son of ${target}.`,
      DAUGHTER_OF: (source: string, target: string) => `${source} is the daughter of ${target}.`,
      SPOUSE_OF: (source: string, target: string) => `${source} is the spouse of ${target}.`,
      BROTHER_OF: (source: string, target: string) => `${source} is the brother of ${target}.`,
      SISTER_OF: (source: string, target: string) => `${source} is the sister of ${target}.`,
      TRAVELS_TO: (source: string, target: string) => `${source} travels to ${target}.`,
      LOCATED_IN: (source: string, target: string) => `${source} is located in ${target}.`,
      FOLLOWER_OF: (source: string, target: string) => `${source} is a follower of ${target}.`,
      INTERACTS_WITH: (source: string, target: string) => `${source} interacts with ${target}.`,
      EVENT_AT: (source: string, target: string) => `${source} is linked to an event at ${target}.`,
      fallback: (source: string, target: string, relation: string) =>
        `${source} is related to ${target} (${relation}).`,
    },
  },
  fr: {
    defaultDraft: "Qui est Jesus ?",
    title: "Bible Chat Scholar",
    subtitle: "Reponse en streaming avec citations bibliques interactives.",
    roleAssistant: "Assistant",
    roleUser: "Vous",
    rateLimitTitle: "GitHub Models a temporairement limite ce token.",
    rateLimitRetry: (seconds: number) => `Nouvel essai possible dans ${seconds}s.`,
    retrievingContext: "Recherche du contexte biblique...",
    assistantStreaming: "L'assistant ecrit en temps reel...",
    inputPlaceholder: "Posez une question biblique (ex: Qui est Jesus ?)",
    retryCta: (seconds: number) => `Reessayer dans ${seconds}s`,
    inProgressCta: "En cours...",
    sendCta: "Envoyer",
    sourcePreviewTitle: "Apercu source",
    sourcePreviewHint: "Cliquez sur une citation comme [Genese 46:19] pour voir le texte complet.",
    citationLabel: "Citation",
    referenceLabel: "Reference",
    versionLabel: "Version",
    graphTitle: "Graphe de connaissances",
    noEntities: "Aucune entite suggeree pour le moment.",
    entityChips: "Entity Chips",
    relationSnippets: "Relation Snippets",
    unknownError: "Erreur inconnue",
    graphLoadError: "Impossible de charger le graphe.",
    verseLoadError: "Impossible de charger ce verset.",
    relationTemplates: {
      FATHER_OF: (source: string, target: string) => `${source} est le pere de ${target}.`,
      MOTHER_OF: (source: string, target: string) => `${source} est la mere de ${target}.`,
      SON_OF: (source: string, target: string) => `${source} est le fils de ${target}.`,
      DAUGHTER_OF: (source: string, target: string) => `${source} est la fille de ${target}.`,
      SPOUSE_OF: (source: string, target: string) => `${source} est l'epoux de ${target}.`,
      BROTHER_OF: (source: string, target: string) => `${source} est le frere de ${target}.`,
      SISTER_OF: (source: string, target: string) => `${source} est la soeur de ${target}.`,
      TRAVELS_TO: (source: string, target: string) => `${source} voyage vers ${target}.`,
      LOCATED_IN: (source: string, target: string) => `${source} se trouve dans ${target}.`,
      FOLLOWER_OF: (source: string, target: string) => `${source} est disciple de ${target}.`,
      INTERACTS_WITH: (source: string, target: string) => `${source} interagit avec ${target}.`,
      EVENT_AT: (source: string, target: string) => `${source} est lie a un evenement a ${target}.`,
      fallback: (source: string, target: string, relation: string) =>
        `${source} est lie a ${target} (${relation}).`,
    },
  },
};

function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) {
    return "en";
  }

  return value.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function resolveLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored) {
    return normalizeLocale(stored);
  }

  const browserLocale = window.navigator.languages?.[0] ?? window.navigator.language;
  return normalizeLocale(browserLocale);
}

function splitCitationReferences(citation: string): string[] {
  const refs = citation
    .split(/\s*;\s*/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && /\d+:\d+/.test(item));

  return refs.length > 0 ? refs : [citation.trim()];
}

function parseRetryAfterSeconds(value: string | null | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function extractRetryAfterFromMessage(message: string): number | null {
  const match = message.match(/retry in\s+(\d+)s/i);
  if (!match) {
    return null;
  }

  return parseRetryAfterSeconds(match[1]);
}

function getMessageText(message: { parts?: ChatPart[]; content?: string }): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  const parts = Array.isArray(message.parts) ? message.parts : [];
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("");
}

function renderMessageWithCitations(
  text: string,
  onCitationClick: (reference: string) => void
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;

  for (const match of text.matchAll(CITATION_REGEX)) {
    const full = match[1];
    const captured = (match[2] ?? match[3] ?? match[4] ?? "").trim();
    if (!full || !captured || match.index == null) continue;

    const start = match.index;
    if (start > lastIndex) {
      nodes.push(<Fragment key={`text-${index}`}>{text.slice(lastIndex, start)}</Fragment>);
      index += 1;
    }

    const references = splitCitationReferences(captured);

    nodes.push(
      <Fragment key={`cite-group-${captured}-${index}`}>
        {references.map((reference, refIndex) => (
          <Fragment key={`cite-item-${reference}-${refIndex}`}>
            {refIndex > 0 ? "; " : null}
            <button
              type="button"
              onClick={() => onCitationClick(reference)}
              className="rounded-md border border-indigo-300 bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-800 hover:bg-indigo-100"
            >
              {reference}
            </button>
          </Fragment>
        ))}
      </Fragment>
    );

    index += 1;
    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`text-tail-${index}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes.length ? nodes : [text];
}

function relationToSnippet(
  sourceName: string,
  relationType: string,
  targetName: string,
  locale: Locale
): string {
  const templates = COPY[locale].relationTemplates;

  switch (relationType) {
    case "FATHER_OF":
      return templates.FATHER_OF(sourceName, targetName);
    case "MOTHER_OF":
      return templates.MOTHER_OF(sourceName, targetName);
    case "SON_OF":
      return templates.SON_OF(sourceName, targetName);
    case "DAUGHTER_OF":
      return templates.DAUGHTER_OF(sourceName, targetName);
    case "SPOUSE_OF":
      return templates.SPOUSE_OF(sourceName, targetName);
    case "BROTHER_OF":
      return templates.BROTHER_OF(sourceName, targetName);
    case "SISTER_OF":
      return templates.SISTER_OF(sourceName, targetName);
    case "TRAVELS_TO":
      return templates.TRAVELS_TO(sourceName, targetName);
    case "LOCATED_IN":
      return templates.LOCATED_IN(sourceName, targetName);
    case "FOLLOWER_OF":
      return templates.FOLLOWER_OF(sourceName, targetName);
    case "INTERACTS_WITH":
      return templates.INTERACTS_WITH(sourceName, targetName);
    case "EVENT_AT":
      return templates.EVENT_AT(sourceName, targetName);
    default:
      return templates.fallback(sourceName, targetName, relationType.toLowerCase().split("_").join(" "));
  }
}

function buildRelationSnippets(entityFacts: EntityFact[], locale: Locale, maxSnippets = 8): string[] {
  const snippets: string[] = [];
  const seen = new Set<string>();

  for (const entity of entityFacts) {
    for (const relation of entity.relations ?? []) {
      const sourceName = entity.name?.trim();
      const targetName = relation.targetName?.trim();
      const relationType = relation.type?.trim();

      if (!sourceName || !targetName || !relationType) {
        continue;
      }

      const snippet = relationToSnippet(sourceName, relationType, targetName, locale);
      const dedupeKey = snippet.toLowerCase();

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      snippets.push(snippet);

      if (snippets.length >= maxSnippets) {
        return snippets;
      }
    }
  }

  return snippets;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [draft, setDraft] = useState(COPY.en.defaultDraft);
  const uiText = COPY[locale] as UIText;

    useEffect(() => {
      if (typeof window === "undefined") {
        return;
      }

      const resolved = resolveLocale();
      setLocale(resolved);
    }, []);

    useEffect(() => {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }, [locale]);

    useEffect(() => {
      setDraft((current) => {
        if (current.trim().length === 0 || current === COPY.en.defaultDraft || current === COPY.fr.defaultDraft) {
          return uiText.defaultDraft;
        }

        return current;
      });
    }, [uiText.defaultDraft]);

  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const [preview, setPreview] = useState<VersePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [entityFacts, setEntityFacts] = useState<EntityFact[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const response = await fetch(input, init);

          if (response.status === 429) {
            const retryAfterHeader = parseRetryAfterSeconds(response.headers.get("Retry-After"));

            let retryAfterBody: number | null = null;
            try {
              const payload = (await response.clone().json()) as { error?: string };
              retryAfterBody = payload.error ? extractRetryAfterFromMessage(payload.error) : null;
            } catch {
              retryAfterBody = null;
            }

            setCooldownSeconds(retryAfterHeader ?? retryAfterBody ?? 60);
          }

          return response;
        },
      }),
    []
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
  });

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (cooldownSeconds === 0 && error) {
      clearError();
    }
  }, [clearError, cooldownSeconds, error]);

  const isRetrieving = status === "submitted";
  const isStreaming = status === "streaming";
  const canSubmit = useMemo(() => status === "ready" && cooldownSeconds === 0, [cooldownSeconds, status]);
  const relationSnippets = useMemo(() => buildRelationSnippets(entityFacts, locale), [entityFacts, locale]);

  async function loadGraphPreview(query: string) {
    setGraphLoading(true);
    setGraphError(null);

    try {
      const res = await fetch("/api/hybrid-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? uiText.graphLoadError);
      }

      const body = (await res.json()) as HybridSearchResponse;
      setEntityFacts(Array.isArray(body.entityFacts) ? body.entityFacts.slice(0, 10) : []);
    } catch (e) {
      const message = e instanceof Error ? e.message : uiText.unknownError;
      setGraphError(message);
      setEntityFacts([]);
    } finally {
      setGraphLoading(false);
    }
  }

  async function openCitation(reference: string) {
    setSelectedCitation(reference);
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const res = await fetch(`/api/verse-preview?reference=${encodeURIComponent(reference)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? uiText.verseLoadError);
      }

      const body = (await res.json()) as VersePreview;
      setPreview(body);
    } catch (e) {
      const message = e instanceof Error ? e.message : uiText.unknownError;
      setPreviewError(message);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = draft.trim();
    if (!trimmed || !canSubmit) return;

    setDraft("");
    const graphPromise = loadGraphPreview(trimmed);
    await sendMessage({ text: trimmed });
    await graphPromise;
  }

  async function onEntityChipClick(entityName: string) {
    const query = entityName.trim();
    if (!query || !canSubmit) return;

    setDraft("");
    const graphPromise = loadGraphPreview(query);
    await sendMessage({ text: query });
    await graphPromise;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#bdc7f5,#edeeff_35%,#f8fafc)] px-3 py-6 text-stone-900 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex h-[calc(100vh-3rem)] min-h-[540px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm sm:p-6">
          <header className="mb-4 shrink-0 border-b border-stone-200 pb-3">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{uiText.title}</h1>
            <p className="mt-1 text-sm text-stone-600">{uiText.subtitle}</p>
          </header>

          <div className="flex-1 overflow-y-auto pr-1">
            <ChatMessageList
              cooldownSeconds={cooldownSeconds}
              uiText={uiText}
              messages={messages}
              isRetrieving={isRetrieving}
              isStreaming={isStreaming}
              errorMessage={error?.message}
              onCitationClick={openCitation}
              renderMessageWithCitations={renderMessageWithCitations}
              getMessageText={getMessageText}
            />
          </div>

          <ChatComposer
            draft={draft}
            setDraft={setDraft}
            onSubmit={onSubmit}
            canSubmit={canSubmit}
            cooldownSeconds={cooldownSeconds}
            isStreaming={isStreaming}
            isRetrieving={isRetrieving}
            uiText={uiText}
          />
        </section>

        <SourceSidebar
          uiText={uiText}
          selectedCitation={selectedCitation}
          previewLoading={previewLoading}
          previewError={previewError}
          preview={preview}
          graphLoading={graphLoading}
          graphError={graphError}
          entityFacts={entityFacts}
          relationSnippets={relationSnippets}
          canSubmit={canSubmit}
          onEntityChipClick={onEntityChipClick}
        />
      </div>
    </main>
  );
}
