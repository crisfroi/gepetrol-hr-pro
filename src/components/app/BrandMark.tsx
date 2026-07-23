export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={"flex items-center gap-2 " + (className ?? "")}>
      <img
        src="/LOGO%20GEP.webp"
        alt="GEPETROL"
        className="h-9 w-9 shrink-0 rounded-sm bg-white/95 object-contain p-0.5"
      />
      {!compact ? (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-wide text-sidebar-foreground">
            GEPETROL
          </div>
          <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/70">
            ERP · RRHH
          </div>
        </div>
      ) : null}
    </div>
  );
}
