import { createFileRoute } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Usuarios y Roles · GEPETROL RRHH" },
      { name: "description", content: "Gestión de accesos, roles y permisos granulares." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Usuarios y Roles"
      description="Gestión de accesos, roles y permisos granulares."
      icon={UsersRound}
      bullets={[
      "Alta y baja de usuarios",
      "Asignación de roles (Admin, RRHH, Finanzas, Supervisor, Empleado)",
      "Reset de contraseña y MFA",
      ]}
    />
  );
}
