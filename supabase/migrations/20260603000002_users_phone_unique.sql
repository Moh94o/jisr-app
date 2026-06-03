-- Enforce unique mobile number across active accounts (id_number is already unique
-- via persons_id_number_unique_idx). Partial index ignores nulls and soft-deleted rows.
create unique index if not exists users_personal_phone_unique_idx
  on public.users (personal_phone)
  where personal_phone is not null and deleted_at is null;
