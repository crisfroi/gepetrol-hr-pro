import { createFileRoute } from "@tanstack/react-router";
import { Users, Wallet, Palmtree, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";
import { KpiCard } from "@/components/app/KpiCard";
import { LoadingState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard · GEPETROL RRHH" },
      { name: "description", content: "Indicadores ejecutivos de RRHH: plantilla, nómina, permisos y alertas." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const emps = useSupabaseList<any>("employees", { select: "id, status" });
  const leaves = useSupabaseList<any>("leave_requests", { select: "id, status" });
  const runs = useSupabaseList<any>("payroll_runs", { select: "id, status, gross_total, currency" });
  const alerts = useSupabaseList<any>("payment_alerts", { select: "id, status" });

  if (emps.loading || leaves.loading || runs.loading || alerts.loading) return <LoadingState />;

  const activeEmps = emps.data.filter((e) => e.status === "active").length;
  const pendingLeaves = leaves.data.filter((l) => l.status === "pending").length;
  const openAlerts = alerts.data.filter((a) => a.status !== "resolved").length;
  const lastRun = runs.data.find((r) => r.status === "paid" || r.status === "approved");

  return (
    <>
      <PageHeader title="Dashboard ejecutivo" description="Visión general de la operación de RRHH de GEPETROL en tiempo real." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Plantilla activa" value={activeEmps.toLocaleString()} hint={`${emps.data.length} totales`} icon={Users} />
        <KpiCard label="Solicitudes pendientes" value={pendingLeaves.toString()} hint="por aprobar" icon={Palmtree} />
        <KpiCard label="Corridas de nómina" value={runs.data.length.toString()} hint={lastRun ? `Última: ${lastRun.status}` : "sin datos"} icon={Wallet} />
        <KpiCard label="Alertas activas" value={openAlerts.toString()} hint="sobrepago / desviación" icon={AlertTriangle} />
      </div>
      <Card className="mt-6">
        <CardContent className="p-6 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Estado del roadmap:</strong> H0 (base UI) ✓ · H1 (auth + roles) ✓ · H2–H7 (módulos operativos) ✓ · H8–H10 (talento, dashboards avanzados) en curso.</p>
        </CardContent>
      </Card>
    </>
  );
}
