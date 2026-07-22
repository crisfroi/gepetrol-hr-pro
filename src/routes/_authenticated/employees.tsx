import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({
    meta: [
      { title: "Empleados · GEPETROL RRHH" },
      { name: "description", content: "Directorio de personal, altas, bajas y ficha 360°." },
    ],
  }),
  component: Page,
});

type Emp = { id: string; employee_code: string; first_name: string; last_name: string; email: string | null; status: string; hire_date: string; department_id: string | null; position_id: string | null };
type Dept = { id: string; name: string };
type Pos = { id: string; title: string };

function Page() {
  const emps = useSupabaseList<Emp>("employees", { order: { column: "last_name" } });
  const depts = useSupabaseList<Dept>("departments", { select: "id, name", order: { column: "name" } });
  const positions = useSupabaseList<Pos>("positions", { select: "id, title", order: { column: "title" } });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return emps.data.filter((e) => !s || e.first_name.toLowerCase().includes(s) || e.last_name.toLowerCase().includes(s) || e.employee_code.toLowerCase().includes(s));
  }, [emps.data, q]);

  const deptName = (id: string | null) => depts.data.find((d) => d.id === id)?.name ?? "—";
  const posTitle = (id: string | null) => positions.data.find((p) => p.id === id)?.title ?? "—";

  return (
    <>
      <PageHeader title="Empleados" description="Directorio de personal de GEPETROL." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo empleado</Button></DialogTrigger>
          <EmpForm depts={depts.data} positions={positions.data} onDone={() => { setOpen(false); emps.refresh(); }} />
        </Dialog>
      } />
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o código..." className="pl-8" />
          </div>
          {emps.loading ? <LoadingState /> : filtered.length === 0 ? (
            <EmptyState title="Sin empleados" description="Registra el primer empleado para empezar." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Departamento</TableHead><TableHead>Puesto</TableHead><TableHead>Ingreso</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                  <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                  <TableCell>{deptName(e.department_id)}</TableCell>
                  <TableCell>{posTitle(e.position_id)}</TableCell>
                  <TableCell>{new Date(e.hire_date).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={e.status === "active" ? "secondary" : "outline"}>{e.status}</Badge></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function EmpForm({ depts, positions, onDone }: { depts: Dept[]; positions: Pos[]; onDone: () => void }) {
  const [f, setF] = useState({ employee_code: "", first_name: "", last_name: "", email: "", hire_date: new Date().toISOString().slice(0, 10), department_id: "", position_id: "" });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo empleado</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Código</Label><Input value={f.employee_code} onChange={(e) => setF({ ...f, employee_code: e.target.value })} placeholder="EMP-0001" /></div>
        <div><Label>Ingreso</Label><Input type="date" value={f.hire_date} onChange={(e) => setF({ ...f, hire_date: e.target.value })} /></div>
        <div><Label>Nombre</Label><Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></div>
        <div><Label>Apellidos</Label><Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><Label>Departamento</Label>
          <Select value={f.department_id} onValueChange={(v) => setF({ ...f, department_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Puesto</Label>
          <Select value={f.position_id} onValueChange={(v) => setF({ ...f, position_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.employee_code || !f.first_name || !f.last_name} onClick={async () => {
          setSaving(true);
          try {
            await insertRow("employees", {
              employee_code: f.employee_code, first_name: f.first_name, last_name: f.last_name,
              email: f.email || null, hire_date: f.hire_date,
              department_id: f.department_id || null, position_id: f.position_id || null,
              status: "active",
            });
            onDone();
          } finally { setSaving(false); }
        }}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
