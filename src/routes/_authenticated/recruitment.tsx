import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/recruitment")({
  head: () => ({
    meta: [
      { title: "Reclutamiento y selección · GEPETROL RRHH" },
      { name: "description", content: "Gestión de vacantes, candidatos y pipeline de contratación." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Reclutamiento y selección"
      description="Gestión de vacantes, candidatos y pipeline de contratación."
      icon={Briefcase}
      bullets={[
      "Publicación de vacantes",
      "Pipeline Kanban de candidatos",
      "Integración futura con job boards",
      ]}
    />
  );
}
