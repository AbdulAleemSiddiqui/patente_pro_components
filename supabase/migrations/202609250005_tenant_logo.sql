-- Migration: tenant logo uploaded from the Settings page.
-- Stored as a data URL (PNG, aspect ratio preserved, max 512px edge) so it
-- needs no storage bucket; the app also wraps it into an .ico favicon.

alter table public.tenants add column if not exists logo_url text;

comment on column public.tenants.logo_url is
  'School logo as a PNG data URL (uncropped, max 512px); NULL = default car icon';
