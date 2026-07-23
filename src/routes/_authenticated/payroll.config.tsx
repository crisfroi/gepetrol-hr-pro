import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/PageHeader";
import { RoleGuard } from "@/components/app/RoleGuard";
import {
  PayrollConceptsPanel,
  PayrollMethodsPanel,
  PayrollParametersPanel,
} from "@/components/app/ConfigManagement";

export const Route = createFileRoute("/_authenticated/payroll/config")({
  head: () => ({
    meta: [
      { title: "Configuracion de nomina - GEPETROL RRHH" },
      { name: "description", content: "Parametros, conceptos y metodos de calculo configurables." },
    ],
  }),
  component: () => <RoleGuard allow={["admin", "hr", "finance"]}><Page /></RoleGuard>,
});

function Page() {
  return (
    <>
      <PageHeader
        title="Configuracion de nomina"
        description="Parametros, conceptos y metodos editables desde base de datos; el frontend no codifica reglas de negocio."
      />
      <Tabs defaultValue="params">
        <TabsList>
          <TabsTrigger value="params">Parametros</TabsTrigger>
          <TabsTrigger value="concepts">Conceptos</TabsTrigger>
          <TabsTrigger value="methods">Metodos</TabsTrigger>
        </TabsList>
        <TabsContent value="params">
          <PayrollParametersPanel />
        </TabsContent>
        <TabsContent value="concepts">
          <PayrollConceptsPanel />
        </TabsContent>
        <TabsContent value="methods">
          <PayrollMethodsPanel />
        </TabsContent>
      </Tabs>
    </>
  );
}
