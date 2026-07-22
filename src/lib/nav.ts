import type { LucideIcon } from "lucide-react";
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
  History,
  UsersRound,
  SlidersHorizontal,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  status?: "ready" | "wip" | "planned";
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "General",
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard, status: "ready" }],
  },
  {
    title: "Gestión de Personal",
    items: [
      { label: "Empleados", to: "/employees", icon: Users, status: "ready" },
      { label: "Organigrama", to: "/org-chart", icon: Network, status: "ready" },
      { label: "Departamentos y Puestos", to: "/departments", icon: Building2, status: "ready" },
      { label: "Contratos", to: "/contracts", icon: FileText, status: "ready" },
    ],
  },
  {
    title: "Tiempo y Asistencia",
    items: [
      { label: "Asistencia", to: "/attendance", icon: Clock, status: "ready" },
      { label: "Turnos y Horarios", to: "/schedules", icon: CalendarClock, status: "ready" },
    ],
  },
  {
    title: "Vacaciones y Permisos",
    items: [
      { label: "Solicitudes", to: "/leave/requests", icon: Palmtree, status: "ready" },
      { label: "Saldos", to: "/leave/balances", icon: Scale, status: "ready" },
      { label: "Motor de asignación", to: "/leave/scheduler", icon: CalendarRange, status: "ready" },
    ],
  },
  {
    title: "Nómina",
    items: [
      { label: "Corridas", to: "/payroll/runs", icon: Wallet, status: "ready" },
      { label: "Recibos", to: "/payroll/payslips", icon: Receipt, status: "ready" },
      { label: "Configuración", to: "/payroll/config", icon: Settings2, status: "ready" },
    ],
  },
  {
    title: "Aprobaciones y Alertas",
    items: [
      { label: "Workflow de pagos", to: "/approvals/workflows", icon: ShieldCheck, status: "ready" },
      { label: "Pendientes de aprobación", to: "/approvals/pending", icon: ClipboardList, status: "ready" },
      { label: "Alertas de sobrepago", to: "/approvals/alerts", icon: AlertTriangle, status: "ready" },
    ],
  },
  {
    title: "Talento",
    items: [
      { label: "Reclutamiento", to: "/recruitment", icon: Briefcase, status: "ready" },
      { label: "Evaluación de Desempeño", to: "/performance", icon: Target, status: "ready" },
      { label: "Capacitación", to: "/training", icon: GraduationCap, status: "ready" },
      { label: "Beneficios", to: "/benefits", icon: Gift, status: "ready" },
    ],
  },
  {
    title: "Empleado",
    items: [
      { label: "Portal del Empleado", to: "/self-service", icon: UserCircle2, status: "ready" },
    ],
  },
  {
    title: "Administración",
    items: [
      { label: "Auditoría", to: "/audit", icon: History, status: "ready" },
      { label: "Usuarios y Roles", to: "/admin/users", icon: UsersRound, status: "ready" },
      { label: "Parámetros del sistema", to: "/admin/settings", icon: SlidersHorizontal, status: "ready" },
    ],
  },
];
