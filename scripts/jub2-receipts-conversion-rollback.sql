-- ============================================================================
-- تراجع كامل عن تحويل سندات قبض JUB1 → فواتير فرع JUB2
-- تاريخ التحويل: 2026-08-23   |   الفرع: JUB2 = 5f9431b1-fda9-4738-9d9b-57c542cefb2b
-- كل صف أُنشئ يحمل وسم legacy_bubble_id = 'jub2conv:%'
-- شغّل الملف كاملاً بترتيبه (يحترم قيود المفاتيح الأجنبية).
-- ============================================================================

begin;

-- 0) أوقف محفّزات الواتساب حتى لا تُطلق إشعارات أثناء الحذف
alter table invoices disable trigger wa_invoices_aiu;
alter table payments disable trigger wa_payments_aiu;

-- 1) المرفقات (صور السندات المنسوخة على الدفعات والفواتير)
delete from attachments where legacy_bubble_id like 'jub2conv:att:%';
delete from attachments where legacy_bubble_id like 'jub2conv:iatt:%';

-- 2) ملاحظات التتبّع على الطلبات
delete from service_request_notes n
using service_requests sr
where n.service_request_id = sr.id
  and sr.legacy_bubble_id like 'jub2conv:sr:%'
  and n.note like 'محوَّلة آلياً من سندات قبض%';

-- 3) الدفعات ثم جدول الدفعات
delete from payments      where legacy_bubble_id like 'jub2conv:pay:%';
delete from installments  where legacy_bubble_id like 'jub2conv:inst:%';

-- 4) رسوم المعاملات التي زرعها المحفّز عند إنشاء الطلبات
delete from transaction_fees tf
using service_requests sr
where tf.service_request_id = sr.id and sr.legacy_bubble_id like 'jub2conv:sr:%';

-- 5) جداول التفاصيل
delete from visa_applications          where legacy_bubble_id like 'jub2conv:visa:%';
delete from transfer_applications      where legacy_bubble_id like 'jub2conv:tr:%';
delete from iqama_renewal_applications where legacy_bubble_id like 'jub2conv:ir:%';
delete from other_applications         where legacy_bubble_id like 'jub2conv:oth:%';

-- 6) ربط الوسطاء
delete from service_request_agents sra
using service_requests sr
where sra.service_request_id = sr.id and sr.legacy_bubble_id like 'jub2conv:sr:%';

-- 7) الفواتير ثم الطلبات
delete from invoices         where legacy_bubble_id like 'jub2conv:inv:%';
delete from service_requests where legacy_bubble_id like 'jub2conv:sr:%';

-- 8) العملاء والوسطاء المُنشأون في هذا التحويل فقط
--    (العملاء الذين طوبقوا على سجلات قائمة لم يُلمسوا أصلاً)
delete from clients where legacy_bubble_id like 'jub2conv:client:%';
delete from agents  where legacy_bubble_id like 'jub2conv:agent:%';

-- 9) أعِد سندات القبض إلى حالة «غير محوَّلة»
update jub1_receipts set converted_invoice_id = null, converted_at = null
where converted_invoice_id is not null;

-- 10) أعِد تشغيل المحفّزات
alter table invoices enable trigger wa_invoices_aiu;
alter table payments enable trigger wa_payments_aiu;

commit;

-- 11) جداول العمل المؤقتة (احذفها فقط إذا لم تعد تحتاج تقرير المراجعة)
-- drop table if exists _jub2_cc, _jub2_cc2, _jub2_autolink, _jub2_grp, _jub2_client_map,
--                      _jub2_agent_map, _jub2_inst, _jub2_inst2, _jub2_pay, _jub2_replan,
--                      _jub2_conflicts, _jub2_plan_mismatch, _jub2_name, _jub2_review;

-- ============================================================================
-- تراجع جزئي: إلغاء تعبئة أسماء العملاء من «اكسل المكتب» فقط (دون هدم التحويل)
-- ============================================================================
-- update clients
--   set name_ar = null, name_en = null,
--       notes   = 'مُنشأ من تحويل سندات قبض JUB1'
-- where legacy_bubble_id like 'jub2conv:client:%'
--   and notes like '%الاسم من اكسل المكتب%';
--
-- ولإلغاء الأضعف فقط (مطابقة رقم السند باسم مرشّح وحيد) دون الأقوى:
-- ... and notes like '%(unique_name)%';
--
-- بعد أي تراجع أعِد بناء نص البحث:
-- update invoices i set search_text = invoice_build_search_text(i.id)
-- where i.legacy_bubble_id like 'jub2conv:inv:%';
