import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonTone = "primary" | "accent";
export type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  loading?: boolean;
};

const BASE_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:cursor-not-allowed";

const SIZE_CLASS: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-b3",
  sm: "px-2.5 py-1 text-xs",
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary " +
    "disabled:bg-border-strong disabled:text-medium-gray",
  secondary:
    "border border-border-strong bg-transparent text-main hover:bg-surface-alt active:bg-surface " +
    "disabled:border-border disabled:text-dark-gray",
  ghost: "disabled:opacity-60",
};

const GHOST_TONE_CLASS: Record<ButtonTone, string> = {
  primary: "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25",
  accent: "border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 active:bg-accent/25",
};

const SPINNER_SIZE_CLASS: Record<ButtonSize, string> = {
  md: "size-3.5",
  sm: "size-3",
};

export function Button({
  variant = "primary",
  tone = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const variantClass = variant === "ghost" ? `${VARIANT_CLASS.ghost} ${GHOST_TONE_CLASS[tone]}` : VARIANT_CLASS[variant];

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[BASE_CLASS, SIZE_CLASS[size], variantClass, className].filter(Boolean).join(" ")}
    >
      {loading ? (
        <span
          className={`${SPINNER_SIZE_CLASS[size]} animate-spin rounded-full border-2 border-current border-t-transparent`}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}
