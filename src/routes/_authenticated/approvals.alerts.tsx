import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/approvals/alerts")({
  head: () => ({
    meta: [
      { title: "Alertas de sobrepago · GEPETROL RRHH" },
      { name: "description", content: "Detección automática de desviaciones vs. histórico del empleado." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Alertas de sobrepago"
      description="Detección automática de desviaciones vs. histórico del empleado."
      icon={AlertTriangle}
      bullets={[
      "Comparación con promedio y rango esperado",
      "Umbral configurable (por defecto 15%)",
      "Bloqueo de aprobación hasta revisión",
      ]}
    />
  );
}
