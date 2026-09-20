# Career Companion AI

SHOGHLNI / شغلني

AI Career Agent Platform — Master Product & Build Specification

Build a production-ready, mobile-first AI career platform called Shoghlni / شغلني.

This product is NOT a traditional job board.

It is an AI Career Agent that learns about each user, builds their career profile, discovers suitable jobs, evaluates job fit, improves and tailors their CV, helps them apply, tracks applications, prepares them for interviews, and continuously improves its recommendations based on their behavior.

The experience should feel like the user has hired a personal AI employee to manage their job search.

The platform should initially target Arabic-speaking users in Egypt, Jordan, Saudi Arabia, UAE, and the wider MENA region, while being architected so it can later operate globally.

The product must support both Arabic and English, including proper RTL layouts for Arabic.



1. PRODUCT PHILOSOPHY

The product should follow five principles:

Extremely simple for the user.

AI should do most of the work.

Ask the user only for information that is actually missing.

Never repeatedly ask questions already answered.

Quality of job recommendations matters more than quantity.

The AI must remember the user’s career information, preferences, previous conversations, feedback, applications, rejected jobs, CV versions, job interests and decisions.

The user should feel that Shoghlni understands their career better over time.



2. CORE PRODUCT STRUCTURE

Build the app around five primary navigation areas:

Home

AI Agent

Jobs

Applications

Profile

The mobile bottom navigation should stay simple and premium.

Suggested structure:

Home
Jobs
AI Agent
Applications
Profile

The AI Agent should be visually central to the product.



3. AUTHENTICATION

Keep signup extremely simple.

Support:

Email signup

Email login

Google login

Apple login

Forgot password

Secure session management

Do NOT force users to complete a long registration form.

After signup, immediately send the user into the AI Agent onboarding experience.



4. FIRST-TIME ONBOARDING

The AI Agent should lead onboarding conversationally.

Do not show a huge form.

The goal is to create a complete structured Career Profile with as little friction as possible.

Start by welcoming the user naturally.

Examples:

Arabic:
“مساء الخير محمد 👋 خليني أتعرف عليك بسرعة ونبدأ نلاقي لك الفرص المناسبة.”

English:
“Good evening Mohammed 👋 Let’s get your career profile ready and start finding the right opportunities.”

The onboarding flow should intelligently gather:

Does the user have work experience?

What type of work are they looking for?

Preferred job location / countries

Remote / Hybrid / On-site preference

Then move quickly into CV acquisition.



5. CV-FIRST CAREER PROFILE

The CV should become one of the main sources of truth for the user profile.

Ask:

“Do you already have a CV?”

Options:

Yes — Upload CV

No — Build my CV

If the user uploads a CV:

Parse the CV.

Extract structured information.

Create the initial Career Profile.

Detect missing information.

Ask ONLY for missing or unclear information.

Identify weaknesses in the CV.

Ask whether the user wants to keep the current CV or improve it.

Never make the user manually re-enter information already available in the CV.

Extract information such as:

Name

Current title

Target roles

Previous titles

Companies

Industries

Years of experience

Skills

Education

Certifications

Languages

Location

Achievements

Responsibilities

Seniority

Technical skills

Management experience



6. USER WITHOUT A CV

If the user has no CV, the AI should build one conversationally.

Ask only one or a few questions at a time.

The AI should understand the user’s background and progressively generate the CV.

Support three initial CV templates:

Professional / Corporate

Modern

Fresh Graduate

The user should be able to preview the CV and approve changes.



7. MASTER CV SYSTEM

Every user should have a Master CV.

The Master CV contains the complete truthful career history.

Never fabricate:

Skills

Companies

Achievements

Degrees

Certifications

Responsibilities

Metrics

Experience

The AI may improve writing, structure and presentation but must not invent experience.

The Master CV becomes the source for creating job-specific CVs.



8. CV REVIEW

When a user uploads an existing CV, analyze it for:

ATS readability

Structure

Formatting

Missing sections

Weak bullet points

Generic statements

