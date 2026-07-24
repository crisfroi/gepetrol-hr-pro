import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, FileDown, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/PageHeader";
import { RoleGuard } from "@/components/app/RoleGuard";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList, insertRow, updateRow } from "@/lib/data-hooks";
import { formatCurrency } from "@/lib/format";
import { exportPayrollRunToExcel } from "@/lib/export-utils";

export const Route = createFileRoute("/_authenticated/payroll/runs")({
  head: () => ({
    meta: [
      { title: "Corridas de nómina · GEPETROL RRHH" },
      {
        name: "description",
        content:
          "Ejecución mensual de nómina: borradores, revisión, aprobación y pago.",
      },
    ],
  }),
  component: () => (
    <RoleGuard allow={["admin", "hr", "finance"]}>
      <Page />
    </RoleGuard>
  ),
});

type Run = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  currency: string;
  total_gross: number | null;
  total_net: number | null;
  notes: string | null;
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  review: "outline",
  approved: "secondary",
  paid: "secondary",
  cancelled: "destructive",
};

function Page() {
  const runs = useSupabaseList<Run>("payroll_runs", {
    order: { column: "period_start", ascending: false },
  });
  const payslips = useSupabaseList<any>("payslips", { select: "*" });
  const emps = useSupabaseList<any>("employees", {
    select: "id, first_name, last_name, employee_code, department_id",
  });
  const depts = useSupabaseList<any>("departments", { select: "id, name" });

  const [open, setOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const selectedRun = runs.data.find((r) => r.id === selectedRunId);
  const selectedPayslips = useMemo(() => {
    if (!selectedRunId || !payslips.data) return [];
    return payslips.data
      .filter((p: any) => p.run_id === selectedRunId)
      .map((p: any) => {
        const emp = emps.data?.find((e: any) => e.id === p.employee_id);
        const dept = depts.data?.find((d: any) => d.id === emp?.department_id);
        return {
          ...p,
          employee_code: emp?.employee_code,
          employee_name: emp
            ? `${emp.first_name} ${emp.last_name}`
            : "-",
          department: dept?.name || "-",
        };
      });
  }, [selectedRunId, payslips.data, emps.data, depts.data]);

  const advance = async (id: string, next: string) => {
    await updateRow("payroll_runs", id, { status: next });
    runs.refresh();
  };

  const handleExport = () => {
    if (selectedRun && selectedPayslips.length > 0) {
      const period = `${new Date(selectedRun.period_start).toLocaleDateString()} - ${new Date(selectedRun.period_end).toLocaleDateString()}`;
      exportPayrollRunToExcel(
        selectedRunId!,
        selectedPayslips,
        `nomina_${period}`
      );
    }
  };

  return (
    <>
      <PageHeader
        title="Corridas de nómina"
        description="Ciclos de nómina por periodo con estados de borrador, revisión, aprobación y pago."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Nueva corrida
              </Button>
            </DialogTrigger>
            <RunForm
              onDone={() => {
                setOpen(false);
                runs.refresh();
              }}
            />
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-4">
          {runs.loading ? (
            <LoadingState />
          ) : runs.data.length === 0 ? (
            <EmptyState
              title="Sin corridas"
              description="Crea la primera corrida mensual."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Bruto</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {new Date(r.period_start).toLocaleDateString()} →{" "}
                      {new Date(r.period_end).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {r.total_gross != null
                        ? formatCurrency(r.total_gross, r.currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {r.total_net != null
                        ? formatCurrency(r.total_net, r.currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedRunId(r.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.status === "draft" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => advance(r.id, "review")}
                        >
                          Enviar a revisión
                        </Button>
                      )}
                      {r.status === "review" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => advance(r.id, "approved")}
                        >
                          Aprobar
                        </Button>
                      )}
                      {r.status === "approved" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => advance(r.id, "paid")}
                        >
                          Marcar pagada
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail View Dialog */}
      {selectedRun && (
        <Dialog open={!!selectedRunId} onOpenChange={() => setSelectedRunId(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader className="flex justify-between items-center">
              <DialogTitle>
                Detalle Corrida:{" "}
                {new Date(selectedRun.period_start).toLocaleDateString()} -{" "}
                {new Date(selectedRun.period_end).toLocaleDateString()}
              </DialogTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedRunId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="grid gap-4 grid-cols-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Bruto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(selectedRun.total_gross || 0, selectedRun.currency)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Descuentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      (selectedRun.total_gross || 0) - (selectedRun.total_net || 0),
                      selectedRun.currency
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Neto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedRun.total_net || 0, selectedRun.currency)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-3">
                Recibos de Nómina ({selectedPayslips.length})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Bruto</TableHead>
                    <TableHead>Descuentos</TableHead>
                    <TableHead>Neto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPayslips.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        {p.employee_code}
                      </TableCell>
                      <TableCell>{p.employee_name}</TableCell>
                      <TableCell className="text-sm">
                        {p.department}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(p.gross_amount, selectedRun.currency)}
                      </TableCell>
                      <TableCell className="font-mono text-red-600">
                        -{formatCurrency(p.deductions_amount || 0, selectedRun.currency)}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {formatCurrency(p.net_amount, selectedRun.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedRun.notes && (
              <div className="bg-gray-50 p-3 rounded mb-4">
                <p className="text-sm text-gray-600 mb-1">Notas:</p>
                <p className="text-sm">{selectedRun.notes}</p>
              </div>
            )}

            <DialogFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={selectedPayslips.length === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Descargar Excel
              </Button>
              <Button variant="secondary" onClick={() => setSelectedRunId(null)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function RunForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    period_start: "",
    period_end: "",
    currency: "XAF",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nueva corrida de nómina</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Periodo desde</Label>
            <Input
              type="date"
              value={f.period_start}
              onChange={(e) =>
                setF({ ...f, period_start: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Periodo hasta</Label>
            <Input
              type="date"
              value={f.period_end}
              onChange={(e) => setF({ ...f, period_end: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Moneda</Label>
          <Input
            value={f.currency}
            onChange={(e) => setF({ ...f, currency: e.target.value })}
          />
        </div>
        <div>
          <Label>Notas</Label>
          <Input
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={saving || !f.period_start || !f.period_end}
          onClick={async () => {
            setSaving(true);
            try {
              await insertRow("payroll_runs", {
                period_start: f.period_start,
                period_end: f.period_end,
                currency: f.currency,
                status: "draft",
                notes: f.notes || null,
              });
              onDone();
            } finally {
              setSaving(false);
            }
          }}
        >
          Crear borrador
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
