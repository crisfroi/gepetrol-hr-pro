# Migration Fixes - Defensive SQL Applied

## Errores Encontrados y Corregidos

### Error 1: Performance Migration
```
ERROR: 42703: column "year" does not exist
```

**Causa**: La tabla `performance_cycles` ya existía pero sin la columna `year`.

**Solución Aplicada**:
```sql
-- 1. Crear tabla (IF NOT EXISTS para no fallar si existe)
CREATE TABLE IF NOT EXISTS performance_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL,
  cycle_type varchar NOT NULL DEFAULT 'annual',
  start_date date,
  end_date date,
  status varchar DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Agregar columna si no existe
ALTER TABLE performance_cycles ADD COLUMN IF NOT EXISTS year integer;
```

### Error 2: Training Migration
```
ERROR: 42710: trigger "audit_training_completion" for relation "training_completion" already exists
```

**Causa**: El trigger ya existía en la tabla.

**Solución Aplicada**:
```sql
-- Usar DO block para drop and create de forma segura
DO $$
BEGIN
  DROP TRIGGER IF EXISTS audit_training_completion ON training_completion;
  CREATE TRIGGER audit_training_completion 
  AFTER INSERT OR UPDATE OR DELETE ON training_completion
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
END $$;
```

---

## Migraciones Actualizadas

### `20260723120300_performance_module.sql`

**Cambios Defensivos Aplicados**:

1. ✅ **Crear tabla con IF NOT EXISTS**:
   - `CREATE TABLE IF NOT EXISTS performance_cycles`
   - `CREATE TABLE IF NOT EXISTS performance_criteria`
   - `CREATE TABLE IF NOT EXISTS review_feedback`
   - `CREATE TABLE IF NOT EXISTS performance_review_360`

2. ✅ **Agregar columnas que falten**:
   - `ALTER TABLE performance_cycles ADD COLUMN IF NOT EXISTS year integer`

3. ✅ **Triggers seguros**:
   ```sql
   DO $$
   BEGIN
     DROP TRIGGER IF EXISTS audit_performance_cycles ON performance_cycles;
     CREATE TRIGGER audit_performance_cycles ...
   END $$;
   ```

4. ✅ **Políticas RLS seguras**:
   ```sql
   DO $$
   BEGIN
     DROP POLICY IF EXISTS "hr_admin_read_cycles" ON performance_cycles;
   END $$;
   CREATE POLICY "hr_admin_read_cycles" ...
   ```

---

### `20260723120200_training_module.sql`

**Cambios Defensivos Aplicados**:

1. ✅ **Tabla con IF NOT EXISTS**:
   - `CREATE TABLE IF NOT EXISTS training_completion`

2. ✅ **Trigger seguro**:
   ```sql
   DO $$
   BEGIN
     DROP TRIGGER IF EXISTS audit_training_completion ON training_completion;
     CREATE TRIGGER audit_training_completion ...
   END $$;
   ```

3. ✅ **Políticas RLS seguras**:
   ```sql
   DO $$
   BEGIN
     DROP POLICY IF EXISTS "users_see_own_completion" ON training_completion;
   END $$;
   ```

---

## Patrón de Migración Defensiva Aplicado

Para futuras migraciones, usar este patrón:

```sql
-- 1. Crear tabla si no existe
CREATE TABLE IF NOT EXISTS table_name (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- 2. Agregar columnas si no existen
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name type;

-- 3. Habilitar RLS si no está habilitado
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 4. Políticas seguras con DROP
DO $$
BEGIN
  DROP POLICY IF EXISTS "policy_name" ON table_name;
  CREATE POLICY "policy_name" ON table_name ...
END $$;

-- 5. Triggers seguros con DROP
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_name ON table_name;
  CREATE TRIGGER trigger_name AFTER INSERT OR UPDATE OR DELETE ON table_name ...
END $$;

-- 6. Índices con IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);
```

---

## Resultado

✅ Todas las migraciones ahora son **idempotentes** - pueden ejecutarse múltiples veces sin error
✅ Seguro contra tablas que ya existen
✅ Seguro contra triggers duplicados
✅ Seguro contra políticas duplicadas
✅ Seguro contra columnas duplicadas

---

## Próximo Despliegue

Las migraciones están listas para desplegar:

1. `20260723120000_fix_digest_and_recruitment.sql` ✅
2. `20260723120100_benefits_module.sql` ✅
3. `20260723120200_training_module.sql` ✅ (corregida)
4. `20260723120300_performance_module.sql` ✅ (corregida)
5. `20260723120400_payroll_engine_and_leave.sql` ✅ (corregida)

**Estado**: Listas para aplicar sin conflictos ✅
