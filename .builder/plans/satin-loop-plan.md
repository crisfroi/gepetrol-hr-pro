# Plan Integral: Mejora del ERP de RRHH
## Análisis y Mejora de Generación de Datos, Nóminas y Alertas

### Situación Actual
El ERP tiene:
- ✅ Estructura base: empleados, contratos, departamentos, puestos, nómina, asistencia
- ✅ Sistema de alertas iniciado (solo para anomalías de pago)
- ✅ Generación de datos simulados (SQL en migraciones)
- ❌ Nombres simulados genéricos (no reales de Guinea Ecuatorial)
- ❌ Datos de asistencia no generados en simulación (falta historial 3 meses)
- ❌ Sistema de alertas incompleto (solo pago, sin eventos de RH)
- ❌ Modificaciones de contrato sin impacto visible en alertas
- ❌ Falta trazabilidad clara de cambios operacionales

---

## Arquitectura Propuesta (enfoque ERP estándar)

### 1. Capas de Negocio Estructuradas
```
Frontend (React/TanStack)
    ↓
API / RPC Layer (Supabase)
    ↓
Domain Logic (procesos de nómina, alertas, validaciones)
    ↓
Data Layer (tablas, vistas materializadas)
```

**Por qué:** Los ERPs profesionales separan UI de lógica. Hoy todo está mezclado en migraciones y componentes.

### 2. Módulos a Mejorar (en orden de dependencia)

#### **FASE 1: Fundación - Mejora de Generación de Datos (2-3 semanas)**

**Objetivo:** Generar empleados, contratos, horarios y asistencia realistas para 3 meses.

**Cambios principales:**

1. **Base de datos de nombres (Guinea Ecuatorial)**
   - Crear tabla `reference_data.equatorial_guinea_names`:
     - `first_names` (Equatoguineanos típicos)
     - `last_names` (apellidos comunes)
     - `regions` (provincias para dirección realista)
   - Cargar con ~150 nombres y ~100 apellidos representativos
   
2. **Mejorar `generate_development_seed_data()`**
   - Reutilizar nombres de la nueva tabla en lugar de valores genéricos
   - Generar `attendance_records` para cada empleado:
     - Últimos 90 días (3 meses)
     - Con variación realista: 2-4% ausentismo, algunos permisos
     - Validar respecto a horarios asignados
   - Generar `schedule_assignments` con horarios variados (normal, turno, flexible)
   - Generar beneficios y bonificaciones realistas según puesto
   
3. **Datos de contrato más ricos**
   - Agregar campos si no existen:
     - `benefits` (JSON: seguro, jubilación, bonificación)
     - `currency` (actualizar según país)
   - Generar variación salarial por puesto (+/- 30%)
   - Generar fechas de contrato coherentes con hire_date

4. **Archivos a modificar/crear:**
   - `supabase/migrations/` - nueva migración para nombres GE y mejora del seed
   - `src/components/app/DevDataPanel.tsx` - UI puede enriquecerse opcionalmente para mostrar más detalles
   
**Salida de FASE 1:**
- Al generar datos, se crean empleados con nombres reales, contratos completos, horarios y asistencia histórica.
- Sistema de auditoría captura qué registros fueron creados para limpieza.

---

#### **FASE 2: Nóminas Robustas (3-4 semanas)**

**Objetivo:** Garantizar corridas de nómina precisas y flexibles.

**Cambios principales:**

1. **Centralizar lógica de cálculo**
   - Auditar `src/lib/payroll-engine.ts` vs. lógica en SQL
   - Crear RPC `calculate_payroll_run()` que:
     - Recibe: `run_id`, `period_start`, `period_end`
     - Calcula automáticamente sobre `payslip_line_items`
     - Valida contra parámetros, conceptos y configuración de empleado
     - Genera eventos de auditoría (`payroll_change_log`)
   
2. **Tabla de auditoría de cambios**
   - `payroll_change_log`:
     - `event_type` (created, salary_changed, employee_added, etc.)
     - `payroll_run_id`
     - `entity_id` (employee_id, contract_id, etc.)
     - `old_value`, `new_value`
     - `changed_at`, `changed_by`
   - Esto permite auditoría completa y generación de alertas

3. **Soportar ciclos flexibles**
   - Parámetro configurable en `payroll_runs`: `frequency` (monthly, biweekly, custom)
   - Validar períodos no solapados
   - Permitir corridas "abiertas" (draft → pending → approved → locked)

4. **Generación de recibos mejorada**
   - Incluir desglose claro de conceptos
   - PDF automático con firma/hash para auditoría
   - Agregar resumen de impuestos locales (si aplica GE)

5. **Archivos:**
   - `supabase/migrations/` - nueva migración para `payroll_change_log`
   - `src/server/payroll-engine.ts` - lógica centralizada (si no existe)
   - `src/routes/_authenticated/payroll.runs.tsx` - mejorar UI de corrida
   
**Salida de FASE 2:**
- Corridas de nómina determinísticas, auditables y flexibles.
- Cada cambio en empleados/contratos se registra en el log de cambios.

---

#### **FASE 3: Sistema de Alertas Integral (3-4 semanas)**

**Objetivo:** Detectar y alertar sobre eventos operacionales y de pago.

**Cambios principales:**

1. **Tabla base: `event_alerts` (generalizando `payment_alerts`)**
   - Reemplazar `payment_alerts` con tabla más amplia:
     - `alert_type` (payment_anomaly, salary_change, new_employee, absence, permission_expiry, etc.)
     - `triggered_by_entity_type` (payslip, employee, contract, attendance, etc.)
     - `entity_id`
     - `severity` (info, warning, critical)
     - `status` (pending, reviewed, dismissed, resolved)
     - `data` (JSON con contexto adicional)
     - `created_at`, `reviewed_at`, `reviewer_id`, `notes`

