import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  Network,
  Building2,
  FileText,
  Clock,
  CalendarClock,
  Palmtree,
  Scale,
  CalendarRange,
  Wallet,
  Receipt,
  Settings2,
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  Briefcase,
  Target,
  GraduationCap,
  Gift,
  UserCircle2,
  Award,
  History,
  UsersRound,
  SlidersHorizontal,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  status?: "ready" | "wip" | "planned";
  /** If set, only users with at least one of these roles see this item. Empty/undefined = everyone. */
  roles?: AppRole[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

// Role model:
//   admin        → todo
//   hr           → personal, tiempo, permisos (gestión), talento, nómina lectura
//   finance      → nómina (gestión), aprobaciones, alertas
//   supervisor   → equipo, asistencia, aprobación de permisos, aprobaciones
//   employee     → dashboard, portal, sus propios recibos/permisos
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "General",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard, status: "ready" },
      { label: "Calendario del equipo", to: "/team-calendar", icon: CalendarRange, status: "ready" },
    ],
  },
  {
    title: "Gestión de Personal",
    items: [
      { label: "Empleados", to: "/employees", icon: Users, status: "ready", roles: ["admin", "hr", "supervisor", "finance"] },
      { label: "Organigrama", to: "/org-chart", icon: Network, status: "ready" },
      { label: "Departamentos y Puestos", to: "/departments", icon: Building2, status: "ready", roles: ["admin", "hr"] },
      { label: "Contratos", to: "/contracts", icon: FileText, status: "ready", roles: ["admin", "hr", "finance"] },
    ],
  },
  {
    title: "Tiempo y Asistencia",
    items: [
      { label: "Asistencia", to: "/attendance", icon: Clock, status: "ready" },
      { label: "Turnos y Horarios", to: "/schedules", icon: CalendarClock, status: "ready", roles: ["admin", "hr", "supervisor"] },
    ],
  },
  {
    title: "Vacaciones y Permisos",
    items: [
      { label: "Solicitudes", to: "/leave/requests", icon: Palmtree, status: "ready" },
      { label: "Saldos", to: "/leave/balances", icon: Scale, status: "ready" },
      { label: "Motor de asignación", to: "/leave/scheduler", icon: CalendarRange, status: "ready", roles: ["admin", "hr"] },
    ],
  },
  {
    title: "Nómina",
    items: [
      { label: "Corridas", to: "/payroll/runs", icon: Wallet, status: "ready", roles: ["admin", "hr", "finance"] },
      { label: "Recibos", to: "/payroll/payslips", icon: Receipt, status: "ready", roles: ["admin", "hr", "finance"] },
      { label: "Configuración", to: "/payroll/config", icon: Settings2, status: "ready", roles: ["admin", "hr", "finance"] },
    ],
  },
  {
    title: "Aprobaciones y Alertas",
    items: [
      { label: "Workflow de pagos", to: "/approvals/workflows", icon: ShieldCheck, status: "ready", roles: ["admin", "finance"] },
      { label: "Pendientes de aprobación", to: "/approvals/pending", icon: ClipboardList, status: "ready", roles: ["admin", "finance", "supervisor"] },
      { label: "Alertas de sobrepago", to: "/approvals/alerts", icon: AlertTriangle, status: "ready", roles: ["admin", "finance"] },
      { label: "Alertas operativas", to: "/alerts", icon: AlertTriangle, status: "ready", roles: ["admin", "hr", "finance", "supervisor"] },
    ],
  },
  {
    title: "Talento",
    items: [
      { label: "Reclutamiento", to: "/recruitment", icon: Briefcase, status: "ready", roles: ["admin", "hr"] },
      { label: "Evaluación de Desempeño", to: "/performance", icon: Target, status: "ready", roles: ["admin", "hr", "supervisor"] },
      { label: "Capacitación", to: "/training", icon: GraduationCap, status: "ready", roles: ["admin", "hr"] },
      { label: "Beneficios", to: "/benefits", icon: Gift, status: "ready", roles: ["admin", "hr"] },
      { label: "Cumplimiento", to: "/compliance", icon: Award, status: "ready", roles: ["admin", "hr"] },
    ],
  },
  {
    title: "Empleado",
    items: [
      { label: "Portal del Empleado", to: "/employee-portal", icon: UserCircle2, status: "ready" },
    ],
  },
  {
    title: "Administración",
    items: [
      { label: "Auditoría", to: "/audit", icon: History, status: "ready", roles: ["admin"] },
      { label: "Usuarios y Roles", to: "/admin/users", icon: UsersRound, status: "ready", roles: ["admin"] },
      { label: "Parámetros del sistema", to: "/admin/settings", icon: SlidersHorizontal, status: "ready", roles: ["admin"] },
    ],
  },
];

export function canSeeNavItem(item: NavItem, roles: AppRole[]): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.some((r) => roles.includes(r));
}
