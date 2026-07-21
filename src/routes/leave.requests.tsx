import { createFileRoute } from "@tanstack/react-router";
import { Palmtree } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/leave/requests")({
  head: () => ({
    meta: [
      { title: "Solicitudes de permiso · GEPETROL RRHH" },
      { name: "description", content: "Solicitud y aprobación de vacaciones y permisos con flujo multinivel." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Solicitudes de permiso"
      description="Solicitud y aprobación de vacaciones y permisos con flujo multinivel."
      icon={Palmtree}
      bullets={[
      "Solicitud desde portal del empleado",
      "Flujo de aprobación configurable",
      "Notificaciones y auditoría",
      ]}
    />
  );
}
