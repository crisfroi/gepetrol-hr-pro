-- Reconciliation migration for the live GEPETROL HR database.
-- It intentionally does not alter historic migration files or migration history.
-- Apply only after validating the catalog on a Supabase preview branch.

create extension if not exists pgcrypto;

alter table public.employment_contracts add column if not exists schedule_type text;
alter table public.employment_contracts add column if not exists weekly_hours numeric(5,2) not null default 40;
alter table public.employees add column if not exists bank_account_updated_at timestamptz;

-- Operational audit and alerting ------------------------------------------------
create table if not exists public.payroll_change_log (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid references public.payroll_runs(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists payroll_change_log_run_idx on public.payroll_change_log(payroll_run_id, changed_at desc);
create index if not exists payroll_change_log_employee_idx on public.payroll_change_log(employee_id, changed_at desc);
create index if not exists payroll_change_log_changed_by_idx on public.payroll_change_log(changed_by);

create table if not exists public.event_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'resolved')),
  title text not null,
  description text,
  triggered_by_entity_type text,
  triggered_by_entity_id uuid,
  data jsonb not null default '{}'::jsonb,
  assigned_to_role public.app_role,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_alerts_status_idx on public.event_alerts(status, severity, created_at desc);
create index if not exists event_alerts_entity_idx on public.event_alerts(triggered_by_entity_type, triggered_by_entity_id);
create index if not exists event_alerts_reviewed_by_idx on public.event_alerts(reviewed_by);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  rule_type text not null check (rule_type in ('entity_change', 'threshold', 'time_based', 'schedule')),
  conditions jsonb not null default '{}'::jsonb,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  assigned_to_role public.app_role,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.alert_rules (code, name, rule_type, conditions, severity, assigned_to_role)
values
  ('certification_expiry_60', 'Certificación vence en 60 días', 'time_based', '{"days_before":60}'::jsonb, 'warning', 'hr'),
  ('contract_expiry_30', 'Contrato vence en 30 días', 'time_based', '{"days_before":30}'::jsonb, 'warning', 'hr'),
  ('absence_threshold', 'Ausencia supera el umbral', 'threshold', '{"days":5}'::jsonb, 'warning', 'hr')
on conflict (code) do nothing;

-- Employee self-service ---------------------------------------------------------
create table if not exists public.payslip_downloads (
  id uuid primary key default gen_random_uuid(),
  payslip_id uuid not null references public.payslips(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  downloaded_by uuid not null references auth.users(id) on delete restrict,
  unique (payslip_id, downloaded_by)
);
create index if not exists payslip_downloads_employee_idx on public.payslip_downloads(employee_id, downloaded_at desc);

create table if not exists public.leave_request_comments (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists leave_request_comments_request_idx on public.leave_request_comments(leave_request_id, created_at);
create index if not exists leave_request_comments_author_idx on public.leave_request_comments(author_id);

-- Shared calendar and administratively-managed presence ------------------------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null default 'meeting' check (event_type in ('meeting', 'holiday', 'birthday', 'training', 'company_event', 'other')),
  start_time timestamptz not null,
  end_time timestamptz,
  location text,
  department_id uuid references public.departments(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or end_time >= start_time)
);

create index if not exists calendar_events_start_idx on public.calendar_events(start_time);
create index if not exists calendar_events_department_idx on public.calendar_events(department_id);
create index if not exists calendar_events_created_by_idx on public.calendar_events(created_by);

create table if not exists public.calendar_event_attendees (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  response text not null default 'pending' check (response in ('pending', 'accepted', 'declined')),
  primary key (event_id, employee_id)
);
create index if not exists calendar_event_attendees_employee_idx on public.calendar_event_attendees(employee_id);

create table if not exists public.employee_presence (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  presence_date date not null default current_date,
  status text not null check (status in ('in_office', 'remote', 'on_leave', 'off')),
  location text,
  notes text,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, presence_date)
);
create index if not exists employee_presence_recorded_by_idx on public.employee_presence(recorded_by);

