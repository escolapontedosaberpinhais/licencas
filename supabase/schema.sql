-- =============================================================
-- Gestão de Licenças — Escola Ponte do Saber
-- Execute este SQL no Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. Tabela de licenças
create table if not exists public.licencas (
  id   text primary key,
  data jsonb not null default '{}'::jsonb
);

-- 2. Tabela de manutenções periódicas
create table if not exists public.manutencoes (
  id   text primary key,
  data jsonb not null default '{}'::jsonb
);

-- 3. Tabela de fornecedores / prestadores
create table if not exists public.fornecedores (
  id   text primary key,
  data jsonb not null default '{}'::jsonb
);

-- 3. Row Level Security — apenas usuários autenticados acessam
alter table public.licencas    enable row level security;
alter table public.manutencoes enable row level security;
alter table public.fornecedores enable row level security;

create policy "acesso_autenticados" on public.licencas
  for all to authenticated using (true) with check (true);

create policy "acesso_autenticados" on public.manutencoes
  for all to authenticated using (true) with check (true);

create policy "acesso_autenticados" on public.fornecedores
  for all to authenticated using (true) with check (true);

-- 4. Bucket de arquivos (50 MB por arquivo, qualquer tipo)
insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 52428800)
on conflict (id) do nothing;

-- 5. Políticas do bucket — apenas usuários autenticados
create policy "upload_auth"   on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos');

create policy "download_auth" on storage.objects for select to authenticated
  using (bucket_id = 'documentos');

create policy "delete_auth"   on storage.objects for delete to authenticated
  using (bucket_id = 'documentos');

create policy "update_auth"   on storage.objects for update to authenticated
  using (bucket_id = 'documentos');
