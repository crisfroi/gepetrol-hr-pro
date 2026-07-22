import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Auditoría · GEPETROL RRHH" },
      { name: "description", content: "Bitácora inmutable de acciones críticas del sistema." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Auditoría"
      description="Bitácora inmutable de acciones críticas del sistema."
      icon={History}
      bullets={[
      "Registro de INSERT/UPDATE/DELETE en tablas críticas",
      "Valores antes y después en JSONB",
      "Búsqueda por usuario, entidad y fecha",
      ]}
    />
  );
}