Missing measurable achievements

Keyword coverage

Role positioning

Seniority positioning

Grammar

Repetition

Length

Skill relevance

Present improvements clearly.

Do not automatically replace the original.

Ask for approval before modifying it.



9. CV VERSIONING

Support:

Master CV
↓
Tailored CV — Job A
Tailored CV — Job B
Tailored CV — Job C

Keep previous versions.

Users should be able to:

View

Download

Rename

Delete

Compare

Restore

Each tailored version should remain connected to the job for which it was created.



10. PDF CV EDITING

Users may upload an existing PDF and request modifications.

Support a workflow:

Upload PDF
→ Analyze CV
→ Explain suggested changes
→ User approves
→ Create improved version
→ Return downloadable PDF

Maintain the original version.



11. CAREER BRAIN

Create a persistent structured Career Brain for every user.

Separate the information into:

Facts

Things that are objectively known.

Examples:

Work history

Education

Skills

Location

Languages

Certifications

Years of experience

Preferences

Examples:

Target jobs

Target industries

Salary expectations

Countries

Remote preference

Company size

Seniority

Travel willingness

Relocation willingness

Behavior

Learn from:

Jobs opened

Jobs ignored

Jobs saved

Jobs rejected

Jobs applied to

Feedback

Interview outcomes

Offers

User conversations

The AI should gradually learn what types of opportunities the user actually prefers.



12. TARGET ROLE ENGINE

Do not rely only on one exact job title.

The AI should identify:

Primary target role

Example:
Supply Chain Director

Secondary relevant roles

Example:

Head of Operations

Logistics Director

Regional Supply Chain Manager

Operations Director

Procurement Director

The AI may recommend adjacent roles when the user’s experience supports them.

The user should approve or remove suggested target roles.



13. CENTRAL JOB DISCOVERY ENGINE

Build a centralized system called the:

Central Job Discovery Engine — CJDE

Do NOT make every user’s AI search the entire internet separately.

The central engine should continuously collect jobs from available legal sources such as:

Job APIs

Employer career pages

ATS platforms

Public job boards

Recruitment sites

Partner integrations

Architecture:

Sources
↓
Job Collectors
↓
Normalization
↓
Deduplication
↓
Job Validation
↓
Central Jobs Database
↓
User Matching Engine

This drastically reduces duplicate searching and AI costs.



14. JOB NORMALIZATION

Convert different job sources into a common schema.

Each job should contain, where available:

Job ID

Title

Company

Company logo

Industry

Country

City

Work arrangement

Remote eligibility

Employment type

Seniority

Salary

Currency

Description

Responsibilities

Required skills

Preferred skills

Required experience

Education requirements

Languages

Visa requirements

Application URL

Original source

Posted date

Expiry date

Last verified timestamp



15. JOB DEDUPLICATION

The same vacancy may appear on multiple websites.

Detect duplicates using:

Company

Job title

Location

Job description similarity

Source URL

Job reference number

Store one canonical job.

Multiple sources may be connected to the same record.



16. JOB FRESHNESS & VALIDATION

Do not recommend expired jobs.

The system should validate that jobs remain available.

Statuses:

Active

Possibly Active

Expired

Removed

Unknown

Prioritize recently verified jobs.

Store:

last_verified_at

Never present old scraped jobs as fresh opportunities.



17. ELIGIBILITY FILTERS

Before calculating AI Match Score, run hard filters.

Examples:

Candidate location allowed?

Remote location restrictions?

Visa eligibility?

Required language?

Seniority mismatch?

Required years of experience?

Required certification?

Required legal work authorization?

Job still active?

A user should not receive an 85% match for a job they legally cannot apply for.



18. MATCHING ENGINE

After hard filters, calculate a Match Score.

Score range:

0–100%.

Compare:

Experience

Responsibilities

Seniority

Skills

Industry

Education

Languages

Location

Remote requirements

Salary expectations

Career goals

For each job display:

Match Score: 88%

Then show:

Why you’re a strong match

Example:

