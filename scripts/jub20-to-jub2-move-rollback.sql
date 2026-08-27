-- ملف تراجع: إعادة صفوف فرع JUB20 التي نُقلت إلى JUB2 بتاريخ 2026-08-27
-- المصدر: public._jub20_move_bak  (tbl, row_id, old_branch, new_branch, moved_at)
-- JUB20 = e022db80-8aae-4ee4-be91-6ef583cc6b98   |   JUB2 = 5f9431b1-fda9-4738-9d9b-57c542cefb2b
--
-- ملاحظة: يعيد فقط الصفوف التي ما زال branch_id فيها = JUB2 (أي لم تُنقل يدوياً بعد ذلك).

do $rb$
declare t text; n bigint;
begin
  perform set_config('jisr.wa_suppress','on',true);

  foreach t in array array['invoices','service_requests','installments','payments',
                           'transfer_calculation','iqama_renewal_calculation','clients','agents']
  loop
    execute format(
      'update public.%I x set branch_id = m.old_branch
         from public._jub20_move_bak m
        where m.tbl = %L and m.row_id = x.id and x.branch_id = m.new_branch', t, t);
    get diagnostics n = row_count;
    raise notice 'reverted % rows in %', n, t;
  end loop;
end
$rb$;

-- بعد التأكد:
-- drop table public._jub20_move_bak;
