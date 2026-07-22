import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({
    meta: [
      { title: "Departamentos y Puestos · GEPETROL RRHH" },
      { name: "description", content: "Estructura organizativa, centros de coste y catálogo de puestos." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Departamentos y Puestos"
      description="Estructura organizativa, centros de coste y catálogo de puestos."
      icon={Building2}
      bullets={[
      "CRUD de departamentos jerárquicos",
      "Catálogo de puestos con grado y descripción",
      "Asignación de centro de coste",
      ]}
    />
  );
}
