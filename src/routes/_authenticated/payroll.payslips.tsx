import { createFileRoute } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/payroll/payslips")({
  head: () => ({
    meta: [
      { title: "Recibos de nómina · GEPETROL RRHH" },
      { name: "description", content: "Recibo individual por empleado con detalle de percepciones y deducciones." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Recibos de nómina"
      description="Recibo individual por empleado con detalle de percepciones y deducciones."
      icon={Receipt}
      bullets={[
      "Descarga en PDF",
      "Distribución al portal del empleado",
      "Histórico consultable",
      ]}
    />
  );
}
