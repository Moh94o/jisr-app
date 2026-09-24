-- ═══════════════════════════════════════════════════════════════════════════
-- سجلّ الخلايا في «جداول العمل» — مُطبَّق على الإنتاج 2026-09-21
-- (نسخةٌ مرجعية لِما طُبِّق؛ آمنٌ إعادة تشغيله)
--
-- لماذا محفِّزٌ لا كتابةٌ من الواجهة: الشيت يُكتب من عشرين مسلكاً (حفظ دفعي ·
-- لصق · جلب · ترحيل · استيراد)، فكتابة السجلّ في كلٍّ منها تعني ثقوباً في
-- المسالك المنسيّة. المحفِّز يلتقطها جميعاً بفارق الـjsonb قبل/بعد.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ops_sheet_cell_history (
  id         bigserial primary key,
  view_key   text not null,
  row_key    text not null,
  col_key    text not null,
  -- set = خانةٌ كانت فارغة فمُلئت · edit = قيمةٌ تبدّلت · clear = قيمةٌ مُسحت
  op         text not null check (op in ('set','edit','clear')),
  old_value  text,
  new_value  text,
  by_id      uuid,
  by_name    text,
  at         timestamptz not null default now()
);

create index if not exists ops_sheet_cell_history_cell_idx
  on public.ops_sheet_cell_history (view_key, row_key, col_key, at desc);
create index if not exists ops_sheet_cell_history_who_idx
  on public.ops_sheet_cell_history (by_id, at desc);
create index if not exists ops_sheet_cell_history_view_idx
  on public.ops_sheet_cell_history (view_key, at desc);

alter table public.ops_sheet_cell_history enable row level security;
-- الاطّلاع لكل من يرى الجدول (طلب صريح). ولا سياسة كتابة: الكاتب هو المحفِّز.
drop policy if exists osch_read on public.ops_sheet_cell_history;
create policy osch_read on public.ops_sheet_cell_history for select to authenticated using (true);
grant select on public.ops_sheet_cell_history to authenticated;

create or replace function public.ops_jsonb_text(v jsonb)
returns text language sql immutable as $$
  select case
    when v is null or jsonb_typeof(v) = 'null' then null
    when jsonb_typeof(v) = 'string' then v #>> '{}'
    else v::text end
$$;

create or replace function public.ops_sheet_cell_history_tg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  o       jsonb := coalesce(case when tg_op = 'INSERT' then '{}'::jsonb else old.data end, '{}'::jsonb);
  n       jsonb := coalesce(new.data, '{}'::jsonb);
  k       text;
  ov      text;
  nv      text;
  st      jsonb;
  st_at   timestamptz;
  c_id    uuid;
  c_name  text;
  fb_id   uuid;
  fb_name text;
begin
  if tg_op = 'UPDATE' and o = n then return new; end if;

  fb_id := coalesce(new.updated_by, new.created_by, public.current_app_user_id());
  if fb_id is not null then
    select coalesce(p.name_ar, p.name_en, u.email::text)
      into fb_name
      from public.users u
      left join public.persons p on p.id = u.person_id
     where u.id = fb_id;
  end if;

  for k in select jsonb_object_keys(n) union select jsonb_object_keys(o) loop
    continue when left(k, 2) = '__';           -- `__m` وأخواتها بياناتُ خدمة
    ov := public.ops_jsonb_text(o -> k);
    nv := public.ops_jsonb_text(n -> k);
    continue when ov is not distinct from nv;

    /* ختم الخانة أدقّ من ختم الصفّ، لكن لا يُوثَق به إلا طازجاً: مسلكٌ يغيّر
       القيمة ولا يجدّد الختم يترك ختماً قديماً فيُنسب تعديلٌ جديد لصاحب
       الإدخال الأول. */
    st := n -> '__m' -> k;
    st_at := case when (st ->> 'at') ~ '^\d{4}-\d{2}-\d{2}' then (st ->> 'at')::timestamptz end;
    if st_at is null or st_at < now() - interval '2 minutes' or st_at > now() + interval '2 minutes' then
      st := null; st_at := null;
    end if;
    c_id := case when (st ->> 'i') ~ '^[0-9a-fA-F-]{36}$' then (st ->> 'i')::uuid end;
    c_name := nullif(st ->> 'u', '');

    insert into public.ops_sheet_cell_history
      (view_key, row_key, col_key, op, old_value, new_value, by_id, by_name, at)
    values (new.view_key, new.row_key, k,
      case when coalesce(nv, '') = '' then 'clear'
           when coalesce(ov, '') = '' then 'set'
           else 'edit' end,
      left(ov, 2000), left(nv, 2000),
      coalesce(c_id, fb_id), coalesce(c_name, fb_name),
      coalesce(st_at, now()));
  end loop;

  return new;
end
$$;

drop trigger if exists ops_sheet_rows_cell_history on public.ops_sheet_rows;
create trigger ops_sheet_rows_cell_history
  after insert or update of data on public.ops_sheet_rows
  for each row execute function public.ops_sheet_cell_history_tg();
