import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/PageHeader";
import { RoleGuard } from "@/components/app/RoleGuard";
import { DevDataPanel } from "@/components/app/DevDataPanel";
import { PayrollParametersPanel } from "@/components/app/ConfigManagement";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Parametros del sistema - GEPETROL RRHH" },
      { name: "description", content: "Parametros de negocio configurables, auditoria documental y datos de desarrollo." },
    ],
  }),
  component: () => <RoleGuard allow={["admin"]}><Page /></RoleGuard>,
});

function Page() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <>
      <PageHeader
        title="Parametros del sistema"
        description="Configuracion operativa, generacion de datos de prueba y controles de desarrollo conectados a Supabase."
      />
      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Negocio</TabsTrigger>
          <TabsTrigger value="development">Desarrollo</TabsTrigger>
        </TabsList>
        <TabsContent value="business">
          <PayrollParametersPanel reloadKey={reloadKey} />
        </TabsContent>
        <TabsContent value="development">
          <DevDataPanel onChanged={() => setReloadKey((value) => value + 1)} />
        </TabsContent>
      </Tabs>
    </>
  );
}
