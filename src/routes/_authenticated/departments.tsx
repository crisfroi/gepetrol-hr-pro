import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Plus, Edit, Eye, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
type Emp = { id: string; first_name: string; last_name: string; department_id: string | null; position_id: string | null };

const NONE = "__NONE__";

function Page() {
  const depts = useSupabaseList<Dept>("departments", { order: { column: "name" } });
  const positions = useSupabaseList<Pos>("positions", { order: { column: "title" } });
  const emps = useSupabaseList<Emp>("employees", { select: "id, first_name, last_name, department_id, position_id" });
  const [openDept, setOpenDept] = useState(false);
  const [openPos, setOpenPos] = useState(false);
  const [editingDept, setEditingDept] = useState<Dept | null>(null);
  const [editingPos, setEditingPos] = useState<Pos | null>(null);
  const [viewDept, setViewDept] = useState<Dept | null>(null);
  const [viewPos, setViewPos] = useState<Pos | null>(null);

  const empCountByDept = useMemo(() => {
    const map: Record<string, number> = {};
    emps.data.forEach((e) => { if (e.department_id) map[e.department_id] = (map[e.department_id] ?? 0) + 1; });
    return map;
  }, [emps.data]);
  const empCountByPos = useMemo(() => {
    const map: Record<string, number> = {};
    emps.data.forEach((e) => { if (e.position_id) map[e.position_id] = (map[e.position_id] ?? 0) + 1; });
    return map;
  }, [emps.data]);

  const handleDeleteDept = async (id: string) => {
    if ((empCountByDept[id] ?? 0) > 0) { alert("No se puede eliminar: hay empleados asignados a este departamento."); return; }
    if (!confirm("¿Eliminar este departamento?")) return;
    await deleteRow("departments", id); depts.refresh();
  };
  const handleDeletePos = async (id: string) => {
    if ((empCountByPos[id] ?? 0) > 0) { alert("No se puede eliminar: hay empleados asignados a este puesto."); return; }
    if (!confirm("¿Eliminar este puesto?")) return;
    await deleteRow("positions", id); positions.refresh();
  };

  return (
    <>
      <PageHeader title="Departamentos y Puestos" description="Estructura organizativa, centros de coste y catálogo de puestos." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Departamentos ({depts.data.length})</h3>
              <Dialog open={openDept} onOpenChange={setOpenDept}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nuevo</Button></DialogTrigger>
                <DeptForm depts={depts.data} onDone={() => { setOpenDept(false); depts.refresh(); }} />
              </Dialog>
            </div>
            {depts.loading ? <LoadingState /> : depts.data.length === 0 ? (
              <EmptyState title="Sin departamentos" description="Crea el primer departamento." />
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Empleados</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>{depts.data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.code}</TableCell>
                    <TableCell>{d.name}</TableCell>
                    <TableCell><Badge variant="outline"><Users className="h-3 w-3" /> {empCountByDept[d.id] ?? 0}</Badge></TableCell>
                    <TableCell>{d.active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewDept(d)}><Eye className="h-4 w-4" /></Button>
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
              <h3 className="font-semibold">Puestos ({positions.data.length})</h3>
              <Dialog open={openPos} onOpenChange={setOpenPos}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nuevo</Button></DialogTrigger>
                <PosForm depts={depts.data} onDone={() => { setOpenPos(false); positions.refresh(); }} />
              </Dialog>
            </div>
            {positions.loading ? <LoadingState /> : positions.data.length === 0 ? (
              <EmptyState title="Sin puestos" description="Añade puestos al catálogo." />
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>Emp.</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>{positions.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell>{p.title}</TableCell>
                    <TableCell><Badge variant="outline">{empCountByPos[p.id] ?? 0}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewPos(p)}><Eye className="h-4 w-4" /></Button>
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

      {viewDept && (
        <Dialog open={!!viewDept} onOpenChange={() => setViewDept(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{viewDept.name}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Código</p><p className="font-mono">{viewDept.code}</p></div>
              <div className="rounded border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Centro de coste</p><p>{viewDept.cost_center ?? "—"}</p></div>
              <div className="rounded border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Padre</p><p>{depts.data.find((d) => d.id === viewDept.parent_id)?.name ?? "—"}</p></div>
              <div className="rounded border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Empleados</p><p className="text-2xl font-bold">{empCountByDept[viewDept.id] ?? 0}</p></div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Puestos en este departamento</h4>
              <div className="flex flex-wrap gap-2">
                {positions.data.filter((p) => p.department_id === viewDept.id).map((p) => (
                  <Badge key={p.id} variant="outline">{p.title} ({empCountByPos[p.id] ?? 0})</Badge>
                ))}
                {positions.data.filter((p) => p.department_id === viewDept.id).length === 0 && <span className="text-sm text-muted-foreground">Sin puestos asignados</span>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setViewDept(null); setEditingDept(viewDept); }}>Editar</Button>
              <Button onClick={() => setViewDept(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {viewPos && (
        <Dialog open={!!viewPos} onOpenChange={() => setViewPos(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{viewPos.title}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Código</p><p className="font-mono">{viewPos.code}</p></div>
              <div className="rounded border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Grado</p><p>{viewPos.grade ?? "—"}</p></div>
              <div className="rounded border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Departamento</p><p>{depts.data.find((d) => d.id === viewPos.department_id)?.name ?? "—"}</p></div>
              <div className="rounded border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Empleados</p><p className="text-2xl font-bold">{empCountByPos[viewPos.id] ?? 0}</p></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setViewPos(null); setEditingPos(viewPos); }}>Editar</Button>
              <Button onClick={() => setViewPos(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
  const [f, setF] = useState({
    code: dept?.code ?? "",
    name: dept?.name ?? "",
    cost_center: dept?.cost_center ?? "",
    parent_id: dept?.parent_id ?? "",
    active: dept?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{dept ? "Editar departamento" : "Nuevo departamento"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Código</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="UP-01" /></div>
        <div><Label>Nombre</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Upstream Bata" /></div>
        <div><Label>Centro de coste</Label><Input value={f.cost_center} onChange={(e) => setF({ ...f, cost_center: e.target.value })} /></div>
        <div><Label>Departamento padre</Label>
          <Select value={f.parent_id || NONE} onValueChange={(v) => setF({ ...f, parent_id: v === NONE ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Ninguno</SelectItem>
              {depts.filter((d) => d.id !== dept?.id).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {dept && (
          <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /><Label>Activo</Label></div>
        )}
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.code || !f.name} onClick={async () => {
          setSaving(true);
          try {
            const payload = { code: f.code, name: f.name, cost_center: f.cost_center || null, parent_id: f.parent_id || null, active: f.active };
            if (dept) await updateRow("departments", dept.id, payload);
            else await insertRow("departments", payload);
            onDone();
          } finally { setSaving(false); }
        }}>{dept ? "Actualizar" : "Guardar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function PosForm({ pos, depts, onDone }: { pos?: Pos; depts: Dept[]; onDone: () => void }) {
  const [f, setF] = useState({
    code: pos?.code ?? "",
    title: pos?.title ?? "",
    grade: pos?.grade ?? "",
    department_id: pos?.department_id ?? "",
    active: pos?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{pos ? "Editar puesto" : "Nuevo puesto"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Código</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
        <div><Label>Título</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><Label>Grado</Label><Input value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} placeholder="P3, M2..." /></div>
        <div><Label>Departamento</Label>
          <Select value={f.department_id || NONE} onValueChange={(v) => setF({ ...f, department_id: v === NONE ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Sin departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin departamento</SelectItem>
              {depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {pos && (
          <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /><Label>Activo</Label></div>
        )}
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.code || !f.title} onClick={async () => {
          setSaving(true);
          try {
            const payload = { code: f.code, title: f.title, grade: f.grade || null, department_id: f.department_id || null, active: f.active };
            if (pos) await updateRow("positions", pos.id, payload);
            else await insertRow("positions", payload);
            onDone();
          } finally { setSaving(false); }
        }}>{pos ? "Actualizar" : "Guardar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
