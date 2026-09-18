-- ===== Extensions & helpers =====
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.career_track AS ENUM ('experienced', 'fresh_graduate');
CREATE TYPE public.agent_state AS ENUM (
  'NEW_USER','ONBOARDING','WAITING_FOR_CV','CV_ANALYSIS','PROFILE_REVIEW','READY_TO_SEARCH',
  'JOB_DISCOVERY','JOB_REVIEW','JOB_INTERESTED','CV_TAILORING','APPLICATION_READY',
  'APPLICATION_PROCESS','INTERVIEW_PREP'
);
CREATE TYPE public.job_status AS ENUM ('active','possibly_active','expired','removed','unknown');
CREATE TYPE public.work_arrangement AS ENUM ('remote','hybrid','onsite');
CREATE TYPE public.employment_type AS ENUM ('full_time','part_time','contract','internship','temporary','freelance');
CREATE TYPE public.seniority_level AS ENUM ('intern','junior','mid','senior','lead','manager','director','executive');
CREATE TYPE public.match_status AS ENUM ('new','viewed','interested','skipped','hidden');
CREATE TYPE public.application_stage AS ENUM ('found','interested','approved','applied','viewed','interview','offer','closed');
CREATE TYPE public.application_closed_reason AS ENUM ('rejected','withdrawn','job_closed','user_declined');
CREATE TYPE public.application_mode AS ENUM ('direct','autofill','assisted');
CREATE TYPE public.application_permission AS ENUM ('approval_required','trusted_auto');
CREATE TYPE public.event_actor AS ENUM ('agent','user','employer','system');
CREATE TYPE public.cv_kind AS ENUM ('master','tailored');
CREATE TYPE public.cv_template AS ENUM ('professional','modern','fresh_graduate');
CREATE TYPE public.memory_kind AS ENUM ('fact','preference','behavior');
CREATE TYPE public.target_role_kind AS ENUM ('primary','secondary');
CREATE TYPE public.target_role_status AS ENUM ('suggested','approved','removed');
CREATE TYPE public.plan_tier AS ENUM ('free_trial','basic','pro','premium');
CREATE TYPE public.subscription_status AS ENUM ('trialing','active','past_due','cancelled','expired');
CREATE TYPE public.conversation_kind AS ENUM ('general','onboarding','job','interview','cv');
CREATE TYPE public.message_role AS ENUM ('user','assistant','system','tool');

-- ===== Roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== Profiles =====
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  locale text NOT NULL DEFAULT 'ar',
  country text,
  city text,
  phone text,
  headline text,
  current_title text,
  years_experience numeric(4,1),
  seniority public.seniority_level,
  track public.career_track,
  industries text[] NOT NULL DEFAULT '{}',
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  education jsonb NOT NULL DEFAULT '[]'::jsonb,
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  work_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_strength int NOT NULL DEFAULT 0,
  onboarding_completed boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Career preferences =====
