import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/payroll/config")({
  head: () => ({
    meta: [
      { title: "Configuración de nómina · GEPETROL RRHH" },
      { name: "description", content: "Parámetros, conceptos y métodos de cálculo configurables." },
    ],
  }),
  component: Page,
});

function Page() {
  const params = useSupabaseList<any>("payroll_parameters", { order: { column: "key" } });
  const concepts = useSupabaseList<any>("payroll_concepts", { order: { column: "sort_order" } });
  const methods = useSupabaseList<any>("payroll_calculation_methods", { order: { column: "name" } });
  return (
    <>
      <PageHeader title="Configuración de nómina" description="Todos los parámetros del cálculo — nada hardcodeado." />
      <Tabs defaultValue="params">
        <TabsList>
          <TabsTrigger value="params">Parámetros</TabsTrigger>
          <TabsTrigger value="concepts">Conceptos</TabsTrigger>
          <TabsTrigger value="methods">Métodos</TabsTrigger>
        </TabsList>
        <TabsContent value="params">
          <Card><CardContent className="p-4">
            {params.loading ? <LoadingState /> : params.data.length === 0 ? <EmptyState title="Sin parámetros" description="Impuestos, cotizaciones, monedas, periodicidad." /> :
              <Table><TableHeader><TableRow><TableHead>Clave</TableHead><TableHead>Valor</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead></TableRow></TableHeader>
                <TableBody>{params.data.map((p) => (
                  <TableRow key={p.id}><TableCell className="font-mono text-xs">{p.key}</TableCell><TableCell className="font-mono">{JSON.stringify(p.value)}</TableCell><TableCell><Badge variant="outline">{p.value_type}</Badge></TableCell><TableCell className="text-muted-foreground">{p.description ?? "—"}</TableCell></TableRow>
                ))}</TableBody></Table>
            }
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="concepts">
          <Card><CardContent className="p-4">
            {concepts.loading ? <LoadingState /> : concepts.data.length === 0 ? <EmptyState title="Sin conceptos" description="Percepciones, deducciones y bonificaciones." /> :
              <Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Fórmula</TableHead><TableHead>Activo</TableHead></TableRow></TableHeader>
                <TableBody>{concepts.data.map((c) => (
                  <TableRow key={c.id}><TableCell className="font-mono text-xs">{c.code}</TableCell><TableCell>{c.name}</TableCell><TableCell><Badge variant="outline">{c.concept_type}</Badge></TableCell><TableCell className="font-mono text-xs max-w-xs truncate">{c.formula ?? "—"}</TableCell><TableCell>{c.active ? <Badge variant="secondary">Sí</Badge> : "—"}</TableCell></TableRow>
                ))}</TableBody></Table>
            }
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="methods">
          <Card><CardContent className="p-4">
            {methods.loading ? <LoadingState /> : methods.data.length === 0 ? <EmptyState title="Sin métodos" description="Fijo, por horas, mixto, comisión, destajo." /> :
              <Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead></TableRow></TableHeader>
                <TableBody>{methods.data.map((m) => (
                  <TableRow key={m.id}><TableCell className="font-mono text-xs">{m.code}</TableCell><TableCell>{m.name}</TableCell><TableCell className="text-muted-foreground">{m.description ?? "—"}</TableCell></TableRow>
                ))}</TableBody></Table>
            }
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
