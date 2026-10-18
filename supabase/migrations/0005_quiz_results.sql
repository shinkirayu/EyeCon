-- Pre-test / post-test answers for the thesis study.
-- One row per finished quiz. Players add their own; admins read everything.

create table public.quiz_results (
  id          bigint generated always as identity primary key,
  player_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('pre', 'post')),
  score       smallint not null,           -- number of correct answers
  total       smallint not null,           -- number of questions
  answers     jsonb not null,              -- [{ q: question index, picked: option index, correct: bool }]
  duration_ms integer,                     -- time from first question to the last answer
  created_at  timestamptz not null default now()
);

create index quiz_results_player_idx on public.quiz_results (player_id, kind);

alter table public.quiz_results enable row level security;
create policy quiz_insert on public.quiz_results for insert with check (player_id = auth.uid());
create policy quiz_read   on public.quiz_results for select using (player_id = auth.uid() or public.is_admin());
