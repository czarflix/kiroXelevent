create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  site_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  elevenlabs_agent_id text not null,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spec_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_path text not null,
  raw_markdown text not null,
  parsed jsonb not null default '{}'::jsonb,
  checksum text not null,
  status text not null default 'parsed' check (status in ('draft', 'parsed', 'invalid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, source_path, checksum)
);

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  spec_document_id uuid not null references public.spec_documents(id) on delete cascade,
  requirement_key text not null,
  title text not null,
  user_story text,
  acceptance jsonb not null default '[]'::jsonb,
  ears jsonb not null default '[]'::jsonb,
  source_line int not null default 1,
  lint_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (spec_document_id, requirement_key)
);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  scenario_key text not null,
  title text not null,
  persona text not null,
  goal text not null,
  prompt text not null,
  expected_behavior text not null,
  tags text[] not null default '{}',
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  seed int not null,
  created_at timestamptz not null default now(),
  unique (requirement_id, scenario_key)
);

create table if not exists public.evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  criteria_key text not null,
  label text not null,
  prompt text not null,
  passing_threshold numeric not null default 0.8,
  created_at timestamptz not null default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  scenario_id uuid references public.scenarios(id) on delete set null,
  status text not null check (status in ('queued', 'running', 'passed', 'failed', 'error')),
  score numeric not null default 0,
  severity text not null default 'low' check (severity in ('critical', 'high', 'medium', 'low')),
  summary text not null default '',
  source text not null default 'seeded',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.run_turns (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  turn_index int not null,
  role text not null check (role in ('user', 'agent', 'system', 'tool')),
  message text not null,
  time_in_call_secs numeric,
  tool_calls jsonb not null default '[]'::jsonb,
  tool_results jsonb not null default '[]'::jsonb,
  latency_ms int,
  created_at timestamptz not null default now(),
  unique (run_id, turn_index)
);

create table if not exists public.run_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  criteria_key text not null,
  label text not null,
  passed boolean not null,
  rationale text not null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.failures (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  requirement_key text not null,
  scenario_key text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  title text not null,
  evidence text not null,
  reproducibility jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shrink_jobs (
  id uuid primary key default gen_random_uuid(),
  failure_id uuid not null references public.failures(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'passed', 'failed', 'error')),
  original_turn_count int not null,
  minimized_turn_count int,
  minimized_transcript jsonb,
  confidence numeric,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.shrink_steps (
  id uuid primary key default gen_random_uuid(),
  shrink_job_id uuid not null references public.shrink_jobs(id) on delete cascade,
  step_index int not null,
  strategy text not null,
  candidate jsonb not null,
  still_fails boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id uuid references public.runs(id) on delete cascade,
  kind text not null check (kind in ('spec', 'audio', 'waveform', 'caption', 'render', 'export')),
  bucket text not null,
  storage_path text not null,
  mime_type text,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fix_exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  markdown text not null,
  source_failure_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null,
  operation text not null,
  units numeric not null default 0,
  estimated_cost_usd numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists agents_touch_updated_at on public.agents;
create trigger agents_touch_updated_at
before update on public.agents
for each row execute function public.touch_updated_at();

drop trigger if exists specs_touch_updated_at on public.spec_documents;
create trigger specs_touch_updated_at
before update on public.spec_documents
for each row execute function public.touch_updated_at();

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists projects_org_idx on public.projects(organization_id);
create index if not exists runs_project_created_idx on public.runs(project_id, created_at desc);
create index if not exists run_turns_run_idx on public.run_turns(run_id, turn_index);
create index if not exists failures_run_idx on public.failures(run_id);
create index if not exists artifacts_project_idx on public.artifacts(project_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.agents enable row level security;
alter table public.spec_documents enable row level security;
alter table public.requirements enable row level security;
alter table public.scenarios enable row level security;
alter table public.evaluation_criteria enable row level security;
alter table public.runs enable row level security;
alter table public.run_turns enable row level security;
alter table public.run_results enable row level security;
alter table public.failures enable row level security;
alter table public.shrink_jobs enable row level security;
alter table public.shrink_steps enable row level security;
alter table public.artifacts enable row level security;
alter table public.fix_exports enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.is_project_member(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.memberships m on m.organization_id = p.organization_id
    where p.id = project_uuid
      and m.user_id = auth.uid()
  );
$$;

create policy "members can read organizations" on public.organizations
for select using (exists (select 1 from public.memberships m where m.organization_id = id and m.user_id = auth.uid()));

create policy "members can read memberships" on public.memberships
for select using (user_id = auth.uid() or exists (select 1 from public.memberships m where m.organization_id = memberships.organization_id and m.user_id = auth.uid()));

create policy "members can read projects" on public.projects
for select using (public.is_project_member(id));

create policy "members can mutate projects" on public.projects
for all using (public.is_project_member(id)) with check (public.is_project_member(id));

create policy "members can read agents" on public.agents
for select using (public.is_project_member(project_id));

create policy "members can mutate agents" on public.agents
for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));

create policy "members can read specs" on public.spec_documents
for select using (public.is_project_member(project_id));

create policy "members can mutate specs" on public.spec_documents
for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));

create policy "members can read requirements" on public.requirements
for select using (exists (select 1 from public.spec_documents s where s.id = spec_document_id and public.is_project_member(s.project_id)));

create policy "members can read scenarios" on public.scenarios
for select using (exists (
  select 1 from public.requirements r
  join public.spec_documents s on s.id = r.spec_document_id
  where r.id = requirement_id and public.is_project_member(s.project_id)
));

create policy "members can read criteria" on public.evaluation_criteria
for select using (exists (
  select 1 from public.scenarios sc
  join public.requirements r on r.id = sc.requirement_id
  join public.spec_documents s on s.id = r.spec_document_id
  where sc.id = scenario_id and public.is_project_member(s.project_id)
));

create policy "members can read runs" on public.runs
for select using (public.is_project_member(project_id));

create policy "members can mutate runs" on public.runs
for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));

create policy "members can read run turns" on public.run_turns
for select using (exists (select 1 from public.runs r where r.id = run_id and public.is_project_member(r.project_id)));

create policy "members can read run results" on public.run_results
for select using (exists (select 1 from public.runs r where r.id = run_id and public.is_project_member(r.project_id)));

create policy "members can read failures" on public.failures
for select using (exists (select 1 from public.runs r where r.id = run_id and public.is_project_member(r.project_id)));

create policy "members can read shrink jobs" on public.shrink_jobs
for select using (exists (
  select 1 from public.failures f
  join public.runs r on r.id = f.run_id
  where f.id = failure_id and public.is_project_member(r.project_id)
));

create policy "members can read shrink steps" on public.shrink_steps
for select using (exists (
  select 1 from public.shrink_jobs sj
  join public.failures f on f.id = sj.failure_id
  join public.runs r on r.id = f.run_id
  where sj.id = shrink_job_id and public.is_project_member(r.project_id)
));

create policy "members can read artifacts" on public.artifacts
for select using (public.is_project_member(project_id));

create policy "members can read fix exports" on public.fix_exports
for select using (public.is_project_member(project_id));

create policy "members can read usage" on public.usage_events
for select using (project_id is null or public.is_project_member(project_id));

create policy "members can read audit" on public.audit_events
for select using (project_id is null or public.is_project_member(project_id));

insert into storage.buckets (id, name, public)
values
  ('specs', 'specs', false),
  ('audio', 'audio', false),
  ('renders', 'renders', false),
  ('exports', 'exports', false)
on conflict (id) do nothing;
