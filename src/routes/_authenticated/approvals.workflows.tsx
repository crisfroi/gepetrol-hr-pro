import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/approvals/workflows")({
  head: () => ({
    meta: [
      { title: "Workflow de aprobación · GEPETROL RRHH" },
      { name: "description", content: "Niveles configurables de autorización por tipo de pago." },
    ],
  }),
  component: Page,
});

function Page() {
  const wf = useSupabaseList<any>("payment_approval_workflows", { order: { column: "name" } });
  const steps = useSupabaseList<any>("payment_approval_steps", { order: { column: "step_order" } });
  return (
    <>
      <PageHeader title="Workflow de aprobación" description="Cadena de aprobación configurable por tipo y monto." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Workflows</h3>
          {wf.loading ? <LoadingState /> : wf.data.length === 0 ? <EmptyState title="Sin workflows" description="Define al menos un workflow por tipo de pago." /> :
            <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Activo</TableHead></TableRow></TableHeader>
              <TableBody>{wf.data.map((w) => (
                <TableRow key={w.id}><TableCell>{w.name}</TableCell><TableCell><Badge variant="outline">{w.payment_type}</Badge></TableCell><TableCell>{w.active ? <Badge variant="secondary">Sí</Badge> : "—"}</TableCell></TableRow>
              ))}</TableBody></Table>
          }
        </CardContent></Card>
        <Card><CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">Pasos por nivel</h3>
          {steps.loading ? <LoadingState /> : steps.data.length === 0 ? <EmptyState title="Sin pasos definidos" description="Añade niveles con rol requerido a cada workflow." /> :
            <Table><TableHeader><TableRow><TableHead>Orden</TableHead><TableHead>Rol</TableHead><TableHead>Umbral</TableHead></TableRow></TableHeader>
              <TableBody>{steps.data.map((s) => (
                <TableRow key={s.id}><TableCell className="font-mono">{s.step_order}</TableCell><TableCell><Badge variant="outline">{s.required_role}</Badge></TableCell><TableCell className="font-mono">{s.threshold_amount ?? "—"}</TableCell></TableRow>
              ))}</TableBody></Table>
          }
        </CardContent></Card>
      </div>
    </>
  );
}
