
# ERP de Gestión de RRHH — GEPETROL

Plan de implementación en dos fases. La Fase 1 entrega **solo** el SQL de migración (sin aplicar a la base). La Fase 2 arranca inmediatamente con la base del frontend: identidad visual, layout, navegación con todos los módulos y páginas placeholder para los módulos no implementados aún. Al final se entrega un `README.md` con la hoja de ruta completa hasta full-stack.

Stack confirmado del proyecto: **TanStack Start (React 19 + Vite) + TypeScript + Tailwind v4 + shadcn/ui + Supabase**. Nota: la plantilla ya no usa Vite+React Router puro, así que se respeta el enrutado por archivos de TanStack Router (`src/routes/*`) en vez de un `App.tsx` con rutas manuales. Las Edge Functions se sustituyen por **TanStack server functions** (`createServerFn`) para lógica interna; solo se usarán Supabase Edge Functions si algo debe vivir en un endpoint Supabase.

---

## Fase 1 — Migración SQL (entrega para revisión, NO se aplica)

Se generan bloques SQL organizados por archivos lógicos. **No se ejecuta la migración** — se presentan en el chat en bloques ```sql para revisión manual.

Convenciones comunes:
- PKs `uuid` con `gen_random_uuid()`.
- `created_at` / `updated_at timestamptz` + trigger `update_updated_at_column`.
- RLS **ENABLE** en todas las tablas + `GRANT` explícitos (`authenticated`, `service_role`; `anon` solo donde aplique).
- Roles vía tabla separada `user_roles` + `app_role` enum + `has_role()` `SECURITY DEFINER` (evita recursión en RLS).
- Auditoría vía trigger genérico `audit_trigger()` que escribe JSONB antes/después en `audit_log`.
- Parámetros de negocio (impuestos, métodos de cálculo, niveles de aprobación) en tablas de configuración — nada hardcodeado.

### Archivos SQL

**`001_core_hr.sql`** — núcleo RRHH
- `app_role` enum (`admin`, `hr`, `finance`, `supervisor`, `employee`).
- `user_roles`, `has_role()`.
- `departments`, `positions`, `org_chart` (jerárquico self-ref).
- `employees` (identificación, contacto, foto, estado, fecha ingreso, department_id, position_id, manager_id, user_id → `auth.users`).
- `employment_contracts` (tipo, fechas, salario base, moneda, método de cálculo).
- `employee_documents` (referencia a Storage).
- Índices por `department_id`, `manager_id`, `status`.
- RLS: empleado ve lo suyo; supervisor su departamento (usando `has_role` + jerarquía); HR/admin todo.

**`002_attendance.sql`** — asistencia y turnos
- `work_schedules`, `shifts`, `shift_assignments`.
- `attendance_records` (check-in/out, fuente, geolocalización opcional).
- RLS por empleado / supervisor / HR.

**`003_leave_management.sql`** — vacaciones y permisos
- `leave_types` (configurable: nombre, devengo, remunerado, tope, requiere adjunto).
- `leave_balances` (empleado × tipo, devengado, usado, pendiente).
- `leave_requests` (fechas, tipo, estado, aprobador, comentarios, adjuntos).
- `leave_scheduling_constraints` (cobertura mínima por depto, fechas bloqueadas, prioridad por antigüedad, preferencias).
- `leave_scheduling_runs` + `leave_scheduling_proposals` (resultados del motor de optimización).
- Función `calculate_accrued_leave(employee_id, leave_type_id)` para devengo.
- RLS y triggers de auditoría.

**`004_payroll.sql`** — nómina 100% configurable
- `payroll_calculation_methods` (catálogo: fijo, por horas, mixto, comisión, destajo).
- `payroll_parameters` (clave/valor tipado: impuestos, cotizaciones, moneda, periodicidad).
- `payroll_concepts` (percepciones/deducciones/bonificaciones, fórmula, orden, activo).
- `payroll_runs` (periodo, estado: draft/review/approved/paid, totales).
- `payslips` (empleado × corrida, neto, bruto, moneda).
- `payslip_line_items` (concepto, monto, base cálculo).
- `employee_payroll_config` (asigna método y overrides por empleado).
- RLS estricta: empleado solo su payslip; finance/HR según alcance.

**`005_payment_approval.sql`** — autorización y alertas
- `payment_approval_workflows` (niveles configurables por tipo de pago).
- `payment_approval_steps` (nivel, rol requerido, orden).
- `payment_approvals` (paso, aprobador, decisión, timestamp, comentario).
- `payment_alerts` (payslip_id, tipo: overpay/underpay, monto esperado, desviación %, estado revisión, resolución).
- Función `detect_payment_anomaly(payslip_id)` (compara con histórico y rangos) — invocada al cerrar borrador de corrida.

**`006_audit.sql`** — auditoría
- `audit_log` (id, user_id, action, entity, entity_id, before JSONB, after JSONB, ip, ua, created_at) — solo INSERT desde triggers, sin UPDATE/DELETE (RLS restrictiva + revoke).
- Función genérica `audit_trigger()` + attach a tablas críticas: `payroll_runs`, `payslips`, `payment_approvals`, `leave_requests`, `employment_contracts`, `payroll_parameters`, `user_roles`.
- Vista `audit_log_view` para admins.

**`007_seed_config.sql`** (opcional, comentado) — semillas de tipos de permiso, métodos de cálculo, workflow por defecto y roles base, listos para revisión antes de aplicar.

Entrega Fase 1: los siete bloques SQL en el chat + explicación breve por archivo. **No se llama a la herramienta de migración.**

---

## Fase 2 — Frontend base (arranca automáticamente tras entregar el SQL)

Se implementa **sin depender** de que la migración esté aplicada: solo capa de UI, tema, navegación y páginas placeholder. Todo lo que necesita datos reales queda con estado vacío / mock local y una nota "pendiente de backend".

### 2.1 Identidad visual (paleta GEPETROL)

- Tokens en `src/styles.css` bajo `@theme` (Tailwind v4, CSS-first — no hay `tailwind.config.ts` en este stack).
- Colores primarios: `#00A88F` (primary), `#006A5B` (primary-dark), grises `#6A6A6A` / `#9B9B9B`, blanco puro.
- Semánticos derivados: success (verde paleta), warning (ámbar sobrio), destructive (rojo corporativo), info (azul grisáceo).
- Mapeo a tokens shadcn (`--primary`, `--primary-foreground`, etc.) vía `@theme inline`, manteniendo modo claro/oscuro.
- Tipografía **Inter** cargada con `<link>` en `__root.tsx` head (no `@import` remoto en CSS — Tailwind v4/Lightning CSS lo prohíbe).
- Gradiente de marca `--gradient-brand: linear-gradient(135deg, #00A88F, #006A5B)` para header/sidebar/loaders.
- Estética "oil & gas corporate": sobria, mucho whitespace, sin degradados violeta ni look startup.

