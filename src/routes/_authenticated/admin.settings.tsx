import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Parámetros del sistema · GEPETROL RRHH" },
      { name: "description", content: "Configuración global: moneda, impuestos, periodicidad, políticas." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Parámetros del sistema"
      description="Configuración global: moneda, impuestos, periodicidad, políticas."
      icon={SlidersHorizontal}
      bullets={[
      "Parámetros de negocio editables",
      "Políticas de vacaciones",
      "Umbrales de alertas y flujos",
      ]}
    />
  );
}
