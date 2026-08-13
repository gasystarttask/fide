import type { ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatPart, RenderMessageWithCitations } from "../types/ui";
import { Button } from "../components/ui/Button";

const CITATION_TOKEN_REGEX = /(\[([^\]]+\d+:\d+(?:-\d+)?)\]|\(([^)]+\d+:\d+(?:-\d+)?)\))/g;
const CITATION_URL_PREFIX = "citation:";

function splitCitationReferences(citation: string): string[] {
  const refs = citation
    .split(/\s*[;,]\s*/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && /\d+:\d+/.test(item));

  return refs.length > 0 ? refs : [citation.trim()];
}

export function getMessageText(message: { parts?: ChatPart[]; content?: string }): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  const parts = Array.isArray(message.parts) ? message.parts : [];
  return parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("");
}

// Rewrite our own [Book Ch:V] / (Book Ch:V) citation shorthand into real
// markdown links (one per reference) so a single markdown parser handles
// both citations and normal formatting instead of two separate passes.
function convertCitationsToMarkdownLinks(text: string): string {
  return text.replace(CITATION_TOKEN_REGEX, (match, _fullMatch, bracketCitation, parenCitation) => {
    const citation = (bracketCitation ?? parenCitation ?? "").trim();
    if (!citation) return match;

    return splitCitationReferences(citation)
      .map((reference) => `[${reference}](${CITATION_URL_PREFIX}${encodeURIComponent(reference)})`)
      .join(", ");
  });
}

// react-markdown's default sanitizer only allows http(s)/irc(s)/mailto/xmpp
// links and silently drops anything else, so the citation: scheme needs an
// explicit allowlist entry or every citation link is stripped to href="".
function urlTransform(url: string): string {
  return url.startsWith(CITATION_URL_PREFIX) ? url : defaultUrlTransform(url);
}

function buildMarkdownComponents(onCitationClick: (reference: string) => void): Components {
  return {
    a: ({ href, children }) => {
      if (href?.startsWith(CITATION_URL_PREFIX)) {
        const reference = decodeURIComponent(href.slice(CITATION_URL_PREFIX.length));

        return (
          <Button type="button" variant="ghost" tone="primary" size="sm" onClick={() => onCitationClick(reference)}>
            {children}
          </Button>
        );
      }

      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {children}
        </a>
      );
    },
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  };
}

export const renderMessageWithCitations: RenderMessageWithCitations = (text, onCitationClick): ReactNode[] => [
  <ReactMarkdown
    key="markdown"
    remarkPlugins={[remarkGfm]}
    urlTransform={urlTransform}
    components={buildMarkdownComponents(onCitationClick)}
  >
    {convertCitationsToMarkdownLinks(text)}
  </ReactMarkdown>,
];
