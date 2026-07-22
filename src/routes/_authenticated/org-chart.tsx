import { createFileRoute } from "@tanstack/react-router";
import { Network } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/org-chart")({
  head: () => ({
    meta: [
      { title: "Organigrama · GEPETROL RRHH" },
      { name: "description", content: "Estructura organizacional jerárquica interactiva de GEPETROL." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Organigrama"
      description="Estructura organizacional jerárquica interactiva de GEPETROL."
      icon={Network}
      bullets={[
      "Vista de árbol expandible",
      "Navegación por departamento",
      "Exportación PDF",
      ]}
    />
  );
}