create table if not exists public.absence_policies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  absence_days_threshold integer not null default 5 check (absence_days_threshold > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Onboarding, assets and mandatory Oil & Gas compliance -------------------------
create table if not exists public.onboarding_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.onboarding_templates(id) on delete cascade,
  title text not null,
  description text,
  responsible_role public.app_role not null default 'hr',
  due_days_after_hire integer not null default 0 check (due_days_after_hire >= 0),
  required boolean not null default true,
  sort_order integer not null default 0
);
create index if not exists onboarding_tasks_template_idx on public.onboarding_tasks(template_id, sort_order);

create table if not exists public.employee_onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  onboarding_task_id uuid not null references public.onboarding_tasks(id) on delete cascade,
  state text not null default 'pending' check (state in ('pending', 'in_progress', 'completed', 'waived')),
  due_date date,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  evidence_url text,
  notes text,
  unique (employee_id, onboarding_task_id)
);
create index if not exists employee_onboarding_tasks_employee_idx on public.employee_onboarding_tasks(employee_id, state);
create index if not exists employee_onboarding_tasks_task_idx on public.employee_onboarding_tasks(onboarding_task_id);

create table if not exists public.compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  validity_months integer check (validity_months is null or validity_months > 0),
  required_for_roles boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_certifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  requirement_id uuid not null references public.compliance_requirements(id) on delete restrict,
  certificate_number text,
  issued_at date,
  expires_at date,
  evidence_url text,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  state text not null default 'pending' check (state in ('pending', 'valid', 'expired', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or issued_at is null or expires_at >= issued_at),
  unique (employee_id, requirement_id)
);

create index if not exists employee_certifications_expiry_idx on public.employee_certifications(expires_at) where state = 'valid';
create index if not exists employee_certifications_requirement_idx on public.employee_certifications(requirement_id);
create index if not exists employee_certifications_verified_by_idx on public.employee_certifications(verified_by);

create table if not exists public.employee_assets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  asset_tag text not null unique,
  asset_type text not null,
  assigned_at date not null default current_date,
  returned_at date,
  condition_notes text,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (returned_at is null or returned_at >= assigned_at)
);
create index if not exists employee_assets_employee_idx on public.employee_assets(employee_id);
create index if not exists employee_assets_assigned_by_idx on public.employee_assets(assigned_by);

-- Work entries are the payroll simulation input. They are never payment instructions.
create table if not exists public.work_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  entry_date date not null,
  entry_type text not null check (entry_type in ('attendance', 'leave', 'training', 'holiday', 'absence', 'manual_adjustment')),
  hours numeric(6,2) not null default 0 check (hours >= 0 and hours <= 24),
  source_table text,
  source_id uuid,
  state text not null default 'validated' check (state in ('draft', 'validated', 'conflict', 'locked')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, entry_date, entry_type, source_id)
);

create index if not exists work_entries_employee_period_idx on public.work_entries(employee_id, entry_date);
create index if not exists work_entries_created_by_idx on public.work_entries(created_by);

-- Generic updated_at trigger for tables introduced by this reconciliation.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'event_alerts', 'alert_rules', 'calendar_events', 'employee_presence', 'absence_policies',
    'onboarding_templates', 'compliance_requirements', 'employee_certifications', 'employee_assets', 'work_entries'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'trg_' || table_name || '_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row execute function public.update_updated_at_column()', 'trg_' || table_name || '_updated_at', table_name);
  end loop;
end $$;

-- RLS and table access -----------------------------------------------------------
alter table public.payroll_change_log enable row level security;
alter table public.event_alerts enable row level security;
alter table public.alert_rules enable row level security;
alter table public.payslip_downloads enable row level security;
alter table public.leave_request_comments enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_event_attendees enable row level security;
alter table public.employee_presence enable row level security;
alter table public.absence_policies enable row level security;
alter table public.onboarding_templates enable row level security;
alter table public.onboarding_tasks enable row level security;
alter table public.employee_onboarding_tasks enable row level security;
alter table public.compliance_requirements enable row level security;
alter table public.employee_certifications enable row level security;
alter table public.employee_assets enable row level security;
alter table public.work_entries enable row level security;

