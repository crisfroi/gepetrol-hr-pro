import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, FileDown, Plus, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/PageHeader";
import { LoadingState, EmptyState } from "@/components/app/DataStates";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import { generatePayslipPDF } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/self-service")({
  head: () => ({
    meta: [
      { title: "Portal del empleado · GEPETROL RRHH" },
      { name: "description", content: "Autoservicio del empleado: solicitudes, recibos y calendario personal." },
    ],
  }),
  component: Page,
});

type LeaveType = { id: string; name: string; requires_approval: boolean };
type LeaveReq = { id: string; employee_id: string; leave_type_id: string; start_date: string; end_date: string; days_requested: number | null; status: string; reason: string | null };
type Payslip = { id: string; run_id: string; gross: number; net: number; deductions: number; currency: string; created_at: string; audit_hash: string | null; employee_id: string };

function Page() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveReq[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [teamRequests, setTeamRequests] = useState<LeaveReq[]>([]);
  const [openReq, setOpenReq] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data: emp } = await supabase.from("employees").select("*").eq("user_id", user.id).maybeSingle();
      setEmployee(emp);
      const [types, myReqs, mySlips, team] = await Promise.all([
        supabase.from("leave_types").select("id, name, requires_approval"),
        emp ? supabase.from("leave_requests").select("*").eq("employee_id", emp.id).order("start_date", { ascending: false }) : Promise.resolve({ data: [] } as any),
        emp ? supabase.from("payslips").select("*").eq("employee_id", emp.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] } as any),
        emp?.department_id
          ? supabase.from("leave_requests").select("*, employees!inner(department_id)").eq("employees.department_id", emp.department_id).in("status", ["approved", "submitted"]).gte("end_date", new Date().toISOString().slice(0, 10))
          : Promise.resolve({ data: [] } as any),
      ]);
      setLeaveTypes((types.data ?? []) as any);
      setLeaveRequests((myReqs.data ?? []) as any);
      setPayslips((mySlips.data ?? []) as any);
      setTeamRequests((team.data ?? []) as any);
      setLoading(false);
    })();
  }, [user?.id]);

  const refresh = () => {
    if (user?.id) {
      setLoading(true);
      supabase.from("leave_requests").select("*").eq("employee_id", employee?.id).order("start_date", { ascending: false })
        .then(({ data }) => { setLeaveRequests((data ?? []) as any); setLoading(false); });
    }
  };

  const downloadPDF = async (p: Payslip) => {
    try {
      const [{ data: items }, { data: run }] = await Promise.all([
        supabase.from("payslip_line_items").select("*, payroll_concepts(code, name, kind)").eq("payslip_id", p.id),
        supabase.from("payroll_runs").select("period_start, period_end, pay_date").eq("id", p.run_id).maybeSingle(),
      ]);
      generatePayslipPDF({ payslip: p, employee, run: run as any, items: (items ?? []) as any, auditHash: p.audit_hash });
    } catch (e: any) {
      toast.error(`Error generando PDF: ${e.message}`);
    }
  };

  if (loading) return <><PageHeader title="Portal del empleado" /><LoadingState /></>;

  if (!employee) {
    return (
      <>
        <PageHeader title="Portal del empleado" />
        <EmptyState title="Sin ficha de empleado" description="Tu usuario no está vinculado a una ficha de empleado. Contacta con RRHH." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Hola, ${employee.first_name}`}
        description={`Portal personal · ${employee.employee_code}`}
        actions={
          <Dialog open={openReq} onOpenChange={setOpenReq}>
            <Button onClick={() => setOpenReq(true)}><Plus className="h-4 w-4" /> Nueva solicitud</Button>
            <LeaveRequestForm
              employee={employee}
              leaveTypes={leaveTypes}
              teamRequests={teamRequests}
              onDone={() => { setOpenReq(false); refresh(); }}
            />
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserIcon className="h-4 w-4" /> Mi ficha</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Email:</span> {employee.email ?? "—"}</p>
            <p><span className="text-muted-foreground">Teléfono:</span> {employee.phone ?? "—"}</p>
            <p><span className="text-muted-foreground">Ingreso:</span> {new Date(employee.hire_date).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Solicitudes activas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{leaveRequests.filter((r) => r.status === "submitted" || r.status === "approved").length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recibos disponibles</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{payslips.length}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Mis solicitudes</TabsTrigger>
          <TabsTrigger value="calendar">Calendario del equipo</TabsTrigger>
          <TabsTrigger value="payslips">Mis recibos</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card><CardContent className="p-4">
            {leaveRequests.length === 0 ? <EmptyState title="Sin solicitudes" description="Crea tu primera solicitud de permiso o vacaciones." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead><TableHead>Días</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>{leaveRequests.map((r) => {
                  const t = leaveTypes.find((x) => x.id === r.leave_type_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{t?.name ?? "—"}</TableCell>
                      <TableCell>{new Date(r.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(r.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>{r.days_requested ?? "—"}</TableCell>
                      <TableCell><Badge variant={r.status === "approved" ? "secondary" : r.status === "rejected" ? "destructive" : "outline"}>{r.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}</TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card><CardContent className="p-4">
            <TeamCalendar teamRequests={teamRequests} myRequests={leaveRequests} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payslips">
          <Card><CardContent className="p-4">
            {payslips.length === 0 ? <EmptyState title="Sin recibos" description="Aún no se han generado recibos para ti." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Bruto</TableHead><TableHead>Deducciones</TableHead><TableHead>Neto</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>{payslips.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(p.gross, p.currency)}</TableCell>
                    <TableCell className="font-mono text-destructive">{formatCurrency(p.deductions, p.currency)}</TableCell>
                    <TableCell className="font-mono font-semibold">{formatCurrency(p.net, p.currency)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => downloadPDF(p)}><FileDown className="h-4 w-4" /> PDF</Button>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function LeaveRequestForm({ employee, leaveTypes, teamRequests, onDone }: { employee: any; leaveTypes: LeaveType[]; teamRequests: LeaveReq[]; onDone: () => void }) {
  const [typeId, setTypeId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => {
    if (!start || !end) return 0;
    return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
  }, [start, end]);

  const conflicts = useMemo(() => {
    if (!start || !end) return [];
    const s = new Date(start).getTime(); const e = new Date(end).getTime();
    return teamRequests.filter((r) => {
      const rs = new Date(r.start_date).getTime(); const re = new Date(r.end_date).getTime();
      return rs <= e && re >= s;
    });
  }, [start, end, teamRequests]);

  const submit = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        employee_id: employee.id,
        leave_type_id: typeId,
        start_date: start,
        end_date: end,
        days_requested: days,
        reason: reason || null,
        status: "submitted",
      });
      if (error) throw error;
      toast.success("Solicitud enviada");
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Nueva solicitud de permiso</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Tipo</Label>
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
            <SelectContent>{leaveTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Inicio</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><Label>Fin</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>
        {days > 0 && <p className="text-sm text-muted-foreground">Días solicitados: <strong>{days}</strong></p>}
        {conflicts.length > 0 && (
          <div className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
            ⚠️ Solapamiento con {conflicts.length} compañero{conflicts.length > 1 ? "s" : ""} del equipo en esas fechas.
          </div>
        )}
        <div><Label>Motivo (opcional)</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></div>
      </div>
      <DialogFooter>
        <Button disabled={saving || !typeId || !start || !end} onClick={submit}>{saving ? "Enviando..." : "Enviar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TeamCalendar({ teamRequests, myRequests }: { teamRequests: LeaveReq[]; myRequests: LeaveReq[] }) {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const firstDow = base.getDay();

  const dayStatus = (day: number): "free" | "mine" | "team" | "both" => {
    const d = new Date(base.getFullYear(), base.getMonth(), day);
    const t = d.getTime();
    const mine = myRequests.some((r) => new Date(r.start_date).getTime() <= t && new Date(r.end_date).getTime() >= t);
    const team = teamRequests.some((r) => new Date(r.start_date).getTime() <= t && new Date(r.end_date).getTime() >= t);
    if (mine && team) return "both";
    if (mine) return "mine";
    if (team) return "team";
    return "free";
  };

  const cellClass = (s: string) =>
    s === "free" ? "bg-green-50 border-green-200 text-green-900"
    : s === "mine" ? "bg-blue-100 border-blue-300 text-blue-900 font-semibold"
    : s === "team" ? "bg-amber-100 border-amber-300 text-amber-900"
    : "bg-red-100 border-red-300 text-red-900 font-semibold";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> {base.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMonthOffset(monthOffset - 1)}>‹ Mes anterior</Button>
          <Button size="sm" variant="outline" onClick={() => setMonthOffset(0)}>Hoy</Button>
          <Button size="sm" variant="outline" onClick={() => setMonthOffset(monthOffset + 1)}>Mes siguiente ›</Button>
        </div>
      </div>
      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border bg-green-100 border-green-300" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border bg-blue-100 border-blue-300" /> Yo</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border bg-amber-100 border-amber-300" /> Equipo</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border bg-red-100 border-red-300" /> Conflicto</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["D","L","M","X","J","V","S"].map((d) => <div key={d} className="font-semibold text-muted-foreground py-1">{d}</div>)}
        {Array.from({ length: firstDow }).map((_, i) => <div key={"empty-"+i} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const s = dayStatus(day);
          return <div key={day} className={`aspect-square rounded border p-1 flex items-center justify-center ${cellClass(s)}`}>{day}</div>;
        })}
      </div>
    </div>
  );
}
