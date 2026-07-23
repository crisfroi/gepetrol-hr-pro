import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { LoadingState } from "./DataStates";

export function RoleGuard({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { roles, loading } = useAuth();
  if (loading) return <LoadingState />;
  const ok = allow.some((r) => roles.includes(r));
  if (!ok) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive mb-2" />
        <h2 className="text-lg font-semibold text-destructive">Acceso restringido</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Este módulo requiere uno de los roles: {allow.join(", ")}. Contacta a un administrador.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
