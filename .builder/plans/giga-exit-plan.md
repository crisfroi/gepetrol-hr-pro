# Plan: Completar Sistema GEPETROL RRHH a Producción

## Objetivo
Transformar los 5 módulos de placeholder en CRUDs funcionales y implementar motores de cálculo avanzados para nómina y vacaciones.

---

## FASE 1: Corrección del Bug de `digest()` (Priority: BLOCKER)

**Estado:** Migración modificada, pero aún no aplicada en Supabase.

**Acción:**
- Aplicar la migración corregida `20260723090000_auditable_documents_and_dev_seed_data.sql` con los casts `::bytea` y `::name` en todas las llamadas a `digest()`
- Regenerar datos de prueba (`generate_development_seed_data`) para validar que la función RPC funciona

**Archivos afectados:**
- `supabase/migrations/20260723090000_auditable_documents_and_dev_seed_data.sql` ✓ (ya modificado)

---

## FASE 2: Completar 5 Módulos de Placeholder (CRUD Completo)

### Módulos a implementar:
1. **Reclutamiento** (`recruitment.tsx`)
2. **Beneficios** (`benefits.tsx`)
3. **Capacitación** (`training.tsx`)
4. **Portal del Empleado** (`self-service.tsx`)
5. **Evaluación de Desempeño** (`performance.tsx`)

### Estructura estándar por módulo:
Cada módulo tendrá:
- **Listado**: tabla con búsqueda/filtro
- **Crear**: diálogo con formulario
- **Editar**: acciones inline o diálogo modal
- **Eliminar**: confirmación antes de borrar
- **Estados**: badges de estado donde aplique

### Detalle por módulo:

#### 1. **Reclutamiento** (recruitment.tsx)
- **Tablas DB a usar:** `job_postings`, `job_applicants`, `recruitment_stages`
- **Campos principales:** título del puesto, descripción, estado (abierto/cerrado), candidatos
- **Acciones:** listar vacantes, agregar candidatos, cambiar estado de candidato, ver historial

#### 2. **Beneficios** (benefits.tsx)
- **Tablas DB:** `benefit_types`, `employee_benefits`, `benefit_policies`
- **Campos:** tipo de beneficio, cobertura, costo para empleado/empresa, vigencia
- **Acciones:** configurar tipos de beneficio, asignar a empleados, ver pólizas

#### 3. **Capacitación** (training.tsx)
- **Tablas DB:** `training_programs`, `training_enrollment`, `training_completion`
- **Campos:** nombre del programa, instructor, fechas, costo, participantes
- **Acciones:** crear programas, matricular empleados, registrar asistencia/completitud

#### 4. **Portal del Empleado** (self-service.tsx)
- **Lectura de:** datos personales, comprobantes de pago, estado de solicitudes
- **Campos editables:** teléfono, dirección, información de contacto de emergencia
- **Descargas:** recibos de nómina, constancia de labores

#### 5. **Evaluación de Desempeño** (performance.tsx)
- **Tablas DB:** `performance_reviews`, `performance_criteria`, `review_feedback`
- **Campos:** empleado evaluado, evaluador, período, calificación (1-5), comentarios
- **Acciones:** crear evaluaciones, registrar feedback 360°, ver histórico

---

## FASE 3: Motor de Cálculo de Nómina (Avanzado + Reglas Complejas)

### Arquitectura:
**PL/pgSQL para cálculo base + TypeScript para orquestación**

Función principal: `calculate_payslip_amounts(_payslip_id)`

### Lógica de cálculo:

```
PARA CADA LÍNEA DE PAYSLIP:
  1. Resolver fórmula del concepto (ej: "contract.base_salary")
  2. Aplicar parámetros (ej: "parameter.deduction_rate")
  3. Aplicar reglas contextuales:
     - Antigüedad: si años_servicio > 5 → bonificación +5%
     - Departamento: si dept = "Admin" → descuento de -2%
     - Estado de contrato: si fecha_fin próxima → ajustes
  4. Redondear según moneda
  5. Acumular a totales (gross, deductions, net)
  6. Registrar auditoría del cálculo
```