10+ years logistics experience

Regional MENA exposure

Strong operations leadership

Relevant supply-chain background

Possible gaps

Example:

SAP requested but not shown on CV

Employer prefers FMCG experience

The score must be explainable.

Never show a meaningless AI-generated number.



19. MATCH SCORE THRESHOLD

The default AI recommendation threshold should be approximately 80%+.

Lower-score jobs may exist in the general Jobs section, but the AI Agent should prioritize strong matches.

Do not overwhelm the user with dozens of low-quality opportunities.



20. DAILY JOB RECOMMENDATIONS

The original product concept should support approximately:

3–5 strong verified opportunities per day

rather than sending dozens of mediocre jobs.

Recommendations should be distributed intelligently rather than dumped on the user at once.

Support notification preferences later.

Examples:

Morning

Afternoon

Evening

Daily digest

Important opportunities only



21. HOME SCREEN

The Home screen should behave like a Career Command Center.

Do NOT make it look like LinkedIn.

Show useful information such as:

Greeting:

“Good evening, Mohammed.”

Then a career summary.

Example cards:

New Matches

3 strong jobs found today

Applications

8 active applications

Interviews

2 upcoming

Profile Strength

87%

Then display only a few important job recommendations.

Example:

Operations Director
XYZ Company
Dubai
92% Match

Actions:

View

Interested

Not interested

Also show:

Agent Activity

Examples:

“Shoghlni found 12 jobs today.”

“3 passed your match criteria.”

“1 application requires your approval.”

“Your CV was tailored for Supply Chain Director at Company X.”

The Home screen should immediately answer:

“What has my AI career agent done for me?”



22. AI AGENT

The AI Agent is the heart of Shoghlni.

It should behave like a personal career employee — not a generic chatbot.

It should be able to:

Understand career goals

Search jobs

Explain matches

Improve CVs

Tailor CVs

Create cover letters

Prepare application answers

Track applications

Analyze career gaps

Suggest target roles

Help negotiate salary

Prepare users for interviews

Explain employer requirements

Answer career questions

Remember previous decisions

The conversation should be connected to structured tools.

Do not build the agent as ChatGPT-style text only.

Use rich interactive cards.

Example job card inside chat:

Operations Director
XYZ Logistics
Dubai

Match: 91%

Strong matches:
✓ Operations leadership
✓ MENA experience
✓ Supply chain background

Gap:
⚠ SAP not shown

Buttons:

[Interested]
[Skip]
[View Job]



23. ONE-NEXT-ACTION PRINCIPLE

The Agent should always understand the user’s current stage.

Avoid giving five unrelated next steps.

Example:

User chooses a job.

Agent:

“This role is an 89% match. Your CV could be improved for three keywords the company emphasizes. Would you like me to tailor it?”

Buttons:

[Yes, tailor CV]

[Apply with current CV]

[Not interested]

After CV approval:

“Your application package is ready.”

Buttons:

[Apply]

[Review]

The system should always know the single logical next action.



24. AGENT STATE MACHINE

Maintain explicit user states.

Examples:

NEW_USER
ONBOARDING
WAITING_FOR_CV
CV_ANALYSIS
PROFILE_REVIEW
READY_TO_SEARCH
JOB_DISCOVERY
JOB_REVIEW
JOB_INTERESTED
CV_TAILORING
APPLICATION_READY
APPLICATION_PROCESS
INTERVIEW_PREP

Do not depend only on conversational history.

The backend must store structured state.



25. JOBS SCREEN

The Jobs page is the larger discovery database.

Allow:

Search

Filters

Sort

Save

Hide

Match score filters

Filters could include:

Role

Country

City

Remote

Hybrid

On-site

Salary

Experience level

Industry

Match score

Date posted

Each card should display:

Role

Company

Location

Work type

Posted date

Match score

Short explanation

Never overload the card with information.



26. JOB DETAIL PAGE

Include:

Role
Company
Location
Work model
Salary if available
Posted date
Source
Last verified date

Then prominently show:

MATCH SCORE

