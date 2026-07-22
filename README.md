# GEPETROL — ERP de Gestión de Recursos Humanos

Sistema integral de RRHH para **GEPETROL** (Guinea Ecuatorial de Petróleos): personal, nómina, vacaciones, aprobaciones y auditoría, con enfoque corporativo del sector Oil & Gas.

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Framework | **TanStack Start** (SSR / file-based routing) |
| Estilos | Tailwind CSS v4 (CSS-first, tokens en `src/styles.css`) + shadcn/ui |
| Estado / datos | TanStack Query |
| Backend | Supabase (Postgres + Auth + RLS + Storage) |
| Lógica servidor | **TanStack Server Functions** (`createServerFn`) — no se crean Supabase Edge Functions salvo webhooks |

> Nota: el proyecto **no** usa Next.js, Vue, Angular ni React Router DOM. Todas las rutas viven en `src/routes/*` con la convención flat-dot de TanStack Router.

## Identidad visual — Paleta GEPETROL

Tokens definidos en `src/styles.css` bajo `@theme`. **Nunca hardcodear colores** en componentes.

| Rol | Hex | Token |
|-----|-----|-------|
| Primario (Verde Esmeralda / Turquesa) | `#00A88F` | `--brand` |
| Primario oscuro (Petróleo) | `#006A5B` | `--brand-dark`, `--primary` |
| Texto principal (Grafito) | `#6A6A6A` | `--foreground` |
| Texto secundario (Gris claro) | `#9B9B9B` | `--muted-foreground` |
| Fondo | `#FFFFFF` | `--background` |
| Success | verde marca | `--success` |
| Warning | ámbar sobrio | `--warning` |
| Destructive (alerta sobrepago) | rojo corporativo | `--destructive` |
| Info | azul grisáceo | `--info` |

Gradiente de marca (`--gradient-brand`) usado en sidebar, isotipo y loaders. Tipografía: **Inter** cargada vía `<link>` en `__root.tsx`.

## Estructura del proyecto

```
src/
├── routes/                 # File-based routing (TanStack Router)
│   ├── __root.tsx         # Head, providers, layout global
│   ├── index.tsx          # Dashboard ejecutivo
│   ├── employees.tsx      # Módulos (placeholders en Fase 2)
│   ├── leave.requests.tsx
│   ├── payroll.runs.tsx
│   └── ...
├── components/
│   ├── app/               # AppShell, AppSidebar, AppTopbar, KpiCard, ...
│   └── ui/                # shadcn/ui
├── lib/
│   ├── nav.ts             # Fuente única del menú
│   ├── format.ts          # Formatos de moneda, fecha, %
│   └── utils.ts
└── integrations/supabase/ # Clientes browser / server / auth middleware
```

## Modelo de datos (resumen)

Definido en 7 migraciones SQL (**generadas pero no aplicadas** en Fase 1):

| Archivo | Contenido |
|---------|-----------|
| `001_core_hr.sql` | `app_role`, `user_roles`, `has_role()`, departments, positions, employees, employment_contracts, employee_documents |
| `002_attendance.sql` | work_schedules, shifts, shift_assignments, attendance_records |
| `003_leave_management.sql` | leave_types, leave_balances, leave_requests, leave_scheduling_constraints, leave_scheduling_runs/proposals |
| `004_payroll.sql` | payroll_calculation_methods, payroll_parameters, payroll_concepts, payroll_runs, payslips, payslip_line_items, employee_payroll_config |
| `005_payment_approval.sql` | workflows, steps, approvals, alerts + `detect_payment_anomaly()` |
| `006_audit.sql` | `audit_log` inmutable + `audit_trigger()` genérico attach a tablas críticas |
| `007_seed_config.sql` | Semillas de tipos de permiso, métodos de cálculo y workflow por defecto |

Convenciones: UUIDs, `created_at`/`updated_at` con trigger, **RLS activa desde la primera tabla**, `GRANT` explícitos por rol, `has_role()` `SECURITY DEFINER` para evitar recursión.

## Seguridad transversal

