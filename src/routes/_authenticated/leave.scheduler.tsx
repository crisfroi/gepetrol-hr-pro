import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarRange, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leave/scheduler")({
  head: () => ({
    meta: [
      { title: "Motor de asignación · GEPETROL RRHH" },
      { name: "description", content: "Motor probabilístico de asignación óptima de vacaciones." },
    ],
  }),
  component: Page,
});

type Run = { id: string; period_start: string; period_end: string; status: string; algorithm: string; score: number | null; started_at: string | null; finished_at: string | null };

function Page() {
  const runs = useSupabaseList<Run>("leave_scheduling_runs", { order: { column: "started_at", ascending: false } });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [start, setStart] = useState(firstOfMonth);
  const [end, setEnd] = useState(lastOfMonth);
  const [algo, setAlgo] = useState("coverage_priority");

  const execute = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("run_leave_scheduling", {
        _period_start: start,
        _period_end: end,
        _algorithm: algo,
      });
      if (error) throw error;
      toast.success(`Motor ejecutado: ${(data as any)?.proposals ?? 0} propuestas generadas`);
      setOpen(false);
      runs.refresh();
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Motor de asignación de vacaciones"
        description="Optimización probabilística: cobertura mínima, antigüedad, preferencias y fechas bloqueadas."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Sparkles className="h-4 w-4" /> Ejecutar motor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ejecutar motor de asignación</DialogTitle></DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Inicio periodo</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
                <div><Label>Fin periodo</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Algoritmo</Label>
                  <select value={algo} onChange={(e) => setAlgo(e.target.value)} className="w-full rounded border bg-background p-2">
                    <option value="coverage_priority">Cobertura prioritaria</option>
                    <option value="seniority_weighted">Ponderado por antigüedad</option>
                    <option value="balanced">Balanceado</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button disabled={busy} onClick={execute}>{busy ? "Procesando..." : "Ejecutar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-4">
          {runs.loading ? <LoadingState /> : runs.data.length === 0 ? (
            <EmptyState title="Sin ejecuciones" description="Aún no se ha lanzado ninguna corrida de asignación." action={<CalendarRange className="h-6 w-6 text-muted-foreground" />} />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Periodo</TableHead><TableHead>Algoritmo</TableHead><TableHead>Estado</TableHead><TableHead>Score</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead></TableRow></TableHeader>
              <TableBody>{runs.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.period_start).toLocaleDateString()} → {new Date(r.period_end).toLocaleDateString()}</TableCell>
                  <TableCell>{r.algorithm}</TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="font-mono">{r.score ?? "—"}</TableCell>
                  <TableCell>{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>{r.finished_at ? new Date(r.finished_at).toLocaleString() : "—"}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
