import { type ReactNode, type HTMLAttributes, type ButtonHTMLAttributes } from "react";

export function DataList({ children, header, headerClassName = "", listClassName = "", className = "", flush = false }: { children: ReactNode; header?: ReactNode; headerClassName?: string; listClassName?: string; className?: string; flush?: boolean }) {
  if (flush) {
    return (
      <div className={className}>
        {header && (
          <div
            className={`data-list-header ${headerClassName}`}
            style={{ borderRadius: 0, borderBottom: "1px solid var(--color-border)" }}
          >
            {header}
          </div>
        )}
        <ul className={listClassName}>{children}</ul>
      </div>
    );
  }
  return (
    <div className={`overflow-hidden rounded-lg ${className}`} style={{ border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}>
      {header && (
        <div className={`data-list-header ${headerClassName}`} style={{ borderBottom: "1px solid var(--color-border)", borderRadius: 0 }}>
          {header}
        </div>
      )}
      <ul className={listClassName}>
        {children}
      </ul>
    </div>
  );
}

export function DataListHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`data-list-header ${className}`}>{children}</div>;
}

type DataListRowProps = HTMLAttributes<HTMLLIElement> & {
  children: ReactNode;
};

export function DataListRow({ children, className = "", ...props }: DataListRowProps) {
  return (
    <li className={`data-list-row ${className}`} {...props}>
      {children}
    </li>
  );
}

type RowActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  danger?: boolean;
};

export function RowAction({ children, danger, className = "", ...props }: RowActionProps) {
  return (
    <button
      className={`${danger ? "row-action-danger" : "row-action"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
