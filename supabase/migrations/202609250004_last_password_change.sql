-- Migration: track when a user's password was last changed.
-- Stamped by the app (adminApi.updateUserPassword) when an admin resets a
-- password; NULL means never changed since this column was added.

alter table public.users add column if not exists last_password_change timestamptz;

comment on column public.users.last_password_change is
  'When the password was last changed by an admin reset; NULL = never';
