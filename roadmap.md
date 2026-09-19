# Shoghlni — Implementation Checklist

## Architecture assessment (2026-09-19)
- Starting point: blank TanStack Start template. No auth, DB, pages or design system existed → no conflicts with the spec, nothing to preserve.
- Stack: TanStack Start (React 19, SSR) + Lovable Cloud (Postgres, Auth, Storage, server functions) + Lovable AI Gateway.
- Boundaries: frontend → `createServerFn` engines (`src/lib/*.functions.ts`) → DB. Streaming agent via `src/routes/api/chat.ts`. External/cron via `src/routes/api/public/*`.
- Provider-swappable seams: `src/lib/ai-gateway.server.ts` (models), `job_collectors` table + collector interface (job sources), `subscriptions.provider` (payments), application `mode` enum (integrations), messages `parts` JSON (voice-ready).

## Phase 0 — Foundation
- [x] Core relational schema (32 tables, enums, RLS, grants, indexes, updated_at triggers, new-user bootstrap)
- [x] Roles table + `has_role()` (admin gating)
- [x] Private `cvs` storage bucket + per-user object policies
- [x] Auth: email/password, Google, Apple, forgot/reset password, sign-out hygiene
- [x] Design system (navy/gold/teal oklch tokens, fonts, utilities, animations)
- [x] i18n (ar/en) with device detection + RTL switching
- [x] App shell: bottom nav (mobile) / sidebar (desktop), 5 tabs
- [x] Landing, Home (command center), Jobs list, Job detail, Applications, Profile, Agent thread list — all reading real DB
- [x] Analytics event helper
- [ ] Seed `subscription_plans` (4 tiers) + trial assignment on signup

## Phase 1 — MVP core
- [x] Agent streaming chat (AI Elements, `/api/chat`, tool calling, DB-persisted threads/messages)
- [~] Agent state machine (agent_states written by `set_agent_state`); one-next-action buttons still to add
- [ ] Conversational onboarding (track detection, preferences, CV ask)
- [ ] CV upload → parse → Master CV + Career Profile + missing-info questions
- [x] Career Brain memory read/write tools (`remember_fact`, snapshot injected into every turn)
- [ ] Target Role Engine (primary/secondary suggestions, approve/remove)
- [ ] CJDE: collector interface, normalization, fingerprint dedupe, freshness validation (cron)
- [ ] Eligibility filters + Matching Engine (score, breakdown, strengths, gaps, cached per job)
- [ ] Interested / Save / Skip actions with feedback reasons → Career Brain
- [ ] Application tracker (create on Interested, timeline events, stage transitions)
- [ ] Jobs filters & sort

## Phase 2
- [ ] CV Builder (3 templates), CV review, tailoring, versioning UI, PDF export
- [ ] Application preparation (cover letter, answers), approval flow
- [ ] Notifications (in-app + email)
- [ ] Profile strength calculator + improvement tips

## Phase 3
- [ ] Application automation modes (assisted → autofill → direct)
- [ ] Interview Coach (text), voice-ready message parts
- [ ] Admin dashboard (users, jobs, AI cost, revenue, system health)
- [ ] Subscriptions & payments provider abstraction

## Phase 4
- [ ] Career Roadmap, Gap Analyzer, Salary Intelligence, Fresh Graduate micro-lessons
