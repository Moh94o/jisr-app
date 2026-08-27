-- ─────────────────────────────────────────────────────────────────────────────
-- إلغاء تأشيرات محدّدة من فاتورة — عملية ذرّية واحدة
--
-- الخلفية: مسار «إلغاء تأشيرات محدّدة» في InvoicePage كان يكتب على أربع طاولات
-- بأربع رحلات شبكة منفصلة (دفعة سالبة → أقساط → حذف التأشيرات وإنقاص الكمية →
-- الفاتورة). أي انقطاع في المنتصف — أو كتابةٌ يُسقطها RLS بصمت فتعود بصفر صفوف
-- بلا خطأ — يترك الفاتورة نصف معدَّلة: التأشيرات محذوفة والكمية منقوصة بينما
-- الإجمالي والأقساط وسجلّ الإلغاء على حالها (حدث فعلياً في الفاتورة 5525809956).
--
-- الحلّ: دالة واحدة SECURITY DEFINER تنفّذ كل الخطوات في معاملة واحدة. إما أن
-- تنجح كلها أو لا شيء. الصلاحيات تُفحص صراحةً وتُرفَع كخطأ (لا سقوط صامت)،
-- والثوابت تُتحقّق قبل الالتزام:
--   • إجمالي الفاتورة = مجموع إجمالي أقساطها الحيّة
--   • لا يقل مسدَّد أي قسط عن صفر ولا يتجاوز إجماليه
--   • المُعاد ≤ المدفوع الحالي
-- `invoices.paid_amount` يبقى ملك المحفّز trg_sync_invoice_paid_amount — لا نكتبه.
-- ─────────────────────────────────────────────────────────────────────────────

-- توقيع أقدم أُسقِط أثناء التطوير (كانت الكمية تُمرَّر من العميل بدل اشتقاقها).
drop function if exists public.cancel_invoice_visas(uuid, uuid[], text, jsonb, numeric, uuid, text, numeric, numeric, integer, jsonb);

