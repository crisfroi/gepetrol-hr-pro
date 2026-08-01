import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/app/DataStates";
import { PageHeader } from "@/components/app/PageHeader";
import { insertRow, useSupabaseList } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/compliance")({
  head: () => ({
    meta: [
      { title: "Cumplimiento y certificaciones · GEPETROL RRHH" },
      { name: "description", content: "Control de requisitos, certificaciones y vencimientos obligatorios." },
    ],
  }),
  component: CompliancePage,
});

type Requirement = { id: string; code: string; name: string; validity_months: number | null; active: boolean };
type Certification = { id: string; employee_id: string; requirement_id: string; expires_at: string | null; state: string };
type Employee = { id: string; first_name: string; last_name: string; employee_code: string };

function CompliancePage() {
  const requirements = useSupabaseList<Requirement>("compliance_requirements", { order: { column: "name" } });
  const certifications = useSupabaseList<Certification>("employee_certifications", { order: { column: "expires_at" } });
  const employees = useSupabaseList<Employee>("employees", { select: "id, first_name, last_name, employee_code", order: { column: "last_name" } });
  const [open, setOpen] = useState(false);

  const employeeName = (employeeId: string) => {
    const employee = employees.data.find((item) => item.id === employeeId);
    return employee ? `${employee.employee_code} — ${employee.first_name} ${employee.last_name}` : "—";
  };
  const requirementName = (requirementId: string) => requirements.data.find((item) => item.id === requirementId)?.name ?? "—";
  const expiringCount = certifications.data.filter((item) => {
    if (!item.expires_at || item.state !== "valid") return false;
    const days = (new Date(item.expires_at).getTime() - Date.now()) / 86_400_000;
    return days <= 60;
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cumplimiento y certificaciones"
        description="Requisitos obligatorios, evidencias y alertas de vencimiento para operaciones Oil & Gas."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Nuevo requisito</Button>
            </DialogTrigger>
            <RequirementForm onDone={() => { setOpen(false); requirements.refresh(); }} />
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi title="Requisitos activos" value={requirements.data.filter((item) => item.active).length} />
        <Kpi title="Certificaciones válidas" value={certifications.data.filter((item) => item.state === "valid").length} />
        <Kpi title="Vencen en 60 días" value={expiringCount} destructive={expiringCount > 0} />
      </div>

      <Card>
        <CardContent className="p-4">
          {certifications.loading || requirements.loading || employees.loading ? <LoadingState /> : certifications.data.length === 0 ? (
            <EmptyState title="Sin certificaciones" description="Crea requisitos y registra las evidencias verificadas de cada empleado." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Requisito</TableHead><TableHead>Vencimiento</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>{certifications.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{employeeName(item.employee_id)}</TableCell>
                  <TableCell>{requirementName(item.requirement_id)}</TableCell>
                  <TableCell>{item.expires_at ? new Date(item.expires_at).toLocaleDateString() : "No vence"}</TableCell>
                  <TableCell><Badge variant={item.state === "valid" ? "secondary" : "outline"}>{item.state}</Badge></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ title, value, destructive = false }: { title: string; value: number; destructive?: boolean }) {
  return (
    <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{title}</p><p className={destructive ? "text-3xl font-semibold text-destructive" : "text-3xl font-semibold"}>{value}</p></CardContent></Card>
  );
}

function RequirementForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ code: "", name: "", validityMonths: "12" });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo requisito de cumplimiento</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><Label>Código</Label><Input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="HSE-BOSIET" /></div>
        <div><Label>Nombre</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Certificación de seguridad" /></div>
        <div><Label>Vigencia (meses)</Label><Input type="number" min="1" value={form.validityMonths} onChange={(event) => setForm({ ...form, validityMonths: event.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button
          disabled={saving || !form.code || !form.name}
          onClick={async () => {
            setSaving(true);
            try {
              await insertRow("compliance_requirements", { code: form.code, name: form.name, validity_months: Number(form.validityMonths) || null });
              onDone();
            } finally {
              setSaving(false);
            }
          }}
        >Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
