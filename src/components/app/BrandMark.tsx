export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={"flex items-center gap-2 " + (className ?? "")}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="gp-brand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00A88F" />
            <stop offset="100%" stopColor="#006A5B" />
          </linearGradient>
        </defs>
        {/* Espiral / nautilo simplificado */}
        <path
          d="M16 3a13 13 0 1 0 13 13 8 8 0 1 1-8-8 5 5 0 1 0 5 5"
          stroke="url(#gp-brand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-wide text-sidebar-foreground">
          GEPETROL
        </div>
        <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/70">
          ERP · RRHH
        </div>
      </div>
    </div>
  );
}
