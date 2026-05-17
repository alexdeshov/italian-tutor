create type api_provider as enum ('openai_whisper', 'openai_chat', 'anthropic_claude', 'elevenlabs_tts');

create table api_usage (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  provider api_provider not null,
  operation text not null,
  model text,
  input_units numeric not null default 0,
  output_units numeric not null default 0,
  cost_usd numeric(10, 6) not null,
  created_at timestamptz not null default now()
);

create index idx_api_usage_profile_created on api_usage(profile_id, created_at desc);
create index idx_api_usage_session on api_usage(session_id);

alter table api_usage enable row level security;

create policy "users see own usage" on api_usage
  for select using (auth.uid() = profile_id);

create policy "users insert own usage" on api_usage
  for insert with check (auth.uid() = profile_id);