grant select on public.payroll_change_log to authenticated;
grant select, insert, update on public.event_alerts to authenticated;
grant select, insert, update, delete on public.alert_rules to authenticated;
grant select, insert on public.payslip_downloads, public.leave_request_comments to authenticated;
grant select, insert, update, delete on public.calendar_events, public.employee_presence,
  public.absence_policies, public.onboarding_templates, public.onboarding_tasks,
  public.employee_onboarding_tasks, public.compliance_requirements, public.employee_certifications,
  public.employee_assets, public.work_entries to authenticated;
grant select on public.calendar_event_attendees to authenticated;

create policy "payroll change log scoped read" on public.payroll_change_log for select to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'finance')
);
create policy "alerts scoped read" on public.event_alerts for select to authenticated using (
  assigned_to_role is null or public.has_role((select auth.uid()), assigned_to_role) or public.has_role((select auth.uid()), 'admin')
);
create policy "alerts scoped update" on public.event_alerts for update to authenticated using (
  assigned_to_role is null or public.has_role((select auth.uid()), assigned_to_role) or public.has_role((select auth.uid()), 'admin')
) with check (
  assigned_to_role is null or public.has_role((select auth.uid()), assigned_to_role) or public.has_role((select auth.uid()), 'admin')
);
create policy "alerts staff insert" on public.event_alerts for insert to authenticated with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'finance')
);
create policy "alert rules admin hr manage" on public.alert_rules for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "payslip downloads own or staff" on public.payslip_downloads for select to authenticated using (
  employee_id = public.current_employee_id() or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'finance')
);
create policy "payslip downloads self insert" on public.payslip_downloads for insert to authenticated with check (
  employee_id = public.current_employee_id() and downloaded_by = (select auth.uid())
);
create policy "leave comments scoped read" on public.leave_request_comments for select to authenticated using (
  exists (select 1 from public.leave_requests r where r.id = leave_request_id and r.employee_id = public.current_employee_id())
  or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'supervisor')
);
create policy "leave comments scoped insert" on public.leave_request_comments for insert to authenticated with check (
  author_id = (select auth.uid()) and (
    exists (select 1 from public.leave_requests r where r.id = leave_request_id and r.employee_id = public.current_employee_id())
    or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'supervisor')
  )
);
create policy "calendar read authenticated" on public.calendar_events for select to authenticated using (true);
create policy "calendar manage staff" on public.calendar_events for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'supervisor')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'supervisor')
);
create policy "calendar attendees own or staff" on public.calendar_event_attendees for select to authenticated using (
  employee_id = public.current_employee_id() or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'supervisor')
);
create policy "presence scoped read" on public.employee_presence for select to authenticated using (
  employee_id = public.current_employee_id() or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'supervisor')
);
create policy "presence administrative manage" on public.employee_presence for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'supervisor')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'supervisor')
);
create policy "absence policies hr admin manage" on public.absence_policies for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "onboarding templates hr admin manage" on public.onboarding_templates for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "onboarding tasks hr admin manage" on public.onboarding_tasks for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "employee onboarding scoped read" on public.employee_onboarding_tasks for select to authenticated using (
  employee_id = public.current_employee_id() or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "employee onboarding staff manage" on public.employee_onboarding_tasks for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "compliance requirements hr admin manage" on public.compliance_requirements for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "certifications scoped read" on public.employee_certifications for select to authenticated using (
  employee_id = public.current_employee_id() or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'supervisor')
);
create policy "certifications hr admin manage" on public.employee_certifications for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "assets scoped read" on public.employee_assets for select to authenticated using (
  employee_id = public.current_employee_id() or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "assets hr admin manage" on public.employee_assets for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);
create policy "work entries scoped read" on public.work_entries for select to authenticated using (
  employee_id = public.current_employee_id() or public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr') or public.has_role((select auth.uid()), 'finance')
);
create policy "work entries hr admin manage" on public.work_entries for all to authenticated using (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
) with check (
  public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')
);

-- Public employee portal contracts. SECURITY INVOKER keeps RLS in force.
create or replace function public.get_employee_payslips(_limit integer default 24, _offset integer default 0)
returns table (payslip_id uuid, period_start date, period_end date, pay_date date, currency text, gross numeric, net numeric, pdf_url text)
language sql stable security invoker set search_path = public, pg_temp
as $$
  select p.id, r.period_start, r.period_end, r.pay_date, p.currency, p.gross, p.net, p.pdf_url
  from public.payslips p
  join public.payroll_runs r on r.id = p.run_id
  join public.employees e on e.id = p.employee_id
  where e.user_id = auth.uid()
  order by r.period_end desc, p.created_at desc
  limit greatest(1, least(coalesce(_limit, 24), 100))
  offset greatest(coalesce(_offset, 0), 0);