Example:

91% Match

Break the match down into sections:

Experience
Skills
Industry
Education
Location
Seniority

Then display:

Why You Match

Possible Gaps

Job Description

AI Recommendation

Application Requirements

Actions:

Interested

Save

Skip

Prepare Application



27. APPLICATION WORKFLOW

When the user selects Interested:

Job
↓
Detailed analysis
↓
Tailored CV recommendation
↓
User approval
↓
Cover letter if useful
↓
Application questions
↓
Application ready
↓
Apply

The system should prepare as much as possible before asking the user to intervene.



28. APPLICATION AUTOMATION

Do NOT assume every website allows fully automatic application.

Applications can have several modes.

Mode 1 — Direct Integration

If the platform has an API/integration:

Apply automatically after user authorization.

Mode 2 — Supported Autofill

Open the employer page and prefill supported fields.

The user completes CAPTCHA, login, consent or unsupported questions.

Mode 3 — Assisted Application

Prepare:

Tailored CV

Cover letter

Answers

Application link

Then guide the user through submission.

Architecture must support more automation in the future.

Do not make the product dependent on illegal or unreliable LinkedIn automation.



29. USER APPLICATION PERMISSIONS

Users should control automation.

Options:

Approval Required

AI prepares application and asks before submitting.

Trusted Auto Apply

For future supported integrations, AI may submit applications matching user-defined rules.

Default should be:

Approval Required



30. APPLICATION TRACKER

Applications must be a major feature.

Stages:

Found
↓
Interested
↓
Approved
↓
Applied
↓
Viewed
↓
Interview
↓
Offer
↓
Closed

Closed may include:

Rejected

Withdrawn

Job closed

User declined

Make a clear distinction between:

Agent Actions

and

Employer Actions

For example:

Agent submitted application.

Employer viewed application.



31. APPLICATIONS SCREEN

Show a visual pipeline.

Example summary:

Applied: 14
Viewed: 7
Interview: 3
Offers: 1

Support:

List view

Kanban-style status view

Each application should store:

Company

Position

Application date

CV version used

Cover letter version

Source

Current status

Employer contact

Interview dates

Notes

Agent activity

Follow-up tasks



32. APPLICATION HISTORY

Maintain complete history.

Example timeline:

Sep 10 — Job discovered
Sep 10 — User marked interested
Sep 10 — CV tailored
Sep 11 — User approved
Sep 11 — Application submitted
Sep 14 — Employer viewed
Sep 17 — Interview invited

This history should be visible.



33. INTERVIEW COACH

Create Interview Coach capability.

The AI should analyze:

Job description

Employer

Candidate CV

Likely interview questions

Candidate gaps

Then conduct interview preparation.

Support:

Question practice

Answer feedback

STAR-answer coaching

Job-specific preparation

Company preparation

Voice interview practice should be supported later.

Architecture should allow voice from the beginning even if the MVP launches text-first.



34. VOICE AGENT — FUTURE READY

The AI Agent should eventually support natural voice conversation in Arabic and English.

Potential uses:

Career onboarding

Job discussions

CV review

Interview simulations

Career coaching

Voice should feel conversational rather than command-based.

Do not make voice required for MVP.

Design the architecture so it can be added without rebuilding the entire agent system.



35. FRESH GRADUATE TRACK

Shoghlni must support users with little or no experience.

Do NOT force fresh graduates through the same experience as experienced professionals.

Fresh graduate AI should help users:

Build first CV

Understand job types

Identify suitable roles

Identify missing skills

Practice interviews

Learn how to apply

Improve LinkedIn/profile positioning

Understand salary ranges

Create personalized micro-lessons.

Examples:

“How to answer Tell me about yourself”

“How to write your first CV”

“How to prepare for a sales interview”

“Top skills missing from your profile”

The product should NOT become a generic learning platform.

Training must relate to the user’s career goal.



36. CAREER GAP ANALYZER

Compare the user’s profile with their desired career.

Example:

Goal:

Supply Chain Director

