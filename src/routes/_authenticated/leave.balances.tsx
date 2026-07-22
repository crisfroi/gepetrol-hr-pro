import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/leave/balances")({
  head: () => ({
    meta: [
      { title: "Saldos de permiso · GEPETROL RRHH" },
      { name: "description", content: "Días devengados, usados y pendientes por empleado y tipo." },
    ],
  }),
  component: Page,
});

type Bal = { id: string; employee_id: string; leave_type_id: string; period_year: number; accrued_days: number; used_days: number; pending_days: number; carryover_days: number };

function Page() {
  const bals = useSupabaseList<Bal>("leave_balances", { order: { column: "period_year", ascending: false } });
  const emps = useSupabaseList<{ id: string; first_name: string; last_name: string }>("employees", { select: "id, first_name, last_name" });
  const types = useSupabaseList<{ id: string; name: string }>("leave_types", { select: "id, name" });
  const empName = (id: string) => { const e = emps.data.find((x) => x.id === id); return e ? `${e.first_name} ${e.last_name}` : "—"; };
  const typeName = (id: string) => types.data.find((t) => t.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader title="Saldos de permiso" description="Consumo y disponibilidad de vacaciones por empleado." />
      <Card>
        <CardContent className="p-4">
          {bals.loading ? <LoadingState /> : bals.data.length === 0 ? (
            <EmptyState title="Sin saldos calculados" description="Los saldos se generan a partir del devengo mensual (H4)." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Año</TableHead><TableHead>Empleado</TableHead><TableHead>Tipo</TableHead><TableHead>Devengado</TableHead><TableHead>Usado</TableHead><TableHead>Pendiente</TableHead><TableHead>Arrastre</TableHead></TableRow></TableHeader>
              <TableBody>{bals.data.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.period_year}</TableCell>
                  <TableCell>{empName(b.employee_id)}</TableCell>
                  <TableCell>{typeName(b.leave_type_id)}</TableCell>
                  <TableCell className="font-mono">{b.accrued_days}</TableCell>
                  <TableCell className="font-mono">{b.used_days}</TableCell>
                  <TableCell className="font-mono">{b.pending_days}</TableCell>
                  <TableCell className="font-mono">{b.carryover_days}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
