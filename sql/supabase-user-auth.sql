-- =====================================================================
-- user auth: 일반 사용자 Google OAuth + profiles
-- 전제:
--   1) Supabase Dashboard > Authentication > Providers > Google 활성화
--   2) Redirect URL 등록:
--      - http://localhost:3000/auth/callback
--      - https://<production-domain>/auth/callback
--   3) 기존 Supabase URL/PUBLISHABLE/SECRET env 사용
-- 재실행 안전(idempotent). Supabase SQL Editor에서 그대로 실행.
-- =====================================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','expert','admin')),
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function set_profiles_updated_at();

alter table profiles enable row level security;

drop policy if exists "profiles self select" on profiles;
create policy "profiles self select" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self update" on profiles;
create policy "profiles self update" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- insert/upsert 는 서버 callback(service role)에서만 수행합니다.
