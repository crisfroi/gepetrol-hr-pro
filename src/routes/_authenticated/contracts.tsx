import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({
    meta: [
      { title: "Contratos laborales · GEPETROL RRHH" },
      { name: "description", content: "Gestión de contratos, tipos, vigencias, salario base y método de cálculo." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Contratos laborales"
      description="Gestión de contratos, tipos, vigencias, salario base y método de cálculo."
      icon={FileText}
      bullets={[
      "Contratos permanentes, temporales y de servicios",
      "Alertas de vencimiento",
      "Renovaciones y anexos",
      ]}
    />
  );
}
