import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/schedules")({
  head: () => ({
    meta: [
      { title: "Turnos y Horarios · GEPETROL RRHH" },
      { name: "description", content: "Horarios de trabajo, turnos rotativos y calendario de cobertura." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Turnos y Horarios"
      description="Horarios de trabajo, turnos rotativos y calendario de cobertura."
      icon={CalendarClock}
      bullets={[
      "Definición de horarios y turnos",
      "Asignación por empleado y fecha",
      "Vista de cobertura por departamento",
      ]}
    />
  );
}
