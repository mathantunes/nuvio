import { type ReactNode } from "react";

type Variant = "success" | "danger" | "warning" | "neutral" | "brand";

const variantStyles: Record<Variant, { color: string; backgroundColor: string }> = {
  success: { color: "var(--color-success)", backgroundColor: "var(--color-success-subtle)" },
  danger:  { color: "var(--color-danger)",  backgroundColor: "var(--color-danger-subtle)"  },
  warning: { color: "var(--color-warning)", backgroundColor: "var(--color-warning-subtle)" },
  neutral: { color: "var(--color-text-muted)", backgroundColor: "var(--color-surface-raised)" },
  brand:   { color: "var(--color-brand)",   backgroundColor: "var(--color-brand-subtle)"   },
};

type BadgeProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}

/** Convenience: picks variant based on numeric sign */
export function AmountBadge({ value, children }: { value: number; children: ReactNode }) {
  const variant = value > 0 ? "success" : value < 0 ? "danger" : "neutral";
  return <Badge variant={variant}>{children}</Badge>;
}
