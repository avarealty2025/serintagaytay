-- Add view column to units table for editable unit view labels.
alter table units add column if not exists view text;
