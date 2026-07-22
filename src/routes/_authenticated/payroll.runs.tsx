import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList, insertRow, updateRow } from "@/lib/data-hooks";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payroll/runs")({
  head: () => ({
    meta: [
      { title: "Corridas de nómina · GEPETROL RRHH" },
      { name: "description", content: "Ejecución mensual de nómina: borradores, revisión, aprobación y pago." },
    ],
  }),
  component: Page,
});

type Run = { id: string; period_start: string; period_end: string; status: string; currency: string; gross_total: number | null; net_total: number | null; notes: string | null };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline", review: "outline", approved: "secondary", paid: "secondary", cancelled: "destructive",
};

function Page() {
  const runs = useSupabaseList<Run>("payroll_runs", { order: { column: "period_start", ascending: false } });
  const [open, setOpen] = useState(false);
  const advance = async (id: string, next: string) => {
    await updateRow("payroll_runs", id, { status: next });
    runs.refresh();
  };
  return (
    <>
      <PageHeader title="Corridas de nómina" description="Ciclos de nómina por periodo con estados de borrador, revisión, aprobación y pago." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nueva corrida</Button></DialogTrigger>
          <RunForm onDone={() => { setOpen(false); runs.refresh(); }} />
        </Dialog>
      } />
      <Card>
        <CardContent className="p-4">
          {runs.loading ? <LoadingState /> : runs.data.length === 0 ? (
            <EmptyState title="Sin corridas" description="Crea la primera corrida mensual." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Periodo</TableHead><TableHead>Estado</TableHead><TableHead>Bruto</TableHead><TableHead>Neto</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
              <TableBody>{runs.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.period_start).toLocaleDateString()} → {new Date(r.period_end).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge></TableCell>
                  <TableCell className="font-mono">{r.gross_total != null ? formatCurrency(r.gross_total, r.currency) : "—"}</TableCell>
                  <TableCell className="font-mono">{r.net_total != null ? formatCurrency(r.net_total, r.currency) : "—"}</TableCell>
                  <TableCell>
                    {r.status === "draft" && <Button size="sm" variant="secondary" onClick={() => advance(r.id, "review")}>Enviar a revisión</Button>}
                    {r.status === "review" && <Button size="sm" variant="secondary" onClick={() => advance(r.id, "approved")}>Aprobar</Button>}
                    {r.status === "approved" && <Button size="sm" variant="secondary" onClick={() => advance(r.id, "paid")}>Marcar pagada</Button>}
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function RunForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ period_start: "", period_end: "", currency: "XAF", notes: "" });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nueva corrida de nómina</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Periodo desde</Label><Input type="date" value={f.period_start} onChange={(e) => setF({ ...f, period_start: e.target.value })} /></div>
          <div><Label>Periodo hasta</Label><Input type="date" value={f.period_end} onChange={(e) => setF({ ...f, period_end: e.target.value })} /></div>
        </div>
        <div><Label>Moneda</Label><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></div>
        <div><Label>Notas</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.period_start || !f.period_end} onClick={async () => {
          setSaving(true);
          try {
            await insertRow("payroll_runs", { period_start: f.period_start, period_end: f.period_end, currency: f.currency, status: "draft", notes: f.notes || null });
            onDone();
          } finally { setSaving(false); }
        }}>Crear borrador</Button>
      </DialogFooter>
    </DialogContent>
  );
}
