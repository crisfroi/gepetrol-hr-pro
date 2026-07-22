import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/approvals/pending")({
  head: () => ({
    meta: [
      { title: "Aprobaciones pendientes · GEPETROL RRHH" },
      { name: "description", content: "Bandeja de items que requieren tu firma según tu rol." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Aprobaciones pendientes"
      description="Bandeja de items que requieren tu firma según tu rol."
      icon={ClipboardList}
      bullets={[
      "Filtrado por tipo y prioridad",
      "Vista rápida de detalles",
      "Acciones aprobar / rechazar / devolver",
      ]}
    />
  );
}
