import { Fragment } from "react";
import type { ReactNode } from "react";
import type { ChatPart, RenderMessageWithCitations } from "../types/ui";

const TOKEN_REGEX = /(\[([^\]]+\d+:\d+(?:-\d+)?)\]|\(([^\)]+\d+:\d+(?:-\d+)?)\)|\*\*([^\*]+)\*\*)/g;

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

export const renderMessageWithCitations: RenderMessageWithCitations = (
  text,
  onCitationClick
): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;

  for (const match of text.matchAll(TOKEN_REGEX)) {
    const full = match[1];
    const citation = (match[2] ?? match[3] ?? "").trim();
    const boldText = match[4] ?? "";

    if (!full || match.index == null) continue;

    const start = match.index;
    if (start > lastIndex) {
      nodes.push(<Fragment key={`text-${index}`}>{text.slice(lastIndex, start)}</Fragment>);
      index += 1;
    }

    if (boldText.length > 0) {
      nodes.push(
        <strong key={`bold-${index}`} className="font-semibold">
          {boldText}
        </strong>
      );

      index += 1;
      lastIndex = start + full.length;
      continue;
    }

    if (!citation) {
      lastIndex = start + full.length;
      continue;
    }

    const references = splitCitationReferences(citation);

    nodes.push(
      <Fragment key={`cite-group-${citation}-${index}`}>
        {references.map((reference, refIndex) => (
          <Fragment key={`cite-item-${reference}-${refIndex}`}>
            {refIndex > 0 ? ", " : null}
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
};