Current gaps:

✓ Operations management
✓ Logistics
✓ Team leadership
⚠ Data analytics
⚠ ERP/SAP
⚠ Strategic finance

Then suggest specific improvements.



37. CAREER ROADMAP

Users should be able to ask:

“How do I become a Supply Chain Director?”

The system should generate a personalized roadmap using their real career profile.

Example:

Current:
Supply Chain Manager

Next:
Regional Supply Chain Manager

Then:
Head of Supply Chain

Then:
Supply Chain Director

Show the skills and experiences needed between stages.



38. SALARY INTELLIGENCE

Create a salary intelligence module.

Where reliable data exists, estimate salary ranges by:

Role

Country

City

Experience

Industry

Company level

Always indicate when salary information is estimated.

Use this later for:

Job evaluation

Salary expectations

Negotiation coaching



39. PROFILE PAGE

The Profile page should be more than personal information.

Sections:

Career Profile

Current role

Experience

Industry

Skills

Education

Certifications

Career Targets

Primary target

Secondary roles

Countries

Remote preference

Salary expectations

CV & Documents

Master CV

Tailored CVs

Certificates

Preferences

Job alerts

Application permissions

Notifications

Account

Subscription

Settings

Language

Privacy

Show:

Profile Strength

Example:

82%

Then clearly explain what could improve it.



40. FEEDBACK LEARNING

Every interaction should improve recommendations.

Examples:

Not interested because:

Salary too low

Wrong industry

Wrong location

Too junior

Too senior

Company not interesting

Role not relevant

Other

This feedback should update the Career Brain.

Do not permanently alter major preferences from a single click.

Learn gradually.



41. NOTIFICATIONS

Support:

New high-match job

Application ready

Application submitted

Employer update

Interview reminder

CV task

Agent question

Subscription issue

Eventually support:

Push notifications

Email

Optional WhatsApp

Users should control notification frequency.



42. SUBSCRIPTIONS

Create four plan levels:

Free Trial

Basic

Pro

Premium

Do not hardcode specific prices in the architecture.

Pricing must be configurable by country and currency.

The database must support:

Plan

Subscription status

Start date

Renewal date

Cancellation

Limits

Usage

Country

Currency

Different tiers can limit:

Jobs analyzed

AI conversations

CV tailoring

Applications

Interview sessions

Advanced search

Automatic actions

Design feature flags and usage limits cleanly.



43. PAYMENT ARCHITECTURE

Build payment architecture abstractly enough to support different payment providers depending on country.

The frontend should support:

Upgrade

Downgrade

Cancel

Billing history

Payment failure

Renewal

Trial expiration

Payment integration itself can be implemented later.



44. ADMIN DASHBOARD

Create a separate secure Admin area.

Admin should monitor:

Users

Total users

Active users

Countries

Subscription plans

Jobs

Jobs collected

Active jobs

Removed jobs

Duplicate rate

Source performance

Applications

Applications created

Submitted

Interviews

Offers

AI

AI requests

Cost

Tokens

Errors

Tool usage

Average response time

Revenue

MRR

Subscribers

Trial conversion

Cancellation rate

System Health

Job collectors

APIs

Background jobs

Failed application attempts

Notifications



45. AI COST CONTROL

AI calls must be intelligently routed.

Do NOT send every task to an expensive reasoning model.

Examples:

Cheap/small models:

Classification

Extraction

Tagging

Simple summaries

More capable models:

Job matching

CV rewriting

Career reasoning

Interview coaching

Cache reusable results wherever possible.

The centralized job system should prevent hundreds of users from independently analyzing identical job descriptions unnecessarily.



46. DATABASE ARCHITECTURE

Create a scalable relational schema.

Main entities should include:

users

profiles

career_preferences

user_skills

career_targets

career_memory

cvs

cv_versions

jobs

job_sources

job_requirements

job_skills

user_job_matches

saved_jobs

hidden_jobs

applications

application_events

application_documents

interviews

conversations

messages

agent_states

notifications

subscriptions

