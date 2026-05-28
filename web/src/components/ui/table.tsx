import {
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  type HTMLAttributes,
  type TableHTMLAttributes,
} from "react";

type TableSectionProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode;
};

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  caption?: ReactNode;
};

export function Table({ children, caption, className = "", style, ...props }: TableProps) {
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: "0.5rem", overflow: "hidden" }}>
      {caption && (
        <div
          className="px-4 py-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.07em]"
          style={{
            backgroundColor: "var(--color-surface-raised)",
            borderBottom: "1px solid var(--color-border)",
            color: "var(--color-text-subtle)",
          }}
        >
          {caption}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={`data-table ${className}`.trim()} style={style} {...props}>{children}</table>
      </div>
    </div>
  );
}

export function Thead({ children, ...props }: TableSectionProps) {
  return <thead {...props}>{children}</thead>;
}

export function Tbody({ children, ...props }: TableSectionProps) {
  return <tbody {...props}>{children}</tbody>;
}

export function Tfoot({ children, ...props }: TableSectionProps) {
  return <tfoot {...props}>{children}</tfoot>;
}

type ThProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
  numeric?: boolean;
  muted?: boolean;
};

export function Th({ children, numeric, muted, className = "", ...props }: ThProps) {
  const cls = [numeric ? "col-num" : "", muted ? "col-muted" : "", className].filter(Boolean).join(" ");
  return (
    <th scope="col" className={cls || undefined} {...props}>
      {children}
    </th>
  );
}

type TdProps = TdHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
  numeric?: boolean;
  muted?: boolean;
};

export function Td({ children, numeric, muted, className = "", style, ...props }: TdProps) {
  const cls = [numeric ? "col-num" : "", muted ? "col-muted" : "", className].filter(Boolean).join(" ");
  return (
    <td className={cls || undefined} style={style} {...props}>
      {children}
    </td>
  );
}

type TrProps = HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode;
  separator?: boolean;
};

export function Tr({ children, separator, style, className = "", ...props }: TrProps) {
  return (
    <tr
      className={className}
      style={separator ? { borderTop: "2px solid var(--color-border)", ...style } : style}
      {...props}
    >
      {children}
    </tr>
  );
}
