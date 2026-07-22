import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Asistencia · GEPETROL RRHH" },
      { name: "description", content: "Registro de entrada y salida, incidencias y control diario." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Asistencia"
      description="Registro de entrada y salida, incidencias y control diario."
      icon={Clock}
      bullets={[
      "Check-in web y móvil con geolocalización",
      "Justificación de incidencias",
      "Reportes por empleado y departamento",
      ]}
    />
  );
}
