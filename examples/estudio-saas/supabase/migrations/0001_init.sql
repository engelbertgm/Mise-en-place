create table public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null
);
alter table public.classes enable row level security;
create policy "classes_select" on public.classes for select using (true);
create policy "classes_insert" on public.classes for insert with check (false);
create policy "classes_update" on public.classes for update using (false);
create policy "classes_delete" on public.classes for delete using (false);
