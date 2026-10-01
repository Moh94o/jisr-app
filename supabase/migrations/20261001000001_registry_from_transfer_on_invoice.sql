/* العامل يدخل السجل لحظةَ إصدار فاتورة نقل الكفالة (ربط الحسبة بفاتورةٍ سارية)،
   لا عند إنجاز مرحلة «مقيم» وحدها (بلاغ المستخدم 2026-10-01: عمّال فواتيرهم
   مدفوعة ولا يظهرون في السجل لأن المراحل لم تُعلَّم بعد).
   · دخول الفاتورة = **إضافةُ من ليس في السجل فقط** ببياناته الحاليّة (انتهاء إقامته
     الفعليّ لا المتوقَّع بعد النقل) — ولا يمسّ عاملاً قائماً.
   · إنجاز «مقيم» يبقى كما كان: يحدّث العامل ببيانات ما بعد النقل. */
create or replace function public.registry_from_transfer()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_now  text := new.stage_data->'muqeem'->>'status';
  v_old  text := case when tg_op = 'UPDATE' then old.stage_data->'muqeem'->>'status' else null end;
  v_done boolean;
  v_inv  boolean;
  v_iq   text := nullif(regexp_replace(coalesce(new.iqama_number, ''), '[^0-9]', '', 'g'), '');
  v_fac  uuid;
  v_br   uuid;
  v_dead boolean := false;
  v_occ  uuid;
  v_occ_ar text;
  v_wid  uuid;
begin
  v_done := v_now = 'done' and v_old is distinct from 'done';
  v_inv  := new.invoice_id is not null
            and (tg_op = 'INSERT' or old.invoice_id is distinct from new.invoice_id
                 or old.iqama_number is distinct from new.iqama_number);
  if not (v_done or v_inv) then return new; end if;
  if new.deleted_at is not null or new.cancelled_at is not null then return new; end if;

  -- المنشأة الجديدة (الكفيل الجديد) ومكتب الفاتورة وحالتها
  if new.invoice_id is not null then
    select sr.facility_id, i.branch_id,
           (i.deleted_at is not null or coalesce(st.code, '') = 'cancelled')
      into v_fac, v_br, v_dead
      from invoices i
      left join service_requests sr on sr.id = i.service_request_id
      left join lookup_items st on st.id = i.status_id
     where i.id = new.invoice_id;
  end if;

  if not v_done then
    -- دخولٌ بالفاتورة: من ليس في السجل فقط، وبفاتورةٍ سارية
    if v_iq is null or coalesce(v_dead, false) then return new; end if;
    if exists (select 1 from workers where deleted_at is null and iqama_number = v_iq) then return new; end if;
    v_wid := registry_upsert_worker(
      p_origin => 'transfer',
      p_ref    => new.id,
      p_iqama  => new.iqama_number,
      p_name_ar => new.worker_name,
      p_birth  => new.dob,
      p_gender => new.gender,
      p_nationality_id => new.nationality_id,
      p_nationality_ar => new.nationality,
      p_occupation_id  => new.occupation_id,
      p_occupation_ar  => new.occupation_name_ar,
      p_phone  => new.phone,
      p_iqama_expiry => new.iqama_expiry_gregorian,
      p_work_permit_expiry => new.work_permit_expiry,
      p_insurance_company  => new.insurance_company,
      p_insurance_expiry   => new.insurance_expiry,
      p_facility_id => v_fac,
      p_branch_id   => coalesce(v_br, new.branch_id));
    return new;
  end if;

  -- المهنة بعد النقل: الجديدة إن غُيِّرت، وما تكتبه المرحلة يسبق المحسوب
  v_occ := coalesce(nullif(new.stage_data->'muqeem'->>'occupation_id', '')::uuid,
                    case when coalesce(new.change_profession, false) then new.new_occupation_id end,
                    new.occupation_id);
  v_occ_ar := coalesce(fn_nz(new.stage_data->'muqeem'->>'occupation_name_ar'),
                       case when coalesce(new.change_profession, false) then new.new_occupation_name_ar end,
                       new.occupation_name_ar);

  v_wid := registry_upsert_worker(
    p_origin => 'transfer',
    p_ref    => new.id,
    p_iqama  => new.iqama_number,
    p_name_ar => new.worker_name,
    p_birth  => new.dob,
    p_gender => new.gender,
    p_nationality_id => new.nationality_id,
    p_nationality_ar => new.nationality,
    p_occupation_id  => v_occ,
    p_occupation_ar  => v_occ_ar,
    p_phone  => new.phone,
    p_iqama_expiry => coalesce(fn_dt(new.stage_data->'muqeem'->>'iqama_expiry'),
                               new.expected_expiry_date, new.iqama_expiry_gregorian),
    p_work_permit_expiry => coalesce(fn_dt(new.stage_data->'work_permit'->>'expiry'), new.work_permit_expiry),
    p_insurance_company  => coalesce(fn_nz(new.stage_data->'insurance'->>'company'), new.insurance_company),
    p_insurance_expiry   => coalesce(fn_dt(new.stage_data->'insurance'->>'expiry'), new.insurance_expiry),
    p_facility_id => v_fac,
    p_branch_id   => new.branch_id);
  return new;
exception when others then
  -- تسجيلُ العامل أثرٌ بعد المعاملة، لا شرطٌ لها: لا يُسقِط إنجاز النقل
  raise warning 'registry_from_transfer failed for % : %', new.id, sqlerrm;
  return new;
end $function$;

drop trigger if exists trg_registry_from_transfer on public.transfer_calculation;
create trigger trg_registry_from_transfer
  after insert or update of stage_data, invoice_id, iqama_number on public.transfer_calculation
  for each row execute function registry_from_transfer();