CREATE TABLE public.career_preferences (
  user_id uuid PRIMARY KEY,
  target_countries text[] NOT NULL DEFAULT '{}',
  target_cities text[] NOT NULL DEFAULT '{}',
  work_arrangements public.work_arrangement[] NOT NULL DEFAULT '{}',
  employment_types public.employment_type[] NOT NULL DEFAULT '{}',
  target_industries text[] NOT NULL DEFAULT '{}',
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  company_sizes text[] NOT NULL DEFAULT '{}',
  relocation_willing boolean,
  travel_willing boolean,
  application_permission public.application_permission NOT NULL DEFAULT 'approval_required',
  notification_prefs jsonb NOT NULL DEFAULT '{"new_match":true,"application_updates":true,"digest":"daily"}'::jsonb,
  match_threshold int NOT NULL DEFAULT 80,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.career_preferences TO authenticated;
GRANT ALL ON public.career_preferences TO service_role;
ALTER TABLE public.career_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.career_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER career_preferences_updated_at BEFORE UPDATE ON public.career_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Career targets =====
CREATE TABLE public.career_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  kind public.target_role_kind NOT NULL DEFAULT 'secondary',
  status public.target_role_status NOT NULL DEFAULT 'suggested',
  rationale text,
  source text NOT NULL DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX career_targets_user_idx ON public.career_targets(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_targets TO authenticated;
GRANT ALL ON public.career_targets TO service_role;
ALTER TABLE public.career_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own targets" ON public.career_targets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== User skills =====
CREATE TABLE public.user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  normalized_name text GENERATED ALWAYS AS (lower(btrim(name))) STORED,
  category text,
  level text,
  years numeric(4,1),
  source text NOT NULL DEFAULT 'cv',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, normalized_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_skills TO authenticated;
GRANT ALL ON public.user_skills TO service_role;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own skills" ON public.user_skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== Career memory (Career Brain) =====
CREATE TABLE public.career_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.memory_kind NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  confidence numeric(3,2) NOT NULL DEFAULT 1.0,
  source text NOT NULL DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_memory TO authenticated;
GRANT ALL ON public.career_memory TO service_role;
ALTER TABLE public.career_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memory" ON public.career_memory FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER career_memory_updated_at BEFORE UPDATE ON public.career_memory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Job collectors & jobs (CJDE) =====
CREATE TABLE public.job_collectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  kind text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_status text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_collectors TO authenticated;
GRANT ALL ON public.job_collectors TO service_role;
ALTER TABLE public.job_collectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read collectors" ON public.job_collectors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  normalized_title text,
  company text NOT NULL,
  company_logo_url text,
  industry text,
  country text,
  city text,
  work_arrangement public.work_arrangement,
  remote_eligible_countries text[] NOT NULL DEFAULT '{}',
  employment_type public.employment_type,
  seniority public.seniority_level,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  salary_period text,
  description text,
  responsibilities text[] NOT NULL DEFAULT '{}',
  required_skills text[] NOT NULL DEFAULT '{}',
  preferred_skills text[] NOT NULL DEFAULT '{}',
  min_years_experience numeric(4,1),
  max_years_experience numeric(4,1),
  education_requirements text,
  languages_required text[] NOT NULL DEFAULT '{}',
  visa_sponsorship boolean,
  application_url text,
  fingerprint text UNIQUE,
  status public.job_status NOT NULL DEFAULT 'unknown',
  posted_at timestamptz,
  expires_at timestamptz,
  last_verified_at timestamptz,
  ai_summary jsonb,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_status_posted_idx ON public.jobs(status, posted_at DESC);
CREATE INDEX jobs_country_idx ON public.jobs(country);
CREATE INDEX jobs_title_idx ON public.jobs(normalized_title);
GRANT SELECT ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.job_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  collector_id uuid REFERENCES public.job_collectors(id) ON DELETE SET NULL,
  source_name text NOT NULL,
  source_url text,
  external_ref text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_name, external_ref)
);
CREATE INDEX job_sources_job_idx ON public.job_sources(job_id);
GRANT SELECT ON public.job_sources TO authenticated;
GRANT ALL ON public.job_sources TO service_role;
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read job sources" ON public.job_sources FOR SELECT TO authenticated USING (true);

CREATE TABLE public.job_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text GENERATED ALWAYS AS (lower(btrim(name))) STORED,
  required boolean NOT NULL DEFAULT true
);
CREATE INDEX job_skills_job_idx ON public.job_skills(job_id);
CREATE INDEX job_skills_name_idx ON public.job_skills(normalized_name);
GRANT SELECT ON public.job_skills TO authenticated;
GRANT ALL ON public.job_skills TO service_role;
ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read job skills" ON public.job_skills FOR SELECT TO authenticated USING (true);

-- ===== Matching =====
CREATE TABLE public.user_job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score BETWEEN 0 AND 100),
  eligible boolean NOT NULL DEFAULT true,
  ineligibility_reasons text[] NOT NULL DEFAULT '{}',
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths text[] NOT NULL DEFAULT '{}',
  gaps text[] NOT NULL DEFAULT '{}',
  recommendation text,
  status public.match_status NOT NULL DEFAULT 'new',
  recommended_for date,
  computed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
