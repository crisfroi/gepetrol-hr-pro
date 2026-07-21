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
      { label: "Empleados", to: "/employees", icon: Users, status: "planned" },
      { label: "Organigrama", to: "/org-chart", icon: Network, status: "planned" },
      { label: "Departamentos y Puestos", to: "/departments", icon: Building2, status: "planned" },
      { label: "Contratos", to: "/contracts", icon: FileText, status: "planned" },
    ],
  },
  {
    title: "Tiempo y Asistencia",
    items: [
      { label: "Asistencia", to: "/attendance", icon: Clock, status: "planned" },
      { label: "Turnos y Horarios", to: "/schedules", icon: CalendarClock, status: "planned" },
    ],
  },
  {
    title: "Vacaciones y Permisos",
    items: [
      { label: "Solicitudes", to: "/leave/requests", icon: Palmtree, status: "planned" },
      { label: "Saldos", to: "/leave/balances", icon: Scale, status: "planned" },
      { label: "Motor de asignación", to: "/leave/scheduler", icon: CalendarRange, status: "planned" },
    ],
  },
  {
    title: "Nómina",
    items: [
      { label: "Corridas", to: "/payroll/runs", icon: Wallet, status: "planned" },
      { label: "Recibos", to: "/payroll/payslips", icon: Receipt, status: "planned" },
      { label: "Configuración", to: "/payroll/config", icon: Settings2, status: "planned" },
    ],
  },
  {
    title: "Aprobaciones y Alertas",
    items: [
      { label: "Workflow de pagos", to: "/approvals/workflows", icon: ShieldCheck, status: "planned" },
      { label: "Pendientes de aprobación", to: "/approvals/pending", icon: ClipboardList, status: "planned" },
      { label: "Alertas de sobrepago", to: "/approvals/alerts", icon: AlertTriangle, status: "planned" },
    ],
  },
  {
    title: "Talento",
    items: [
      { label: "Reclutamiento", to: "/recruitment", icon: Briefcase, status: "planned" },
      { label: "Evaluación de Desempeño", to: "/performance", icon: Target, status: "planned" },
      { label: "Capacitación", to: "/training", icon: GraduationCap, status: "planned" },
      { label: "Beneficios", to: "/benefits", icon: Gift, status: "planned" },
    ],
  },
  {
    title: "Empleado",
    items: [
      { label: "Portal del Empleado", to: "/self-service", icon: UserCircle2, status: "planned" },
    ],
  },
  {
    title: "Administración",
    items: [
      { label: "Auditoría", to: "/audit", icon: History, status: "planned" },
      { label: "Usuarios y Roles", to: "/admin/users", icon: UsersRound, status: "planned" },
      { label: "Parámetros del sistema", to: "/admin/settings", icon: SlidersHorizontal, status: "planned" },
    ],
  },
];
