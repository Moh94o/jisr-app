-- A transfer/renewal quote must be visible whenever its linked invoice is visible.
-- The prior policies were strictly branch-scoped via current_user_can_on_branch(),
-- while the invoices SELECT policy uses the broader office-scope model
-- (current_user_invoice_office_scope). A user who can see an invoice but whose
-- per-branch grant does not cover that invoice's branch (e.g. imported Bubble
-- invoices whose office is outside the user's branch grant) had the linked quote
-- hidden -> in-app data.tc came back null -> the pricing / رقم الحسبة card silently
-- vanished on the invoice detail. Add a "linked invoice is visible" bypass so a
-- quote's visibility always tracks its invoice's visibility. The EXISTS subquery
-- runs under the invoices RLS, so it grants view only when the user can actually
-- see that invoice. Draft/unlinked quotes stay covered by the branch clauses
-- (this clause only ADDS visibility, never removes).

DROP POLICY IF EXISTS tc_select_authenticated ON public.transfer_calculation;
CREATE POLICY tc_select_authenticated ON public.transfer_calculation
  FOR SELECT
  USING (
    current_user_is_super_admin()
    OR current_user_can_on_branch('quotations.view', branch_id)
    OR current_user_can_on_branch('invoices.view', branch_id)
    OR (invoice_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.invoices i WHERE i.id = transfer_calculation.invoice_id))
  );

DROP POLICY IF EXISTS irc_select ON public.iqama_renewal_calculation;
CREATE POLICY irc_select ON public.iqama_renewal_calculation
  FOR SELECT
  USING (
    current_user_is_super_admin()
    OR current_user_can_on_branch('renewal_calc.view', branch_id)
    OR current_user_can_on_branch('invoices.view', branch_id)
    OR (invoice_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.invoices i WHERE i.id = iqama_renewal_calculation.invoice_id))
  );