- **Row Level Security** en todas las tablas desde el inicio.
- Roles en **tabla separada** `user_roles` (nunca en `employees` o `profiles`).
- Auditoría **vía triggers Postgres**, no vía código — inevitable.
- Ningún parámetro de negocio (impuestos, métodos, niveles de aprobación) hardcodeado — todo en tablas de configuración.
- Secretos vía Supabase (`SUPABASE_SERVICE_ROLE_KEY` **nunca** en el navegador).
- Server-only via `client.server.ts`; server functions con `requireSupabaseAuth` para acciones del usuario.

## Roadmap full-stack

| Hito | Alcance |
|------|---------|
| **H0** ✅ | Fundaciones UI: paleta, layout, sidebar, dashboard con KPIs mock, placeholders para todos los módulos |
| **H1** ✅ | Auth (email/password) · `profiles` + `user_roles` + `has_role()` · trigger `on_auth_user_created` · layout `_authenticated` con gate · páginas `/auth` y `/reset-password` |
| **H2** | Core HR: CRUD empleados, departamentos, puestos, contratos, organigrama, documentos (Storage) |
| **H3** | Asistencia y turnos: check-in web/móvil, horarios, cobertura |
| **H4** | Vacaciones: solicitudes, saldos, aprobaciones + **motor de asignación** (server function TS con simulated annealing; interfaz preparada para microservicio OptaPlanner externo) |
| **H5** | Nómina configurable: parámetros, conceptos, corridas, payslips, PDF |
| **H6** | Workflow de aprobación de pagos + motor de alertas de sobrepago (`detect_payment_anomaly`) |
| **H7** | Panel de auditoría, endurecimiento RLS, revisión con linter |
| **H8** | Portal de autoservicio del empleado |
| **H9** | Reclutamiento, desempeño, capacitación, beneficios |
| **H10** | Dashboards ejecutivos con datos reales, reportes exportables (CSV/PDF), KPIs de headcount y rotación |

## Decisiones clave

- **TanStack Start en lugar de Next.js/Vue**: es el stack nativo de la plantilla; no se crea `src/pages/` ni `App.tsx` con rutas manuales.
- **Server functions en lugar de Edge Functions** para toda la lógica interna. Webhooks (si aparecen) irán a `src/routes/api/public/*`.
- **Motor de vacaciones en TypeScript** (heurística local) porque OptaPlanner es Java y no corre en Deno/Workers. La server function se diseña con una interfaz genérica para poder delegar a un microservicio OptaPlanner externo por HTTP si se decide después.
- **Auditoría en la base**, no en la app — un trigger genérico registra JSONB antes/después de cada mutación crítica.

## Convenciones de código

- No hardcodear colores: usar `bg-primary`, `text-foreground`, `bg-brand-gradient`, etc.
- Nuevos módulos → un archivo en `src/routes/`, con `head()` propio.
- Nuevas entidades → migración SQL con `CREATE TABLE` + `GRANT` + `ENABLE RLS` + policies **en el mismo archivo**.
- Server-only imports (`@/integrations/supabase/client.server`) solo dentro de handlers de server functions, nunca a nivel de módulo en archivos importados por rutas.

## Estado actual — Fase 2

Entregado en esta fase:
- Paleta GEPETROL aplicada a tokens shadcn.
- `AppShell` con sidebar gradiente de marca y topbar con búsqueda.
- Dashboard con 4 KPIs y widgets ilustrativos.
- Rutas creadas para **todos** los módulos del menú (23 módulos) con `<ModulePlaceholder>`.
- Migración SQL completa (7 archivos) **pendiente de aplicación manual**.

Próximo paso: elevar el primer usuario a `admin` desde la tabla `user_roles` (SQL Editor) y arrancar **H2 (Core HR: empleados, departamentos, puestos, contratos, organigrama)**.

### Elevar un usuario a admin

Tras el primer registro, ejecuta en el SQL Editor de Supabase:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'tu@correo.com'
ON CONFLICT DO NOTHING;
```

### Deshabilitar confirmación de correo (desarrollo)

Para pruebas rápidas: **Supabase Dashboard → Authentication → Providers → Email** y desactiva "Confirm email".
