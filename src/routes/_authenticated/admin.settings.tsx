import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Parámetros del sistema · GEPETROL RRHH" },
      { name: "description", content: "Parámetros de negocio configurables: impuestos, monedas, umbrales." },
    ],
  }),
  component: Page,
});

function Page() {
  const params = useSupabaseList<any>("payroll_parameters", { order: { column: "key" } });
  return (
    <>
      <PageHeader title="Parámetros del sistema" description="Todos los parámetros de negocio en tablas de configuración — el frontend los lee, nunca los codifica." />
      <Card>
        <CardContent className="p-4">
          {params.loading ? <LoadingState /> : params.data.length === 0 ? <EmptyState title="Sin parámetros" description="Aún no se han cargado parámetros de negocio." /> :
            <Table><TableHeader><TableRow><TableHead>Clave</TableHead><TableHead>Valor</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead></TableRow></TableHeader>
              <TableBody>{params.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.key}</TableCell>
                  <TableCell className="font-mono">{JSON.stringify(p.value)}</TableCell>
                  <TableCell><Badge variant="outline">{p.value_type}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{p.description ?? "—"}</TableCell>
                </TableRow>
              ))}</TableBody></Table>
          }
        </CardContent>
      </Card>
    </>
  );
}
