create table if not exists public.knowledge (
  id uuid primary key default gen_random_uuid(), cat text not null default 'management', tag text not null default '後台新增',
  title text not null, keys jsonb not null default '[]'::jsonb, text text not null, source text not null, url text not null,
  file_name text, mime_type text, size bigint, storage_path text, created_at timestamptz not null default now()
);
alter table public.knowledge enable row level security;
drop policy if exists "public can read knowledge" on public.knowledge;
create policy "public can read knowledge" on public.knowledge for select using (true);
insert into storage.buckets (id,name,public,file_size_limit) values ('knowledge-files','knowledge-files',true,52428800)
on conflict (id) do update set public=true,file_size_limit=52428800;
