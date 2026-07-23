import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSupabaseList, insertRow, deleteRow } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Usuarios y Roles · GEPETROL RRHH" },
      { name: "description", content: "Gestión de accesos, roles y permisos granulares." },
    ],
  }),
  component: () => <RoleGuard allow={["admin"]}><Page /></RoleGuard>,
});

const ROLES = ["admin", "hr", "finance", "supervisor", "employee"];

function Page() {
  const profiles = useSupabaseList<any>("profiles", { order: { column: "full_name" } });
  const roles = useSupabaseList<any>("user_roles", {});
  const [pending, setPending] = useState<string | null>(null);

  const byUser = useMemo(() => {
    const m = new Map<string, string[]>();
    roles.data.forEach((r) => {
      const arr = m.get(r.user_id) ?? [];
      arr.push(r.role);
      m.set(r.user_id, arr);
    });
    return m;
  }, [roles.data]);

  const addRole = async (user_id: string, role: string) => {
    setPending(user_id + role);
    try { await insertRow("user_roles", { user_id, role }); roles.refresh(); }
    catch (e) { /* toast already shown */ } finally { setPending(null); }
  };
  const removeRole = async (id: string) => { await deleteRow("user_roles", id); roles.refresh(); };

  return (
    <>
      <PageHeader title="Usuarios y Roles" description="Asignación de roles: admin, RRHH, finanzas, supervisor, empleado." />
      <Card>
        <CardContent className="p-4">
          {profiles.loading || roles.loading ? <LoadingState /> : profiles.data.length === 0 ? <EmptyState title="Sin usuarios" description="Los usuarios se crean al registrarse en /auth." /> :
            <Table><TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead>Añadir rol</TableHead></TableRow></TableHeader>
              <TableBody>{profiles.data.map((p) => {
                const userRoleRows = roles.data.filter((r) => r.user_id === p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {userRoleRows.length === 0 ? <span className="text-muted-foreground text-xs">—</span> :
                        userRoleRows.map((r) => (
                          <Badge key={r.id} variant="secondary" className="cursor-pointer" onClick={() => removeRole(r.id)} title="Click para quitar">
                            {r.role} ×
                          </Badge>
                        ))}
                    </TableCell>
                    <TableCell>
                      <Select onValueChange={(v) => addRole(p.id, v)} disabled={pending?.startsWith(p.id) ?? false}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="+ rol" /></SelectTrigger>
                        <SelectContent>
                          {ROLES.filter((r) => !(byUser.get(p.id) ?? []).includes(r)).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}</TableBody></Table>
          }
        </CardContent>
      </Card>
    </>
  );
}