### 2.2 Layout y navegación (TanStack Router)

- `src/routes/__root.tsx`: metadata real ("GEPETROL — ERP de RRHH"), fuente Inter, favicon.
- `src/routes/index.tsx`: **reemplaza el placeholder** con el Dashboard ejecutivo (KPIs mock: headcount, ausentismo, costo nómina, alertas pendientes).
- Layout principal en `src/routes/_app.tsx` (pathless) con:
  - **Sidebar** con gradiente de marca, logo/isotipo (placeholder SVG con degradado), navegación agrupada.
  - **Topbar**: buscador, notificaciones, menú de usuario.
  - `<Outlet />` para el contenido.
- Todos los módulos como rutas hijas del layout, cada una con `head()` propio (título/descr únicos).

### 2.3 Módulos en el menú (todos visibles; los no implementados como placeholder)

Estructura del sidebar:

- **Dashboard** — `/` (implementado con KPIs mock)
- **Gestión de Personal**
  - Empleados — `/employees` (placeholder con tabla vacía y estado "próximamente")
  - Organigrama — `/org-chart`
  - Departamentos y Puestos — `/departments`
  - Contratos — `/contracts`
- **Tiempo y Asistencia**
  - Asistencia — `/attendance`
  - Turnos y Horarios — `/schedules`
- **Vacaciones y Permisos**
  - Solicitudes — `/leave/requests`
  - Saldos — `/leave/balances`
  - Motor de asignación — `/leave/scheduler`
- **Nómina**
  - Corridas — `/payroll/runs`
  - Recibos — `/payroll/payslips`
  - Configuración — `/payroll/config`
- **Aprobaciones y Alertas**
  - Workflow de pagos — `/approvals/workflows`
  - Pendientes de aprobación — `/approvals/pending`
  - Alertas de sobrepago — `/approvals/alerts`
