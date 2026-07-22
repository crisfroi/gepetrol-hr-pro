import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/benefits")({
  head: () => ({
    meta: [
      { title: "Beneficios y Compensaciones · GEPETROL RRHH" },
      { name: "description", content: "Administración de beneficios, seguros y compensaciones variables." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Beneficios y Compensaciones"
      description="Administración de beneficios, seguros y compensaciones variables."
      icon={Gift}
      bullets={[
      "Planes de beneficios por grupo",
      "Seguros médicos y vida",
      "Bonos y compensación variable",
      ]}
    />
  );
}
