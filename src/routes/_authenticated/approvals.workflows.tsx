import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/approvals/workflows")({
  head: () => ({
    meta: [
      { title: "Workflows de aprobación · GEPETROL RRHH" },
      { name: "description", content: "Definición de niveles y roles requeridos para autorizar pagos." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Workflows de aprobación"
      description="Definición de niveles y roles requeridos para autorizar pagos."
      icon={ShieldCheck}
      bullets={[
      "Niveles configurables (RRHH → Finanzas → Dirección)",
      "Umbrales por monto",
      "Historial inmutable de decisiones",
      ]}
    />
  );
}
