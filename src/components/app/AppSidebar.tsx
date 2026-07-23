import { Link, useRouterState } from "@tanstack/react-router";
import { NAV_SECTIONS, canSeeNavItem } from "@/lib/nav";
import { BrandMark } from "./BrandMark";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { location } = useRouterState();
  const currentPath = location.pathname;
  const { roles } = useAuth();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-brand-gradient text-sidebar-foreground">
      <div className="px-5 py-5 border-b border-sidebar-border/60">
        <BrandMark />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((it) => canSeeNavItem(it, roles));
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.to === "/"
                      ? currentPath === "/"
                      : currentPath === item.to || currentPath.startsWith(item.to + "/");
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border/60 px-4 py-3 text-[11px] text-sidebar-foreground/70">
        v0.2 · RRHH ERP
      </div>
    </aside>
  );
}

