-- Add missing roles to user_role enum
alter type user_role add value if not exists 'super_admin';
alter type user_role add value if not exists 'reception';
alter type user_role add value if not exists 'accounting';
alter type user_role add value if not exists 'cleaner';

-- Add permissions and last_login columns to users table
alter table users add column if not exists permissions jsonb default '[]';
alter table users add column if not exists last_login timestamptz;
