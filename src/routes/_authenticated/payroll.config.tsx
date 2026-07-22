import { createFileRoute } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/ModulePlaceholder";

export const Route = createFileRoute("/_authenticated/payroll/config")({
  head: () => ({
    meta: [
      { title: "Configuración de nómina · GEPETROL RRHH" },
      { name: "description", content: "Parámetros, métodos de cálculo y conceptos — 100% editables sin código." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <ModulePlaceholder
      title="Configuración de nómina"
      description="Parámetros, métodos de cálculo y conceptos — 100% editables sin código."
      icon={Settings2}
      bullets={[
      "Impuestos, cotizaciones y monedas",
      "Métodos: fijo, por horas, mixto, comisión, destajo",
      "Conceptos: percepciones, deducciones y bonos",
      ]}
    />
  );
}
