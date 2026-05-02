import type { Locale, UIText } from "../types/ui";

export const LOCALE_STORAGE_KEY = "fide.ui.locale";

export const COPY: Record<Locale, UIText> = {
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

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) {
    return "en";
  }

  return value.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function resolveLocale(): Locale {
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
