import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList, insertRow, updateRow } from "@/lib/data-hooks";
import { generatePermitPDF } from "@/lib/permit-pdf";
import { registerDocumentAudit } from "@/lib/document-audit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leave/requests")({
  head: () => ({
    meta: [
      { title: "Solicitudes de permiso · GEPETROL RRHH" },
      { name: "description", content: "Solicitud, revisión y aprobación de vacaciones y permisos." },
    ],
  }),
  component: Page,
});

type Req = { id: string; employee_id: string; leave_type_id: string; start_date: string; end_date: string; days_requested: number; status: string; reason: string | null };
type Emp = { id: string; first_name: string; last_name: string; employee_code: string };
type Type = { id: string; name: string };

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", approved: "secondary", rejected: "destructive", cancelled: "outline",
};

function Page() {
  const reqs = useSupabaseList<Req>("leave_requests", { order: { column: "start_date", ascending: false } });
  const emps = useSupabaseList<Emp>("employees", { select: "id, first_name, last_name, employee_code", order: { column: "last_name" } });
  const types = useSupabaseList<Type>("leave_types", { select: "id, name", order: { column: "name" } });
  const [open, setOpen] = useState(false);
  const empName = (id: string) => { const e = emps.data.find((x) => x.id === id); return e ? `${e.first_name} ${e.last_name}` : "—"; };
  const typeName = (id: string) => types.data.find((t) => t.id === id)?.name ?? "—";

  const decide = async (id: string, status: "approved" | "rejected") => {
    await updateRow("leave_requests", id, { status, decided_at: new Date().toISOString() });
    reqs.refresh();
  };

  return (
    <>
      <PageHeader title="Solicitudes de permiso" description="Vacaciones, permisos y ausencias. Aprobación por RRHH y supervisores." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nueva solicitud</Button></DialogTrigger>
          <ReqForm emps={emps.data} types={types.data} onDone={() => { setOpen(false); reqs.refresh(); }} />
        </Dialog>
      } />
      <Card>
        <CardContent className="p-4">
          {reqs.loading ? <LoadingState /> : reqs.data.length === 0 ? (
            <EmptyState title="Sin solicitudes" description="Registra la primera solicitud de permiso." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Tipo</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead><TableHead>Días</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
              <TableBody>{reqs.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{empName(r.employee_id)}</TableCell>
                  <TableCell>{typeName(r.leave_type_id)}</TableCell>
                  <TableCell>{new Date(r.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(r.end_date).toLocaleDateString()}</TableCell>
                  <TableCell>{r.days_requested}</TableCell>
                  <TableCell><Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge></TableCell>
                  <TableCell>
                    {r.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => decide(r.id, "approved")}>Aprobar</Button>
                        <Button size="sm" variant="ghost" onClick={() => decide(r.id, "rejected")}>Rechazar</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ReqForm({ emps, types, onDone }: { emps: Emp[]; types: Type[]; onDone: () => void }) {
  const [f, setF] = useState({ employee_id: "", leave_type_id: "", start_date: "", end_date: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const days = f.start_date && f.end_date ? Math.max(1, Math.round((+new Date(f.end_date) - +new Date(f.start_date)) / 86400000) + 1) : 0;
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nueva solicitud</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><Label>Empleado</Label>
          <Select value={f.employee_id} onValueChange={(v) => setF({ ...f, employee_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.employee_code} — {e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Tipo de permiso</Label>
          <Select value={f.leave_type_id} onValueChange={(v) => setF({ ...f, leave_type_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Desde</Label><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
          <div><Label>Hasta</Label><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Días solicitados: <span className="font-mono">{days}</span></p>
        <div><Label>Motivo</Label><Textarea value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} rows={3} /></div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.employee_id || !f.leave_type_id || !days} onClick={async () => {
          setSaving(true);
          try {
            await insertRow("leave_requests", {
              employee_id: f.employee_id, leave_type_id: f.leave_type_id,
              start_date: f.start_date, end_date: f.end_date, days_requested: days,
              reason: f.reason || null, status: "pending",
            });
            onDone();
          } finally { setSaving(false); }
        }}>Enviar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
