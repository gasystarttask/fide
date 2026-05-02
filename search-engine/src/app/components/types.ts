import type { ReactNode } from "react";

export type VersePreview = {
  reference: string;
  text: string;
  book?: string;
  chapter?: number;
  verse?: number;
  metadata?: {
    testament?: string;
    version?: string;
  } | null;
};

export type ChatPart = {
  type?: string;
  text?: string;
};

export type ChatMessage = {
  id: string;
  role: string;
  parts?: ChatPart[];
  content?: string;
};

export type EntityRelation = {
  type: string;
  targetName: string;
  targetSlug: string;
};

export type EntityFact = {
  slug: string;
  name: string;
  type: string;
  relations?: EntityRelation[];
};

export type UIText = {
  title: string;
  subtitle: string;
  roleAssistant: string;
  roleUser: string;
  rateLimitTitle: string;
  rateLimitRetry: (seconds: number) => string;
  retrievingContext: string;
  assistantStreaming: string;
  inputPlaceholder: string;
  retryCta: (seconds: number) => string;
  inProgressCta: string;
  sendCta: string;
  sourcePreviewTitle: string;
  sourcePreviewHint: string;
  citationLabel: string;
  referenceLabel: string;
  versionLabel: string;
  graphTitle: string;
  noEntities: string;
  entityChips: string;
  relationSnippets: string;
  relationTemplates: {
    FATHER_OF: (source: string, target: string) => string;
    MOTHER_OF: (source: string, target: string) => string;
    SON_OF: (source: string, target: string) => string;
    DAUGHTER_OF: (source: string, target: string) => string;
    SPOUSE_OF: (source: string, target: string) => string;
    BROTHER_OF: (source: string, target: string) => string;
    SISTER_OF: (source: string, target: string) => string;
    TRAVELS_TO: (source: string, target: string) => string;
    LOCATED_IN: (source: string, target: string) => string;
    FOLLOWER_OF: (source: string, target: string) => string;
    INTERACTS_WITH: (source: string, target: string) => string;
    EVENT_AT: (source: string, target: string) => string;
    fallback: (source: string, target: string, relation: string) => string;
  };
  unknownError: string;
  graphLoadError: string;
  verseLoadError: string;
  defaultDraft: string;
};

export type RenderMessageWithCitations = (
  text: string,
  onCitationClick: (reference: string) => void
) => ReactNode[];
