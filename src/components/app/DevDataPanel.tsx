import { useState } from "react";
import { Database, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type SeedSummary = {
  batch_id?: string;
  employees?: number;
  departments?: number;
  positions?: number;
  payroll_runs?: number;
  payslips?: number;
  deleted_batches?: number;
  deleted_records?: number;
};

export function DevDataPanel({ onChanged }: { onChanged?: () => void }) {
  const [employeeCount, setEmployeeCount] = useState("12");
  const [working, setWorking] = useState(false);
  const [summary, setSummary] = useState<SeedSummary | null>(null);

  async function generate() {
    setWorking(true);
    try {
      const count = Math.max(1, Math.min(200, Number(employeeCount) || 1));
      const { data, error } = await (supabase as any).rpc("generate_development_seed_data", {
        _employee_count: count,
      });
      if (error) throw error;
      setSummary(data as SeedSummary);
      toast.success("Datos de prueba generados");
      onChanged?.();
    } catch (error: any) {
      toast.error(`No se pudieron generar datos: ${error.message}`);
    } finally {
      setWorking(false);
    }
  }

  async function clear() {
    setWorking(true);
    try {
      const { data, error } = await (supabase as any).rpc("delete_development_seed_data");
      if (error) throw error;
      setSummary(data as SeedSummary);
      toast.success("Datos de prueba eliminados");
      onChanged?.();
    } catch (error: any) {
      toast.error(`No se pudieron eliminar datos: ${error.message}`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="text-base font-semibold">Datos de desarrollo</h2>
          <p className="text-sm text-muted-foreground">
            Genera maestros, empleados, contratos, corridas y recibos trazados por lote para pruebas.
          </p>
        </div>
        <div className="grid gap-3 sm:max-w-md sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <Label>Empleados a generar</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={employeeCount}
              onChange={(event) => setEmployeeCount(event.target.value)}
            />
          </div>
          <Button disabled={working} onClick={generate}>
            <Database className="h-4 w-4" /> Generarlos
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={working} variant="destructive">
                <Trash2 className="h-4 w-4" /> Eliminarlos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar datos de prueba</AlertDialogTitle>
                <AlertDialogDescription>
                  Solo se eliminaran registros trazados por los lotes de desarrollo. Los datos reales no quedan incluidos en esta operacion.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={clear}>Eliminar lotes de prueba</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {summary ? (
          <div className="rounded-md border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
            {JSON.stringify(summary, null, 2)}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
