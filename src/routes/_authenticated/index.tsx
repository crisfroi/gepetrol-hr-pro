import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  Wallet,
  Palmtree,
  AlertTriangle,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { KpiCard } from "@/components/app/KpiCard";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · GEPETROL RRHH" },
      {
        name: "description",
        content: "Indicadores ejecutivos de RRHH: plantilla, ausentismo, nómina y alertas.",
      },
    ],
  }),
  component: Dashboard,
});

// Datos mock — se reemplazarán por queries reales en H2+
const KPIS = [
  { label: "Plantilla activa", value: "1.284", hint: "vs. mes anterior", icon: Users, trend: { direction: "up" as const, value: "+1,2%" } },
  { label: "Costo de nómina (mes)", value: formatCurrency(482_500_000, "XAF"), hint: "presupuesto 96%", icon: Wallet, trend: { direction: "up" as const, value: "+3,4%" } },
  { label: "Ausentismo", value: "3,8%", hint: "objetivo < 4%", icon: Palmtree, trend: { direction: "down" as const, value: "-0,4 pp" } },
  { label: "Alertas de sobrepago", value: "7", hint: "pendientes de revisión", icon: AlertTriangle, trend: { direction: "flat" as const, value: "sin cambios" } },
];

const RECENT_APPROVALS = [
  { id: 1, run: "Nómina Oct 2026 — Upstream", amount: 182_400_000, status: "Pendiente Finanzas" },
  { id: 2, run: "Bono producción Q3", amount: 24_800_000, status: "Aprobado" },
  { id: 3, run: "Nómina Oct 2026 — Corporativo", amount: 76_100_000, status: "En revisión RRHH" },
];

function Dashboard() {
  return (
    <>
      <PageHeader
        title="Dashboard ejecutivo"
        description="Visión general de la operación de RRHH de GEPETROL. Los datos mostrados son de referencia; la conexión al backend se activa en la fase H1."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Aprobaciones recientes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {RECENT_APPROVALS.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{r.run}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(r.amount, "XAF")}
                    </div>
                  </div>
                  <Badge
                    variant={r.status === "Aprobado" ? "default" : "secondary"}
                    className={r.status === "Aprobado" ? "bg-success text-success-foreground" : ""}
                  >
                    {r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Tendencia de plantilla</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {[62, 68, 71, 74, 78, 82, 88, 92, 96, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-brand-gradient"
                  style={{ height: `${h}%` }}
                  aria-hidden
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Últimos 10 meses · datos ilustrativos
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
