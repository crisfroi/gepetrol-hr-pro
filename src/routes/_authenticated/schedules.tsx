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
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useSupabaseList, insertRow } from "@/lib/data-hooks";

export const Route = createFileRoute("/_authenticated/schedules")({
  head: () => ({
    meta: [
      { title: "Turnos y horarios · GEPETROL RRHH" },
      { name: "description", content: "Definición de turnos, horarios laborales y asignaciones." },
    ],
  }),
  component: Page,
});

type Shift = { id: string; name: string; start_time: string; end_time: string; break_minutes: number | null; active: boolean };
type Sch = { id: string; name: string; weekly_hours: number; days_pattern: any };

function Page() {
  const shifts = useSupabaseList<Shift>("shifts", { order: { column: "name" } });
  const schedules = useSupabaseList<Sch>("work_schedules", { order: { column: "name" } });
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader title="Turnos y horarios" description="Turnos operativos, horarios semanales y asignación por empleado." actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> Nuevo turno</Button></DialogTrigger>
          <ShiftForm onDone={() => { setOpen(false); shifts.refresh(); }} />
        </Dialog>
      } />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold">Turnos</h3>
            {shifts.loading ? <LoadingState /> : shifts.data.length === 0 ? (
              <EmptyState title="Sin turnos" description="Crea turnos operativos." />
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead><TableHead>Pausa</TableHead></TableRow></TableHeader>
                <TableBody>{shifts.data.map((s) => (
                  <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.start_time}</TableCell><TableCell>{s.end_time}</TableCell><TableCell>{s.break_minutes ?? 0}m</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold">Horarios semanales</h3>
            {schedules.loading ? <LoadingState /> : schedules.data.length === 0 ? (
              <EmptyState title="Sin horarios" description="Define horarios semanales." />
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Horas/sem</TableHead></TableRow></TableHeader>
                <TableBody>{schedules.data.map((s) => (
                  <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{s.weekly_hours}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ShiftForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", start_time: "08:00", end_time: "17:00", break_minutes: "60" });
  const [saving, setSaving] = useState(false);
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nuevo turno</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div><Label>Nombre</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Turno mañana" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Inicio</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} /></div>
          <div><Label>Fin</Label><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} /></div>
        </div>
        <div><Label>Pausa (min)</Label><Input type="number" value={f.break_minutes} onChange={(e) => setF({ ...f, break_minutes: e.target.value })} /></div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !f.name} onClick={async () => {
          setSaving(true);
          try {
            await insertRow("shifts", { name: f.name, start_time: f.start_time, end_time: f.end_time, break_minutes: Number(f.break_minutes) || 0, active: true });
            onDone();
          } finally { setSaving(false); }
        }}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
