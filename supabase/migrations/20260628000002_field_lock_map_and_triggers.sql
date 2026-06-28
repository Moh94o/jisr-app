-- Seed field_lock_map from src/lib/permCatalog.js (lockableFields) and attach the
-- enforce_field_locks() guard to every owning table. Regenerate with:
--   node scripts/genFieldLockSql.mjs
insert into public.field_lock_map (table_name, column_name, tab, field_key) values
('clients','name_ar','admin_clients','ci_name'),('clients','id_number','admin_clients','ci_id_number'),
('clients','phone','admin_clients','ci_phone'),('clients','nationality_id','admin_clients','ci_nationality'),
('clients','branch_id','admin_clients','ci_branch'),('clients','branch_ids','admin_clients','ci_branch'),
('transfer_calculation','worker_name','transfer_calc','worker_name'),('transfer_calculation','iqama_number','transfer_calc','iqama_number'),
('transfer_calculation','phone','transfer_calc','phone'),('transfer_calculation','nationality_id','transfer_calc','nationality_id'),
('transfer_calculation','nationality','transfer_calc','nationality_id'),('transfer_calculation','dob','transfer_calc','dob'),
('transfer_calculation','occupation_name_ar','transfer_calc','occupation_name_ar'),('transfer_calculation','new_occupation_name_ar','transfer_calc','new_occupation_name_ar'),
('transfer_calculation','change_profession','transfer_calc','change_profession'),('transfer_calculation','sponsor_changes','transfer_calc','sponsor_changes'),
('transfer_calculation','hrsd_worker_status','transfer_calc','hrsd_worker_status'),('transfer_calculation','resident_status_ar','transfer_calc','resident_status_ar'),
('transfer_calculation','iqama_expiry_gregorian','transfer_calc','iqama_expiry_gregorian'),('transfer_calculation','iqama_expiry_hijri','transfer_calc','iqama_expiry_hijri'),
('transfer_calculation','has_notice_period','transfer_calc','has_notice_period'),('transfer_calculation','employer_consent','transfer_calc','employer_consent'),
('transfer_calculation','transfer_fee','transfer_calc','transfer_fee'),('transfer_calculation','iqama_renewal_fee','transfer_calc','iqama_renewal_fee'),
('transfer_calculation','work_permit_fee','transfer_calc','work_permit_fee'),('transfer_calculation','prof_change_fee','transfer_calc','prof_change_fee'),
('transfer_calculation','medical_fee','transfer_calc','medical_fee'),('transfer_calculation','late_fine_amount','transfer_calc','late_fine_amount'),
('transfer_calculation','office_fee','transfer_calc','office_fee'),('transfer_calculation','absher_discount','transfer_calc','absher_discount'),
('transfer_calculation','manual_discount','transfer_calc','manual_discount'),
('iqama_renewal_calculation','worker_name','renewal_calc','worker_name'),('iqama_renewal_calculation','iqama_number','renewal_calc','iqama_number'),
('iqama_renewal_calculation','phone','renewal_calc','phone'),('iqama_renewal_calculation','nationality_id','renewal_calc','nationality_id'),
('iqama_renewal_calculation','nationality','renewal_calc','nationality_id'),('iqama_renewal_calculation','dob','renewal_calc','dob'),
('iqama_renewal_calculation','exemption','renewal_calc','exemption'),('iqama_renewal_calculation','renewal_months','renewal_calc','renewal_months'),
('iqama_renewal_calculation','change_profession','renewal_calc','change_profession'),('iqama_renewal_calculation','new_occupation_name_ar','renewal_calc','new_occupation_name_ar'),
('iqama_renewal_calculation','work_permit_expiry','renewal_calc','work_permit_expiry'),('iqama_renewal_calculation','iqama_renewal_fee','renewal_calc','iqama_renewal_fee'),
('iqama_renewal_calculation','work_permit_fee','renewal_calc','work_permit_fee'),('iqama_renewal_calculation','prof_change_fee','renewal_calc','prof_change_fee'),
('iqama_renewal_calculation','medical_fee','renewal_calc','medical_fee'),('iqama_renewal_calculation','late_fine_amount','renewal_calc','late_fine_amount'),
('iqama_renewal_calculation','office_fee','renewal_calc','office_fee'),('iqama_renewal_calculation','gov_excess','renewal_calc','gov_excess'),
('iqama_renewal_calculation','absher_discount','renewal_calc','absher_discount'),('iqama_renewal_calculation','manual_discount','renewal_calc','manual_discount'),
('other_applications','description','invoices','service_description'),('service_requests','quantity','invoices','visa_quantity'),
('visa_applications','border_number','invoices','visa_border_number'),('visa_applications','unified_number','invoices','visa_unified_number'),
('visa_applications','visa_number','invoices','visa_number'),('invoices','total_amount','invoices','pricing_total'),
('invoices','pricing_breakdown','invoices','pricing_breakdown'),('invoices','note_public','invoices','note_public'),
('installments','total_amount','invoices','installment_amount'),('payments','amount','invoices','payment_amount'),
('payments','payment_method_id','invoices','payment_method'),('payments','bank_reference','invoices','payment_bank_reference'),
('payments','notes','invoices','payment_notes')
on conflict (table_name, column_name, tab, field_key) do nothing;

select public._attach_field_lock_trigger('clients');
select public._attach_field_lock_trigger('transfer_calculation');
select public._attach_field_lock_trigger('iqama_renewal_calculation');
select public._attach_field_lock_trigger('other_applications');
select public._attach_field_lock_trigger('service_requests');
select public._attach_field_lock_trigger('visa_applications');
select public._attach_field_lock_trigger('invoices');
select public._attach_field_lock_trigger('installments');
select public._attach_field_lock_trigger('payments');
