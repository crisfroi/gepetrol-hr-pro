import { createFileRoute } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/leave/balances")({
  head: () => ({
    meta: [
      { title: "Saldos de vacaciones · GEPETROL RRHH" },
      { name: "description", content: "Devengo automático de días según antigüedad y política." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Saldos de vacaciones"
      description="Devengo automático de días según antigüedad y política."
      icon={Scale}
      bullets={[
      "Saldo anual, usado y pendiente por tipo",
      "Cálculo automático por antigüedad",
      "Carryover configurable",
      ]}
    />
  );
}
