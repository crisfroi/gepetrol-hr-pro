import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSupabaseList } from "@/lib/data-hooks";
import { supabase } from "@/integrations/supabase/client";
import { exportToXlsx, exportToPdf } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Auditoría · GEPETROL RRHH" },
      { name: "description", content: "Bitácora inmutable de cambios en entidades críticas." },
    ],
  }),
  component: () => <RoleGuard allow={["admin"]}><Page /></RoleGuard>,
});

const ACTION_LABEL: Record<string, string> = {
  INSERT: "Creación",
  UPDATE: "Modificación",
  DELETE: "Eliminación",
  development_seed_generated: "Datos de prueba generados",
  development_seed_deleted: "Datos de prueba eliminados",
  document_generated: "Documento firmado",
  leave_scheduling_run_completed: "Motor de vacaciones ejecutado",
  leave_balances_recalculated: "Saldos de permisos recalculados",
};

const ENTITY_LABEL: Record<string, string> = {
  employees: "Empleados",
  employment_contracts: "Contratos",
  departments: "Departamentos",
  positions: "Puestos",
  payroll_runs: "Corridas de nómina",
  payslips: "Recibos",
  payment_approvals: "Aprobaciones",
  user_roles: "Roles de usuario",
  leave_requests: "Solicitudes de permiso",
  leave_balances: "Saldos de permisos",
  leave_scheduling_runs: "Corridas del motor",
  development_seed_batches: "Lotes de datos de prueba",
  document_audit_keys: "Firmas de documentos",
};

const actionLabel = (a?: string) => (a ? ACTION_LABEL[a] ?? a : "—");
const entityLabel = (e?: string) => (e ? ENTITY_LABEL[e] ?? e : "—");

const ACTION_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  INSERT: "secondary",
  UPDATE: "outline",
  DELETE: "destructive",
};

function Page() {
  const [q, setQ] = useState("");
  const rows = useSupabaseList<any>("audit_log", { order: { column: "created_at", ascending: false }, limit: 500 });
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; email: string | null }>>({});

  useEffect(() => {
    const ids = Array.from(new Set(rows.data.map((r) => r.actor_user_id).filter(Boolean)));
    if (ids.length === 0) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const map: Record<string, any> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    })();
  }, [rows.data]);

  const actorName = (id: string | null) => {
    if (!id) return "Sistema";
    const p = profiles[id];
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    if (!s) return rows.data;
    return rows.data.filter((r) =>
      entityLabel(r.entity).toLowerCase().includes(s) ||
      actionLabel(r.action).toLowerCase().includes(s) ||
      actorName(r.actor_user_id).toLowerCase().includes(s)
    );
  }, [rows.data, q, profiles]);

  const exportRows = filtered.map((r) => ({
    fecha: new Date(r.created_at).toLocaleString(),
    accion: actionLabel(r.action),
    entidad: entityLabel(r.entity),
    id: r.entity_id ?? "—",
    actor: actorName(r.actor_user_id),
  }));
  const cols = [
    { key: "fecha", label: "Fecha" },
    { key: "accion", label: "Acción" },
    { key: "entidad", label: "Entidad" },
    { key: "id", label: "ID" },
    { key: "actor", label: "Actor" },
  ];

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Registro inmutable de operaciones sobre entidades críticas (nómina, aprobaciones, contratos, roles)."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToXlsx(exportRows, cols, "auditoria")}><FileSpreadsheet className="h-4 w-4" /> XLSX</Button>
            <Button variant="outline" size="sm" onClick={() => exportToPdf(exportRows, cols, "auditoria", "Bitácora de auditoría")}><FileDown className="h-4 w-4" /> PDF</Button>
          </div>
        }
      />
      <Card>
        <CardContent className="p-4 space-y-3">
          <Input placeholder="Filtrar por acción, entidad o actor..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          {rows.loading ? <LoadingState /> : filtered.length === 0 ? (
            <EmptyState title="Sin eventos" description="Aún no se han registrado cambios auditables." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Autor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={ACTION_VARIANT[r.action] ?? "outline"}>{actionLabel(r.action)}</Badge></TableCell>
                    <TableCell>{entityLabel(r.entity)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.entity_id?.slice(0, 8) ?? "—"}</TableCell>
                    <TableCell className="text-sm">{actorName(r.actor_user_id)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
