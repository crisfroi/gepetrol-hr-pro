import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payroll/payslips")({
  head: () => ({
    meta: [
      { title: "Recibos de nómina · GEPETROL RRHH" },
      { name: "description", content: "Recibos individuales, desglose de conceptos y consulta histórica." },
    ],
  }),
  component: Page,
});

type P = { id: string; employee_id: string; payroll_run_id: string; gross: number; net: number; currency: string; total_deductions: number };

function Page() {
  const rows = useSupabaseList<P>("payslips", { order: { column: "created_at", ascending: false } });
  const emps = useSupabaseList<{ id: string; first_name: string; last_name: string }>("employees", { select: "id, first_name, last_name" });
  const empName = (id: string) => { const e = emps.data.find((x) => x.id === id); return e ? `${e.first_name} ${e.last_name}` : "—"; };

  return (
    <>
      <PageHeader title="Recibos de nómina" description="Detalle por empleado y corrida." />
      <Card>
        <CardContent className="p-4">
          {rows.loading ? <LoadingState /> : rows.data.length === 0 ? (
            <EmptyState title="Sin recibos" description="Los recibos se generan al procesar una corrida (H5)." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Bruto</TableHead><TableHead>Deducciones</TableHead><TableHead>Neto</TableHead></TableRow></TableHeader>
              <TableBody>{rows.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{empName(p.employee_id)}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(p.gross, p.currency)}</TableCell>
                  <TableCell className="font-mono text-destructive">{formatCurrency(p.total_deductions, p.currency)}</TableCell>
                  <TableCell className="font-mono font-semibold">{formatCurrency(p.net, p.currency)}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
