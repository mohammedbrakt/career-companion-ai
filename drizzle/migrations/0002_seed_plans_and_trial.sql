insert into public.subscription_plans (code, tier, name, description, features, limits, trial_days, sort_order, is_active)
values
  ('free_trial', 'free_trial',
   '{"en":"Free Trial","ar":"تجربة مجانية"}'::jsonb,
   '{"en":"Try the full agent for a limited period.","ar":"جرّب الوكيل بالكامل لفترة محدودة."}'::jsonb,
   '{"en":["Job discovery","Match scores","CV analysis"],"ar":["اكتشاف الوظائف","نسب التطابق","تحليل السيرة الذاتية"]}'::jsonb,
   '{"jobs_analyzed":50,"ai_messages":50,"cv_tailoring":3,"applications":5,"interview_sessions":1}'::jsonb,
   14, 1, true),
  ('basic', 'basic',
   '{"en":"Basic","ar":"أساسي"}'::jsonb,
   '{"en":"Daily matches and CV analysis.","ar":"وظائف يومية وتحليل للسيرة الذاتية."}'::jsonb,
   '{"en":["Daily matches","CV analysis","Application tracker"],"ar":["وظائف يومية","تحليل السيرة","متابعة الطلبات"]}'::jsonb,
   '{"jobs_analyzed":200,"ai_messages":200,"cv_tailoring":10,"applications":25,"interview_sessions":2}'::jsonb,
   0, 2, true),
  ('pro', 'pro',
   '{"en":"Pro","ar":"احترافي"}'::jsonb,
   '{"en":"Tailored CVs, cover letters and interview prep.","ar":"سير ذاتية مخصصة وخطابات تقديم وتحضير للمقابلات."}'::jsonb,
   '{"en":["Everything in Basic","Tailored CVs","Cover letters","Interview coach"],"ar":["كل مزايا الأساسي","سير ذاتية مخصصة","خطابات تقديم","مدرب المقابلات"]}'::jsonb,
   '{"jobs_analyzed":1000,"ai_messages":1000,"cv_tailoring":100,"applications":150,"interview_sessions":20}'::jsonb,
   0, 3, true),
  ('premium', 'premium',
   '{"en":"Premium","ar":"بريميوم"}'::jsonb,
   '{"en":"Maximum automation and unlimited coaching.","ar":"أقصى أتمتة وتدريب بلا حدود."}'::jsonb,
   '{"en":["Everything in Pro","Priority discovery","Assisted applications","Advanced search"],"ar":["كل مزايا الاحترافي","اكتشاف ذو أولوية","تقديم مدعوم","بحث متقدم"]}'::jsonb,
   '{"jobs_analyzed":-1,"ai_messages":-1,"cv_tailoring":-1,"applications":-1,"interview_sessions":-1}'::jsonb,
   0, 4, true)
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      features = excluded.features,
      limits = excluded.limits,
      trial_days = excluded.trial_days,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active;

create or replace function public.start_free_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.subscription_plans%rowtype;
begin
  select * into v_plan from public.subscription_plans where code = 'free_trial' limit 1;
  if found then
    insert into public.subscriptions (user_id, plan_id, status, trial_ends_at)
    values (new.id, v_plan.id, 'trialing', now() + make_interval(days => v_plan.trial_days))
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_start_trial on auth.users;
create trigger on_auth_user_start_trial
  after insert on auth.users
  for each row execute function public.start_free_trial();

insert into public.subscriptions (user_id, plan_id, status, trial_ends_at)
select u.id, sp.id, 'trialing', now() + make_interval(days => sp.trial_days)
from auth.users u
cross join (select id, trial_days from public.subscription_plans where code = 'free_trial' limit 1) sp
where not exists (select 1 from public.subscriptions s where s.user_id = u.id);
