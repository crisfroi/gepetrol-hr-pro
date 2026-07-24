import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Edit, Eye, Trash2, FileSpreadsheet, FileDown, X } from "lucide-react";
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
import { exportEmployeesAsExcel, exportEmployeesAsPdf } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/employees")({
  head: () => ({
    meta: [
      { title: "Empleados · GEPETROL RRHH" },
      { name: "description", content: "Directorio de personal, altas, bajas y ficha 360°." },
    ],
  }),
  component: Page,
});

type Emp = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone?: string | null;
  gender?: string | null;
  nationality?: string | null;
  birth_date?: string | null;
  status: string;
  hire_date: string;
  department_id: string | null;
  position_id: string | null;
};

type Dept = { id: string; name: string };
type Pos = { id: string; title: string };

const ALL = "__ALL__";

function seniorityYears(hireDate: string): number {
  const diff = Date.now() - new Date(hireDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function seniorityBucket(years: number): string {
  if (years < 1) return "<1 año";
  if (years < 3) return "1-3 años";
  if (years < 5) return "3-5 años";
  if (years < 10) return "5-10 años";
  return "10+ años";
}

function Page() {
  const emps = useSupabaseList<Emp>("employees", { order: { column: "last_name" } });
  const depts = useSupabaseList<Dept>("departments", { select: "id, name", order: { column: "name" } });
  const positions = useSupabaseList<Pos>("positions", { select: "id, title", order: { column: "title" } });
  const [openCreate, setOpenCreate] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Emp | null>(null);
  const [viewingEmp, setViewingEmp] = useState<Emp | null>(null);
  const [q, setQ] = useState("");
  const [fDept, setFDept] = useState(ALL);
  const [fPos, setFPos] = useState(ALL);
  const [fNat, setFNat] = useState(ALL);
  const [fGender, setFGender] = useState(ALL);
  const [fStatus, setFStatus] = useState(ALL);
  const [fSen, setFSen] = useState(ALL);

  const nationalities = useMemo(() => Array.from(new Set(emps.data.map((e) => e.nationality).filter(Boolean))) as string[], [emps.data]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return emps.data.filter((e) => {
      if (s && !`${e.first_name} ${e.last_name} ${e.employee_code} ${e.email ?? ""}`.toLowerCase().includes(s)) return false;
      if (fDept !== ALL && e.department_id !== fDept) return false;
      if (fPos !== ALL && e.position_id !== fPos) return false;
      if (fNat !== ALL && (e.nationality ?? "") !== fNat) return false;
      if (fGender !== ALL && (e.gender ?? "") !== fGender) return false;
      if (fStatus !== ALL && e.status !== fStatus) return false;
      if (fSen !== ALL && seniorityBucket(seniorityYears(e.hire_date)) !== fSen) return false;
      return true;
    });
  }, [emps.data, q, fDept, fPos, fNat, fGender, fStatus, fSen]);

  const deptName = (id: string | null) => depts.data.find((d) => d.id === id)?.name ?? "—";
  const posTitle = (id: string | null) => positions.data.find((p) => p.id === id)?.title ?? "—";

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este empleado?")) return;
    await deleteRow("employees", id);
    emps.refresh();
  };

  const clearFilters = () => {
    setQ(""); setFDept(ALL); setFPos(ALL); setFNat(ALL); setFGender(ALL); setFStatus(ALL); setFSen(ALL);
  };

  const exportRows = filtered.map((e) => ({
    ...e,
    department_name: deptName(e.department_id),
    position_title: posTitle(e.position_id),
  }));

  const activeFilters =
    (q ? 1 : 0) + [fDept, fPos, fNat, fGender, fStatus, fSen].filter((v) => v !== ALL).length;

  return (
    <>
      <PageHeader
        title="Empleados"
        description="Directorio de personal de GEPETROL."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportEmployeesAsExcel(exportRows)}><FileSpreadsheet className="h-4 w-4" /> XLSX</Button>
            <Button variant="outline" size="sm" onClick={() => exportEmployeesAsPdf(exportRows)}><FileDown className="h-4 w-4" /> PDF</Button>
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo empleado</Button></DialogTrigger>
              <EmpForm depts={depts.data} positions={positions.data} onDone={() => { setOpenCreate(false); emps.refresh(); }} />
            </Dialog>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, código o email..." className="pl-8" />
            </div>
            <Select value={fDept} onValueChange={setFDept}>
              <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los departamentos</SelectItem>
                {depts.data.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fPos} onValueChange={setFPos}>
              <SelectTrigger><SelectValue placeholder="Puesto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los puestos</SelectItem>
                {positions.data.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fNat} onValueChange={setFNat}>
              <SelectTrigger><SelectValue placeholder="Nacionalidad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas las nacionalidades</SelectItem>
                {nationalities.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fGender} onValueChange={setFGender}>
              <SelectTrigger><SelectValue placeholder="Género" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los géneros</SelectItem>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Femenino</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="on_leave">De permiso</SelectItem>
                <SelectItem value="terminated">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fSen} onValueChange={setFSen}>
              <SelectTrigger><SelectValue placeholder="Antigüedad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toda antigüedad</SelectItem>
                <SelectItem value="<1 año">&lt;1 año</SelectItem>
                <SelectItem value="1-3 años">1-3 años</SelectItem>
                <SelectItem value="3-5 años">3-5 años</SelectItem>
                <SelectItem value="5-10 años">5-10 años</SelectItem>
                <SelectItem value="10+ años">10+ años</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filtered.length} de {emps.data.length} empleados</span>
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3 w-3" /> Limpiar filtros ({activeFilters})</Button>
            )}
          </div>

          {emps.loading ? <LoadingState /> : filtered.length === 0 ? (
            <EmptyState title="Sin resultados" description="Ajusta los filtros o registra un nuevo empleado." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Nacionalidad</TableHead>
                  <TableHead>Antigüedad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const years = seniorityYears(e.hire_date);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                      <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                      <TableCell>{deptName(e.department_id)}</TableCell>
                      <TableCell>{posTitle(e.position_id)}</TableCell>
                      <TableCell>{e.nationality ?? "—"}</TableCell>
                      <TableCell className="text-sm">{years} año{years !== 1 ? "s" : ""}</TableCell>
                      <TableCell>
                        <Badge variant={e.status === "active" ? "secondary" : "outline"}>
                          {e.status === "active" ? "Activo" : e.status === "on_leave" ? "Permiso" : "Baja"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewingEmp(e)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingEmp(e)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {viewingEmp && (
        <Dialog open={!!viewingEmp} onOpenChange={() => setViewingEmp(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{viewingEmp.first_name} {viewingEmp.last_name}</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Código", viewingEmp.employee_code],
                ["Email", viewingEmp.email ?? "—"],
                ["Teléfono", viewingEmp.phone ?? "—"],
                ["Departamento", deptName(viewingEmp.department_id)],
                ["Puesto", posTitle(viewingEmp.position_id)],
                ["Nacionalidad", viewingEmp.nationality ?? "—"],
                ["Género", viewingEmp.gender ?? "—"],
                ["Nacimiento", viewingEmp.birth_date ? new Date(viewingEmp.birth_date).toLocaleDateString() : "—"],
                ["Ingreso", new Date(viewingEmp.hire_date).toLocaleDateString()],
                ["Antigüedad", `${seniorityYears(viewingEmp.hire_date)} años`],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium">{value as string}</p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setViewingEmp(null); setEditingEmp(viewingEmp); }}>Editar</Button>
              <Button onClick={() => setViewingEmp(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editingEmp && (
        <Dialog open={!!editingEmp} onOpenChange={() => setEditingEmp(null)}>
          <EmpForm emp={editingEmp} depts={depts.data} positions={positions.data} onDone={() => { setEditingEmp(null); emps.refresh(); }} />
        </Dialog>
      )}
    </>
  );
}

function EmpForm({ emp, depts, positions, onDone }: { emp?: Emp; depts: Dept[]; positions: Pos[]; onDone: () => void }) {
  const [f, setF] = useState({
    employee_code: emp?.employee_code ?? "",
    first_name: emp?.first_name ?? "",
    last_name: emp?.last_name ?? "",
    email: emp?.email ?? "",
    phone: emp?.phone ?? "",
    gender: emp?.gender ?? "",
    nationality: emp?.nationality ?? "GQ",
    birth_date: emp?.birth_date ?? "",
    hire_date: emp?.hire_date ?? new Date().toISOString().slice(0, 10),
    department_id: emp?.department_id ?? "",
    position_id: emp?.position_id ?? "",
    status: emp?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...f };
      if (!payload.department_id) payload.department_id = null;
      if (!payload.position_id) payload.position_id = null;
      if (!payload.birth_date) payload.birth_date = null;
      if (!payload.gender) payload.gender = null;
      if (emp) await updateRow("employees", emp.id, payload);
      else await insertRow("employees", payload);
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{emp ? "Editar empleado" : "Nuevo empleado"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        {!emp && (
          <div><Label>Código</Label><Input value={f.employee_code} onChange={(e) => setF({ ...f, employee_code: e.target.value })} placeholder="EMP-0001" /></div>
        )}
        <div><Label>Nombre</Label><Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></div>
        <div><Label>Apellidos</Label><Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><Label>Teléfono</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><Label>Nacionalidad</Label><Input value={f.nationality} onChange={(e) => setF({ ...f, nationality: e.target.value })} placeholder="GQ" /></div>
        <div><Label>Género</Label>
          <Select value={f.gender} onValueChange={(v) => setF({ ...f, gender: v })}>
            <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Masculino</SelectItem>
              <SelectItem value="female">Femenino</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Nacimiento</Label><Input type="date" value={f.birth_date} onChange={(e) => setF({ ...f, birth_date: e.target.value })} /></div>
        <div><Label>Ingreso</Label><Input type="date" value={f.hire_date} onChange={(e) => setF({ ...f, hire_date: e.target.value })} /></div>
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
        {emp && (
          <div><Label>Estado</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="on_leave">De permiso</SelectItem>
                <SelectItem value="terminated">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.first_name || !f.last_name || (!emp && !f.employee_code)} onClick={handleSave}>
          {saving ? "Guardando..." : emp ? "Actualizar" : "Guardar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
