import { useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, LoadingState } from "@/components/app/DataStates";
import { deleteRow, insertRow, updateRow, useSupabaseList } from "@/lib/data-hooks";

type ParameterRow = {
  id: string;
  key: string;
  value: unknown;
  value_type?: string | null;
  description: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
};

type ConceptRow = {
  id: string;
  code: string;
  name: string;
  kind: string;
  formula: string | null;
  taxable: boolean;
  active: boolean;
  display_order: number;
};

type MethodRow = {
  id: string;
  code: string;
  name: string;
  formula_hint: string | null;
  active: boolean;
};

function valueType(value: unknown, explicit?: string | null) {
  if (explicit) return explicit;
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function jsonValue(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJsonValue(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    toast.error("El valor debe ser JSON valido");
    throw new Error("Invalid JSON");
  }
}

export function PayrollParametersPanel({ reloadKey = 0 }: { reloadKey?: number }) {
  const params = useSupabaseList<ParameterRow>("payroll_parameters", {
    order: { column: "key" },
    deps: [reloadKey],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ParameterRow | null>(null);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Parametros de negocio</h2>
            <p className="text-sm text-muted-foreground">Valores versionables por fecha para calculos y reglas.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Parametro</Button>
            </DialogTrigger>
            <ParameterForm
              row={editing}
              onDone={() => {
                setOpen(false);
                setEditing(null);
                params.refresh();
              }}
            />
          </Dialog>
        </div>
        {params.loading ? <LoadingState /> : params.data.length === 0 ? (
          <EmptyState title="Sin parametros" description="Agrega impuestos, monedas, umbrales y periodicidad." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clave</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {params.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.key}</TableCell>
                  <TableCell className="max-w-[280px] truncate font-mono text-xs">{jsonValue(p.value)}</TableCell>
                  <TableCell><Badge variant="outline">{valueType(p.value, p.value_type)}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(p.effective_from ?? "actual") + (p.effective_to ? ` -> ${p.effective_to}` : "")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.description ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => { setEditing(p); setOpen(true); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Eliminar" onClick={async () => { await deleteRow("payroll_parameters", p.id); params.refresh(); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ParameterForm({ row, onDone }: { row: ParameterRow | null; onDone: () => void }) {
  const [form, setForm] = useState({
    key: row?.key ?? "",
    value: row ? jsonValue(row.value) : "\"\"",
    value_type: row?.value_type ?? valueType(row?.value ?? "", null),
    description: row?.description ?? "",
    effective_from: row?.effective_from ?? new Date().toISOString().slice(0, 10),
    effective_to: row?.effective_to ?? "",
  });
  const [saving, setSaving] = useState(false);

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>{row ? "Editar parametro" : "Nuevo parametro"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Clave</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="nomina.moneda.default" /></div>
          <div><Label>Tipo</Label>
            <Select value={form.value_type} onValueChange={(value_type) => setForm({ ...form, value_type })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["string", "number", "boolean", "object", "array"].map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Valor JSON</Label><Textarea className="min-h-28 font-mono text-xs" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Vigente desde</Label><Input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} /></div>
          <div><Label>Vigente hasta</Label><Input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} /></div>
        </div>
        <div><Label>Descripcion</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !form.key} onClick={async () => {
          setSaving(true);
          try {
            const values = {
              key: form.key,
              value: parseJsonValue(form.value),
              value_type: form.value_type,
              description: form.description || null,
              effective_from: form.effective_from,
              effective_to: form.effective_to || null,
            };
            row ? await updateRow("payroll_parameters", row.id, values) : await insertRow("payroll_parameters", values);
            onDone();
          } finally {
            setSaving(false);
          }
        }}>{row ? "Guardar cambios" : "Crear parametro"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function PayrollConceptsPanel({ reloadKey = 0 }: { reloadKey?: number }) {
  const concepts = useSupabaseList<ConceptRow>("payroll_concepts", {
    order: { column: "display_order" },
    deps: [reloadKey],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ConceptRow | null>(null);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Conceptos de nomina</h2>
            <p className="text-sm text-muted-foreground">Percepciones, deducciones, bonos y costes del empleador.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Concepto</Button>
            </DialogTrigger>
            <ConceptForm row={editing} onDone={() => { setOpen(false); setEditing(null); concepts.refresh(); }} />
          </Dialog>
        </div>
        {concepts.loading ? <LoadingState /> : concepts.data.length === 0 ? (
          <EmptyState title="Sin conceptos" description="Agrega conceptos para calcular recibos." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Codigo</TableHead><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead>Formula</TableHead><TableHead>Estado</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>{concepts.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.code}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell><Badge variant="outline">{c.kind}</Badge></TableCell>
                <TableCell className="max-w-xs truncate font-mono text-xs">{c.formula ?? "-"}</TableCell>
                <TableCell>{c.active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => { setEditing(c); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Eliminar" onClick={async () => { await deleteRow("payroll_concepts", c.id); concepts.refresh(); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ConceptForm({ row, onDone }: { row: ConceptRow | null; onDone: () => void }) {
  const [form, setForm] = useState({
    code: row?.code ?? "",
    name: row?.name ?? "",
    kind: row?.kind ?? "earning",
    formula: row?.formula ?? "",
    display_order: String(row?.display_order ?? 10),
    taxable: row?.taxable ?? true,
    active: row?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>{row ? "Editar concepto" : "Nuevo concepto"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Codigo</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><Label>Orden</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></div>
        </div>
        <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Tipo</Label>
          <Select value={form.kind} onValueChange={(kind) => setForm({ ...form, kind })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["earning", "deduction", "bonus", "employer_cost"].map((kind) => <SelectItem key={kind} value={kind}>{kind}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Formula</Label><Textarea className="font-mono text-xs" value={form.formula} onChange={(e) => setForm({ ...form, formula: e.target.value })} placeholder="base_salary * parametro" /></div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.taxable} onCheckedChange={(taxable) => setForm({ ...form, taxable })} /> Gravable</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} /> Activo</label>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !form.code || !form.name} onClick={async () => {
          setSaving(true);
          try {
            const values = {
              code: form.code,
              name: form.name,
              kind: form.kind,
              formula: form.formula || null,
              display_order: Number(form.display_order || 0),
              taxable: form.taxable,
              active: form.active,
            };
            row ? await updateRow("payroll_concepts", row.id, values) : await insertRow("payroll_concepts", values);
            onDone();
          } finally {
            setSaving(false);
          }
        }}>{row ? "Guardar cambios" : "Crear concepto"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function PayrollMethodsPanel({ reloadKey = 0 }: { reloadKey?: number }) {
  const methods = useSupabaseList<MethodRow>("payroll_calculation_methods", {
    order: { column: "name" },
    deps: [reloadKey],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MethodRow | null>(null);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Metodos de calculo</h2>
            <p className="text-sm text-muted-foreground">Modelos asignables a contratos o configuracion individual.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Metodo</Button>
            </DialogTrigger>
            <MethodForm row={editing} onDone={() => { setOpen(false); setEditing(null); methods.refresh(); }} />
          </Dialog>
        </div>
        {methods.loading ? <LoadingState /> : methods.data.length === 0 ? (
          <EmptyState title="Sin metodos" description="Agrega metodos como mensual, horario, mixto o comision." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Codigo</TableHead><TableHead>Nombre</TableHead><TableHead>Formula/nota</TableHead><TableHead>Estado</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>{methods.data.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-mono text-xs">{m.code}</TableCell>
                <TableCell>{m.name}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">{m.formula_hint ?? "-"}</TableCell>
                <TableCell>{m.active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => { setEditing(m); setOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Eliminar" onClick={async () => { await deleteRow("payroll_calculation_methods", m.id); methods.refresh(); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MethodForm({ row, onDone }: { row: MethodRow | null; onDone: () => void }) {
  const [form, setForm] = useState({
    code: row?.code ?? "",
    name: row?.name ?? "",
    formula_hint: row?.formula_hint ?? "",
    active: row?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{row ? "Editar metodo" : "Nuevo metodo"}</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><Label>Codigo</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
        <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Formula o descripcion tecnica</Label><Textarea value={form.formula_hint} onChange={(e) => setForm({ ...form, formula_hint: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} /> Activo</label>
      </div>
      <DialogFooter>
        <Button disabled={saving || !form.code || !form.name} onClick={async () => {
          setSaving(true);
          try {
            const values = { code: form.code, name: form.name, formula_hint: form.formula_hint || null, active: form.active };
            row ? await updateRow("payroll_calculation_methods", row.id, values) : await insertRow("payroll_calculation_methods", values);
            onDone();
          } finally {
            setSaving(false);
          }
        }}>{row ? "Guardar cambios" : "Crear metodo"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
