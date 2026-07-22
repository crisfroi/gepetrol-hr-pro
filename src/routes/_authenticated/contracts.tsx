import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
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
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({
    meta: [
      { title: "Contratos · GEPETROL RRHH" },
      { name: "description", content: "Contratos laborales, vigencias y salarios base." },
    ],
  }),
  component: Page,
});

type Contract = { id: string; employee_id: string; contract_type: string; start_date: string; end_date: string | null; base_salary: number; currency: string; active: boolean };
type Emp = { id: string; first_name: string; last_name: string; employee_code: string };

const CONTRACT_TYPES = ["permanent", "temporary", "internship", "service", "expat"];

function Page() {
  const contracts = useSupabaseList<Contract>("employment_contracts", { order: { column: "start_date", ascending: false } });
  const emps = useSupabaseList<Emp>("employees", { select: "id, first_name, last_name, employee_code", order: { column: "last_name" } });
  const [open, setOpen] = useState(false);
  const empName = (id: string) => {
    const e = emps.data.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : "—";
  };

  return (
    <>
      <PageHeader title="Contratos laborales" description="Gestión de contratos, vigencias, salario base y método de cálculo." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo contrato</Button></DialogTrigger>
          <ContractForm emps={emps.data} onDone={() => { setOpen(false); contracts.refresh(); }} />
        </Dialog>
      } />
      <Card>
        <CardContent className="p-4">
          {contracts.loading ? <LoadingState /> : contracts.data.length === 0 ? (
            <EmptyState title="Sin contratos" description="Crea contratos para empleados existentes." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Tipo</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead><TableHead>Salario</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>{contracts.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{empName(c.employee_id)}</TableCell>
                  <TableCell><Badge variant="outline">{c.contract_type}</Badge></TableCell>
                  <TableCell>{new Date(c.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{c.end_date ? new Date(c.end_date).toLocaleDateString() : "Indefinido"}</TableCell>
                  <TableCell>{formatCurrency(c.base_salary, c.currency)}</TableCell>
                  <TableCell>{c.active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function ContractForm({ emps, onDone }: { emps: Emp[]; onDone: () => void }) {
  const [f, setF] = useState({ employee_id: "", contract_type: "permanent", start_date: new Date().toISOString().slice(0, 10), end_date: "", base_salary: "", currency: "XAF" });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo contrato</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label>Empleado</Label>
          <Select value={f.employee_id} onValueChange={(v) => setF({ ...f, employee_id: v })}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>{emps.map((e) => <SelectItem key={e.id} value={e.id}>{e.employee_code} — {e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Tipo</Label>
          <Select value={f.contract_type} onValueChange={(v) => setF({ ...f, contract_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CONTRACT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Moneda</Label>
          <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="XAF">XAF (CFA)</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Inicio</Label><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
        <div><Label>Fin (opcional)</Label><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Salario base</Label><Input type="number" value={f.base_salary} onChange={(e) => setF({ ...f, base_salary: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.employee_id || !f.base_salary} onClick={async () => {
          setSaving(true);
          try {
            await insertRow("employment_contracts", {
              employee_id: f.employee_id, contract_type: f.contract_type,
              start_date: f.start_date, end_date: f.end_date || null,
              base_salary: Number(f.base_salary), currency: f.currency, active: true,
            });
            onDone();
          } finally { setSaving(false); }
        }}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
