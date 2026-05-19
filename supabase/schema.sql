-- ============================================================
-- HabadLyon — Supabase schema
-- Colle ce SQL dans l'éditeur SQL de ton projet Supabase
-- ============================================================

-- Table des utilisateurs
create table if not exists hl_users (
  id           uuid primary key default gen_random_uuid(),
  email        text unique not null,
  password_hash text not null,
  first_name   text not null,
  last_name    text not null,
  created_at   timestamptz default now()
);

-- Table des formulaires
create table if not exists forms (
  id           text primary key,
  title        text not null,
  description  text default '',
  fields       jsonb default '[]'::jsonb,
  cover_image  text,
  youtube_url  text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Migration : ajoute youtube_url si la table existe déjà
alter table forms add column if not exists youtube_url text;

-- ============================================================
-- Storage — bucket pour les images de formulaires
-- À exécuter dans l'éditeur SQL Supabase (ou via Dashboard > Storage)
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('form-images', 'form-images', true)
-- on conflict do nothing;
--
-- Politique d'accès public en lecture :
-- create policy "Public read form-images"
--   on storage.objects for select
--   using (bucket_id = 'form-images');
--
-- Politique d'écriture via service role (API) uniquement :
-- create policy "Service role upload form-images"
--   on storage.objects for insert
--   with check (bucket_id = 'form-images');

-- Table des réponses
create table if not exists form_responses (
  id             text primary key,
  form_id        text references forms(id) on delete cascade,
  user_id        uuid references hl_users(id) on delete set null,
  data           jsonb default '{}'::jsonb,
  submitted_at   timestamptz default now(),
  payment_status text,
  payment_amount numeric,
  payment_method text
);

-- Index utiles
create index if not exists idx_form_responses_form_id on form_responses(form_id);
create index if not exists idx_form_responses_user_id on form_responses(user_id);

-- Row Level Security (toutes les opérations passent par les routes API avec la service key)
alter table hl_users       enable row level security;
alter table forms          enable row level security;
alter table form_responses enable row level security;
