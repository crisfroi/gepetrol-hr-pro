import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { RoleGuard } from "@/components/app/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList, insertRow, updateRow } from "@/lib/data-hooks";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "Evaluación de Desempeño · GEPETROL RRHH" },
      { name: "description", content: "Ciclos de evaluación y feedback." },
    ],
  }),
  component: () => (
    <RoleGuard allow={["admin", "hr"]}>
      <Page />
    </RoleGuard>
  ),
});

type Review = {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  overall_rating: number | null;
  comments: string | null;
  status: string;
  created_at: string;
};
type Emp = { id: string; first_name: string; last_name: string; employee_code: string; department_id: string | null };
type Dept = { id: string; name: string };

function Page() {
  const reviews = useSupabaseList<Review>("performance_reviews", { order: { column: "created_at", ascending: false } });
  const emps = useSupabaseList<Emp>("employees", { select: "id, first_name, last_name, employee_code, department_id", order: { column: "last_name" } });
  const depts = useSupabaseList<Dept>("departments", { select: "id, name" });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const empName = (id: string) => {
    const e = emps.data.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : "—";
  };

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return reviews.data.filter((r) => !s || empName(r.employee_id).toLowerCase().includes(s) || r.status.includes(s));
  }, [reviews.data, search, emps.data]);

  return (
    <>
      <PageHeader
        title="Evaluación de Desempeño"
        description="Ciclos, objetivos y feedback."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Nueva evaluación</Button>
            </DialogTrigger>
            <BulkReviewForm emps={emps.data} depts={depts.data} onDone={() => { setOpen(false); reviews.refresh(); }} />
          </Dialog>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por empleado o estado..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {reviews.loading ? <LoadingState /> : filtered.length === 0 ? (
            <EmptyState title="Sin evaluaciones" description="Crea una nueva evaluación seleccionando uno o varios empleados." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Valoración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{empName(r.employee_id)}</TableCell>
                    <TableCell>{new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">{r.overall_rating ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "approved" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                    <TableCell>
                      <RatingDialog review={r} onDone={reviews.refresh} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function BulkReviewForm({ emps, depts, onDone }: { emps: Emp[]; depts: Dept[]; onDone: () => void }) {
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = emps.filter((e) => {
    if (deptFilter !== "all" && e.department_id !== deptFilter) return false;
    if (search && !`${e.first_name} ${e.last_name} ${e.employee_code}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggle = (id: string) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const toggleAll = () => {
    if (filtered.every((e) => selected.has(e.id))) {
      const n = new Set(selected); filtered.forEach((e) => n.delete(e.id)); setSelected(n);
    } else {
      const n = new Set(selected); filtered.forEach((e) => n.add(e.id)); setSelected(n);
    }
  };

  const submit = async () => {
    if (!start || !end || selected.size === 0) return;
    setSaving(true);
    try {
      for (const empId of selected) {
        await insertRow("performance_reviews", {
          employee_id: empId,
          period_start: start,
          period_end: end,
          status: "draft",
        });
      }
      toast.success(`${selected.size} evaluación(es) creada(s)`);
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Nueva evaluación · Selección múltiple</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Periodo inicio</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>Periodo fin</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Departamento</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Buscar</Label><Input placeholder="Nombre o código" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <div className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> {selected.size} seleccionados / {filtered.length} visibles</div>
          <Button variant="outline" size="sm" onClick={toggleAll}>{filtered.every((e) => selected.has(e.id)) && filtered.length ? "Deseleccionar visibles" : "Seleccionar visibles"}</Button>
        </div>
        <div className="max-h-64 overflow-y-auto border rounded">
          {filtered.map((e) => (
            <label key={e.id} className="flex items-center gap-2 px-3 py-2 border-b hover:bg-muted cursor-pointer">
              <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} />
              <span className="font-mono text-xs">{e.employee_code}</span>
              <span className="text-sm">{e.first_name} {e.last_name}</span>
            </label>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !start || !end || selected.size === 0} onClick={submit}>
          {saving ? "Creando..." : `Crear ${selected.size} evaluación(es)`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RatingDialog({ review, onDone }: { review: Review; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(review.overall_rating ?? 3);
  const [comments, setComments] = useState(review.comments ?? "");
  const [status, setStatus] = useState(review.status);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateRow("performance_reviews", review.id, { overall_rating: rating, comments, status });
      toast.success("Guardado");
      setOpen(false);
      onDone();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Evaluar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Evaluación</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Valoración (1-5)</Label><Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} /></div>
          <div><Label>Comentarios</Label><Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={4} /></div>
          <div>
            <Label>Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="submitted">Enviada</SelectItem>
                <SelectItem value="approved">Aprobada</SelectItem>
                <SelectItem value="archived">Archivada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button disabled={saving} onClick={save}>Guardar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
