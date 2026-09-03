-- ═══ محرّك كشف تكرار العملاء ══════════════════════════════════════════════
-- يبني `client_dupe_candidates` من الصفر. التجميع التلقائي مقصور على أدلّة
-- قاطعة (score ≥ 90)؛ ما دونها يظهر «للمراجعة» ولا يُجمَّع، لأن الضمّ متعدٍّ:
-- حافّةٌ ظنّية واحدة تسحب عشرات السجلّات إلى مجموعة كاذبة (جُرِّب: مجموعة من
-- 305 سجلّات تسلسلت كلُّها على مقطع «حسين»).
create or replace function public.refresh_client_dupes()
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $fn$
declare v_groups int; v_members int; v_review int;
begin
  if not public.jisr_dupes_allowed() then
    raise exception 'غير مصرّح — كشف تكرار العملاء للمدير العام فقط';
  end if;

  /* ① الأساس: كل عميل حيّ ببياناته مُكمَّلةً من العمالة والأشخاص.
     الترتيب: قيمة العميل نفسه، ثم العامل صاحب نفس الهوية، ثم العامل المطابق
     بالاسم (متى كان وحيداً)، ثم سجلّ الشخص. */
  create temp table _c on commit drop as
  with base as (
    select c.id, c.name_ar, c.name_en, c.id_number, c.phone, c.person_id, c.branch_id, c.created_at,
           public.jisr_clean_id(c.id_number) as own_cid
    from public.clients c where c.deleted_at is null
  ),
  wk as (
    select distinct on (public.jisr_clean_id(w.iqama_number))
           public.jisr_clean_id(w.iqama_number) as cid,
           w.name_ar, w.name_en, w.iqama_number,
           coalesce(nullif(w.phone, ''), w.official_mobile) as phone
    from public.workers w
    where w.deleted_at is null and public.jisr_clean_id(w.iqama_number) is not null
    order by public.jisr_clean_id(w.iqama_number), w.updated_at desc nulls last
  ),
  wk_name as (
    select n, min(name_ar) as name_ar, min(name_en) as name_en,
           min(iqama_number) as iqama_number, min(phone) as phone
    from (
      select public.jisr_norm_ar(w.name_ar) as n, w.name_ar, w.name_en, w.iqama_number,
             coalesce(nullif(w.phone, ''), w.official_mobile) as phone
      from public.workers w
      where w.deleted_at is null and public.jisr_norm_ar(w.name_ar) is not null
    ) x group by n having count(*) = 1
  ),
  pr as (
    select p.id, p.name_ar, p.name_en, p.id_number, p.phone_primary,
           public.jisr_clean_id(p.id_number) as cid
    from public.persons p where p.deleted_at is null
  ),
  pr_cid as (select distinct on (cid) * from pr where cid is not null order by cid, id)
  select
    b.id,
    coalesce(nullif(b.name_ar, ''), w.name_ar, wn.name_ar, p1.name_ar, p2.name_ar,
             case when b.name_en ~ '[ء-ي]' then b.name_en end)                       as name_ar,
    coalesce(case when b.name_en  !~ '[ء-ي]' then nullif(b.name_en, '')  end,
             case when w.name_en   !~ '[ء-ي]' then nullif(w.name_en, '')  end,
             case when wn.name_en  !~ '[ء-ي]' then nullif(wn.name_en, '') end,
             case when p1.name_en  !~ '[ء-ي]' then nullif(p1.name_en, '') end,
             case when p2.name_en  !~ '[ء-ي]' then nullif(p2.name_en, '') end)       as name_en,
    coalesce(nullif(b.id_number, ''), w.iqama_number, wn.iqama_number,
             p1.id_number, p2.id_number)                                             as id_number,
    coalesce(nullif(b.phone, ''), w.phone, wn.phone, p1.phone_primary, p2.phone_primary) as phone,
    b.branch_id, b.created_at, b.person_id,
    (w.cid is not null or wn.n is not null)                                          as is_worker,
    ((b.name_ar is not null)::int
      + (b.name_en is not null and b.name_en !~ '[ء-ي]')::int
      + (b.id_number is not null)::int * 2
      + (b.phone is not null)::int)                                                  as own_completeness,
    (b.id_number is not null and b.own_cid is null)                                  as bad_id
  from base b
  left join wk      w  on w.cid = b.own_cid
  left join wk_name wn on b.own_cid is null and wn.n = public.jisr_norm_ar(b.name_ar)
  left join pr      p1 on p1.id = b.person_id
  left join pr_cid  p2 on b.person_id is null and p2.cid = b.own_cid;

  alter table _c add column cid text, add column ph text,
                 add column tar text[], add column ten text[],
                 add column nar text, add column nen text,
                 add column invoices int default 0;
  update _c set cid = public.jisr_clean_id(id_number),
                ph  = public.jisr_norm_phone(phone),
                tar = public.jisr_name_toks(name_ar, true),
                ten = public.jisr_name_toks(name_en, false),
                nar = public.jisr_norm_ar(name_ar),
                nen = public.jisr_norm_en(name_en)
  where true;   -- دور authenticated تحت safeupdate: UPDATE بلا WHERE مرفوض

  update _c c set invoices = s.n
  from (select client_id, count(*) n from public.service_requests
        where deleted_at is null and client_id is not null group by 1) s
  where s.client_id = c.id;

  create index on _c (cid);
  create index on _c (ph);
  analyze _c;

  /* ② العمّال المستفيدون في فواتير كل عميل — أقوى دليل عملي: سجلّان تظهر
     فيهما فواتير لنفس العامل هما عميلٌ واحد بسجلّين. */
  create temp table _ben on commit drop as
  select client_id, array_agg(distinct beneficiary_person_id) as bens
  from public.service_requests
  where deleted_at is null and client_id is not null and beneficiary_person_id is not null
  group by client_id;
  create index on _ben (client_id);

  create temp table _pair (a uuid, b uuid, score int, reason text, ev jsonb) on commit drop;

  -- (أ) نفس رقم الهوية = تكرار قاطع
  insert into _pair (a, b, score, reason, ev)
  select least(x.id, y.id), greatest(x.id, y.id), 100, 'نفس رقم الهوية',
         jsonb_build_object('same_id', true)
  from _c x join _c y on y.cid = x.cid and y.id > x.id
  where x.cid is not null;

  -- (ب) نفس الجوال — يُحسَم بالاسم؛ وتعارض الهوية يوقفه إلا أن يكون خطأ خانة
  insert into _pair (a, b, score, reason, ev)
  select t.a, t.b,
    case
      when idc and sim >= 0.80 and levenshtein(acid, bcid) <= 2 then 95
      when idc and sim >= 0.80                                  then 70
      when idc                                                  then 30
      when sim >= 0.60                                          then 92
      when acid is null and bcid is null                        then 45
      else 40 end,
    case
      when idc and sim >= 0.80 and levenshtein(acid, bcid) <= 2
        then 'نفس الجوال والاسم — الهويتان تختلفان بخانة أو خانتين (خطأ إدخال محتمل)'
      when idc and sim >= 0.80 then 'نفس الجوال والاسم متطابقان لكن الهويتان مختلفتان تماماً — يلزم التحقق'
      when idc                 then 'نفس الجوال وهويتان مختلفتان — غالباً شخصان (قريبان/نفس الكفيل)'
      when sim >= 0.60         then 'نفس الجوال + تطابق الاسم (' || round(sim * 100) || '%)'
      when acid is null and bcid is null then 'نفس الجوال، الاسمان مختلفان وكلاهما بلا هوية'
      else 'نفس الجوال، الاسمان مختلفان' end,
    jsonb_build_object('same_phone', true, 'name_sim', round(sim, 2))
  from (
    select x.id as a, y.id as b, x.cid as acid, y.cid as bcid,
      (x.cid is not null and y.cid is not null and x.cid <> y.cid
        and public.jisr_is_border(x.cid) = public.jisr_is_border(y.cid))            as idc,
      greatest(
        case when cardinality(x.tar) >= 2 and cardinality(y.tar) >= 2
             then greatest(public.jisr_tok_jac(x.tar, y.tar), similarity(x.nar, y.nar)::numeric) else 0 end,
        case when cardinality(x.ten) >= 2 and cardinality(y.ten) >= 2
             then greatest(public.jisr_tok_jac(x.ten, y.ten), similarity(x.nen, y.nen)::numeric) else 0 end
      )                                                                              as sim
    from _c x join _c y on y.ph = x.ph and y.id > x.id
    where x.ph is not null
      and (select count(*) from _c z where z.ph = x.ph) <= 10   -- رقم مكتب/معقّب لا يدلّ على شخص
  ) t;

  -- (ج) تشابه الاسم — الترشيح بمقاطع لا تتكرّر في أكثر من ٦٠ سجلّاً
  insert into _pair (a, b, score, reason, ev)
  select q.a, q.b,
    case
      when idc                                            then 65
      when sim >= 0.95 and samephone                      then 94
      when sim >= 0.95 and (acid is null or bcid is null) then 60
      when sim >= 0.95                                    then 62
      else 50 end,
    case
      when idc then 'الاسم مطابق ورقما الهوية يختلفان بخانة أو خانتين — خطأ إدخال محتمل'
      when sim >= 0.95 and samephone                      then 'الاسم مطابق + نفس الجوال'
      when sim >= 0.95 and (acid is null or bcid is null) then 'الاسم مطابق تماماً — أحدهما بلا رقم هوية'
      when sim >= 0.95                                    then 'الاسم مطابق تماماً (إقامة مقابل رقم حدود)'
      else 'الاسم متقارب (' || round(sim * 100) || '%)' end,
    jsonb_build_object('name_sim', round(sim, 2))
  from (
    select p.a, p.b, x.cid as acid, y.cid as bcid,
      (x.cid is not null and y.cid is not null and x.cid <> y.cid
        and public.jisr_is_border(x.cid) = public.jisr_is_border(y.cid)) as idc,
      (x.ph is not null and x.ph = y.ph)                                 as samephone,
      greatest(
        case when cardinality(x.tar) >= 2 and cardinality(y.tar) >= 2
             then greatest(public.jisr_tok_jac(x.tar, y.tar), similarity(x.nar, y.nar)::numeric) else 0 end,
        case when cardinality(x.ten) >= 2 and cardinality(y.ten) >= 2
             then greatest(public.jisr_tok_jac(x.ten, y.ten), similarity(x.nen, y.nen)::numeric) else 0 end
      ) as sim
    from (
      select distinct least(t1.id, t2.id) as a, greatest(t1.id, t2.id) as b
      from (select c.id, t.tok from _c c, lateral unnest(c.tar || c.ten) t(tok)) t1
      join (select c.id, t.tok from _c c, lateral unnest(c.tar || c.ten) t(tok)) t2
        on t2.tok = t1.tok and t2.id > t1.id
      where t1.tok in (
        select tok from (select t.tok from _c c, lateral unnest(c.tar || c.ten) t(tok)) z
        group by tok having count(*) <= 60)
    ) p
    join _c x on x.id = p.a join _c y on y.id = p.b
  ) q
  where sim >= 0.70
    and (not idc or (sim >= 0.85 and levenshtein(acid, bcid) <= 2));

  /* ③ دليل الفواتير يرفع الزوج إلى القطع */
  update _pair p set score = greatest(p.score, 96),
       reason = p.reason || ' + فواتير للعامل المستفيد نفسه',
       ev = p.ev || jsonb_build_object('shared_beneficiary', true)
  from _ben ba, _ben bb
  where ba.client_id = p.a and bb.client_id = p.b and ba.bens && bb.bens and p.score >= 40;

  /* ④ ما حسمه الإنسان بـ«ليسا نفس الشخص» يسقط ولا يعود */
  delete from _pair p using public.client_not_same n where n.a_id = p.a and n.b_id = p.b;

  create temp table _best on commit drop as
  select distinct on (a, b) a, b, score, reason, ev from _pair order by a, b, score desc;

  create temp table _edge on commit drop as select a, b from _best where score >= 90;

  /* ⑤ المجموعات = مكوّنات متّصلة على الحوافّ القاطعة وحدها */
  create temp table _cc on commit drop as
  with recursive u(node, root) as (
    select id, id from _c where id in (select a from _edge union select b from _edge)
    union
    select case when e.a = u.node then e.b else e.a end, u.root
    from u join _edge e on e.a = u.node or e.b = u.node
  )
  select node as client_id, public.min_uuid(root) as root from u group by node;

  /* ⑥ الكتابة: السجلّ الباقي = الأكثر فواتير ثم الأكمل بياناتٍ ثم الأقدم */
  truncate public.client_dupe_candidates;
  insert into public.client_dupe_candidates (group_no, client_id, is_primary, score, reason, evidence)
  select g.group_no, g.client_id,
         row_number() over (partition by g.root
           order by c.invoices desc, c.own_completeness desc, c.created_at asc) = 1,
         coalesce(g.score, 0), g.reason, coalesce(g.ev, '{}'::jsonb)
  from (
    select cc.client_id, cc.root,
           dense_rank() over (order by cc.root) as group_no,
           (select max(b.score) from _best b
             where (b.a = cc.client_id or b.b = cc.client_id) and b.score >= 90)  as score,
           (select string_agg(distinct b.reason, ' + ') from _best b
             where (b.a = cc.client_id or b.b = cc.client_id) and b.score >= 90)  as reason,
           (select jsonb_agg(distinct b.ev) from _best b
             where (b.a = cc.client_id or b.b = cc.client_id) and b.score >= 90)  as ev
    from _cc cc
  ) g join _c c on c.id = g.client_id;

  /* ⑦ أزواج المراجعة (45–89) تُحفظ كما هي — هي نصف قيمة الأداة: التكرار الذي
     لا يقطع به دليلٌ واحد يظلّ بحاجة إلى عينِ المدير. */
  truncate public.client_dupe_review;
  insert into public.client_dupe_review (a_id, b_id, score, reason, evidence)
  select b.a, b.b, b.score, b.reason, b.ev from _best b where b.score between 45 and 89;

  select count(distinct group_no), count(*) into v_groups, v_members
    from public.client_dupe_candidates;
  select count(*) into v_review from public.client_dupe_review;

  return jsonb_build_object('groups', v_groups, 'members', v_members, 'review_pairs', v_review,
                            'clients', (select count(*) from _c), 'at', now());
end;
$fn$;

grant execute on function public.refresh_client_dupes() to authenticated;
