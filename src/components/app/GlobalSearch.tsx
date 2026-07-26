import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Users, Receipt, Palmtree } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Result =
  | { kind: "employee"; id: string; label: string; sub: string }
  | { kind: "payslip"; id: string; label: string; sub: string }
  | { kind: "leave"; id: string; label: string; sub: string };

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const pattern = `%${term}%`;
      const [emps, slips, leaves] = await Promise.all([
        (supabase.from as any)("employees")
          .select("id, first_name, last_name, employee_code, email")
          .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},employee_code.ilike.${pattern},email.ilike.${pattern}`)
          .limit(6),
        (supabase.from as any)("payslips")
          .select("id, gross, net, currency, employee_id, employees(first_name,last_name,employee_code)")
          .limit(50),
        (supabase.from as any)("leave_requests")
          .select("id, start_date, end_date, status, employee_id, employees(first_name,last_name,employee_code)")
          .limit(50),
      ]);
      if (cancelled) return;
      const lower = term.toLowerCase();
      const empRows: Result[] = (emps.data ?? []).map((e: any) => ({
        kind: "employee" as const, id: e.id,
        label: `${e.first_name} ${e.last_name}`,
        sub: `${e.employee_code ?? ""} · ${e.email ?? ""}`,
      }));
      const slipRows: Result[] = (slips.data ?? [])
        .filter((p: any) => {
          const n = `${p.employees?.first_name ?? ""} ${p.employees?.last_name ?? ""} ${p.employees?.employee_code ?? ""}`.toLowerCase();
          return n.includes(lower);
        })
        .slice(0, 6)
        .map((p: any) => ({
          kind: "payslip" as const, id: p.id,
          label: `Recibo · ${p.employees?.first_name ?? ""} ${p.employees?.last_name ?? ""}`,
          sub: `Neto ${p.net} ${p.currency}`,
        }));
      const leaveRows: Result[] = (leaves.data ?? [])
        .filter((r: any) => {
          const n = `${r.employees?.first_name ?? ""} ${r.employees?.last_name ?? ""} ${r.employees?.employee_code ?? ""}`.toLowerCase();
          return n.includes(lower);
        })
        .slice(0, 6)
        .map((r: any) => ({
          kind: "leave" as const, id: r.id,
          label: `Solicitud · ${r.employees?.first_name ?? ""} ${r.employees?.last_name ?? ""}`,
          sub: `${new Date(r.start_date).toLocaleDateString()} → ${new Date(r.end_date).toLocaleDateString()} · ${r.status}`,
        }));
      setResults([...empRows, ...slipRows, ...leaveRows]);
      setLoading(false);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const go = (r: Result) => {
    setOpen(false); setQ("");
    if (r.kind === "employee") navigate({ to: "/employees" });
    else if (r.kind === "payslip") navigate({ to: "/payroll/payslips" });
    else navigate({ to: "/leave/requests" });
  };

  const iconFor = (k: Result["kind"]) => k === "employee" ? Users : k === "payslip" ? Receipt : Palmtree;

  return (
    <div ref={boxRef} className="relative max-w-md flex-1">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Buscar empleados, recibos, solicitudes..."
        className="h-9 pl-8"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
          {!loading && results.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>}
          {results.map((r) => {
            const Icon = iconFor(r.kind);
            return (
              <button
                key={`${r.kind}-${r.id}`}
                onClick={() => go(r)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
