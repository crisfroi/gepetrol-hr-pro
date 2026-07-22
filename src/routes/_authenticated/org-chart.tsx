import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/org-chart")({
  head: () => ({
    meta: [
      { title: "Organigrama · GEPETROL RRHH" },
      { name: "description", content: "Estructura organizacional jerárquica interactiva de GEPETROL." },
    ],
  }),
  component: Page,
});

type Dept = { id: string; name: string; code: string; parent_id: string | null; cost_center: string | null };

function buildTree(depts: Dept[]) {
  const map = new Map<string, Dept & { children: any[] }>();
  depts.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: any[] = [];
  map.forEach((d) => {
    if (d.parent_id && map.has(d.parent_id)) map.get(d.parent_id)!.children.push(d);
    else roots.push(d);
  });
  return roots;
}

function Node({ node, depth = 0 }: { node: any; depth?: number }) {
  return (
    <div className="ml-0">
      <div className="flex items-start gap-2 py-1.5" style={{ paddingLeft: depth * 20 }}>
        <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
        <div>
          <div className="font-medium">{node.name}</div>
          <div className="text-xs text-muted-foreground font-mono">{node.code}{node.cost_center ? ` · ${node.cost_center}` : ""}</div>
        </div>
      </div>
      {node.children.map((c: any) => <Node key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

function Page() {
  const depts = useSupabaseList<Dept>("departments", { order: { column: "name" } });
  const tree = useMemo(() => buildTree(depts.data), [depts.data]);

  return (
    <>
      <PageHeader title="Organigrama" description="Estructura organizacional jerárquica de GEPETROL." />
      <Card>
        <CardContent className="p-6">
          {depts.loading ? <LoadingState /> : tree.length === 0 ? (
            <EmptyState title="Sin estructura" description="Crea departamentos para visualizar el organigrama." />
          ) : (
            <div className="flex items-start gap-3">
              <Network className="h-5 w-5 text-primary mt-2" />
              <div className="flex-1">{tree.map((r) => <Node key={r.id} node={r} />)}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
