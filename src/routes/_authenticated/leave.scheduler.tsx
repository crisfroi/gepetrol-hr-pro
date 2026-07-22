import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";
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
  return (
    <>
      <PageHeader
        title="Motor de asignación de vacaciones"
        description="Optimización probabilística: cobertura mínima, antigüedad, preferencias y fechas bloqueadas."
        actions={
          <Button onClick={() => toast.info("La ejecución del motor se activa en H4 (server function).")}>
            <Sparkles className="h-4 w-4" /> Ejecutar motor
          </Button>
        }
      />
      <Card>
        <CardContent className="p-4">
          {runs.loading ? <LoadingState /> : runs.data.length === 0 ? (
            <EmptyState title="Sin ejecuciones" description="Aún no se ha lanzado ninguna corrida de asignación. El motor se implementa en H4 como server function TS." action={<CalendarRange className="h-6 w-6 text-muted-foreground" />} />
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
