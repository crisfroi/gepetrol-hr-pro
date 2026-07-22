import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Evaluación de Desempeño · GEPETROL RRHH" },
      { name: "description", content: "Ciclos de evaluación, objetivos y feedback 360°." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Evaluación de Desempeño"
      description="Ciclos de evaluación, objetivos y feedback 360°."
      icon={Target}
      bullets={[
      "Ciclos anuales y trimestrales",
      "Objetivos OKR",
      "Feedback 360° y planes de desarrollo",
      ]}
    />
  );
}
