-- users.plain_password — GM-visible password.
-- The GM detail page shows staff passwords in clear text, so we keep a plaintext
-- copy alongside the hashed auth password. Written by admin-create-user and
-- admin-set-password. (Known security trade-off, requested for this internal app.)
alter table public.users
  add column if not exists plain_password text;

comment on column public.users.plain_password is
  'Plaintext copy of the account password, shown to the GM on the user detail page. Set by admin-create-user / admin-set-password.';
