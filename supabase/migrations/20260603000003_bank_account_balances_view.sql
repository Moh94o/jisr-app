-- Live per-account bank balance derived from real money movements.
--   balance = bank payments received + cash deposits in - fees paid out
-- Inflows:
--   * payments.amount        (client payments received into the account; is_valid, not deleted)
--   * deposits.total_amount  (cash drawer deposits into the bank; kind='cash', status deposited/verified)
--     NB: deposits with kind='bank' mirror the bank payments above and are intentionally excluded
--         to avoid double counting.
-- Outflows:
--   * transaction_fees.paid_amount (government/service fees paid out from the account; status='paid')
-- The view runs with owner privileges so it reflects the true global balance of each
-- account regardless of the viewer's row-level scope.
create or replace view public.v_bank_account_balances as
with base as (
  select
    ba.id as bank_account_id,
    coalesce((select sum(p.amount) from public.payments p
              where p.bank_account_id = ba.id and p.is_valid = true and p.deleted_at is null), 0)::numeric as in_payments,
    coalesce((select sum(d.total_amount) from public.deposits d
              where d.bank_account_id = ba.id and d.kind = 'cash'
                and d.status in ('deposited','verified') and d.deleted_at is null), 0)::numeric as in_cash_deposits,
    coalesce((select sum(coalesce(tf.paid_amount, tf.amount)) from public.transaction_fees tf
              where tf.bank_account_id = ba.id and tf.status = 'paid' and tf.deleted_at is null), 0)::numeric as out_fees
  from public.bank_accounts ba
  where ba.deleted_at is null
)
select
  bank_account_id,
  in_payments,
  in_cash_deposits,
  out_fees,
  (in_payments + in_cash_deposits - out_fees) as balance
from base;

grant select on public.v_bank_account_balances to anon, authenticated;
