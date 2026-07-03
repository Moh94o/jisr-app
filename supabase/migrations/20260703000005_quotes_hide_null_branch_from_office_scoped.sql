-- Office-scoped users (e.g. المسعّر, منشىء فواتير) must see ONLY their own office's
-- quotes. Previously a branch_id IS NULL quote leaked to every permission holder because
-- current_user_can_on_branch(code, NULL) returns TRUE for a NULL branch. Split the branch
-- clause: for a real branch use the per-branch grant; for a branchless (orphan) quote,
-- require the user to be UNRESTRICTED for that view perm (all-branches / GM), so only
-- unrestricted users see ownerless branchless quotes. The linked-invoice bypass stays,
-- so a branchless quote that has a visible invoice is still shown to whoever sees it.

DROP POLICY IF EXISTS tc_select_authenticated ON public.transfer_calculation;
CREATE POLICY tc_select_authenticated ON public.transfer_calculation
  FOR SELECT
  USING (
    current_user_is_super_admin()
    OR (branch_id IS NOT NULL AND current_user_can_on_branch('quotations.view', branch_id))
    OR (branch_id IS NOT NULL AND current_user_can_on_branch('invoices.view', branch_id))
    OR (branch_id IS NULL AND (
          current_user_perm_branches('quotations', 'view') IS NULL
          OR current_user_perm_branches('invoices', 'view') IS NULL))
    OR (invoice_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.invoices i WHERE i.id = transfer_calculation.invoice_id))
  );

DROP POLICY IF EXISTS irc_select ON public.iqama_renewal_calculation;
CREATE POLICY irc_select ON public.iqama_renewal_calculation
  FOR SELECT
  USING (
    current_user_is_super_admin()
    OR (branch_id IS NOT NULL AND current_user_can_on_branch('renewal_calc.view', branch_id))
    OR (branch_id IS NOT NULL AND current_user_can_on_branch('invoices.view', branch_id))
    OR (branch_id IS NULL AND (
          current_user_perm_branches('renewal_calc', 'view') IS NULL
          OR current_user_perm_branches('invoices', 'view') IS NULL))
    OR (invoice_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.invoices i WHERE i.id = iqama_renewal_calculation.invoice_id))
  );
