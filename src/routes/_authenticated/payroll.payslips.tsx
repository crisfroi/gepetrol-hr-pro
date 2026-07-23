import { createFileRoute } from "@tanstack/react-router";
import { FileDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { generatePayslipPDF } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/payroll/payslips")({
  head: () => ({
    meta: [
      { title: "Recibos de nómina · GEPETROL RRHH" },
      { name: "description", content: "Recibos individuales, desglose de conceptos y consulta histórica." },
    ],
  }),
  component: Page,
});

type P = { id: string; employee_id: string; run_id: string; gross: number; net: number; currency: string; deductions: number };

function Page() {
  const rows = useSupabaseList<P>("payslips", { order: { column: "created_at", ascending: false } });
  const emps = useSupabaseList<{ id: string; first_name: string; last_name: string; employee_code: string | null }>("employees", { select: "id, first_name, last_name, employee_code" });
  const runs = useSupabaseList<any>("payroll_runs", { select: "id, period_start, period_end" });

  const empByID = (id: string) => emps.data.find((x) => x.id === id);
  const empName = (id: string) => { const e = empByID(id); return e ? `${e.first_name} ${e.last_name}` : "—"; };

  const downloadPDF = async (p: P) => {
    try {
      const [{ data: items }, { data: emp }, { data: run }] = await Promise.all([
        (supabase.from as any)("payslip_line_items").select("*, payroll_concepts(code, name, kind)").eq("payslip_id", p.id),
        (supabase.from as any)("employees").select("first_name, last_name, employee_code, national_id").eq("id", p.employee_id).maybeSingle(),
        (supabase.from as any)("payroll_runs").select("period_start, period_end, pay_date").eq("id", p.run_id).maybeSingle(),
      ]);
      generatePayslipPDF({ payslip: p, employee: emp, run, items: items ?? [] });
    } catch (e: any) {
      toast.error(`Error generando PDF: ${e.message}`);
    }
  };

  return (
    <>
      <PageHeader title="Recibos de nómina" description="Detalle por empleado y corrida. Descarga en PDF." />
      <Card>
        <CardContent className="p-4">
          {rows.loading ? <LoadingState /> : rows.data.length === 0 ? (
            <EmptyState title="Sin recibos" description="Los recibos se generan al procesar una corrida." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Periodo</TableHead><TableHead>Bruto</TableHead><TableHead>Deducciones</TableHead><TableHead>Neto</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{rows.data.map((p) => {
                const run = runs.data.find((r) => r.id === p.run_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{empName(p.employee_id)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{run ? `${new Date(run.period_start).toLocaleDateString()} → ${new Date(run.period_end).toLocaleDateString()}` : "—"}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(p.gross, p.currency)}</TableCell>
                    <TableCell className="font-mono text-destructive">{formatCurrency(p.deductions, p.currency)}</TableCell>
                    <TableCell className="font-mono font-semibold">{formatCurrency(p.net, p.currency)}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => downloadPDF(p)}><FileDown className="h-4 w-4" /> PDF</Button></TableCell>
                  </TableRow>
                );
              })}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