subscription_plans

usage_events

feedback_events

job_collectors

system_logs

AI usage tables

Design proper:

Foreign keys

Indexes

Row-level security

User ownership

Timestamps

Soft deletion where appropriate

Use Supabase/PostgreSQL if appropriate for Lovable’s environment.



47. BACKEND ARCHITECTURE

Keep the following services logically separated:

Frontend
Backend/API
Database
AI Agent
Job Discovery
Matching Engine
CV Engine
Application Engine
Notifications
Payments
Admin

Avoid putting all business logic into frontend React components.

The frontend must call services/API functions.



48. AI TOOL ARCHITECTURE

The AI Agent should use tools instead of hallucinating system actions.

Example tools:

get_user_profile()

update_profile()

analyze_cv()

create_cv()

tailor_cv()

search_jobs()

get_job_details()

calculate_match()

save_job()

hide_job()

prepare_application()

submit_application()

update_application()

get_applications()

prepare_interview()

get_career_gap()

generate_career_roadmap()

The AI decides what tool to call.

Actual system data should come from tools/database rather than being invented by the language model.



49. MEMORY ARCHITECTURE

Do not rely on sending the entire chat history to the AI every time.

Store structured memory.

Examples:

User wants:
Remote roles

User does not want:
Junior positions

Preferred locations:
UAE, Saudi Arabia, Egypt, Remote

Target roles:
Operations Director, Supply Chain Director

Store relevant memory separately from conversation logs.



50. ERROR HANDLING

Design polished user states for:

No jobs found

CV parsing failed

Job expired

Application failed

AI unavailable

Internet connection failed

Subscription limit reached

Payment failed

Do not show raw technical errors.

Always provide the user with an understandable next action.



51. PRIVACY & SECURITY

Career data is sensitive.

Implement:

Secure authentication

Database row-level security

Private CV/document storage

Signed document URLs

Secure API keys

Server-side secrets

User data deletion

Account deletion

Download my data

Consent for automated applications

Never expose API keys to the frontend.



52. VISUAL DESIGN

The application should feel like a premium modern AI product.

Avoid:

Generic job-board UI

Huge text blocks

Too many colors

Crowded dashboards

Excessive cards

LinkedIn imitation

Use:

Clean visual hierarchy

Rounded cards

Spacious layouts

Strong typography

Simple iconography

Premium animations

High-quality empty states

Skeleton loaders

Smooth transitions

Primary direction:

Premium visual dashboard + conversational AI.

Use a professional deep/navy base with sophisticated accents.

Do not make it childish.



53. MOBILE-FIRST

Design mobile first.

Every important action should be easy with one hand.

Job cards should be easily scannable.

Desktop should intelligently expand the layout, not simply stretch mobile pages.

Support:

Mobile

Tablet

Desktop



54. RTL

Arabic must be treated as a first-class language.

When Arabic is selected:

Entire layout switches to RTL.

Navigation orientation adapts.

Icons that imply direction adapt.

Typography remains professional.

Dates and numbers render correctly.

Do not simply translate English text while leaving the interface LTR.



55. DESIGN SYSTEM

Create reusable components for:

Buttons

Job cards

Match score

Status badges

Application cards

Chat bubbles

AI cards

CV cards

Modals

Dropdowns

Empty states

Tables

Skeleton loading

Notifications

Progress indicators

Profile completeness

Use a consistent spacing system and typography scale.



56. JOB MATCH VISUALIZATION

Match scores should feel important but not gimmicky.

Example:

91%

Excellent alignment

Experience █████████░ 92
Skills ████████░░ 84
Industry ██████████ 100
Location ██████████ 100

Then:

Strong Matches

✓ Regional operations
✓ Logistics leadership
✓ Team management

Potential Gap

⚠ SAP not listed on your CV



57. AGENT PERSONALITY

The AI should be:

Clear

Intelligent

Friendly

Concise

Professional

Proactive

Do not produce huge paragraphs unless requested.

Ask one useful question instead of interrogating the user.