$$;

create or replace function public.get_employee_leave_balance()
returns table (balance numeric, used numeric, pending numeric, expires_at date)
language sql stable security invoker set search_path = public, pg_temp
as $$
  select coalesce(sum(b.accrued_days + b.carryover_days - b.used_days - b.pending_days), 0)::numeric,
         coalesce(sum(b.used_days), 0)::numeric,
         coalesce(sum(b.pending_days), 0)::numeric,
         null::date
  from public.leave_balances b
  join public.employees e on e.id = b.employee_id
  where e.user_id = auth.uid() and b.period_year = extract(year from current_date)::integer;
$$;

create or replace function public.record_payslip_download(_payslip_id uuid)
returns void language plpgsql security invoker set search_path = public, pg_temp
as $$
declare v_employee_id uuid;
begin
  select id into v_employee_id from public.employees where user_id = auth.uid();
  if v_employee_id is null then raise exception 'Employee profile not linked'; end if;
  if not exists (select 1 from public.payslips where id = _payslip_id and employee_id = v_employee_id) then
    raise exception 'Payslip not found';
  end if;
  insert into public.payslip_downloads(payslip_id, employee_id, downloaded_by)
  values (_payslip_id, v_employee_id, auth.uid())
  on conflict (payslip_id, downloaded_by) do update set downloaded_at = now();
end;
$$;

create or replace function public.update_employee_personal_data(_address jsonb, _phone text, _bank_account jsonb default null, _emergency_contact jsonb default null)
returns public.employees language plpgsql security invoker set search_path = public, pg_temp
as $$
declare v_employee public.employees;
begin
  update public.employees
     set address = _address,
         phone = nullif(trim(_phone), ''),
         bank_account = _bank_account,
         bank_account_updated_at = case when _bank_account is distinct from bank_account then now() else bank_account_updated_at end,
         emergency_contact = _emergency_contact,
         updated_at = now()
   where user_id = auth.uid()
   returning * into v_employee;
  if v_employee is null then raise exception 'Employee profile not linked'; end if;
  return v_employee;
end;
$$;

create or replace function public.request_leave_from_portal(_leave_type text, _start_date date, _end_date date, _reason text default null)
returns public.leave_requests language plpgsql security invoker set search_path = public, pg_temp
as $$
declare v_employee_id uuid; v_type_id uuid; v_request public.leave_requests; v_days integer;
begin
  if _start_date is null or _end_date is null or _end_date < _start_date then raise exception 'Invalid leave dates'; end if;
  select id into v_employee_id from public.employees where user_id = auth.uid();
  select id into v_type_id from public.leave_types where active and (code = _leave_type or name = _leave_type) limit 1;
  if v_employee_id is null or v_type_id is null then raise exception 'Employee or leave type not found'; end if;
  if exists (select 1 from public.leave_requests where employee_id = v_employee_id and status in ('submitted', 'approved') and daterange(start_date, end_date, '[]') && daterange(_start_date, _end_date, '[]')) then
    raise exception 'Leave request overlaps an active request';
  end if;
  v_days := (_end_date - _start_date) + 1;
  insert into public.leave_requests(employee_id, leave_type_id, start_date, end_date, days_requested, reason, status)
  values (v_employee_id, v_type_id, _start_date, _end_date, v_days, nullif(trim(_reason), ''), 'submitted')
  returning * into v_request;
  return v_request;
end;
$$;

