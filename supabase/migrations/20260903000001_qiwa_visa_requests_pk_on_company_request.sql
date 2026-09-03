-- معرّف قوى للطلب (`id`) عابر ولا يصلح مفتاحاً.
--
-- التُقط حيّاً من api.qiwa.sa/visa-proxy/v3/visa-requests: نفس الطلبات الأربعة
-- رجعت في ثلاثة نداءات متتالية بمعرّفات مختلفة كلياً —
--   [69,83,11,4]  ثم  [25,27,7,68]  ثم  [74,10,58,75]
-- والمدى ضيّق (٣–٩٨). وكان `id` هو المفتاح الأساسي والرفع `on_conflict=id`،
-- فصارت كل منشأة تدهس صفوف غيرها ويُسقَف الجدول عند ~٩٦ صفّاً مهما بلغ عدد
-- المنشآت: بقي ٦٦ صفّاً لـ٣٨ منشأة بينما بوابة قوى تعرض طلباتٍ لمئات المنشآت.
--
-- المفتاح الثابت هو رقم الطلب (`request_id`، «رقم الطلب» في واجهة قوى مثل
-- 18-471-1448) ضمن منشأته. القيد الفريد (company_id, request_id) كان موجوداً
-- أصلاً وغير مستعمَل، فيُرقّى مفتاحاً أساسياً ويُزال المكرّر.
--
-- بعد التطبيق يجب أن يستعمل الرافع `on_conflict=company_id,request_id`؛ ورفعٌ
-- قديم بـ`on_conflict=id` سيفشل بـ400 (42P10) لأنه لا يبقى على `id` قيد فريد.
-- يُبقى العمود `id` للتوثيق فقط (nullable) ولا يُبنى عليه شيء.

alter table qiwa_visa_requests drop constraint qiwa_visa_requests_pkey;
alter table qiwa_visa_requests alter column id drop not null;
alter table qiwa_visa_requests add constraint qiwa_visa_requests_pkey
  primary key (company_id, request_id);
alter table qiwa_visa_requests drop constraint if exists qiwa_visa_requests_company_request_unique;