CREATE INDEX matches_user_score_idx ON public.user_job_matches(user_id, score DESC);
CREATE INDEX matches_user_status_idx ON public.user_job_matches(user_id, status);
GRANT SELECT, INSERT, UPDATE ON public.user_job_matches TO authenticated;
GRANT ALL ON public.user_job_matches TO service_role;
ALTER TABLE public.user_job_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own matches" ON public.user_job_matches FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON public.user_job_matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.saved_jobs (
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO authenticated;
GRANT ALL ON public.saved_jobs TO service_role;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved" ON public.saved_jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.hidden_jobs (
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
GRANT SELECT, INSERT, DELETE ON public.hidden_jobs TO authenticated;
GRANT ALL ON public.hidden_jobs TO service_role;
ALTER TABLE public.hidden_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hidden" ON public.hidden_jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== CVs =====
CREATE TABLE public.cvs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  kind public.cv_kind NOT NULL DEFAULT 'master',
  template public.cv_template NOT NULL DEFAULT 'professional',
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  current_version_id uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cvs_user_idx ON public.cvs(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cvs TO authenticated;
GRANT ALL ON public.cvs TO service_role;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cvs" ON public.cvs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cvs_updated_at BEFORE UPDATE ON public.cvs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cv_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cv_id uuid NOT NULL REFERENCES public.cvs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  version_no int NOT NULL DEFAULT 1,
  label text,
  file_path text,
  file_type text,
  content jsonb,
  parsed_data jsonb,
  analysis jsonb,
  created_by text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cv_id, version_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_versions TO authenticated;
GRANT ALL ON public.cv_versions TO service_role;
ALTER TABLE public.cv_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cv versions" ON public.cv_versions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER TABLE public.cvs ADD CONSTRAINT cvs_current_version_fk FOREIGN KEY (current_version_id) REFERENCES public.cv_versions(id) ON DELETE SET NULL;

-- ===== Applications =====
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
  match_id uuid REFERENCES public.user_job_matches(id) ON DELETE SET NULL,
  cv_version_id uuid REFERENCES public.cv_versions(id) ON DELETE SET NULL,
  cover_letter text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  stage public.application_stage NOT NULL DEFAULT 'found',
  closed_reason public.application_closed_reason,
  mode public.application_mode NOT NULL DEFAULT 'assisted',
  applied_at timestamptz,
  employer_contact jsonb,
  notes text,
  next_follow_up_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);
CREATE INDEX applications_user_stage_idx ON public.applications(user_id, stage);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own applications" ON public.applications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  actor public.event_actor NOT NULL DEFAULT 'system',
  event_type text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_events_app_idx ON public.application_events(application_id, occurred_at);
GRANT SELECT, INSERT ON public.application_events TO authenticated;
GRANT ALL ON public.application_events TO service_role;
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own application events" ON public.application_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  scheduled_at timestamptz,
  kind text,
  location text,
  notes text,
  outcome text,
  prep jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX interviews_user_idx ON public.interviews(user_id, scheduled_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own interviews" ON public.interviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== Agent: conversations, messages, state =====
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  kind public.conversation_kind NOT NULL DEFAULT 'general',
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversations_user_idx ON public.conversations(user_id, last_message_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations" ON public.conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.message_role NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, client_message_id)
);
CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.agent_states (
  user_id uuid PRIMARY KEY,
  state public.agent_state NOT NULL DEFAULT 'NEW_USER',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_action jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.agent_states TO authenticated;
GRANT ALL ON public.agent_states TO service_role;
ALTER TABLE public.agent_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agent state" ON public.agent_states FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER agent_states_updated_at BEFORE UPDATE ON public.agent_states FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Notifications =====
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== Subscriptions =====
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  tier public.plan_tier NOT NULL,
  name jsonb NOT NULL DEFAULT '{}'::jsonb,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  trial_days int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO authenticated, anon;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active plans" ON public.subscription_plans FOR SELECT TO authenticated, anon USING (is_active = true);

CREATE TABLE public.plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  country text NOT NULL DEFAULT '*',
  currency text NOT NULL,
  amount numeric(12,2) NOT NULL,
  billing_interval text NOT NULL DEFAULT 'month',
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (plan_id, country, currency, billing_interval)
);
GRANT SELECT ON public.plan_prices TO authenticated, anon;
GRANT ALL ON public.plan_prices TO service_role;
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads prices" ON public.plan_prices FOR SELECT TO authenticated, anon USING (is_active = true);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz,
  renews_at timestamptz,
  cancelled_at timestamptz,
  ends_at timestamptz,
  country text,
  currency text,
  provider text,
  provider_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_user_idx ON public.subscriptions(user_id, status);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  period_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usage_events_user_period_idx ON public.usage_events(user_id, feature, period_key);
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage" ON public.usage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== Feedback, analytics, AI usage, logs =====
CREATE TABLE public.feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  kind text NOT NULL,
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_user_idx ON public.feedback_events(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.feedback_events TO authenticated;
GRANT ALL ON public.feedback_events TO service_role;
ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback" ON public.feedback_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_name_idx ON public.analytics_events(name, created_at DESC);
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own analytics" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read analytics" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  model text NOT NULL,
  purpose text NOT NULL,
  prompt_tokens int NOT NULL DEFAULT 0,
  completion_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric(10,6),
  latency_ms int,
  status text NOT NULL DEFAULT 'ok',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_created_idx ON public.ai_usage(created_at DESC);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read ai usage" ON public.ai_usage FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info',
  area text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read logs" ON public.system_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== New user bootstrap =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, locale)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'locale', 'ar')
  ) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.career_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.agent_states (user_id, state) VALUES (NEW.id, 'NEW_USER') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();