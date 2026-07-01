// Fetches one invoice (the same INVOICE_SELECT shape the app uses) and assembles the
// per-service `data` object that buildInvoiceDoc() needs to render the PDF. Reuses the
// exact selects from InvoicePage.jsx so the bot's PDF matches the on-screen invoice.
import { createClient } from '@supabase/supabase-js'

let sb = null
export function initDb(url, key) {
  sb = createClient(url, key, { auth: { persistSession: false } })
  return sb
}
export const db = () => sb

const VISA = new Set(['work_visa', 'work_visa_permanent', 'work_visa_temporary'])
const baseSvcCode = c => (VISA.has(c) ? 'work_visa' : c)

const INVOICE_SELECT = `
  id, invoice_no, total_amount, paid_amount, remaining_amount, payment_plan, installments_count, pricing_breakdown, created_at, last_activity_at,
  note_public, note_log, pricing_log, payment_log, cancel_log, service_log,
  creator:created_by(person:person_id(name_ar,name_en)),
  payments(amount,is_valid,deleted_at,payment_date),
  service_type:service_type_id(code,value_ar,value_en),
  status:status_id(code,value_ar,value_en),
  branch:branch_id(id,branch_code,phone,city:city_id(name_ar)),
  agent:agent_id(id,name_ar,name_en,id_number,phone,nationality_id,edit_log,nationality:nationality_id(code,name_ar,flag_url)),
  transfer_calculation(transfer_only,deleted_at,office_fee,office_fee_net,expected_duration_months,billed_renewal_months,renewal_months),
  iqama_renewal_calculation(deleted_at,office_fee,office_fee_net,expected_duration_months,billed_renewal_months,renewal_months),
  service_request:service_request_id(
    id, request_ref_no, request_date, quantity,
    status:status_id(code,value_ar,value_en),
    client:client_id(id,name_ar,name_en,phone,id_number,nationality_id,edit_log,nationality:nationality_id(code,name_ar,flag_url)),
    visa_applications(visa_type:visa_type_id(code,value_ar,value_en)),
    transfer_applications(worker:worker_id(id,name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:main_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
    ajeer_applications(worker:worker_id(id,name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:main_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
    iqama_renewal_applications(worker:worker_id(id,name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:worker_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
    other_applications(worker_phone,details,worker:worker_id(id,name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:worker_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
    supplier_payroll_applications(worker:worker_id(id,name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)),facility:worker_facility_id(id,name_ar,unified_number,hrsd_number,gosi_number)),
    service_request_agents(agent:agent_id(id,name_ar,name_en,id_number,phone,nationality_id,edit_log,nationality:nationality_id(code,name_ar,flag_url)))
  )
`

const SELECTS = {
  work_visa: `id,visa_number,visa_cost,border_number,worker_name,wakalah_number,wakalah_date,wakalah_office,visa_used,visa_used_date_check,gender,file_number,
    main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
    nationality:nationality_id(name_ar,name_en),
    occupation:occupation_id(name_ar,name_en),
    embassy:embassy_id(name_ar,name_en),
    visa_type:visa_type_id(value_ar,value_en),
    visa_order_kind:visa_order_kind_id(value_ar,value_en),
    wakalah_status:wakalah_status_id(value_ar,value_en)`,
  transfer: `id,reference_number,total_price_initial,total_price_final,discount,office_cost,iqama_expiry_date,
    worker:worker_id(name_ar,name_en,iqama_number,phone),
    main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
    new_occupation:new_occupation_id(name_ar,name_en),
    status:status_id(value_ar,value_en),
    worker_status:worker_status_id(value_ar,value_en)`,
  iqama_renewal: `id,duration_months,current_expire_date,new_expire_date,
    worker:worker_id(name_ar,name_en,iqama_number),
    worker_facility:worker_facility_id(name_ar,unified_number)`,
  iqama_issuance: `id,is_temporary,entry_date,check_date,worker_name_at_entry,
    iqama_status,iqama_number,iqama_expiry,iqama_amount,
    medical_status,medical_amount,
    work_permit_status,work_permit_expiry,work_permit_amount,
    insurance_status,insurance_amount,
    iqama_print_status,iqama_print_amount,iqama_delivery_status,
    contract_authentication_status,all_payment_status,
    worker:worker_id(name_ar,name_en,iqama_number),
    main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number)`,
  other: `id,description,details,
    worker:worker_id(id,name_ar,name_en,iqama_number),
    worker_facility:worker_facility_id(name_ar,unified_number)`,
}
const TABLES = { work_visa: 'visa_applications', transfer: 'transfer_applications', iqama_renewal: 'iqama_renewal_applications', iqama_issuance: 'iqama_issuance_applications', other: 'other_applications' }

export async function fetchInvoice(id) {
  const { data, error } = await sb.from('invoices').select(INVOICE_SELECT).eq('id', id).is('deleted_at', null).maybeSingle()
  if (error) throw new Error('fetchInvoice: ' + error.message)
  return data
}

export async function fetchInvoiceData(inv) {
  const code = inv.service_type?.code
  const srId = inv.service_request?.id
  const tbl = TABLES[baseSvcCode(code)] || 'other_applications'
  const sel = SELECTS[baseSvcCode(code)] || SELECTS.other
  const branchId = inv.branch?.id

  const [insts, pays, det, banks] = await Promise.all([
    sb.from('installments').select('id,installment_order,total_amount,paid_amount,expected_date,paid_date,receipt_no,bank_reference,notes,visa_application_id,visa_application:visa_application_id(border_number,file_number,gender,nationality:nationality_id(name_ar,name_en),occupation:occupation_id(name_ar,name_en),embassy:embassy_id(name_ar,name_en)),payment_method:payment_method_id(value_ar,value_en),payment_milestone:payment_milestone_id(value_ar,value_en)').eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order'),
    sb.from('payments').select('id,amount,payment_date,is_valid,receipt_no,bank_reference,notes,payment_method:payment_method_id(value_ar,value_en,code),installment_id,creator:created_by(person:person_id(name_ar,name_en))').eq('invoice_id', inv.id).is('deleted_at', null).order('payment_date', { ascending: false }),
    (tbl && srId) ? sb.from(tbl).select(sel).eq('service_request_id', srId) : Promise.resolve({ data: [] }),
    branchId ? sb.from('bank_account_branches').select('account_purpose,bank_accounts!inner(bank_name,bank_name_en,account_name,account_name_en,account_number,iban,swift_code,is_active,deleted_at)').eq('branch_id', branchId).is('bank_accounts.deleted_at', null) : Promise.resolve({ data: [] }),
  ])

  const officeAccounts = (() => {
    const seen = new Set(), out = []
    for (const r of (banks?.data || [])) {
      const a = r.bank_accounts
      if (!a || a.is_active === false) continue
      if (!String(r.account_purpose || '').includes('التحويلات الواردة')) continue
      const k = (a.account_number || '') + '|' + (a.iban || '')
      if (seen.has(k)) continue
      seen.add(k); out.push(a)
    }
    return out
  })()

  return { loading: false, insts: insts.data || [], pays: pays.data || [], det: det.data || [], code, quote: null, officeAccounts, passports: {} }
}
