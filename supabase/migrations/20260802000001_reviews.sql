-- Guest reviews / testimonials
-- Managed by admin/manager, displayed on public site

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  guest_name  text not null,
  unit_id     uuid references units(id),
  rating      smallint not null check (rating between 1 and 5),
  body        text not null,
  source      text default 'direct',
  stay_date   date,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_reviews_published on reviews (published, created_at desc);
