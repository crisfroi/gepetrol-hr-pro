import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { RoleGuard } from "@/components/app/RoleGuard";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList, updateRow } from "@/lib/data-hooks";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/approvals/pending")({
  head: () => ({
    meta: [
      { title: "Aprobaciones pendientes · GEPETROL RRHH" },
      { name: "description", content: "Pagos pendientes de aprobación en la cadena de autorización." },
    ],
  }),
  component: () => <RoleGuard allow={["admin","finance","supervisor"]}><Page /></RoleGuard>,
});

function Page() {
  const rows = useSupabaseList<any>("payment_approvals", { order: { column: "created_at", ascending: false }, filter: (q) => q.eq("decision", "pending") });
  const decide = async (id: string, decision: "approved" | "rejected") => {
    const { data: user } = await supabase.auth.getUser();
    await updateRow("payment_approvals", id, { decision, approver_id: user.user?.id ?? null, decided_at: new Date().toISOString() });
    rows.refresh();
  };
  return (
    <>
      <PageHeader title="Aprobaciones pendientes" description="Cadena de aprobación de pagos: aprobar o rechazar según tu rol." />
      <Card>
        <CardContent className="p-4">
          {rows.loading ? <LoadingState /> : rows.data.length === 0 ? <EmptyState title="Nada pendiente" description="No hay aprobaciones en espera." /> :
            <Table><TableHeader><TableRow><TableHead>Paso</TableHead><TableHead>Payslip / Run</TableHead><TableHead>Decisión</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
              <TableBody>{rows.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.step_id}</TableCell>
                  <TableCell className="font-mono text-xs">{r.payroll_run_id ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.decision}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => decide(r.id, "approved")}>Aprobar</Button>
                    <Button size="sm" variant="ghost" onClick={() => decide(r.id, "rejected")}>Rechazar</Button>
                  </TableCell>
                </TableRow>
              ))}</TableBody></Table>
          }
        </CardContent>
      </Card>
    </>
  );
}