Avoid generic statements such as:

“How may I assist you today?”

The AI should know context.

Example:

“محمد، لقيتلك اليوم 3 وظائف فوق 85%. أقوى واحدة Operations Director في دبي بنسبة تطابق 92%. تحب أشوفلك ليش مناسبة؟”



58. DO NOT OVER-AUTOMATE WITHOUT PERMISSION

Never send applications, modify critical profile information, or permanently change important user settings without appropriate permission.

Default application behavior:

AI prepares everything
↓
User reviews
↓
User approves
↓
Application proceeds



59. ANALYTICS

Instrument important product events.

Examples:

signup_completed

cv_uploaded

cv_created

profile_completed

job_viewed

job_saved

job_rejected

job_interested

application_prepared

application_approved

application_submitted

interview_added

offer_received

subscription_started

subscription_cancelled

These should later support product analytics and funnel analysis.



60. MVP PRIORITIES

Do NOT try to fully implement every future capability immediately.

Prioritize a stable MVP.

Phase 1

Authentication
Onboarding
CV upload/parsing
Career Profile
Career Brain
Jobs database
Job discovery architecture
Job matching
Match explanations
Home dashboard
Jobs page
AI Agent interface
Save / Interested / Skip
Application tracker

Phase 2

CV Builder
CV improvement
Tailored CVs
Application preparation
Cover letters
Application questions
Notifications

Phase 3

Application automation
Employer integrations
Interview Coach
Voice

Phase 4

Career Roadmap
Career Gap Analysis
Salary Intelligence
Advanced learning
Advanced automation

However, design the database and system architecture now so later phases do not require rebuilding the product.



61. IMPORTANT ENGINEERING RULE

Before modifying an existing project:

Inspect the current project structure.

Inspect database schema.

Inspect existing authentication.

Inspect existing components.

Inspect existing routes.

Inspect styling/design system.

Reuse functioning code when appropriate.

Do not unnecessarily rewrite working functionality.

Identify conflicts with this specification.

Implement incrementally.

Do NOT blindly generate a completely new project if an existing working foundation exists.



62. DEVELOPMENT METHOD

Do not attempt to build the whole product in one uncontrolled generation.

Create modules in a logical order.

Start by establishing:

Database architecture

Authentication

Core navigation/design system

Career Profile

Onboarding

CV system

Job schema

Jobs UI

Matching engine

Agent architecture

Applications

Admin

Subscriptions

Advanced features

Each module must integrate with the same database architecture.



63. QUALITY STANDARD

Treat Shoghlni as a real SaaS product intended for tens of thousands or eventually hundreds of thousands of users.

Do not build it as a prototype demo.

Code should be:

Modular

Typed

Maintainable

Secure

Scalable

Reusable

Documented where needed

Avoid hardcoded mock data once the relevant backend exists.



64. FINAL PRODUCT FEELING

A user should be able to join Shoghlni, upload their CV, answer a few questions, and then feel:

“This AI understands my career, searches on my behalf, filters out bad jobs, tells me exactly which opportunities fit me, prepares my applications and keeps track of everything.”

That is the core of the product.

Shoghlni should not feel like:

“Here are 1,000 jobs. Search through them yourself.”

It should feel like:

“I already searched 1,000 jobs for you. These 3 are worth your attention.”

That distinction must guide every product, UI, AI and engineering decision.



INITIAL IMPLEMENTATION REQUEST

First inspect the existing Lovable project and identify what is already implemented.

Then produce:

Current architecture assessment

Database/schema assessment

Missing features compared with this specification

Recommended implementation order

Any architecture problems that should be corrected before continuing

After that, begin implementation starting with the fundamental architecture.

Do not randomly redesign or rebuild completed sections.

Do not remove working functionality unless there is a clear architectural reason.

Maintain a written implementation checklist and mark modules complete as they are finished.

The final system should be structured so future AI models, job providers, payment providers, application integrations and voice providers can be swapped without rebuilding the core platform.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8a40811b-a323-4891-884e-985524c480a7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
