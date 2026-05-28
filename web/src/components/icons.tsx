// Shared SVG icon components — all use currentColor, sized 14×14 by default.
// Wrap with a span/div and set `color` via CSS to control color.

type IconProps = { size?: number; strokeWidth?: number; className?: string };

export function IconTrendUp({ size = 14, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polyline points="3,17 9,11 13,14 21,6" />
      <polyline points="15,6 21,6 21,12" />
    </svg>
  );
}

export function IconTrendDown({ size = 14, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polyline points="3,7 9,13 13,10 21,18" />
      <polyline points="15,18 21,18 21,12" />
    </svg>
  );
}

export function IconBarChart({ size = 14, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}

export function IconBank({ size = 14, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polygon points="3,9 12,3 21,9" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="21" x2="21" y2="21" />
      <line x1="6" y1="9" x2="6" y2="21" />
      <line x1="10" y1="9" x2="10" y2="21" />
      <line x1="14" y1="9" x2="14" y2="21" />
      <line x1="18" y1="9" x2="18" y2="21" />
    </svg>
  );
}

export function IconCoin({ size = 14, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a3 3 0 0 1 5 2.5c0 1.5-1.5 2.5-2.5 3H14" />
      <line x1="9" y1="15.5" x2="15" y2="15.5" />
    </svg>
  );
}

export function IconHome({ size = 14, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <polyline points="9,22 9,13 15,13 15,22" />
    </svg>
  );
}

export function IconCar({ size = 14, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 17H3v-5l2.5-6h11L19 12v5h-2" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="17.5" r="2.5" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

export function IconBox({ size = 14, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 8L12 3 3 8v8l9 5 9-5z" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05" />
    </svg>
  );
}

export function IconCheck({ size = 14, strokeWidth = 2, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );
}

export function IconWarning({ size = 14, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
