import { type ReactNode, type HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: "sm" | "md" | "lg" | "none";
};

const paddingMap = { none: "", sm: "p-3", md: "p-4", lg: "p-6" };

export function Card({ children, padding = "md", className = "", style, ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl ${paddingMap[padding]} ${className}`}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-2 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-wider ${className}`}
      style={{ color: "var(--color-text-subtle)" }}
    >
      {children}
    </p>
  );
}
