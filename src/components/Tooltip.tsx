import type { ReactNode } from 'react';

export function Tooltip({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-base-elevated px-2.5 py-1.5 text-[11px] font-medium text-content-primary opacity-0 shadow-panel transition-opacity duration-150 group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

export function InfoDot({ label }: { label: string }) {
  return (
    <Tooltip label={label}>
      <span className="ml-1 inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-line text-[9px] text-content-secondary hover:text-intel">
        i
      </span>
    </Tooltip>
  );
}
