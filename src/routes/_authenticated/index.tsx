import { createFileRoute } from "@tanstack/react-router";
import { Users, Wallet, Palmtree, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { KpiCard } from "@/components/app/KpiCard";
import { LoadingState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";
import { Link } from "@tanstack/react-router";

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
  const runs = useSupabaseList<any>("payroll_runs", { select: "id, status, total_gross, currency" });
  const alerts = useSupabaseList<any>("event_alerts", { select: "id, status, severity, title, alert_type, created_at" });

  if (emps.loading || leaves.loading || runs.loading || alerts.loading) return <LoadingState />;

  const activeEmps = emps.data.filter((e) => e.status === "active").length;
  const pendingLeaves = leaves.data.filter((l) => l.status === "pending").length;
  const openAlerts = alerts.data.filter((a) => a.status === "pending").length;
  const criticalAlerts = alerts.data.filter((a) => a.severity === "critical").length;
  const lastRun = runs.data.find((r) => r.status === "paid" || r.status === "approved");

  const recentAlerts = alerts.data
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard ejecutivo" description="Visión general de la operación de RRHH de GEPETROL en tiempo real." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Plantilla activa" value={activeEmps.toLocaleString()} hint={`${emps.data.length} totales`} icon={Users} />
        <KpiCard label="Solicitudes pendientes" value={pendingLeaves.toString()} hint="por aprobar" icon={Palmtree} />
        <KpiCard label="Corridas de nómina" value={runs.data.length.toString()} hint={lastRun ? `Última: ${lastRun.status}` : "sin datos"} icon={Wallet} />
        <KpiCard label="Alertas activas" value={openAlerts.toString()} hint={criticalAlerts > 0 ? `${criticalAlerts} crítica${criticalAlerts === 1 ? '' : 's'}` : "bajo control"} icon={AlertTriangle} />
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alertas recientes</CardTitle>
            <CardDescription>Últimas 5 alertas del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">No hay alertas recientes</div>
            ) : (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="flex gap-3 p-2 rounded-md border border-muted">
                  <div className="flex-1">
                    <div className="flex gap-2 items-start mb-1">
                      <span className="text-sm font-medium flex-1">{alert.title}</span>
                      <Badge
                        variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.alert_type}</p>
                  </div>
                </div>
              ))
            )}
            {openAlerts > 0 && (
              <Link to="/alerts" className="block mt-3">
                <Button variant="outline" size="sm" className="w-full">
                  Ver todas las alertas ({openAlerts})
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado del sistema</CardTitle>
            <CardDescription>Indicadores operacionales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm">Empleados activos</span>
              <Badge variant="outline">{activeEmps}</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm">Solicitudes pendientes</span>
              <Badge variant="outline">{pendingLeaves}</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm">Corridas de nómina</span>
              <Badge variant="outline">{runs.data.length}</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">Alertas críticas</span>
              <Badge variant={criticalAlerts > 0 ? 'destructive' : 'outline'}>
                {criticalAlerts}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-6 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Estado del roadmap:</strong> H0 (base UI) ✓ · H1 (auth + roles) ✓ · H2–H7 (módulos operativos) ✓ · H8–H10 (talento, dashboards avanzados) en curso.</p>
        </CardContent>
      </Card>
    </>
  );
}
