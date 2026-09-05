-- Guest CRM enhancements: tags, preferences, source tracking

alter table guests add column if not exists tags text[] not null default '{}';
alter table guests add column if not exists preferences text;
alter table guests add column if not exists source text;
alter table guests add column if not exists updated_at timestamptz not null default now();

create index if not exists guests_tags_idx on guests using gin (tags);