2. **Reglas de alerta configurables**
   - Tabla `alert_rules`:
     - `rule_type` (entity, threshold, time-based)
     - `condition` (JSON definiendo cuándo dispara)
     - `enabled`
     - `assigned_to_role`
   - Ejemplos:
     - Cambio salarial > 10% → alerta crítica
     - Nuevo empleado → alerta info
     - Ausencia > 5 días seguidos → alerta warning
     - Permiso vencimiento en 2 semanas → alerta info

3. **Triggers de disparo**
   - En FASE 2 (al calcular nómina): si `payroll_change_log` contiene cambios → generar alertas
   - En empleados: si se modifica contrato → alerta
   - En asistencia: si hay ausencia > X → alerta
   - En permisos: si vence en N días → alerta (cron/scheduler)

4. **UI de alertas**
   - Dashboard de alertas (inbox-like):
     - Filtrar por tipo, severidad, estado
     - Masivo resolver/descartar
     - Crear notas/comentarios
   - Widget en dashboard principal (últimas 5 alertas)
   - Notificaciones en tiempo real (opcional: integrar con `sonner` toast)

5. **Archivos:**
   - `supabase/migrations/` - crear `event_alerts`, `alert_rules`, deprecar `payment_alerts`
   - `src/routes/_authenticated/alerts.tsx` (nuevo o refactorizar approvals.alerts.tsx)
   - RPC `trigger_alerts_for_payroll()`, `trigger_alerts_for_contract_change()`, etc.
   
**Salida de FASE 3:**
- Sistema centralizado de alertas que captura cambios en empleados, contratos, nómina y asistencia.
- Gerentes y administradores ven qué cambios afectarán la próxima nómina.

---

#### **FASE 4: Permisos y Flujos de Cambio (2 semanas)**

**Objetivo:** Control de quién puede modificar qué y aprobaciones automáticas.

**Cambios principales:**

1. **Roles y permisos**
   - Auditar tabla `user_roles` actual
   - Definir permisos granulares:
     - `manage_employee_data` (solo admin)
     - `modify_salary` (admin, con alerta crítica)
     - `approve_salary_change` (HR manager)
     - `create_employee` (HR, con asignación de puesto)
     - `modify_schedule` (manager + HR)
   
2. **Flujo de modificación con auditoría**
   - Al cambiar salario en contrato:
     - Crear registro en `contract_change_requests` (state: draft → pending → approved → applied)
     - Generar alerta para aprobador
     - Aplicar cambio solo si aprobado
     - Registrar en `payroll_change_log`

3. **Archivos:**
   - `supabase/migrations/` - tablas de permisos y cambios
   - `src/routes/_authenticated/contracts.tsx` - agregar flujo de cambio
   
**Salida de FASE 4:**
- Control de acceso y trazabilidad completa de quién cambió qué y cuándo.

---

## Plan de Implementación Detallado

### FASE 1: Generación de Datos Realista (Referencia)
1. Crear tabla `reference_data.equatorial_guinea_names` con nombres locales
2. Refactorizar `generate_development_seed_data()` para:
   - Usar nombres reales
   - Generar asistencia (3 meses)
   - Generar horarios variados
3. Agregar campos a contratos (beneficios, bonificaciones)
4. Prueba: generar 50 empleados, validar coherencia

### FASE 2: Nóminas (Referencia)
1. Crear `payroll_change_log` y RPC de cálculo
2. Refactorizar pantalla de corridas (estado, detalles)
3. Validar con datos FASE 1

### FASE 3: Alertas (Referencia)
1. Crear `event_alerts` y `alert_rules`
2. Implementar triggers al calcular nómina y al modificar contratos
3. Nueva UI de alertas
4. Prueba de flujo: cambiar salario → vea alerta en siguiente corrida

### FASE 4: Permisos
1. Auditar permisos actuales
2. Agregar flujo de cambio con aprobación
3. Completar cadena de auditoría

---

## Tecnología y Stack

- **Frontend:** React 19, TanStack Router, Zod validación, Radix UI, Recharts (gráficos)
- **Backend:** Supabase (PostgreSQL), RPCs, funciones SQL
- **Auditoría:** Hash de documentos (existente), logs de cambio (nuevo)
- **Alertas:** Tabla de eventos, reglas JSON, UI React

---

## Riesgos y Consideraciones

1. **Riesgo:** Lógica esparcida en migraciones y frontend → **Mitigación:** centralizar en RPCs desde el inicio de FASE 2
2. **Riesgo:** Performance en tablas grandes (asistencia histórica) → **Mitigación:** índices en `(employee_id, date)`, vistas materializadas
3. **Riesgo:** Cambios salariales retroactivos en nómina ya pagada → **Mitigación:** validar en RPC, documentar claramente en cambio
4. **Riesgo:** Saturación de alertas → **Mitigación:** permitir desactivar/agrupar reglas, prioridad por severidad

---

## Métricas de Éxito

✅ Generación de datos con nombres reales y 3 meses de asistencia  
✅ Corridas de nómina sin errores de cálculo  
✅ Alertas visibles antes de cada corrida  
✅ Auditoría 100% de cambios operacionales  
✅ Permisos bien definidos y flujos claros  

---

## Próximos Pasos Después del Plan

1. Usuario aprueba plan
2. Iniciar FASE 1: nombres y datos
3. Revisar con usuario antes de FASE 2
4. Desplegar incrementalmente
