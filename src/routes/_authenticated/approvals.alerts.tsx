import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList, updateRow } from "@/lib/data-hooks";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/approvals/alerts")({
  head: () => ({
    meta: [
      { title: "Alertas de sobrepago · GEPETROL RRHH" },
      { name: "description", content: "Detección de desviaciones significativas en pagos de nómina." },
    ],
  }),
  component: Page,
});

function Page() {
  const rows = useSupabaseList<any>("payment_alerts", { order: { column: "created_at", ascending: false } });
  const resolve = async (id: string) => {
    await updateRow("payment_alerts", id, { status: "resolved", resolved_at: new Date().toISOString() });
    rows.refresh();
  };
  return (
    <>
      <PageHeader title="Alertas de sobrepago" description="Desviaciones detectadas por el motor de anomalías." />
      <Card>
        <CardContent className="p-4">
          {rows.loading ? <LoadingState /> : rows.data.length === 0 ? (
            <EmptyState title="Sin alertas activas" description="El detector compara cada payslip con el histórico del empleado." action={<AlertTriangle className="h-6 w-6 text-muted-foreground" />} />
          ) : (
            <Table><TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Esperado</TableHead><TableHead>Real</TableHead><TableHead>Desviación</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>{rows.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><Badge variant={a.kind === "overpay" ? "destructive" : "outline"}>{a.kind}</Badge></TableCell>
                  <TableCell className="font-mono">{a.expected_amount != null ? formatCurrency(a.expected_amount, "XAF") : "—"}</TableCell>
                  <TableCell className="font-mono">{a.actual_amount != null ? formatCurrency(a.actual_amount, "XAF") : "—"}</TableCell>
                  <TableCell className="font-mono">{a.deviation_pct}%</TableCell>
                  <TableCell><Badge variant="outline">{a.status ?? "open"}</Badge></TableCell>
                  <TableCell>{a.status !== "resolved" && <Button size="sm" variant="secondary" onClick={() => resolve(a.id)}>Resolver</Button>}</TableCell>
                </TableRow>
              ))}</TableBody></Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
