-- ============================================================
-- Phase 3: WhatsApp Business Cloud API integration
-- ============================================================

create table if not exists public.whatsapp_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid unique,
  phone_number_id text not null,
  business_account_id text not null,
  access_token_secret text,                 -- vault reference
  display_phone_number text not null,
  webhook_verify_token text not null,
  app_secret text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id)
);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  meta_template_id text,
  name text not null,
  category text not null check (category in ('MARKETING','UTILITY','AUTHENTICATION')),
  language text not null default 'ar',
  status text not null default 'PENDING' check (status in ('APPROVED','PENDING','REJECTED','PAUSED','DISABLED')),
  components jsonb not null,
  variables_count int not null default 0,
  description_ar text,
  use_case text,
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  unique (organization_id, name, language)
);

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  meta_conversation_id text,
  contact_phone text not null,
  contact_name text,
  client_id uuid references public.clients(id),
  facility_id uuid references public.facilities(id),
  person_id uuid references public.persons(id),
  status text not null default 'open' check (status in ('open','snoozed','closed','spam')),
  assigned_to uuid references public.users(id),
  last_message_at timestamptz,
  unread_count int not null default 0,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_wa_conv_phone on public.whatsapp_conversations(contact_phone);
create index if not exists idx_wa_conv_status on public.whatsapp_conversations(status);
create index if not exists idx_wa_conv_client on public.whatsapp_conversations(client_id);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
  meta_message_id text,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null check (message_type in ('text','image','document','audio','video','location','template','button_reply','list_reply','sticker','contacts','interactive')),
  text_body text,
  template_id uuid references public.whatsapp_templates(id),
  template_variables jsonb,
  media_url text,
  media_mime_type text,
  media_filename text,
  status text default 'sent' check (status in ('queued','sent','delivered','read','failed')),
  failed_reason text,
  delivered_at timestamptz,
  read_at timestamptz,
  reference_type text,
  reference_id uuid,
  sent_by uuid references public.users(id),
  sent_at timestamptz not null default now(),
  received_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_wa_msg_conv on public.whatsapp_messages(conversation_id, sent_at desc);
create index if not exists idx_wa_msg_meta on public.whatsapp_messages(meta_message_id);
create index if not exists idx_wa_msg_ref on public.whatsapp_messages(reference_type, reference_id);

-- triggers
create trigger trg_wac_upd before update on public.whatsapp_credentials for each row execute function public.set_updated_at();
create trigger trg_wac_aud before insert or update on public.whatsapp_credentials for each row execute function public.set_created_updated_by();
create trigger trg_wat_upd before update on public.whatsapp_templates for each row execute function public.set_updated_at();
create trigger trg_wat_aud before insert or update on public.whatsapp_templates for each row execute function public.set_created_updated_by();
create trigger trg_wacv_upd before update on public.whatsapp_conversations for each row execute function public.set_updated_at();

-- RLS
alter table public.whatsapp_credentials enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

drop policy if exists wac_admin on public.whatsapp_credentials;
create policy wac_admin on public.whatsapp_credentials
  for all to authenticated
  using (public.current_user_has_permission('whatsapp.settings.manage'))
  with check (public.current_user_has_permission('whatsapp.settings.manage'));

drop policy if exists wat_read on public.whatsapp_templates;
create policy wat_read on public.whatsapp_templates
  for select to authenticated
  using (public.current_user_has_permission('whatsapp.message.send'));
drop policy if exists wat_modify on public.whatsapp_templates;
create policy wat_modify on public.whatsapp_templates
  for all to authenticated
  using (public.current_user_has_permission('whatsapp.template.manage'))
  with check (public.current_user_has_permission('whatsapp.template.manage'));

drop policy if exists wacv_read on public.whatsapp_conversations;
create policy wacv_read on public.whatsapp_conversations
  for select to authenticated
  using (public.current_user_has_permission('whatsapp.conversation.read'));
drop policy if exists wacv_modify on public.whatsapp_conversations;
create policy wacv_modify on public.whatsapp_conversations
  for all to authenticated
  using (public.current_user_has_permission('whatsapp.message.send'))
  with check (public.current_user_has_permission('whatsapp.message.send'));

drop policy if exists wam_read on public.whatsapp_messages;
create policy wam_read on public.whatsapp_messages
  for select to authenticated
  using (public.current_user_has_permission('whatsapp.conversation.read'));
drop policy if exists wam_send on public.whatsapp_messages;
create policy wam_send on public.whatsapp_messages
  for insert to authenticated
  with check (public.current_user_has_permission('whatsapp.message.send') and direction = 'outbound');

-- Seed default UTILITY templates (placeholder until Meta-approved versions sync in)
insert into public.whatsapp_templates (organization_id, name, category, language, status, components, variables_count, description_ar, use_case)
values
  (null, 'invoice_issued_v1', 'UTILITY', 'ar', 'PENDING',
   jsonb_build_array(jsonb_build_object('type','BODY','text','السلام عليكم {{1}}،\nتم إصدار فاتورة جديدة لكم:\n📄 رقم الفاتورة: {{2}}\n💰 المبلغ: {{3}} ريال\n📅 تاريخ الاستحقاق: {{4}}\nشكراً لثقتكم بنا.')),
   4, 'إشعار العميل بإصدار فاتورة جديدة', 'invoice_issued'),
  (null, 'transaction_status_v1', 'UTILITY', 'ar', 'PENDING',
   jsonb_build_array(jsonb_build_object('type','BODY','text','السلام عليكم {{1}}،\nتم تحديث حالة معاملتكم:\n• نوع المعاملة: {{2}}\n• الحالة الجديدة: {{3}}')),
   3, 'تحديث حالة معاملة', 'transaction_status'),
  (null, 'document_expiry_v1', 'UTILITY', 'ar', 'PENDING',
   jsonb_build_array(jsonb_build_object('type','BODY','text','السلام عليكم {{1}}،\nتنبيه قرب انتهاء الوثيقة:\n• {{2}}\n• تاريخ الانتهاء: {{3}}')),
   3, 'تنبيه انتهاء وثيقة', 'document_expiry'),
  (null, 'payment_received_v1', 'UTILITY', 'ar', 'PENDING',
   jsonb_build_array(jsonb_build_object('type','BODY','text','السلام عليكم {{1}}،\nتم استلام دفعة بمبلغ {{2}} ريال على فاتورة {{3}}.\nشكراً لكم.')),
   3, 'تأكيد استلام دفعة', 'payment_received'),
  (null, 'otp_login_v1', 'AUTHENTICATION', 'ar', 'PENDING',
   jsonb_build_array(jsonb_build_object('type','BODY','text','رمز الدخول لبوابة جسر للأعمال: {{1}}\nالرمز صالح لمدة 5 دقائق.')),
   1, 'OTP لبوابة العميل', 'otp')
on conflict (organization_id, name, language) do nothing;
