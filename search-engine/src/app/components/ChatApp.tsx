"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatMessageList } from "./chat/ChatMessageList";
import { ChatComposer } from "./chat/ChatComposer";
import { SourceSidebar } from "./sidebar/SourceSidebar";
import { Button } from "./ui/Button";
import { SourcesIcon } from "./ui/icons";
import { ToastStack, type ToastItem } from "./ui/ToastStack";
import { signOutAction } from "../actions/auth-actions";
import type { EntityFact, HybridSearchResponse, VersePreview } from "../types/ui";
import { COPY } from "../services/localization";
import { useLocale } from "../hooks/useLocale";
import { parseRetryAfterSeconds, extractRetryAfterFromMessage } from "../services/rateLimitParser";
import { getMessageText, renderMessageWithCitations } from "../services/messageFormatting";
import { buildRelationSnippets } from "../services/relationSnippets";
import { extractGraphEntityQuery } from "../services/graphQuery";

const NEAR_BOTTOM_THRESHOLD_PX = 120;
const TOAST_DURATION_MS = 6000;

export function ChatApp() {
  const locale = useLocale();
  const [draft, setDraft] = useState(COPY.en.defaultDraft);
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null);
  const [preview, setPreview] = useState<VersePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [entityFacts, setEntityFacts] = useState<EntityFact[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const uiText = COPY[locale];

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

  const { messages, sendMessage, status, error, clearError, stop } = useChat({ transport });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const toastIdRef = useRef(0);
  const toastTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    const timeoutId = toastTimeoutsRef.current.get(id);
    if (timeoutId != null) {
      clearTimeout(timeoutId);
      toastTimeoutsRef.current.delete(id);
    }
  }

  function pushToast(message: string) {
    toastIdRef.current += 1;
    const id = `toast-${toastIdRef.current}`;

    setToasts((current) => [...current, { id, message }]);
    toastTimeoutsRef.current.set(
      id,
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
    );
  }

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  function handleScrollContainerScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
  }

  const lastMessageText = messages.length > 0 ? getMessageText(messages[messages.length - 1]) : "";

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !isNearBottomRef.current) return;

    el.scrollTop = el.scrollHeight;
  }, [messages.length, lastMessageText, status]);

  useEffect(() => {
    setDraft((current) => {
      if (current.trim().length === 0 || current === COPY.en.defaultDraft || current === COPY.fr.defaultDraft) {
        return uiText.defaultDraft;
      }

      return current;
    });
  }, [uiText.defaultDraft]);

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
  const relationSnippets = useMemo(() => buildRelationSnippets(entityFacts, uiText), [entityFacts, uiText]);

  async function loadGraphPreview(query: string) {
    setGraphLoading(true);
    setGraphError(null);

    try {
      const runGraphSearch = async (searchQuery: string) => {
        const res = await fetch("/api/hybrid-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? uiText.graphLoadError);
        }

        return (await res.json()) as HybridSearchResponse;
      };

      let body = await runGraphSearch(query);
      if (!Array.isArray(body.entityFacts) || body.entityFacts.length === 0) {
        const fallbackQuery = extractGraphEntityQuery(query);
        if (fallbackQuery && fallbackQuery.toLowerCase() !== query.trim().toLowerCase()) {
          body = await runGraphSearch(fallbackQuery);
        }
      }

      setEntityFacts(Array.isArray(body.entityFacts) ? body.entityFacts.slice(0, 10) : []);
    } catch (e) {
      const message = e instanceof Error ? e.message : uiText.unknownError;
      setGraphError(message);
      setEntityFacts([]);
      pushToast(message);
    } finally {
      setGraphLoading(false);
    }
  }

  async function openCitation(reference: string) {
    setSelectedCitation(reference);
    setPreviewLoading(true);
    setIsSidebarOpen(true);

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
      setPreview(null);
      pushToast(message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = draft.trim();
    if (!trimmed || !canSubmit) return;

    setDraft("");
    isNearBottomRef.current = true;
    await sendMessage({ text: trimmed });
    await loadGraphPreview(trimmed);
  }

  async function onEntityChipClick(entityName: string) {
    const query = entityName.trim();
    if (!query || !canSubmit) return;

    setDraft("");
    isNearBottomRef.current = true;
    await sendMessage({ text: query });
    await loadGraphPreview(query);
  }

  return (
    <main className="flex h-[calc(100vh-var(--cookie-banner-height))] flex-col bg-background px-3 py-6 text-main sm:px-6">
      <ToastStack toasts={toasts} onDismiss={dismissToast} dismissLabel={uiText.dismissNotification} />

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] min-h-0">
        <section className="flex h-full min-h-135 flex-col self-stretch overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <header className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
            <div>
              <h1 className="text-h3 font-semibold tracking-tight text-main">{uiText.title}</h1>
              <p className="mt-1 text-b4 text-medium-gray">{uiText.subtitle}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <SourcesIcon className="size-4" />
                {uiText.sourcesToggle}
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="secondary" size="sm">
                  {uiText.signOut}
                </Button>
              </form>
            </div>
          </header>

          <div
            ref={scrollContainerRef}
            onScroll={handleScrollContainerScroll}
            className="flex-1 overflow-y-auto pr-1"
          >
            <ChatMessageList
              cooldownSeconds={cooldownSeconds}
              uiText={uiText}
              messages={messages}
              isRetrieving={isRetrieving}
              isStreaming={isStreaming}
              canSubmit={canSubmit}
              errorMessage={error?.message}
              onCitationClick={openCitation}
              onSuggestionClick={onEntityChipClick}
              renderMessageWithCitations={renderMessageWithCitations}
              getMessageText={getMessageText}
            />
          </div>

          <ChatComposer
            draft={draft}
            setDraft={setDraft}
            onSubmit={onSubmit}
            onStop={stop}
            canSubmit={canSubmit}
            cooldownSeconds={cooldownSeconds}
            isStreaming={isStreaming}
            isRetrieving={isRetrieving}
            uiText={uiText}
          />
        </section>

        {isSidebarOpen ? (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        ) : null}

        <div
          className={`fixed inset-y-0 right-0 z-40 w-[85vw] max-w-sm p-3 transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:p-0 ${
            isSidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <SourceSidebar
            uiText={uiText}
            selectedCitation={selectedCitation}
            previewLoading={previewLoading}
            preview={preview}
            graphLoading={graphLoading}
            graphError={graphError}
            entityFacts={entityFacts}
            relationSnippets={relationSnippets}
            canSubmit={canSubmit}
            onEntityChipClick={onEntityChipClick}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>
      </div>
    </main>
  );
}
