import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function baseProps(props: IconProps): IconProps {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function BotIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="13.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13.5" r="1.25" fill="currentColor" stroke="none" />
      <path d="M9 17h6" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </svg>
  );
}

export function ThumbsUpIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Z" />
      <path d="M7 11l3.5-7a2 2 0 0 1 2 2.2L11.8 9H18a2 2 0 0 1 1.9 2.7l-2 6A2 2 0 0 1 16 19H7" />
    </svg>
  );
}

export function ThumbsDownIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3Z" />
      <path d="M17 13l-3.5 7a2 2 0 0 1-2-2.2l0.7-2.8H6a2 2 0 0 1-1.9-2.7l2-6A2 2 0 0 1 8 5h9" />
    </svg>
  );
}
