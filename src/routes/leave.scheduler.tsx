import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/leave/scheduler")({
  head: () => ({
    meta: [
      { title: "Motor de asignación de vacaciones · GEPETROL RRHH" },
      { name: "description", content: "Optimización automática del calendario respetando cobertura mínima y restricciones." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Motor de asignación de vacaciones"
      description="Optimización automática del calendario respetando cobertura mínima y restricciones."
      icon={CalendarRange}
      bullets={[
      "Heurística de optimización (simulated annealing)",
      "Respeta cobertura, antigüedad y fechas bloqueadas",
      "Preparado para delegar a microservicio OptaPlanner externo",
      ]}
    />
  );
}
