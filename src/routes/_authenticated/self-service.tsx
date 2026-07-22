import { createFileRoute } from "@tanstack/react-router";
import { UserCircle2 } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/self-service")({
  head: () => ({
    meta: [
      { title: "Portal del Empleado · GEPETROL RRHH" },
      { name: "description", content: "Autoservicio para consultar recibos, solicitar permisos y actualizar datos." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Portal del Empleado"
      description="Autoservicio para consultar recibos, solicitar permisos y actualizar datos."
      icon={UserCircle2}
      bullets={[
      "Recibos y constancias",
      "Solicitud de permisos y vacaciones",
      "Actualización de datos personales",
      ]}
    />
  );
}