create or replace function public.cancel_invoice_visas(
  p_invoice_id           uuid,
  p_visa_ids             uuid[],
  p_reason               text,
  p_inst_ops             jsonb,    -- [{id, new_total, new_paid, del}] بالضبط كما عُرض في الملخّص
  p_refund_amount        numeric,
  p_refund_method_id     uuid,
  p_refund_note          text,
  p_expected_total       numeric,  -- إجمالي الفاتورة وقت بناء الخطة (حارس تزامن)
  p_new_total            numeric,
  p_cancel_log_entry     jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid           uuid := current_app_user_id();
  v_now           timestamptz := now();
  v_inv           invoices%rowtype;
  v_status_code   text;
  v_op            jsonb;
  v_inst          installments%rowtype;
  v_new_total     numeric;
  v_new_paid      numeric;
  v_del           boolean;
  v_visa_count    integer := coalesce(cardinality(p_visa_ids), 0);
  v_deleted_visas integer;
  v_old_inst_sum  numeric;
  v_new_inst_sum  numeric;
  v_alive_inst    integer;
  v_alive_visas   integer;
  v_paid          numeric;
  v_status_id     uuid;
  v_refund        numeric := round(coalesce(p_refund_amount, 0)::numeric, 2);
begin
  if v_uid is null then
    raise exception 'جلسة غير صالحة — أعد تسجيل الدخول' using errcode = '28000';
  end if;
  if v_visa_count = 0 then
    raise exception 'اختر تأشيرة واحدة على الأقل' using errcode = '22023';
  end if;

  -- قفل صفّ الفاتورة: يمنع جلستين من إلغاء تأشيرات على نفس الفاتورة معاً.
  select * into v_inv from invoices where id = p_invoice_id and deleted_at is null for update;
  if not found then
    raise exception 'الفاتورة غير موجودة' using errcode = 'P0002';
  end if;

  -- الصلاحية تُفحص صراحةً: الدالة DEFINER فتتجاوز RLS، فلا بديل عن فحصٍ يرفع خطأ.
  if not (current_user_is_super_admin()
          or current_user_can_on_branch('invoices.edit', v_inv.branch_id)) then
    raise exception 'لا تملك صلاحية تعديل هذه الفاتورة' using errcode = '42501';
  end if;
  -- حذف صفوف التأشيرات محصور بالمدير العام/المسؤول الأعلى (نفس شرط سياسة الحذف).
  if not (current_user_is_super_admin() or is_general_manager()) then
    raise exception 'إلغاء التأشيرات متاح للمدير العام فقط' using errcode = '42501';
  end if;

  select code into v_status_code from lookup_items where id = v_inv.status_id;
  if v_status_code = 'cancelled' then
    raise exception 'الفاتورة ملغاة بالفعل' using errcode = '22023';
  end if;

  -- حارس التزامن: الخطة بُنيت على إجماليٍّ قد يكون تغيّر بين العرض والحفظ.
  if p_expected_total is not null
     and abs(coalesce(v_inv.total_amount, 0) - p_expected_total) > 0.005 then
    raise exception 'تغيّر إجمالي الفاتورة أثناء العملية — أعد فتح النافذة وحاول ثانية'
      using errcode = '40001';
  end if;

  select coalesce(sum(total_amount), 0) into v_old_inst_sum
    from installments where invoice_id = p_invoice_id and deleted_at is null;

  -- ① تطبيق خطة الأقساط كما عُرضت في الملخّص تماماً (لا إعادة اشتقاق هنا).
  for v_op in select * from jsonb_array_elements(coalesce(p_inst_ops, '[]'::jsonb))
  loop
    select * into v_inst
      from installments
     where id = (v_op->>'id')::uuid and invoice_id = p_invoice_id and deleted_at is null;
    if not found then
      raise exception 'قسط غير موجود أو محذوف مسبقاً (%) — أعد فتح النافذة',
        v_op->>'id' using errcode = '40001';
    end if;

    v_del := coalesce((v_op->>'del')::boolean, false);
    if v_del then
      update installments
         set deleted_at = v_now, deleted_by = v_uid, updated_at = v_now,
             visa_application_id = null
       where id = v_inst.id;
    else
      v_new_total := round(coalesce((v_op->>'new_total')::numeric, 0), 2);
      v_new_paid  := round(coalesce((v_op->>'new_paid')::numeric, 0), 2);
      if v_new_total < -0.005 or v_new_paid < -0.005 then
        raise exception 'قيمة سالبة في خطة القسط %', v_inst.id using errcode = '22023';
      end if;
      if v_new_paid > v_new_total + 0.005 then
        raise exception 'مسدَّد القسط % يتجاوز إجماليه الجديد', v_inst.id using errcode = '22023';
      end if;
      update installments
         set total_amount = v_new_total,
             paid_amount  = v_new_paid,
             paid_date    = case when v_new_paid <= 0.005 then null
                                 when v_new_paid >= v_new_total - 0.005 then coalesce(paid_date, v_now)
                                 else paid_date end,
             updated_at   = v_now
       where id = v_inst.id;
    end if;
  end loop;

  -- ② إعادة ما دُفع ضمن المحذوف — دفعة سالبة واحدة (المحفّز يضبط paid_amount).
  if v_refund > 0.005 then
    if v_refund > coalesce(v_inv.paid_amount, 0) + 0.005 then
      raise exception 'المبلغ المُعاد أكبر من المدفوع' using errcode = '22023';
    end if;
    if p_refund_method_id is null then
      raise exception 'تعذر تحديد طريقة إعادة المبلغ' using errcode = '22023';
    end if;
    insert into payments (invoice_id, installment_id, service_request_id, branch_id,
                          amount, payment_method_id, is_valid, notes, created_by)
    select p_invoice_id,
           (select id from installments
             where invoice_id = p_invoice_id and deleted_at is null
             order by installment_order limit 1),
           v_inv.service_request_id, v_inv.branch_id,
           -v_refund, p_refund_method_id, true, p_refund_note, v_uid;
  end if;

  -- ③ فكّ الارتباط ثم حذف صفوف التأشيرات وإنقاص كمية الطلب.
  update installments set visa_application_id = null, updated_at = v_now
   where invoice_id = p_invoice_id and visa_application_id = any(p_visa_ids);

  with gone as (
    delete from visa_applications
     where id = any(p_visa_ids)
       and service_request_id = v_inv.service_request_id
    returning 1
  ) select count(*) into v_deleted_visas from gone;
  if v_deleted_visas <> v_visa_count then
    raise exception 'تعذّر حذف كل التأشيرات المختارة (% من %) — أعد فتح النافذة',
      v_deleted_visas, v_visa_count using errcode = '40001';
  end if;

  -- الكمية تُشتقّ من العدّ الفعلي بعد الحذف لا بالطرح — فتُصلِح أي انحراف قديم.
  -- قيدا قاعدة البيانات يفرضان quantity >= 1 و service_quantity >= 1، فنُثبّت الحدّ
  -- الأدنى عند 1 حتى حين لا تبقى تأشيرة (الفاتورة نفسها تُلغى في تلك الحالة).
  -- الكود القديم كان يكتب 0 فتفشل الكتابة بقيد CHECK بعد أن حُذفت التأشيرات فعلاً.
  select count(*) into v_alive_visas
    from visa_applications
   where service_request_id = v_inv.service_request_id and deleted_at is null;

  if v_inv.service_request_id is not null then
    update service_requests
       set quantity = greatest(1, v_alive_visas), updated_at = v_now
     where id = v_inv.service_request_id;
  end if;

  -- ④ الثوابت قبل كتابة الفاتورة.
  select coalesce(sum(total_amount), 0), count(*) into v_new_inst_sum, v_alive_inst
    from installments where invoice_id = p_invoice_id and deleted_at is null;
  -- لو كانت الفاتورة متّسقة قبل العملية، يجب أن تبقى متّسقة بعدها.
  if abs(v_old_inst_sum - coalesce(v_inv.total_amount, 0)) <= 0.005
     and abs(v_new_inst_sum - coalesce(p_new_total, 0)) > 0.005 then
    raise exception 'خطة غير متّسقة: مجموع الأقساط % لا يساوي الإجمالي الجديد %',
      v_new_inst_sum, p_new_total using errcode = '22023';
  end if;

  -- paid_amount مملوك للمحفّز — نقرؤه بعد إدراج الدفعة السالبة لا نكتبه.
  select paid_amount into v_paid from invoices where id = p_invoice_id;

  if v_alive_visas = 0 or coalesce(p_new_total, 0) <= 0.005 then
    select li.id into v_status_id from lookup_items li
      join lookup_categories lc on lc.id = li.category_id
     where lc.category_key = 'invoice_status' and li.code = 'cancelled';
  elsif coalesce(v_paid, 0) >= coalesce(p_new_total, 0) - 0.005 then
    select li.id into v_status_id from lookup_items li
      join lookup_categories lc on lc.id = li.category_id
     where lc.category_key = 'invoice_status' and li.code = 'fully_paid';
  else
    select li.id into v_status_id from lookup_items li
      join lookup_categories lc on lc.id = li.category_id
     where lc.category_key = 'invoice_status' and li.code = 'active';
  end if;

  update invoices
     set total_amount      = round(coalesce(p_new_total, 0), 2),
         service_quantity  = greatest(1, v_alive_visas),
         installments_count = v_alive_inst,
         status_id         = coalesce(v_status_id, status_id),
         cancel_log        = coalesce(cancel_log, '[]'::jsonb)
                             || jsonb_build_array(
                                  coalesce(p_cancel_log_entry, '{}'::jsonb)
                                  || jsonb_build_object('at', to_jsonb(v_now), 'by', to_jsonb(v_uid))
                                ),
         last_activity_at  = v_now,
         updated_at        = v_now,
         updated_by        = v_uid
   where id = p_invoice_id;

  select paid_amount into v_paid from invoices where id = p_invoice_id;

  return jsonb_build_object(
    'invoice_id',        p_invoice_id,
    'visas_cancelled',   v_deleted_visas,
    'visas_remaining',   v_alive_visas,
    'total',             round(coalesce(p_new_total, 0), 2),
    'paid',              coalesce(v_paid, 0),
    'refunded',          v_refund,
    'installments',      v_alive_inst,
    'all_gone',          (v_alive_visas = 0 or coalesce(p_new_total, 0) <= 0.005),
    'reason',            p_reason
  );
end;
$$;

revoke all on function public.cancel_invoice_visas(uuid, uuid[], text, jsonb, numeric, uuid, text, numeric, numeric, jsonb) from public;
grant execute on function public.cancel_invoice_visas(uuid, uuid[], text, jsonb, numeric, uuid, text, numeric, numeric, jsonb) to authenticated;

comment on function public.cancel_invoice_visas is
  'إلغاء تأشيرات محدّدة من فاتورة في معاملة واحدة: أقساط + دفعة الاسترجاع + حذف التأشيرات + كمية الطلب + الفاتورة وسجلّ الإلغاء. إما الكل أو لا شيء.';
