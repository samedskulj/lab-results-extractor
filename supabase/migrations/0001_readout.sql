-- Readout: saved case state per doctor, and contact requests from the landing page.
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run.
--
-- Deliberately NOT stored: raw lab documents and extracted values. Only a hash of the
-- document identifies a case. Approved letters do contain patient names, so before using
-- real patients, move to a UK/EU region and sign Supabase's health-data agreement.

-- ---------- Case state, one row per doctor per document ----------
create table if not exists public.case_reviews (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_hash text not null,
  document_title text not null,
  reviewed boolean not null default false,
  reviewed_at timestamptz,
  letter_subject text,
  letter_body text,
  letter_approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (doctor_id, document_hash)
);

alter table public.case_reviews enable row level security;

-- A doctor sees and changes only their own cases.
drop policy if exists "doctors read own cases" on public.case_reviews;
create policy "doctors read own cases" on public.case_reviews
  for select to authenticated using (doctor_id = (select auth.uid()));

drop policy if exists "doctors add own cases" on public.case_reviews;
create policy "doctors add own cases" on public.case_reviews
  for insert to authenticated with check (doctor_id = (select auth.uid()));

drop policy if exists "doctors update own cases" on public.case_reviews;
create policy "doctors update own cases" on public.case_reviews
  for update to authenticated using (doctor_id = (select auth.uid())) with check (doctor_id = (select auth.uid()));

drop policy if exists "doctors delete own cases" on public.case_reviews;
create policy "doctors delete own cases" on public.case_reviews
  for delete to authenticated using (doctor_id = (select auth.uid()));

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists case_reviews_touch on public.case_reviews;
create trigger case_reviews_touch before update on public.case_reviews
  for each row execute function public.touch_updated_at();

-- ---------- "Talk to us" requests from the landing page ----------
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 320),
  practice text check (char_length(practice) <= 200),
  message text check (char_length(message) <= 4000),
  created_at timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

-- Anyone may send a request; nobody can read them through the public API.
-- Read them in the Supabase dashboard (Table Editor), which bypasses these rules.
drop policy if exists "anyone can send a request" on public.contact_requests;
create policy "anyone can send a request" on public.contact_requests
  for insert to anon, authenticated with check (true);

grant insert on public.contact_requests to anon, authenticated;
grant select, insert, update, delete on public.case_reviews to authenticated;