create or replace function public.get_team_presence(_department_id uuid default null)
returns table (employee_id uuid, first_name text, last_name text, presence_status text, is_on_leave boolean, leave_type text, position text, department text, location text)
language sql stable security invoker set search_path = public, pg_temp
as $$
  select e.id, e.first_name, e.last_name, coalesce(p.status, 'off'),
         exists (select 1 from public.leave_requests lr where lr.employee_id = e.id and lr.status = 'approved' and current_date between lr.start_date and lr.end_date),
         (select lt.name from public.leave_requests lr join public.leave_types lt on lt.id = lr.leave_type_id where lr.employee_id = e.id and lr.status = 'approved' and current_date between lr.start_date and lr.end_date limit 1),
         pos.title, d.name, p.location
  from public.employees e
  left join public.employee_presence p on p.employee_id = e.id and p.presence_date = current_date
  left join public.positions pos on pos.id = e.position_id
  left join public.departments d on d.id = e.department_id
  where e.status = 'active' and (_department_id is null or e.department_id = _department_id);
$$;

create or replace function public.get_milestones_this_month()
returns table (employee_id uuid, first_name text, last_name text, event_type text, date_of_event date, days_until_event integer)
language sql stable security invoker set search_path = public, pg_temp
as $$
  with days as (select generate_series(current_date, (date_trunc('month', current_date) + interval '1 month - 1 day')::date, interval '1 day')::date as day)
  select e.id, e.first_name, e.last_name, 'birthday', d.day, (d.day - current_date)::integer
  from public.employees e cross join days d
  where e.status = 'active' and e.birth_date is not null and extract(month from e.birth_date) = extract(month from d.day) and extract(day from e.birth_date) = extract(day from d.day)
  union all
  select e.id, e.first_name, e.last_name, 'anniversary', d.day, (d.day - current_date)::integer
  from public.employees e cross join days d
  where e.status = 'active' and extract(month from e.hire_date) = extract(month from d.day) and extract(day from e.hire_date) = extract(day from d.day)
  order by date_of_event, first_name;
$$;

create or replace function public.rebuild_work_entries(_period_start date, _period_end date)
returns void language plpgsql security invoker set search_path = public, pg_temp
as $$
begin
  if not (public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'hr')) then
    raise exception 'Insufficient privileges to rebuild work entries';
  end if;
  if _period_start is null or _period_end is null or _period_end < _period_start then
    raise exception 'Invalid payroll period';
  end if;

  delete from public.work_entries
  where entry_date between _period_start and _period_end
    and entry_type in ('attendance', 'leave')
    and state <> 'locked';

  insert into public.work_entries(employee_id, entry_date, entry_type, hours, source_table, source_id, state, created_by)
  select a.employee_id, a.work_date, 'attendance',
         case when a.check_in is not null and a.check_out is not null then round((extract(epoch from (a.check_out - a.check_in)) / 3600)::numeric, 2) else 0 end,
         'attendance_records', a.id, 'validated', auth.uid()
  from public.attendance_records a
  where a.work_date between _period_start and _period_end;

  insert into public.work_entries(employee_id, entry_date, entry_type, hours, source_table, source_id, state, created_by)
  select lr.employee_id, days.day, 'leave', 8, 'leave_requests', lr.id, 'validated', auth.uid()
  from public.leave_requests lr
  cross join lateral generate_series(greatest(lr.start_date, _period_start), least(lr.end_date, _period_end), interval '1 day') as days(day)
  where lr.status = 'approved' and lr.end_date >= _period_start and lr.start_date <= _period_end;
end;
$$;

grant execute on function public.get_employee_payslips(integer, integer), public.get_employee_leave_balance(),
  public.record_payslip_download(uuid), public.update_employee_personal_data(jsonb, text, jsonb, jsonb),
  public.request_leave_from_portal(text, date, date, text), public.get_team_presence(uuid), public.get_milestones_this_month(),
  public.rebuild_work_entries(date, date) to authenticated;
revoke all on function public.get_employee_payslips(integer, integer), public.get_employee_leave_balance(),
  public.record_payslip_download(uuid), public.update_employee_personal_data(jsonb, text, jsonb, jsonb),
  public.request_leave_from_portal(text, date, date, text), public.get_team_presence(uuid), public.get_milestones_this_month(),
  public.rebuild_work_entries(date, date) from public, anon;

-- Existing public SECURITY DEFINER functions must never be callable anonymously.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef loop
    execute format('revoke all on function %s from public, anon', f.signature);
  end loop;
end $$;

alter function public.calculate_payslip_amounts(uuid) set search_path = public, pg_temp;
