import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";
import { LoadingState } from "@/components/app/DataStates";
import { ShieldAlert } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";

const ROUTE_ROLES: Record<string, AppRole[]> = {
  "/employees": ["admin", "hr", "supervisor", "finance"],
  "/departments": ["admin", "hr"],
  "/contracts": ["admin", "hr", "finance"],
  "/schedules": ["admin", "hr", "supervisor"],
  "/leave/scheduler": ["admin", "hr"],
  "/payroll/runs": ["admin", "hr", "finance"],
  "/payroll/payslips": ["admin", "hr", "finance"],
  "/payroll/config": ["admin", "hr", "finance"],
  "/approvals/workflows": ["admin", "finance"],
  "/approvals/pending": ["admin", "finance", "supervisor"],
  "/approvals/alerts": ["admin", "finance"],
  "/alerts": ["admin", "hr", "finance", "supervisor"],
  "/recruitment": ["admin", "hr"],
  "/performance": ["admin", "hr", "supervisor"],
  "/training": ["admin", "hr"],
  "/benefits": ["admin", "hr"],
  "/compliance": ["admin", "hr"],
  "/audit": ["admin"],
  "/admin/users": ["admin"],
  "/admin/settings": ["admin"],
};

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppShell>
      <RouteAccessGate />
    </AppShell>
  );
}

function RouteAccessGate() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { roles, loading } = useAuth();
  const allowedRoles = ROUTE_ROLES[pathname];

  if (loading) return <LoadingState />;
  if (allowedRoles && !allowedRoles.some((role) => roles.includes(role))) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-destructive" />
        <h2 className="text-lg font-semibold text-destructive">Acceso restringido</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No tienes permiso para acceder a este módulo.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
