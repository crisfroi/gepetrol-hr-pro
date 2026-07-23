import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { NAV_SECTIONS, canSeeNavItem } from "@/lib/nav";
import { BrandMark } from "./BrandMark";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type AppSidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
};

export function AppSidebar({ collapsed, mobileOpen, onCloseMobile, onToggleCollapsed }: AppSidebarProps) {
  const { location } = useRouterState();
  const currentPath = location.pathname;
  const { roles } = useAuth();

  const content = (
    <>
      <div className="flex h-[73px] items-center justify-between border-b border-sidebar-border/60 px-4">
        <BrandMark compact={collapsed} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground lg:inline-flex"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Mostrar menu lateral" : "Colapsar menu lateral"}
          title={collapsed ? "Mostrar menu lateral" : "Colapsar menu lateral"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
          onClick={onCloseMobile}
          aria-label="Cerrar menu lateral"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((it) => canSeeNavItem(it, roles));
            if (items.length === 0) return null;
            return (
              <div key={section.title}>
                {!collapsed ? (
                  <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">
                    {section.title}
                  </div>
                ) : null}
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
                          onClick={onCloseMobile}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            "flex h-9 items-center rounded-md text-sm transition-colors",
                            collapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
                            active
                              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed ? <span className="truncate">{item.label}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>
      <div className="border-t border-sidebar-border/60 px-4 py-3 text-[11px] text-sidebar-foreground/70">
        {collapsed ? "v0.2" : "v0.2 · RRHH ERP"}
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col bg-brand-gradient text-sidebar-foreground transition-[width] duration-200 lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        {content}
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-black/45"
            aria-label="Cerrar menu lateral"
            onClick={onCloseMobile}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-brand-gradient text-sidebar-foreground shadow-xl">
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
