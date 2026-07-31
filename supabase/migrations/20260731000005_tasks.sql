-- 0005_tasks.sql
-- Staff tasks and templates.
--
-- Tasks are generated automatically from booking events (spec 3.6). If anyone
-- has to create them by hand, the feature has failed.

-- ---------------------------------------------------------------------------
-- task_templates
-- ---------------------------------------------------------------------------
-- Admin-editable checklists per task type. `trigger` decides which booking
-- event spawns the task; a template with a null trigger is manual-only.

create table task_templates (
  id                  uuid primary key default gen_random_uuid(),
  type                task_type not null,
  title               text not null,
  description         text,
  checklist           jsonb not null default '[]'::jsonb,
  trigger             task_trigger,
  -- Offset from the triggering event, e.g. turnover due 3h after checkout.
  due_offset_minutes  integer not null default 0,
  requires_photo      boolean not null default false,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- At most one active auto-generating template per (type, trigger), otherwise a
-- single checkout would spawn duplicate tasks.
create unique index task_templates_active_trigger_unique
  on task_templates (type, trigger)
  where active and trigger is not null;

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
-- checklist shape: [{ "label": "Linens", "done": false, "done_at": null }, ...]
--
-- Two completion gates are enforced in application code, not here, because
-- both depend on rows in other tables:
--   * housekeeping tasks require at least one photo (spec 3.6)
--   * caretaker arrival tasks require the balance collected or waived (3.5)
-- The photo gate IS expressible as a check constraint and is written below;
-- the balance gate is not, since it reads bookings.

create table tasks (
  id             uuid primary key default gen_random_uuid(),
  unit_id        uuid not null references units (id),
  booking_id     uuid references bookings (id) on delete set null,
  template_id    uuid references task_templates (id) on delete set null,
  type           task_type not null,
  title          text not null,
  description    text,
  assignee_id    uuid references users (id),
  status         task_status not null default 'todo',
  priority       smallint not null default 3,        -- 1 highest .. 5 lowest
  due_at         timestamptz,
  started_at     timestamptz,
  completed_at   timestamptz,
  completed_by   uuid references users (id),
  checklist      jsonb not null default '[]'::jsonb,
  photos         text[] not null default '{}',
  requires_photo boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  constraint tasks_priority_range check (priority between 1 and 5),
  constraint tasks_done_has_timestamp check (
    (status = 'done') = (completed_at is not null)
  ),
  -- Photo proof is what lets the owner verify remotely instead of phoning.
  constraint tasks_done_has_photo check (
    status <> 'done' or not requires_photo or array_length(photos, 1) >= 1
  )
);

-- The housekeeper's and caretaker's own screen: my open tasks, soonest first.
create index tasks_assignee_open_idx
  on tasks (assignee_id, due_at)
  where status <> 'done' and deleted_at is null;

-- Today view + overdue notification sweep.
create index tasks_due_idx
  on tasks (due_at)
  where status <> 'done' and deleted_at is null;

create index tasks_unit_idx    on tasks (unit_id)    where deleted_at is null;
create index tasks_booking_idx on tasks (booking_id) where deleted_at is null;

-- One auto-generated task per booking per template. Makes generation
-- idempotent, so replaying a booking event cannot duplicate the task.
create unique index tasks_booking_template_unique
  on tasks (booking_id, template_id)
  where booking_id is not null and template_id is not null and deleted_at is null;

-- ---------------------------------------------------------------------------
-- maintenance_tickets
-- ---------------------------------------------------------------------------
-- Any staff member can raise one against a unit with photo and severity.
-- Kept separate from tasks: a ticket is a report that may outlive several
-- assignments, and it has its own severity and open/closed lifecycle.

create table maintenance_tickets (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references units (id),
  raised_by    uuid not null references users (id),
  title        text not null,
  description  text,
  severity     smallint not null default 3,          -- 1 urgent .. 5 cosmetic
  photos       text[] not null default '{}',
  task_id      uuid references tasks (id) on delete set null,
  closed       boolean not null default false,
  closed_by    uuid references users (id),
  closed_at    timestamptz,
  created_at   timestamptz not null default now(),

  constraint maintenance_severity_range check (severity between 1 and 5),
  constraint maintenance_closed_has_timestamp check (closed = (closed_at is not null))
);

create index maintenance_open_idx
  on maintenance_tickets (unit_id, severity)
  where not closed;
