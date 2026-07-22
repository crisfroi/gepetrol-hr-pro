import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Auditoría · GEPETROL RRHH" },
      { name: "description", content: "Bitácora inmutable de cambios en entidades críticas." },
    ],
  }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const rows = useSupabaseList<any>("audit_log", { order: { column: "created_at", ascending: false }, limit: 300 });
  const filtered = rows.data.filter((r) => !q || r.entity?.toLowerCase().includes(q.toLowerCase()) || r.action?.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Auditoría" description="Registro inmutable de operaciones sobre entidades críticas (nómina, aprobaciones, contratos, roles)." />
      <Card>
        <CardContent className="p-4 space-y-3">
          <Input placeholder="Filtrar por entidad o acción..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          {rows.loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState title="Sin eventos" description="Aún no se han registrado cambios auditables." /> :
            <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Acción</TableHead><TableHead>Entidad</TableHead><TableHead>ID</TableHead><TableHead>Actor</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.entity}</TableCell>
                  <TableCell className="font-mono text-xs">{r.entity_id?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{r.actor_user_id?.slice(0, 8) ?? "sistema"}</TableCell>
                </TableRow>
              ))}</TableBody></Table>
          }
        </CardContent>
      </Card>
    </>
  );
}
