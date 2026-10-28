-- Run this whole file once in Supabase: SQL Editor -> New query -> paste -> Run.
-- IMPORTANT: replace both YOUR_ADMIN_EMAIL values with your admin email (lowercase).

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  amount integer not null default 999,
  status text not null default 'pending' check (status in ('pending','approved','cancelled')),
  proof_path text,
  fbp text, fbc text, event_id text, source_url text, client_ip text, user_agent text,
  approved_at timestamptz,
  meta_status text check (meta_status in ('sent','failed')),
  meta_error text,
  meta_sent_at timestamptz
);

alter table public.orders enable row level security;

-- Only the admin can read orders from the browser. All writes go through the server (service role).
drop policy if exists "admin read orders" on public.orders;
create policy "admin read orders" on public.orders for select to authenticated
  using ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');

-- Private bucket for payment screenshots (15 MB max, images/PDF only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 15728640,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do nothing;

-- Customers can upload (not read, not overwrite). Only the admin can view.
drop policy if exists "anyone can upload proofs" on storage.objects;
create policy "anyone can upload proofs" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'proofs');

drop policy if exists "admin reads proofs" on storage.objects;
create policy "admin reads proofs" on storage.objects for select to authenticated
  using (bucket_id = 'proofs' and (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');
