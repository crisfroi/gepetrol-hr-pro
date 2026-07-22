import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/training")({
  head: () => ({
    meta: [
      { title: "Capacitación y Desarrollo · GEPETROL RRHH" },
      { name: "description", content: "Programas de formación, matrices de competencias y certificaciones." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Capacitación y Desarrollo"
      description="Programas de formación, matrices de competencias y certificaciones."
      icon={GraduationCap}
      bullets={[
      "Catálogo de cursos",
      "Matriz de competencias por puesto",
      "Certificaciones y vigencias",
      ]}
    />
  );
}