- **Reclutamiento** — `/recruitment` (placeholder)
- **Evaluación de Desempeño** — `/performance` (placeholder)
- **Capacitación** — `/training` (placeholder)
- **Beneficios** — `/benefits` (placeholder)
- **Portal del Empleado** — `/self-service` (placeholder)
- **Auditoría** — `/audit`
- **Administración**
  - Usuarios y Roles — `/admin/users`
  - Parámetros del sistema — `/admin/settings`

Cada página placeholder usa un componente compartido `<ModulePlaceholder title description icon />` con estado consistente (icono, breve descripción del módulo, badge "Próximamente"), evitando duplicación.

### 2.4 Componentes shadcn a instalar

`button`, `card`, `table`, `input`, `label`, `select`, `dialog`, `dropdown-menu`, `avatar`, `badge`, `tabs`, `separator`, `sheet`, `tooltip`, `toast`/`sonner`, `skeleton`, `alert`.

### 2.5 Utilidades transversales

- `src/lib/format.ts`: `formatCurrency` (multi-moneda), `formatDate`, `formatPercent`.
- `src/lib/nav.ts`: definición central de secciones de menú (fuente única para sidebar y breadcrumb).
- Componentes UI: `AppSidebar`, `AppTopbar`, `PageHeader`, `KpiCard`, `ModulePlaceholder`, `BrandMark` (isotipo SVG con gradiente).

### 2.6 README.md — plan full-stack

Se escribe/actualiza `README.md` con:
1. Visión y alcance del ERP.
2. Stack técnico y decisiones (TanStack Start en vez de Next/Vue; server functions en vez de Edge Functions salvo webhooks; motor de asignación de vacaciones como server function TS con heurística — con hook para microservicio OptaPlanner externo futuro).
3. Identidad visual y tokens.
4. Modelo de datos (resumen por dominio, referencia a los 7 archivos SQL).
5. Roadmap por hitos:
   - **H0** Fundaciones (paleta, layout, menú, placeholders) — Fase 2 actual.
   - **H1** Aplicar migración SQL + Auth + roles + RLS verificada.
   - **H2** Core HR (CRUD empleados, departamentos, puestos, contratos, organigrama).
   - **H3** Asistencia y turnos.
   - **H4** Vacaciones (solicitudes, saldos, aprobaciones) + motor de asignación (server function).
   - **H5** Nómina configurable (parámetros, conceptos, corridas, payslips).
   - **H6** Workflow de aprobación de pagos + motor de alertas de sobrepago.
   - **H7** Auditoría (panel de consulta) + endurecimiento de RLS + linter.
   - **H8** Portal de autoservicio del empleado.
   - **H9** Reclutamiento, desempeño, capacitación, beneficios.
   - **H10** Dashboards ejecutivos con datos reales, reportes exportables.
6. Seguridad: RLS por defecto, `has_role`, auditoría inmutable, secretos en Supabase, cifrado.
7. Cómo contribuir / convenciones de código.

### 2.7 Fuera de alcance en Fase 2

- No se aplica la migración.
- No se implementa Auth todavía (llega en H1) — se muestra el layout sin gate.
- No hay llamadas reales a Supabase; los módulos no core están como placeholder.

---

## Detalles técnicos relevantes

- **No** se crea `tailwind.config.ts` (Tailwind v4 en este stack ignora config JS; tokens van en `@theme` dentro de `src/styles.css`).
- **No** se crea `src/pages/` ni un `App.tsx` con rutas: se usa `src/routes/*` (TanStack Router file-based). El menú y layout viven en `src/routes/_app.tsx` con `<Outlet />`.
- **No** se crean Supabase Edge Functions nuevas: cuando llegue lógica servidor (H4+), se usa `createServerFn` de `@tanstack/react-start`.
- El motor de asignación de vacaciones (H4) se implementará como server function TypeScript con heurística (simulated annealing / genético ligero), dejando la interfaz preparada para delegar a un microservicio OptaPlanner externo vía HTTP si se decide en el futuro.
- Auditoría vía triggers Postgres, no vía código app, para que sea inevitable.
- Todos los parámetros de negocio en tablas de configuración — el frontend los lee, nunca los codifica.

---

## Entregable inmediato tras aprobar este plan

1. Fase 1: los siete bloques SQL en el chat (sin ejecutar la migración).
2. Fase 2: implementación del frontend base descrito (tema, layout, sidebar con todos los módulos, dashboard con KPIs mock, placeholders para el resto) + `README.md` con el roadmap H0–H10.
