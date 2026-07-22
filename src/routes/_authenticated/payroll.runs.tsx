import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/payroll/runs")({
  head: () => ({
    meta: [
      { title: "Corridas de nómina · GEPETROL RRHH" },
      { name: "description", content: "Generación y control de corridas por periodo, estado y moneda." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Corridas de nómina"
      description="Generación y control de corridas por periodo, estado y moneda."
      icon={Wallet}
      bullets={[
      "Estados: borrador, revisión, aprobado, pagado",
      "Totales y variaciones vs. periodo anterior",
      "Integración con workflow de aprobación",
      ]}
    />
  );
}
