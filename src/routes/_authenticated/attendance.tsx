import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList, insertRow } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Asistencia · GEPETROL RRHH" },
      { name: "description", content: "Registro de asistencia diaria: check-in, check-out, incidencias." },
    ],
  }),
  component: Page,
});

type Rec = { id: string; employee_id: string; work_date: string; check_in: string | null; check_out: string | null; source: string; notes: string | null };
type Emp = { id: string; first_name: string; last_name: string; employee_code: string };

function Page() {
  const recs = useSupabaseList<Rec>("attendance_records", { order: { column: "work_date", ascending: false }, limit: 200 });
  const emps = useSupabaseList<Emp>("employees", { select: "id, first_name, last_name, employee_code", order: { column: "last_name" } });
  const [open, setOpen] = useState(false);
  const empName = (id: string) => {
    const e = emps.data.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : "—";
  };

  return (
    <>
      <PageHeader title="Asistencia" description="Registro de entrada y salida, incidencias y control diario." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><LogIn className="h-4 w-4" /> Registrar</Button></DialogTrigger>
          <RecForm emps={emps.data} onDone={() => { setOpen(false); recs.refresh(); }} />
        </Dialog>
      } />
      <Card>
        <CardContent className="p-4">
          {recs.loading ? <LoadingState /> : recs.data.length === 0 ? (
            <EmptyState title="Sin registros" description="Aún no hay registros de asistencia." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Empleado</TableHead><TableHead>Entrada</TableHead><TableHead>Salida</TableHead><TableHead>Fuente</TableHead></TableRow></TableHeader>
              <TableBody>{recs.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.work_date).toLocaleDateString()}</TableCell>
                  <TableCell>{empName(r.employee_id)}</TableCell>
                  <TableCell>{r.check_in ? new Date(r.check_in).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell>{r.check_out ? new Date(r.check_out).toLocaleTimeString() : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function RecForm({ emps, onDone }: { emps: Emp[]; onDone: () => void }) {
  const now = new Date();
  const [f, setF] = useState({ employee_id: "", work_date: now.toISOString().slice(0, 10), check_in: now.toISOString().slice(0, 16), check_out: "", notes: "" });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Registrar asistencia</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><Label>Empleado</Label>
          <Select value={f.employee_id} onValueChange={(v) => setF({ ...f, employee_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.employee_code} — {e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Fecha</Label><Input type="date" value={f.work_date} onChange={(e) => setF({ ...f, work_date: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Entrada</Label><Input type="datetime-local" value={f.check_in} onChange={(e) => setF({ ...f, check_in: e.target.value })} /></div>
          <div><Label>Salida</Label><Input type="datetime-local" value={f.check_out} onChange={(e) => setF({ ...f, check_out: e.target.value })} /></div>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.employee_id} onClick={async () => {
          setSaving(true);
          try {
            await insertRow("attendance_records", {
              employee_id: f.employee_id, work_date: f.work_date,
              check_in: f.check_in ? new Date(f.check_in).toISOString() : null,
              check_out: f.check_out ? new Date(f.check_out).toISOString() : null,
              source: "manual",
            });
            onDone();
          } finally { setSaving(false); }
        }}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