### Implementación:

**Archivo nuevo:** `src/lib/payroll-engine.ts`
- Función: `calculatePayslipAmounts(payslipId, options?)`
- Valida que el payslip esté en estado "draft"
- Llama a RPC `calculate_payslip_amounts` en Supabase
- Retorna resumen de cálculo (gross, deductions, net, detalles por concepto)

**Archivo nuevo:** `supabase/migrations/202607XX_payroll_calculation_engine.sql`
- Función PL/pgSQL: `calculate_payslip_amounts(_payslip_id uuid)`
- Itera conceptos, resuelve fórmulas, aplica reglas
- Actualiza `payslip_line_items` con montos calculados
- Retorna JSON con resumen

**UI:** En `payroll.payslips.tsx`:
- Botón "Calcular" en cada payslip en estado "draft"
- Modal de confirmación mostrando estimación del cálculo
- Opción de "Recalcular" si hay cambios en parámetros

### Reglas de negocio complejas a implementar:
- **Antigüedad:** años desde `hire_date` afectan bonificación
- **Departamento:** cada departamento tiene ajustes salariales específicos
- **Estado de contrato:** contratos próximos a vencer aplican descuentos
- **Ausencias:** días de ausencia reducen percepciones
- **Horas extras:** cálculo especial si existe `overtime_hours`

---

## FASE 4: Motor de Vacaciones con Simulated Annealing

### Arquitectura:
**TypeScript + Optimización local**

### Algoritmo:
1. **Entrada:** lista de empleados, período, restricciones (max X/semana, blackout dates)
2. **Generación inicial:** asignar aleatoriamente respetando restricciones
3. **Simulated annealing:** iterar mejorando asignación según criterios:
   - Maximizar preferencias del empleado (fechas solicitadas)
   - Minimizar conflictos (no más de X personas ausentes por semana)
   - Balancear distribución (todos toman vacaciones)
4. **Salida:** tabla de asignaciones optimizadas

### Implementación:

**Archivo nuevo:** `src/lib/leave-scheduler-engine.ts`
- Función: `optimizeLeaveSchedule(employees, period, constraints)`
- Simulated annealing con cooling schedule configurable
- Retorna asignaciones con score de optimización

**Actualización:** `leave.scheduler.tsx`
- Input: seleccionar período, cargar solicitudes de leave_requests
- Botón: "Ejecutar optimización"
- Output: tabla interactiva con asignaciones, opción de ajustes manuales
- Guardar: crear registros en tabla `leave_assignments` (nueva tabla en migración)

