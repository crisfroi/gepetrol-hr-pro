import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({
    meta: [
      { title: "Empleados · GEPETROL RRHH" },
      { name: "description", content: "Ficha 360° de personal, historial laboral, documentos, onboarding y offboarding." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Empleados"
      description="Ficha 360° de personal, historial laboral, documentos, onboarding y offboarding."
      icon={Users}
      bullets={[
      "Directorio con filtros por departamento, estado y contrato",
      "Historial de puestos y movimientos",
      "Gestión documental integrada con Supabase Storage",
      ]}
    />
  );
}
