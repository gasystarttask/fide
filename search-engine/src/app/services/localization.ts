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
    feedbackHelpful: "Helpful response",
    feedbackNotHelpful: "Not helpful",
    emptyStateTitle: "Ask anything about the Bible",
    emptyStateSubtitle: "Try one of these, or type your own question below.",
    suggestionPrompts: [
      "Who is Jesus?",
      "Tell me about David and Goliath",
      "What happened at the Last Supper?",
      "What does the Bible say about love?",
    ],
    inputPlaceholder: "Ask a Bible question (e.g., Who is Jesus?)",
    retryCta: (seconds: number) => `Retry in ${seconds}s`,
    sendCta: "Send",
    stopGenerating: "Stop generating",
    sourcePreviewTitle: "Source preview",
    sourcePreviewHint: "Click a citation like [Genesis 46:19] to view the full verse text.",
    sourcesToggle: "Sources",
    closeSidebar: "Close sources panel",
    dismissNotification: "Dismiss notification",
    signInPrompt: "Please sign in to use the Bible search assistant.",
    signIn: "Sign in",
    signOut: "Sign out",
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
    cookieBannerTitle: "Cookies",
    cookieBannerMessage:
      "We use only the essential cookies needed to keep you signed in. We don't use analytics or advertising cookies.",
    cookieAcceptAll: "Accept all",
    cookieRejectNonEssential: "Reject non-essential",
    privacyPolicyLink: "Privacy Policy",
    privacyPolicyPageTitle: "Privacy Policy",
    privacyPolicyIntro:
      "This policy explains what data Bible Chat Scholar collects and how cookies are used.",
    privacyPolicyDataTitle: "Data we collect",
    privacyPolicyDataBody:
      "When you sign in, our identity provider (Keycloak) shares your account details (such as your name and email) with this app so we can authenticate you and apply per-user rate limits. We don't sell or share this data with third parties.",
    privacyPolicyCookiesTitle: "Cookies we use",
    privacyPolicyCookiesBody:
      "We set one essential session cookie to keep you signed in. This cookie is required for the app to work and isn't subject to consent under the ePrivacy rules. We currently don't use analytics, advertising, or other non-essential cookies. Your locale and cookie-consent choice are stored in your browser's local storage, not in cookies.",
    privacyPolicyRightsTitle: "Your rights",
    privacyPolicyRightsBody:
      "Under GDPR, you can request access to, correction of, or deletion of your data. Contact the project maintainers to exercise these rights.",
    privacyPolicyContactTitle: "Contact",
    privacyPolicyContactBody:
      "For any question about this policy, reach out to the project maintainers via the GitHub repository.",
    backToApp: "Back to app",
  },
  fr: {
    defaultDraft: "Qui est Jesus ?",
    title: "Assistant biblique",
    subtitle: "Reponse en streaming avec citations bibliques interactives.",
    roleAssistant: "Assistant",
    roleUser: "Vous",
    rateLimitTitle: "GitHub Models a temporairement limite ce token.",
    rateLimitRetry: (seconds: number) => `Nouvel essai possible dans ${seconds}s.`,
    retrievingContext: "Recherche du contexte biblique...",
    assistantStreaming: "L'assistant ecrit en temps reel...",
    feedbackHelpful: "Reponse utile",
    feedbackNotHelpful: "Pas utile",
    emptyStateTitle: "Posez une question sur la Bible",
    emptyStateSubtitle: "Essayez l'une de ces questions, ou ecrivez la votre ci-dessous.",
    suggestionPrompts: [
      "Qui est Jesus ?",
      "Parle-moi de David et Goliath",
      "Que s'est-il passe lors de la Cene ?",
      "Que dit la Bible sur l'amour ?",
    ],
    inputPlaceholder: "Posez une question biblique (ex: Qui est Jesus ?)",
    retryCta: (seconds: number) => `Reessayer dans ${seconds}s`,
    sendCta: "Envoyer",
    stopGenerating: "Arreter la generation",
    sourcePreviewTitle: "Apercu source",
    sourcePreviewHint: "Cliquez sur une citation comme [Genese 46:19] pour voir le texte complet.",
    sourcesToggle: "Sources",
    closeSidebar: "Fermer le panneau des sources",
    dismissNotification: "Ignorer la notification",
    signInPrompt: "Veuillez vous connecter pour utiliser l'assistant de recherche biblique.",
    signIn: "Se connecter",
    signOut: "Se deconnecter",
    citationLabel: "Citation",
    referenceLabel: "Reference",
    versionLabel: "Version",
    graphTitle: "Graphe de connaissances",
    noEntities: "Aucune entite suggeree pour le moment.",
    entityChips: "Entites",
    relationSnippets: "Extraits de relations",
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
    cookieBannerTitle: "Cookies",
    cookieBannerMessage:
      "Nous utilisons uniquement les cookies essentiels nécessaires pour vous garder connecté. Nous n'utilisons pas de cookies d'analyse ni de publicité.",
    cookieAcceptAll: "Tout accepter",
    cookieRejectNonEssential: "Refuser les cookies non essentiels",
    privacyPolicyLink: "Politique de confidentialité",
    privacyPolicyPageTitle: "Politique de confidentialité",
    privacyPolicyIntro:
      "Cette politique explique quelles données Assistant biblique collecte et comment les cookies sont utilisés.",
    privacyPolicyDataTitle: "Données collectées",
    privacyPolicyDataBody:
      "Lors de la connexion, notre fournisseur d'identité (Keycloak) partage vos informations de compte (comme votre nom et votre email) avec cette application afin de vous authentifier et d'appliquer des limites de débit par utilisateur. Nous ne vendons ni ne partageons ces données avec des tiers.",
    privacyPolicyCookiesTitle: "Cookies utilisés",
    privacyPolicyCookiesBody:
      "Nous déposons un unique cookie de session essentiel pour vous garder connecté. Ce cookie est nécessaire au fonctionnement de l'application et n'est pas soumis au consentement au titre de la réglementation ePrivacy. Nous n'utilisons actuellement aucun cookie d'analyse, de publicité ou autre cookie non essentiel. Votre langue et votre choix de consentement aux cookies sont stockés dans le stockage local de votre navigateur, et non dans des cookies.",
    privacyPolicyRightsTitle: "Vos droits",
    privacyPolicyRightsBody:
      "Conformément au RGPD, vous pouvez demander l'accès, la correction ou la suppression de vos données. Contactez les mainteneurs du projet pour exercer ces droits.",
    privacyPolicyContactTitle: "Contact",
    privacyPolicyContactBody:
      "Pour toute question sur cette politique, contactez les mainteneurs du projet via le dépôt GitHub.",
    backToApp: "Retour à l'application",
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
