import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Plus, Edit, Eye, Trash2 } from "lucide-react";
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
import { useSupabaseList, insertRow, updateRow, deleteRow } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({
    meta: [
      { title: "Departamentos y Puestos · GEPETROL RRHH" },
      { name: "description", content: "Estructura organizativa, centros de coste y catálogo de puestos." },
    ],
  }),
  component: Page,
});

type Dept = { id: string; code: string; name: string; cost_center: string | null; parent_id: string | null; active: boolean };
type Pos = { id: string; code: string; title: string; grade: string | null; department_id: string | null; active: boolean };

function Page() {
  const depts = useSupabaseList<Dept>("departments", { order: { column: "name" } });
  const positions = useSupabaseList<Pos>("positions", { order: { column: "title" } });
  const [openDept, setOpenDept] = useState(false);
  const [openPos, setOpenPos] = useState(false);
  const [editingDept, setEditingDept] = useState<Dept | null>(null);
  const [editingPos, setEditingPos] = useState<Pos | null>(null);

  const handleDeleteDept = async (id: string) => {
    if (!confirm("¿Eliminar este departamento?")) return;
    await deleteRow("departments", id);
    depts.refresh();
  };

  const handleDeletePos = async (id: string) => {
    if (!confirm("¿Eliminar este puesto?")) return;
    await deleteRow("positions", id);
    positions.refresh();
  };

  return (
    <>
      <PageHeader
        title="Departamentos y Puestos"
        description="Estructura organizativa, centros de coste y catálogo de puestos."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Departamentos</h3>
              <Dialog open={openDept} onOpenChange={setOpenDept}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nuevo</Button></DialogTrigger>
                <DeptForm depts={depts.data} onDone={() => { setOpenDept(false); depts.refresh(); }} />
              </Dialog>
            </div>
            {depts.loading ? <LoadingState /> : depts.data.length === 0 ? (
              <EmptyState title="Sin departamentos" description="Crea el primer departamento para empezar." />
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>C. Coste</TableHead><TableHead></TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>{depts.data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.code}</TableCell>
                    <TableCell>{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.cost_center ?? "—"}</TableCell>
                    <TableCell>{d.active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingDept(d)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeleteDept(d.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Puestos</h3>
              <Dialog open={openPos} onOpenChange={setOpenPos}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nuevo</Button></DialogTrigger>
                <PosForm depts={depts.data} onDone={() => { setOpenPos(false); positions.refresh(); }} />
              </Dialog>
            </div>
            {positions.loading ? <LoadingState /> : positions.data.length === 0 ? (
              <EmptyState title="Sin puestos" description="Añade puestos al catálogo." />
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>Grado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>{positions.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">{p.grade ?? "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingPos(p)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDeletePos(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {editingDept && (
        <Dialog open={!!editingDept} onOpenChange={() => setEditingDept(null)}>
          <DeptForm dept={editingDept} depts={depts.data} onDone={() => { setEditingDept(null); depts.refresh(); }} />
        </Dialog>
      )}

      {editingPos && (
        <Dialog open={!!editingPos} onOpenChange={() => setEditingPos(null)}>
          <PosForm pos={editingPos} depts={depts.data} onDone={() => { setEditingPos(null); positions.refresh(); }} />
        </Dialog>
      )}
    </>
  );
}

function DeptForm({ dept, depts, onDone }: { dept?: Dept; depts: Dept[]; onDone: () => void }) {
  const [f, setF] = useState(dept || { id: "", code: "", name: "", cost_center: "", parent_id: "", active: true });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{dept ? "Editar departamento" : "Nuevo departamento"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Código</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="UP-01" /></div>
        <div><Label>Nombre</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Upstream Bata" /></div>
        <div><Label>Centro de coste</Label><Input value={f.cost_center} onChange={(e) => setF({ ...f, cost_center: e.target.value })} /></div>
        <div><Label>Departamento padre</Label>
          <Select value={f.parent_id} onValueChange={(v) => setF({ ...f, parent_id: v })}>
            <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
            <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.code || !f.name} onClick={async () => {
          setSaving(true);
          try {
            if (dept) {
              await updateRow("departments", dept.id, { code: f.code, name: f.name, cost_center: f.cost_center || null, parent_id: f.parent_id || null, active: f.active });
            } else {
              await insertRow("departments", { code: f.code, name: f.name, cost_center: f.cost_center || null, parent_id: f.parent_id || null });
            }
            onDone();
          }
          finally { setSaving(false); }
        }}>{dept ? "Actualizar" : "Guardar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PosForm({ pos, depts, onDone }: { pos?: Pos; depts: Dept[]; onDone: () => void }) {
  const [f, setF] = useState(pos || { id: "", code: "", title: "", grade: "", department_id: "", active: true });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{pos ? "Editar puesto" : "Nuevo puesto"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Código</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
        <div><Label>Título</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><Label>Grado</Label><Input value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="P3, M2..." /></div>
        <div><Label>Departamento</Label>
          <Select value={f.department_id} onValueChange={(v) => setF({ ...f, department_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.code || !f.title} onClick={async () => {
          setSaving(true);
          try {
            if (pos) {
              await updateRow("positions", pos.id, { code: f.code, title: f.title, grade: f.grade || null, department_id: f.department_id || null, active: f.active });
            } else {
              await insertRow("positions", { code: f.code, title: f.title, grade: f.grade || null, department_id: f.department_id || null });
            }
            onDone();
          }
          finally { setSaving(false); }
        }}>{pos ? "Actualizar" : "Guardar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