**Nueva tabla en DB:**
```sql
CREATE TABLE leave_assignments (
  id uuid PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  assigned_start date NOT NULL,
  assigned_end date NOT NULL,
  optimization_score float,
  manual_override boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## FASE 5: Estructurar Migraciones de BD Nuevas

### Nuevas migraciones a crear:

1. **`202607XX_reclutamiento_tablas.sql`**
   - `job_postings` (id, title, description, status, created_date, closed_date)
   - `job_applicants` (id, job_id, name, email, phone, status, applied_at, resume_url)
   - `recruitment_stages` (id, name, order, default_duration_days)

2. **`202607XX_beneficios_tablas.sql`**
   - `benefit_types` (id, name, category, description, active)
   - `benefit_policies` (id, type_id, employee_cost, employer_cost, coverage_description)
   - `employee_benefits` (id, employee_id, benefit_type_id, effective_from, effective_to, status)

3. **`202607XX_capacitacion_tablas.sql`**
   - `training_programs` (id, name, description, instructor, start_date, end_date, cost, max_participants)
   - `training_enrollment` (id, program_id, employee_id, enrollment_date, completion_date, score)

4. **`202607XX_performance_tablas.sql`**
   - `performance_reviews` (id, employee_id, evaluator_id, period_start, period_end, overall_rating, comments)
   - `performance_criteria` (id, name, weight, description)
   - `review_feedback` (id, review_id, criterion_id, rating, notes)

5. **`202607XX_payroll_calculation_engine.sql`**
   - Función: `calculate_payslip_amounts(_payslip_id uuid)`
   - Actualiza: `payslip_line_items` con cálculos
   - Tablas: `payslip_calculation_log` (para auditoría)

6. **`202607XX_leave_assignments_tablas.sql`**
   - `leave_assignments` (asignaciones optimizadas de vacaciones)
   - RLS policies para HR/supervisores

---

## FASE 6: Orden de Implementación

### Semana 1:
1. ✓ Aplicar migración corregida de `digest()`
2. Crear migraciones 1-4 (tablas de módulos)
3. Implementar CRUDs de Reclutamiento + Beneficios (40% del trabajo)

### Semana 2:
4. Implementar CRUDs de Capacitación + Portal + Evaluación (40%)
5. Crear migraciones 5 (motor de nómina)

### Semana 3:
6. Implementar motor de cálculo de nómina en `src/lib/payroll-engine.ts` + RPC
7. Integrar en UI (`payroll.payslips.tsx`)

### Semana 4:
8. Crear migración 6 (tablas de vacaciones)
9. Implementar simulated annealing en `src/lib/leave-scheduler-engine.ts`
10. Integrar en UI (`leave.scheduler.tsx`)

---

## Archivos a modificar/crear

### Rutas (páginas React):
- `src/routes/_authenticated/recruitment.tsx` → CRUD
- `src/routes/_authenticated/benefits.tsx` → CRUD
- `src/routes/_authenticated/training.tsx` → CRUD
- `src/routes/_authenticated/self-service.tsx` → Lectura + edición básica
- `src/routes/_authenticated/performance.tsx` → CRUD
- `src/routes/_authenticated/payroll.payslips.tsx` → Agregar botón "Calcular"
- `src/routes/_authenticated/leave.scheduler.tsx` → Agregar optimización

### Librerías (lógica):
- `src/lib/payroll-engine.ts` (NUEVO)
- `src/lib/leave-scheduler-engine.ts` (NUEVO)
- `src/lib/data-hooks.ts` (extender si es necesario)

### BD (migraciones):
- `supabase/migrations/202607XX_reclutamiento_tablas.sql` (NUEVO)
- `supabase/migrations/202607XX_beneficios_tablas.sql` (NUEVO)
- `supabase/migrations/202607XX_capacitacion_tablas.sql` (NUEVO)
- `supabase/migrations/202607XX_performance_tablas.sql` (NUEVO)
- `supabase/migrations/202607XX_payroll_calculation_engine.sql` (NUEVO)
- `supabase/migrations/202607XX_leave_assignments_tablas.sql` (NUEVO)
- `supabase/migrations/20260723090000_auditable_documents_and_dev_seed_data.sql` (YA MODIFICADO)

---

## Criterios de éxito

✅ Los 5 módulos tienen CRUDs funcionales con búsqueda, crear, editar, eliminar
✅ Motor de nómina calcula automáticamente con reglas complejas
✅ Usuarios pueden recalcular nómina si hay cambios
✅ Motor de vacaciones optimiza asignaciones con simulated annealing
✅ Todos los datos tienen auditoría (audit_log)
✅ RLS se aplica correctamente (admin/hr/finance acceso)
✅ Datos de prueba generan sin errores de digest()

---

## Notas técnicas

- **Formatos de fórmulas en DB:** Usar sintaxis simple (ej: `contract.base_salary * 1.1`)
- **RLS:** Todas las nuevas tablas necesitan políticas siguiendo el patrón existente (admin/hr/finance)
- **Auditoría:** Adjuntar `audit_trigger()` a todas las tablas críticas
- **Migraciones:** Usar `IF NOT EXISTS` para evitar errores si se re-ejecutan
