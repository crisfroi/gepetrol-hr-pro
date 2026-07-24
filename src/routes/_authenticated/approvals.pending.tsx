import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { RoleGuard } from "@/components/app/RoleGuard";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList, updateRow } from "@/lib/data-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/approvals/pending")({
  head: () => ({
    meta: [
      { title: "Aprobaciones pendientes · GEPETROL RRHH" },
      { name: "description", content: "Pagos pendientes de aprobación en la cadena de autorización." },
    ],
  }),
  component: () => <RoleGuard allow={["admin", "finance", "supervisor"]}><Page /></RoleGuard>,
});

function Page() {
  // El enum approval_decision NO tiene 'pending'. Pendiente = decided_at IS NULL.
  const rows = useSupabaseList<any>("payment_approvals", {
    order: { column: "created_at", ascending: false },
    filter: (q) => q.is("decided_at", null),
  });
  const runs = useSupabaseList<any>("payroll_runs", { select: "id, period_start, period_end, total_gross, total_net, currency, status" });
  const [selected, setSelected] = useState<any | null>(null);
  const [comment, setComment] = useState("");

  const decide = async (id: string, decision: "approved" | "rejected" | "returned") => {
    try {
      const { data: user } = await supabase.auth.getUser();
      await updateRow("payment_approvals", id, {
        decision,
        approver_id: user.user?.id ?? null,
        decided_at: new Date().toISOString(),
        comment: comment || null,
      });
      setSelected(null);
      setComment("");
      rows.refresh();
      toast.success(`Aprobación registrada: ${decision}`);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    }
  };

  const runInfo = (id: string | null) => {
    if (!id) return null;
    return runs.data.find((r) => r.id === id);
  };

  return (
    <>
      <PageHeader
        title="Aprobaciones pendientes"
        description="Cadena de aprobación de pagos: aprobar, devolver o rechazar según tu rol."
      />
      <Card>
        <CardContent className="p-4">
          {rows.loading ? <LoadingState /> : rows.data.length === 0 ? (
            <EmptyState title="Nada pendiente" description="No hay aprobaciones en espera." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corrida</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Total Bruto</TableHead>
                  <TableHead>Total Neto</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.data.map((r) => {
                  const run = runInfo(r.payroll_run_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.payroll_run_id?.slice(0, 8) ?? "—"}</TableCell>
                      <TableCell>
                        {run ? `${new Date(run.period_start).toLocaleDateString()} → ${new Date(run.period_end).toLocaleDateString()}` : "—"}
                      </TableCell>
                      <TableCell className="font-mono">{run?.total_gross?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="font-mono">{run?.total_net?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="secondary" onClick={() => { setSelected(r); setComment(""); }}>Revisar</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revisión de aprobación</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Corrida <span className="font-mono">{selected.payroll_run_id?.slice(0, 8)}</span> · creada {new Date(selected.created_at).toLocaleString()}
              </div>
              {(() => {
                const run = runInfo(selected.payroll_run_id);
                return run ? (
                  <div className="grid gap-2 sm:grid-cols-3 rounded border p-3 text-sm">
                    <div><span className="text-muted-foreground">Periodo</span><div>{new Date(run.period_start).toLocaleDateString()} → {new Date(run.period_end).toLocaleDateString()}</div></div>
                    <div><span className="text-muted-foreground">Total Bruto</span><div className="font-mono">{run.total_gross?.toLocaleString() ?? "—"}</div></div>
                    <div><span className="text-muted-foreground">Total Neto</span><div className="font-mono">{run.total_net?.toLocaleString() ?? "—"}</div></div>
                  </div>
                ) : null;
              })()}
              <div>
                <label className="text-sm font-medium">Comentario</label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Motivo o notas de la decisión..." />
              </div>
              <Badge variant="outline">Decisiones válidas: aprobar · devolver · rechazar</Badge>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => decide(selected.id, "rejected")}>Rechazar</Button>
              <Button variant="outline" onClick={() => decide(selected.id, "returned")}>Devolver</Button>
              <Button onClick={() => decide(selected.id, "approved")}>Aprobar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
