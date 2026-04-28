import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import InvoicePageFull from './InvoicePage.jsx'
import SettingsPageFull from './SettingsPage.jsx'
import AdminPageFull from './AdminPage.jsx'
import BranchesPage from './BranchesPage.jsx'
import FacilitiesPage from './FacilitiesPage.jsx'
import WorkforcePage from './WorkforcePage.jsx'
import KPIPage from './KPIPage.jsx'
import ServiceRequestPage from './ServiceRequestPage.jsx'
import ServiceAdminPage from './ServiceAdminPage.jsx'
import KafalaCalculator, { DateField, Sel } from './pages/KafalaCalculator.jsx'
import PersonsPage from './pages/admin/PersonsPage.jsx'
import PermissionsPage from './pages/admin/PermissionsPage.jsx'
import OTPMessages from './pages/OTPMessages.jsx'
import StampBadge from './components/ui/StampBadge.jsx'
import OfficialStampBadge from './components/ui/OfficialStampBadge.jsx'
import SyncHub from './pages/SyncHub.jsx'
import VisibilityAdmin, { getVisibility, isItemVisible } from './pages/VisibilityAdmin.jsx'
import { FileText, Sparkles, Tag } from 'lucide-react'

import { getSupabase } from './lib/supabase.js'
import { exportToExcel, importFromCSV, sendWhatsApp, buildWhatsAppMessage, printContent, generateClientStatement, checkDuplicate, setupKeyboardShortcuts, calculateNitaqat } from './lib/utils.js'

const C = { dk:'#171717', md:'#222222', fm:'#1e1e1e', gold:'#D4A017', gl:'#dcc06e', brd:'rgba(255,255,255,.13)', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const F = "'Cairo','Tajawal',sans-serif"

const ICO = {
  email: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" fill="rgba(212,160,23,.15)" stroke="rgba(212,160,23,.5)" strokeWidth="1.5"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" stroke="rgba(212,160,23,.7)" strokeWidth="1.5"/></svg>,
  lock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2.5" stroke="#D4A017" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#D4A017"/></svg>,
  unlock: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2.5" fill="#141414" fillOpacity=".2" stroke="#141414" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="#141414" strokeWidth="2.5" strokeLinecap="round" opacity=".6"/><circle cx="12" cy="16" r="1.5" fill="#141414"/></svg>,
  bolt: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="rgba(212,160,23,.2)" stroke="rgba(212,160,23,.6)" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  eyeOn: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.42)" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.42)" strokeWidth="1.8"/></svg>,
  eyeOff: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="rgba(255,255,255,.42)" strokeWidth="1.8"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="rgba(255,255,255,.42)" strokeWidth="1.8"/><line x1="1" y1="1" x2="23" y2="23" stroke="rgba(255,255,255,.42)" strokeWidth="1.8"/></svg>,
}

// Duotone nav icons (fill opacity + stroke)
const DT = (clr) => ({
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 01-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 013 21V10.5z" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  facility: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="14" rx="2" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M7 8V4a2 2 0 012-2h6a2 2 0 012 2v4" stroke={clr} strokeWidth="1.5" opacity=".6"/><line x1="8" y1="12" x2="8" y2="12.01" stroke={clr} strokeWidth="2.5" strokeLinecap="round"/><line x1="12" y1="12" x2="12" y2="12.01" stroke={clr} strokeWidth="2.5" strokeLinecap="round"/><line x1="16" y1="12" x2="16" y2="12.01" stroke={clr} strokeWidth="2.5" strokeLinecap="round"/></svg>,
  worker: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M4 21v-1a6 6 0 0116 0v1" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/></svg>,
  client: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M2 21v-1a5 5 0 0114 0v1" stroke={clr} strokeWidth="1.5" opacity=".6"/><circle cx="19" cy="7" r="2" stroke={clr} strokeWidth="1.5" opacity=".4"/><path d="M22 21v-1a3 3 0 00-3-3" stroke={clr} strokeWidth="1.5" opacity=".35"/></svg>,
  broker: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 3h5v5" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".5"/><path d="M21 3l-7 7" stroke={clr} strokeWidth="1.5"/><path d="M11 13l-7 7" stroke={clr} strokeWidth="1.5"/><path d="M3 16v5h5" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".5"/><circle cx="12" cy="12" r="3" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/></svg>,
  transaction: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M8 10h8M8 14h5" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".7"/><circle cx="17" cy="17" r="4" fill={clr} fillOpacity=".2" stroke={clr} strokeWidth="1.5"/><path d="M17 15.5v3l1.5-1" stroke={clr} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  invoice: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M8 7h8M8 11h6M8 15h4" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/><circle cx="16" cy="15" r="1.5" fill={clr} opacity=".5"/></svg>,
  payment: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><line x1="2" y1="10" x2="22" y2="10" stroke={clr} strokeWidth="1.5" opacity=".5"/><circle cx="7" cy="15" r="1.5" fill={clr} opacity=".4"/></svg>,
  expense: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M3 6V5a2 2 0 012-2h10a2 2 0 012 2v1" stroke={clr} strokeWidth="1.5" opacity=".4"/><circle cx="12" cy="13" r="3" stroke={clr} strokeWidth="1.5" opacity=".6"/><line x1="12" y1="11.5" x2="12" y2="14.5" stroke={clr} strokeWidth="1.3" strokeLinecap="round"/></svg>,
  branch: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="15" rx="2" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2" stroke={clr} strokeWidth="1.5" opacity=".5"/><line x1="12" y1="11" x2="12" y2="18" stroke={clr} strokeWidth="1.5" opacity=".4"/><line x1="7" y1="14" x2="17" y2="14" stroke={clr} strokeWidth="1.5" opacity=".4"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3.5" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M2 20v-1a5 5 0 0114 0v1" stroke={clr} strokeWidth="1.5" opacity=".5"/><circle cx="17" cy="9" r="2.5" fill={clr} fillOpacity=".1" stroke={clr} strokeWidth="1.3" opacity=".6"/><path d="M22 20v-1a3.5 3.5 0 00-4-3.5" stroke={clr} strokeWidth="1.3" opacity=".4"/></svg>,
  role: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v5c0 5.55-3.84 10.74-8 12-4.16-1.26-8-6.45-8-12V6l8-4z" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke={clr} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".7"/></svg>,
  notification: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke={clr} strokeWidth="1.5" opacity=".6"/><circle cx="12" cy="4" r="1.5" fill={clr} opacity=".4"/></svg>,
  notes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M8 7h8M8 11h8M8 15h4" stroke={clr} strokeWidth="1.3" strokeLinecap="round" opacity=".5"/><circle cx="17" cy="17" r="3" fill={clr} fillOpacity=".2" stroke={clr} strokeWidth="1.3"/><path d="M17 16v2h1.5" stroke={clr} strokeWidth="1" strokeLinecap="round"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" stroke={clr} strokeWidth="1.3" opacity=".5"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.5" opacity=".4"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" opacity=".5"/></svg>,
  chart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill={clr} fillOpacity=".1" stroke={clr} strokeWidth="1.5"/><rect x="7" y="13" width="3" height="5" rx="1" fill={clr} opacity=".5"/><rect x="11" y="9" width="3" height="9" rx="1" fill={clr} opacity=".7"/><rect x="15" y="6" width="3" height="12" rx="1" fill={clr} opacity=".4"/></svg>,
  alert: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><line x1="12" y1="9" x2="12" y2="13" stroke={clr} strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill={clr}/></svg>,
  calendar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><line x1="16" y1="2" x2="16" y2="6" stroke={clr} strokeWidth="1.5" opacity=".5"/><line x1="8" y1="2" x2="8" y2="6" stroke={clr} strokeWidth="1.5" opacity=".5"/><line x1="3" y1="10" x2="21" y2="10" stroke={clr} strokeWidth="1.5" opacity=".4"/><path d="M8 14h2v2H8z" fill={clr} opacity=".5"/><path d="M12 14h2v2h-2z" fill={clr} opacity=".3"/></svg>,
})

const LANG = {
  ar:{dir:'rtl',otherFlag:'\u{1F1FA}\u{1F1F8}',otherLang:'English',title:'\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643',sub:'\u0633\u062c\u0651\u0644 \u062f\u062e\u0648\u0644\u0643 \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0646\u0638\u0627\u0645',email:'\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064a\u0629',pass:'\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',remember:'\u062a\u0630\u0643\u0651\u0631\u0646\u064a',forgot:'\u0646\u0633\u064a\u062a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061f',login:'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',firstTime:'\u0623\u0648\u0644 \u0645\u0631\u0629\u061f',setup:'\u0625\u0639\u062f\u0627\u062f \u0623\u0648\u0644\u064a \u2014 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0639\u0627\u0645',ver:'\u062c\u0633\u0631 \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u2014 \u0627\u0644\u0646\u0633\u062e\u0629 1.3',tagline:'\u062c\u0633\u0631 \u0644\u0644\u0623\u0639\u0645\u0627\u0644',tagline2:'\u0645\u0646\u0634\u0622\u062a \u00b7 \u0639\u0645\u0627\u0644\u0629 \u00b7 \u0641\u0648\u0627\u062a\u064a\u0631 \u00b7 \u0645\u0639\u0627\u0645\u0644\u0627\u062a \u00b7 \u062a\u0642\u0627\u0631\u064a\u0631',setupTitle:'\u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0639\u0627\u0645',setupSub:'\u0623\u0648\u0644 \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0646\u0638\u0627\u0645 \u2014 \u064a\u0645\u0644\u0643 \u0643\u0644 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a',nameAr:'\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064a *',nameEn:'\u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a',idNum:'\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064a\u0629',phone:'\u0627\u0644\u062c\u0648\u0627\u0644',emailLbl:'\u0627\u0644\u0628\u0631\u064a\u062f *',pw:'\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 *',pwConfirm:'\u062a\u0623\u0643\u064a\u062f *',create:'\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628',back:'\u2190 \u0631\u062c\u0648\u0639',successTitle:'\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628 \u0628\u0646\u062c\u0627\u062d!',successSub:'\u0633\u062c\u0651\u0644 \u062f\u062e\u0648\u0644\u0643 \u0627\u0644\u0622\u0646',goLogin:'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u2192',configTitle:'\u0627\u062a\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',configSub:'Supabase \u2192 Settings \u2192 API'},
  en:{dir:'ltr',otherFlag:'\u{1F1F8}\u{1F1E6}',otherLang:'\u0627\u0644\u0639\u0631\u0628\u064a\u0629',title:'Welcome Back',sub:'Sign in to access the system',email:'ID Number',pass:'Password',remember:'Remember me',forgot:'Forgot password?',login:'Sign In',firstTime:'First time?',setup:'Initial Setup \u2014 Create Super Admin',ver:'Jisr Business \u2014 v1.3',tagline:'Jisr Business',tagline2:'Facilities \u00b7 Workers \u00b7 Invoices \u00b7 Transactions \u00b7 Reports',setupTitle:'Create Super Admin Account',setupSub:'First account \u2014 has all permissions',nameAr:'Name (Arabic) *',nameEn:'Name (English)',idNum:'ID Number',phone:'Phone',emailLbl:'Email *',pw:'Password *',pwConfirm:'Confirm *',create:'Create Account',back:'Back \u2192',successTitle:'Account Created!',successSub:'Sign in with your email and password',goLogin:'Go to Login \u2192',configTitle:'Connect to Database',configSub:'Supabase \u2192 Settings \u2192 API'}
}
const TR={'الاسم':'Name','الاسم بالعربي':'Name (Arabic)','الاسم بالإنجليزي':'Name (English)','الرقم':'Number','الرقم الموحد':'Unified No.','السجل':'CR No.','حالة السجل':'CR Status','الحالة':'Status','نطاقات':'Nitaqat','الجنسية':'Nationality','الجوال':'Phone','الإقامة':'Iqama','الهوية':'ID','النوع':'Type','المبلغ':'Amount','الدفع':'Payment','التاريخ':'Date','المرجع':'المرجع','البنك':'Bank','الترتيب':'Order','البداية':'Start','النهاية':'End','النقاط':'Points','المستخدم':'Username','الجنس':'Gender','نشط':'Active','الكود':'Code','بالإنجليزي':'English','المفتاح':'Key','نظامي':'System','القيمة':'Value','اسم الملف':'File Name','نوع الكيان':'Entity Type','نوع الملف':'File Type','الانتهاء':'Expiry','الإصدار':'Version','شركة التأمين':'Insurance Company','رقم الوثيقة':'Policy No.','الوثيقة':'Document','مدير':'Manager','نسبة الملكية':'Ownership %','السنة':'Year','بداية الأسبوع':'Week Start','الربط':'Linked','الفك':'Unlinked','الأولوية':'Priority','البدء':'Start','الاستحقاق':'Due','السداد':'Payment','الطريقة':'Method','رقم العامل':'Worker No.','المنشأة':'Facility','المكتب':'Branch','الوسيط':'Broker','تاريخ الميلاد':'Birth Date','رقم الإقامة':'Iqama No.','رقم الحدود':'Border No.','رقم الجواز':'Passport No.','انتهاء الجواز':'Passport Expiry','المهنة':'Occupation','تاريخ دخول المملكة':'Entry Date','طريقة الالتحاق':'Joining Method','صاحب العمل السابق':'Previous Employer','رقم صاحب العمل السابق':'Previous Employer ID','تاريخ نقل الكفالة':'Sponsorship Transfer Date','حالة التأمينات':'GOSI Status','راتب التأمينات':'GOSI Salary','راتب قوى':'Qiwa Salary','انتهاء عقد قوى':'Qiwa Contract Expiry','حالة عقد قوى':'Qiwa Contract Status','حالة العامل':'Worker Status','خارج المملكة':'Outside Kingdom','يملك مركبة':'Has Vehicle','عدد المرافقين':'Dependents','ملف مكتمل':'Complete File','ملاحظات':'Notes','رقم العميل':'Client No.','نوع الهوية':'ID Type','رقم الهوية':'ID Number','البريد الإلكتروني':'Email','العنوان':'Address','الوسيط المُحيل':'Referring Broker','نوع العمولة':'Commission Type','نسبة/مبلغ العمولة':'Commission Rate','اسم البنك':'Bank Name','رقم الحساب البنكي':'Bank Account No.','رقم الآيبان':'IBAN','رقم المعاملة':'Transaction No.','نوع المعاملة':'Transaction Type','العميل':'Client','العامل':'Worker','سبب الإلغاء':'Cancellation Reason','تاريخ البدء':'Start Date','تاريخ الاستحقاق':'Due Date','تاريخ الإنجاز':'Completion Date','الفاتورة':'Invoice','ترتيب القسط':'Installment Order','المرحلة':'Milestone','تاريخ السداد':'Payment Date','رقم المصروف':'Expense No.','نوع المصروف':'Expense Type','التصنيف':'Category','المعاملة':'Transaction','رقم وثيقة التأمين':'Policy No.','تاريخ البداية':'Start Date','تاريخ النهاية':'End Date','السنة الهجرية':'Hijri Year','المالك':'Owner','منشأة المالك':'Owner Facility','مدير المنشأة':'Facility Manager','نسبة الملكية %':'Ownership %','نوع المنصة':'Platform Type','حالة الاشتراك':'Subscription Status','رصيد النقاط':'Points Balance','نوع البيانات':'Credential Type','اسم المستخدم':'Username','كلمة المرور':'Password','الجوال المرتبط':'Linked Phone','البريد المرتبط':'Linked Email','المنشأة المعفاة':'Exempt Facility','المنشأة المرتبطة':'Linked Facility','تاريخ الربط':'Link Date','تاريخ الفك':'Unlink Date','ربط بواسطة':'Linked By','فك بواسطة':'Unlinked By','المنطقة':'Region','مفتاح القائمة':'List Key','القائمة':'List','القيمة بالعربي':'Value (Arabic)','القيمة بالإنجليزي':'Value (English)','العنصر الأب':'Parent Item','بيانات إضافية (JSON)':'Metadata (JSON)','معرف الكيان':'Entity ID','نوع الوثيقة':'Document Type','مسار الملف':'File Path','حجم الملف (بايت)':'File Size (bytes)','رقم الإصدار':'Version No.','تاريخ الانتهاء':'Expiry Date','طريقة الدفع':'Payment Method','تاريخ الدفع':'Payment Date','المستلم':'Collected By','رقم المرجع':'Reference No.','الشكل القانوني':'Legal Form','عدد الشخصيات':'Character Count','حالة المنشأة':'Facility Status','رأس المال':'Capital','النشاط الاقتصادي':'Economic Activity','رقم السجل التجاري':'CR Number','تاريخ إصدار السجل':'CR Issue Date','تاريخ التصديق':'Confirmation Date','تاريخ الشطب':'Deletion Date','رقم نسخة السجل':'CR Version','سجل رئيسي':'Main CR','أنشطة السجل':'CR Activities','المنشأة الأم':'Parent Facility','مالك التأمينات':'GOSI Owner','المدينة':'City','رقم ملف قوى':'Qiwa File No.','رقم ملف التأمينات':'GOSI File No.','رقم عضوية الغرفة':'Chamber No.','انتهاء عضوية الغرفة':'Chamber Expiry','تأشيرة دائمة':'Permanent Visa','تأشيرة مؤقتة':'Temporary Visa','نقل خدمات':'Service Transfer','مستثنى أصلي':'Originally Exempt','رقم ض.ق.م':'VAT No.','حالة الضريبة':'VAT Status','رقم الزكاة':'Zakat No.','حجم نطاقات':'Nitaqat Size','إجمالي العمال':'Total Workers','العمال في نطاقات':'Workers in Nitaqat','سعوديين':'Saudis','سعوديين في نطاقات':'Saudis in Nitaqat','غير سعوديين':'Non-Saudis','غير سعوديين في نطاقات':'Non-Saudis in Nitaqat','نسبة السعودة':'Saudization %','نسبة توثيق العقود':'Contract Auth %','نسبة حماية الأجور':'WPS Compliance %','عقود موثقة':'Authenticated Contracts','عقود غير موثقة':'Unauthenticated','تأشيرات متاحة':'Available Visas','مستخدمة':'Used','غير مستخدمة':'Not Used','ملغاة':'Cancelled','رخص منتهية':'Expired Permits','صادرة هذا العام':'Issued This Year','نموذج التأمينات':'GOSI Form','إجمالي المشتركين':'Total Contributors','مشتركين سعوديين':'Saudi Contributors','مشتركين غير سعوديين':'Non-Saudi Contributors','مشتركين نشطين':'Active Contributors','مشتركين غير نشطين':'Inactive Contributors','إجمالي الاشتراكات':'Total Contributions','إجمالي المديونية':'Total Debit','الغرامات':'Penalties','إجمالي الالتزامات':'Total Obligations','مدد - حماية الأجور':'Mudad WPS','حالة مدد':'Mudad Status','حالة خدمات العمل':'Labor Service Status','عمال أجير مستعارين':'Ajeer Borrowed Workers','عقود أجير نشطة':'Ajeer Active Contracts','رصيد الزكاة المستحق':'Zakat Balance','جوال شخصي':'Personal Phone','جوال عمل':'Work Phone','تاريخ الميلاد ميلادي':'Birth Date (Gregorian)','تاريخ الميلاد هجري':'Birth Date (Hijri)','قريب':'Relative','جاري التحميل...':'Loading...','إضافة':'Add','حفظ':'Save','تعديل':'Edit','حذف':'Delete','حذف؟':'Delete?','تم الحفظ':'Saved','تم الحذف':'Deleted','خطأ':'Error','إلغاء':'Cancel','بحث...':'Search...','لا توجد بيانات':'No data','الإعدادات العامة':'General Settings','الخدمات':'Services','الخانات والعناصر':'Lists & Items','الدول والجنسيات والسفارات':'Countries & Nationalities','المناطق والمدن':'Regions & Cities','الوثائق':'Documents','المكاتب':'Branches','الحسابات البنكية':'Bank Accounts','الموظفين':'Employees','الأدوار والصلاحيات':'Roles & Permissions','قوالب المعاملات':'Transaction Templates','الملف الشخصي':'Profile','تسجيل الخروج':'Sign Out','بحث سريع ...':'Quick search ...','الرئيسية':'Dashboard','المنشآت':'Facilities','العمّال':'Workers','الفواتير':'Invoices','المعاملات':'Transactions','التقارير':'Reports','الإدارة':'Administration','المالية':'Finance','البيانات':'Data'}

// Translate common Supabase / network errors to current language
const translateErr=(err,lang)=>{const ar=lang==='ar';const raw=(err?.message||err?.error_description||err?.error||String(err||'')).trim();if(!raw)return ar?'حدث خطأ غير متوقع':'Unexpected error';const s=raw.toLowerCase();const map=[[/invalid login credentials|invalid credentials/,ar?'بيانات الدخول غير صحيحة':'Invalid credentials'],[/email not confirmed/,ar?'البريد لم يتم تأكيده بعد':'Email not confirmed yet'],[/unable to validate email|invalid email|email.*invalid|invalid.*email|bad email/i,ar?'صيغة البريد الإلكتروني غير صحيحة':'Invalid email format'],[/user (not found|already registered|exists)/,ar?'المستخدم غير موجود أو مسجّل مسبقاً':'User not found or already exists'],[/already.*registered|email.*exists/,ar?'البريد الإلكتروني مسجّل مسبقاً':'Email already registered'],[/duplicate key|already exists|unique constraint/,ar?'القيمة موجودة مسبقاً':'Value already exists'],[/violates foreign key|foreign key constraint/,ar?'لا يمكن الحذف — مرتبط بسجلات أخرى':'Cannot delete — linked to other records'],[/violates not.?null|null value in column/,ar?'حقل مطلوب فارغ':'A required field is empty'],[/violates check constraint|check constraint/,ar?'القيمة غير مسموح بها':'Value not allowed'],[/permission denied|insufficient.*privileg|not authorized|unauthorized|forbidden|rls/,ar?'ليست لديك صلاحية لهذا الإجراء':'You don’t have permission for this action'],[/jwt expired|jwt.*invalid|invalid token|session/,ar?'انتهت الجلسة — أعد تسجيل الدخول':'Session expired — please sign in again'],[/otp_expired|otp expired|email link.*expired|link.*expired|expired.*confirmation/i,ar?'انتهت صلاحية رابط التأكيد — اطلب رابطاً جديداً':'Confirmation link expired — request a new one'],[/access_denied|access denied/i,ar?'تم رفض الوصول':'Access denied'],[/network|failed to fetch|networkerror|fetch.*failed/,ar?'تعذّر الاتصال بالخادم — تحقق من الإنترنت':'Could not connect to server — check your internet'],[/timeout|timed out|انتهت مهلة/,ar?'انتهت مهلة الاتصال — حاول مرة أخرى':'Connection timed out — try again'],[/for security purposes.*after\s*(\d+)\s*seconds?/i,ar?'لأسباب أمنية — انتظر قليلاً ثم حاول مرة أخرى':'For security — please wait a bit and try again'],[/rate limit|too many requests|over_email_send_rate_limit|email rate limit/i,ar?'محاولات كثيرة — انتظر قليلاً':'Too many attempts — please wait'],[/password.*short|weak.*password|password.*weak|password should be|easy to guess|known to be weak|password is known/,ar?'كلمة المرور ضعيفة — اختر كلمة أقوى':'Password is too weak — choose a stronger one'],[/not found/,ar?'العنصر غير موجود':'Item not found']];for(const[re,msg]of map){if(re.test(s))return msg}return raw.length>120?raw.slice(0,120)+'…':raw};
export default function App(){const[view,setView]=useState('loading');const[sb,setSb]=useState(null);const[user,setUser]=useState(null);const[gmDone,setGmDone]=useState(false);const[toast,setToast]=useState(null);const[lang,setLang]=useState(()=>localStorage.getItem('jisr_lang')||'ar');const setLangPersist=(l)=>{const v=typeof l==='function'?l(lang):l;setLang(v);localStorage.setItem('jisr_lang',v)};const tt=(m,type)=>{if(m==null)return;const msg=String(m);let t=type;if(!t){const sLow=msg.toLowerCase();const arErr=['خطأ','فشل','تعذّر','تعذر','مطلوب','الرجاء','يجب','لا يمكن','لا يدعم','غير متطابق','غير صحيح','غير صالح','غير مسجّل','غير مسجل','أدخل','املأ','أكبر من','منتهية','انتهت'];const enErrRe=/\berror\b|\bfail|\binvalid\b|\bdenied\b|\bforbidden\b|\bcannot\b|can['\u2019]t|don['\u2019]t|doesn['\u2019]t|\bmust\s|\brequired\b|do(es)?\s+not\s|is\s+not\s|\bplease\s+(enter|fill|complete|select|provide)\b|\bexpired\b|\btimed?\s*out\b|\bpermission\b|\bunauthor/i;if(arErr.some(k=>msg.includes(k))||enErrRe.test(sLow))t='error';else if(msg.includes('حذف')||msg.includes('إلغاء')||/\bdelet|\bremov|\bcancel/i.test(sLow))t='delete';else t='success'}setToast({msg,type:t});setTimeout(()=>setToast(null),3000)};const ttErr=(err)=>{const m=translateErr(err,lang);tt((lang==='ar'?'خطأ: ':'Error: ')+m,'error')};useEffect(()=>{const client=getSupabase();setSb(client);
// Detect Supabase auth redirect errors in URL hash (e.g. otp_expired, access_denied)
try{const h=window.location.hash||'';if(h.includes('error=')||h.includes('error_code=')){const p=new URLSearchParams(h.replace(/^#/,''));const code=p.get('error_code')||'';const desc=p.get('error_description')||p.get('error')||'';const fakeErr={message:code||desc||'access_denied',error_description:desc};setTimeout(()=>{const m=translateErr(fakeErr,localStorage.getItem('jisr_lang')||'ar');setToast({msg:((localStorage.getItem('jisr_lang')||'ar')==='ar'?'خطأ: ':'Error: ')+m,type:'error'});setTimeout(()=>setToast(null),5000)},400);history.replaceState(null,'',window.location.pathname+window.location.search)}}catch{}
// Handle email confirmation via token_hash (PKCE-style — Gmail/scanners can't pre-consume)
try{const sp=new URLSearchParams(window.location.search);const tokenHash=sp.get('token_hash');const otpType=sp.get('type');if(tokenHash&&otpType){const al=localStorage.getItem('jisr_lang')||'ar';client.auth.verifyOtp({token_hash:tokenHash,type:otpType}).then(({error})=>{if(error){const m=translateErr(error,al);setToast({msg:(al==='ar'?'خطأ: ':'Error: ')+m,type:'error'});setTimeout(()=>setToast(null),5000)}else{client.auth.signOut().catch(()=>{});setToast({msg:al==='ar'?'تم تأكيد البريد — حسابك قيد المراجعة من المدير العام':'Email confirmed — your account is pending GM approval',type:'success'});setTimeout(()=>setToast(null),5000)}history.replaceState(null,'',window.location.pathname)})}}catch{}
// Check if user is coming back from password reset link
client.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){setView('reset')}});
// Run settings check and session check in PARALLEL for faster startup
let resolved=false;
const timeout=setTimeout(()=>{if(!resolved){setGmDone(true);setView('login')}},5000);
const settingsP=client.from('system_settings').select('setting_key,setting_value').eq('setting_key','gm_setup_complete').single();
const sessionP=client.auth.getSession();
Promise.all([settingsP,sessionP]).then(async([settingsRes,sessionRes])=>{resolved=true;clearTimeout(timeout);const done=settingsRes.data?.setting_value==='true';setGmDone(done);const session=sessionRes.data?.session;if(!session){setView('login');return}try{const{data:u}=await client.from('users').select('*,person:persons!users_person_id_fkey(*),role:roles!users_role_id_fkey(id,name_ar,name_en,color)').eq('auth_user_id',session.user.id).single();if(u){if(!u.is_active){await client.auth.signOut();setView('login')}else{if(u.preferred_lang)setLangPersist(u.preferred_lang);try{const{data:permRows}=await client.from('v_user_effective_permissions').select('module,action,is_granted,branch_scope,branch_id').eq('user_id',u.id).eq('is_granted',true);u.perms=permRows||[]}catch{u.perms=[]}setUser(u);setView('app')}}else setView('login')}catch(e){setView('login')}}).catch(()=>{resolved=true;clearTimeout(timeout);setView('login')})},[]);const handleLogin=async(idNumber,pass)=>{const withTimeout=(promise,ms=10000)=>Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error(lang==='ar'?'انتهت مهلة الاتصال — حاول مرة أخرى':'Connection timed out — try again')),ms))]);const{data:emailLookup,error:pe}=await withTimeout(sb.rpc('lookup_email_by_id_number',{p_id_number:idNumber}));if(pe||!emailLookup)throw new Error(lang==='ar'?'رقم الهوية غير مسجل أو الحساب غير مفعّل':'ID number not registered or account inactive');const{data,error}=await withTimeout(sb.auth.signInWithPassword({email:emailLookup,password:pass}));if(error)throw error;const{data:u,error:e2}=await withTimeout(sb.from('users').select('*,person:persons!users_person_id_fkey(*),role:roles!users_role_id_fkey(id,name_ar,name_en,color)').eq('auth_user_id',data.user.id).single());if(e2||!u)throw new Error('User not found');if(!u.is_active){await sb.auth.signOut();throw new Error(lang==='ar'?'حسابك قيد المراجعة — يرجى انتظار موافقة المسؤول':'Your account is under review — please wait for admin approval')}sb.from('users').update({last_login_at:new Date().toISOString()}).eq('id',u.id).then(()=>{});try{const{data:permRows}=await sb.from('v_user_effective_permissions').select('module,action,is_granted,branch_scope,branch_id').eq('user_id',u.id).eq('is_granted',true);u.perms=permRows||[]}catch{u.perms=[]}setUser(u);if(u.preferred_lang)setLangPersist(u.preferred_lang);tt(lang==='ar'?'تم تسجيل الدخول بنجاح':'Logged in successfully');setView('app')};const handleSetup=async(form)=>{
const{data:auth,error:e1}=await sb.auth.signUp({email:form.em,password:form.pw});
if(e1)throw e1;
if(!auth.user)throw new Error(lang==='ar'?'فشل إنشاء حساب المصادقة':'Failed to create auth user');
const{error:rpcError}=await sb.rpc('complete_gm_setup',{
p_auth_user_id:auth.user.id,
p_name_ar:form.ar,
p_name_en:form.en,
p_id_number:form.id,
p_personal_phone:'+966'+form.ph,
p_email:form.em
});
if(rpcError){console.error('RPC complete_gm_setup failed:',rpcError);throw new Error(lang==='ar'?'تم إنشاء حساب المصادقة لكن فشل إعداد الملف الشخصي — تواصل مع الدعم':'Auth created but profile setup failed — contact support')}
setGmDone(true)};const handleLogout=async()=>{await sb.auth.signOut();setUser(null);setView('login')};const switchLang=()=>{const newL=lang==='ar'?'en':'ar';setLangPersist(newL);if(sb&&user)sb.from('users').update({preferred_lang:newL}).eq('id',user.id)};const L=LANG[lang];
const GlobalToast=()=>{if(!toast)return null;const{msg,type}=toast;const isErr=type==='error';const isDel=type==='delete';const clr=isErr?C.red:(isDel?'#e67e22':C.ok);const bg=isErr?'rgba(192,57,43,.12)':(isDel?'rgba(230,126,34,.12)':'rgba(39,160,70,.12)');const bdr=isErr?'rgba(192,57,43,.2)':(isDel?'rgba(230,126,34,.2)':'rgba(39,160,70,.2)');return<div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:99999,background:bg,color:clr,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,padding:'12px 24px',borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,.5)',border:'1px solid '+bdr,display:'flex',alignItems:'center',gap:8,animation:'slideDown .3s ease',pointerEvents:'none',direction:lang==='ar'?'rtl':'ltr'}}>{isErr?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}{msg}</div>}
if(view==='loading')return<Splash/>;if(view==='setup')return<><LoginPage sb={sb} onLogin={handleLogin} onSetup={()=>setView('setup')} toast={tt} gmDone={gmDone} lang={lang} switchLang={switchLang} L={L}/><SetupPage sb={sb} onSetup={handleSetup} onBack={()=>setView('login')} toast={tt} lang={lang} switchLang={switchLang} L={L}/><GlobalToast/></>;if(view==='reset')return<><ResetPage sb={sb} onDone={()=>setView('login')} toast={tt} lang={lang} L={L}/><GlobalToast/></>;if(view==='login')return<><LoginPage sb={sb} onLogin={handleLogin} onSetup={()=>setView('setup')} toast={tt} gmDone={gmDone} lang={lang} switchLang={switchLang} L={L}/><GlobalToast/></>;return<><DashPage sb={sb} user={user} onLogout={handleLogout} toast={tt} lang={lang} switchLang={switchLang} setLang={setLangPersist}/><GlobalToast/></>}

function Splash(){return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',fontFamily:F,direction:'rtl'}}><Logo size={80}/><Css/></div>}

function AnalogClock({size=30}){
  const[now,setNow]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id)},[]);
  const h=now.getHours()%12,m=now.getMinutes(),s=now.getSeconds();
  const hAng=(h*30)+(m*0.5)-90,mAng=(m*6)+(s*0.1)-90,sAng=(s*6)-90;
  const r=size/2,c=r;
  const pt=(ang,len)=>{const rad=ang*Math.PI/180;return{x:c+len*Math.cos(rad),y:c+len*Math.sin(rad)}};
  const ticks=[];
  for(let i=0;i<12;i++){
    const a=(i*30-90)*Math.PI/180;
    const inner=r-(i%3===0?3.5:2.5),outer=r-1;
    ticks.push(<line key={i} x1={c+inner*Math.cos(a)} y1={c+inner*Math.sin(a)} x2={c+outer*Math.cos(a)} y2={c+outer*Math.sin(a)} stroke={i%3===0?'rgba(212,160,23,.7)':'rgba(255,255,255,.35)'} strokeWidth={i%3===0?1.1:0.6} strokeLinecap="round"/>);
  }
  const ph=pt(hAng,r*0.46),pm=pt(mAng,r*0.66),ps=pt(sAng,r*0.78);
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'block',flexShrink:0}}>
      <defs>
        <linearGradient id="clockBg" gradientTransform="rotate(70)">
          <stop offset="0%" stopColor="#2D2D2D"/>
          <stop offset="50%" stopColor="#252525"/>
          <stop offset="100%" stopColor="#1F1F1F"/>
        </linearGradient>
      </defs>
      <circle cx={c} cy={c} r={r-0.5} fill="url(#clockBg)" stroke="rgba(212,160,23,.4)" strokeWidth="1"/>
      {ticks}
      <line x1={c} y1={c} x2={ph.x} y2={ph.y} stroke="rgba(255,255,255,.92)" strokeWidth="1.7" strokeLinecap="round"/>
      <line x1={c} y1={c} x2={pm.x} y2={pm.y} stroke="rgba(255,255,255,.75)" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1={c} y1={c} x2={ps.x} y2={ps.y} stroke="#D4A017" strokeWidth="0.8" strokeLinecap="round"/>
      <circle cx={c} cy={c} r="1.3" fill="#D4A017"/>
    </svg>
  );
}

// ═══ Registration form helpers ═══
const normalizeDigits=s=>(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const collapseSpaces=s=>(s||'').trim().replace(/\s+/g,' ');
const toTitleCase=s=>collapseSpaces(s).toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
const isValidSaudiId=id=>{if(!/^[123]\d{9}$/.test(id))return false;const d=id.split('').map(Number);let sum=0;for(let i=0;i<9;i++){if(i%2===0){const x=d[i]*2;sum+=x>9?x-9:x}else sum+=d[i]}return(10-(sum%10))%10===d[9]};
const luhn10=id=>{const d=id.split('').map(Number);let sum=0;for(let i=0;i<9;i++){if(i%2===0){const x=d[i]*2;sum+=x>9?x-9:x}else sum+=d[i]}return(10-(sum%10))%10===d[9]};
const validateIdByType=(id,idType)=>{if(!/^\d{10}$/.test(id))return false;const t=idType||'';if(t.includes('وطنية'))return id[0]==='1'&&luhn10(id);if(t.includes('إقامة'))return id[0]==='2'&&luhn10(id);if(t.includes('حدود'))return true;return luhn10(id)};
const isSuspiciousPhone=digits=>{if(digits.length!==9)return false;if(new Set(digits).size<=2)return true;if(/(\d)\1{4,}/.test(digits))return true;const arr=digits.split('').map(Number);const seq=step=>arr.every((d,i)=>i===0||d===((arr[i-1]+step+10)%10));return seq(1)||seq(-1)};
const normalizePhone=input=>{let p=normalizeDigits(input||'').replace(/[\s\-()]/g,'');if(p.startsWith('+966'))p=p.slice(4);else if(p.startsWith('966'))p=p.slice(3);else if(p.startsWith('0'))p=p.slice(1);return p};
const passwordStrength=pw=>{if(!pw)return{level:0,label:''};let s=0;if(pw.length>=8)s++;if(pw.length>=12)s++;if(/[A-Z]/.test(pw)&&/[a-z]/.test(pw))s++;if(/\d/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;return s<=2?{level:1,label:'weak'}:s<=3?{level:2,label:'medium'}:{level:3,label:'strong'}};
const ARABIC_KB_MAP={'ض':'q','ص':'w','ث':'e','ق':'r','ف':'t','غ':'y','ع':'u','ه':'i','خ':'o','ح':'p','ج':'[','د':']','ش':'a','س':'s','ي':'d','ب':'f','ل':'g','ا':'h','ت':'j','ن':'k','م':'l','ك':';','ط':"'",'ئ':'z','ء':'x','ؤ':'c','ر':'v','ى':'n','ة':'m','و':',','ز':'.','ظ':'/','ذ':'`','َ':'Q','ً':'W','ُ':'E','ٌ':'R','ِ':'A','ٍ':'S','ّ':'~','ْ':'X','أ':'H','إ':'Y','آ':'N','ـ':'J','،':',','؛':';','؟':'?','÷':'/','×':'*','ﻻ':'b','ﻷ':'B','ﻹ':'b','ﻵ':'b'};
const arToEn=s=>(s||'').split('').map(c=>ARABIC_KB_MAP[c]!==undefined?ARABIC_KB_MAP[c]:c).join('').replace(/[^\x20-\x7E]/g,'');

function LoginPage({sb,onLogin,onSetup,toast,gmDone,lang,switchLang,L}){
const[em,setEm]=useState(()=>localStorage.getItem('jisr_rem_id')||'');
const[pw,setPw]=useState('');
const[busy,setBusy]=useState(false);
const[showPw,setShowPw]=useState(false);
const[rem,setRem]=useState(()=>!!localStorage.getItem('jisr_rem_id'));
const[showForgot,setShowForgot]=useState(false);
const[loginErr,setLoginErr]=useState('');
const[forgotEmail,setForgotEmail]=useState('');
const[forgotResolvedEmail,setForgotResolvedEmail]=useState('');
const[forgotBusy,setForgotBusy]=useState(false);
const[forgotSent,setForgotSent]=useState(false);
const[showReg,setShowReg]=useState(false);
const[reg,setReg]=useState({nationality_id:'',nationality_ar:'',name_ar:'',name_en:'',email:'',phone:'',id_number:'',branch_id:'',pw:'',pw2:''});
const[regHrsd,setRegHrsd]=useState({phase:'idle',sessionToken:null,captchaImage:null,captchaInput:'',attempts:0,error:null,manual:false,triedIqama:''});
const[regBusy,setRegBusy]=useState(false);
const[regDone,setRegDone]=useState(false);
const[regStep,setRegStep]=useState(1);
const[regShowPw,setRegShowPw]=useState(false);
const[regShowPw2,setRegShowPw2]=useState(false);
const[regErr,setRegErr]=useState({});
const[natOpen,setNatOpen]=useState(false);
const[natSearch,setNatSearch]=useState('');
const[branchOpen,setBranchOpen]=useState(false);
const[branchSearch,setBranchSearch]=useState('');
const[regBranches,setRegBranches]=useState([]);
const[regIdTypes,setRegIdTypes]=useState([]);
const[regBanks,setRegBanks]=useState([]);
const[regBankOpen,setRegBankOpen]=useState(false);
const[idTypeOpen,setIdTypeOpen]=useState(false);
const[bankDropOpen,setBankDropOpen]=useState(false);
const defaultNats=[{ar:'سعودي',en:'Saudi'},{ar:'يمني',en:'Yemeni'},{ar:'مصري',en:'Egyptian'},{ar:'سوداني',en:'Sudanese'},{ar:'سوري',en:'Syrian'},{ar:'أردني',en:'Jordanian'},{ar:'عراقي',en:'Iraqi'},{ar:'فلسطيني',en:'Palestinian'},{ar:'لبناني',en:'Lebanese'},{ar:'تونسي',en:'Tunisian'},{ar:'مغربي',en:'Moroccan'},{ar:'جزائري',en:'Algerian'},{ar:'ليبي',en:'Libyan'},{ar:'عماني',en:'Omani'},{ar:'إماراتي',en:'Emirati'},{ar:'بحريني',en:'Bahraini'},{ar:'كويتي',en:'Kuwaiti'},{ar:'قطري',en:'Qatari'},{ar:'باكستاني',en:'Pakistani'},{ar:'هندي',en:'Indian'},{ar:'بنغلاديشي',en:'Bangladeshi'},{ar:'فلبيني',en:'Filipino'},{ar:'إندونيسي',en:'Indonesian'},{ar:'نيبالي',en:'Nepali'},{ar:'سريلانكي',en:'Sri Lankan'},{ar:'إثيوبي',en:'Ethiopian'},{ar:'كيني',en:'Kenyan'},{ar:'نيجيري',en:'Nigerian'},{ar:'أمريكي',en:'American'},{ar:'بريطاني',en:'British'},{ar:'أخرى',en:'Other'}];
const[nats,setNats]=useState(defaultNats);
useEffect(()=>{if(!sb)return;sb.from('nationalities').select('id,name_ar,name_en').eq('is_active',true).order('sort_order',{nullsFirst:false}).order('name_ar').then(({data})=>{if(data&&data.length>0){const seen=new Set();const unique=data.filter(d=>d.name_ar&&!seen.has(d.name_ar)&&seen.add(d.name_ar)).map(d=>({id:d.id,ar:d.name_ar,en:d.name_en||d.name_ar}));setNats(unique)}})},[sb]);
const filteredNats=nats.filter(n=>!natSearch||n.ar.includes(natSearch)||n.en.toLowerCase().includes(natSearch.toLowerCase()));
useEffect(()=>{if(!sb)return;sb.from('branches').select('id,branch_code').is('deleted_at',null).then(({data})=>{if(data){const sorted=[...data].sort((a,b)=>{const na=parseInt((a.branch_code||'').match(/\d+/g)?.pop()||'0',10);const nb=parseInt((b.branch_code||'').match(/\d+/g)?.pop()||'0',10);return na-nb});setRegBranches(sorted)}})},[sb]);
const filteredBranches=regBranches.filter(b=>!branchSearch||(b.branch_code||'').toLowerCase().includes(branchSearch.toLowerCase()));
const regInpS={width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:'clamp(12px,1.8vw,13px)',fontWeight:600,color:'var(--tx)',background:'var(--modal-input-bg)',outline:'none',textAlign:'center',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'};
const regLblS={fontSize:'clamp(10px,1.5vw,12px)',fontWeight:700,color:'rgba(255,255,255,.58)',marginBottom:'clamp(3px,.5vw,5px)'};
const regSelS={...regInpS,cursor:'pointer',textAlign:'right',paddingRight:14,appearance:'none',WebkitAppearance:'none',MozAppearance:'none',overflowY:'auto',backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff40' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",backgroundRepeat:'no-repeat',backgroundPosition:'14px center'};

const go=async e=>{
e.preventDefault();if(!em||!pw)return toast(lang==='ar'?'الرجاء إدخال رقم الهوية وكلمة المرور':'Please enter ID and password');
if(rem){localStorage.setItem('jisr_rem_id',em)}else{localStorage.removeItem('jisr_rem_id')}
setBusy(true);try{await onLogin(em,pw)}catch(err){const msg=err.message?.includes('Invalid')||err.message?.includes('invalid')?(lang==='ar'?'تعذّر تسجيل الدخول — تحقق من البريد وكلمة المرور':'Login failed — check email and password'):err.message?.includes('fetch')||err.message?.includes('timed out')||err.message?.includes('network')||err.message?.includes('مهلة')?(lang==='ar'?'تعذّر الاتصال بالخادم — تحقق من الإنترنت وحاول مرة أخرى':'Could not connect to server — check your internet and try again'):err.message||(lang==='ar'?'خطأ':'Error');toast((lang==='ar'?'خطأ: ':'Error: ')+msg,'error')}setBusy(false)};

const sendReset=async()=>{
const ar=lang==='ar';
if(!forgotEmail){toast(ar?'الرجاء إدخال رقم الهوية':'Please enter your ID number');return}
if(!/^\d{10}$/.test(forgotEmail)){toast(ar?'رقم الهوية 10 أرقام':'ID must be 10 digits');return}
if(!sb){toast(ar?'خطأ: لا يوجد اتصال':'Error: No connection');return}
setForgotBusy(true);
try{
const{data:emailLookup,error:lookupErr}=await sb.rpc('lookup_email_by_id_number',{p_id_number:forgotEmail});
if(lookupErr||!emailLookup)throw new Error(ar?'رقم الهوية غير مسجل':'ID number not registered');
const{error}=await sb.auth.resetPasswordForEmail(emailLookup,{redirectTo:window.location.origin});
if(error)throw error;
setForgotResolvedEmail(emailLookup);
setForgotSent(true);
toast(ar?'تم إرسال رابط إعادة التعيين':'Reset link sent successfully');
}
catch(err){toast((ar?'خطأ: ':'Error: ')+translateErr(err,lang),'error')}
setForgotBusy(false)};

const regCallHrsd=async(body)=>{const res=await fetch('/.netlify/functions/check-hrsd-worker',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);return data};
const regStartHrsd=async(iqama)=>{setRegHrsd(c=>({...c,phase:'loading',error:null,triedIqama:iqama}));try{const r=await regCallHrsd({action:'init'});setRegHrsd(c=>({...c,phase:'captcha',sessionToken:r.session,captchaImage:r.captchaImage,captchaInput:''}))}catch(e){setRegHrsd(c=>({...c,phase:'idle',error:e.message,manual:true}))}};
const regSubmitHrsd=async()=>{if(!regHrsd.captchaInput||regHrsd.captchaInput.length<3)return;setRegHrsd(c=>({...c,phase:'verifying',error:null}));try{const r=await regCallHrsd({action:'verify',iqama:reg.id_number,captcha:regHrsd.captchaInput,session:regHrsd.sessionToken});if(r.status==='invalid_captcha'||r.status==='unknown'){const next=(regHrsd.attempts||0)+1;if(next>=3){setRegHrsd({phase:'idle',sessionToken:null,captchaImage:null,captchaInput:'',attempts:0,error:null,manual:true,triedIqama:reg.id_number});return}const fresh=await regCallHrsd({action:'init'});setRegHrsd(c=>({...c,phase:'captcha',sessionToken:fresh.session,captchaImage:fresh.captchaImage,captchaInput:'',error:lang==='ar'?`رمز التحقق غير صحيح — ${next+1}/3`:`Invalid captcha — ${next+1}/3`,attempts:next}));return}if(r.code==='SESSION_EXPIRED'){const fresh=await regCallHrsd({action:'init'});setRegHrsd(c=>({...c,phase:'captcha',sessionToken:fresh.session,captchaImage:fresh.captchaImage,captchaInput:'',error:lang==='ar'?'انتهت الجلسة':'Session expired'}));return}if(r.status==='found'&&r.name){setReg(p=>({...p,name_ar:r.name}));setRegHrsd(c=>({...c,phase:'fetched',error:null}))}else{setRegHrsd(c=>({...c,phase:'idle',manual:true,error:lang==='ar'?'لم يتم العثور على البيانات':'Not found'}))}}catch(e){setRegHrsd(c=>({...c,phase:'idle',error:e.message,manual:true}))}};

const doRegister=async()=>{
if(!sb){toast(lang==='ar'?'خطأ: لا يوجد اتصال':'Error: No connection');return}
setRegBusy(true);
const ar=lang==='ar';
try{
const email=(reg.email||'').toLowerCase().trim();
const phoneFull='+966'+normalizePhone(reg.phone);
const idDigits=normalizeDigits(reg.id_number||'');
const nameAr=collapseSpaces(reg.name_ar);
const nameEn=toTitleCase(reg.name_en);
const isSaudi=reg.nationality_ar==='سعودي';
const idTypeCode=isSaudi?'national_id':'iqama';
const{data:auth,error:e1}=await sb.auth.signUp({email,password:reg.pw});
if(e1){if(/already.*registered|exists/i.test(e1.message))setRegErr({email:ar?'البريد الإلكتروني مسجّل مسبقاً':'Email already registered'});throw e1}
if(!auth.user)throw new Error(ar?'فشل إنشاء حساب المصادقة':'Failed to create auth user');
const{error:rpcError}=await sb.rpc('register_new_user',{p_auth_user_id:auth.user.id,p_nickname:nameAr,p_id_number:idDigits,p_id_type_code:idTypeCode,p_nationality_id:reg.nationality_id,p_personal_phone:phoneFull,p_email:email});
if(rpcError){console.error('RPC register_new_user failed:',rpcError);throw new Error(ar?'تم إنشاء حساب المصادقة لكن فشل إعداد الملف الشخصي — تواصل مع الدعم':'Auth created but profile setup failed — contact support')}
await sb.auth.signOut();
setReg({nationality_id:'',nationality_ar:'',name_ar:'',name_en:'',email:'',phone:'',id_number:'',branch_id:'',pw:'',pw2:''});
setRegDone(true);toast(ar?'تم تسجيل الحساب بنجاح':'Account registered successfully');
}catch(err){if(!Object.keys(regErr).length)toast((ar?'خطأ: ':'Error: ')+translateErr(err,lang),'error')}
setRegBusy(false)};

// Auto-translate name_ar → name_en when name_ar changes
const regTlTimerRef=React.useRef(null);
const regTlReqRef=React.useRef(0);
useEffect(()=>{
const ar=reg.name_ar.trim();
if(!ar){if(reg.name_en)setReg(p=>({...p,name_en:''}));return}
if(regTlTimerRef.current)clearTimeout(regTlTimerRef.current);
const reqId=++regTlReqRef.current;
regTlTimerRef.current=setTimeout(async()=>{
let translated=null;
try{const r=await fetch('/.netlify/functions/translate-name',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:ar,source:'ar'})});if(r.ok){const d=await r.json();translated=d.translated}}catch{}
if(reqId!==regTlReqRef.current)return;if(!translated)return;
setReg(p=>p.name_en===translated?p:{...p,name_en:translated});
},350);
return()=>{if(regTlTimerRef.current)clearTimeout(regTlTimerRef.current)};
},[reg.name_ar]);

// Auto-trigger HRSD when non-Saudi enters valid Iqama
useEffect(()=>{
if(!showReg)return;
const isSaudi=reg.nationality_ar==='سعودي';
if(isSaudi||!reg.nationality_ar)return;
const iq=reg.id_number;
if(!/^2\d{9}$/.test(iq))return;
if(regHrsd.triedIqama===iq)return;
if(regHrsd.phase!=='idle')return;
if(regHrsd.manual)return;
regStartHrsd(iq);
},[reg.id_number,reg.nationality_ar,showReg]);

const regFirstErr=Object.values(regErr)[0];
const RegErrBadge=regFirstErr?<div style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',display:'flex',alignItems:'center',gap:6,fontSize:'clamp(10px,1.4vw,12px)',color:'rgba(192,57,43,.85)',fontWeight:600,maxWidth:'60%',pointerEvents:'none',whiteSpace:'nowrap'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{regFirstErr}</span></div>:null;

return(<div className='login-wrap' style={{display:'flex',height:'100vh',direction:L.dir,fontFamily:F,background:'var(--bg)',overflow:'hidden'}}><div className='login-form' style={{width:'100%',maxWidth:520,flexShrink:0,background:'var(--modal-bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-start',padding:'clamp(28px,6vh,70px) clamp(18px,6vw,80px) clamp(20px,4vw,44px)',position:'relative',boxShadow:lang==='ar'?'-28px 0 70px rgba(0,0,0,.38)':'28px 0 70px rgba(0,0,0,.38)',overflow:'hidden'}}><LangBtn L={L} switchLang={switchLang} abs/><div style={{textAlign:'center',marginBottom:'clamp(20px,4vw,32px)',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',gap:14}}><div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(145deg,rgba(212,160,23,.14),rgba(212,160,23,.04))',border:'1px solid rgba(212,160,23,.22)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 24px rgba(212,160,23,.12), inset 0 1px 0 rgba(255,255,255,.06)'}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2.5" fill="rgba(212,160,23,.18)" stroke="#D4A017" strokeWidth="1.6"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#D4A017" strokeWidth="1.6" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#D4A017"/></svg></div><div><div style={{fontSize:'clamp(22px,3.5vw,28px)',fontWeight:700,color:'var(--tx)',letterSpacing:'-.5px',lineHeight:1.2}}>{L.title}</div><div style={{fontSize:14,fontWeight:500,color:'rgba(255,255,255,.55)',marginTop:8}}>{L.sub}</div></div></div><form onSubmit={go} style={{width:'100%',display:'flex',flexDirection:'column',gap:'clamp(10px,1.8vw,16px)'}}><div><div style={{fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:8}}>{L.email}</div><div style={{position:'relative'}}><span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'right':'left']:16,pointerEvents:'none',display:'flex'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="#D4A017" strokeWidth="1.5"/><circle cx="12" cy="9" r="2.2" fill="#D4A017"/><path d="M8 15c0-1.5 1.6-2.8 4-2.8s4 1.3 4 2.8" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="18" x2="15" y2="18" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round"/></svg></span><input value={em} onChange={e=>{setEm(e.target.value.replace(/\D/g,'').slice(0,10));setLoginErr('')}} type="text" inputMode="numeric" maxLength={10} placeholder="1XXXXXXXXX" required style={finS}/></div></div><div><div style={{fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:8}}>{L.pass}</div><div style={{position:'relative'}}><span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'right':'left']:16,pointerEvents:'none',display:'flex'}}>{pw?<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2.5" stroke="#D4A017" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 019.9-1" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#D4A017"/></svg>:ICO.lock}</span><input value={pw} onChange={e=>{setPw(arToEn(e.target.value));setLoginErr('')}} type={showPw?'text':'password'} placeholder="······" required style={finS}/><button type="button" onClick={()=>setShowPw(!showPw)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'left':'right']:14,background:'none',border:'none',cursor:'pointer',display:'flex',padding:4}}>{showPw?ICO.eyeOn:ICO.eyeOff}</button></div></div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>setRem(!rem)}><div style={{width:16,height:16,borderRadius:5,border:rem?'none':'1.5px solid rgba(255,255,255,.3)',background:rem?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'.2s',flexShrink:0}}>{rem&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#141414" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div><span style={{fontSize:'clamp(10px,1.5vw,12px)',fontWeight:600,color:rem?'rgba(255,255,255,.75)':'rgba(255,255,255,.55)'}}>{L.remember}</span></label><button type="button" onClick={()=>{setForgotEmail(em);setForgotSent(false);setShowForgot(true)}} style={{fontSize:'clamp(10px,1.5vw,12px)',fontWeight:700,color:'rgba(212,160,23,.65)',textDecoration:'none',background:'none',border:'none',cursor:'pointer',fontFamily:F,padding:0}}>{L.forgot}</button></div><button type="submit" disabled={busy} style={{...goldS,marginTop:6,opacity:busy?.7:1,gap:10,flexShrink:0}}>{busy?<div style={{width:20,height:20,border:'2.5px solid rgba(14,14,14,.3)',borderTopColor:C.dk,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:L.login}</button></form>
<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:18,width:'100%',flexShrink:0,fontSize:13,fontFamily:F}}><span style={{color:'rgba(255,255,255,.55)',fontWeight:500}}>{lang==='ar'?'ليس لديك حساب؟':'No account?'}</span><button onClick={()=>{setReg({nationality_id:'',nationality_ar:'',name_ar:'',name_en:'',email:'',phone:'',id_number:'',branch_id:'',pw:'',pw2:''});setRegHrsd({phase:'idle',sessionToken:null,captchaImage:null,captchaInput:'',attempts:0,error:null,manual:false,triedIqama:''});setRegErr({});setRegDone(false);setShowReg(true)}} style={{background:'none',border:'none',padding:0,cursor:'pointer',fontFamily:F,fontSize:13,fontWeight:600,color:C.gold,textDecoration:'underline',textUnderlineOffset:'3px'}}>{lang==='ar'?'تسجيل حساب جديد':'Create New Account'}</button></div>
{!gmDone&&<button onClick={onSetup} style={{width:'100%',height:36,marginTop:6,background:'none',border:'none',fontFamily:F,fontSize:'clamp(9px,1.3vw,10px)',fontWeight:700,color:C.gold,cursor:'pointer'}}>{lang==='ar'?'إعداد أولي (المدير العام فقط)':'Initial Setup (Admin only)'}</button>}
</div><BrandPanel lang={lang} L={L}/>
{showForgot&&(()=>{
const fSF={width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',outline:'none',background:'linear-gradient(180deg,#323232 0%,#262626 100%)',boxSizing:'border-box',textAlign:'center',transition:'.2s',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)'};
const fLblS={fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:8,textAlign:'start'};
return<div onClick={()=>setShowForgot(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--modal-bg)',borderRadius:16,width:520,maxWidth:'calc(100vw - 24px)',height:'auto',maxHeight:'calc(100vh - 24px)',display:'flex',flexDirection:'column',boxShadow:'0 20px 50px rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.06)',position:'relative'}}>
<style>{`.fg-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.fg-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.fg-nav-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}.fg-nav-btn:disabled{opacity:.5;cursor:not-allowed}.fg-nav-btn:disabled:hover .nav-ico{background:rgba(212,160,23,.1);color:#D4A017}.fg-close-btn:hover{background:linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)!important;border-color:rgba(192,57,43,.4)!important;color:#e5867a!important}.fg-modal-title{font-size:22px}.fg-modal-header{padding:20px 24px 0}.fg-modal-content{padding:24px;scrollbar-width:none;-ms-overflow-style:none}.fg-modal-content::-webkit-scrollbar{width:0;height:0;display:none}.fg-modal-fieldset-pad{padding:20px 22px}.fg-modal-fieldset-label{font-size:13px}.fg-modal-footer{padding:4px 24px 16px}@media(max-width:560px){.fg-modal-title{font-size:18px!important}.fg-modal-header{padding:16px 16px 0!important}.fg-modal-content{padding:16px!important}.fg-modal-fieldset-pad{padding:18px 14px 16px!important}.fg-modal-fieldset-label{font-size:12px!important}.fg-modal-footer{padding:4px 16px 14px!important}.fg-nav-btn{font-size:14px!important}}`}</style>
{!forgotSent?<>
<div className="fg-modal-header" style={{flexShrink:0,display:'flex',flexDirection:'column'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
<div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><rect x="3" y="11" width="18" height="11" rx="2.5" stroke={C.gold} strokeWidth="1.8"/><path d="M7 11V7a5 5 0 019.9-1" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill={C.gold}/></svg>
<div className="fg-modal-title" style={{fontWeight:600,color:'var(--tx)',fontFamily:F,lineHeight:1.2,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='ar'?'نسيت كلمة المرور؟':'Forgot Password?'}</div>
</div>
<button className="fg-close-btn" onClick={()=>setShowForgot(false)} style={{width:34,height:34,borderRadius:9,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',border:'1px solid rgba(255,255,255,.07)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:F,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
</div>
</div>
<div className="fg-modal-content" style={{display:'flex',flexDirection:'column',flex:1,gap:12}}>
<div className="fg-modal-fieldset-pad" style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',position:'relative'}}>
<div className="fg-modal-fieldset-label" style={{position:'absolute',top:-10,[lang==='ar'?'right':'left']:14,background:'var(--modal-bg)',padding:'0 8px',fontWeight:600,color:C.gold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>
<span>{lang==='ar'?'استعادة الحساب':'Account Recovery'}</span>
</div>
<div style={{fontSize:13,fontWeight:500,color:'rgba(255,255,255,.6)',lineHeight:1.7,marginBottom:16}}>{lang==='ar'?'أدخل رقم هويتك وسيتم إرسال رابط إعادة التعيين إلى البريد الإلكتروني المرتبط بحسابك':'Enter your ID number and a password reset link will be sent to the email associated with your account'}</div>
<div>
<div style={fLblS}>{lang==='ar'?'رقم الهوية':'ID Number'} <span style={{color:C.red,marginRight:2}}>*</span></div>
<input value={forgotEmail} onChange={e=>setForgotEmail(e.target.value.replace(/\D/g,'').slice(0,10))} onKeyDown={e=>{if(e.key==='Enter')sendReset()}} type="text" inputMode="numeric" maxLength={10} placeholder="1XXXXXXXXX" style={{...fSF,direction:'ltr'}} autoFocus/>
</div>
</div>
</div>
<div className="fg-modal-footer" style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:12,flexShrink:0}}>
<div style={{justifySelf:'start'}}/>
<div style={{justifySelf:'center'}}/>
<div style={{justifySelf:'end'}}>
<button onClick={sendReset} disabled={forgotBusy} className="fg-nav-btn"><span>{forgotBusy?(lang==='ar'?'جاري الإرسال…':'Sending…'):(lang==='ar'?'إرسال الرابط':'Send Link')}</span><span className="nav-ico">{forgotBusy?<span style={{width:12,height:12,border:'2px solid currentColor',borderRightColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}</span></button>
</div></div>
</>:<>
<div style={{padding:'40px 32px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1}}>
<div style={{width:72,height:72,borderRadius:'50%',background:'rgba(39,160,70,.08)',border:'2px solid rgba(39,160,70,.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:18}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="rgba(39,160,70,.9)" strokeWidth="2" strokeLinecap="round"/><path d="M22 2l-7 20-4-9-9-4 20-7z" fill="rgba(39,160,70,.15)" stroke="rgba(39,160,70,.9)" strokeWidth="2" strokeLinejoin="round"/></svg></div>
<div style={{fontSize:22,fontWeight:600,color:'var(--tx)',marginBottom:10,lineHeight:1.2}}>{lang==='ar'?'تم إرسال الرابط بنجاح':'Link Sent Successfully'}</div>
<div style={{fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',lineHeight:1.7,marginBottom:8}}>{lang==='ar'?'تم إرسال رابط إعادة تعيين كلمة المرور إلى':'A password reset link has been sent to'}</div>
<div style={{fontSize:15,fontWeight:600,color:C.gold,margin:'4px 0 16px',direction:'ltr'}}>{forgotResolvedEmail}</div>
<div style={{fontSize:13,fontWeight:500,color:'rgba(255,255,255,.45)',lineHeight:1.7,marginBottom:24,maxWidth:380}}>{lang==='ar'?'يرجى فتح بريدك الإلكتروني والضغط على الرابط المرسل لإعادة تعيين كلمة المرور':'Please open your email and click the link to reset your password'}</div>
<button onClick={()=>setShowForgot(false)} className="fg-nav-btn"><span>{lang==='ar'?'العودة لتسجيل الدخول':'Return to Login'}</span><span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points={lang==='ar'?'9 18 15 12 9 6':'15 18 9 12 15 6'}/></svg></span></button>
</div>
</>}
</div>
</div>;
})()}
{/* Register — single-step popup styled like Kafala "تسعيرة تنازل" modal */}
{showReg && (()=>{
const isSaudi=reg.nationality_ar==='سعودي';
const isNonSaudi=!!reg.nationality_ar&&!isSaudi;
const sF={width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',outline:'none',background:'linear-gradient(180deg,#323232 0%,#262626 100%)',boxSizing:'border-box',textAlign:'center',transition:'.2s',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)'};
const lblS={fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:8,textAlign:'start'};
const reqStar=<span style={{color:C.red,marginRight:2}}>*</span>;
const firstErr=Object.values(regErr)[0];
const idLabel=isNonSaudi?(lang==='ar'?'رقم الإقامة':'Iqama Number'):(lang==='ar'?'رقم الهوية الوطنية':'National ID');
const idPlaceholder=isNonSaudi?'2XXXXXXXXX':'1XXXXXXXXX';
const NameField=<div><div style={lblS}>{lang==='ar'?'الاسم':'Name'} {reqStar}</div><input value={reg.name_ar} onChange={e=>setReg(p=>({...p,name_ar:e.target.value.replace(/[^\u0600-\u06FF\s]/g,'')}))} maxLength={30} autoComplete="off" name="reg-name" style={{...sF,direction:'rtl'}} placeholder={lang==='ar'?'الاسم':'Name'}/></div>;
const NatField=<div><div style={lblS}>{lang==='ar'?'الجنسية':'Nationality'} {reqStar}</div>
<div style={{position:'relative'}}>
<div onClick={()=>setNatOpen(!natOpen)} style={{...sF,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:reg.nationality_ar?'var(--tx)':'rgba(255,255,255,.4)'}}>
<span>{reg.nationality_ar?(lang==='ar'?reg.nationality_ar:(nats.find(n=>n.ar===reg.nationality_ar)?.en||reg.nationality_ar)):(lang==='ar'?'اختر':'Select')}</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{position:'absolute',left:12,top:'50%',transform:natOpen?'translateY(-50%) rotate(180deg)':'translateY(-50%)',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke="#D4A017" strokeWidth="2.5" fill="none"/></svg>
</div>
{natOpen&&<><div onClick={()=>{setNatOpen(false);setNatSearch('')}} style={{position:'fixed',inset:0,zIndex:19}}/><div style={{position:'absolute',top:'calc(100% + 4px)',right:0,left:0,background:'var(--modal-input-bg)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,maxHeight:200,display:'flex',flexDirection:'column',zIndex:20,boxShadow:'0 12px 40px rgba(0,0,0,.7)',overflow:'hidden'}}>
<div style={{padding:8,flexShrink:0}}>
<div style={{position:'relative'}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
<input value={natSearch} onChange={e=>setNatSearch(e.target.value)} placeholder={lang==='ar'?'بحث...':'Search...'} autoFocus style={{width:'100%',height:32,padding:'0 12px 0 30px',border:'1px solid rgba(255,255,255,.07)',borderRadius:8,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',fontFamily:F,fontSize:13,fontWeight:500,color:'var(--tx)',outline:'none',textAlign:'center',boxSizing:'border-box'}}/>
</div></div>
<div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
{filteredNats.map(n=><div key={n.ar} className="nat2-item" onClick={()=>{setReg(p=>({...p,nationality_ar:n.ar,nationality_id:n.id||'',name_ar:'',name_en:'',id_number:''}));setNatOpen(false);setNatSearch('');setRegHrsd({phase:'idle',sessionToken:null,captchaImage:null,captchaInput:'',attempts:0,error:null,manual:false,triedIqama:''})}} style={{padding:'10px 14px',fontSize:13,fontWeight:reg.nationality_ar===n.ar?600:500,color:reg.nationality_ar===n.ar?'#D4A017':'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid rgba(255,255,255,.04)',background:reg.nationality_ar===n.ar?'rgba(212,160,23,.06)':'transparent'}}>{lang==='ar'?n.ar:n.en}</div>)}
</div></div></>}
</div></div>;
const IdField=<div><div style={lblS}>{idLabel} {reqStar}</div><input value={reg.id_number} onChange={e=>setReg(p=>({...p,id_number:e.target.value.replace(/\D/g,'').slice(0,10)}))} maxLength={10} autoComplete="off" name="reg-id" style={{...sF,direction:'ltr'}} placeholder={idPlaceholder}/></div>;
const selectedBranch=regBranches.find(b=>b.id===reg.branch_id);
const BranchField=<div><div style={lblS}>{lang==='ar'?'المكتب':'Branch'} {reqStar}</div>
<div style={{position:'relative'}}>
<div onClick={()=>setBranchOpen(!branchOpen)} style={{...sF,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:selectedBranch?'var(--tx)':'rgba(255,255,255,.4)'}}>
<span>{selectedBranch?(selectedBranch.branch_code||''):(lang==='ar'?'اختر':'Select')}</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{position:'absolute',left:12,top:'50%',transform:branchOpen?'translateY(-50%) rotate(180deg)':'translateY(-50%)',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke="#D4A017" strokeWidth="2.5" fill="none"/></svg>
</div>
{branchOpen&&<><div onClick={()=>{setBranchOpen(false);setBranchSearch('')}} style={{position:'fixed',inset:0,zIndex:19}}/><div style={{position:'absolute',top:'calc(100% + 4px)',right:0,left:0,background:'var(--modal-input-bg)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,maxHeight:200,display:'flex',flexDirection:'column',zIndex:20,boxShadow:'0 12px 40px rgba(0,0,0,.7)',overflow:'hidden'}}>
<div style={{padding:8,flexShrink:0}}>
<div style={{position:'relative'}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
<input value={branchSearch} onChange={e=>setBranchSearch(e.target.value)} placeholder={lang==='ar'?'بحث...':'Search...'} autoFocus style={{width:'100%',height:32,padding:'0 12px 0 30px',border:'1px solid rgba(255,255,255,.07)',borderRadius:8,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',fontFamily:F,fontSize:13,fontWeight:500,color:'var(--tx)',outline:'none',textAlign:'center',boxSizing:'border-box'}}/>
</div></div>
<div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
{filteredBranches.length===0?<div style={{padding:'14px',fontSize:12,color:'rgba(255,255,255,.4)',textAlign:'center'}}>{lang==='ar'?'لا توجد مكاتب':'No branches'}</div>:filteredBranches.map(b=><div key={b.id} className="nat2-item" onClick={()=>{setReg(p=>({...p,branch_id:b.id}));setBranchOpen(false);setBranchSearch('')}} style={{padding:'10px 14px',fontSize:13,fontWeight:reg.branch_id===b.id?600:500,color:reg.branch_id===b.id?'#D4A017':'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid rgba(255,255,255,.04)',background:reg.branch_id===b.id?'rgba(212,160,23,.06)':'transparent'}}>{b.branch_code||''}</div>)}
</div></div></>}
</div></div>;
const PhoneField=<div><div style={lblS}>{lang==='ar'?'رقم الجوال':'Mobile Number'} {reqStar}</div>
<div style={{display:'flex',direction:'ltr',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,overflow:'hidden',background:'var(--modal-input-bg)',height:40,transition:'border-color .2s'}}>
<div style={{height:'100%',padding:'0 10px',background:'rgba(255,255,255,.04)',display:'flex',alignItems:'center',fontSize:14,fontWeight:500,color:C.gold,flexShrink:0}}>+966</div>
<input value={reg.phone} onChange={e=>setReg(p=>({...p,phone:e.target.value.replace(/\D/g,'').slice(0,9)}))} maxLength={9} autoComplete="off" name="reg-phone" style={{width:'100%',height:'100%',padding:'0 12px',borderWidth:0,borderStyle:'none',background:'transparent',fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',outline:'none',textAlign:'left'}} placeholder="5X XXX XXXX"/>
</div></div>;
const EmailField=<div><div style={lblS}>{lang==='ar'?'البريد الإلكتروني':'Email'} {reqStar}</div><input value={reg.email} onChange={e=>setReg(p=>({...p,email:e.target.value}))} type="email" autoComplete="off" name="reg-email-new" style={{...sF,direction:'ltr'}} placeholder="example@jisr.sa"/></div>;
const PwField=<div><div style={lblS}>{lang==='ar'?'كلمة المرور':'Password'} {reqStar}</div>
<div style={{position:'relative'}}>
<input value={reg.pw} onChange={e=>setReg(p=>({...p,pw:arToEn(e.target.value)}))} type={regShowPw?'text':'password'} autoComplete="new-password" name="reg-pw-new" style={{...sF,paddingLeft:38,direction:'ltr'}} placeholder={lang==='ar'?'8 أحرف على الأقل':'Min 8 chars'}/>
<button type="button" onClick={()=>setRegShowPw(!regShowPw)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:10,background:'none',border:'none',cursor:'pointer',display:'flex',padding:2}}>{regShowPw?ICO.eyeOn:ICO.eyeOff}</button>
</div>
{(()=>{const st=reg.pw?passwordStrength(reg.pw):{level:0};const c=st.level===1?'#e74c3c':st.level===2?'#f39c12':'#27a060';return<div style={{display:'flex',gap:3,marginTop:6,alignItems:'center',height:3}}>{[1,2,3].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:reg.pw&&i<=st.level?c:'rgba(255,255,255,.06)',transition:'.2s'}}/>)}</div>})()}
</div>;
const ConfirmField=<div><div style={lblS}>{lang==='ar'?'تأكيد كلمة المرور':'Confirm'} {reqStar}</div>
<div style={{position:'relative'}}>
<input value={reg.pw2} onChange={e=>setReg(p=>({...p,pw2:arToEn(e.target.value)}))} type={regShowPw2?'text':'password'} autoComplete="new-password" name="reg-pw2-new" style={{...sF,paddingLeft:38,direction:'ltr'}} placeholder={lang==='ar'?'تأكيد':'Confirm'}/>
<button type="button" onClick={()=>setRegShowPw2(!regShowPw2)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:10,background:'none',border:'none',cursor:'pointer',display:'flex',padding:2}}>{regShowPw2?ICO.eyeOn:ICO.eyeOff}</button>
</div>
<div style={{height:3,marginTop:6}}/>
</div>;
return<>
<div onClick={()=>{setShowReg(false);setNatOpen(false)}} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:998,padding:16,fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--modal-bg)',borderRadius:16,width:640,maxWidth:'calc(100vw - 24px)',height:'auto',maxHeight:'calc(100vh - 24px)',display:'flex',flexDirection:'column',boxShadow:'0 20px 50px rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.06)',position:'relative',zIndex:60}}>
<style>{`.reg-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.reg-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.reg-nav-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}.reg-nav-btn:disabled{opacity:.5;cursor:not-allowed}.reg-nav-btn:disabled:hover .nav-ico{background:rgba(212,160,23,.1);color:#D4A017}.nat2-item{transition:background .15s,color .15s}.nat2-item:hover{background:rgba(212,160,23,.1)!important;color:#D4A017!important}.reg-close-btn:hover{background:linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)!important;border-color:rgba(192,57,43,.4)!important;color:#e5867a!important}.reg-modal-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:20px;row-gap:16px}.reg-modal-title{font-size:22px}.reg-modal-fieldset-pad{padding:20px 22px}.reg-modal-fieldset-label{font-size:13px}.reg-modal-header{padding:20px 24px 0}.reg-modal-content{padding:24px;scrollbar-width:none;-ms-overflow-style:none}.reg-modal-content::-webkit-scrollbar{width:0;height:0;display:none}.reg-modal-footer{padding:4px 24px 16px}@media(max-width:640px){.reg-modal-grid{grid-template-columns:1fr!important;column-gap:0!important;row-gap:14px!important}.reg-modal-title{font-size:18px!important}.reg-modal-fieldset-pad{padding:18px 14px 16px!important}.reg-modal-fieldset-label{font-size:12px!important}.reg-modal-header{padding:16px 16px 0!important}.reg-modal-content{padding:16px!important}.reg-modal-footer{padding:4px 16px 14px!important}.reg-nav-btn{font-size:14px!important}}`}</style>
{!regDone?<>
<div className="reg-modal-header" style={{flexShrink:0,display:'flex',flexDirection:'column'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
<div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><circle cx="12" cy="8" r="4" stroke={C.gold} strokeWidth="1.8" fill="rgba(212,160,23,.12)"/><path d="M4 21v-1a6 6 0 0116 0v1" stroke={C.gold} strokeWidth="1.8"/><path d="M20 8v3m0 0v3m0-3h3m-3 0h-3" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round"/></svg>
<div className="reg-modal-title" style={{fontWeight:600,color:'var(--tx)',fontFamily:F,lineHeight:1.2}}>{lang==='ar'?'حساب جديد':'New Account'}</div>
</div>
<button className="reg-close-btn" onClick={()=>setShowReg(false)} style={{width:34,height:34,borderRadius:9,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',border:'1px solid rgba(255,255,255,.07)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:F,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
</div>
</div>
<div className="reg-modal-content" style={{flex:1,minHeight:0,overflow:'auto',padding:24,display:'flex',flexDirection:'column',gap:12}}>
<div className="reg-modal-fieldset-pad" style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',position:'relative'}}>
<div className="reg-modal-fieldset-label" style={{position:'absolute',top:-10,[lang==='ar'?'right':'left']:14,background:'var(--modal-bg)',padding:'0 8px',fontWeight:600,color:C.gold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0116 0v1"/></svg>
<span>{lang==='ar'?'بيانات الحساب':'Account Info'}</span>
</div>
<div className="reg-modal-grid">
{NameField}
{NatField}
{IdField}
{BranchField}
{PhoneField}
{EmailField}
{PwField}
{ConfirmField}
</div>
</div>
</div>
<div className="reg-modal-footer" style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:12,flexShrink:0}}>
<div style={{justifySelf:'start'}}/>
<div style={{justifySelf:'center',textAlign:'center',minHeight:16}}>{firstErr&&<span style={{fontSize:12,fontWeight:400,color:C.red,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{firstErr}</span>}</div>
<div style={{justifySelf:'end'}}>
<button onClick={()=>{
const err={};const ar=lang==='ar';
const idDigits=normalizeDigits(reg.id_number);
const phoneDigits=normalizePhone(reg.phone);
if(!reg.nationality_ar)err.nationality=ar?'يجب اختيار الجنسية':'Select nationality';
const nameAr=collapseSpaces(reg.name_ar);
if(!nameAr)err.name_ar=ar?'الرجاء إدخال الاسم':'Enter name';
else if(!/^[\u0600-\u06FF\s]+$/.test(nameAr))err.name_ar=ar?'حروف عربية فقط':'Arabic only';
if(!idDigits)err.id_number=ar?'الرجاء إدخال رقم الهوية':'Enter ID';
else if(!/^\d{10}$/.test(idDigits))err.id_number=ar?'رقم الهوية 10 أرقام':'ID: 10 digits';
else if(isSaudi){if(idDigits[0]!=='1')err.id_number=ar?'رقم الهوية الوطنية يبدأ بـ 1':'National ID starts with 1';else if(!isValidSaudiId(idDigits))err.id_number=ar?'رقم الهوية الوطنية غير صحيح':'Invalid National ID'}
else if(isNonSaudi){if(idDigits[0]!=='2')err.id_number=ar?'رقم الإقامة يبدأ بـ 2':'Iqama starts with 2';else if(!isValidSaudiId(idDigits))err.id_number=ar?'رقم الإقامة غير صحيح':'Invalid Iqama'}
if(!reg.branch_id)err.branch_id=ar?'يجب اختيار المكتب':'Select branch';
if(!reg.email)err.email=ar?'الرجاء إدخال البريد':'Enter email';
else if(!/\S+@\S+\.\S+/.test(reg.email))err.email=ar?'بريد غير صحيح':'Invalid email';
if(!phoneDigits)err.phone=ar?'الرجاء إدخال الجوال':'Enter phone';
else if(phoneDigits.length!==9||phoneDigits[0]!=='5')err.phone=ar?'رقم الجوال 9 خانات يبدأ بـ 5':'9-digit, starts with 5';
else if(isSuspiciousPhone(phoneDigits))err.phone=ar?'رقم الجوال غير صحيح':'Invalid phone';
if(!reg.pw)err.pw=ar?'الرجاء إدخال كلمة المرور':'Enter password';
else if(reg.pw.length<8)err.pw=ar?'كلمة المرور 8 أحرف على الأقل':'Password 8+ chars';
else if(passwordStrength(reg.pw).level<3)err.pw=ar?'كلمة المرور ضعيفة':'Password weak';
if(!reg.pw2)err.pw2=ar?'تأكيد كلمة المرور':'Confirm password';
else if(reg.pw!==reg.pw2)err.pw2=ar?'غير متطابقة':'Passwords mismatch';
setRegErr(err);if(Object.keys(err).length>0)return;
setRegErr({});doRegister();
}} disabled={regBusy} className="reg-nav-btn"><span>{regBusy?(lang==='ar'?'جاري التسجيل…':'Registering…'):(lang==='ar'?'تسجيل':'Register')}</span><span className="nav-ico">{regBusy?<span style={{width:12,height:12,border:'2px solid currentColor',borderRightColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</span></button>
</div></div>
</>:<>
<div style={{padding:22,display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'8px 0 6px'}}>
<div style={{width:62,height:62,borderRadius:'50%',background:'rgba(39,160,70,.22)',display:'flex',alignItems:'center',justifyContent:'center',color:'#27a046'}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
<div style={{fontSize:14,fontWeight:500,color:'#27a046',textAlign:'center'}}>{lang==='ar'?'تم تسجيل الحساب':'Account submitted'}</div>
<div style={{fontSize:14,color:'rgba(255,255,255,.55)',textAlign:'center',lineHeight:1.7,padding:'0 4px'}}>{lang==='ar'?'بقيت خطوتان لتفعيل حسابك':'Two more steps to activate your account'}</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:6}}>
<div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',borderRadius:8,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.3)'}}>
<div style={{width:22,height:22,borderRadius:'50%',background:'rgba(212,160,23,.2)',color:C.gold,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,marginTop:1}}>1</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:14,color:C.gold,fontWeight:600,marginBottom:2}}>{lang==='ar'?'تأكيد البريد الإلكتروني':'Confirm your email'}</div>
<div style={{fontSize:13,color:'rgba(255,255,255,.6)',lineHeight:1.6}}>{lang==='ar'?'افتح بريدك واضغط على رابط التأكيد':'Open your inbox and click the confirmation link'}</div>
</div>
</div>
<div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',borderRadius:8,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)'}}>
<div style={{width:22,height:22,borderRadius:'50%',background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,marginTop:1}}>2</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:14,color:'rgba(255,255,255,.85)',fontWeight:600,marginBottom:2}}>{lang==='ar'?'انتظار موافقة المدير العام':'Wait for GM approval'}</div>
<div style={{fontSize:13,color:'rgba(255,255,255,.6)',lineHeight:1.6}}>{lang==='ar'?'بعد التأكيد سيراجع المدير حسابك ويفعّله':'After confirming, the manager will review and activate your account'}</div>
</div>
</div>
</div>
<div style={{display:'flex',justifyContent:'flex-end',marginTop:4}}>
<button onClick={()=>setShowReg(false)} className="reg-nav-btn"><span>{lang==='ar'?'العودة لتسجيل الدخول':'Return to Login'}</span><span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points={lang==='ar'?'15 18 9 12 15 6':'9 18 15 12 9 6'}/></svg></span></button>
</div>
</div>
</>}
</div>
</div>
{regHrsd.phase!=='idle'&&regHrsd.phase!=='fetched'&&!regHrsd.manual&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div style={{background:'var(--modal-bg)',borderRadius:16,width:'min(420px,95vw)',padding:24,boxShadow:'0 20px 50px rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.06)'}}>
<div style={{display:'flex',alignItems:'center',gap:12,color:C.gold,marginBottom:14}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" fill="rgba(212,160,23,.12)"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
<span style={{fontSize:18,fontWeight:600,color:'var(--tx)',lineHeight:1.2}}>{lang==='ar'?'تحقق الاسم من وزارة العمل':'Verify name from MOL'}</span>
</div>
<div style={{fontSize:13,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:16,lineHeight:1.7}}>{lang==='ar'?'أدخل رمز التحقق المعروض أدناه لجلب اسمك الرسمي':'Enter the captcha below to fetch your official name'}</div>
<div style={{minHeight:80,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.3)',borderRadius:10,marginBottom:12,padding:8}}>
{regHrsd.phase==='loading'||regHrsd.phase==='verifying'?<div style={{display:'flex',alignItems:'center',gap:10,color:'rgba(255,255,255,.5)',fontSize:13}}><div style={{width:18,height:18,border:'2px solid rgba(212,160,23,.3)',borderTopColor:'#D4A017',borderRadius:'50%',animation:'spin .7s linear infinite'}}/><span>{lang==='ar'?(regHrsd.phase==='loading'?'جاري التحميل...':'جاري التحقق...'):(regHrsd.phase==='loading'?'Loading...':'Verifying...')}</span></div>:regHrsd.captchaImage?<img src={regHrsd.captchaImage} alt="captcha" style={{maxWidth:'100%',maxHeight:60,borderRadius:6}}/>:null}
</div>
<input value={regHrsd.captchaInput} onChange={e=>setRegHrsd(c=>({...c,captchaInput:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')regSubmitHrsd()}} placeholder={lang==='ar'?'رمز التحقق':'Captcha'} disabled={regHrsd.phase==='verifying'||regHrsd.phase==='loading'} style={{...sF,marginBottom:12}}/>
{regHrsd.error&&<div style={{fontSize:12,color:C.red,marginBottom:12,textAlign:'center'}}>{regHrsd.error}</div>}
<div style={{display:'flex',gap:8}}>
<button onClick={()=>setRegHrsd(c=>({...c,phase:'idle',manual:true,error:null}))} style={{flex:1,height:40,borderRadius:10,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',border:'1px solid rgba(255,255,255,.07)',color:'var(--tx3)',fontFamily:F,fontSize:14,fontWeight:500,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)'}}>{lang==='ar'?'إدخال يدوي':'Manual entry'}</button>
<button onClick={regSubmitHrsd} disabled={regHrsd.phase==='verifying'||regHrsd.phase==='loading'||!regHrsd.captchaInput||regHrsd.captchaInput.length<3} style={{flex:1.2,height:40,borderRadius:10,background:'#D4A017',border:'none',color:'#000',fontFamily:F,fontSize:14,fontWeight:600,cursor:'pointer',opacity:(regHrsd.phase==='verifying'||regHrsd.phase==='loading'||!regHrsd.captchaInput||regHrsd.captchaInput.length<3)?.5:1}}>{lang==='ar'?'تحقق':'Verify'}</button>
</div>
</div>
</div>}
</>;
})()}
<Css/></div>)}

function SetupPage({sb,onSetup,onBack,toast,lang,switchLang,L}){
const[f,setF]=useState({ar:'',en:'',id_type:'هوية وطنية',id:'',nat:'سعودي',ph:'',em:'',pw:'',pw2:''});
const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
const[setupShowPw,setSetupShowPw]=useState(false);const[setupShowPw2,setSetupShowPw2]=useState(false);
const[sErr,setSErr]=useState({});
const s=(k,v)=>setF(p=>({...p,[k]:v}));

const tlTimerRef=React.useRef(null);
const tlReqRef=React.useRef(0);
useEffect(()=>{
const ar=f.ar.trim();
if(!ar){if(f.en)setF(p=>({...p,en:''}));return}
if(tlTimerRef.current)clearTimeout(tlTimerRef.current);
const reqId=++tlReqRef.current;
tlTimerRef.current=setTimeout(async()=>{
let translated=null;
try{const r=await fetch('/.netlify/functions/translate-name',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:ar,source:'ar'})});if(r.ok){const d=await r.json();translated=d.translated}}catch{}
if(reqId!==tlReqRef.current)return;
if(!translated)return;
setF(p=>p.en===translated?p:{...p,en:translated});
},350);
return()=>{if(tlTimerRef.current)clearTimeout(tlTimerRef.current)};
},[f.ar]);

const formatPhone=d=>!d?'':d.length<=2?d:d.length<=5?d.slice(0,2)+' '+d.slice(2):d.slice(0,2)+' '+d.slice(2,5)+' '+d.slice(5);
const isWord2=t=>(t||'').trim().split(/\s+/).filter(Boolean).length===2;

const validate=()=>{
const ar=lang==='ar';const err={};
if(!f.ar)err.ar=ar?'أدخل الاسم بالعربي':'Enter Arabic name';
else if(!/^[\u0600-\u06FF\s]+$/.test(f.ar.trim()))err.ar=ar?'حروف عربية فقط':'Arabic only';
if(!f.ph)err.ph=ar?'أدخل رقم الجوال':'Enter phone';
else if(f.ph.length!==9||f.ph[0]!=='5')err.ph=ar?'رقم الجوال 9 خانات يبدأ بـ 5':'9-digit phone starting with 5';
else if(isSuspiciousPhone(f.ph))err.ph=ar?'رقم الجوال غير صحيح':'Invalid phone number';
if(!f.id)err.id=ar?'أدخل رقم الهوية الوطنية':'Enter National ID';
else if(f.id.length!==10)err.id=ar?'رقم الهوية الوطنية 10 أرقام':'National ID: 10 digits';
else if(f.id[0]!=='1')err.id=ar?'رقم الهوية الوطنية يبدأ بـ 1':'National ID must start with 1';
else if(!validateIdByType(f.id,f.id_type))err.id=ar?'رقم الهوية الوطنية غير صحيح':'Invalid National ID';
if(!f.em)err.em=ar?'الرجاء إدخال البريد الإلكتروني':'Please enter email';
else if(!/\S+@\S+\.\S+/.test(f.em))err.em=ar?'يرجى إدخال بريد إلكتروني صحيح':'Please enter a valid email';
if(!f.pw)err.pw=ar?'الرجاء إدخال كلمة المرور':'Please enter password';
else if(f.pw.length<8)err.pw=ar?'كلمة المرور 8 أحرف على الأقل':'Password: 8 chars min';
else if(passwordStrength(f.pw).level<3)err.pw=ar?'كلمة المرور ضعيفة — أضف أحرف كبيرة وأرقام ورموز':'Password too weak — add uppercase, digits, symbols';
if(!f.pw2)err.pw2=ar?'الرجاء تأكيد كلمة المرور':'Please confirm password';
else if(f.pw!==f.pw2)err.pw2=ar?'كلمة المرور غير متطابقة':'Passwords do not match';
return err;
};

const go=async()=>{
const err=validate();setSErr(err);if(Object.keys(err).length>0)return;
setBusy(true);try{await onSetup(f);setDone(true)}catch(e){toast((lang==='ar'?'خطأ: ':'Error: ')+translateErr(e,lang),'error')}setBusy(false);
};

const sF={width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',outline:'none',background:'linear-gradient(180deg,#323232 0%,#262626 100%)',boxSizing:'border-box',textAlign:'center',transition:'.2s',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)'};
const lblS={fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:8,textAlign:'start'};
const reqStar=<span style={{color:C.red,marginRight:2}}>*</span>;
const firstErr=Object.values(sErr)[0];

return(<><div onClick={onBack} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:998,padding:16,fontFamily:F,direction:L.dir}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--modal-bg)',borderRadius:16,width:640,maxWidth:'calc(100vw - 24px)',height:'auto',maxHeight:'calc(100vh - 24px)',display:'flex',flexDirection:'column',boxShadow:'0 20px 50px rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.06)',position:'relative',zIndex:60}}>
<style>{`.setup-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.setup-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.setup-nav-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}.setup-nav-btn:disabled{opacity:.5;cursor:not-allowed}.setup-nav-btn:disabled:hover .nav-ico{background:rgba(212,160,23,.1);color:#D4A017}.setup-close-btn:hover{background:linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)!important;border-color:rgba(192,57,43,.4)!important;color:#e5867a!important}.setup-modal-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:20px;row-gap:16px}.setup-modal-title{font-size:22px}.setup-modal-fieldset-pad{padding:20px 22px}.setup-modal-fieldset-label{font-size:13px}.setup-modal-header{padding:20px 24px 0}.setup-modal-content{padding:24px;scrollbar-width:none;-ms-overflow-style:none}.setup-modal-content::-webkit-scrollbar{width:0;height:0;display:none}.setup-modal-footer{padding:4px 24px 16px}@media(max-width:640px){.setup-modal-grid{grid-template-columns:1fr!important;column-gap:0!important;row-gap:14px!important}.setup-modal-title{font-size:18px!important}.setup-modal-fieldset-pad{padding:18px 14px 16px!important}.setup-modal-fieldset-label{font-size:12px!important}.setup-modal-header{padding:16px 16px 0!important}.setup-modal-content{padding:16px!important}.setup-modal-footer{padding:4px 16px 14px!important}.setup-nav-btn{font-size:14px!important}}`}</style>
{!done?<>
<div className="setup-modal-header" style={{flexShrink:0,display:'flex',flexDirection:'column'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
<div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><path d="M12 2l8 4v5c0 5.55-3.84 10.74-8 12-4.16-1.26-8-6.45-8-12V6l8-4z" stroke={C.gold} strokeWidth="1.8" fill="rgba(212,160,23,.12)"/><path d="M9 12l2 2 4-4" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
<div className="setup-modal-title" style={{fontWeight:600,color:'var(--tx)',fontFamily:F,lineHeight:1.2,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lang==='ar'?'المدير العام':'General Manager'}</div>
</div>
<button className="setup-close-btn" onClick={onBack} style={{width:34,height:34,borderRadius:9,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',border:'1px solid rgba(255,255,255,.07)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:F,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
</div>
</div>
<div className="setup-modal-content" style={{flex:1,minHeight:0,overflow:'auto',display:'flex',flexDirection:'column',gap:12}}>
<div className="setup-modal-fieldset-pad" style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',position:'relative'}}>
<div className="setup-modal-fieldset-label" style={{position:'absolute',top:-10,[lang==='ar'?'right':'left']:14,background:'var(--modal-bg)',padding:'0 8px',fontWeight:600,color:C.gold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2l8 4v5c0 5.55-3.84 10.74-8 12-4.16-1.26-8-6.45-8-12V6l8-4z"/></svg>
<span>{lang==='ar'?'بيانات الحساب':'Account Info'}</span>
</div>
<div className="setup-modal-grid">
<div><div style={lblS}>{lang==='ar'?'الاسم':'Name'} {reqStar}</div><input value={f.ar} onChange={e=>s('ar',e.target.value.replace(/[^\u0600-\u06FF\s]/g,''))} maxLength={30} autoComplete="off" name="setup-name" style={{...sF,direction:'rtl'}} placeholder={lang==='ar'?'الاسم':'Name'}/></div>
<div><div style={lblS}>{lang==='ar'?'رقم الهوية الوطنية':'National ID'} {reqStar}</div><input value={f.id} onChange={e=>s('id',e.target.value.replace(/\D/g,'').slice(0,10))} maxLength={10} autoComplete="off" name="setup-id" style={{...sF,direction:'ltr'}} placeholder="1XXXXXXXXX"/></div>
<div><div style={lblS}>{lang==='ar'?'البريد الإلكتروني':'Email'} {reqStar}</div><input value={f.em} onChange={e=>s('em',e.target.value)} type="email" autoComplete="off" name="setup-email-new" style={{...sF,direction:'ltr'}} placeholder="admin@jisr.sa"/></div>
<div><div style={lblS}>{lang==='ar'?'رقم الجوال':'Mobile Number'} {reqStar}</div>
<div style={{display:'flex',direction:'ltr',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,overflow:'hidden',background:'var(--modal-input-bg)',height:40,transition:'border-color .2s'}}>
<div style={{height:'100%',padding:'0 10px',background:'rgba(255,255,255,.04)',display:'flex',alignItems:'center',fontSize:14,fontWeight:500,color:C.gold,flexShrink:0}}>+966</div>
<input value={formatPhone(f.ph)} onChange={e=>s('ph',e.target.value.replace(/\D/g,'').slice(0,9))} maxLength={11} autoComplete="off" name="setup-phone" style={{width:'100%',height:'100%',padding:'0 12px',borderWidth:0,borderStyle:'none',background:'transparent',fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',outline:'none',textAlign:'left'}} placeholder="5X XXX XXXX"/>
</div></div>
<div><div style={lblS}>{lang==='ar'?'كلمة المرور':'Password'} {reqStar}</div><div style={{position:'relative'}}><input value={f.pw} onChange={e=>s('pw',arToEn(e.target.value))} type={setupShowPw?'text':'password'} autoComplete="new-password" name="setup-pw-new" style={{...sF,paddingLeft:38,direction:'ltr'}} placeholder={lang==='ar'?'8 أحرف على الأقل':'Min 8 chars'}/><button type="button" onClick={()=>setSetupShowPw(!setupShowPw)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:10,background:'none',border:'none',cursor:'pointer',display:'flex',padding:2}}>{setupShowPw?ICO.eyeOn:ICO.eyeOff}</button></div>{(()=>{const st=f.pw?passwordStrength(f.pw):{level:0};const c=st.level===1?'#e74c3c':st.level===2?'#f39c12':'#27a060';return<div style={{display:'flex',gap:3,marginTop:6,alignItems:'center',height:3}}>{[1,2,3].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:f.pw&&i<=st.level?c:'rgba(255,255,255,.06)',transition:'.2s'}}/>)}</div>})()}</div>
<div><div style={lblS}>{lang==='ar'?'تأكيد كلمة المرور':'Confirm'} {reqStar}</div><div style={{position:'relative'}}><input value={f.pw2} onChange={e=>s('pw2',arToEn(e.target.value))} type={setupShowPw2?'text':'password'} autoComplete="new-password" name="setup-pw2-new" style={{...sF,paddingLeft:38,direction:'ltr'}} placeholder={lang==='ar'?'تأكيد':'Confirm'}/><button type="button" onClick={()=>setSetupShowPw2(!setupShowPw2)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:10,background:'none',border:'none',cursor:'pointer',display:'flex',padding:2}}>{setupShowPw2?ICO.eyeOn:ICO.eyeOff}</button></div><div style={{height:3,marginTop:6}}/></div>
</div>
</div>
</div>
<div className="setup-modal-footer" style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:12,flexShrink:0}}>
<div style={{justifySelf:'start'}}/>
<div style={{justifySelf:'center',textAlign:'center',minHeight:16}}>{firstErr&&<span style={{fontSize:12,fontWeight:400,color:C.red,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{firstErr}</span>}</div>
<div style={{justifySelf:'end'}}>
<button onClick={go} disabled={busy} className="setup-nav-btn"><span>{busy?(lang==='ar'?'جاري التسجيل…':'Registering…'):(lang==='ar'?'تسجيل':'Register')}</span><span className="nav-ico">{busy?<span style={{width:12,height:12,border:'2px solid currentColor',borderRightColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</span></button>
</div></div>
</>:<>
<div style={{padding:22,display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'8px 0 6px'}}>
<div style={{width:62,height:62,borderRadius:'50%',background:'rgba(39,160,70,.22)',display:'flex',alignItems:'center',justifyContent:'center',color:'#27a046'}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
<div style={{fontSize:14,fontWeight:500,color:'#27a046',textAlign:'center'}}>{lang==='ar'?'تم إرسال رابط التفعيل':'Activation link sent'}</div>
<div style={{fontSize:14,color:'rgba(255,255,255,.55)',textAlign:'center',lineHeight:1.7,padding:'0 4px'}}>{lang==='ar'?`افتح بريدك واضغط على رابط التفعيل لإكمال إنشاء حساب المدير العام لـ ${f.ar}`:`Open your inbox and click the activation link to finish creating the General Manager account for ${f.en||f.ar}`}</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:6}}>
<div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.3)'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
<span style={{flex:1,fontSize:14,color:C.gold,fontWeight:600}}>{lang==='ar'?'البريد الإلكتروني':'Email'}</span>
<span style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.92)',direction:'ltr'}}>{f.em}</span>
</div>
<div style={{display:'flex',alignItems:'flex-start',gap:8,padding:'10px 12px',borderRadius:8,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',fontSize:13,color:'rgba(255,255,255,.6)',lineHeight:1.6}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2,opacity:.7}}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
<span>{lang==='ar'?'لن تتمكن من تسجيل الدخول قبل تأكيد البريد. تحقق أيضاً من مجلد الرسائل غير المرغوبة.':'You won’t be able to sign in before confirming the email. Also check your spam folder.'}</span>
</div>
</div>
<div style={{display:'flex',justifyContent:'flex-end',marginTop:4}}>
<button onClick={onBack} className="setup-nav-btn"><span>{lang==='ar'?'تسجيل الدخول':'Sign In'}</span><span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points={lang==='ar'?'15 18 9 12 15 6':'9 18 15 12 9 6'}/></svg></span></button>
</div>
</div>
</>}
</div>
</div>
<Css/></>);}

function ResetPage({sb,onDone,toast,lang,L}){
const[pw,setPw]=useState('');const[pw2,setPw2]=useState('');const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
const go=async()=>{
if(!pw||!pw2){toast(lang==='ar'?'أدخل كلمة المرور الجديدة':'Enter new password');return}
if(pw!==pw2){toast(lang==='ar'?'كلمة المرور غير متطابقة':'Passwords do not match');return}
if(pw.length<6){toast(lang==='ar'?'كلمة المرور 6 أحرف على الأقل':'Password must be at least 6 characters');return}
setBusy(true);
try{const{error}=await sb.auth.updateUser({password:pw});if(error)throw error;setDone(true)}
catch(err){toast((lang==='ar'?'خطأ: ':'Error: ')+translateErr(err,lang),'error')}
setBusy(false)};
if(done)return(<div style={{position:'fixed',inset:0,background:'rgba(14,14,14,.96)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F,direction:'rtl',zIndex:9999}}><div style={{textAlign:'center'}}>
<div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 16px',background:'rgba(39,160,70,.1)',border:'2px solid rgba(39,160,70,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="rgba(39,160,70,.8)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
<div style={{fontSize:'clamp(18px,3vw,22px)',fontWeight:900,color:'var(--tx)',marginBottom:6}}>{lang==='ar'?'تم تغيير كلمة المرور':'Password changed!'}</div>
<div style={{fontSize:12,color:'var(--tx4)',lineHeight:2,marginBottom:20}}>{lang==='ar'?'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة':'You can now sign in with your new password'}</div>
<button onClick={onDone} style={{...goldS,width:'auto',padding:'0 36px'}}>{lang==='ar'?'تسجيل الدخول':'Sign In'}</button>
</div><Css/></div>);
return(<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',fontFamily:F,direction:'rtl'}}>
<div style={{width:'min(420px,92vw)',background:'var(--sf)',borderRadius:20,padding:'clamp(24px,4vw,36px) clamp(20px,4vw,28px)',boxShadow:'0 20px 60px rgba(0,0,0,.5)',position:'relative',border:'1px solid rgba(212,160,23,.12)'}}>
<GoldBar/>
<div style={{textAlign:'center',marginBottom:24}}>
<div style={{width:56,height:56,borderRadius:'50%',background:'rgba(212,160,23,.1)',border:'1.5px solid rgba(212,160,23,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>{ICO.lock}</div>
<div style={{fontSize:'clamp(16px,2.5vw,20px)',fontWeight:900,color:'var(--tx)'}}>{lang==='ar'?'كلمة مرور جديدة':'New Password'}</div>
<div style={{fontSize:12,color:'var(--tx3)',marginTop:6}}>{lang==='ar'?'أدخل كلمة المرور الجديدة':'Enter your new password'}</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div><div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.65)',marginBottom:6}}>{lang==='ar'?'كلمة المرور الجديدة':'New Password'}</div>
<input value={pw} onChange={e=>{setPw(e.target.value);setLoginErr('')}} type="password" placeholder="······" style={{...finS,textAlign:'center'}}/></div>
<div><div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.65)',marginBottom:6}}>{lang==='ar'?'تأكيد كلمة المرور':'Confirm Password'}</div>
<input value={pw2} onChange={e=>setPw2(e.target.value)} type="password" placeholder="······" style={{...finS,textAlign:'center'}}/></div>
<button onClick={go} disabled={busy} style={{...goldS,height:'clamp(42px,6vw,50px)',fontSize:'clamp(13px,2vw,15px)',opacity:busy?.7:1}}>{busy?<div style={{width:18,height:18,border:'2px solid rgba(14,14,14,.3)',borderTopColor:C.dk,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:lang==='ar'?'تغيير كلمة المرور':'Change Password'}</button>
</div>
</div><Css/></div>)}

function DashPage({sb,user,onLogout,toast,lang,switchLang,setLang}){const[pg,setPg]=useState('home');const[toastMsg,setToastMsg]=useState(null);const tt=m=>{setToastMsg(m);setTimeout(()=>setToastMsg(null),2500)};const[userMenu,setUserMenu]=useState(false);const[showProfile,setShowProfile]=useState(false);const[emailConfirmStep,setEmailConfirmStep]=useState(false);const[profileData,setProfileData]=useState(null);const[profileBank,setProfileBank]=useState(null);const[profileBusy,setProfileBusy]=useState(false);const[profileTab,setProfileTab]=useState('info');const[profileErr,setProfileErr]=useState({});const[profileBanks,setProfileBanks]=useState([]);const[profileBankDrop,setProfileBankDrop]=useState(false);const[profilePerf,setProfilePerf]=useState(null);const[profileAtt,setProfileAtt]=useState([]);const[profileTasks,setProfileTasks]=useState([]);const[profileSalary,setProfileSalary]=useState([]);const[profileLoans,setProfileLoans]=useState([]);const[profileLogins,setProfileLogins]=useState([]);const[stats,setStats]=useState(null);const[showUserMenu,setShowUserMenu]=useState(false);useEffect(()=>{document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('jisr_theme','dark');const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#171717');document.body.style.background='#171717'},[]);const[dashBranch,setDashBranch]=useState(null);const[dashBranches,setDashBranches]=useState([]);const[sTabInfo,setSTabInfo]=useState({tab:'general',svcSubTab:'services'});const[activityLog,setActivityLog]=useState([]);const[activityLoading,setActivityLoading]=useState(false);const[sideOpen,setSideOpen]=useState(false);const[taskCount,setTaskCount]=useState(0);const[approvalCount,setApprovalCount]=useState(0);const[todayAppointments,setTodayAppointments]=useState([]);const[lastWeeklyUpdate,setLastWeeklyUpdate]=useState(null);const[expanded,setExpanded]=useState({tasks_section:true,facilities_workforce:true,finance:true,data:false,reports:false,admin:false});const[showServiceRequest,setShowServiceRequest]=useState(false);const[navExpanded,setNavExpanded]=useState({});
const[showKafalaCalc,setShowKafalaCalc]=useState(false);
const[avatarUrl,setAvatarUrl]=useState(user?.avatar_url||user?.person?.avatar_url||'');
useEffect(()=>{setAvatarUrl(user?.avatar_url||user?.person?.avatar_url||'')},[user?.id,user?.avatar_url,user?.person?.avatar_url]);
const[natCache,setNatCache]=useState(null);
const[subCrumbs,setSubCrumbs]=useState([]);
useEffect(()=>{const handler=(e)=>setSubCrumbs(Array.isArray(e.detail)?e.detail:[]);window.addEventListener('topbar-breadcrumbs',handler);return()=>window.removeEventListener('topbar-breadcrumbs',handler)},[]);
useEffect(()=>{const handler=(e)=>{setPg('sync_hub');setTimeout(()=>window.dispatchEvent(new CustomEvent('sync-focus-source',{detail:e.detail})),50)};window.addEventListener('app-navigate-sync',handler);return()=>window.removeEventListener('app-navigate-sync',handler)},[]);
useEffect(()=>{const natId=user?.person?.nationality_id;if(!sb||!natId)return;sb.from('nationalities').select('id,name_ar,name_en,code,flag_url').eq('id',natId).maybeSingle().then(({data})=>{if(data)setNatCache(data)})},[sb,user?.person?.nationality_id]);
const[visibility,setVisibility]=useState(()=>getVisibility());
const saveVisibility=(cfg)=>{setVisibility(cfg);localStorage.setItem('jisr_visibility',JSON.stringify(cfg))};
const isVisible=(id)=>isItemVisible(id)&&(visibility[id]!==false||['admin_hub','admin_visibility'].includes(id));
// Admin-only nav items: Sync Hub is hidden from non-GM users regardless of visibility toggles.
const isGM=!user?.roles||user?.roles?.name_ar==='المدير العام'||user?.roles?.name_en==='General Manager';
const ADMIN_ONLY=['sync_hub'];
const canSeeAdminOnly=(id)=>isGM||visibility['grant_'+id]===true;
const[isStandalone]=useState(()=>window.navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches);
const[installPrompt,setInstallPrompt]=useState(null);
const[showInstallBanner,setShowInstallBanner]=useState(false);
useEffect(()=>{const h=e=>{e.preventDefault();setInstallPrompt(e);if(!isStandalone&&!localStorage.getItem('jisr_install_dismissed'))setShowInstallBanner(true)};window.addEventListener('beforeinstallprompt',h);return()=>window.removeEventListener('beforeinstallprompt',h)},[isStandalone]);
const handleInstall=async()=>{if(!installPrompt)return;installPrompt.prompt();const{outcome}=await installPrompt.userChoice;if(outcome==='accepted')setShowInstallBanner(false);setInstallPrompt(null)};const toggleSec=k=>setExpanded(p=>({...p,[k]:!p[k]}));const hubDefaults={workforce:'facilities',finance_hub:'invoices',admin_hub:'admin_offices',settings:'settings_general'};// Pages with inner hash routing land on this canonical hash so they reset
// to their list/home view (PersonsPage relies on this).
const pageHashes={admin_persons:'#/admin/persons'};
// Bumped when the user taps a sidebar entry while already on that page.
// Used as a `key` on page roots so they force-remount, clearing any
// in-component state (e.g. BranchesPage's open detail view).
const[navResetKey,setNavResetKey]=useState(0);
const setPage=(id)=>{const mapped=hubDefaults[id]||id;if(mapped===pg)setNavResetKey(k=>k+1);setPg(mapped);setSubCrumbs([]);setSideOpen(false);
// Normalize the URL so pages with internal hash routing return to their
// default view (pages without hash routing are unaffected).
try{const target=pageHashes[mapped]||'';if(window.location.hash!==target){window.history.replaceState(null,'',target||window.location.pathname);window.dispatchEvent(new HashChangeEvent('hashchange'))}}catch{}};
const loadStats=useCallback(()=>{const brId=dashBranch||null;Promise.all([sb.rpc('get_branch_stats',{p_branch_id:brId}),sb.from('branches').select('id,name_ar').is('deleted_at',null).order('name_ar')]).then(([statsR,branchesR])=>{if(statsR.data)setStats(statsR.data);setDashBranches(branchesR.data||[])})},[sb,dashBranch]);useEffect(()=>{loadStats()},[loadStats]);
useEffect(()=>{if(!sb)return;const ch=sb.channel('jisr-realtime-sync').on('postgres_changes',{event:'*',schema:'public',table:'invoices'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'clients'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'workers'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'facilities'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'activity_log'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'invoice_payments'},()=>loadStats()).subscribe();return()=>{sb.removeChannel(ch)}},[sb,loadStats]);
useEffect(()=>{const cleanup=setupKeyboardShortcuts({'ctrl+n':()=>{},'ctrl+/':()=>{tt(T('Ctrl+N إضافة جديد','Ctrl+N New'))},'escape':()=>{setSideOpen(false)}});return cleanup},[]);
const loadActivityLog=useCallback(async()=>{setActivityLoading(true);try{const{data}=await sb.from('activity_log').select('*,users:user_id(name_ar,name_en)').order('created_at',{ascending:false}).limit(100);setActivityLog(data||[])}catch(e){setActivityLog([])}setActivityLoading(false)},[sb]);
const T=(ar,en)=>lang==='ar'?ar:en;const TL=(ar)=>lang==='ar'?ar:(TR[ar]||ar);const nav=[
{id:'home',l:T('الرئيسية','Dashboard'),i:'home'},
{id:'workforce',l:T('المنشآت والعمالة','Workforce'),i:'worker'},
{id:'finance_hub',l:T('المالية','Finance'),i:'invoice'},
{id:'admin_hub',l:T('الإدارة','Admin'),i:'settings'},
{id:'otp_messages',l:T('الرسائل النصية','SMS'),i:'alert'},
{id:'sync_hub',l:T('مركز المزامنة','Sync Hub'),i:'transaction'},
{id:'settings',l:T('الإعدادات','Settings'),i:'settings'}
];
const hubTabs={
  workforce:[{id:'facilities',l:T('المنشآت','Facilities'),i:'facility'},{id:'workers',l:T('العمالة','Workers'),i:'worker'}],
  finance_hub:[{id:'invoices',l:T('الفواتير','Invoices'),i:'invoice'},{id:'transfer_calc',l:T('تسعيرات التنازل','Transfer Calc'),i:'chart'}],
  admin_hub:[{id:'admin_offices',l:T('المكاتب','Offices'),i:'branch'},{id:'admin_persons',l:T('الأشخاص','Persons'),i:'client'},{id:'admin_services',l:T('إدارة الخدمات','Services'),i:'settings'},{id:'admin_permissions',l:T('إدارة المستخدمين','Users'),i:'role'}],
  settings:[{id:'settings_general',l:T('الإعدادات العامة','General Settings'),i:'settings'},{id:'settings_fields',l:T('الحقول','Fields'),i:'settings'}]
};const pages={
facilities:{table:'facilities',title:T('المنشآت','Facilities'),icon:'facility',
cols:[['name_ar',T('الاسم','Name')],['unified_national_number',T('الرقم الموحد','Unified No.')],['cr_number',T('السجل','CR No.')],['cr_status',T('حالة السجل','CR Status')],['facility_status',T('الحالة','Status')],['nitaqat_color',T('نطاقات','Nitaqat')]],
stats:['facility_status','nitaqat_color','type'],
flds:[
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'type',l:'النوع',o:['establishment','company'],r:1},
{k:'legal_form',l:'الشكل القانوني',o:['sole_proprietorship','limited_liability','limited_partnership','general_partnership','joint_stock','simplified_joint_stock'],r:1},
{k:'character_count',l:'عدد الشخصيات',o:['one_person','two_or_more']},
{k:'facility_status',l:'حالة المنشأة',o:['active','issue'],r:1},
{k:'capital',l:'رأس المال',d:1},
{k:'economic_activity_id',l:'النشاط الاقتصادي',fk:'lookup_items'},
{k:'unified_national_number',l:'الرقم الموحد',r:1,d:1},
{k:'cr_number',l:'رقم السجل التجاري',d:1},
{k:'cr_status',l:'حالة السجل',o:['active','pending_confirmation','suspended','cancelled','expired','closed']},
{k:'cr_issue_date',l:'تاريخ إصدار السجل',t:'date'},
{k:'cr_confirm_date',l:'تاريخ التصديق',t:'date'},
{k:'cr_expiry_date',l:'تاريخ الانتهاء',t:'date'},
{k:'cr_delete_date',l:'تاريخ الشطب',t:'date'},
{k:'cr_version_no',l:'رقم نسخة السجل',d:1},
{k:'is_main_cr',l:'سجل رئيسي',o:['true','false']},
{k:'cr_activities',l:'أنشطة السجل',w:1},
{k:'parent_facility_id',l:'المنشأة الأم',fk:'facilities'},
{k:'branch_id',l:'المكتب',fk:'branches'},
{k:'region_id',l:'المنطقة',fk:'regions'},
{k:'city_id',l:'المدينة',fk:'cities'},
{k:'qiwa_file_number',l:'رقم ملف قوى',d:1},
{k:'gosi_file_number',l:'رقم ملف التأمينات',d:1},
{k:'chamber_membership_no',l:'رقم عضوية الغرفة',d:1},
{k:'chamber_membership_expiry',l:'انتهاء عضوية الغرفة',t:'date'},
{k:'address_ar',l:'العنوان',w:1},
{k:'mobile',l:'الجوال',d:1},
{k:'email',l:'البريد',d:1},
{k:'purpose_permanent_visa',l:'تأشيرة دائمة',o:['true','false']},
{k:'purpose_temporary_visa',l:'تأشيرة مؤقتة',o:['true','false']},
{k:'purpose_transfer',l:'نقل خدمات',o:['true','false']},
{k:'is_original_exempt',l:'مستثنى أصلي',o:['true','false']},
{k:'vat_number',l:'رقم ض.ق.م',d:1},
{k:'vat_status',l:'حالة الضريبة'},
{k:'zakat_unique_number',l:'رقم الزكاة',d:1},
{k:'nitaqat_color',l:'نطاقات',o:['red','yellow','green_low','green_mid','green_high','platinum']},
{k:'nitaqat_size',l:'حجم نطاقات'},
{k:'total_workers',l:'إجمالي العمال',d:1},
{k:'total_workers_in_nitaqat',l:'العمال في نطاقات',d:1},
{k:'saudi_workers',l:'سعوديين',d:1},
{k:'saudi_workers_in_nitaqat',l:'سعوديين في نطاقات',d:1},
{k:'non_saudi_workers',l:'غير سعوديين',d:1},
{k:'non_saudi_workers_in_nitaqat',l:'غير سعوديين في نطاقات',d:1},
{k:'saudization_percentage',l:'نسبة السعودة',d:1},
{k:'contract_auth_pct',l:'نسبة توثيق العقود',d:1},
{k:'wps_compliance_pct',l:'نسبة حماية الأجور',d:1},
{k:'authenticated_count',l:'عقود موثقة',d:1},
{k:'unauthenticated_count',l:'عقود غير موثقة',d:1},
{k:'available_visas',l:'تأشيرات متاحة',d:1},
{k:'used_visas',l:'مستخدمة',d:1},
{k:'not_used_visas',l:'غير مستخدمة',d:1},
{k:'cancelled_visas',l:'ملغاة',d:1},
{k:'wp_expired',l:'رخص منتهية',d:1},
{k:'wp_issued_this_year',l:'صادرة هذا العام',d:1},
{k:'gosi_form',l:'نموذج التأمينات'},
{k:'gosi_status',l:'حالة التأمينات'},
{k:'gosi_total_contributors',l:'إجمالي المشتركين',d:1},
{k:'gosi_saudi_contributors',l:'مشتركين سعوديين',d:1},
{k:'gosi_non_saudi_contributors',l:'مشتركين غير سعوديين',d:1},
{k:'gosi_active_contributors',l:'مشتركين نشطين',d:1},
{k:'gosi_non_active_contributors',l:'مشتركين غير نشطين',d:1},
{k:'gosi_total_contributions',l:'إجمالي الاشتراكات',d:1},
{k:'gosi_total_debit',l:'إجمالي المديونية',d:1},
{k:'gosi_penalties',l:'الغرامات',d:1},
{k:'gosi_total_obligations',l:'إجمالي الالتزامات',d:1},
{k:'mudad_wps_compliance_pct',l:'مدد - حماية الأجور',d:1},
{k:'mudad_wps_compliance_status',l:'حالة مدد'},
{k:'mlsd_service_status',l:'حالة خدمات العمل'},
{k:'ajeer_borrowed_workers_count',l:'عمال أجير مستعارين',d:1},
{k:'ajeer_active_contracts',l:'عقود أجير نشطة',d:1},
{k:'zakat_outstanding_balance',l:'رصيد الزكاة المستحق',d:1},
{k:'notes',l:'ملاحظات',w:1}
]},

workers:{table:'workers',title:T('العمّال','Workers'),icon:'worker',
cols:[['name_ar','الاسم'],['worker_number','الرقم'],['iqama_number','الإقامة'],['nationality','الجنسية'],['worker_status','الحالة'],['phone','الجوال']],
flds:[
{k:'worker_number',l:'رقم العامل',d:1},
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'facility_id',l:'المنشأة',fk:'facilities'},
{k:'branch_id',l:'المكتب',fk:'branches'},
{k:'broker_id',l:'الوسيط',fk:'brokers'},
{k:'gender',l:'الجنس',o:['male','female']},
{k:'nationality',l:'الجنسية',fk:'lookup_items'},
{k:'birth_date_g',l:'تاريخ الميلاد',t:'date'},
{k:'phone',l:'الجوال',d:1},
{k:'iqama_number',l:'رقم الإقامة',r:1,d:1},
{k:'border_number',l:'رقم الحدود',d:1},
{k:'passport_number',l:'رقم الجواز',d:1},
{k:'passport_expiry',l:'انتهاء الجواز',t:'date'},
{k:'occupation_id',l:'المهنة',fk:'lookup_items'},
{k:'entry_date_saudi',l:'تاريخ دخول المملكة',t:'date'},
{k:'joining_method',l:'طريقة الالتحاق'},
{k:'old_employer_name',l:'صاحب العمل السابق'},
{k:'old_employer_id',l:'رقم صاحب العمل السابق',d:1},
{k:'sponsor_transfer_date',l:'تاريخ نقل الكفالة',t:'date'},
{k:'gosi_status',l:'حالة التأمينات'},
{k:'gosi_salary',l:'راتب التأمينات',d:1},
{k:'qiwa_salary',l:'راتب قوى',d:1},
{k:'qiwa_contract_expiry_date',l:'انتهاء عقد قوى',t:'date'},
{k:'qiwa_contract_status',l:'حالة عقد قوى'},
{k:'worker_status',l:'حالة العامل',o:['active','absconded','final_exit','transferred','suspended'],r:1},
{k:'outside_kingdom',l:'خارج المملكة',o:['true','false']},
{k:'has_vehicle',l:'يملك مركبة',o:['true','false']},
{k:'dependents_count',l:'عدد المرافقين',d:1},
{k:'is_complete',l:'ملف مكتمل',o:['true','false']},
{k:'notes',l:'ملاحظات',w:1}
]},

clients:{table:'clients',title:T('العملاء','Clients'),icon:'client',
cols:[['name_ar','الاسم'],['client_number','الرقم'],['id_number','الهوية'],['phone','الجوال'],['status','الحالة']],
flds:[
{k:'client_number',l:'رقم العميل',d:1},
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'id_type',l:'نوع الهوية',o:['national_id','iqama','gcc_id','passport']},
{k:'id_number',l:'رقم الهوية',d:1},
{k:'phone',l:'الجوال',d:1},
{k:'email',l:'البريد الإلكتروني',d:1},
{k:'address',l:'العنوان',w:1},
{k:'branch_id',l:'المكتب',fk:'branches'},
{k:'referred_by_broker_id',l:'الوسيط المُحيل',fk:'brokers'},
{k:'status',l:'الحالة',o:['active','inactive'],r:1},
{k:'notes',l:'ملاحظات',w:1}
]},

brokers:{table:'brokers',title:T('الوسطاء','Brokers'),icon:'broker',
cols:[['name_ar','الاسم'],['id_number','الهوية'],['phone','الجوال'],['default_commission_type','العمولة'],['status','الحالة']],
flds:[
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'id_number',l:'رقم الهوية',d:1},
{k:'phone',l:'الجوال',d:1},
{k:'email',l:'البريد الإلكتروني',d:1},
{k:'default_commission_type',l:'نوع العمولة',o:['fixed','percentage']},
{k:'default_commission_rate',l:'نسبة/مبلغ العمولة',d:1},
{k:'bank_name',l:'اسم البنك',fk:'lookup_items'},
{k:'account_number',l:'رقم الحساب البنكي',d:1},
{k:'iban',l:'رقم الآيبان',d:1},
{k:'branch_id',l:'المكتب',fk:'branches'},
{k:'status',l:'الحالة',o:['active','inactive'],r:1},
{k:'notes',l:'ملاحظات',w:1}
]},

providers:{table:'providers',title:T('المعقّبين','Providers'),icon:'broker',
cols:[['name_ar','الاسم'],['id_number','الهوية'],['phone','الجوال'],['status','الحالة']],
flds:[
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'id_number',l:'رقم الهوية',d:1},
{k:'phone',l:'الجوال',d:1},
{k:'bank_name',l:'اسم البنك',fk:'lookup_items'},
{k:'account_number',l:'رقم الحساب البنكي',d:1},
{k:'iban',l:'رقم الآيبان',d:1},
{k:'status',l:'الحالة',o:['active','inactive'],r:1},
{k:'notes',l:'ملاحظات',w:1}
]},

installments:{table:'invoice_installments',title:'متابعة الدفعات',icon:'payment',
cols:[['installment_order','الترتيب'],['amount','المبلغ'],['due_date','الاستحقاق'],['status','الحالة'],['paid_date','السداد']],
flds:[
{k:'invoice_id',l:'الفاتورة',fk:'invoices'},
{k:'installment_order',l:'ترتيب القسط',d:1,r:1},
{k:'milestone_id',l:'المرحلة',fk:'service_type_milestones'},
{k:'amount',l:'المبلغ',d:1,r:1},
{k:'due_date',l:'تاريخ الاستحقاق',t:'date',r:1},
{k:'status',l:'الحالة',o:['pending','paid','overdue','cancelled'],r:1},
{k:'paid_date',l:'تاريخ السداد',t:'date'},
{k:'notes',l:'ملاحظات',w:1}
]},

expenses:{table:'expenses',title:T('المصاريف والسدادات','Expenses & Payments'),icon:'expense',
cols:[['expense_number','الرقم'],['expense_type','النوع'],['amount','المبلغ'],['payment_method','الدفع'],['payment_date','التاريخ']],
flds:[
{k:'expense_number',l:'رقم المصروف',d:1},
{k:'expense_type',l:'نوع المصروف',o:['sadad_payment','branch_expense','employee_expense','saudization_expense','broker_commission'],r:1},
{k:'category_id',l:'التصنيف',fk:'lookup_items'},
{k:'facility_id',l:'المنشأة',fk:'facilities'},
{k:'branch_id',l:'المكتب',fk:'branches'},
{k:'transaction_id',l:'المعاملة',fk:'transactions'},
{k:'worker_id',l:'العامل',fk:'workers'},
{k:'provider_id',l:'المزوّد',fk:'providers'},
{k:'user_id',l:'المستخدم',fk:'users'},
{k:'broker_id',l:'الوسيط',fk:'brokers'},
{k:'invoice_id',l:'الفاتورة',fk:'invoices'},
{k:'commission_type',l:'نوع العمولة',o:['fixed','percentage']},
{k:'commission_rate',l:'نسبة العمولة',d:1},
{k:'amount',l:'المبلغ',d:1,r:1},
{k:'payment_method',l:'طريقة الدفع',o:['cash','bank_transfer','sadad'],r:1},
{k:'payment_date',l:'تاريخ الدفع',t:'date',r:1},
{k:'reference_number',l:'رقم المرجع',d:1},
{k:'sadad_code',l:'رمز سداد',d:1},
{k:'sadad_number',l:'رقم سداد',d:1},
{k:'notes',l:'ملاحظات',w:1}
]},

work_permits:{table:'work_permits',title:T('كروت العمل','Work Permits'),icon:'transaction',
cols:[['wp_issue_date','الإصدار'],['wp_expiry_date','الانتهاء'],['duration_months','المدة'],['is_reduced','مخفض'],['wp_order','الترتيب']],
flds:[
{k:'facility_id',l:'المنشأة',fk:'facilities'},
{k:'worker_id',l:'العامل',fk:'workers'},
{k:'is_reduced',l:'رخصة مخفضة',o:['true','false']},
{k:'wp_order',l:'ترتيب الرخصة',d:1},
{k:'hijri_year_id',l:'السنة الهجرية',fk:'wp_hijri_years'},
{k:'wp_issue_date',l:'تاريخ الإصدار',t:'date',r:1},
{k:'wp_expiry_date',l:'تاريخ الانتهاء',t:'date',r:1},
{k:'duration_months',l:'المدة بالأشهر',d:1},
{k:'notes',l:'ملاحظات',w:1}
]},

iqama_cards:{table:'iqama_cards',title:T('الإقامات','Iqama Cards'),icon:'transaction',
cols:[['iqama_issue_date','الإصدار'],['iqama_expiry_date','الانتهاء'],['duration_months','المدة']],
flds:[
{k:'facility_id',l:'المنشأة',fk:'facilities'},
{k:'worker_id',l:'العامل',fk:'workers'},
{k:'iqama_issue_date',l:'تاريخ الإصدار',t:'date',r:1},
{k:'iqama_expiry_date',l:'تاريخ الانتهاء',t:'date',r:1},
{k:'duration_months',l:'المدة بالأشهر',d:1},
{k:'notes',l:'ملاحظات',w:1}
]},

worker_insurance:{table:'worker_insurance',title:T('التأمين','Insurance'),icon:'payment',
cols:[['insurance_company','شركة التأمين'],['insurance_policy_no','رقم الوثيقة'],['start_date','البداية'],['end_date','النهاية']],
flds:[
{k:'worker_id',l:'العامل',fk:'workers'},
{k:'insurance_company',l:'شركة التأمين',r:1},
{k:'insurance_policy_no',l:'رقم وثيقة التأمين',d:1},
{k:'start_date',l:'تاريخ البداية',t:'date',r:1},
{k:'end_date',l:'تاريخ النهاية',t:'date',r:1},
{k:'notes',l:'ملاحظات',w:1}
]},

wp_years:{table:'wp_hijri_years',title:'السنوات الهجرية',icon:'settings',
cols:[['hijri_year','السنة'],['start_date','البداية'],['end_date','النهاية']],
flds:[
{k:'hijri_year',l:'السنة الهجرية',d:1,r:1},
{k:'start_date',l:'تاريخ البداية',t:'date',r:1},
{k:'end_date',l:'تاريخ النهاية',t:'date',r:1},
{k:'notes',l:'ملاحظات',w:1}
]},

facility_subs:{table:'facility_subscriptions',title:T('الاشتراكات','Subscriptions'),icon:'settings',
cols:[['subscription_status','الحالة'],['start_date','البداية'],['end_date','النهاية'],['points_balance','النقاط']],
flds:[
{k:'facility_id',l:'المنشأة',fk:'facilities'},
{k:'platform_type_id',l:'نوع المنصة',fk:'lookup_items'},
{k:'subscription_status',l:'حالة الاشتراك',o:['active','expired','suspended'],r:1},
{k:'start_date',l:'تاريخ البداية',t:'date',r:1},
{k:'end_date',l:'تاريخ النهاية',t:'date',r:1},
{k:'points_balance',l:'رصيد النقاط',d:1},
{k:'notes',l:'ملاحظات',w:1}
]},

platform_creds:{table:'platform_credentials',title:T('بيانات الدخول','Platform Credentials'),icon:'settings',
cols:[['credential_type','النوع'],['username','المستخدم'],['phone_linked','الجوال'],['status','الحالة']],
flds:[
{k:'credential_type',l:'نوع البيانات',r:1},
{k:'facility_id',l:'المنشأة',fk:'facilities'},
{k:'platform_type_id',l:'نوع المنصة',fk:'lookup_items'},
{k:'username',l:'اسم المستخدم',d:1},
{k:'password',l:'كلمة المرور'},
{k:'phone_linked',l:'الجوال المرتبط',d:1},
{k:'email_linked',l:'البريد المرتبط',d:1},
{k:'status',l:'الحالة',o:['active','inactive','expired'],r:1},
{k:'notes',l:'ملاحظات',w:1}
]},

exemption_log:{table:'facility_exemption_log',title:'سجل الإعفاء',icon:'transaction',
cols:[['week_start','بداية الأسبوع'],['status','الحالة'],['linked_at','الربط'],['unlinked_at','الفك']],
flds:[
{k:'exempt_facility_id',l:'المنشأة المعفاة',fk:'facilities'},
{k:'linked_facility_id',l:'المنشأة المرتبطة',fk:'facilities'},
{k:'linked_at',l:'تاريخ الربط',t:'date'},
{k:'unlinked_at',l:'تاريخ الفك',t:'date'},
{k:'week_start',l:'بداية الأسبوع',t:'date'},
{k:'status',l:'الحالة',o:['active','expired','revoked'],r:1},
{k:'linked_by',l:'ربط بواسطة',fk:'users'},
{k:'unlinked_by',l:'فك بواسطة',fk:'users'},
{k:'notes',l:'ملاحظات',w:1}
]},

regions:{table:'regions',title:'المناطق',icon:'branch',
cols:[['name_ar','الاسم'],['name_en','بالإنجليزي'],['code','الكود'],['is_active','نشط']],
flds:[
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'code',l:'الكود',d:1},
{k:'is_active',l:'نشط',o:['true','false']}
]},

cities:{table:'cities',title:'المدن',icon:'branch',
cols:[['name_ar','الاسم'],['name_en','بالإنجليزي'],['code','الكود'],['is_active','نشط']],
flds:[
{k:'region_id',l:'المنطقة',fk:'regions'},
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'code',l:'الكود',d:1},
{k:'is_active',l:'نشط',o:['true','false']}
]},

lookup_categories:{table:'lookup_categories',title:'القوائم',icon:'settings',
cols:[['category_key','المفتاح'],['name_ar','الاسم'],['name_en','بالإنجليزي'],['is_system','نظامي'],['is_active','نشط']],
flds:[
{k:'category_key',l:'مفتاح القائمة',r:1,d:1},
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'is_system',l:'نظامي',o:['true','false']},
{k:'is_active',l:'نشط',o:['true','false']}
]},

lookup_items:{table:'lookup_items',title:'عناصر القوائم',icon:'settings',
cols:[['value_ar','القيمة'],['value_en','بالإنجليزي'],['code','الكود'],['sort_order','الترتيب'],['is_active','نشط']],
flds:[
{k:'category_id',l:'القائمة',fk:'lookup_categories'},
{k:'value_ar',l:'القيمة بالعربي',r:1},{k:'value_en',l:'القيمة بالإنجليزي',d:1},
{k:'code',l:'الكود',d:1},
{k:'parent_item_id',l:'العنصر الأب',fk:'lookup_items'},
{k:'sort_order',l:'الترتيب',d:1},
{k:'is_active',l:'نشط',o:['true','false']},
{k:'metadata',l:'بيانات إضافية (JSON)',w:1}
]},

documents:{table:'documents',title:'الوثائق',icon:'transaction',
cols:[['file_name','اسم الملف'],['entity_type','نوع الكيان'],['mime_type','نوع الملف'],['expiry_date','الانتهاء'],['version','الإصدار']],
flds:[
{k:'entity_type',l:'نوع الكيان',o:['facility','worker','client','broker','owner','transaction'],r:1},
{k:'entity_id',l:'معرف الكيان',d:1},
{k:'document_type_id',l:'نوع الوثيقة',fk:'lookup_items'},
{k:'file_name',l:'اسم الملف',r:1},
{k:'file_path',l:'مسار الملف',d:1},
{k:'file_size',l:'حجم الملف (بايت)',d:1},
{k:'mime_type',l:'نوع الملف'},
{k:'version',l:'رقم الإصدار',d:1},
{k:'expiry_date',l:'تاريخ الانتهاء',t:'date'},
{k:'notes',l:'ملاحظات',w:1}
]},

audit:{table:'invoice_payments',title:'التدقيق المالي',icon:'payment',
cols:[['amount','المبلغ'],['payment_method','الطريقة'],['payment_date','التاريخ'],['reference_number','المرجع'],['bank_name','البنك']],
flds:[
{k:'invoice_id',l:'الفاتورة',fk:'invoices'},
{k:'installment_id',l:'القسط',fk:'invoice_installments'},
{k:'amount',l:'المبلغ',d:1,r:1},
{k:'payment_method',l:'طريقة الدفع',o:['cash','bank_transfer','sadad'],r:1},
{k:'payment_date',l:'تاريخ الدفع',t:'date',r:1},
{k:'collected_by_user_id',l:'المستلم',fk:'users'},
{k:'reference_number',l:'رقم المرجع',d:1},
{k:'bank_name',l:'اسم البنك',fk:'lookup_items'},
{k:'notes',l:'ملاحظات',w:1}
]}

};const pageConf=pages[pg];const pgTitle=(()=>{for(const n of nav){if(n.id===pg)return n.l;const kids=n.children||hubTabs[n.id];if(kids){const c=kids.find(c=>c.id===pg);if(c)return c.l}}return T('الرئيسية','Dashboard')})();const pgIcon=(()=>{for(const n of nav){if(n.id===pg)return n.i;const kids=n.children||hubTabs[n.id];if(kids){const c=kids.find(c=>c.id===pg);if(c)return c.i}}return 'home'})();return(<div className='dash-wrap' dir={lang==='ar'?'rtl':'ltr'} style={{display:'flex',height:'100vh',direction:lang==='ar'?'rtl':'ltr',fontFamily:"'Cairo',sans-serif",background:'var(--bg)',WebkitFontSmoothing:'antialiased',overflow:'hidden'}}>
{/* ═══ MOBILE OVERLAY ═══ */}
{sideOpen&&<div className='mob-overlay' onClick={()=>setSideOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',backdropFilter:'blur(3px)',zIndex:199,display:'none'}}/>}
{/* ═══ SIDEBAR — Design 5 Grouped ═══ */}
<aside className={'dash-side'+(sideOpen?' side-open':'')} style={{width:210,background:'var(--sb)',display:'flex',flexDirection:'column',flexShrink:0}}>
{/* Logo */}
<div style={{padding:'14px 24px 14px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
<div style={{fontSize:26,fontWeight:900,color:C.gold,letterSpacing:'-1px',lineHeight:1,fontFamily:"'Noto Kufi Arabic','Cairo',sans-serif"}}>{lang==='ar'?'جسر':'JISR'}</div>
</div>
{/* Nav */}
<nav style={{flex:1,overflowY:'auto',padding:'8px 10px 12px',scrollbarWidth:'none',msOverflowStyle:'none',WebkitOverflowScrolling:'touch'}}>
<style>{'aside nav::-webkit-scrollbar{display:none}.dash-content::-webkit-scrollbar{display:none}.sr-scroll{scrollbar-width:thin;scrollbar-color:rgba(212,160,23,.25) transparent}.sr-scroll::-webkit-scrollbar{width:4px}.sr-scroll::-webkit-scrollbar-track{background:transparent}.sr-scroll::-webkit-scrollbar-thumb{background:rgba(212,160,23,.25);border-radius:4px}.sr-scroll::-webkit-scrollbar-thumb:hover{background:rgba(212,160,23,.4)}'}</style>
<div style={{display:'flex',flexDirection:'column',gap:2}}>
{nav.filter(n=>{if(ADMIN_ONLY.includes(n.id)&&!canSeeAdminOnly(n.id))return false;if(!isVisible(n.id))return false;const s=hubTabs[n.id];return !s||s.some(t=>isVisible(t.id))}).map((n)=>{
const rawSubs=hubTabs[n.id]||null
const subs=rawSubs?rawSubs.filter(t=>isVisible(t.id)):null
const hubActive=subs&&subs.some(t=>t.id===pg)
const isOpen=subs?(navExpanded[n.id]!==undefined?navExpanded[n.id]:hubActive):false
const isActive=pg===n.id||hubActive
const mainClr=isActive?C.gold:'rgba(255,255,255,.55)'
return<div key={n.id}>
<div onClick={()=>{if(subs){setNavExpanded(p=>({...p,[n.id]:!isOpen}))}else{setPage(n.id)}}} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',cursor:'pointer',fontSize:13,fontWeight:600,color:mainClr,letterSpacing:'.2px',transition:'.18s',opacity:isActive?1:.9}}>
<span style={{flex:1,textAlign:lang==='ar'?'right':'left'}}>{n.l}</span>
{n.n>0&&<span style={{fontSize:9,fontWeight:700,background:C.red,color:'#fff',padding:'1px 6px',borderRadius:8,minWidth:16,textAlign:'center'}}>{n.n}</span>}
{subs&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={isActive?C.gold:'rgba(255,255,255,.35)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{transition:'transform .2s',transform:isOpen?'rotate(0deg)':'rotate(180deg)',flexShrink:0}}><polyline points="18 15 12 9 6 15"/></svg>}
</div>
{subs&&isOpen&&<div style={{display:'flex',flexDirection:'column',gap:1,margin:'3px 0 6px',[lang==='ar'?'paddingLeft':'paddingRight']:10}}>
{subs.map(t=>{const sAct=pg===t.id;const subClr=sAct?C.gold:'rgba(255,255,255,.5)';const subIcon=DT(subClr)[t.i||n.i];return<div key={t.id} onClick={()=>setPage(t.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderRadius:10,cursor:'pointer',fontSize:12,fontWeight:sAct?700:500,color:subClr,background:sAct?'rgba(212,160,23,.08)':'transparent',transition:'.15s',position:'relative'}}>
{sAct&&<div style={{position:'absolute',[lang==='ar'?'right':'left']:4,top:10,bottom:10,width:3,borderRadius:3,background:C.gold}}/>}
<span style={{width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:sAct?1:.5}}>{subIcon}</span>
<span style={{flex:1,textAlign:lang==='ar'?'right':'left'}}>{t.l}</span>
{t.n>0&&<span style={{fontSize:9,fontWeight:700,background:sAct?'rgba(212,160,23,.15)':'rgba(255,255,255,.06)',color:sAct?C.gold:'rgba(255,255,255,.6)',padding:'1px 7px',borderRadius:8,minWidth:16,textAlign:'center'}}>{t.n}</span>}
</div>})}
</div>}
</div>})}
</div>
</nav>
{/* Sidebar FABs — خدمة + حسبة التنازل */}
<div style={{padding:'12px 14px 14px',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
{isVisible('fab_service_request')&&<div className="fab-service-request" onClick={()=>setShowServiceRequest(true)} style={{height:40,padding:'0 18px',borderRadius:10,background:'rgba(212,160,23,.08)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all .2s'}}>
<span style={{fontSize:14,fontWeight:700,color:'#D4A017',fontFamily:"'Noto Kufi Arabic','Cairo',sans-serif",letterSpacing:-.5,lineHeight:1}}>{T('فاتورة','Invoice')}</span>
<span style={{position:'relative',display:'inline-flex',alignItems:'center',color:'#D4A017'}}><FileText size={16} strokeWidth={2}/><Sparkles size={10} strokeWidth={2} style={{position:'absolute',top:-4,right:-4}}/></span>
</div>}
{isVisible('fab_transfer_calc')&&<div className="fab-service-request" onClick={()=>setShowKafalaCalc(true)} style={{height:40,padding:'0 18px',borderRadius:10,background:'rgba(212,160,23,.08)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all .2s'}}>
<span style={{fontSize:14,fontWeight:700,color:'#D4A017',fontFamily:lang==='en'?"'Inter','Cairo',sans-serif":"'Noto Kufi Arabic','Cairo',sans-serif",letterSpacing:-.3,lineHeight:1}}>{T('تسعيرة تنازل','Transfer Calc')}</span>
<span style={{display:'inline-flex',alignItems:'center',color:'#D4A017'}}><Tag size={16} strokeWidth={2}/></span>
</div>}
<style>{`.fab-service-request:hover{background:rgba(212,160,23,.14)!important}`}</style>
</div>
</aside>
{/* ═══ MAIN AREA ═══ */}
<div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--bg)',minWidth:0}}>
{/* ═══ TOPBAR ═══ */}
<header className='dash-header' style={{height:56,background:'var(--sb)',display:'flex',alignItems:'center',gap:14,padding:'0 20px',flexShrink:0,boxShadow:'0 2px 12px rgba(0,0,0,.12)',minWidth:0}}>
<div className='mob-hamburger' onClick={()=>setSideOpen(!sideOpen)} style={{display:'none',width:36,height:36,borderRadius:10,background:sideOpen?'rgba(212,160,23,.14)':'rgba(212,160,23,.04)',border:'1px solid '+(sideOpen?'rgba(212,160,23,.25)':'rgba(212,160,23,.12)'),alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'.18s'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sideOpen?C.gold:'rgba(255,255,255,.55)'} strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="16" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></div>
{/* عنوان الصفحة الحالية — يعكس اختيار السايد بار */}
{(()=>{
const specials={home:T('الرئيسية','Dashboard'),otp_messages:T('الرسائل النصية','SMS'),sync_hub:T('مركز المزامنة','Sync Hub'),settings:T('الإعدادات','Settings'),worker_leaves:T('إجازات العمالة','Worker Leaves'),transfer_calc:T('تسعيرات التنازل','Transfer Calc'),kpi:T('المؤشرات','KPIs'),calendar_unified:T('التقويم','Calendar'),appointments:T('المواعيد','Appointments'),installments:T('الأقساط','Installments'),expenses:T('المصروفات','Expenses')};
let hubLabel='',pageLabel='';
for(const [hubId,tabs] of Object.entries(hubTabs)){const tab=tabs.find(t=>t.id===pg);if(tab){const hub=nav.find(n=>n.id===hubId);hubLabel=hub?.l||'';pageLabel=tab.l;break}}
if(!pageLabel){const direct=nav.find(n=>n.id===pg);if(direct)pageLabel=direct.l;else if(specials[pg])pageLabel=specials[pg]}
if(!pageLabel)return null;
const chev=lang==='ar'?<polyline points="15 18 9 12 15 6"/>:<polyline points="9 18 15 12 9 6"/>;
return<div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,overflow:'hidden'}}>
{hubLabel&&<>
<span style={{fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,.42)',whiteSpace:'nowrap'}}>{hubLabel}</span>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,.45)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{chev}</svg>
</>}
<span style={{fontSize:13.5,fontWeight:800,color:C.gold,whiteSpace:'nowrap',textShadow:'0 1px 8px rgba(212,160,23,.18)'}}>{pageLabel}</span>
</div>
})()}
{/* فاصل مرن: يدفع كل المحتوى لليسار */}
<div style={{flex:1,minWidth:0}}/>
{/* اليسار: الساعة + التاريخ */}
<div className='topbar-datetime' style={{display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap',flexShrink:0}}>
<span style={{fontSize:11,fontWeight:500,color:'rgba(255,255,255,.55)'}}>{new Date().toLocaleDateString(lang==='ar'?'ar-SA-u-nu-latn':'en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
<AnalogClock size={34}/>
</div>
{/* فاصل خفيف بين التاريخ والأدوات */}
<div style={{width:1,height:20,background:'linear-gradient(180deg,transparent,rgba(212,160,23,.22),transparent)'}}/>
{/* اليسار: مساعد جسر · اللغة | الملف الشخصي · خروج */}
<div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
{/* الملف الشخصي — كرت الاسم يفتح بيانات المستخدم مباشرة */}
<div data-avatar onClick={()=>{const nat=natCache;const natLabel=nat?(lang==='en'?nat.name_en||nat.name_ar:nat.name_ar)||'':'';setShowProfile(true);setProfileTab('info');setProfileErr({});setProfileData({phone:user.person?.personal_phone||'',email:user.person?.email||'',name_ar:user.person?.name_ar||'',name_en:user.person?.name_en||'',id_number:user.person?.id_number||'',nationality:natLabel,nationality_code:nat?.code||'',nationality_flag:nat?.flag_url||'',avatar_url:user.person?.avatar_url||'',_origEmail:user.person?.email||''});
// Fallback: fetch nationality only if cache wasn't ready yet
if(!nat){(async()=>{const natId=user.person?.nationality_id;if(natId){const{data}=await sb.from('nationalities').select('id,name_ar,name_en,code,flag_url').eq('id',natId).maybeSingle();if(data){setNatCache(data);const lbl=lang==='en'?data.name_en||data.name_ar:data.name_ar;setProfileData(p=>({...p,nationality:lbl||'',nationality_code:data.code||'',nationality_flag:data.flag_url||''}))}}})();}}} title={(lang==='en'?(user?.person?.name_en||user?.person?.name_ar):(user?.person?.name_ar||user?.person?.name_en))||(lang==='ar'?'الملف الشخصي':'Profile')} style={{width:32,height:32,borderRadius:'50%',background:avatarUrl?'transparent':'linear-gradient(135deg,rgba(212,160,23,.32) 0%,rgba(212,160,23,.06) 100%)',border:'1px solid rgba(212,160,23,.45)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer',transition:'.2s',boxShadow:'inset 0 1px 1px rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.25)',overflow:'hidden'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,160,23,.85)';e.currentTarget.style.boxShadow='inset 0 1px 1px rgba(255,255,255,.08), 0 2px 8px rgba(212,160,23,.22)';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke=C.gold}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(212,160,23,.45)';e.currentTarget.style.boxShadow='inset 0 1px 1px rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.25)';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke='rgba(255,255,255,.6)'}}>{avatarUrl?<img src={avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{display:'block'}}><path d="M3 23 C3 17 6.5 14.2 12 14.2 C17.5 14.2 21 17 21 23 Z" fill={C.gold}/><circle cx="12" cy="8.5" r="4.7" fill={C.gold}/><path d="M7.3 8.5 C7.3 5.5 9.4 3.3 12 3.3 C14.6 3.3 16.7 5.5 16.7 8.5" stroke="rgba(0,0,0,.28)" strokeWidth="1" fill="none" strokeLinecap="round"/></svg>}</div>
{/* زر الخروج — كرت أيقونة مثل الإشعارات */}
<div onClick={onLogout} title={lang==='ar'?'تسجيل الخروج':'Sign Out'} style={{width:34,height:34,borderRadius:10,background:'linear-gradient(180deg,rgba(192,57,43,.14) 0%,rgba(192,57,43,.03) 100%)',border:'1px solid rgba(192,57,43,.3)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04),inset 0 -1px 1px rgba(0,0,0,.25),0 1px 3px rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'.2s',position:'relative'}} onMouseEnter={e=>{e.currentTarget.style.background='linear-gradient(180deg,rgba(192,57,43,.3) 0%,rgba(192,57,43,.1) 100%)';e.currentTarget.style.borderColor='rgba(192,57,43,.55)';e.currentTarget.style.boxShadow='inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 1px rgba(0,0,0,.25),0 2px 10px rgba(192,57,43,.25)';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke='rgba(255,120,100,.95)'}} onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(180deg,rgba(192,57,43,.14) 0%,rgba(192,57,43,.03) 100%)';e.currentTarget.style.borderColor='rgba(192,57,43,.3)';e.currentTarget.style.boxShadow='inset 0 1px 0 rgba(255,255,255,.04),inset 0 -1px 1px rgba(0,0,0,.25),0 1px 3px rgba(0,0,0,.2)';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke='rgba(192,57,43,.85)'}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(192,57,43,.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke .2s',filter:'drop-shadow(0 1px 1px rgba(0,0,0,.3))'}}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
</div>
</div>
</header>
{/* ═══ Content ═══ */}
<div className='dash-content' style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'32px max(32px, calc((100% - 1500px) / 2))',msOverflowStyle:'none',scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
{pg==='home'&&<HomePage stats={stats} lang={lang} branches={dashBranches} selectedBranch={dashBranch} onBranchChange={setDashBranch} sb={sb} onNavigate={setPage} toast={tt}/>}

{/* ═══ HUB CONTENT (sidebar handles navigation) ═══ */}
{(()=>{
const allHubPages=Object.values(hubTabs).flat().map(t=>t.id).concat(['worker_leaves','transfer_calc'])
if(!allHubPages.includes(pg))return null
return<div><div>
{/* العمالة */}
{pg==='facilities'&&<FacilitiesPage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='workers'&&<WorkforcePage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='worker_leaves'&&<WorkerLeavesPage sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='transfer_calc'&&<TransferCalcPage sb={sb} toast={tt} user={user} lang={lang} onNewCalc={()=>setShowKafalaCalc(true)}/>}
{/* المالية */}
{pg==='invoices'&&<InvoicePageFull sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch}/>}
{/* الإدارة */}
{pg==='admin_offices'&&<BranchesPage key={navResetKey} sb={sb} toast={tt} user={user} lang={lang} showStaff={false} singleTab="branches" AdminPage={AdminPageFull} adminProps={{sb,toast:tt,user,lang,onTabChange:setSTabInfo,defaultTab:'users',branchId:dashBranch}}/>}
{pg==='admin_persons'&&<PersonsPage toast={tt} user={user}/>}
{pg==='admin_services'&&<ServiceAdminPage toast={tt} lang={lang}/>}
{pg==='admin_permissions'&&<PermissionsPage sb={sb} user={user} toast={tt} lang={lang} nav={nav} hubTabs={hubTabs} visibility={visibility} onVisibilityChange={saveVisibility}/>}
{pg==='admin_ui_controls'&&(()=>{window.setTimeout(()=>setPg('admin_permissions'),0);return null})()}
{pg==='admin_visibility'&&(()=>{window.setTimeout(()=>setPg('admin_ui_controls'),0);return null})()}
{/* الإعدادات */}
{pg==='settings_general'&&<SettingsPageFull sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo} defaultMainTab="general_group"/>}
{pg==='settings_fields'&&<SettingsPageFull sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo} defaultMainTab="fields_group"/>}
</div></div>})()}

{/* ═══ الإعدادات ═══ */}
{pg==='sync_hub'&&isGM&&<SyncHub sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='otp_messages'&&<OTPMessages sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='settings'&&<SettingsPageFull sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='kpi'&&<KPIPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='calendar_unified'&&<CalendarPage sb={sb} toast={tt} user={user} lang={lang} onNavigate={setPage}/>}
{(pg==='installments'||pg==='expenses')&&pageConf&&<CrudPage sb={sb} user={user} conf={pageConf} toast={tt} onRefresh={loadStats} lang={lang}/>}
{pg==='appointments'&&<AppointmentsPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
</div>
</div>
{showKafalaCalc&&<KafalaCalculator sb={sb} user={user} toast={tt} lang={lang} onClose={()=>setShowKafalaCalc(false)} onGoToTransferCalc={(q)=>{setShowKafalaCalc(false);try{window.location.hash='#transfer_calc?q='+encodeURIComponent(q||'')}catch{}setPg('transfer_calc')}}/>}
{showServiceRequest&&<div onClick={()=>setShowServiceRequest(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:998,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
<style>{`.sr-modal-scroll::-webkit-scrollbar{width:0;display:none}.sr-modal-scroll{scrollbar-width:none;-ms-overflow-style:none}`}</style>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--modal-bg)',borderRadius:16,width:680,maxWidth:'95vw',height:'85vh',maxHeight:'95vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 50px rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.06)',position:'relative'}}>
<div className="sr-modal-scroll" style={{flex:1,overflowY:'auto'}}>
<ServiceRequestPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch} onClose={()=>setShowServiceRequest(false)}/>
</div>
</div>
</div>}
{toastMsg&&(()=>{const isErr=toastMsg.includes('خطأ');const isDel=toastMsg.includes('حذف');const clr=isErr?'#e5867a':isDel?'#e5867a':'#6fc28a';const bg=isErr?'rgba(32,18,18,.92)':isDel?'rgba(32,18,18,.92)':'rgba(18,32,22,.92)';const bdr=isErr?'rgba(192,57,43,.35)':isDel?'rgba(192,57,43,.35)':'rgba(55,140,85,.45)';return<div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:bg,color:clr,fontFamily:"'Cairo',sans-serif",fontSize:12.5,fontWeight:600,padding:'11px 18px',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.45), 0 0 0 1px '+bdr,backdropFilter:'blur(10px)',display:'flex',alignItems:'center',gap:10,animation:'toastSlide .35s cubic-bezier(.2,.85,.3,1.05)',maxWidth:'calc(100vw - 32px)'}}>{isErr?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>:isDel?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}<span>{toastMsg}</span><style>{`@keyframes toastSlide{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style></div>})()}
{/* ═══ PROFILE MODAL — مستوحى من تصميم حسبة التنازل ═══ */}
{showProfile&&profileData&&(()=>{
const ar=lang==='ar';
const T2=(arT,enT)=>ar?arT:enT;
const fieldset={position:'relative',borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'20px 22px'};
const legendS={position:'absolute',top:-10,[ar?'right':'14px']:'auto',[ar?'right':'left']:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:13,fontWeight:600,color:C.gold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6};
const inpEdit={width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',outline:'none',background:'var(--modal-input-bg)',textAlign:'center',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'};
const inpLock={...inpEdit,background:'rgba(255,255,255,.02)',color:'rgba(255,255,255,.55)',border:'1px solid rgba(255,255,255,.04)',cursor:'not-allowed',boxShadow:'none'};
const lblS={fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:8,display:'flex',alignItems:'center',gap:5};
const lockIco=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>;
const emailChanged=profileData.email!==profileData._origEmail&&profileData.email;
const doSave=async()=>{
const err={};
const ph=profileData.phone?.replace('+966','');
if(!ph||ph.length!==9)err.phone=T2('رقم الجوال يجب أن يتكون من 9 أرقام','Phone must be 9 digits');
if(!profileData.email)err.email=T2('الرجاء إدخال البريد الإلكتروني','Please enter email');
else if(!/\S+@\S+\.\S+/.test(profileData.email))err.email=T2('يرجى إدخال بريد إلكتروني صحيح','Please enter a valid email');
setProfileErr(err);if(Object.keys(err).length>0)return;
setProfileBusy(true);try{
const{error}=await sb.from('persons').update({personal_phone:profileData.phone,email:profileData.email,updated_at:new Date().toISOString()}).eq('id',user.person_id);
if(error)throw error;
if(emailChanged){await sb.auth.updateUser({email:profileData.email});tt(T2('تم إرسال رابط تأكيد للبريد الجديد','Confirmation link sent to new email'))}
if(user.person){user.person.personal_phone=profileData.phone;user.person.email=profileData.email}
tt(T2('تم تحديث البيانات بنجاح','Profile updated successfully'));setShowProfile(false);setEmailConfirmStep(false);
}catch(e){tt('خطأ: '+e.message)}setProfileBusy(false)};
const onSave=()=>{
const err={};
const ph=profileData.phone?.replace('+966','');
if(!ph||ph.length!==9)err.phone=T2('رقم الجوال يجب أن يتكون من 9 أرقام','Phone must be 9 digits');
if(!profileData.email)err.email=T2('الرجاء إدخال البريد الإلكتروني','Please enter email');
else if(!/\S+@\S+\.\S+/.test(profileData.email))err.email=T2('يرجى إدخال بريد إلكتروني صحيح','Please enter a valid email');
setProfileErr(err);if(Object.keys(err).length>0)return;
if(emailChanged){setEmailConfirmStep(true)}else{doSave()}};
return<div onClick={()=>{setShowProfile(false);setEmailConfirmStep(false)}} style={{position:'fixed',inset:0,background:'rgba(10,10,10,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9997,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--modal-bg)',borderRadius:18,width:600,maxWidth:'95vw',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.5)',border:'1px solid rgba(212,160,23,.08)',fontFamily:F,direction:ar?'rtl':'ltr',position:'relative'}}>
<style>{`.pf-save-btn{height:38px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.pf-save-btn .pf-nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.pf-save-btn:hover .pf-nav-ico{background:#D4A017;color:#000;transform:translateX(${ar?'-4px':'4px'})}.pf-save-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
{/* Header */}
<input type="file" accept="image/*" id="pf-avatar-input" style={{display:'none'}} onChange={async(e)=>{
const file=e.target.files?.[0];if(!file)return;
const reader=new FileReader();
reader.onload=(ev)=>{
const img=new Image();
img.onload=async()=>{
const canvas=document.createElement('canvas');const sz=200;canvas.width=sz;canvas.height=sz;
const ctx=canvas.getContext('2d');
const r=Math.max(sz/img.width,sz/img.height);
const w=img.width*r,h=img.height*r;
ctx.drawImage(img,(sz-w)/2,(sz-h)/2,w,h);
const dataUrl=canvas.toDataURL('image/jpeg',0.85);
try{const{error}=await sb.from('users').update({avatar_url:dataUrl,updated_at:new Date().toISOString()}).eq('id',user.id);if(error)throw error;user.avatar_url=dataUrl;setAvatarUrl(dataUrl);setProfileData(p=>({...p,avatar_url:dataUrl}));tt(T2('تم تحديث الصورة','Avatar updated'))}catch(err){tt('خطأ: '+err.message)}
};img.src=ev.target.result;
};
reader.readAsDataURL(file);
e.target.value='';
}}/>
<div style={{padding:'20px 24px 0',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexShrink:0}}>
<div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
<div onClick={()=>document.getElementById('pf-avatar-input')?.click()} style={{position:'relative',cursor:'pointer',flexShrink:0}} title={T2('تغيير الصورة','Change avatar')}>
{(profileData.avatar_url||user?.avatar_url||user?.person?.avatar_url)?<img src={profileData.avatar_url||user.avatar_url||user.person.avatar_url} width="44" height="44" style={{borderRadius:'50%',objectFit:'cover',border:'1.5px solid rgba(212,160,23,.5)',display:'block'}} alt=""/>:<div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,rgba(212,160,23,.32) 0%,rgba(212,160,23,.06) 100%)',border:'1.5px solid rgba(212,160,23,.5)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'inset 0 1px 1px rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.25)'}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M3 23 C3 17 6.5 14.2 12 14.2 C17.5 14.2 21 17 21 23 Z" fill={C.gold}/><circle cx="12" cy="8.5" r="4.7" fill={C.gold}/><path d="M7.3 8.5 C7.3 5.5 9.4 3.3 12 3.3 C14.6 3.3 16.7 5.5 16.7 8.5" stroke="rgba(0,0,0,.28)" strokeWidth="1" fill="none" strokeLinecap="round"/></svg></div>}
<div style={{position:'absolute',bottom:-2,right:-2,width:18,height:18,borderRadius:'50%',background:C.gold,border:'2px solid var(--modal-bg)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg></div>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:22,fontWeight:600,color:'var(--tx)',fontFamily:F,lineHeight:1.2}}>{user?.role?.value_ar||T2('المدير العام','General Manager')}</div>
{user?.branch_id&&dashBranches.find(b=>b.id===user.branch_id)?<div style={{fontSize:11,color:'var(--tx4)',marginTop:6,fontWeight:500,display:'flex',alignItems:'center',gap:6}}><span style={{color:C.gold,fontSize:10}}>•</span><span>{dashBranches.find(b=>b.id===user.branch_id)?.name_ar}</span></div>:null}
</div>
</div>
<button onClick={()=>{setShowProfile(false);setEmailConfirmStep(false)}} onMouseEnter={e=>{e.currentTarget.style.background='linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)';e.currentTarget.style.borderColor='rgba(192,57,43,.4)';e.currentTarget.style.color='#e5867a'}} onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(180deg,#323232 0%,#262626 100%)';e.currentTarget.style.borderColor='rgba(255,255,255,.07)';e.currentTarget.style.color='var(--tx3)'}} style={{width:34,height:34,borderRadius:9,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',border:'1px solid rgba(255,255,255,.07)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}} aria-label={T2('إغلاق','Close')}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
</div>
{/* Body */}
<div style={{padding:24,display:'flex',flexDirection:'column',gap:14}}>
{/* القسم الأول: الهوية الرسمية (محمية) */}
<div style={fieldset}>
<div style={legendS}>{lockIco}<span>{T2('الملف الشخصي','Profile')}</span></div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={lblS}>{T2('الاسم بالعربي','Name (Arabic)')}</div><input value={profileData.name_ar||''} readOnly style={inpLock}/></div>
<div><div style={lblS}>{T2('الاسم بالإنجليزي','Name (English)')}</div><input value={profileData.name_en||''} readOnly style={{...inpLock,direction:'ltr'}}/></div>
<div><div style={lblS}>{T2('رقم الهوية','ID Number')}</div><input value={profileData.id_number||''} readOnly style={{...inpLock,direction:'ltr',letterSpacing:'.5px'}}/></div>
<div><div style={lblS}>{T2('الجنسية','Nationality')}</div>
<div style={{position:'relative'}}>
<input value={profileData.nationality||T2('غير محدد','—')} readOnly style={{...inpLock,paddingLeft:profileData.nationality_flag?42:12,paddingRight:12}}/>
{profileData.nationality_flag&&<img src={profileData.nationality_flag} alt="" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:24,height:16,borderRadius:2,objectFit:'cover',pointerEvents:'none',display:'block'}}/>}
</div></div>
</div>
</div>

{/* القسم الثاني: التواصل والتفضيلات (قابلة للتعديل) */}
<div style={fieldset}>
<div style={legendS}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>{T2('بيانات قابلة للتعديل','Editable Information')}</span></div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
<div><div style={lblS}>{T2('رقم الجوال','Phone')}</div>
<div style={{display:'flex',direction:'ltr',border:profileErr.phone?'1px solid rgba(192,57,43,.5)':'1px solid transparent',borderRadius:9,overflow:'hidden',background:'var(--modal-input-bg)',height:38,boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',transition:'border-color .2s'}}>
<div style={{height:'100%',padding:'0 10px',background:'rgba(255,255,255,.04)',display:'flex',alignItems:'center',fontSize:12,fontWeight:700,color:C.gold,flexShrink:0,fontFamily:F}}>+966</div>
<input placeholder="5X XXX XXXX" maxLength={9} value={(profileData.phone||'').replace('+966','')} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,9);setProfileData(p=>({...p,phone:'+966'+v}))}} style={{width:'100%',height:'100%',padding:'0 12px',border:'none',background:'transparent',fontFamily:F,fontSize:12.5,fontWeight:600,color:'var(--tx)',outline:'none',textAlign:'left'}}/>
</div>
{profileErr.phone&&<div style={{fontSize:9.5,color:'rgba(192,57,43,.85)',marginTop:3}}>{profileErr.phone}</div>}
</div>
<div><div style={lblS}>{T2('البريد الإلكتروني','Email')}</div>
<input value={profileData.email||''} onChange={e=>setProfileData(p=>({...p,email:e.target.value}))} style={{...inpEdit,direction:'ltr',border:profileErr.email?'1px solid rgba(192,57,43,.5)':emailChanged?'1px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.05)'}}/>
{profileErr.email?<div style={{fontSize:9.5,color:'rgba(192,57,43,.85)',marginTop:3}}>{profileErr.email}</div>:emailChanged?<div style={{fontSize:9.5,color:C.gold,marginTop:3,display:'flex',alignItems:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{T2('سيُطلب تأكيدك قبل الحفظ','Confirmation required')}</div>:null}
</div>
</div>
<div><div style={lblS}>{T2('اللغة الافتراضية','Default Language')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
<button type="button" onClick={()=>{setLang('ar');sb.from('users').update({preferred_lang:'ar'}).eq('id',user.id)}} style={{height:38,borderRadius:8,border:lang==='ar'?'1px solid rgba(212,160,23,.5)':'1px solid rgba(255,255,255,.06)',background:lang==='ar'?'rgba(212,160,23,.12)':'rgba(255,255,255,.03)',display:'flex',direction:'ltr',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',transition:'.18s',fontFamily:F}}>
<img src="https://flagcdn.com/w160/sa.png" width="24" height="16" style={{borderRadius:2,objectFit:'cover',display:'block'}} alt=""/>
<span style={{fontSize:11.5,fontWeight:lang==='ar'?700:600,color:lang==='ar'?C.gold:'rgba(255,255,255,.55)'}}>العربية</span>
</button>
<button type="button" onClick={()=>{setLang('en');sb.from('users').update({preferred_lang:'en'}).eq('id',user.id)}} style={{height:38,borderRadius:8,border:lang==='en'?'1px solid rgba(212,160,23,.5)':'1px solid rgba(255,255,255,.06)',background:lang==='en'?'rgba(212,160,23,.12)':'rgba(255,255,255,.03)',display:'flex',direction:'ltr',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',transition:'.18s',fontFamily:F}}>
<span style={{fontSize:11.5,fontWeight:lang==='en'?700:600,color:lang==='en'?C.gold:'rgba(255,255,255,.55)'}}>English</span>
<img src="https://flagcdn.com/w160/us.png" width="24" height="16" style={{borderRadius:2,objectFit:'cover',display:'block'}} alt=""/>
</button>
</div>
</div>
</div>
</div>
{/* Footer */}
<div style={{padding:'4px 18px 12px',display:'flex',justifyContent:ar?'flex-end':'flex-start',flexShrink:0}}>
<button disabled={profileBusy} onClick={onSave} className="pf-save-btn">
<span>{profileBusy?T2('جارٍ الحفظ...','Saving...'):T2('حفظ التعديلات','Save Changes')}</span>
<span className="pf-nav-ico"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg></span>
</button>
</div>

{/* Email confirmation overlay (in-modal) */}
{emailConfirmStep&&<div onClick={()=>setEmailConfirmStep(false)} style={{position:'absolute',inset:0,background:'rgba(10,10,10,.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10,padding:20,borderRadius:18}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--modal-bg)',borderRadius:14,width:'min(420px,100%)',padding:'22px 22px 18px',border:'1px solid rgba(212,160,23,.25)',boxShadow:'0 16px 40px rgba(0,0,0,.6)'}}>
<div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:14}}>
<div style={{width:44,height:44,borderRadius:12,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
</div>
<div style={{flex:1}}>
<div style={{fontSize:14,fontWeight:800,color:'rgba(255,255,255,.92)',marginBottom:4}}>{T2('تأكيد تغيير البريد الإلكتروني','Confirm Email Change')}</div>
<div style={{fontSize:11,color:'rgba(255,255,255,.55)',lineHeight:1.6}}>{T2('سيتم إرسال رابط تأكيد إلى البريد الجديد. يجب فتح الرابط لإكمال التغيير.','A confirmation link will be sent to the new email. You must open the link to complete the change.')}</div>
</div>
</div>
<div style={{background:'rgba(0,0,0,.2)',borderRadius:9,padding:'10px 12px',marginBottom:16,border:'1px solid rgba(255,255,255,.05)'}}>
<div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:11,marginBottom:6}}><span style={{color:'rgba(255,255,255,.4)'}}>{T2('من','From')}</span><span style={{color:'rgba(255,255,255,.7)',fontWeight:600,direction:'ltr'}}>{profileData._origEmail}</span></div>
<div style={{height:1,background:'rgba(212,160,23,.15)',margin:'4px 0'}}/>
<div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:11}}><span style={{color:'rgba(255,255,255,.4)'}}>{T2('إلى','To')}</span><span style={{color:C.gold,fontWeight:700,direction:'ltr'}}>{profileData.email}</span></div>
</div>
<div style={{display:'flex',gap:8,flexDirection:ar?'row-reverse':'row'}}>
<button disabled={profileBusy} onClick={doSave} style={{flex:1,height:40,borderRadius:10,border:'none',background:C.gold,color:'#171717',fontFamily:F,fontSize:12,fontWeight:800,cursor:'pointer',opacity:profileBusy?.7:1}}>{profileBusy?T2('جارٍ الإرسال...','Sending...'):T2('تأكيد وإرسال الرابط','Confirm & Send Link')}</button>
<button onClick={()=>setEmailConfirmStep(false)} style={{height:40,padding:'0 18px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',color:'rgba(255,255,255,.6)',fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>{T2('تراجع','Back')}</button>
</div>
</div>
</div>}
</div>
</div>})()}
<Css/>
{/* ═══ MOBILE BOTTOM NAV ═══ */}
<nav className='mob-bottom-nav'>{[
{id:'home',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 01-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 013 21V10.5z" fill={pg==='home'?C.gold+'30':'none'} stroke={pg==='home'?C.gold:'rgba(255,255,255,.35)'} strokeWidth="1.5" strokeLinejoin="round"/></svg>,l:T('الرئيسية','Home')},
{id:'facilities',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="14" rx="2" fill={pg==='facilities'?C.gold+'30':'none'} stroke={pg==='facilities'?C.gold:'rgba(255,255,255,.35)'} strokeWidth="1.5"/><path d="M7 8V4a2 2 0 012-2h6a2 2 0 012 2v4" stroke={pg==='facilities'?C.gold:'rgba(255,255,255,.35)'} strokeWidth="1.5" opacity=".6"/></svg>,l:T('المنشآت','Facilities')},
{id:'invoices',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" fill={pg==='invoices'?C.gold+'30':'none'} stroke={pg==='invoices'?C.gold:'rgba(255,255,255,.35)'} strokeWidth="1.5"/><path d="M8 7h8M8 11h6M8 15h4" stroke={pg==='invoices'?C.gold:'rgba(255,255,255,.35)'} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/></svg>,l:T('الفواتير','Invoices')},
{id:'workers',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill={pg==='workers'?C.gold+'30':'none'} stroke={pg==='workers'?C.gold:'rgba(255,255,255,.35)'} strokeWidth="1.5"/><path d="M4 21v-1a6 6 0 0116 0v1" stroke={pg==='workers'?C.gold:'rgba(255,255,255,.35)'} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/></svg>,l:T('العمّال','Workers')},
{id:'_more',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="2" fill={sideOpen?C.gold:'rgba(255,255,255,.35)'}/><circle cx="12" cy="12" r="2" fill={sideOpen?C.gold:'rgba(255,255,255,.35)'}/><circle cx="19" cy="12" r="2" fill={sideOpen?C.gold:'rgba(255,255,255,.35)'}/></svg>,l:T('المزيد','More')}
].map(n=><div key={n.id} onClick={()=>{n.id==='_more'?setSideOpen(!sideOpen):setPage(n.id)}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'6px 0',cursor:'pointer',position:'relative'}}>
{pg===n.id&&n.id!=='_more'&&<div style={{position:'absolute',top:0,width:20,height:3,borderRadius:'0 0 3px 3px',background:C.gold,transition:'all .2s ease'}}/>}
{n.icon}<span style={{fontSize:10,fontWeight:pg===n.id?700:500,color:pg===n.id?C.gold:sideOpen&&n.id==='_more'?C.gold:'rgba(255,255,255,.4)',transition:'color .15s ease'}}>{n.l}</span>
</div>)}</nav>
{/* ═══ INSTALL BANNER ═══ */}
{showInstallBanner&&!isStandalone&&<div className='install-banner' style={{position:'fixed',bottom:'calc(70px + var(--safe-b, 0px))',left:12,right:12,zIndex:197,background:'linear-gradient(135deg,#1a1a1a,#252525)',border:'1px solid rgba(212,160,23,.25)',borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,boxShadow:'0 8px 32px rgba(0,0,0,.5)',fontFamily:"'Cairo',sans-serif"}}>
<div style={{width:44,height:44,borderRadius:12,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12l7 7 7-7" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
</div>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.9)'}}>{T('ثبّت التطبيق','Install App')}</div>
<div style={{fontSize:10,color:'rgba(255,255,255,.45)',marginTop:2}}>{T('أضف جسر لشاشتك الرئيسية','Add Jisr to your home screen')}</div>
</div>
<button onClick={handleInstall} style={{height:34,padding:'0 16px',borderRadius:10,background:C.gold,border:'none',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,color:'#141414',cursor:'pointer',flexShrink:0}}>{T('تثبيت','Install')}</button>
<button onClick={()=>{setShowInstallBanner(false);localStorage.setItem('jisr_install_dismissed','1')}} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:14}}>×</button>
</div>}
</div>)}


function HomePage(){
return<div style={{flex:1}}/>
}


function CrudPage({sb,user,conf,toast,onRefresh,lang}){
const{table,title,cols,flds,filter,stats:statFields}=conf;const T=(ar,en)=>lang==='ar'?ar:en;const TL=ar=>lang==='ar'?ar:(TR[ar]||ar)
const[data,setData]=useState([]);const[loading,setLoading]=useState(true);const[q,setQ]=useState('')
const[pop,setPop]=useState(null);const[form,setForm]=useState({});const[saving,setSaving]=useState(false)
const[viewRow,setViewRow]=useState(null)
const load=useCallback(async()=>{setLoading(true);let qr=sb.from(table).select('*').is('deleted_at',null);if(filter)qr=qr.eq(filter.k,filter.v);const{data:d}=await qr.order('created_at',{ascending:false}).limit(500);setData(d||[]);setLoading(false)},[sb,table,filter?.k,filter?.v])
useEffect(()=>{load()},[load])
const openAdd=()=>{const init={};flds.forEach(f=>init[f.k]='');if(filter)init[filter.k]=filter.v;setForm(init);setPop('add')}
const openEdit=row=>{const init={};flds.forEach(f=>init[f.k]=row[f.k]??'');init._id=row.id;setForm(init);setPop('edit')}
const save=async()=>{for(const f of flds){if(f.r&&!form[f.k]){toast(TL(f.l)+T(' مطلوب',' is required'));return}}setSaving(true);try{const p={...form};delete p._id;Object.keys(p).forEach(k=>{if(p[k]==='')p[k]=null});if(pop==='add'){p.created_by=user?.id;const{error}=await sb.from(table).insert(p);if(error)throw error;toast(T('تمت الإضافة','Added successfully'))}else{p.updated_by=user?.id;const{error}=await sb.from(table).update(p).eq('id',form._id);if(error)throw error;toast(T('تم التعديل','Updated successfully'))}setPop(null);load();onRefresh?.()}catch(e){toast((lang==='ar'?'خطأ: ':'Error: ')+((e.message||'').slice(0,80)))}setSaving(false)}
const del=async id=>{if(!confirm(T('حذف؟','Delete?')))return;const{error}=await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id);if(error)toast(T('خطأ','Error'));else{toast(T('تم الحذف','Deleted successfully'));load();onRefresh?.()}}
const filtered=data.filter(r=>!q||cols.some(([c])=>String(r[c]??'').toLowerCase().includes(q.toLowerCase())))
const nm=v=>Number(v||0).toLocaleString('en-US')
const sMap={active:C.ok,paid:C.ok,completed:C.ok,issue:C.red,cancelled:C.red,suspended:'#e67e22',draft:'#999',pending:C.gold,in_progress:C.blue,partial:C.gold,unpaid:C.red,red:C.red,yellow:'#e67e22',green_low:C.ok,green_mid:C.ok,green_high:C.ok,platinum:C.gold,urgent:C.red,high:'#e67e22',normal:C.blue,low:'#999',male:'#3483b4',female:'#9b59b6',absconded:C.red,final_exit:'#999',transferred:'#e67e22'}
const B=({v})=>{const cl=sMap[v]||'#999';return<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:cl+'15',color:cl,display:'inline-flex',alignItems:'center',gap:3}}><span style={{width:4,height:4,borderRadius:'50%',background:cl}}/>{v||'—'}</span>}
const fS={width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)'}

/* ═══ Stats Cards ═══ */
const statCards=useMemo(()=>{if(!data.length)return[];const cards=[];
// Status field stats
const statusCol=cols.find(([c])=>c.includes('status')||c==='nitaqat_color');
if(statusCol){const counts={};data.forEach(r=>{const v=r[statusCol[0]]||'unknown';counts[v]=(counts[v]||0)+1});
Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>cards.push({label:k,value:v,color:sMap[k]||'#999'}))}
// Amount stats
const amtCol=cols.find(([c])=>c.includes('amount'));
if(amtCol){const total=data.reduce((s,r)=>s+(Number(r[amtCol[0]])||0),0);cards.unshift({label:T('الإجمالي','Total'),value:nm(total)+' '+T('ر.س','SAR'),color:C.gold})}
// Total count always first
cards.unshift({label:T('الإجمالي','Total'),value:data.length,color:'#fff'})
return cards.slice(0,6)},[data,cols])

return<div style={{fontFamily:F,paddingTop:0}}>
{/* ═══ Page header (Kafala-style) ═══ */}
<div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:24,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px',lineHeight:1.2}}>{title}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>{data.length} {T('سجل','records')}</div>
</div>
<button onClick={openAdd} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
{T('إضافة','Add')}
</button>
</div>

{/* ═══ Stat cards row (Kafala glass card with embedded pills) ═══ */}
{statCards.length>1&&<div style={{background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:'10px 12px',marginBottom:14,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(statCards.length,6)},1fr)`,gap:8}}>
{statCards.map((c,i)=>{const isWhite=c.color==='#fff';const cl=isWhite?'rgba(255,255,255,.9)':c.color;return<div key={i} style={{padding:'7px 12px',borderRadius:10,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
<span style={{width:6,height:6,borderRadius:'50%',background:cl,boxShadow:'0 0 5px '+cl,flexShrink:0}}/>
<div style={{fontSize:18,fontWeight:700,color:cl,letterSpacing:'-.3px',direction:'ltr',lineHeight:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.value}</div>
</div>
<div style={{fontSize:11,color:'var(--tx2)',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.label}</div>
</div>})}
</div>
</div>}

{/* ═══ Search input (Kafala-style) ═══ */}
<div style={{position:'relative',marginBottom:14}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.4)'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={T('بحث في ','Search in ')+title+' ...'} style={{width:'100%',height:40,padding:'0 14px 0 36px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,fontFamily:F,fontSize:14,fontWeight:400,color:'var(--tx)',outline:'none',direction:lang==='ar'?'rtl':'ltr',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}/>
</div>

{/* ═══ Table (wrapped in glass card) ═══ */}
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)',fontSize:13}}>{T('جاري التحميل...','Loading...')}</div>:
<div style={{background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontFamily:F,fontSize:12}}>
<thead><tr style={{background:'rgba(0,0,0,.18)',borderBottom:'1px solid rgba(255,255,255,.06)'}}>
{cols.map(([,l],i)=><th key={i} style={{padding:'12px 14px',textAlign:lang==='ar'?'right':'left',fontWeight:600,color:'var(--tx3)',fontSize:11,letterSpacing:'.3px'}}>{TL(l)}</th>)}
<th style={{padding:'12px',textAlign:'center',width:100,fontSize:11,fontWeight:600,color:'var(--tx3)',letterSpacing:'.3px'}}>{T('إجراءات','Actions')}</th></tr></thead>
<tbody>{filtered.length===0?<tr><td colSpan={cols.length+1} style={{textAlign:'center',padding:60,color:'var(--tx6)',fontSize:13,fontWeight:500}}>{T('لا توجد بيانات','No data found')}</td></tr>:
filtered.map(r=><tr key={r.id} onClick={()=>setViewRow(r)} style={{borderBottom:'1px solid rgba(255,255,255,.04)',cursor:'pointer',transition:'.18s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(212,160,23,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
{cols.map(([c],j)=><td key={j} style={{padding:'12px 14px',fontSize:12,fontWeight:500,color:'var(--tx2)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.includes('amount')||c.includes('salary')||c.includes('capital')?nm(r[c]):c.includes('status')||c==='nitaqat_color'||c==='priority'||c==='gender'?<B v={r[c]}/>:c==='is_active'||c==='is_system'?(r[c]?T('نعم','Yes'):T('لا','No')):String(r[c]??'—')}</td>)}
<td style={{padding:'8px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>openEdit(r)} style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.08)',color:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 2px',transition:'.15s'}}><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#D4A017' strokeWidth='1.8'><path d='M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z'/></svg></button>
<button onClick={()=>del(r.id)} style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(192,57,43,.18)',background:'rgba(192,57,43,.06)',color:C.red,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 2px',transition:'.15s'}}><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#c0392b' strokeWidth='1.8'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2'/></svg></button>
</td></tr>)}</tbody></table></div>}

{/* ═══ View Row Modal ═══ */}
{viewRow&&<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(700px,94vw)',maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(212,160,23,.12)'}}>
<div style={{background:'var(--bg)',padding:'14px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(212,160,23,.12)'}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:'rgba(212,160,23,.1)',border:'1px solid rgba(212,160,23,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:C.gold}}>{(viewRow.name_ar||viewRow.worker_number||viewRow.client_number||viewRow.transaction_number||'#')?.[0]}</div>
<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{viewRow.name_ar||viewRow.transaction_number||viewRow.invoice_number||viewRow.expense_number||title}</div>
{viewRow.name_en&&<div style={{fontSize:10,color:'var(--tx4)',direction:'ltr'}}>{viewRow.name_en}</div>}</div>
</div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setViewRow(null);openEdit(viewRow)}} style={{height:30,padding:'0 14px',borderRadius:8,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.08)',color:C.gold,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>{T('تعديل','Edit')}</button>
<button onClick={()=>setViewRow(null)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
</div>
<div style={{flex:1,overflowY:'auto',padding:'16px 22px'}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1}}>
{flds.filter(f=>viewRow[f.k]!=null&&viewRow[f.k]!=='').map(f=><div key={f.k} style={{padding:'10px 14px',background:'rgba(255,255,255,.02)',borderBottom:'1px solid var(--bd2)',gridColumn:f.w?'1/-1':undefined}}>
<div style={{fontSize:9,fontWeight:600,color:'var(--tx5)',marginBottom:3,textTransform:'uppercase',letterSpacing:.5}}>{TL(f.l)}</div>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{
f.o&&(viewRow[f.k]==='true'||viewRow[f.k]===true)?T('نعم','Yes'):
f.o&&(viewRow[f.k]==='false'||viewRow[f.k]===false)?T('لا','No'):
sMap[viewRow[f.k]]?<B v={viewRow[f.k]}/>:
(f.k.includes('amount')||f.k.includes('salary')||f.k.includes('capital'))?nm(viewRow[f.k])+' '+T('ر.س','SAR'):
String(viewRow[f.k])
}</div>
</div>)}
</div>
</div>
</div>
</div>}

{/* ═══ Add/Edit Modal ═══ */}
{pop&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(660px,94vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid rgba(212,160,23,.12)'}}>
<div style={{background:'var(--bg)',padding:'14px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{color:'var(--tx)',fontSize:14,fontWeight:700}}>{pop==='add'?T('إضافة — ','Add — '):T('تعديل — ','Edit — ')}{title}</div>
<button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{flds.map(f=><div key={f.k} style={{gridColumn:f.w?'1/-1':undefined}}>
<div style={{fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{TL(f.l)}{f.r&&<span style={{color:C.red}}> *</span>}</div>
{f.o?<select value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...fS,textAlign:lang==='ar'?'right':'left'}}><option value="">{T('— اختر —','— Select —')}</option>{f.o.map(o=><option key={o} value={o}>{o}</option>)}</select>
:f.t==='date'?<input type="date" value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...fS,direction:'ltr'}}/>
:f.w?<textarea value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical',textAlign:lang==='ar'?'right':'left'}}/>
:<input value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...fS,direction:f.d?'ltr':'rtl',textAlign:f.d?'left':(lang==='ar'?'right':'left')}}/>}
</div>)}
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.07)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={save} disabled={saving} style={{height:42,minWidth:140,padding:'0 22px',borderRadius:10,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.12)',color:C.gold,fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving?.7:1}}>{saving?T('جاري الحفظ...','Saving...'):pop==='add'?T('إضافة','Add'):T('حفظ','Save')}</button>
<button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}


function TransferCalcPage({sb,toast,user,lang,onNewCalc}){
const T=(a,e)=>lang==='ar'?a:e;const nm=v=>Number(v||0).toLocaleString('en-US')
const isGM=!user?.roles||user?.roles?.name_ar==='المدير العام'||user?.roles?.name_en==='General Manager'
const[data,setData]=useState([]);const[workers,setWorkers]=useState([]);const[facilities,setFacilities]=useState([]);const[branches,setBranches]=useState([]);const[nationalities,setNationalities]=useState([])
const[pop,setPop]=useState(false);const[form,setForm]=useState({});const[saving,setSaving]=useState(false);const[viewRow,setViewRow]=useState(null);const[detailsRow,setDetailsRow]=useState(null);const[detailsTab,setDetailsTab]=useState('worker');const[wizStep,setWizStep]=useState(0);const[workerMode,setWorkerMode]=useState('existing');const[addingExtra,setAddingExtra]=useState(false);const[extraDraft,setExtraDraft]=useState({name:'',amount:''});const[savingExtra,setSavingExtra]=useState(false);const[editingExtraIdx,setEditingExtraIdx]=useState(null);const[editExtraDraft,setEditExtraDraft]=useState({name:'',amount:''})
// Office filter: GM defaults to all (''); non-GM is locked to their own branch.
const[officeFilter,setOfficeFilter]=useState(()=>isGM?'':(user?.branch_id||''))
const[officeDropOpen,setOfficeDropOpen]=useState(false)
const[periodOffset,setPeriodOffset]=useState(0) // 0=current, -1=previous period, etc.
const[statsPeriod,setStatsPeriod]=useState('daily')
const[listFilter,setListFilter]=useState('all')
const[searchQ,setSearchQ]=useState('')
const[advOpen,setAdvOpen]=useState(false)
const[advFilter,setAdvFilter]=useState({from:'',to:'',service:'',employee:'',officeMin:'',officeMax:''})
// Adapter: shape a transfer_calculation row to look like the legacy worker_transfers row
// the display code consumes. Lets us swap the data source without rewriting the UI.
// `priced_by`/`approved_by`/`created_by` have no DB-level FK to `users`, so we fetch users
// separately and pass a userMap here to attach the related user/person/branch.
const flattenTcUser=(u)=>u?{name_ar:u.person?.name_ar||null,name_en:u.person?.name_en||null,branch:u.branch?{code:u.branch.code||u.branch.branch_code||null}:null,branch_id:u.primary_branch_id||null}:null
const mapTcToLegacy=(t,userMap={})=>{const extras=Array.isArray(t.extras)?t.extras:[];const extrasTotal=extras.reduce((s,e)=>s+Number(e?.amount||0),0);const meta={quote_no:t.quote_no,worker_name:t.worker_name,iqama_number:t.iqama_number,phone:t.phone?'+966'+t.phone:null,iqama_expiry:t.iqama_expiry_gregorian,expected_expiry:t.expected_expiry_date,duration_months:t.duration_months,duration_days:t.duration_days,renewal_months:t.renewal_months,transfer_only:!!t.transfer_only,change_profession:!!t.change_profession,new_occupation:t.new_occupation_name_ar,prof_change_fee:Number(t.prof_change_fee||0),office_fee:Number(t.office_fee||0),transfer_fee:Number(t.transfer_fee||0),absher_discount:Number(t.absher_discount||0),extras,warnings:(t.warnings||[]).map(w=>typeof w==='string'?w:(w?.text||''))};return{id:t.id,status:t.status,created_at:t.created_at,updated_at:t.updated_at,deleted_at:t.deleted_at,priced_at:t.priced_at,priced_by:t.priced_by,approved_at:t.approved_at,approved_by:t.approved_by,created_by:t.created_by,transfer_fee:Number(t.transfer_fee||0),iqama_cost:Number(t.iqama_renewal_fee||0),work_permit_cost:Number(t.work_permit_fee||0),insurance_cost:Number(t.medical_fee||0),other_costs:Number(t.office_fee||0)+Number(t.prof_change_fee||0)+Number(t.late_fine_amount||0)+extrasTotal,other_costs_desc:[t.prof_change_fee>0?'تغيير المهنة':null,'رسوم المكتب',...extras.map(e=>e.name)].filter(Boolean).join(' + '),government_fees:0,total_cost:Number(t.subtotal||0),client_charge:Number(t.total_amount||0),profit:0,transfer_type:t.transfer_only?'transfer_only':'sponsorship',new_employer_name:t.worker_name,workers:null,facilities:null,priced_user:flattenTcUser(userMap[t.priced_by]),approved_user:flattenTcUser(userMap[t.approved_by]),created_user:flattenTcUser(userMap[t.created_by]),notes:JSON.stringify(meta),_meta:meta,_tc:t}}
const TC_SELECT='*'
const USER_SELECT='id,primary_branch_id,person:persons(name_ar,name_en),branch:branches!users_primary_branch_id_fkey(code:branch_code)'
const buildUserMap=(rows)=>Object.fromEntries((rows||[]).map(u=>[u.id,u]))
const refetchTc=async()=>{const[tRes,uRes]=await Promise.all([sb.from('transfer_calculation').select(TC_SELECT).is('deleted_at',null).order('created_at',{ascending:false}),sb.from('users').select(USER_SELECT).is('deleted_at',null)]);const userMap=buildUserMap(uRes.data);setData((tRes.data||[]).map(r=>mapTcToLegacy(r,userMap)))}
useEffect(()=>{Promise.all([sb.from('transfer_calculation').select(TC_SELECT).is('deleted_at',null).order('created_at',{ascending:false}),sb.from('branches').select('id,code:branch_code').is('deleted_at',null).order('branch_code'),sb.from('nationalities').select('id,name_ar,name_en').order('name_ar'),sb.from('users').select(USER_SELECT).is('deleted_at',null)]).then(([t,b,n,u])=>{const userMap=buildUserMap(u?.data);setData((t.data||[]).map(r=>mapTcToLegacy(r,userMap)));setWorkers([]);setFacilities([]);setBranches(b?.data||[]);setNationalities(n?.data||[])})},[sb])
// Fetch field-level audit log when a row is opened — drives per-field source badges and edit history.
const[detailsAudit,setDetailsAudit]=useState({})
// Approval modal: collects required fields + optional discount, then approves atomically.
const[approveForm,setApproveForm]=useState(null)
const[approveSaving,setApproveSaving]=useState(false)
const submitApproval=async()=>{if(!approveForm||approveSaving)return;setApproveSaving(true);try{const{data:{session}}=await sb.auth.getSession();if(!session)throw new Error('انتهت الجلسة');const fields={};['worker_name','phone','dob','nationality_id','gender','work_permit_expiry','has_notice_period','employer_consent','manual_discount','approval_note'].forEach(k=>{if(approveForm[k]!==undefined&&approveForm[k]!==null&&approveForm[k]!=='')fields[k]=approveForm[k]});const res=await fetch(`${sb.supabaseUrl}/functions/v1/update-quotation`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'approve_with_data',id:approveForm._id,fields})});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw new Error(data.detail||data.error||`HTTP ${res.status}`);toast(T('تم تصديق الحسبة','Quote approved'));setApproveForm(null);setDetailsRow(null);await refetchTc()}catch(e){toast((lang==='ar'?'خطأ: ':'Error: ')+(e.message||'').slice(0,80))}setApproveSaving(false)}
useEffect(()=>{if(!detailsRow?.id){setDetailsAudit({});return}sb.from('transfer_calculation_audit').select('*,changed_user:changed_by(name_ar,name_en)').eq('quotation_id',detailsRow.id).order('changed_at',{ascending:true}).then(({data})=>{const map={};(data||[]).forEach(a=>{if(!map[a.field_name])map[a.field_name]=[];map[a.field_name].push(a)});setDetailsAudit(map)})},[sb,detailsRow?.id])
const stClr={draft:'#666',priced:'#eab308',approved:C.blue,invoiced:C.ok,completed:'#1a8a3e',cancelled:C.red,pending:C.gold}
const stLabel={draft:T('مسودة','Draft'),priced:T('مسعّرة','Priced'),approved:T('مصدّقة','Approved'),invoiced:T('مفوترة','Invoiced'),completed:T('مكتملة','Completed'),cancelled:T('ملغاة','Cancelled'),pending:T('معلّقة','Pending')}
const stIcon={draft:'○',priced:'◐',approved:'◑',invoiced:'●',completed:'✓',cancelled:'✕',pending:'◐'}
const stNext={draft:'priced',priced:'approved',approved:'invoiced'}
const stNextLabel={draft:T('تسعير','Price'),priced:T('تصديق','Approve'),approved:T('إصدار فاتورة','Invoice')}
const changeStatus=async(id,newStatus)=>{setSaving(true);try{const{data:{session}}=await sb.auth.getSession();if(!session)throw new Error('انتهت الجلسة');const res=await fetch(`${sb.supabaseUrl}/functions/v1/update-quotation`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'change_status',id,status:newStatus})});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw new Error(data.detail||data.error||`HTTP ${res.status}`);toast(T('تم تغيير الحالة','Status updated'));await refetchTc()}catch(e){toast((lang==='ar'?'خطأ: ':'Error: ')+(e.message||'').slice(0,60))}setSaving(false)}
// Manual create/edit form is deprecated — quotes flow through the Kafala Calculator + Edge Function only.
const save=async()=>{toast(T('استخدم نافذة تسعيرة التنازل لإصدار التسعيرات','Use the Transfer Quote modal to issue quotations'));setPop(false)}
// Auto-calc fees based on transfer count and iqama status
const calcTransferFee=(count)=>count<=1?2000:count===2?4000:6000
const calcIqamaFine=(expired,fineCount)=>!expired?0:fineCount<=1?500:fineCount===2?1000:1000
const calcIqamaRenewal=(months)=>Math.ceil((months||12)/12)*650
const openAdd=()=>{setForm({worker_id:'',facility_id:'',transfer_type:'sponsorship',
// Worker info (new worker)
w_name:'',w_iqama:'',w_iqama_expiry:'',w_iqama_expiry_h:'',w_dob:'',w_nationality:'',w_gender:'male',w_occupation:'',w_phone:'',w_legal_status:'regular',
// Transfer specific
wants_occupation_change:false,new_occupation:'',wp_expiry:'',has_notice_period:false,employer_consent:false,transfer_count:1,iqama_renewal_months:12,iqama_expired:false,iqama_fine_count:1,
// Costs (auto-calculated)
transfer_fee:'2000',iqama_cost:'650',iqama_fine:'0',insurance_cost:'800',work_permit_cost:'1200',occupation_change_cost:'0',office_fee:'500',absher_balance:'0',extra_fee_name:'',extra_fee_amount:'0',
client_charge:'',status:'draft',new_employer_name:'',notes:'',due_date:'',sedd_date:''});setWizStep(0);setWorkerMode('existing');setPop(true)}
const openEdit=r=>{const f={_id:r.id};['worker_id','facility_id','transfer_type','visa_cost','iqama_cost','work_permit_cost','insurance_cost','ticket_cost','gosi_cost','government_fees','other_costs','other_costs_desc','transfer_fee','client_charge','status','new_employer_name','notes','due_date','sedd_date'].forEach(k=>f[k]=r[k]??'');setPop(true);setForm(f);setWizStep(0)}
const totalCost=()=>{let t=0;['transfer_fee','iqama_cost','iqama_fine','insurance_cost','work_permit_cost','occupation_change_cost','office_fee','extra_fee_amount'].forEach(k=>t+=Number(form[k])||0);t-=Number(form.absher_balance)||0;return Math.max(t,0)}
const profit=()=>(Number(form.client_charge)||0)-totalCost()
const printCalc=(r,printLang='ar')=>{
const ar=printLang==='ar'
const rtl=printLang==='ar'||printLang==='ur'
const DICT={
'تسعيرة تنازل':{bn:'স্থানান্তর কোটেশন',ur:'منتقلی کوٹیشن'},
'رقم المرجع':{bn:'রেফারেন্স নম্বর',ur:'حوالہ نمبر'},
'تاريخ التسعيرة':{bn:'মূল্য নির্ধারণের তারিখ',ur:'قیمت کی تاریخ'},
'تاريخ التصديق':{bn:'অনুমোদনের তারিখ',ur:'تصدیق کی تاریخ'},
'تاريخ الإصدار':{bn:'ইস্যুর তারিখ',ur:'اجراء کی تاریخ'},
'المكتب: ':{bn:'অফিস: ',ur:'دفتر: '},
'أشهر':{bn:'মাস',ur:'ماہ'},
'بنود الخدمات والرسوم':{bn:'সেবা ও ফি',ur:'خدمات اور فیسیں'},
'الإجمالي':{bn:'মোট',ur:'کل رقم'},
'ر.س':{bn:'রিয়াল',ur:'ریال'},
'رسوم متضمّنة':{bn:'অন্তর্ভুক্ত',ur:'شامل'},
'بند إضافي':{bn:'অতিরিক্ত',ur:'اضافی'},
'نقل كفالة':{bn:'স্পনসরশিপ ট্রান্সফার',ur:'کفالہ کی منتقلی'},
'تجديد إقامة':{bn:'ইকামা নবায়ন',ur:'اقامہ تجدید'},
'تجديد رخصة العمل':{bn:'ওয়ার্ক পারমিট নবায়ন',ur:'ورک پرمٹ تجدید'},
'تأمين طبي':{bn:'চিকিৎসা বীমা',ur:'طبی بیمہ'},
'تغيير مهنة':{bn:'পেশা পরিবর্তন',ur:'پیشہ کی تبدیلی'},
'رسوم المكتب':{bn:'অফিস ফি',ur:'دفتر فیس'},
'مسعّرة':{bn:'মূল্যায়িত',ur:'قیمت شدہ'},
'مصدّقة':{bn:'অনুমোদিত',ur:'تصدیق شدہ'},
'مفوترة':{bn:'চালান ইস্যু',ur:'چالان ہو گیا'},
'مكتملة':{bn:'সম্পন্ন',ur:'مکمل'},
'ملغاة':{bn:'বাতিল',ur:'منسوخ'},
'مسودة':{bn:'খসড়া',ur:'مسودہ'},
'معلّقة':{bn:'স্থগিত',ur:'معلق'},
}
const T2=(a,e)=>{if(printLang==='ar')return a;if(printLang==='en')return e;const entry=DICT[a];if(entry&&entry[printLang])return entry[printLang];const matchEntry=Object.entries(DICT).find(([k])=>a.startsWith(k));if(matchEntry&&matchEntry[1][printLang])return a.replace(matchEntry[0],matchEntry[1][printLang]);return e||a}
const nm2=v=>Number(v||0).toLocaleString('en-US')
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])
const fmtD=d=>{if(!d)return'—';const dt=new Date(d);if(isNaN(dt))return'—';const y=dt.getFullYear();const mo=String(dt.getMonth()+1).padStart(2,'0');const da=String(dt.getDate()).padStart(2,'0');return `${y}-${mo}-${da}`}
const m=r._meta||(()=>{try{return typeof r.notes==='string'?JSON.parse(r.notes):(r.notes||{})}catch{return {}}})()
const workerName=r.workers?.name_ar||m.worker_name||r.new_employer_name||'—'
const iqamaNo=r.workers?.iqama_number||m.iqama_number||'—'
const pricedBy=r.priced_user?((ar?r.priced_user.name_ar:(r.priced_user.name_en||r.priced_user.name_ar))||null):null
const quoteNo=m.quote_no||('Q-'+String(r.id||'').slice(0,8).toUpperCase())
const relTime=(()=>{if(!r.created_at)return'—';const diffMs=Date.now()-new Date(r.created_at).getTime();const h=Math.floor(diffMs/3600000);if(h<1)return T2('الآن','just now');if(h<24)return h===1?T2('منذ ساعة','1h ago'):T2('منذ '+h+' ساعات',h+'h ago');const d=Math.floor(h/24);return d===1?T2('أمس','yesterday'):T2('منذ '+d+' يوم',d+'d ago')})()
const absher=Number(m.absher_discount||0)
const initialTotal=Number(r.client_charge||0)+absher
// Build service items — same logic as preview modal
const svcItems=[]
if(Number(r.transfer_fee||0)>0)svcItems.push([T2('نقل كفالة','Sponsorship Transfer'),Number(r.transfer_fee)])
if(m.renewal_months&&Number(r.iqama_cost||0)>0)svcItems.push([T2('تجديد إقامة ('+m.renewal_months+' '+T2('أشهر','months')+')','Iqama Renewal ('+m.renewal_months+' mo)'),Number(r.iqama_cost)])
else if(Number(r.iqama_cost||0)>0)svcItems.push([T2('تجديد إقامة','Iqama Renewal'),Number(r.iqama_cost)])
if(Number(r.work_permit_cost||0)>0)svcItems.push([T2('تجديد رخصة العمل','Work Permit Renewal'),Number(r.work_permit_cost)])
if(Number(r.insurance_cost||0)>0)svcItems.push([T2('تأمين طبي','Medical Insurance'),Number(r.insurance_cost)])
const hasBreakdown=(m.prof_change_fee!=null||m.office_fee!=null)
if(hasBreakdown){
if(m.change_profession&&Number(m.prof_change_fee||0)>0)svcItems.push([T2('تغيير مهنة'+(m.new_occupation?' ('+m.new_occupation+')':''),'Profession Change'+(m.new_occupation?' ('+m.new_occupation+')':'')),Number(m.prof_change_fee)])
if(Number(m.office_fee||0)>0)svcItems.push([T2('رسوم المكتب','Office Fee'),Number(m.office_fee)])
}else{
const otherTotal=Number(r.other_costs||0)
if(otherTotal>0){
if(m.change_profession){const profEst=Math.min(2000,otherTotal);const officeFee=otherTotal-profEst
svcItems.push([T2('تغيير مهنة'+(m.new_occupation?' ('+m.new_occupation+')':''),'Profession Change'+(m.new_occupation?' ('+m.new_occupation+')':'')),profEst])
if(officeFee>0)svcItems.push([T2('رسوم المكتب','Office Fee'),officeFee])}
else svcItems.push([T2('رسوم المكتب','Office Fee'),otherTotal])}
}
if(Array.isArray(m.extras))m.extras.forEach(e=>{const amt=parseFloat(e?.amount)||0;if(amt!==0)svcItems.push([e?.name||T2('بند إضافي','Extra Item'),amt])})
// Normalize status colour to 6-digit hex so we can append alpha safely
let sc=stClr[r.status]||'#999999'
if(sc.length===4)sc='#'+sc[1]+sc[1]+sc[2]+sc[2]+sc[3]+sc[3]
const statusTxt=esc(stLabel[r.status]||r.status||'')
const statusTag=r.status==='approved'?'Approved':(r.status==='invoiced'||r.status==='completed')?'Invoiced':'Issued'
const curLbl=T2('ر.س','SAR')
const svcHtml=svcItems.map(([name,amt],i)=>{const n=Number(amt);const isDisc=n<0||String(name).includes('خصم')||/discount/i.test(String(name));return `<div class="svc-row"><div class="svc-left"><span class="svc-badge">${String(i+1).padStart(2,'0')}</span><span class="svc-name${isDisc?' disc':''}">${esc(name)}</span></div><span class="svc-amt${isDisc?' disc':''}" dir="rtl">${n!==0?`<span class="num">${nm2(n)}</span><span class="cur">${curLbl}</span>`:`<span class="inc">${T2('رسوم متضمّنة','Included')}</span>`}</span></div>`}).join('')
const dateLabel=r.status==='priced'?T2('تاريخ التسعيرة','Pricing Date'):(r.status==='approved'||r.status==='invoiced'||r.status==='completed')?T2('تاريخ التصديق','Approval Date'):T2('تاريخ الإصدار','Issue Date')
const dateValue=r.status==='priced'?(r.priced_at||r.created_at):(r.status==='approved'||r.status==='invoiced'||r.status==='completed')?(r.approved_at||r.priced_at||r.created_at):r.created_at
const officeCode=r.priced_user?.branch?.code||r.approved_user?.branch?.code||r.created_user?.branch?.code||''
const stampStatus=stLabel[r.status]||r.status||''
const html=`<!DOCTYPE html><html dir="${rtl?'rtl':'ltr'}" lang="${printLang}"><head><meta charset="utf-8"><title>${T2('تسعيرة تنازل','Transfer Quote')} ${esc(quoteNo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@500;600;700&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
@page{size:A4;margin:0}
html,body{width:210mm;background:#f3ecdd;color:#15130e;font-family:'Cairo','Tajawal',sans-serif}
.page{width:210mm;height:297mm;padding:26mm 24mm;position:relative;background:linear-gradient(180deg,#faf6ec 0%,#f3ecdd 100%);display:flex;flex-direction:column;overflow:hidden}
.dots-top{position:absolute;top:0;left:0;right:0;height:26px;background-image:radial-gradient(circle at 10px 10px,rgba(212,160,23,.32) 1.2px,transparent 1.5px);background-size:20px 20px;opacity:.75;pointer-events:none}
.dots-bot{position:absolute;bottom:0;left:0;right:0;height:26px;background-image:radial-gradient(circle at 10px 10px,rgba(212,160,23,.32) 1.2px,transparent 1.5px);background-size:20px 20px;opacity:.75;pointer-events:none}
.content{position:relative;z-index:2;direction:${rtl?'rtl':'ltr'};flex:1;display:flex;flex-direction:column}
.header{position:relative;min-height:60px;margin-bottom:8px}
.title-center{text-align:center}
.eyebrow{font-size:15px;letter-spacing:4px;color:#D4A017;font-weight:600;font-family:'Playfair Display',serif}
.title{font-size:34px;font-weight:500;color:#15130e;font-family:'Playfair Display','Cairo',serif;margin-top:10px;letter-spacing:-.8px;line-height:1.05}
.corner-left{position:absolute;top:0;left:0;text-align:left}
.corner-right{position:absolute;top:0;right:0;text-align:right}
.mini-label{font-size:10px;color:rgba(0,0,0,.55);font-weight:600;letter-spacing:.5px;margin-bottom:3px}
.mini-val{font-size:12.5px;color:#D4A017;font-family:'JetBrains Mono',monospace;font-weight:700;direction:ltr;letter-spacing:.5px}
.office-line{font-size:10px;color:rgba(0,0,0,.55);font-weight:600;letter-spacing:.8px;margin-top:5px;direction:rtl}
.office-line .code{color:#D4A017;font-family:'JetBrains Mono',monospace;font-weight:700}
.gold-divider{height:1px;background:linear-gradient(90deg,rgba(212,160,23,.5) 0%,transparent 30%,transparent 70%,rgba(212,160,23,.5) 100%);margin:8px 0 16px}
.dashed-divider{border-top:1px dashed rgba(212,160,23,.35);margin:14px 0}
.wk-grid{margin-bottom:10px;display:flex;flex-direction:column;gap:12px}
.wk-row{display:flex;justify-content:space-between;align-items:baseline}
.wk-name{font-size:16px;color:#15130e;font-weight:800;direction:ltr;letter-spacing:.3px}
.wk-mono{font-size:15px;color:#15130e;font-family:'JetBrains Mono',monospace;direction:ltr;font-weight:700;letter-spacing:.3px}
.wk-months{font-size:15px;color:#D4A017;font-family:'JetBrains Mono',monospace;direction:rtl;font-weight:700;letter-spacing:.3px;display:inline-flex;align-items:baseline;gap:5px}
.wk-months .unit{color:#D4A017;font-family:'Cairo',sans-serif;font-size:13.5px;font-weight:700}
.svc-head{font-size:13px;color:#D4A017;font-weight:700;letter-spacing:.5px;margin-bottom:10px}
.svc-head .count{color:rgba(0,0,0,.5);font-weight:600;font-family:'JetBrains Mono',monospace}
.svc-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px dashed rgba(0,0,0,.1)}
.svc-row:last-child{border-bottom:none}
.svc-left{display:flex;align-items:center;gap:12px}
.svc-badge{font-size:11px;padding:2px 7px;border:1px solid rgba(212,160,23,.55);color:#D4A017;font-family:'JetBrains Mono',monospace;font-weight:700;border-radius:3px;letter-spacing:.5px;background:rgba(212,160,23,.05)}
.svc-name{font-size:14px;color:#15130e;font-weight:600}
.svc-amt{font-size:14px;color:#15130e;font-weight:700;letter-spacing:.4px;white-space:nowrap;unicode-bidi:isolate;display:inline-flex;align-items:baseline;gap:5px}
.svc-amt .num{font-family:'JetBrains Mono',monospace}
.svc-amt .cur{color:rgba(0,0,0,.5);font-size:10.5px;font-weight:500;font-family:'Cairo',sans-serif}
.svc-amt.disc .num,.svc-amt.disc .cur{color:#D4A017}
.svc-name.disc{color:#D4A017}
.svc-amt .inc{font-size:11px;font-weight:500;color:rgba(0,0,0,.4);font-family:'Cairo',sans-serif;font-style:italic}
.foot{display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:6px}
.foot .grand{display:inline-flex;flex-direction:column;align-items:${rtl?'flex-end':'flex-start'}}
.foot .gl{font-size:16px;letter-spacing:3px;color:#D4A017;font-weight:700;font-family:'Playfair Display','Cairo',serif;margin-bottom:8px;text-align:left}
.foot .gv{font-size:36px;color:#D4A017;font-weight:700;letter-spacing:.8px;line-height:1;font-family:'JetBrains Mono',monospace;white-space:nowrap;direction:ltr}
.stamp{position:relative;display:inline-block;padding:8px 18px;color:${sc};opacity:.94;font-family:'Cairo',sans-serif;text-align:center;line-height:1;min-width:130px;transform:rotate(-5deg)}
.stamp::before,.stamp::after{content:'';position:absolute;width:14px;height:14px;pointer-events:none}
.stamp::before{top:0;left:0;border-top:2px solid ${sc};border-left:2px solid ${sc}}
.stamp::after{bottom:0;right:0;border-bottom:2px solid ${sc};border-right:2px solid ${sc}}
.stamp-body{position:relative;display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:7px}
.stamp-body::before,.stamp-body::after{content:'';position:absolute;width:14px;height:14px;pointer-events:none}
.stamp-body::before{top:-8px;right:-18px;border-top:2px solid ${sc};border-right:2px solid ${sc}}
.stamp-body::after{bottom:-8px;left:-18px;border-bottom:2px solid ${sc};border-left:2px solid ${sc}}
.stamp-status{font-size:14px;font-weight:900;letter-spacing:2px;line-height:1.2;padding:1px 0}
.stamp-emp{font-size:10px;font-weight:700;letter-spacing:.8px;opacity:.88}
.spacer{flex:1;min-height:4mm}
@media print{html,body{background:#f3ecdd !important}.page{page-break-after:avoid}}
</style></head><body>
<div class="page">
<div class="dots-top"></div>
<div class="dots-bot"></div>
<div class="content">
<div class="header">
<div class="title-center">
<div class="eyebrow">HUSSAIN &middot; OFFICES</div>
<div class="title">${T2('تسعيرة تنازل','Transfer Quote')}</div>
</div>
<div class="corner-left">
<div class="mini-label">${T2('رقم المرجع','Reference No.')}</div>
<div class="mini-val">${esc(quoteNo)}</div>
</div>
<div class="corner-right">
<div class="mini-label">${dateLabel}</div>
<div class="mini-val">${fmtD(dateValue)}</div>
${officeCode?`<div class="office-line">${T2('المكتب: ','Office: ')}<span class="code">${esc(officeCode)}</span></div>`:''}
</div>
</div>
<div class="gold-divider"></div>
<div class="wk-grid">
<div class="wk-row">
<div class="wk-name">${esc(workerName)}</div>
<div class="wk-mono">${fmtD(m.iqama_expiry)}</div>
</div>
<div class="wk-row">
<div class="wk-mono">${esc(iqamaNo)}</div>
<div class="wk-months">${m.renewal_months?`<span>${m.renewal_months}</span><span class="unit">${T2('أشهر','months')}</span>`:'<span>—</span>'}</div>
</div>
</div>
<div class="dashed-divider"></div>
<div>
<div class="svc-head">${T2('بنود الخدمات والرسوم','Services & Fees')} <span class="count">(${svcItems.length})</span></div>
${svcHtml}
</div>
<div class="dashed-divider"></div>
<div class="foot">
<div></div>
<div>
<span class="stamp"><span class="stamp-body"><span class="stamp-status">${esc(stampStatus)}</span>${pricedBy?`<span class="stamp-emp">${esc(pricedBy)}</span>`:''}</span></span>
</div>
<div class="grand">
<div class="gl">${T2('الإجمالي','GRAND TOTAL')}</div>
<div class="gv">${nm2(Number(r.client_charge||0))}</div>
</div>
</div>
<div class="spacer"></div>
</div>
</div>
</body></html>`
const iframe=document.createElement('iframe')
iframe.style.cssText='position:fixed;right:-9999px;bottom:0;width:0;height:0;border:0'
document.body.appendChild(iframe)
const doc=iframe.contentWindow.document
doc.open();doc.write(html);doc.close()
const cleanup=()=>{try{document.body.removeChild(iframe)}catch{}}
setTimeout(()=>{
try{iframe.contentWindow.focus();iframe.contentWindow.onafterprint=()=>setTimeout(cleanup,100);iframe.contentWindow.print()}
catch{cleanup()}
},600)
setTimeout(cleanup,60000)
}
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center',direction:'ltr'}
return<div style={{fontFamily:"'Cairo',sans-serif",paddingTop:0}}>
{!detailsRow&&<>
<div style={{marginBottom:32,position:'relative'}}>
<div style={{fontSize:24,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px',lineHeight:1.2}}>{T('تسعيرات التنازل','Transfer Calculator')}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>{T('حساب تكاليف نقل خدمات العمال وإصدار التسعيرات ومتابعة حالتها','Worker transfer cost calculation, quote issuance and status tracking')}</div>
</div>
{(()=>{
const typeLabel=v=>v==='final_exit'?T('خروج نهائي','Final Exit'):T('نقل كفالة','Sponsorship')
const daysSince=d=>{if(!d)return 0;return Math.floor((Date.now()-new Date(d).getTime())/86400000)}
// Status pipeline stats
const sCounts={draft:data.filter(r=>r.status==='draft').length,priced:data.filter(r=>r.status==='priced').length,approved:data.filter(r=>r.status==='approved').length,invoiced:data.filter(r=>r.status==='invoiced').length,completed:data.filter(r=>r.status==='completed').length,cancelled:data.filter(r=>r.status==='cancelled').length}
// Aggregate statistics (ignore cancelled quotes)
const active=data.filter(r=>r.status!=='cancelled')
const totalRevenue=active.reduce((s,r)=>s+Number(r.client_charge||0),0)
const totalProfit=active.reduce((s,r)=>s+Number(r.profit||0),0)
const pendingApproval=sCounts.priced||0
const invoiceReady=sCounts.approved||0
const thisMonth=data.filter(r=>{if(!r.created_at)return false;const d=new Date(r.created_at);const now=new Date();return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()})
const thisMonthCount=thisMonth.length
// Apply search + advanced filters before status tabs
const metaOf=r=>{let m={};try{if(r.notes)m=typeof r.notes==='string'?JSON.parse(r.notes):r.notes}catch{}return m}
const matches=r=>{
  const meta=metaOf(r)
  // Office scope: non-GM is hard-locked to their own branch; GM may filter by office
  const rowBranch=r.priced_user?.branch_id||r.approved_user?.branch_id||r.created_user?.branch_id||null
  if(!isGM){if(user?.branch_id&&rowBranch&&rowBranch!==user.branch_id)return false}
  else if(officeFilter&&rowBranch!==officeFilter)return false
  if(searchQ){const q=searchQ.toLowerCase().trim()
    const hay=[r.workers?.name_ar,meta.worker_name,r.new_employer_name,r.workers?.iqama_number,meta.iqama_number,meta.quote_no,r.id].filter(Boolean).map(String).map(s=>s.toLowerCase()).join(' ')
    if(!hay.includes(q))return false}
  if(advFilter.from&&r.created_at&&new Date(r.created_at)<new Date(advFilter.from))return false
  if(advFilter.to&&r.created_at&&new Date(r.created_at)>new Date(advFilter.to+'T23:59:59'))return false
  if(advFilter.service){
    const s=advFilter.service
    if(s==='transfer_only'&&!meta.transfer_only)return false
    if(s==='work_permit'&&!(Number(r.work_permit_cost||0)>0))return false
    if(s==='insurance'&&!(Number(r.insurance_cost||0)>0))return false
    if(s==='change_profession'&&!meta.change_profession)return false
    if(s==='renewal'&&!(Number(meta.renewal_months||0)>0))return false
    if(s==='final_exit'&&r.transfer_type!=='final_exit')return false
  }
  if(advFilter.employee){
    const e=advFilter.employee
    const ids=[r.priced_by,r.approved_by,r.created_by].filter(Boolean)
    if(!ids.includes(e))return false
  }
  const ofee=Number(meta.office_fee||0)
  if(advFilter.officeMin&&ofee<Number(advFilter.officeMin))return false
  if(advFilter.officeMax&&ofee>Number(advFilter.officeMax))return false
  return true
}
// Build employee options from anyone who acted on a quote
const employeeOptions=(()=>{const map=new Map()
data.forEach(r=>{
  for(const u of [r.priced_user,r.approved_user,r.created_user]){
    if(u&&!map.has(u.id||(u.name_ar||''))){const id=u.id||u.name_ar;if(id&&!map.has(id))map.set(id,{id,name:lang==='en'?(u.name_en||u.name_ar):u.name_ar})}
  }
})
// Fallback to id-based map (since we don't always have user.id in the joined record, key by name)
const seen=new Map()
data.forEach(r=>{
  ;[['priced_by',r.priced_user],['approved_by',r.approved_user],['created_by',r.created_user]].forEach(([key,u])=>{
    const id=r[key];if(!id||!u)return
    if(!seen.has(id))seen.set(id,{id,name:lang==='en'?(u.name_en||u.name_ar):u.name_ar})
  })
})
return [...seen.values()].sort((a,b)=>(a.name||'').localeCompare(b.name||''))
})()
const searched=data.filter(matches)
const filteredData=listFilter==='all'?searched:searched.filter(r=>r.status===listFilter)
// Group filtered calcs by day (use priced_at/approved_at/created_at depending on status)
const todayStr=new Date().toISOString().slice(0,10)
const tcDayKey=(r)=>{const d=r.status==='priced'?(r.priced_at||r.created_at):(r.status==='approved'||r.status==='invoiced'||r.status==='completed')?(r.approved_at||r.priced_at||r.created_at):r.created_at;return(d||'').slice(0,10)||'بدون تاريخ'}
const tcGroups={}
const tcGroupOrder=[]
filteredData.forEach(r=>{const key=tcDayKey(r);if(!tcGroups[key]){tcGroups[key]=[];tcGroupOrder.push(key)}tcGroups[key].push(r)})
const tcDayNames=[T('الأحد','Sun'),T('الاثنين','Mon'),T('الثلاثاء','Tue'),T('الأربعاء','Wed'),T('الخميس','Thu'),T('الجمعة','Fri'),T('السبت','Sat')]
const tcMonthNames=[T('يناير','Jan'),T('فبراير','Feb'),T('مارس','Mar'),T('أبريل','Apr'),T('مايو','May'),T('يونيو','Jun'),T('يوليو','Jul'),T('أغسطس','Aug'),T('سبتمبر','Sep'),T('أكتوبر','Oct'),T('نوفمبر','Nov'),T('ديسمبر','Dec')]
const tcDayLabel=(k)=>{if(k===todayStr)return T('اليوم','Today');try{const d=new Date(k+'T12:00:00');return tcDayNames[d.getDay()]}catch{return k}}
const tcDayFull=(k)=>{try{const d=new Date(k+'T12:00:00');return d.getDate()+' '+tcMonthNames[d.getMonth()]+' '+d.getFullYear()}catch{return k}}
// ═══ Trend comparisons (this month vs last) ═══
const monthKey=d=>{const x=new Date(d);return x.getFullYear()+'-'+x.getMonth()}
const now=new Date()
const thisMonthKey=now.getFullYear()+'-'+now.getMonth()
const lastMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1)
const lastMonthKey=lastMonthDate.getFullYear()+'-'+lastMonthDate.getMonth()
const lastMonthData=data.filter(r=>r.created_at&&monthKey(r.created_at)===lastMonthKey)
const thisMonthRevenue=thisMonth.reduce((s,r)=>s+Number(r.client_charge||0),0)
const lastMonthRevenue=lastMonthData.reduce((s,r)=>s+Number(r.client_charge||0),0)
const lastMonthCount=lastMonthData.length
const countTrend=lastMonthCount?Math.round(((thisMonthCount-lastMonthCount)/lastMonthCount)*1000)/10:(thisMonthCount?100:0)
const revTrend=lastMonthRevenue?Math.round(((thisMonthRevenue-lastMonthRevenue)/lastMonthRevenue)*1000)/10:(thisMonthRevenue?100:0)
// Last 30-day revenue sparkline buckets
const spark=(()=>{const days=14,pts=new Array(days).fill(0)
  data.forEach(r=>{if(!r.created_at)return;const d=new Date(r.created_at);const age=Math.floor((now-d)/86400000);if(age>=0&&age<days)pts[days-1-age]+=Number(r.client_charge||0)})
  const mx=Math.max(1,...pts)
  const W=72,H=22
  const path=pts.map((v,i)=>(i===0?'M':'L')+((i/(days-1))*W).toFixed(1)+','+(H-(v/mx)*H).toFixed(1)).join(' ')
  return{path,W,H}})()
// Status distribution for pipeline bar
const pipelineSegs=[['priced',sCounts.priced,C.gold],['approved',sCounts.approved,C.blue],['invoiced',sCounts.invoiced,C.ok],['completed',sCounts.completed,'#1a8a3e']]
const pipelineTotal=pipelineSegs.reduce((s,[,n])=>s+n,0)
const pipelineDiv=pipelineTotal||1 // only for flex ratios, never shown
const statIcon={
  wallet:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  shield:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>,
  clock:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  repeat:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  updown:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 17 12 12 7 17"/></svg>,
  funnel:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  trendUp:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
}
const TrendArrow=({up,pct})=><span style={{display:'inline-flex',alignItems:'center',gap:3,color:up?C.ok:C.red,fontWeight:600,fontSize:11}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{transform:up?'none':'rotate(180deg)'}}><polyline points="18 15 12 9 6 15"/></svg>
{Math.abs(pct)}%
</span>
const avgQuote=active.length?totalRevenue/active.length:0
const baseline=13650
const conversionCount=sCounts.approved+sCounts.invoiced+sCounts.completed
const conversionRate=active.length?Math.round((conversionCount/active.length)*100):0
const avgProfit=active.length?totalProfit/active.length:0
const margin=totalRevenue?Math.round((totalProfit/totalRevenue)*100):0
const today=new Date()
const todayCount=data.filter(r=>{if(!r.created_at)return false;const d=new Date(r.created_at);return d.toDateString()===today.toDateString()}).length
const todayTrend=thisMonthCount?Math.round((todayCount/thisMonthCount)*100):0
// Period grouping for the trend chart (respects office filter + period offset)
const periodSeries=(()=>{
const buckets=7
const bucketMs=statsPeriod==='daily'?86400000:statsPeriod==='weekly'?7*86400000:30*86400000
const offsetShift=periodOffset*buckets*bucketMs // negative = past, 0 = current
const result=Array.from({length:buckets},()=>({priced:0,approved:0,invoiced:0,total:0}))
data.filter(r=>{const rb=r.priced_user?.branch_id||r.approved_user?.branch_id||r.created_user?.branch_id||null;if(!isGM&&user?.branch_id&&rb&&rb!==user.branch_id)return false;if(isGM&&officeFilter&&rb!==officeFilter)return false;return true}).forEach(r=>{if(!r.created_at)return;const d=new Date(r.created_at);const age=Math.floor((now-d-offsetShift)/bucketMs);if(age<0||age>=buckets)return;const idx=buckets-1-age;result[idx].total+=1;if(r.status==='priced')result[idx].priced+=1;else if(r.status==='approved')result[idx].approved+=1;else if(r.status==='invoiced'||r.status==='completed')result[idx].invoiced+=1})
return result
})()
// Period label for the prev/next display
const periodLabel=(()=>{
if(periodOffset===0)return statsPeriod==='daily'?T('آخر 7 أيام','Last 7 days'):statsPeriod==='weekly'?T('آخر 7 أسابيع','Last 7 weeks'):T('آخر 7 أشهر','Last 7 months')
const n=Math.abs(periodOffset)
const unit=statsPeriod==='daily'?T('فترة','period'):statsPeriod==='weekly'?T('فترة','period'):T('فترة','period')
return T(`قبل ${n} ${unit}`,`${n} ${unit}${n>1?'s':''} ago`)
})()
// Avg office fee per month of expected iqama duration
const officeStats=(()=>{let totalFee=0,totalMonths=0,count=0
data.forEach(r=>{let m={};try{if(r.notes)m=typeof r.notes==='string'?JSON.parse(r.notes):r.notes}catch{}
const fee=Number(m.office_fee||0)
let months=Number(m.duration_months||0)
const days=Number(m.expected_iqama_days||0)
if(!months&&days>0)months=days/30
if(!months)months=Number(m.renewal_months||0)
if(fee>0&&months>0){totalFee+=fee;totalMonths+=months;count++}})
return{perMonth:totalMonths>0?Math.round(totalFee/totalMonths):0,totalFee:Math.round(totalFee),totalMonths:Math.round(totalMonths),count}})()
// Card surfaces — flat, layered grays so the inner stat boxes feel embedded in the parent card
const glassCard={background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:'10px 12px',position:'relative',overflow:'hidden',transition:'.25s cubic-bezier(.4,0,.2,1)',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}
const innerBox={background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}
return<>
{/* ═══ KPI dashboard cards ═══ */}
<div style={{display:'grid',gridTemplateColumns:'minmax(0,2.6fr) minmax(0,1fr)',gap:14,marginBottom:36}}>
{/* ── Wide card: status counts + period chart ── */}
<div style={glassCard} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
{/* Header: completion progress bar (replaces the section title) + period tabs */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 2fr',gap:8,marginBottom:8,alignItems:'center'}}>
{[{l:T('مسعّرة','Priced'),v:sCounts.priced,c:'#eab308'},{l:T('مصدّقة','Approved'),v:sCounts.approved,c:C.blue},{l:T('مفوترة','Invoiced'),v:sCounts.invoiced+sCounts.completed,c:C.ok}].map(s=>(
<div key={s.l} style={{padding:'7px 12px',borderRadius:10,...innerBox,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{width:6,height:6,borderRadius:'50%',background:s.c,boxShadow:'0 0 5px '+s.c}}/>
<div style={{fontSize:20,fontWeight:700,color:s.c,letterSpacing:'-.3px',direction:'ltr',lineHeight:1}}>{s.v}</div>
</div>
<div style={{fontSize:12,color:'var(--tx2)',fontWeight:600}}>{s.l}</div>
</div>))}
{(()=>{const tot=sCounts.priced+sCounts.approved+sCounts.invoiced+sCounts.completed
const done=sCounts.invoiced+sCounts.completed
const pct=tot>0?Math.round((done/tot)*100):0
return<div style={{minWidth:0,padding:'0 6px',display:'flex',alignItems:'center',gap:10}}>
<span style={{fontSize:12,color:'var(--tx2)',fontWeight:600,whiteSpace:'nowrap'}}>{T('نسبة الفوترة','Invoice rate')}</span>
<div style={{flex:1,height:7,borderRadius:5,background:'rgba(255,255,255,.06)',overflow:'hidden',position:'relative'}}>
<div style={{width:pct+'%',height:'100%',background:`linear-gradient(90deg, ${C.ok}cc, ${C.ok})`,borderRadius:5,transition:'.4s',boxShadow:'0 0 8px '+C.ok+'66'}}/>
</div>
<span style={{fontSize:13,fontWeight:600,color:C.ok,direction:'ltr'}}>{pct}%</span>
</div>})()}
</div>
{/* Smooth area chart with axes + labels */}
{(()=>{const n=periodSeries.length;if(n<2)return null
const W=560,H=88,padL=22,padR=12,padT=12,padB=12
const cw=W-padL-padR,ch=H-padT-padB
const mx=Math.max(1,...periodSeries.flatMap(p=>[p.priced,p.approved,p.invoiced]))
const niceMx=Math.max(2,Math.ceil(mx/2)*2)
const xAt=i=>(padL+(i/(n-1))*cw).toFixed(1)
const yAt=v=>(padT+ch-(v/niceMx)*ch).toFixed(1)
// Cubic-bezier smoothing
const smooth=(pts)=>{if(pts.length<2)return ''
let d='M'+pts[0][0]+','+pts[0][1]
for(let i=0;i<pts.length-1;i++){const[x0,y0]=pts[Math.max(0,i-1)],[x1,y1]=pts[i],[x2,y2]=pts[i+1],[x3,y3]=pts[Math.min(pts.length-1,i+2)]
const t=.22
const c1x=x1+(x2-x0)*t,c1y=y1+(y2-y0)*t
const c2x=x2-(x3-x1)*t,c2y=y2-(y3-y1)*t
d+=' C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+x2+','+y2}
return d}
const ptsOf=(k)=>periodSeries.map((p,i)=>[Number(xAt(i)),Number(yAt(p[k]))])
const lineP=(k)=>smooth(ptsOf(k))
const areaP=(k)=>{const p=ptsOf(k);if(p.length<2)return '';return smooth(p)+' L'+p[p.length-1][0]+','+(padT+ch)+' L'+p[0][0]+','+(padT+ch)+' Z'}
const yTicks=[0,niceMx/2,niceMx]
return<div style={{padding:'6px 10px'}}>
<svg width="100%" viewBox={`0 0 ${W} ${H-padB+14}`} preserveAspectRatio="none" style={{display:'block',height:90}}>
<defs>
<linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#eab308" stopOpacity=".4"/><stop offset="100%" stopColor="#eab308" stopOpacity="0"/></linearGradient>
<linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.blue} stopOpacity=".35"/><stop offset="100%" stopColor={C.blue} stopOpacity="0"/></linearGradient>
<linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.ok} stopOpacity=".35"/><stop offset="100%" stopColor={C.ok} stopOpacity="0"/></linearGradient>
</defs>
{/* Y grid + labels */}
{yTicks.map((t,i)=><g key={i}>
<line x1={padL} x2={W-padR} y1={yAt(t)} y2={yAt(t)} stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
<text x={padL-6} y={Number(yAt(t))+3} fontSize="9" fill="rgba(255,255,255,.3)" textAnchor="end" fontFamily="'Cairo',sans-serif">{t}</text>
</g>)}
{/* Areas + lines */}
<path d={areaP('priced')} fill="url(#ga)"/><path d={lineP('priced')} fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
<path d={areaP('approved')} fill="url(#gb)"/><path d={lineP('approved')} fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
<path d={areaP('invoiced')} fill="url(#gc)"/><path d={lineP('invoiced')} fill="none" stroke={C.ok} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
{/* End markers (last point of each line) */}
{['priced','approved','invoiced'].map((k)=>{const c=k==='priced'?'#eab308':k==='approved'?C.blue:C.ok;const last=ptsOf(k)[n-1];return<circle key={k} cx={last[0]} cy={last[1]} r="4" fill="#1a1a1a" stroke={c} strokeWidth="2"/>})}
</svg>
</div>
})()}
</div>

{/* ── Narrow card: avg office fee per iqama month ── */}
<div style={{...glassCard,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
{/* Title centered above the amount */}
<span style={{fontSize:13,fontWeight:600,color:'var(--tx2)',letterSpacing:'.1px'}}>{T('متوسط رسوم المكتب','Avg office fee')}</span>
{/* Hero amount */}
<div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:2}}>
<span style={{fontSize:48,fontWeight:700,color:C.gold,letterSpacing:'-1.2px',lineHeight:1,textShadow:`0 0 22px ${C.gold}33`,direction:'ltr'}}>{nm(officeStats.perMonth)}</span>
<span style={{fontSize:14,fontWeight:600,color:C.gold,opacity:.75}}>{T('ريال','SAR')}</span>
</div>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx4)',letterSpacing:'.3px'}}>{T('متوسط شهري','Monthly average')}</div>
</div>
</div>

{/* Override the global gold-focus-border for our scoped inputs (higher specificity beats `input:not(:placeholder-shown)...`) */}
<style>{`
input.tc-noring.tc-noring.tc-noring.tc-noring,
input.tc-noring.tc-noring.tc-noring.tc-noring:not(:placeholder-shown),
select.tc-noring.tc-noring.tc-noring.tc-noring,
textarea.tc-noring.tc-noring.tc-noring.tc-noring{
  border-color:transparent!important;
  box-shadow:none!important;
}
select.tc-noring.tc-noring.tc-noring.tc-noring{
  background-color:#141414!important;
  border-color:rgba(255,255,255,.06)!important;
}
input.tc-noring.tc-noring.tc-noring.tc-noring:focus,
select.tc-noring.tc-noring.tc-noring.tc-noring:focus,
textarea.tc-noring.tc-noring.tc-noring.tc-noring:focus{
  border-color:transparent!important;
  box-shadow:none!important;
}
div.tc-noring.tc-noring.tc-noring{border-color:transparent!important}
input.tc-search.tc-search.tc-search.tc-search:focus{border-color:transparent!important;box-shadow:none!important}
input[type="date"].tc-noring.tc-noring.tc-noring.tc-noring::-webkit-calendar-picker-indicator{filter:invert(70%) sepia(60%) saturate(500%) hue-rotate(20deg)}
`}</style>

{/* ═══ Search + Advanced filter ═══ */}
<div style={{display:'flex',alignItems:'center',gap:10,marginTop:0,marginBottom:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:240,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:12,right:'auto',top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.4)'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input className="tc-noring tc-search" value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={T('ابحث باسم العامل أو رقم الإقامة أو رقم التسعيرة...','Search by worker name, iqama, or quote no...')} style={{width:'100%',height:40,padding:'0 14px 0 36px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,fontFamily:"'Cairo',sans-serif",fontSize:14,fontWeight:400,color:'var(--tx)',outline:'none',direction:lang==='en'?'ltr':'rtl',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}/>
</div>
<button onClick={()=>setAdvOpen(o=>!o)} style={{height:40,width:120,padding:'0 14px',borderRadius:11,border:advOpen||Object.values(advFilter).some(Boolean)?'1px solid rgba(212,160,23,.45)':'1px solid rgba(255,255,255,.06)',background:advOpen||Object.values(advFilter).some(Boolean)?'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))':'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:advOpen||Object.values(advFilter).some(Boolean)?C.gold:'rgba(255,255,255,.78)',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,flexShrink:0,boxShadow:advOpen||Object.values(advFilter).some(Boolean)?'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)':'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}>
{T('تصفية','Filter')}
<span style={{width:18,height:18,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{!Object.values(advFilter).some(Boolean)?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>:<span role="button" tabIndex={0} title={T('مسح الفلاتر','Clear filters')} onClick={e=>{e.stopPropagation();setAdvFilter({from:'',to:'',service:'',employee:'',officeMin:'',officeMax:''})}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.stopPropagation();e.preventDefault();setAdvFilter({from:'',to:'',service:'',employee:'',officeMin:'',officeMax:''})}}} onMouseEnter={e=>{e.currentTarget.style.background=C.red;e.currentTarget.style.color='#fff'}} onMouseLeave={e=>{e.currentTarget.style.background=C.gold;e.currentTarget.style.color='#000'}} style={{background:C.gold,color:'#000',width:18,height:18,borderRadius:999,display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'.18s'}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></span>}</span>
</button>
</div>
{advOpen&&(()=>{const fLbl={fontSize:12,fontWeight:500,color:'var(--tx3)',paddingInlineStart:2,marginBottom:7};const fInp={height:42,padding:'0 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.07)',background:'linear-gradient(180deg,#323232 0%,#262626 100%)',color:'var(--tx)',fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:500,outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.18s',width:'100%',boxSizing:'border-box'};return<div style={{marginBottom:14,padding:'16px 18px',background:'var(--modal-bg)',border:'1px solid rgba(255,255,255,.06)',borderRadius:14,boxShadow:'0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
<div><div style={fLbl}>{T('تاريخ من','Date From')}</div><DateField value={advFilter.from} onChange={v=>setAdvFilter(p=>({...p,from:v}))} lang={lang}/></div>
<div><div style={fLbl}>{T('تاريخ إلى','Date To')}</div><DateField value={advFilter.to} onChange={v=>setAdvFilter(p=>({...p,to:v}))} lang={lang}/></div>
<div><div style={fLbl}>{T('الحالة','Status')}</div><Sel value={advFilter.service} onChange={v=>setAdvFilter(p=>({...p,service:v}))} placeholder={T('الكل','All')} options={[{v:'',l:T('الكل','All')},{v:'priced',l:T('مسعّرة','Priced')},{v:'approved',l:T('مصدّقة','Approved')},{v:'invoiced',l:T('مفوترة','Invoiced')},{v:'completed',l:T('مكتملة','Completed')}]} /></div>
<div><div style={fLbl}>{T('اسم الموظف','Employee Name')}</div><input type="text" value={advFilter.employee} onChange={e=>setAdvFilter(p=>({...p,employee:e.target.value}))} placeholder={T('مهدي اليامي','...')} style={{...fInp,textAlign:'center'}} /></div>
<div><div style={fLbl}>{T('رسوم المكتب من','Office Fee Min')}</div><input type="number" inputMode="decimal" value={advFilter.officeMin} onChange={e=>setAdvFilter(p=>({...p,officeMin:e.target.value}))} placeholder="0" style={{...fInp,textAlign:'center',direction:'ltr'}} /></div>
<div><div style={fLbl}>{T('رسوم المكتب إلى','Office Fee Max')}</div><input type="number" inputMode="decimal" value={advFilter.officeMax} onChange={e=>setAdvFilter(p=>({...p,officeMax:e.target.value}))} placeholder="∞" style={{...fInp,textAlign:'center',direction:'ltr'}} /></div>
</div>
</div>})()}
{filteredData.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)'}}>{T('لا توجد حسبات','No calculations')}</div>:
<div>{tcGroupOrder.map(dateKey=>{const items=tcGroups[dateKey];const isToday=dateKey===todayStr;const dayCounts={priced:items.filter(rr=>rr.status==='priced').length,approved:items.filter(rr=>rr.status==='approved').length,invoiced:items.filter(rr=>rr.status==='invoiced'||rr.status==='completed').length};return<div key={dateKey} style={{marginBottom:22}}><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}><div style={{width:10,height:10,borderRadius:'50%',background:isToday?C.gold:'rgba(255,255,255,.18)',border:isToday?'2px solid rgba(212,160,23,.25)':'none',flexShrink:0}}/><div style={{fontSize:13,fontWeight:600,color:isToday?C.gold:'rgba(255,255,255,.65)'}}>{tcDayLabel(dateKey)}</div><div style={{fontSize:11,fontWeight:500,color:'var(--tx5)'}}>{tcDayFull(dateKey)}</div><div style={{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/><div style={{display:'flex',gap:8,fontSize:11,fontWeight:600}}><span style={{color:'var(--tx5)'}}>{items.length} {T('حسبة','calc')}</span>{dayCounts.priced>0&&<span style={{color:'#eab308'}}>{dayCounts.priced} {T('مسعّرة','priced')}</span>}{dayCounts.approved>0&&<span style={{color:C.blue}}>{dayCounts.approved} {T('مصدّقة','approved')}</span>}{dayCounts.invoiced>0&&<span style={{color:C.ok}}>{dayCounts.invoiced} {T('مفوترة','invoiced')}</span>}</div></div><div style={{display:'flex',flexDirection:'column',gap:14}}>{items.map((r,idx)=>{const sc=stClr[r.status]||'#999';const tc=Number(r.total_cost||0);const cc=Number(r.client_charge||0);const pr=cc-tc;const prMargin=cc>0?Math.round((pr/cc)*100):0;const ds=daysSince(r.created_at);const nxt=stNext[r.status]
let meta={};try{if(r.notes)meta=typeof r.notes==='string'?JSON.parse(r.notes):(r.notes||{})}catch(e){}
const workerName=r.workers?.name_ar||meta.worker_name||r.new_employer_name||T('عامل','Worker')
const iqamaNo=r.workers?.iqama_number||meta.iqama_number||'—'
const quoteNo=meta.quote_no||('Q-'+String(r.id).slice(0,8).toUpperCase())
const invoiceNo=r.invoice_id?'INV-'+String(r.invoice_id).slice(0,8).toUpperCase():null
const pricedBy=r.priced_user?(lang==='en'?r.priced_user.name_en||r.priced_user.name_ar:r.priced_user.name_ar)||null:null
const approvedBy=r.approved_user?(lang==='en'?r.approved_user.name_en||r.approved_user.name_ar:r.approved_user.name_ar)||null:null
// Avatar initials from worker name
const initials=(workerName||'').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'—'
// Relative time (hours/days ago)
const relTime=(()=>{if(!r.created_at)return '—';const diffMs=Date.now()-new Date(r.created_at).getTime();const h=Math.floor(diffMs/3600000);if(h<1)return T('الآن','just now');if(h<24)return h===1?T('منذ ساعة','1h ago'):T('منذ '+h+' ساعات',h+'h ago');const d=Math.floor(h/24);return d===1?T('أمس','yesterday'):T('منذ '+d+' يوم',d+'d ago')})()
// Service tags based on notes
const tags=[]
if(r.transfer_type==='final_exit')tags.push(T('خروج نهائي','Final Exit'))
else if(meta.transfer_only)tags.push(T('نقل فقط','Transfer Only'))
else if(meta.renewal_months&&Number(meta.renewal_months)>0)tags.push(T('تجديد '+meta.renewal_months+' شهر','Renew '+meta.renewal_months+'mo'))
if(!meta.transfer_only&&Number(r.work_permit_cost||0)>0)tags.push(T('رخصة عمل','Work Permit'))
if(Number(r.insurance_cost||0)>0)tags.push(T('تأمين طبي','Medical Insurance'))
if(meta.change_profession)tags.push(T('تغيير مهنة','Profession Chg'))
// Warning strip for expired iqama
const warn=(()=>{if(meta.iqama_expiry){const d=new Date(meta.iqama_expiry);if(!isNaN(d)){const diffDays=Math.floor((Date.now()-d.getTime())/86400000);if(diffDays>0)return{text:T('إقامة منتهية منذ '+diffDays+' يوم','Iqama expired '+diffDays+' days ago')+(meta.renewal_months?' · '+T('غرامة 500 ر.س','500 SAR fine'):''),color:C.red}}}return null})()
// Invoice footer when invoiced
const invFoot=r.status==='invoiced'||r.status==='completed'?{text:T('دُفع بالكامل · تحويل بنكي','Paid in full · bank transfer'),color:C.ok}:null
// Validity ribbon — only meaningful while a quote is in priced/approved state and could still go to invoice.
const pricedAtMs=r.priced_at?new Date(r.priced_at).getTime():0
const remainingMs=pricedAtMs?(5*86400000)-(Date.now()-pricedAtMs):0
const showValidity=(r.status==='priced'||r.status==='approved')&&pricedAtMs>0
const isExpired=showValidity&&remainingMs<=0
const remDays=Math.max(0,Math.floor(remainingMs/86400000))
const remHrs=Math.max(0,Math.floor((remainingMs%86400000)/3600000))
return<div key={r.id} onClick={()=>{setDetailsRow({...r,_meta:meta})}} style={{background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',borderRadius:16,overflow:'visible',transition:'.25s cubic-bezier(.4,0,.2,1)',border:'1px solid '+(isExpired?'rgba(192,57,43,.35)':'rgba(255,255,255,.08)'),position:'relative',cursor:'pointer',padding:'18px 22px',display:'grid',gridTemplateColumns:'1fr auto auto',gap:22,alignItems:'center',opacity:isExpired?.7:1,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}
onMouseEnter={e=>{e.currentTarget.style.borderColor=sc+'66';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+sc+'33, inset 0 1px 0 rgba(255,255,255,.08)'}}
onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<button onClick={e=>{e.stopPropagation();setViewRow({...r,_meta:meta})}} title={showValidity?(isExpired?T('انتهت — معاينة الحسبة','Expired — Quote preview'):T(`صالحة ${remDays}ي ${remHrs}س — معاينة الحسبة`,`${remDays}d ${remHrs}h — Quote preview`)):T('معاينة الحسبة','Quote preview')} style={{position:'absolute',top:10,left:10,width:28,height:28,borderRadius:'50%',background:showValidity?'transparent':'rgba(212,160,23,.12)',border:showValidity?'none':'1px solid rgba(212,160,23,.3)',color:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,zIndex:2,transition:'.15s'}} onMouseEnter={e=>{if(!showValidity){e.currentTarget.style.background='rgba(212,160,23,.22)';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}else{e.currentTarget.style.transform='scale(1.08)'}}} onMouseLeave={e=>{if(!showValidity){e.currentTarget.style.background='rgba(212,160,23,.12)';e.currentTarget.style.borderColor='rgba(212,160,23,.3)'}else{e.currentTarget.style.transform='scale(1)'}}}>
{showValidity?(()=>{
const total=5
const active=isExpired?0:Math.min(total,Math.ceil(remainingMs/86400000))
const sw=2.4,size=24,r=(size-sw)/2,cx=size/2,cy=size/2
const gapDeg=22,segDeg=360/total,arcDeg=segDeg-gapDeg
const arc=startDeg=>{const s=(startDeg-90)*Math.PI/180,e=(startDeg+arcDeg-90)*Math.PI/180;const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s),x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e);return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`}
const onClr=isExpired?'rgba(192,57,43,.5)':(active<=1?C.gold:'#27a046')
const offClr='rgba(255,255,255,.12)'
return<svg width={size} height={size} style={{display:'block'}}>
{Array.from({length:total}).map((_,i)=><path key={i} d={arc(i*segDeg)} fill="none" stroke={i<active?onClr:offClr} strokeWidth={sw} strokeLinecap="round"/>)}
<text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fontFamily="'Cairo',sans-serif" fill={onClr}>{active}</text>
</svg>
})():<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
</button>
{(()=>{const CopyBtn=({val})=><button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(val);toast&&toast(T('تم النسخ','Copied'))}} title={T('نسخ','Copy')} style={{width:18,height:18,background:'transparent',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,color:'var(--tx6)',transition:'color .15s',flexShrink:0,opacity:.55}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.opacity=1}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tx6)';e.currentTarget.style.opacity=.55}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
</button>;const absher=Number(meta.absher_discount||0);const durMo=meta.duration_months||0;const durDays=meta.duration_days||0;const durText=durMo>0?durMo+T(' شهر','mo'):(durDays>0?durDays+T(' يوم','d'):'');const fmtD=d=>{if(!d)return'—';const dt=new Date(d);if(isNaN(dt))return'—';const y=dt.getFullYear();const mo=String(dt.getMonth()+1).padStart(2,'0');const da=String(dt.getDate()).padStart(2,'0');return `${da}-${mo}-${y}`};return <>

{(()=>{
const officeCodeLocal=r.priced_user?.branch?.code||r.approved_user?.branch?.code||r.created_user?.branch?.code||null
const expectedDays=Number(meta.expected_iqama_days||0)
const durMonths=Number(meta.duration_months||0)||(expectedDays>0?Math.round(expectedDays/30):0)
const durLabel=durMonths>0?(durMonths+' '+T('شهر','mo')):(expectedDays>0?(expectedDays+' '+T('يوم','d')):null)
return<>

{/* Section 1: Identification + Tags */}
<div style={{minWidth:0,display:'flex',flexDirection:'column',gap:8}}>
{/* Top: Worker name */}
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
<span style={{fontSize:14,fontWeight:600,color:'var(--tx)',direction:'ltr',whiteSpace:'nowrap',letterSpacing:'.15px'}}>{workerName}</span>
<CopyBtn val={workerName}/>
</div>
{/* Meta row: Iqama · Quote/Invoice number */}
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontSize:11,color:'var(--tx5)'}}>
<span style={{display:'inline-flex',alignItems:'center',gap:6}}>
<span style={{fontFamily:"'JetBrains Mono',monospace",direction:'ltr',color:'var(--tx2)',fontWeight:600,fontSize:14,letterSpacing:'.3px'}}>{iqamaNo}</span>
<CopyBtn val={iqamaNo}/>
</span>
<span style={{width:3,height:3,borderRadius:'50%',background:'var(--tx6)',opacity:.5}}/>
<span style={{display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{fontSize:13,color:r.status==='invoiced'||r.status==='completed'?C.ok:C.gold,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",direction:'ltr',letterSpacing:'.4px'}}>{invoiceNo||quoteNo}</span>
<CopyBtn val={invoiceNo||quoteNo}/>
</span>
</div>
{/* Service tags — plain white text, dot separators */}
{tags.length>0&&<div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',fontSize:11,color:'rgba(255,255,255,.8)',fontWeight:500,letterSpacing:'.2px'}}>
{tags.map((tag,i)=><React.Fragment key={i}>{i>0&&<span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.3)'}}/>}<span>{tag}</span></React.Fragment>)}
</div>}
</div>
</>
})()}

{/* Section 2: Official stamps — one per distinct actor/stage */}
{(()=>{
const stamps=[]
// Priced stage
if(r.priced_at&&pricedBy){
stamps.push({key:'p',label:stLabel.priced,name:pricedBy,branch:r.priced_user?.branch?.code,date:r.priced_at,color:stClr.priced,userId:r.priced_by})
}
// Approved stage — only add if different user
const isApprovedLike=r.status==='approved'||r.status==='invoiced'||r.status==='completed'
if(isApprovedLike&&r.approved_at&&approvedBy&&r.approved_by&&r.approved_by!==r.priced_by){
stamps.push({key:'a',label:r.status==='invoiced'||r.status==='completed'?stLabel.invoiced:stLabel.approved,name:approvedBy,branch:r.approved_user?.branch?.code,date:r.approved_at,color:r.status==='invoiced'||r.status==='completed'?stClr.invoiced:stClr.approved,userId:r.approved_by})
}
// If the priced user also approved/invoiced, update their label to reflect the latest status
if(stamps.length===1&&isApprovedLike&&r.approved_at){
stamps[0].label=r.status==='invoiced'||r.status==='completed'?stLabel.invoiced:stLabel.approved
stamps[0].date=r.approved_at||r.priced_at
stamps[0].color=r.status==='invoiced'||r.status==='completed'?stClr.invoiced:stClr.approved
}
// Fallback when no priced action yet — show current status
if(!stamps.length){
const officeCode=r.priced_user?.branch?.code||r.approved_user?.branch?.code||r.created_user?.branch?.code||null
stamps.push({key:'c',label:stLabel[r.status]||r.status,name:pricedBy||approvedBy,branch:officeCode,date:r.priced_at||r.created_at,color:sc})
}
const scale=stamps.length>=2?0.62:0.85
return<div style={{display:'flex',flexDirection:stamps.length>=2?'column':'row',alignItems:'center',justifyContent:'center',flexShrink:0,padding:'0 6px',gap:stamps.length>=2?0:0}}>
{stamps.map(s=><div key={s.key} style={{transform:`scale(${scale})`,transformOrigin:'center',margin:stamps.length>=2?'-10px 0':0}}>
<OfficialStampBadge status={s.label} employeeName={s.name} branchCode={s.branch} date={s.date} color={s.color} rotate={-5} variant="double"/>
</div>)}
</div>
})()}

{/* Section 3: Total + expected iqama duration, separated from the stamp by a single dashed white line */}
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,flexShrink:0,borderInlineStart:'1px dashed rgba(255,255,255,.18)',paddingInlineStart:24,paddingInlineEnd:6,paddingTop:18,minWidth:120}}>
<div style={{lineHeight:1,fontVariantNumeric:'tabular-nums',textAlign:'center'}}><bdi style={{fontSize:28,fontWeight:600,color:C.gold,letterSpacing:'-.5px'}}>{nm(Math.round(Number(cc)||0))}</bdi></div>
{(()=>{
let mo=Number(meta.duration_months||0)
let da=Number(meta.duration_days||0)
const expDays=Number(meta.expected_iqama_days||0)
if(!mo&&!da&&expDays>0){mo=Math.floor(expDays/30);da=expDays%30}
// Fallback: derive from (expected_expiry - iqama_expiry) so we always have something to show
if(!mo&&!da&&meta.iqama_expiry&&meta.expected_expiry){
const a=new Date(meta.iqama_expiry),b=new Date(meta.expected_expiry)
if(!isNaN(a)&&!isNaN(b)&&b>a){const diff=Math.floor((b-a)/86400000);mo=Math.floor(diff/30);da=diff%30}
}
// Final fallback: just show renewal months
if(!mo&&!da&&Number(meta.renewal_months||0)>0)mo=Number(meta.renewal_months)
if(!mo&&!da)return null
const parts=[]
if(mo>0)parts.push(mo+' '+T('شهر','mo'))
if(da>0)parts.push(da+' '+T('يوم','d'))
return<div style={{fontSize:11,color:'#dcc06e',fontWeight:600,letterSpacing:'.2px',whiteSpace:'nowrap',opacity:.85}}>{parts.join(' · ')}</div>
})()}
</div>
</>})()}
</div>})}</div></div>})}</div>}
</>})()}
</>}
{detailsRow&&(()=>{const dr=detailsRow;const mm=dr._meta||(()=>{try{return typeof dr.notes==='string'?JSON.parse(dr.notes):(dr.notes||{})}catch{return{}}})()
const fmt=v=>(v===null||v===undefined||v==='')?'—':v
const fmtD=d=>{if(!d)return'—';const dt=new Date(d);if(isNaN(dt))return'—';return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')}
const yesNo=v=>(v===true||v==='true'||v==='yes')?T('نعم','Yes'):(v===false||v==='false'||v==='no')?T('لا','No'):'—'
const legalMap={regular:T('منتظم','Regular'),expired:T('منتهي','Expired'),runaway:T('هارب','Runaway')}
const typeMap={sponsorship:T('نقل كفالة','Sponsorship'),final_exit:T('خروج نهائي','Final Exit')}
const genderMap={male:T('ذكر','Male'),female:T('أنثى','Female')}
const nmSar=v=>v===null||v===undefined||v===''?'—':nm(v)+' '+T('ر.س','SAR')
const icoUser=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
const icoSwap=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
const icoId=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h3M15 12h3M6 16h12"/></svg>
const icoMoney=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
const icoPlus=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const icoCalc=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M9 14h.01M15 14h.01M9 18h.01M15 18h.01"/></svg>
const icoClock=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const icoNote=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const icoShield=<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
// Source brand colors. Brand spec is مقيم #F47B20 / وزارة العمل #0B6D3D / الضمان الصحي #1E4E84,
// but those greens/navy are too dark to read on dark UI — we lighten them while keeping the same hue family.
const SRC_META={muqeem:{c:'#F47B20',l:T('مقيم','Muqeem')},chi:{c:'#5188C9',l:T('الضمان الصحي','CHI')},hrsd:{c:'#2DB174',l:T('وزارة العمل','HRSD')},employee:{c:'#888',l:T('موظف','Employee')},system:{c:'#666',l:T('نظام','System')}}
const formatAuditValue=(v)=>{if(v===null||v===undefined)return'—';if(typeof v==='boolean')return v?T('نعم','Yes'):T('لا','No');if(typeof v==='object')return JSON.stringify(v).slice(0,40);return String(v).slice(0,40)}
const sec=(title,rows,icon)=>{const filtered=rows.filter(Boolean);if(!filtered.length)return null;return<div style={{background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',borderRadius:16,border:'1px solid rgba(255,255,255,.08)',padding:'18px 22px',position:'relative',marginTop:14,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',color:C.gold,flexShrink:0}}>{React.cloneElement(icon||icoNote,{width:20,height:20,strokeWidth:2})}</span>
<span style={{fontSize:13,fontWeight:600,color:'var(--tx2)',letterSpacing:'-.2px'}}>{title}</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
{filtered.map((row,i)=>{const fieldKey=row[5];const auditEntries=fieldKey?(detailsAudit[fieldKey]||[]):[];const latest=auditEntries[auditEntries.length-1];const srcKey=latest?.source||'employee';const srcMeta=SRC_META[srcKey]||SRC_META.employee;const modified=auditEntries.length>1;const editor=latest?.changed_user;const editorName=editor?(lang==='en'?(editor.name_en||editor.name_ar):editor.name_ar):null;// For employee-sourced fields, show the editor's name on the badge instead of the literal "موظف".
const badgeLabel=srcKey==='employee'&&editorName?editorName:srcMeta.l;const tooltip=auditEntries.length?(modified?T(`عُدّل: ${formatAuditValue(auditEntries[0].new_value)} ← ${formatAuditValue(latest.new_value)}${editorName?`\nبواسطة: ${editorName}`:''}\nالمصدر: ${srcMeta.l}`,`Modified: ${formatAuditValue(auditEntries[0].new_value)} → ${formatAuditValue(latest.new_value)}${editorName?`\nBy: ${editorName}`:''}\nSource: ${srcMeta.l}`):T(`المصدر: ${srcMeta.l}${editorName?`\nبواسطة: ${editorName}`:''}`,`Source: ${srcMeta.l}${editorName?`\nBy: ${editorName}`:''}`)):'';return<div key={i} title={tooltip} style={{background:row[3]||'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:10,padding:'10px 14px',border:'1px solid '+(row[4]||'rgba(255,255,255,.06)'),position:'relative',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:6,marginBottom:6}}>
<div style={{fontSize:11,color:'var(--tx5)',fontWeight:500,letterSpacing:'.2px'}}>{row[0]}</div>
{fieldKey&&auditEntries.length>0&&<span style={{display:'inline-flex',alignItems:'center',gap:3,padding:'1px 6px',borderRadius:4,fontSize:9,fontWeight:600,background:srcMeta.c+'18',color:srcMeta.c,letterSpacing:'.2px',whiteSpace:'nowrap',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>{modified?'✎ ':''}{badgeLabel}</span>}
</div>
<div style={{fontSize:13,color:row[2]||'var(--tx)',fontWeight:600,wordBreak:'break-word'}}>{fmt(row[1])}</div>
{modified&&<div style={{fontSize:9,color:'var(--tx5)',marginTop:3,textDecoration:'line-through',opacity:.6}}>{formatAuditValue(auditEntries[0].new_value)}</div>}
</div>})}
</div>
</div>}
const quoteNo=mm.quote_no||'#'+String(dr.id||'').slice(0,8).toUpperCase()
return<div style={{fontFamily:"'Cairo','Tajawal',sans-serif",paddingTop:0,color:'var(--tx2)'}}>
<div style={{marginBottom:20}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:12}}>
<button onClick={()=>setDetailsRow(null)} title={T('رجوع','Back')} style={{height:40,padding:'0 14px',borderRadius:11,background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',color:'rgba(255,255,255,.78)',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,fontFamily:"'Cairo','Tajawal',sans-serif",fontSize:12,fontWeight:500,transition:'.2s',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,160,23,.45)';e.currentTarget.style.color=C.gold}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.06)';e.currentTarget.style.color='rgba(255,255,255,.78)'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
<span>{T('رجوع','Back')}</span>
</button>
{(()=>{const tc=dr._tc||{};const reqMissing=!tc.nationality_id||!tc.work_permit_expiry;const expired=tc.priced_at?(Date.now()-new Date(tc.priced_at).getTime())>(5*86400000):false;const hasApprovePerm=Array.isArray(user?.perms)&&user.perms.some(p=>p.module==='quotations'&&p.action==='approve');const canApprove=isGM||hasApprovePerm;const showApprove=dr.status==='priced'&&canApprove;const showInvoice=dr.status==='approved';if(showApprove){const blocked=expired||reqMissing;return<button onClick={()=>{if(expired){toast(T('انتهت صلاحية التسعيرة — لا يمكن التصديق','Quote expired — cannot approve'));return}setApproveForm({_id:dr.id,worker_name:tc.worker_name||'',phone:tc.phone||'',dob:tc.dob||'',nationality_id:tc.nationality_id||'',gender:tc.gender||'',work_permit_expiry:tc.work_permit_expiry||'',has_notice_period:tc.has_notice_period,employer_consent:tc.employer_consent,manual_discount:Number(tc.manual_discount||0),_subtotal:Number(tc.subtotal||0),_currentTotal:Number(tc.total_amount||0),_workerName:tc.worker_name,_quoteNo:tc.quote_no})}} disabled={saving||blocked} title={expired?T('انتهت صلاحية التسعيرة','Quote expired'):reqMissing?T('املأ الجنسية وانتهاء رخصة العمل قبل التصديق','Fill nationality and work permit expiry before approving'):T('فتح نافذة التصديق','Open approval form')} style={{height:40,padding:'0 18px',borderRadius:11,border:'none',background:expired?'rgba(192,57,43,.18)':C.blue,color:expired?C.red:'#fff',fontFamily:F,fontSize:12,fontWeight:600,cursor:(saving||blocked)?'not-allowed':'pointer',display:'inline-flex',alignItems:'center',gap:8,opacity:(saving||blocked)?.55:1,transition:'.15s',boxShadow:'0 2px 8px rgba(52,131,180,.28), inset 0 1px 0 rgba(255,255,255,.12)'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
<span>{T('تصديق الحسبة','Approve Quote')}</span>
</button>}if(showInvoice){return<button onClick={async()=>{await changeStatus(dr.id,'invoiced');setDetailsRow(null)}} disabled={saving} style={{height:40,padding:'0 18px',borderRadius:11,border:'none',background:C.ok,color:'#fff',fontFamily:F,fontSize:12,fontWeight:600,cursor:saving?'not-allowed':'pointer',display:'inline-flex',alignItems:'center',gap:8,opacity:saving?.65:1,transition:'.15s',boxShadow:'0 2px 8px rgba(39,160,70,.28), inset 0 1px 0 rgba(255,255,255,.12)'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
<span>{T('إصدار فاتورة','Issue Invoice')}</span>
</button>}return null})()}
</div>
<div style={{display:'grid',gridTemplateColumns:'minmax(240px,1fr) auto minmax(0,1fr)',alignItems:'center',gap:20}}>
<div>
<div style={{fontSize:24,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px'}}>{T('تفاصيل تسعيرة التنازل','Transfer Quote Details')}</div>
<div style={{fontSize:13,color:C.gold,fontWeight:600,marginTop:10,letterSpacing:'.5px',fontFamily:"'JetBrains Mono',monospace"}}>{quoteNo}</div>
</div>
{(()=>{const tc=dr._tc||{};const pricedAt=tc.priced_at?new Date(tc.priced_at).getTime():0;const ageMs=Date.now()-pricedAt;const remainingMs=Math.max(0,(5*86400000)-ageMs);const expired=remainingMs<=0;const remDays=Math.floor(remainingMs/86400000);const remHrs=Math.floor((remainingMs%86400000)/3600000);const progress=expired?0:(remainingMs/(5*86400000));const ringClr=expired?C.red:(remDays<=1?C.gold:'#27a046');const stampClr=stClr[dr.status]||'#999';const stampLabel=stLabel[dr.status]||dr.status||'';return<>
{/* Status stamp — full OfficialStampBadge (branch + date + status + employee) */}
{(()=>{const stampDate=dr.status==='priced'?(tc.priced_at||dr.created_at):(dr.status==='approved'||dr.status==='invoiced'||dr.status==='completed')?(dr.approved_at||tc.priced_at||dr.created_at):dr.created_at;const stampUser=(dr.status==='approved'||dr.status==='invoiced'||dr.status==='completed')?(dr.approved_user?(lang==='en'?(dr.approved_user.name_en||dr.approved_user.name_ar):dr.approved_user.name_ar):null):(dr.priced_user?(lang==='en'?(dr.priced_user.name_en||dr.priced_user.name_ar):dr.priced_user.name_ar):null);const stampBranch=dr.priced_user?.branch?.code||dr.approved_user?.branch?.code||dr.created_user?.branch?.code||'';return<OfficialStampBadge status={stampLabel} employeeName={stampUser||''} branchCode={stampBranch} date={stampDate} color={stampClr} rotate={-5}/>})()}
{/* Day-dots countdown for the 5-day quote validity */}
<div style={{justifySelf:'end'}}>
<div title={expired?T('انتهت الصلاحية','Expired'):T(`متبقي ${remDays} يوم و ${remHrs} ساعة`,`${remDays}d ${remHrs}h left`)} style={{padding:8,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:6,boxSizing:'border-box'}}>
<div style={{display:'flex',gap:4}}>
{[0,1,2,3,4].map(i=><span key={i} style={{width:8,height:8,borderRadius:'50%',background:i<remDays?ringClr:'rgba(255,255,255,.1)',boxShadow:i<remDays?`0 0 4px ${ringClr}aa`:'none',transition:'.3s'}}/>)}
</div>
<div style={{display:'flex',alignItems:'baseline',gap:3,color:ringClr}}>
<span style={{fontSize:18,fontWeight:600,lineHeight:1}}>{expired?'!':remDays}</span>
<span style={{fontSize:8,fontWeight:600,opacity:.75}}>{expired?T('انتهت','exp'):T('يوم','d')}</span>
</div>
</div>
</div>
</>})()}
</div>
</div>
{(()=>{const tc=dr._tc||{};const muqeemOk=!!tc.muqeem_fetched_at;const chiOk=!!tc.chi_verified_at;const hrsdOk=!!tc.hrsd_verified_at;const Pill=({ok,label,clr})=><span style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:10,fontSize:11,fontWeight:600,background:ok?(clr+'14'):'rgba(255,255,255,.04)',border:`1px solid ${ok?clr+'55':'rgba(255,255,255,.08)'}`,color:ok?clr:'var(--tx5)',boxShadow:ok?'inset 0 1px 0 '+clr+'22':'inset 0 1px 0 rgba(255,255,255,.04)'}}>{ok?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}<span>{label}</span></span>;return<div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14,alignItems:'center',direction:'rtl'}}><span style={{fontSize:11,color:'var(--tx3)',fontWeight:500,marginInlineEnd:4}}>{T('مصادر البيانات:','Sources:')}</span><Pill ok={muqeemOk} label={T('مقيم','Muqeem')} clr="#F47B20"/><Pill ok={chiOk} label={T('الضمان الصحي','CHI')} clr="#5188C9"/><Pill ok={hrsdOk} label={T('وزارة العمل','HRSD')} clr="#2DB174"/>
<span style={{flex:1,minWidth:8}}/>
<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--tx3)',fontWeight:500,marginInlineEnd:4}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>{T('طباعة:','Print:')}</span>
{[{k:'ar',l:'عربي',cc:'sa'},{k:'en',l:'English',cc:'gb'},{k:'bn',l:'বাংলা',cc:'bd'},{k:'ur',l:'اُردُو',cc:'pk'}].map(o=>
<button key={o.k} onClick={()=>printCalc(dr,o.k)} title={T('طباعة بـ ','Print in ')+o.l} style={{height:36,padding:'0 12px',borderRadius:10,background:'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))',border:'1px solid rgba(212,160,23,.35)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:600,cursor:'pointer',transition:'.2s',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,boxShadow:'0 2px 8px rgba(212,160,23,.14), inset 0 1px 0 rgba(212,160,23,.18)'}} onMouseEnter={e=>{e.currentTarget.style.background='linear-gradient(180deg,rgba(212,160,23,.28),rgba(212,160,23,.14))';e.currentTarget.style.borderColor=C.gold}} onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))';e.currentTarget.style.borderColor='rgba(212,160,23,.35)'}}>
<img src={`https://flagcdn.com/w40/${o.cc}.png`} alt="" width="18" height="13" style={{display:'block',borderRadius:2,objectFit:'cover',flexShrink:0}}/>
<span>{o.l}</span>
</button>
)}
</div>})()}
<div style={{direction:'rtl'}}>
{(()=>{const tc=dr._tc||{};
let ageStr=null;if(tc.dob){const dob=new Date(tc.dob);const tod=new Date();let y=tod.getFullYear()-dob.getFullYear();let m=tod.getMonth()-dob.getMonth();if(tod.getDate()<dob.getDate())m-=1;if(m<0){y-=1;m+=12};ageStr=y+T(' سنة و ',' yr ')+m+T(' شهر',' mo')}
const iqExp=tc.iqama_expired===true;const iqValid=tc.iqama_expired===false;const iqColor=iqExp?C.red:(iqValid?'#27a046':null)
const insured=tc.insurance_status==='insured'
return<>
{sec(T('هوية العامل','Worker Identity'),[
[T('الإسم','Name'),tc.worker_name||mm.worker_name,null,null,null,'worker_name'],
[T('رقم الإقامة','Iqama Number'),tc.iqama_number||mm.iqama_number,null,null,null,'iqama_number'],
[T('حالة العامل','Worker Status'),tc.hrsd_worker_status,null,null,null,'hrsd_worker_status'],
[T('حالة المقيم','Resident Status'),tc.resident_status_ar,null,null,null,'resident_status_ar'],
[T('المهنة','Occupation'),tc.occupation_name_ar||mm.occupation,null,null,null,'occupation_name_ar'],
[T('عدد مرات نقل الخدمات','Service Transfer Count'),typeof tc.sponsor_changes==='number'?String(tc.sponsor_changes):null,null,null,null,'sponsor_changes'],
tc.change_profession?[T('المهنة الجديدة','New Occupation'),tc.new_occupation_name_ar,null,null,null,'new_occupation_name_ar']:null,
[T('الجنسية','Nationality'),tc.nationality_id?T('محدد','Set'):T('غير محدد','Not set'),tc.nationality_id?'var(--tx)':C.red,null,null,'nationality_id'],
[T('الجنس','Gender'),genderMap[tc.gender]||tc.gender,null,null,null,'gender'],
[T('تاريخ الميلاد','Date of Birth'),tc.dob?fmtD(tc.dob):null,null,null,null,'dob'],
[T('العمر','Age'),ageStr],
[T('رقم الجوال','Mobile'),tc.phone?'+966'+tc.phone:null,null,null,null,'phone'],
[T('انتهاء الإقامة (ميلادي)','Iqama Expiry (Gregorian)'),tc.iqama_expiry_gregorian?fmtD(tc.iqama_expiry_gregorian):null,iqColor,null,null,'iqama_expiry_gregorian'],
[T('انتهاء الإقامة (هجري)','Iqama Expiry (Hijri)'),tc.iqama_expiry_hijri||null,iqColor,null,null,'iqama_expiry_hijri'],
[T('انتهاء رخصة العمل','Work Permit Expiry'),tc.work_permit_expiry?fmtD(tc.work_permit_expiry):T('غير محدد','Not set'),tc.work_permit_expiry?'var(--tx)':C.red,null,null,'work_permit_expiry'],
[T('حالة التأمين','Insurance Status'),insured?T('نشط','Active'):T('غير نشط','Inactive'),insured?'#27a046':C.red,null,null,'insurance_status'],
insured&&tc.insurance_expiry?[T('انتهاء التأمين','Insurance Expiry'),fmtD(tc.insurance_expiry),'#27a046',null,null,'insurance_expiry']:null,
tc.insurance_company?[T('شركة التأمين','Insurance Company'),tc.insurance_company,null,null,null,'insurance_company']:null,
],icoUser)}
{(()=>{const svcTags=[];
if(dr.transfer_type==='final_exit')svcTags.push(T('خروج نهائي','Final Exit'))
else if(mm.transfer_only)svcTags.push(T('نقل كفالة فقط','Transfer Only'))
else svcTags.push(T('نقل كفالة','Sponsorship Transfer'))
if(mm.renewal_months&&Number(mm.renewal_months)>0)svcTags.push(T('تجديد إقامة '+mm.renewal_months+' شهر','Iqama Renewal '+mm.renewal_months+'mo'))
if(!mm.transfer_only&&Number(dr.work_permit_cost||0)>0)svcTags.push(T('تجديد رخصة العمل','Work Permit Renewal'))
if(Number(dr.insurance_cost||0)>0)svcTags.push(T('تأمين طبي','Medical Insurance'))
if(mm.change_profession)svcTags.push(T('تغيير المهنة'+(mm.new_occupation?' ('+mm.new_occupation+')':''),'Profession Change'+(mm.new_occupation?' ('+mm.new_occupation+')':'')))
if(Number(mm.late_fine_amount||0)>0)svcTags.push(T('غرامة تأخير الإقامة','Iqama Late Fine'))
if(Array.isArray(mm.extras))mm.extras.forEach(e=>{if(e?.name&&Number(e?.amount||0)!==0)svcTags.push(e.name)})
if(!svcTags.length)return null
return <div style={{background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',borderRadius:16,border:'1px solid rgba(255,255,255,.08)',padding:'18px 22px',position:'relative',marginTop:14,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',color:C.gold,flexShrink:0}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg></span>
<span style={{fontSize:13,fontWeight:600,color:'var(--tx2)',letterSpacing:'-.2px'}}>{T('الخدمات','Services')}</span>
<span style={{fontSize:11,color:'var(--tx5)',fontWeight:500,marginInlineStart:'auto'}}>{svcTags.length} {T(svcTags.length===1?'بند':'بنود',svcTags.length===1?'item':'items')}</span>
</div>
<div style={{display:'flex',flexWrap:'wrap',gap:8}}>
{svcTags.map((tag,i)=><span key={i} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:10,fontSize:12,fontWeight:600,background:'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))',border:'1px solid rgba(212,160,23,.35)',color:C.gold,boxShadow:'inset 0 1px 0 rgba(212,160,23,.2)'}}>
<span style={{width:5,height:5,borderRadius:'50%',background:C.gold,boxShadow:'0 0 4px '+C.gold}}/>{tag}
</span>)}
</div>
</div>})()}
{sec(T('شروط النقل','Transfer Conditions'),[
[T('فترة الإشعار','Notice Period'),tc.has_notice_period===true?T('نعم','Yes'):tc.has_notice_period===false?T('لا','No'):T('غير محدد','Not set'),tc.has_notice_period===null||tc.has_notice_period===undefined?'var(--tx5)':tc.has_notice_period?'#27a046':C.gold,null,null,'has_notice_period'],
[T('موافقة صاحب العمل الحالي','Current Employer Consent'),tc.employer_consent===true?T('نعم','Yes'):tc.employer_consent===false?T('لا','No'):T('غير محدد','Not set'),tc.employer_consent===null||tc.employer_consent===undefined?'var(--tx5)':tc.employer_consent?'#27a046':C.red,null,null,'employer_consent'],
],icoSwap)}
{(()=>{const ren=Number(tc.renewal_months||0);const renSuffix=ren>0?T(` (${ren} شهر)`,` (${ren} mo)`):'';const lateFine=Number(tc.late_fine_amount||0);const items=[
Number(tc.transfer_fee||0)>0?[T('رسوم نقل الكفالة','Sponsorship Transfer Fee'),nmSar(tc.transfer_fee),null,null,null,'transfer_fee']:null,
Number(tc.iqama_renewal_fee||0)>0?[T('تجديد الإقامة','Iqama Renewal')+renSuffix,nmSar(tc.iqama_renewal_fee),null,null,null,'iqama_renewal_fee']:null,
Number(tc.work_permit_fee||0)>0?[T('رخصة العمل','Work Permit')+renSuffix,nmSar(tc.work_permit_fee),null,null,null,'work_permit_fee']:null,
Number(tc.prof_change_fee||0)>0?[T('تغيير المهنة','Change Profession'),nmSar(tc.prof_change_fee),null,null,null,'prof_change_fee']:null,
Number(tc.medical_fee||0)>0?[T('التأمين الطبي','Medical Insurance'),nmSar(tc.medical_fee),null,null,null,'medical_fee']:null,
Number(tc.office_fee||0)>0?[T('رسوم المكتب','Office Fees'),nmSar(tc.office_fee),C.gold,null,null,'office_fee']:null,
lateFine>0?[T('غرامة الإقامة','Iqama Late Fine'),nmSar(lateFine),'#e5867a',null,null,'late_fine_amount']:null,
...((Array.isArray(tc.extras)?tc.extras:[]).map((e)=>{const a=Number(e?.amount)||0;return a>0?[e?.name||T('بند إضافي','Extra'),nmSar(a),C.blue,'rgba(52,131,180,.08)','rgba(52,131,180,.25)','extras']:null}).filter(Boolean)),
[T('إجمالي الرسوم','Subtotal'),nmSar(tc.subtotal),'#27a046','rgba(39,160,70,.06)','rgba(39,160,70,.25)','subtotal'],
Number(tc.absher_discount||0)>0?[T('رصيد أبشر (خصم)','Absher Balance (discount)'),'-'+nmSar(tc.absher_discount),C.gold,null,null,'absher_discount']:null,
Number(tc.manual_discount||0)>0?[T('خصم إضافي','Manual Discount'),'-'+nmSar(tc.manual_discount),C.gold,null,null,'manual_discount']:null,
[T('الإجمالي','Grand Total'),nmSar(tc.total_amount),C.gold,'rgba(212,160,23,.1)','rgba(212,160,23,.4)','total_amount'],
].filter(Boolean);return sec(T('التسعيرة','Pricing'),items,icoMoney)})()}
</>})()}
{<>
{(()=>{const pricedBy=dr.priced_user?(lang==='en'?(dr.priced_user.name_en||dr.priced_user.name_ar):dr.priced_user.name_ar):(dr.created_user?(lang==='en'?(dr.created_user.name_en||dr.created_user.name_ar):dr.created_user.name_ar):null)
const approvedBy=dr.approved_user?(lang==='en'?(dr.approved_user.name_en||dr.approved_user.name_ar):dr.approved_user.name_ar):null
const stages=[
{k:'priced',label:T('التسعير','Priced'),date:dr.priced_at||dr.created_at,user:pricedBy,color:'#eab308',done:!!(dr.priced_at||dr.created_at)},
{k:'approved',label:T('التصديق','Approved'),date:dr.approved_at,user:approvedBy,color:C.blue,done:dr.status==='approved'||dr.status==='invoiced'||dr.status==='completed'},
{k:'invoiced',label:T('الفوترة','Invoiced'),date:dr.invoiced_at||null,user:null,color:C.ok,done:dr.status==='invoiced'||dr.status==='completed'},
]
return<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'22px 18px 16px',position:'relative',marginTop:10,marginBottom:6}}>
<div style={{position:'absolute',top:-9,right:14,background:'#141414',padding:'0 8px',fontSize:12,fontWeight:600,color:C.gold,fontFamily:"'Cairo',sans-serif",display:'inline-flex',alignItems:'center',gap:6}}>{icoClock}<span>{T('مراحل المعاملة','Pipeline')}</span></div>
<div style={{display:'flex',flexDirection:'column',gap:0}}>
{stages.map((s,i)=>{const last=i===stages.length-1
return<div key={s.k} style={{display:'flex',alignItems:'stretch',gap:14,position:'relative'}}>
<div style={{width:28,display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
<div style={{width:22,height:22,borderRadius:'50%',background:s.done?s.color+'22':'rgba(255,255,255,.04)',border:'2px solid '+(s.done?s.color:'rgba(255,255,255,.1)'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'.2s'}}>{s.done?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<div style={{width:6,height:6,borderRadius:'50%',background:'rgba(255,255,255,.2)'}}/>}</div>
{!last&&<div style={{flex:1,width:2,background:s.done?s.color+'55':'rgba(255,255,255,.06)',marginTop:2,marginBottom:2,minHeight:16}}/>}
</div>
<div style={{flex:1,paddingBottom:last?0:14}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
<span style={{fontSize:13,fontWeight:600,color:s.done?s.color:'var(--tx5)',letterSpacing:'.3px'}}>{s.label}</span>
{!s.done&&<span style={{fontSize:9,color:'var(--tx6)',fontWeight:600}}>— {T('قيد الانتظار','Pending')}</span>}
</div>
{s.done&&(s.date||s.user)&&<div style={{display:'flex',gap:14,fontSize:10.5,color:'var(--tx4)',fontWeight:600,flexWrap:'wrap'}}>
{s.date&&<span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{color:'var(--tx5)'}}>{T('التاريخ','Date')}:</span><span style={{color:'var(--tx2)',fontFamily:"'JetBrains Mono',monospace",direction:'ltr'}}>{fmtD(s.date)}</span></span>}
{s.user&&<span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{color:'var(--tx5)'}}>{T('بواسطة','By')}:</span><span style={{color:C.gold,fontWeight:600}}>{s.user}</span></span>}
</div>}
</div>
</div>})}
</div>
</div>
})()}
{(dr.notes&&typeof dr.notes==='string'&&dr.notes.trim()&&!dr.notes.trim().startsWith('{'))||mm.internal_notes?sec(T('ملاحظات','Notes'),[
mm.internal_notes?[T('ملاحظات داخلية','Internal Notes'),mm.internal_notes]:null,
(dr.notes&&typeof dr.notes==='string'&&!dr.notes.trim().startsWith('{'))?[T('ملاحظات','Notes'),dr.notes]:null,
],icoNote):null}
</>}
</div>
</div>
})()}
{/* ═══ Approval modal — collects required + optional fields, then approves atomically ═══ */}
{approveForm&&(()=>{const f=approveForm;const setF=(k,v)=>setApproveForm(p=>({...p,[k]:v}));const phRaw=String(f.phone||'').replace(/^\+?966/,'');const phErr=phRaw&&!/^5[013-9]\d{7}$/.test(phRaw);const required=['nationality_id','gender','work_permit_expiry'];const missing=required.filter(k=>!f[k]);const noticeSet=f.has_notice_period===true||f.has_notice_period===false;const consentSet=f.employer_consent===true||f.employer_consent===false;const ready=missing.length===0&&noticeSet&&consentSet&&!phErr;const newTotal=Math.max(0,f._subtotal-Number(approveForm.manual_discount||0)-Number(approveForm._absher||0));const FieldLbl=({children,req})=><div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.7)',marginBottom:5}}>{children}{req&&<span style={{color:C.red,marginInlineStart:3}}>*</span>}</div>;const inpStyle={width:'100%',height:38,padding:'0 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(0,0,0,.25)',color:'var(--tx)',fontFamily:F,fontSize:12.5,fontWeight:600,outline:'none',boxSizing:'border-box',textAlign:'center'};const YN=({val,onPick})=><div style={{display:'flex',gap:6}}>{[{v:true,l:T('نعم','Yes'),c:'#27a046'},{v:false,l:T('لا','No'),c:C.red}].map(o=><button key={String(o.v)} type="button" onClick={()=>onPick(o.v)} style={{flex:1,height:36,borderRadius:8,border:'1.5px solid '+(val===o.v?o.c:'rgba(255,255,255,.1)'),background:val===o.v?o.c+'18':'transparent',color:val===o.v?o.c:'var(--tx3)',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',transition:'.15s'}}>{o.l}</button>)}</div>;return<div onClick={()=>!approveSaving&&setApproveForm(null)} style={{position:'fixed',inset:0,background:'rgba(5,5,8,.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2200,padding:16,fontFamily:F}} dir={lang==='en'?'ltr':'rtl'}>
<div onClick={e=>e.stopPropagation()} style={{width:560,maxWidth:'95vw',maxHeight:'92vh',background:'#141518',borderRadius:18,border:'1px solid rgba(52,131,180,.25)',boxShadow:'0 28px 70px rgba(0,0,0,.6)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
<div style={{padding:'18px 22px 14px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',gap:12}}>
<span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:36,height:36,borderRadius:10,background:'rgba(52,131,180,.15)',color:C.blue}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
<div style={{flex:1}}>
<div style={{fontSize:16,fontWeight:600,color:'var(--tx)'}}>{T('تصديق الحسبة','Approve Quote')}</div>
<div style={{fontSize:11,color:'var(--tx5)',marginTop:3,fontFamily:"'JetBrains Mono',monospace"}}>{f._quoteNo} {f._workerName?'· '+f._workerName:''}</div>
</div>
<button onClick={()=>!approveSaving&&setApproveForm(null)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
<div style={{fontSize:11.5,color:'var(--tx4)',marginBottom:14,lineHeight:1.7}}>{T('املأ الحقول المطلوبة وأي تعديلات قبل التصديق النهائي. كل تعديل يُسجَّل في سجل التغييرات.','Fill the required fields and any edits before final approval. All edits are recorded in the audit log.')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
<div><FieldLbl req>{T('الجنسية','Nationality')}</FieldLbl><select value={f.nationality_id||''} onChange={e=>setF('nationality_id',e.target.value||null)} style={inpStyle}><option value="">{T('— اختر —','— Select —')}</option>{nationalities.map(n=><option key={n.id} value={n.id}>{lang==='en'?(n.name_en||n.name_ar):n.name_ar}</option>)}</select></div>
<div><FieldLbl req>{T('الجنس','Gender')}</FieldLbl><select value={f.gender||''} onChange={e=>setF('gender',e.target.value||null)} style={inpStyle}><option value="">{T('— اختر —','— Select —')}</option><option value="male">{T('ذكر','Male')}</option><option value="female">{T('أنثى','Female')}</option></select></div>
<div><FieldLbl req>{T('انتهاء رخصة العمل','Work Permit Expiry')}</FieldLbl><input type="date" value={f.work_permit_expiry||''} onChange={e=>setF('work_permit_expiry',e.target.value||null)} style={inpStyle}/></div>
<div><FieldLbl>{T('تاريخ الميلاد','Date of Birth')}</FieldLbl><input type="date" value={f.dob||''} onChange={e=>setF('dob',e.target.value||null)} style={inpStyle}/></div>
<div style={{gridColumn:'1 / -1'}}><FieldLbl req>{T('فترة الإشعار','Notice Period')}</FieldLbl><YN val={f.has_notice_period} onPick={v=>setF('has_notice_period',v)}/></div>
<div style={{gridColumn:'1 / -1'}}><FieldLbl req>{T('موافقة صاحب العمل الحالي','Current Employer Consent')}</FieldLbl><YN val={f.employer_consent} onPick={v=>setF('employer_consent',v)}/></div>
<div><FieldLbl>{T('اسم العامل','Worker Name')}</FieldLbl><input type="text" value={f.worker_name||''} onChange={e=>setF('worker_name',e.target.value)} style={inpStyle}/></div>
<div><FieldLbl>{T('رقم الجوال','Mobile')}</FieldLbl><input type="text" inputMode="numeric" value={phRaw} placeholder="5XXXXXXXX" maxLength={9} onChange={e=>setF('phone',e.target.value.replace(/\D/g,'').slice(0,9))} style={{...inpStyle,direction:'ltr',borderColor:phErr?'rgba(192,57,43,.5)':inpStyle.border}}/></div>
</div>
<div style={{padding:'14px 16px',borderRadius:12,background:'rgba(212,160,23,.06)',border:'1px solid rgba(212,160,23,.2)',marginBottom:12}}>
<FieldLbl>{T('خصم إضافي (اختياري)','Manual Discount (optional)')}</FieldLbl>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<input type="text" inputMode="decimal" value={f.manual_discount||''} placeholder="0" onChange={e=>setF('manual_discount',e.target.value.replace(/[^0-9.]/g,''))} style={{...inpStyle,flex:1,textAlign:'left'}}/>
<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600}}>{T('ر.س','SAR')}</span>
</div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,paddingTop:10,borderTop:'1px dashed rgba(212,160,23,.25)'}}>
<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600}}>{T('الإجمالي بعد الخصم','Total after discount')}</span>
<span style={{fontSize:15,fontWeight:600,color:C.gold}}>{nm(Math.max(0,f._subtotal-Number(f.manual_discount||0)))} {T('ر.س','SAR')}</span>
</div>
</div>
<div>
<FieldLbl>{T('ملاحظة (اختياري)','Note (optional)')}</FieldLbl>
<textarea value={f.approval_note||''} placeholder={T('أي ملاحظة أو حالة استثنائية تتعلق بهذه التسعيرة…','Any note or exceptional case related to this quote…')} onChange={e=>setF('approval_note',e.target.value.slice(0,500))} rows={3} style={{...inpStyle,height:'auto',padding:'10px 12px',textAlign:'start',resize:'vertical',minHeight:64,fontFamily:F,lineHeight:1.6}}/>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:4,textAlign:'end'}}>{(f.approval_note||'').length}/500</div>
</div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',justifyContent:'space-between',gap:10}}>
<button onClick={()=>!approveSaving&&setApproveForm(null)} disabled={approveSaving} style={{height:40,padding:'0 18px',borderRadius:9,background:'transparent',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',fontFamily:F,fontSize:12,fontWeight:600,cursor:approveSaving?'not-allowed':'pointer'}}>{T('إلغاء','Cancel')}</button>
<button onClick={submitApproval} disabled={!ready||approveSaving} title={ready?T('تصديق نهائي','Final approve'):T('املأ الحقول المطلوبة','Fill required fields')} style={{height:40,padding:'0 22px',borderRadius:9,background:ready?C.blue:'rgba(52,131,180,.2)',border:'none',color:ready?'#fff':'rgba(255,255,255,.4)',fontFamily:F,fontSize:13,fontWeight:600,cursor:(ready&&!approveSaving)?'pointer':'not-allowed',display:'inline-flex',alignItems:'center',gap:8,transition:'.15s'}}>
{approveSaving?<span style={{width:12,height:12,border:'2px solid currentColor',borderRightColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'spin .7s linear infinite'}}/>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
<span>{approveSaving?T('جاري التصديق…','Approving…'):T('تصديق نهائي','Final Approve')}</span>
</button>
</div>
</div>
<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
</div>})()}
{pop&&(()=>{
const steps=[{id:'worker',t:T('بيانات العامل','Worker Info')},{id:'transfer',t:T('تفاصيل النقل','Transfer Details')},{id:'costs',t:T('التكاليف','Costs')},{id:'summary',t:T('الملخص','Summary')}]
const selWorker=workers.find(w=>w.id===form.worker_id)
const setF=(k,v)=>setForm(p=>{const n={...p,[k]:v}
// Auto-calc transfer fee based on count
if(k==='transfer_count'){n.transfer_fee=String(calcTransferFee(Number(v)))}
// Auto-calc iqama fine
if(k==='iqama_expired'||k==='iqama_fine_count'){const exp=k==='iqama_expired'?v:p.iqama_expired;const cnt=k==='iqama_fine_count'?Number(v):Number(p.iqama_fine_count);n.iqama_fine=String(calcIqamaFine(exp,cnt))}
// Auto-calc iqama renewal cost
if(k==='iqama_renewal_months'){n.iqama_cost=String(calcIqamaRenewal(Number(v)))}
// Auto-calc occupation change cost
if(k==='wants_occupation_change'){n.occupation_change_cost=v?'1000':'0'}
return n})
const LBL=({t,r:req})=><div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>{t}{req&&<span style={{color:C.red}}> *</span>}</div>
const INP=({k,ph,d,t})=><input value={form[k]||''} onChange={e=>setF(k,e.target.value)} placeholder={ph} type={t||'text'} style={{...fS,textAlign:d?'left':'right',direction:d?'ltr':'rtl',height:42}}/>
const SEL=({k,opts,ph})=><select value={form[k]||''} onChange={e=>setF(k,e.target.value)} style={{...fS,textAlign:'right',height:42,colorScheme:'dark'}}><option value="">{ph||'— '+T('اختر','Select')+' —'}</option>{opts.map(o=>typeof o==='object'?<option key={o.v} value={o.v}>{o.l}</option>:<option key={o} value={o}>{o}</option>)}</select>
const TOG=({k,labels})=><div style={{display:'flex',gap:8}}>{(labels||[{v:true,l:T('نعم','Yes'),c:C.ok},{v:false,l:T('لا','No'),c:C.red}]).map(o=><button key={String(o.v)} onClick={()=>setF(k,o.v)} style={{flex:1,height:42,borderRadius:10,border:'1.5px solid '+(form[k]===o.v?(o.c||C.gold)+'40':'rgba(255,255,255,.08)'),background:form[k]===o.v?(o.c||C.gold)+'12':'rgba(255,255,255,.03)',color:form[k]===o.v?(o.c||C.gold):'var(--tx5)',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:form[k]===o.v?700:500,cursor:'pointer'}}>{o.l}</button>)}</div>

return<div onClick={()=>setPop(false)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(840px,95vw)',height:'88vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(212,160,23,.15)'}}>
{/* Header */}
<div style={{background:'var(--bg)',padding:'14px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(212,160,23,.12)',flexShrink:0}}>
<div><div style={{fontSize:16,fontWeight:600,color:'var(--tx)'}}>{form._id?T('تعديل التسعيرة','Edit'):T('تسعيرة تنازل جديدة','New Transfer Calc')}</div></div>
<div style={{display:'flex',gap:6}}>
<button onClick={save} disabled={saving} style={{height:34,padding:'0 16px',borderRadius:8,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.12)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:600,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
<button onClick={()=>setPop(false)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
</div></div>
{/* Steps bar */}
<div style={{display:'flex',background:'rgba(255,255,255,.02)',borderBottom:'1px solid rgba(255,255,255,.04)',flexShrink:0}}>
{steps.map((s,i)=><div key={s.id} onClick={()=>setWizStep(i)} style={{flex:1,padding:'10px 8px',textAlign:'center',cursor:'pointer',borderBottom:wizStep===i?'2.5px solid '+C.gold:'2.5px solid transparent'}}>
<div style={{fontSize:11,fontWeight:wizStep===i?700:500,color:wizStep===i?C.gold:i<wizStep?C.ok:'var(--tx5)'}}>{i+1}. {s.t}</div>
</div>)}
</div>
{/* Content */}
<div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>

{/* ═══ Step 1: بيانات العامل ═══ */}
{wizStep===0&&<div>
<div style={{display:'flex',gap:0,marginBottom:16,borderRadius:10,overflow:'hidden',border:'1.5px solid rgba(212,160,23,.2)'}}>
{[{v:'existing',l:T('عامل مسجّل','Existing Worker')},{v:'new',l:T('عامل جديد','New Worker')}].map(o=><button key={o.v} onClick={()=>setWorkerMode(o.v)} style={{flex:1,height:42,border:'none',background:workerMode===o.v?'rgba(212,160,23,.12)':'rgba(255,255,255,.02)',color:workerMode===o.v?C.gold:'var(--tx5)',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:workerMode===o.v?700:500,cursor:'pointer'}}>{o.l}</button>)}
</div>

{workerMode==='existing'?<div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><LBL t={T('العامل','Worker')} r/><SEL k="worker_id" opts={workers.map(w=>({v:w.id,l:w.name_ar}))} ph={T('اختر العامل','Select worker')}/></div>
<div><LBL t={T('المنشأة الحالية','Current Facility')} r/><SEL k="facility_id" opts={facilities.map(f=>({v:f.id,l:f.name_ar}))}/></div>
</div>
{selWorker&&<div style={{marginTop:12,padding:'14px',borderRadius:10,background:'rgba(212,160,23,.04)',border:'1px solid rgba(212,160,23,.1)',fontSize:13,fontWeight:600,color:'var(--tx)'}}>{selWorker.name_ar}</div>}
</div>:

<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><LBL t={T('اسم العامل','Worker Name')} r/><INP k="w_name"/></div>
<div><LBL t={T('رقم الإقامة','Iqama No.')} r/><INP k="w_iqama" d/></div>
<div><LBL t={T('تاريخ نهاية الإقامة ميلادي','Iqama Expiry (G)')}/><input type="date" value={form.w_iqama_expiry||''} onChange={e=>setF('w_iqama_expiry',e.target.value)} style={{...fS,direction:'ltr',height:42,colorScheme:'dark'}}/></div>
<div><LBL t={T('تاريخ نهاية الإقامة هجري','Iqama Expiry (H)')}/><INP k="w_iqama_expiry_h" d/></div>
<div><LBL t={T('تاريخ الميلاد','Date of Birth')}/><input type="date" value={form.w_dob||''} onChange={e=>setF('w_dob',e.target.value)} style={{...fS,direction:'ltr',height:42,colorScheme:'dark'}}/></div>
<div><LBL t={T('الجنسية','Nationality')} r/><INP k="w_nationality"/></div>
<div><LBL t={T('الجنس','Gender')}/><TOG k="w_gender" labels={[{v:'male',l:T('ذكر','Male'),c:C.blue},{v:'female',l:T('أنثى','Female'),c:'#9b59b6'}]}/></div>
<div><LBL t={T('المهنة الحالية','Current Occupation')}/><INP k="w_occupation"/></div>
<div><LBL t={T('رقم الجوال','Phone')}/><INP k="w_phone" d/></div>
<div><LBL t={T('الوضع القانوني','Legal Status')}/><SEL k="w_legal_status" opts={[{v:'regular',l:T('نظامي','Regular')},{v:'irregular',l:T('مخالف','Irregular')},{v:'runaway',l:T('هارب','Runaway')},{v:'expired_iqama',l:T('إقامة منتهية','Expired Iqama')}]}/></div>
</div>}

{/* Common fields for both modes */}
<div style={{marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.06)'}}>
<div style={{fontSize:12,fontWeight:600,color:C.gold,marginBottom:14}}>{T('تفاصيل إضافية','Additional Details')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><LBL t={T('هل يطلب تعديل مهنة؟','Wants occupation change?')}/><TOG k="wants_occupation_change"/></div>
{form.wants_occupation_change&&<div><LBL t={T('المهنة الجديدة','New Occupation')}/><INP k="new_occupation"/></div>}
<div><LBL t={T('تاريخ نهاية رخصة العمل','Work Permit Expiry')}/><input type="date" value={form.wp_expiry||''} onChange={e=>setF('wp_expiry',e.target.value)} style={{...fS,direction:'ltr',height:42,colorScheme:'dark'}}/></div>
<div><LBL t={T('فترة إشعار؟','Notice Period?')}/><TOG k="has_notice_period"/></div>
<div><LBL t={T('موافقة صاحب العمل الحالي؟','Current Employer Consent?')}/><TOG k="employer_consent"/></div>
<div><LBL t={T('المنشأة الحالية','Current Facility')}/>{workerMode==='new'&&<SEL k="facility_id" opts={facilities.map(f=>({v:f.id,l:f.name_ar}))}/>}{workerMode==='existing'&&<div style={{fontSize:12,color:'var(--tx3)',padding:'10px 14px',background:'rgba(255,255,255,.03)',borderRadius:10,border:'1px solid rgba(255,255,255,.05)'}}>{facilities.find(f=>f.id===form.facility_id)?.name_ar||'—'}</div>}</div>
</div>
</div>
</div>}

{/* ═══ Step 2: تفاصيل النقل ═══ */}
{wizStep===1&&<div>
<div style={{fontSize:13,fontWeight:600,color:C.gold,marginBottom:16}}>{T('تفاصيل عملية النقل والرسوم التلقائية','Transfer Details & Auto Fees')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><LBL t={T('نوع النقل','Transfer Type')} r/><TOG k="transfer_type" labels={[{v:'sponsorship',l:T('نقل كفالة','Sponsorship'),c:C.gold},{v:'final_exit',l:T('خروج نهائي','Final Exit'),c:C.blue}]}/></div>
<div><LBL t={T('الحالة','Status')}/><SEL k="status" opts={[{v:'draft',l:T('مسودة','Draft')},{v:'pending',l:T('معلّقة','Pending')},{v:'approved',l:T('مقبولة','Approved')},{v:'completed',l:T('مكتملة','Done')}]}/></div>
<div style={{gridColumn:'1/-1'}}><LBL t={T('صاحب العمل الجديد','New Employer')}/><INP k="new_employer_name"/></div>

<div><LBL t={T('عدد مرات النقل للعامل','Transfer Count')}/><SEL k="transfer_count" opts={[{v:1,l:T('المرة الأولى — 2,000 ر.س','1st — 2,000')},{v:2,l:T('المرة الثانية — 4,000 ر.س','2nd — 4,000')},{v:3,l:T('المرة الثالثة+ — 6,000 ر.س','3rd+ — 6,000')}]}/><div style={{fontSize:9,color:C.gold,marginTop:4}}>{T('رسوم النقل:','Fee:')} {nm(Number(form.transfer_fee))} {T('ر.س','SAR')}</div></div>

<div><LBL t={T('هل الإقامة منتهية؟','Iqama Expired?')}/><TOG k="iqama_expired"/></div>
{form.iqama_expired&&<div><LBL t={T('كم مرة تأخر بالتجديد؟','Renewal Delay Count')}/><SEL k="iqama_fine_count" opts={[{v:1,l:T('المرة الأولى — 500 ر.س','1st — 500')},{v:2,l:T('المرة الثانية — 1,000 ر.س','2nd — 1,000')}]}/><div style={{fontSize:9,color:C.red,marginTop:4}}>{T('الغرامة:','Fine:')} {nm(Number(form.iqama_fine))} {T('ر.س','SAR')}</div></div>}
<div><LBL t={T('عدد أشهر تجديد الإقامة','Iqama Renewal Months')}/><SEL k="iqama_renewal_months" opts={[{v:3,l:T('3 أشهر — 163 ر.س','3m — 163')},{v:6,l:T('6 أشهر — 325 ر.س','6m — 325')},{v:12,l:T('سنة — 650 ر.س','12m — 650')},{v:24,l:T('سنتين — 1,300 ر.س','24m — 1,300')}]}/><div style={{fontSize:9,color:C.blue,marginTop:4}}>{T('رسوم التجديد:','Renewal:')} {nm(Number(form.iqama_cost))} {T('ر.س','SAR')}</div></div>
</div>
</div>}

{/* ═══ Step 3: التكاليف ═══ */}
{wizStep===2&&<div>
<div style={{fontSize:13,fontWeight:600,color:C.gold,marginBottom:16}}>{T('ملخص التكاليف','Cost Summary')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
{[['transfer_fee',T('رسوم النقل','Transfer Fee'),true],['iqama_cost',T('تجديد الإقامة','Iqama Renewal'),true],['iqama_fine',T('غرامة التأخير','Delay Fine'),true],['insurance_cost',T('التأمين الطبي','Health Insurance')],['work_permit_cost',T('رخصة العمل','Work Permit')],['occupation_change_cost',T('تغيير المهنة','Occupation Change'),true],['office_fee',T('رسوم المكتب','Office Fee')],['absher_balance',T('رصيد أبشر (خصم)','Absher Balance (deduct)')]].map(([k,l,auto])=><div key={k} style={{background:auto?'rgba(212,160,23,.03)':'rgba(255,255,255,.02)',borderRadius:10,padding:'10px 14px',border:'1px solid '+(auto?'rgba(212,160,23,.08)':'rgba(255,255,255,.04)')}}>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:6,display:'flex',justifyContent:'space-between'}}><span>{l}</span>{auto&&<span style={{fontSize:8,color:C.gold}}>{T('تلقائي','Auto')}</span>}</div>
<input value={form[k]||''} onChange={e=>setF(k,e.target.value)} style={{...fS,height:38,fontSize:14,fontWeight:600}} type="number"/></div>)}
</div>
{/* Extra fee */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16,padding:'12px',borderRadius:10,border:'1px dashed rgba(255,255,255,.08)'}}>
<div><LBL t={T('اسم رسوم إضافية','Extra Fee Name')}/><INP k="extra_fee_name"/></div>
<div><LBL t={T('المبلغ','Amount')}/><input value={form.extra_fee_amount||''} onChange={e=>setF('extra_fee_amount',e.target.value)} style={{...fS,height:42}} type="number"/></div>
</div>
{/* Dates */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
<div><LBL t={T('تاريخ التسديد','Sedd Date')} r/><INP k="sedd_date" t="date" d/></div>
<div><LBL t={T('تاريخ الاستحقاق','Due Date')}/><INP k="due_date" t="date" d/></div>
</div>
{/* Totals */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,padding:'18px',borderRadius:14,background:'linear-gradient(135deg,rgba(212,160,23,.06),rgba(212,160,23,.02))',border:'1.5px solid rgba(212,160,23,.15)'}}>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.red,marginBottom:6}}>{T('إجمالي التكلفة','Total Cost')}</div><div style={{fontSize:26,fontWeight:600,color:C.red}}>{nm(totalCost())}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.gold,marginBottom:6}}>{T('المطلوب من العميل','Client Charge')}</div><input value={form.client_charge||''} onChange={e=>setF('client_charge',e.target.value)} style={{...fS,height:42,fontSize:18,fontWeight:600,color:C.gold,background:'rgba(212,160,23,.08)',border:'1.5px solid rgba(212,160,23,.25)'}} type="number"/></div>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:profit()>=0?C.ok:C.red,marginBottom:6}}>{T('الربح','Profit')}</div><div style={{fontSize:26,fontWeight:600,color:profit()>=0?C.ok:C.red}}>{nm(profit())}</div></div>
</div>
</div>}

{/* ═══ Step 4: الملخص ═══ */}
{wizStep===3&&<div>
<div style={{fontSize:13,fontWeight:600,color:C.gold,marginBottom:16}}>{T('ملخص الحسبة','Calculation Summary')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
{[[T('العامل','Worker'),selWorker?.name_ar||form.w_name||'—'],[T('نوع النقل','Type'),form.transfer_type==='final_exit'?T('خروج نهائي','Final Exit'):T('نقل كفالة','Sponsorship')],[T('صاحب العمل الجديد','New Employer'),form.new_employer_name||'—'],[T('الحالة','Status'),stLabel[form.status]||form.status],[T('تاريخ التسديد','Sedd Date'),form.sedd_date||'—'],[T('تاريخ الاستحقاق','Due Date'),form.due_date||'—']].map(([l,v],i)=><div key={i} style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.04)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:'var(--tx)'}}>{v}</div></div>)}
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,padding:'18px',borderRadius:14,background:'rgba(212,160,23,.04)',border:'1.5px solid rgba(212,160,23,.12)',marginBottom:16}}>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.red,marginBottom:4}}>{T('التكلفة','Cost')}</div><div style={{fontSize:24,fontWeight:600,color:C.red}}>{nm(totalCost())}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.gold,marginBottom:4}}>{T('المطلوب','Charge')}</div><div style={{fontSize:24,fontWeight:600,color:C.gold}}>{nm(Number(form.client_charge)||0)}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:profit()>=0?C.ok:C.red,marginBottom:4}}>{T('الربح','Profit')}</div><div style={{fontSize:24,fontWeight:600,color:profit()>=0?C.ok:C.red}}>{nm(profit())}</div></div>
</div>
<div><LBL t={T('ملاحظات','Notes')}/><textarea value={form.notes||''} onChange={e=>setF('notes',e.target.value)} rows={3} style={{...fS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/></div>
</div>}

</div>
{/* Footer */}
<div style={{padding:'12px 24px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexShrink:0}}>
<button onClick={()=>wizStep>0?setWizStep(wizStep-1):setPop(false)} style={{height:40,padding:'0 18px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx3)',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,cursor:'pointer'}}>{wizStep>0?T('السابق','Back'):T('إلغاء','Cancel')}</button>
{wizStep<steps.length-1?<button onClick={()=>setWizStep(wizStep+1)} style={{height:40,padding:'0 18px',borderRadius:10,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.12)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('التالي','Next')}</button>:
<button onClick={save} disabled={saving} style={{height:40,padding:'0 22px',borderRadius:10,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.15)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>}
</div>
</div></div>})()}
</div>}

function AuditPage({sb,toast,user,lang,branchId}){
const nm=v=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2})
const F="'Cairo','Tajawal',sans-serif"
const[tab,setTab]=useState('cash_deposit')
const[bankData,setBankData]=useState([])
const[smsMap,setSmsMap]=useState({})
const[showSms,setShowSms]=useState(null)
const[selDate,setSelDate]=useState(new Date().toISOString().slice(0,10))
const[payFilter,setPayFilter]=useState('all')
const[expandedCats,setExpandedCats]=useState(new Set())
const[allPayments,setAllPayments]=useState([])
const[allExpenses,setAllExpenses]=useState([])
const[expCats,setExpCats]=useState([])
const[loading,setLoading]=useState(true)

const reload=useCallback(async()=>{
setLoading(true)
const[{data:br},{data:ip},{data:oe},{data:cats}]=await Promise.all([
sb.from('bank_reconciliation').select('*').is('deleted_at',null).order('transaction_date',{ascending:false}),
sb.from('invoice_payments').select('*').is('deleted_at',null).order('payment_date',{ascending:false}),
sb.from('operational_expenses').select('*,cat:expense_categories(id,name_ar,name_en,parent_type)').is('deleted_at',null).order('date',{ascending:false}),
sb.from('expense_categories').select('*').eq('is_active',true).order('sort_order')
])
setBankData(br||[]);setAllPayments(ip||[]);setAllExpenses(oe||[]);setExpCats(cats||[])
const smsIds=(br||[]).filter(r=>r.otp_message_id).map(r=>r.otp_message_id)
if(smsIds.length>0){const{data:msgs}=await sb.from('sms_messages').select('id,message_body,phone_from,received_at,created_at').in('id',smsIds).is('deleted_at',null);const map={};(msgs||[]).forEach(m=>{map[m.id]=m});setSmsMap(map)}
setLoading(false)
},[sb])
useEffect(()=>{reload()},[reload])

// Helpers
const selDateObj=new Date(selDate)
const dayMs=86400000
const isIncomeType=(t)=>t==='bank_transfer_in'||t==='cash_in'||t==='deposit'||t==='transfer_in'
const isExpenseType=(t)=>t==='service_cost'||t==='operational'||t==='petty_cash'||t==='withdrawal'||t==='transfer_out'
const today=new Date().toISOString().slice(0,10)
const yesterday=(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10)})()
const toggleCat=(cat)=>{const n=new Set(expandedCats);n.has(cat)?n.delete(cat):n.add(cat);setExpandedCats(n)}

// Get Arabic category name
const getCatName=(e)=>{if(e.cat?.name_ar)return e.cat.name_ar;const map={rent:'إيجار',utilities:'كهرباء/ماء',telecom:'إنترنت/اتصالات',maintenance:'صيانة',insurance:'تأمين',office_supplies:'مستلزمات مكتبية',transport:'مواصلات',marketing:'تسويق',legal:'قانوني',salary:'رواتب',salaries:'رواتب',gov_fee:'رسوم حكومية',government_fees:'رسوم حكومية',other:'أخرى',supplies:'مستلزمات',subscription:'اشتراكات',travel:'سفر'};return map[e.category]||e.category||'أخرى'}
const getCatParent=(e)=>{if(e.cat?.parent_type)return e.cat.parent_type;const offCats=['rent','utilities','telecom','maintenance','insurance','office_supplies','marketing','legal','subscription'];if(offCats.includes(e.category))return'office';const payCats=['salary','salaries','social_insurance','bonuses'];if(payCats.includes(e.category))return'payroll';const txCats=['gov_fee','government_fees','visa_fees','transfer_fees'];if(txCats.includes(e.category))return'transaction';return'daily'}

// Daily summary
const dayPayments=allPayments.filter(p=>p.payment_date===selDate)
const dayExpenses=allExpenses.filter(e=>e.date===selDate)
const dayCashIncome=dayPayments.filter(p=>p.payment_method==='cash').reduce((s,p)=>s+Number(p.amount||0),0)
const dayBankIncome=dayPayments.filter(p=>p.payment_method!=='cash').reduce((s,p)=>s+Number(p.amount||0),0)
const dayTotalExpenses=dayExpenses.reduce((s,e)=>s+Number(e.amount||0),0)

// Deposit calculations
const expectedDepositToday=dayCashIncome-dayTotalExpenses
const prevCash=allPayments.filter(p=>p.payment_date&&p.payment_date<selDate&&p.payment_method==='cash').reduce((s,p)=>s+Number(p.amount||0),0)
const prevExp=allExpenses.filter(e=>e.date&&e.date<selDate).reduce((s,e)=>s+Number(e.amount||0),0)
const prevDeposits=bankData.filter(r=>isIncomeType(r.transaction_type)&&r.transaction_date<selDate).reduce((s,r)=>s+Number(r.amount||0),0)
const carryover=Math.max(0,prevCash-prevExp-prevDeposits)
const expectedDeposit=Math.max(0,expectedDepositToday)+carryover

// SMS deposits/withdrawals
const smsDeposits=bankData.filter(r=>isIncomeType(r.transaction_type)&&Math.abs(new Date(r.transaction_date)-selDateObj)<=dayMs)
const smsCashDeposits=smsDeposits.filter(r=>r.transaction_type!=='bank_transfer_in')
const smsBankTransfers=smsDeposits.filter(r=>r.transaction_type==='bank_transfer_in')
const actualDeposited=smsDeposits.reduce((s,r)=>s+Number(r.amount||0),0)
const depositDiff=expectedDeposit-actualDeposited
const depositStatus=expectedDeposit<=0?'none':actualDeposited>=expectedDeposit-1?'complete':actualDeposited>0?'partial':'pending'
const depositPct=expectedDeposit>0?Math.min(100,Math.round(actualDeposited/expectedDeposit*100)):0

const smsWithdrawals=bankData.filter(r=>isExpenseType(r.transaction_type))

// Expense matching with SMS
const matchExpenses=(items)=>{const matched=[];const unmatched=[];const used=new Set()
for(const op of items){const m=smsWithdrawals.find(s=>!used.has(s.id)&&Math.abs(Number(s.amount||0)-op._amt)<=1&&Math.abs(new Date(s.transaction_date)-new Date(op._date))<=dayMs)
if(m){matched.push({op,sms:m});used.add(m.id)}else{unmatched.push(op)}}
return{matched,unmatched}}

// Tab counts
const officeExps=allExpenses.filter(e=>getCatParent(e)==='office')
const dailyExps=allExpenses.filter(e=>getCatParent(e)==='daily')
const payrollExps=allExpenses.filter(e=>getCatParent(e)==='payroll')
const txExps=allExpenses.filter(e=>getCatParent(e)==='transaction')
const svcPayments=allPayments.filter(p=>p.payment_method==='bank_transfer')

const tabDefs=[
{g:'الدخل',items:[
{k:'cash_deposit',l:'إيداع نقدي',n:smsCashDeposits.length,bc:depositStatus==='complete'?C.ok:depositStatus==='partial'?'#e67e22':null},
{k:'bank_transfer',l:'حوالة بنكية',n:smsBankTransfers.length}
]},
{g:'المدفوعات',items:[
{k:'service_pay',l:'سداد معاملات',n:svcPayments.length+txExps.length},
{k:'office_exp',l:'مصاريف مكتبية',n:officeExps.length},
{k:'daily_exp',l:'مصاريف يومية',n:dailyExps.length},
{k:'payroll',l:'رواتب',n:payrollExps.length}
]}
]

return<div style={{fontFamily:F,direction:'rtl'}}>
{/* Header */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>التدقيق المالي</div><div style={{fontSize:11,color:'var(--tx5)',marginTop:4}}>التحقق من الإيداعات والمدفوعات عبر رسائل البنك</div></div>
</div>

{/* Daily summary bar */}
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(39,160,70,.03)',border:'1px solid rgba(39,160,70,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.ok}}>دخل اليوم</div>
<div style={{fontSize:16,fontWeight:800,color:C.ok,direction:'ltr'}}>+{nm(dayCashIncome+dayBankIncome)}</div>
</div>
<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(192,57,43,.03)',border:'1px solid rgba(192,57,43,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.red}}>صرف اليوم</div>
<div style={{fontSize:16,fontWeight:800,color:C.red,direction:'ltr'}}>-{nm(dayTotalExpenses)}</div>
</div>
<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(212,160,23,.03)',border:'1px solid rgba(212,160,23,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.gold}}>صافي اليوم</div>
<div style={{fontSize:16,fontWeight:800,color:C.gold,direction:'ltr'}}>{nm(dayCashIncome+dayBankIncome-dayTotalExpenses)}</div>
</div>
</div>

{/* Layout: Side tabs + Content */}
<div style={{display:'flex',gap:0}}>
{/* Side tabs */}
<div style={{width:140,flexShrink:0,borderLeft:'1px solid rgba(255,255,255,.05)'}}>
{tabDefs.map(g=><div key={g.g}>
<div style={{fontSize:9,fontWeight:700,color:'var(--tx6)',padding:'10px 12px 4px'}}>{g.g}</div>
{g.items.map(t=><div key={t.k} onClick={()=>{setTab(t.k);setPayFilter('all')}} style={{padding:'8px 12px',fontSize:11,fontWeight:tab===t.k?700:500,color:tab===t.k?C.gold:'rgba(255,255,255,.4)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',borderRight:tab===t.k?'2.5px solid '+C.gold:'2.5px solid transparent',transition:'.15s',background:tab===t.k?'rgba(212,160,23,.03)':'transparent'}}>
<span>{t.l}</span>
{t.n>0&&<span style={{fontSize:8,fontWeight:700,padding:'1px 6px',borderRadius:8,background:(t.bc||'rgba(255,255,255,.15)'),color:t.bc?'#fff':'var(--tx6)'}}>{t.n}</span>}
</div>)}
</div>)}
</div>

{/* Content */}
<div style={{flex:1,paddingRight:14}}>

{loading?<div style={{textAlign:'center',padding:50,color:'var(--tx5)'}}>...</div>:

/* ═══ إيداع نقدي ═══ */
tab==='cash_deposit'?<div>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:12}}>إيداع نقدي</div>
<div style={{display:'flex',gap:6,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
{[['today','اليوم',today],['yesterday','أمس',yesterday]].map(([k,l,d])=>
<button key={k} onClick={()=>setSelDate(d)} style={{height:32,padding:'0 14px',borderRadius:8,border:'1px solid '+(selDate===d?'rgba(212,160,23,.2)':'rgba(255,255,255,.06)'),background:selDate===d?'rgba(212,160,23,.08)':'rgba(255,255,255,.02)',color:selDate===d?C.gold:'var(--tx5)',fontFamily:F,fontSize:10,fontWeight:600,cursor:'pointer'}}>{l}</button>)}
<input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} style={{height:32,padding:'0 10px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:11,direction:'ltr'}}/>
<span style={{fontSize:10,color:'var(--tx6)'}}>{new Date(selDate).toLocaleDateString('ar-SA',{weekday:'long',month:'long',day:'numeric'})}</span>
</div>

{/* Main deposit card with progress bar */}
<div style={{padding:'20px 24px',borderRadius:14,background:'linear-gradient(135deg,rgba(52,131,180,.04),rgba(39,160,70,.04))',border:'1.5px solid '+(depositStatus==='complete'?'rgba(39,160,70,.15)':depositStatus==='partial'?'rgba(230,126,34,.15)':'rgba(255,255,255,.06)'),marginBottom:16}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)'}}>حالة الإيداع</div>
<div style={{fontSize:12,fontWeight:700,padding:'4px 14px',borderRadius:8,background:depositStatus==='complete'?'rgba(39,160,70,.1)':depositStatus==='partial'?'rgba(230,126,34,.1)':depositStatus==='none'?'rgba(255,255,255,.04)':'rgba(192,57,43,.1)',color:depositStatus==='complete'?C.ok:depositStatus==='partial'?'#e67e22':depositStatus==='none'?'var(--tx6)':C.red}}>{depositStatus==='complete'?'✅ مكتمل':depositStatus==='partial'?'⏳ جزئي':depositStatus==='none'?'لا يوجد':'❌ لم يودع'}</div>
</div>
{/* Progress bar */}
<div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
<div style={{flex:1}}>
<div style={{height:10,borderRadius:5,background:'rgba(255,255,255,.06)',overflow:'hidden'}}>
<div style={{height:'100%',width:depositPct+'%',borderRadius:5,background:depositPct>=100?C.ok:depositPct>=50?'#e67e22':depositPct>0?C.red:'transparent',transition:'.5s'}}/>
</div>
</div>
<span style={{fontSize:12,fontWeight:800,color:depositPct>=100?C.ok:'var(--tx3)',direction:'ltr',flexShrink:0}}>{depositPct}%</span>
</div>
{/* Numbers row */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
<div>
<div style={{fontSize:9,color:'var(--tx6)',marginBottom:2}}>المودع فعلاً</div>
<div style={{fontSize:20,fontWeight:900,color:C.ok}}>{nm(actualDeposited)} <span style={{fontSize:10,fontWeight:500}}>ر.س</span></div>
</div>
<div style={{textAlign:'center'}}>
<div style={{fontSize:9,color:'var(--tx6)',marginBottom:2}}>المطلوب</div>
<div style={{fontSize:20,fontWeight:900,color:C.blue}}>{nm(Math.max(0,expectedDeposit))} <span style={{fontSize:10,fontWeight:500}}>ر.س</span></div>
{carryover>0&&<div style={{fontSize:8,color:'#e67e22',marginTop:2}}>شامل مرحّل {nm(carryover)}</div>}
</div>
<div style={{textAlign:'left'}}>
<div style={{fontSize:9,color:'var(--tx6)',marginBottom:2}}>المتبقي</div>
<div style={{fontSize:20,fontWeight:900,color:depositDiff>1?C.red:C.ok}}>{nm(Math.max(0,depositDiff))} <span style={{fontSize:10,fontWeight:500}}>ر.س</span></div>
</div>
</div>
</div>

{/* Cash flow breakdown */}
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(39,160,70,.03)',border:'1px solid rgba(39,160,70,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.ok}}>دخل نقدي</div>
<div style={{fontSize:16,fontWeight:800,color:C.ok}}>{nm(dayCashIncome)}</div>
</div>
<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(192,57,43,.03)',border:'1px solid rgba(192,57,43,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.red}}>مصاريف</div>
<div style={{fontSize:16,fontWeight:800,color:C.red}}>{nm(dayTotalExpenses)}</div>
</div>
<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(212,160,23,.03)',border:'1px solid rgba(212,160,23,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.gold}}>صافي اليوم</div>
<div style={{fontSize:16,fontWeight:800,color:C.gold}}>{nm(expectedDepositToday)}</div>
</div>
</div>

{/* Deposit SMS list */}
{smsDeposits.length>0&&<>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>عمليات الإيداع ({smsDeposits.length})</div>
<div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
{smsDeposits.map(r=><div key={r.id} style={{padding:'10px 14px',borderRadius:10,background:'rgba(39,160,70,.02)',border:'1px solid rgba(39,160,70,.06)',display:'flex',alignItems:'center',gap:10}}>
<div style={{width:32,height:32,borderRadius:8,background:'rgba(39,160,70,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:C.ok,flexShrink:0}}>↓</div>
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{r.description?r.description.substring(0,50):'إيداع'}</div>
<div style={{display:'flex',gap:6,fontSize:8,color:'var(--tx6)',marginTop:2}}>{r.bank_name&&<span>{r.bank_name}</span>}{r.otp_message_id&&<span style={{color:'#9b59b6'}}>📱</span>}</div>
</div>
<div style={{fontSize:15,fontWeight:800,color:C.ok,direction:'ltr'}}>+{nm(r.amount)}</div>
{r.otp_message_id&&<button onClick={()=>setShowSms(showSms===r.id?null:r.id)} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(155,89,182,.1)',background:showSms===r.id?'rgba(155,89,182,.08)':'transparent',color:'#9b59b6',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,flexShrink:0}}>☰</button>}
</div>)}
</div>
</>}

{/* Day breakdown */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div>
<div style={{fontSize:11,fontWeight:700,color:C.ok,marginBottom:6}}>مدفوعات ({dayPayments.length})</div>
{dayPayments.length===0?<div style={{fontSize:10,color:'var(--tx6)',padding:12}}>لا توجد</div>:
dayPayments.slice(0,5).map((p,i)=><div key={i} style={{padding:'6px 10px',borderRadius:6,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.03)',marginBottom:3,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,color:'var(--tx4)'}}>{p.payment_method==='cash'?'💵':'🏦'} #{p.reference_number||'—'}</span>
<span style={{fontSize:11,fontWeight:700,color:C.ok,direction:'ltr'}}>{nm(p.amount)}</span>
</div>)}
{dayPayments.length>5&&<div style={{fontSize:9,color:'var(--tx6)',textAlign:'center',padding:4}}>+{dayPayments.length-5} أخرى</div>}
</div>
<div>
<div style={{fontSize:11,fontWeight:700,color:C.red,marginBottom:6}}>مصاريف ({dayExpenses.length})</div>
{dayExpenses.length===0?<div style={{fontSize:10,color:'var(--tx6)',padding:12}}>لا توجد</div>:
dayExpenses.slice(0,5).map((e,i)=><div key={i} style={{padding:'6px 10px',borderRadius:6,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.03)',marginBottom:3,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,color:'var(--tx4)'}}>{e.description||getCatName(e)}</span>
<span style={{fontSize:11,fontWeight:700,color:C.red,direction:'ltr'}}>-{nm(e.amount)}</span>
</div>)}
{dayExpenses.length>5&&<div style={{fontSize:9,color:'var(--tx6)',textAlign:'center',padding:4}}>+{dayExpenses.length-5} أخرى</div>}
</div>
</div>
</div>

:/* ═══ حوالة بنكية ═══ */
tab==='bank_transfer'?<div>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:12}}>حوالة بنكية</div>
{smsBankTransfers.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا توجد حوالات بنكية واردة</div>:
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{smsBankTransfers.map(r=><div key={r.id} style={{padding:'12px 16px',borderRadius:10,background:'rgba(39,160,70,.02)',border:'1px solid rgba(39,160,70,.06)',display:'flex',alignItems:'center',gap:10}}>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{r.description?r.description.substring(0,60):'حوالة بنكية'}</div>
<div style={{display:'flex',gap:8,fontSize:9,color:'var(--tx5)',marginTop:3}}>{r.bank_name&&<span>{r.bank_name}</span>}<span>{r.transaction_date}</span>{r.reference_number&&<span>#{r.reference_number}</span>}{r.otp_message_id&&<span style={{color:'#9b59b6'}}>📱 SMS</span>}</div>
</div>
<div style={{fontSize:16,fontWeight:800,color:C.ok,direction:'ltr'}}>+{nm(r.amount)}</div>
{r.otp_message_id&&smsMap[r.otp_message_id]&&<button onClick={()=>setShowSms(showSms===r.id?null:r.id)} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(155,89,182,.1)',background:showSms===r.id?'rgba(155,89,182,.08)':'transparent',color:'#9b59b6',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,flexShrink:0}}>☰</button>}
</div>)}
<div style={{padding:'12px 16px',borderRadius:10,background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.08)',textAlign:'center',marginTop:8}}>
<span style={{fontSize:12,fontWeight:800,color:C.ok}}>إجمالي: {nm(smsBankTransfers.reduce((s,r)=>s+Number(r.amount||0),0))} ر.س</span>
</div>
</div>}
</div>

:/* ═══ المدفوعات (service_pay / office_exp / daily_exp / payroll) ═══ */
<div>
{(()=>{
const tabTitle={service_pay:'سداد معاملات',office_exp:'مصاريف مكتبية',daily_exp:'مصاريف يومية',payroll:'رواتب'}[tab]||tab
const parentType={service_pay:'transaction',office_exp:'office',daily_exp:'daily',payroll:'payroll'}[tab]

// Get items for this tab
const tabItems=tab==='service_pay'
  ?[...svcPayments.map(p=>({...p,_type:'payment',_amt:Number(p.amount||0),_date:p.payment_date,_desc:p.notes||p.reference_number||'دفعة فاتورة',_cat:'دفعة فاتورة'})),...txExps.map(e=>({...e,_type:'expense',_amt:Number(e.amount||0),_date:e.date,_desc:e.description||e.vendor_name||getCatName(e),_cat:getCatName(e)}))]
  :(tab==='office_exp'?officeExps:tab==='payroll'?payrollExps:dailyExps).map(e=>({...e,_type:'expense',_amt:Number(e.amount||0),_date:e.date,_desc:e.description||e.vendor_name||getCatName(e),_cat:getCatName(e)}))

const{matched:tabMatched,unmatched:tabUnmatched}=matchExpenses(tabItems)
const tabTotal=tabItems.reduce((s,o)=>s+o._amt,0)

// Group by Arabic category name
const grpUnmatched={};tabUnmatched.forEach(op=>{const c=op._cat;if(!grpUnmatched[c])grpUnmatched[c]={items:[],total:0};grpUnmatched[c].items.push(op);grpUnmatched[c].total+=op._amt})
const grpMatched={};tabMatched.forEach(({op,sms})=>{const c=op._cat;if(!grpMatched[c])grpMatched[c]={items:[],total:0};grpMatched[c].items.push({op,sms});grpMatched[c].total+=op._amt})

return<>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:12}}>{tabTitle}</div>

{tabUnmatched.length>0&&<div style={{padding:'12px 16px',borderRadius:10,background:'rgba(192,57,43,.04)',border:'1px solid rgba(192,57,43,.1)',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
<div><div style={{fontSize:12,fontWeight:700,color:C.red}}>{tabUnmatched.length} عملية بدون تأكيد SMS</div><div style={{fontSize:9,color:'var(--tx5)'}}>إجمالي: {nm(tabUnmatched.reduce((s,o)=>s+o._amt,0))} ر.س</div></div>
</div>}

<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
<div style={{padding:'12px',borderRadius:10,background:'rgba(212,160,23,.04)',border:'1px solid rgba(212,160,23,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.gold}}>إجمالي</div><div style={{fontSize:18,fontWeight:900,color:C.gold}}>{tabItems.length}</div><div style={{fontSize:9,color:'var(--tx6)'}}>{nm(tabTotal)} ر.س</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.ok}}>مؤكدة</div><div style={{fontSize:18,fontWeight:900,color:C.ok}}>{tabMatched.length}</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:tabUnmatched.length>0?'rgba(192,57,43,.04)':'rgba(255,255,255,.02)',border:'1px solid '+(tabUnmatched.length>0?'rgba(192,57,43,.06)':'rgba(255,255,255,.04)'),textAlign:'center'}}>
<div style={{fontSize:8,color:tabUnmatched.length>0?C.red:'var(--tx6)'}}>بدون تأكيد</div><div style={{fontSize:18,fontWeight:900,color:tabUnmatched.length>0?C.red:'var(--tx6)'}}>{tabUnmatched.length}</div>
</div>
</div>

<div style={{display:'flex',gap:6,marginBottom:12}}>
{[['all','الكل',tabItems.length],['unverified','بدون تأكيد',tabUnmatched.length],['verified','مؤكدة',tabMatched.length]].map(([k,l,n])=>
<button key={k} onClick={()=>setPayFilter(k)} style={{height:28,padding:'0 10px',borderRadius:6,border:'1px solid '+(payFilter===k?'rgba(212,160,23,.2)':'rgba(255,255,255,.05)'),background:payFilter===k?'rgba(212,160,23,.06)':'transparent',color:payFilter===k?C.gold:'var(--tx5)',fontFamily:F,fontSize:9,fontWeight:600,cursor:'pointer'}}>{l} ({n})</button>)}
</div>

{(payFilter==='all'||payFilter==='unverified')&&Object.keys(grpUnmatched).length>0&&<>
{payFilter==='all'&&<div style={{fontSize:11,fontWeight:700,color:C.red,marginBottom:6}}>بدون تأكيد</div>}
<div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
{Object.entries(grpUnmatched).map(([cat,{items,total}])=><div key={cat} style={{borderRadius:8,border:'1px solid rgba(192,57,43,.05)',overflow:'hidden'}}>
<div onClick={()=>toggleCat('u_'+tab+'_'+cat)} style={{padding:'8px 12px',background:'rgba(192,57,43,.02)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
<div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:6,height:6,borderRadius:'50%',background:C.red}}/><span style={{fontSize:10,fontWeight:700,color:'var(--tx)'}}>{cat}</span><span style={{fontSize:8,color:'var(--tx6)'}}>({items.length})</span></div>
<div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:11,fontWeight:800,color:C.red,direction:'ltr'}}>-{nm(total)}</span><span style={{fontSize:9,color:'var(--tx6)',transform:expandedCats.has('u_'+tab+'_'+cat)?'rotate(90deg)':'none',transition:'.2s'}}>▸</span></div>
</div>
{expandedCats.has('u_'+tab+'_'+cat)&&<div style={{padding:'4px 12px 8px'}}>
{items.map((op,i)=><div key={i} style={{padding:'5px 8px',borderRadius:5,background:'rgba(255,255,255,.01)',marginBottom:2,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:C.red,opacity:.4}}/><span style={{fontSize:9,color:'var(--tx3)'}}>{op._desc}</span><span style={{fontSize:7,color:'var(--tx6)'}}>{op._date}</span></div>
<span style={{fontSize:10,fontWeight:700,color:C.red,direction:'ltr'}}>-{nm(op._amt)}</span>
</div>)}
</div>}
</div>)}
</div>
</>}

{(payFilter==='all'||payFilter==='verified')&&Object.keys(grpMatched).length>0&&<>
{payFilter==='all'&&<div style={{fontSize:11,fontWeight:700,color:C.ok,marginBottom:6}}>مؤكدة</div>}
<div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
{Object.entries(grpMatched).map(([cat,{items,total}])=><div key={cat} style={{borderRadius:8,border:'1px solid rgba(39,160,70,.05)',overflow:'hidden'}}>
<div onClick={()=>toggleCat('m_'+tab+'_'+cat)} style={{padding:'8px 12px',background:'rgba(39,160,70,.02)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
<div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:6,height:6,borderRadius:'50%',background:C.ok}}/><span style={{fontSize:10,fontWeight:700,color:'var(--tx)'}}>{cat}</span><span style={{fontSize:8,color:'var(--tx6)'}}>({items.length})</span></div>
<div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:11,fontWeight:800,color:C.ok,direction:'ltr'}}>-{nm(total)}</span><span style={{fontSize:9,color:'var(--tx6)',transform:expandedCats.has('m_'+tab+'_'+cat)?'rotate(90deg)':'none',transition:'.2s'}}>▸</span></div>
</div>
{expandedCats.has('m_'+tab+'_'+cat)&&<div style={{padding:'4px 12px 8px'}}>
{items.map(({op},i)=><div key={i} style={{padding:'5px 8px',borderRadius:5,background:'rgba(255,255,255,.01)',marginBottom:2,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:C.ok,opacity:.4}}/><span style={{fontSize:9,color:'var(--tx3)'}}>{op._desc}</span><span style={{fontSize:7,color:'#9b59b6'}}>📱</span><span style={{fontSize:7,color:'var(--tx6)'}}>{op._date}</span></div>
<span style={{fontSize:10,fontWeight:700,color:C.ok,direction:'ltr'}}>-{nm(op._amt)}</span>
</div>)}
</div>}
</div>)}
</div>
</>}
</>})()}
</div>}
</div>{/* end content */}
</div>{/* end flex layout */}
</div>}


function AppointmentsPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e;const[data,setData]=useState([]);const[loading,setLoading]=useState(true);const[pop,setPop]=useState(null);
const[f,setF]=useState({title:'',type:'client_visit',date:new Date().toISOString().slice(0,10),time:'09:00',client_id:'',worker_id:'',assigned_to:'',location:'',notes:'',status:'scheduled'});
const load=useCallback(async()=>{setLoading(true);const{data:d}=await sb.from('appointments').select('*,clients:client_id(name_ar),workers:worker_id(name_ar),users:assigned_to(name_ar)').is('deleted_at',null).order('date',{ascending:true}).order('time',{ascending:true});setData(d||[]);setLoading(false)},[sb]);
useEffect(()=>{load()},[load]);
const save=async()=>{if(!f.title||!f.date){toast(T('خطأ: العنوان والتاريخ مطلوبين','Error: Title and date required'));return}
const row={...f,created_by:user?.id};delete row.clients;delete row.workers;delete row.users;
if(pop==='new'){const{error}=await sb.from('appointments').insert(row);if(error){toast((lang==='ar'?'خطأ: ':'Error: ')+error.message);return}}
else{const{error}=await sb.from('appointments').update(row).eq('id',pop);if(error){toast((lang==='ar'?'خطأ: ':'Error: ')+error.message);return}}
toast(T('تم الحفظ','Saved'));setPop(null);load()};
const typeLabels={client_visit:T('زيارة عميل','Client Visit'),passport_office:T('الجوازات','Passports'),insurance:T('التأمينات','Insurance'),jawazat:T('الجوازات','Jawazat'),labor_office:T('مكتب العمل','Labor Office'),gosi:T('التأمينات الاجتماعية','GOSI'),court:T('محكمة','Court'),other:T('أخرى','Other')};
const statusColors={scheduled:C.gold,confirmed:C.blue,completed:C.ok,cancelled:C.red,no_show:'#e67e22'};
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'};
return<div style={{fontFamily:"'Cairo',sans-serif",paddingTop:0}}>
{/* ═══ Page header (Kafala-style) ═══ */}
<div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:24,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px',lineHeight:1.2}}>{T('المواعيد','Appointments')}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>{T('متابعة الزيارات والاجتماعات والمراجعات الحكومية','Track visits, meetings, and government office reviews')}</div>
</div>
<button onClick={()=>{setF({title:'',type:'client_visit',date:new Date().toISOString().slice(0,10),time:'09:00',client_id:'',worker_id:'',assigned_to:'',location:'',notes:'',status:'scheduled'});setPop('new')}} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
{T('موعد جديد','New')}
</button>
</div>
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)',fontSize:13}}>{T('جاري التحميل...','Loading...')}</div>:
data.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)',fontSize:13,fontWeight:500}}>{T('لا توجد مواعيد','No appointments')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:14}}>{data.map(a=>{const isToday=a.date===new Date().toISOString().slice(0,10);const isPast=new Date(a.date)<new Date(new Date().toISOString().slice(0,10));const sc=statusColors[a.status]||C.gold;
return<div key={a.id} onClick={()=>{setF({...a});setPop(a.id)}} style={{padding:'18px 22px',borderRadius:16,background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid '+(isToday?'rgba(212,160,23,.25)':'rgba(255,255,255,.08)'),cursor:'pointer',display:'flex',gap:18,alignItems:'center',opacity:isPast&&a.status!=='completed'?.65:1,transition:'.25s cubic-bezier(.4,0,.2,1)',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=sc+'66';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+sc+'33, inset 0 1px 0 rgba(255,255,255,.08)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor=isToday?'rgba(212,160,23,.25)':'rgba(255,255,255,.08)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{textAlign:'center',minWidth:54,padding:'8px 10px',borderRadius:10,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}>
<div style={{fontSize:20,fontWeight:700,color:isToday?C.gold:'var(--tx2)',letterSpacing:'-.3px',lineHeight:1,direction:'ltr'}}>{a.date?.slice(8,10)}</div>
<div style={{fontSize:10,fontWeight:500,color:'var(--tx4)',marginTop:4,letterSpacing:'.2px'}}>{new Date(a.date+'T00:00').toLocaleDateString(lang==='ar'?'ar-SA':'en',{month:'short'})}</div>
</div>
<div style={{width:3,height:42,borderRadius:2,background:sc,flexShrink:0,boxShadow:'0 0 8px '+sc+'66'}}/>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:14,fontWeight:600,color:'var(--tx)',letterSpacing:'.15px',marginBottom:6}}>{a.title}</div>
<div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
{a.time&&<><span style={{fontFamily:"'JetBrains Mono',monospace",direction:'ltr',color:'var(--tx2)',fontWeight:600}}>{a.time?.slice(0,5)}</span><span style={{width:3,height:3,borderRadius:'50%',background:'var(--tx6)',opacity:.5}}/></>}
<span>{typeLabels[a.type]||a.type}</span>
{a.clients?.name_ar&&<><span style={{width:3,height:3,borderRadius:'50%',background:'var(--tx6)',opacity:.5}}/><span>{a.clients.name_ar}</span></>}
{a.location&&<><span style={{width:3,height:3,borderRadius:'50%',background:'var(--tx6)',opacity:.5}}/><span>{a.location}</span></>}
</div>
</div>
<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:sc+'15',color:sc,display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:sc}}/>{a.status}</span>
</div>})}</div>}
{pop&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(500px,96vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{padding:'16px 20px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:14,fontWeight:800,color:'var(--tx)'}}>{pop==='new'?T('موعد جديد','New Appointment'):T('تعديل الموعد','Edit')}</div><button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button></div>
<div style={{padding:'16px 20px',overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('العنوان','Title')} *</div><input value={f.title||''} onChange={e=>setF(p=>({...p,title:e.target.value}))} style={fS}/></div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('التاريخ','Date')}</div><input type="date" value={f.date||''} onChange={e=>setF(p=>({...p,date:e.target.value}))} style={{...fS,direction:'ltr',textAlign:'center'}}/></div>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('الوقت','Time')}</div><input type="time" value={f.time||''} onChange={e=>setF(p=>({...p,time:e.target.value}))} style={{...fS,direction:'ltr',textAlign:'center'}}/></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('النوع','Type')}</div><select value={f.type||''} onChange={e=>setF(p=>({...p,type:e.target.value}))} style={fS}>{Object.entries(typeLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('الحالة','Status')}</div><select value={f.status||''} onChange={e=>setF(p=>({...p,status:e.target.value}))} style={fS}><option value="scheduled">{T('مجدول','Scheduled')}</option><option value="confirmed">{T('مؤكد','Confirmed')}</option><option value="completed">{T('مكتمل','Completed')}</option><option value="cancelled">{T('ملغي','Cancelled')}</option></select></div>
</div>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('الموقع','Location')}</div><input value={f.location||''} onChange={e=>setF(p=>({...p,location:e.target.value}))} style={fS}/></div>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('ملاحظات','Notes')}</div><textarea value={f.notes||''} onChange={e=>setF(p=>({...p,notes:e.target.value}))} style={{...fS,height:60,padding:'8px 12px',resize:'none'}}/></div>
</div>
<div style={{padding:'12px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
<button onClick={save} style={{height:38,padding:'0 24px',borderRadius:10,background:C.gold,border:'none',color:C.dk,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer'}}>{T('حفظ','Save')}</button>
{pop!=='new'&&<button onClick={async()=>{await sb.from('appointments').update({deleted_at:new Date().toISOString()}).eq('id',pop);toast(T('تم الحذف','Deleted'));setPop(null);load()}} style={{height:38,padding:'0 18px',borderRadius:10,background:'rgba(192,57,43,.1)',border:'1px solid rgba(192,57,43,.15)',color:C.red,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('حذف','Delete')}</button>}
</div></div></div>}
</div>}

function OpExpensesPage({sb,toast,user,lang,branchId}){
const T=(a,e)=>lang==='ar'?a:e;const[data,setData]=useState([]);const[loading,setLoading]=useState(true);const[pop,setPop]=useState(null);const[month,setMonth]=useState(new Date().toISOString().slice(0,7));
const[f,setF]=useState({amount:'',category:'other',description:'',date:new Date().toISOString().slice(0,10),payment_method:'cash',vendor_name:'',is_recurring:false});
const cats={rent:T('إيجار','Rent'),salary:T('رواتب','Salary'),gov_fee:T('رسوم حكومية','Gov. Fee'),transport:T('نقل','Transport'),utilities:T('خدمات','Utilities'),office_supplies:T('مستلزمات مكتبية','Office Supplies'),maintenance:T('صيانة','Maintenance'),marketing:T('تسويق','Marketing'),insurance:T('تأمين','Insurance'),telecom:T('اتصالات','Telecom'),legal:T('قانوني','Legal'),other:T('أخرى','Other')};
const load=useCallback(async()=>{setLoading(true);let q=sb.from('operational_expenses').select('*,users:created_by(name_ar)').is('deleted_at',null).gte('date',month+'-01').lte('date',month+'-31');if(branchId)q=q.eq('branch_id',branchId);const{data:d}=await q.order('date',{ascending:false});setData(d||[]);setLoading(false)},[sb,month,branchId]);
useEffect(()=>{load()},[load]);
const total=data.reduce((s,r)=>s+Number(r.amount||0),0);
const save=async()=>{if(!f.amount){toast(T('خطأ: المبلغ مطلوب','Error: Amount required'));return}
const row={...f,amount:Number(f.amount),created_by:user?.id};delete row.users;
if(pop==='new'){const{error}=await sb.from('operational_expenses').insert(row);if(error){toast((lang==='ar'?'خطأ: ':'Error: ')+error.message);return}}
else{const{error}=await sb.from('operational_expenses').update(row).eq('id',pop);if(error){toast((lang==='ar'?'خطأ: ':'Error: ')+error.message);return}}
toast(T('تم الحفظ','Saved'));setPop(null);load()};
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'};
return<div style={{fontFamily:"'Cairo',sans-serif",paddingTop:0}}>
{/* ═══ Page header (Kafala-style) ═══ */}
<div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:24,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px',lineHeight:1.2}}>{T('المصاريف التشغيلية','Operational Expenses')}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>{T('متابعة المصاريف الشهرية وتصنيفها وتحليل أعلى البنود','Track monthly expenses, categorize them, and analyze top items')}</div>
</div>
<div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0,flexWrap:'wrap'}}>
<input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{height:40,padding:'0 14px',borderRadius:11,border:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'var(--tx)',fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:500,outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',direction:'ltr'}}/>
<button onClick={()=>exportToExcel(data,[['date',T('التاريخ','Date')],['category',T('التصنيف','Category')],['amount',T('المبلغ','Amount')],['description',T('الوصف','Description')],['vendor_name',T('المورد','Vendor')]],'expenses_'+month)} style={{height:40,padding:'0 14px',borderRadius:11,border:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'rgba(255,255,255,.78)',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:500,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}>Excel ↓</button>
<button onClick={()=>{setF({amount:'',category:'other',description:'',date:new Date().toISOString().slice(0,10),payment_method:'cash',vendor_name:'',is_recurring:false});setPop('new')}} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
{T('مصروف','New')}
</button>
</div></div>
{/* ═══ Stats cards (Kafala glass card with embedded pills) ═══ */}
{(()=>{const catTotals={};data.forEach(r=>{catTotals[r.category]=(catTotals[r.category]||0)+Number(r.amount||0)});const topCat=Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];const catColors={rent:C.gold,salary:C.blue,gov_fee:C.red,transport:'#9b59b6',utilities:'#e67e22',maintenance:'#1abc9c',other:'#888'}
const stats=[{l:T('إجمالي الشهر','Month Total'),v:Number(total).toLocaleString(),c:C.red,sub:T('ر.س','SAR')},{l:T('عدد المصاريف','Count'),v:data.length,c:C.gold},{l:T('الأعلى صرفاً','Top Category'),v:topCat?(cats[topCat[0]]||topCat[0]):'—',c:C.blue,sub:topCat?Number(topCat[1]).toLocaleString():null},{l:T('المتوسط','Average'),v:data.length>0?Number(Math.round(total/data.length)).toLocaleString():'0',c:'rgba(255,255,255,.85)'}]
return<>
<div style={{background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:'10px 12px',marginBottom:14,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
{stats.map((s,i)=><div key={i} style={{padding:'7px 12px',borderRadius:10,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
<span style={{width:6,height:6,borderRadius:'50%',background:s.c,boxShadow:'0 0 5px '+s.c,flexShrink:0}}/>
<div style={{fontSize:i===2?14:18,fontWeight:700,color:s.c,letterSpacing:'-.3px',direction:'ltr',lineHeight:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0}}>{s.v}</div>
{s.sub&&<span style={{fontSize:10,fontWeight:500,color:'var(--tx5)',whiteSpace:'nowrap'}}>{s.sub}</span>}
</div>
<div style={{fontSize:11,color:'var(--tx2)',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.l}</div>
</div>)}
</div>
</div>
{/* Category breakdown chips */}
{Object.keys(catTotals).length>0&&<div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
{Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{const c=catColors[k]||'#888';return<div key={k} style={{padding:'7px 12px',borderRadius:10,background:'linear-gradient(180deg,'+c+'14 0%,'+c+'08 100%)',border:'1px solid '+c+'33',display:'flex',alignItems:'center',gap:6,boxShadow:'inset 0 1px 0 '+c+'18'}}>
<span style={{width:6,height:6,borderRadius:'50%',background:c,boxShadow:'0 0 5px '+c}}/>
<span style={{fontSize:11,fontWeight:600,color:c}}>{cats[k]||k}</span>
<span style={{fontSize:11,fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace",direction:'ltr'}}>{Number(v).toLocaleString()}</span>
</div>})}
</div>}
</>})()}
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)',fontSize:13}}>{T('جاري التحميل...','Loading...')}</div>:data.length===0?
<div style={{textAlign:'center',padding:'60px 20px',background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',borderRadius:16,border:'1px solid rgba(255,255,255,.08)',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{fontSize:14,fontWeight:600,color:'var(--tx3)',letterSpacing:'.15px'}}>{T('لم تُسجّل مصاريف لشهر '+new Date(month+'-01').toLocaleDateString('ar-SA',{year:'numeric',month:'long'}),'No expenses for this month')}</div>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx5)',marginTop:8}}>{T('أضف أول مصروف باستخدام الزر أعلاه','Add your first expense using the button above')}</div>
</div>:
<div style={{background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontFamily:"'Cairo',sans-serif",fontSize:12}}>
<thead><tr style={{background:'rgba(0,0,0,.18)',borderBottom:'1px solid rgba(255,255,255,.06)'}}>{[T('التاريخ','Date'),T('التصنيف','Category'),T('الوصف','Description'),T('المورد','Vendor'),T('المبلغ','Amount')].map(h=><th key={h} style={{padding:'12px 14px',fontSize:11,fontWeight:600,color:'var(--tx3)',textAlign:'right',letterSpacing:'.3px'}}>{h}</th>)}</tr></thead>
<tbody>{data.map(r=>{const cc={rent:C.gold,salary:C.blue,gov_fee:C.red,transport:'#9b59b6',utilities:'#e67e22',other:'#888'}[r.category]||'#888';return<tr key={r.id} onClick={()=>{setF({...r});setPop(r.id)}} style={{cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,.04)',transition:'.18s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(212,160,23,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><td style={{padding:'12px 14px',fontSize:12,fontWeight:500,color:'var(--tx4)'}}>{r.date?new Date(r.date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}):'—'}</td><td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:cc+'15',color:cc,display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:cc}}/>{cats[r.category]||r.category}</span></td><td style={{padding:'12px 14px',fontSize:12,fontWeight:500,color:'var(--tx2)'}}>{r.description||'—'}</td><td style={{padding:'12px 14px',fontSize:12,fontWeight:500,color:'var(--tx4)'}}>{r.vendor_name||'—'}</td><td style={{padding:'12px 14px',fontSize:14,fontWeight:600,color:C.red,direction:'ltr',textAlign:'left',fontFamily:"'JetBrains Mono',monospace"}}>{Number(r.amount).toLocaleString()}</td></tr>})}</tbody>
</table></div>}
{pop&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(480px,96vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{padding:'16px 20px',borderBottom:'1px solid var(--bd)',fontSize:14,fontWeight:800,color:'var(--tx)'}}>{pop==='new'?T('مصروف جديد','New Expense'):T('تعديل','Edit')}</div>
<div style={{padding:'16px 20px',overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('المبلغ','Amount')} *</div><input type="number" value={f.amount||''} onChange={e=>setF(p=>({...p,amount:e.target.value}))} style={{...fS,direction:'ltr',textAlign:'center'}}/></div>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('التصنيف','Category')}</div><select value={f.category||''} onChange={e=>setF(p=>({...p,category:e.target.value}))} style={fS}>{Object.entries(cats).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
</div>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('الوصف','Description')}</div><input value={f.description||''} onChange={e=>setF(p=>({...p,description:e.target.value}))} style={fS}/></div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('التاريخ','Date')}</div><input type="date" value={f.date||''} onChange={e=>setF(p=>({...p,date:e.target.value}))} style={{...fS,direction:'ltr',textAlign:'center'}}/></div>
<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{T('المورد','Vendor')}</div><input value={f.vendor_name||''} onChange={e=>setF(p=>({...p,vendor_name:e.target.value}))} style={fS}/></div>
</div></div>
<div style={{padding:'12px 20px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
<button onClick={save} style={{height:38,padding:'0 24px',borderRadius:10,background:C.gold,border:'none',color:C.dk,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer'}}>{T('حفظ','Save')}</button>
</div></div></div>}
</div>}

function Logo({size=60,style:sx}){const s=size*.6;const fs=Math.max(5,size*.08);return<div style={{width:size,height:size,borderRadius:'50%',background:'linear-gradient(145deg,rgb(28,28,28),rgb(26,26,26))',border:'1.5px solid rgba(212,160,23,.22)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxShadow:'0 0 40px rgba(212,160,23,.12),0 0 0 6px rgba(212,160,23,.03)',margin:'0 auto',...sx}}><svg width={s} height={s*.72} viewBox="0 0 60 40" fill="none"><path d="M6 36 C6 16 18 4 30 4 C42 4 54 16 54 36" stroke="#D4A017" strokeWidth="3" fill="none"/><line x1="18" y1="36" x2="18" y2="22" stroke="#D4A017" strokeWidth="2"/><line x1="30" y1="36" x2="30" y2="4" stroke="#D4A017" strokeWidth="2"/><line x1="42" y1="36" x2="42" y2="22" stroke="#D4A017" strokeWidth="2"/><line x1="4" y1="36" x2="56" y2="36" stroke="#D4A017" strokeWidth="2.5"/></svg><div style={{fontSize:fs,fontWeight:800,color:'var(--tx3)',letterSpacing:3,marginTop:1}}>JISR</div></div>}

function BrandPanel({lang,L}){return<div style={{flex:1,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'radial-gradient(ellipse 110% 90% at 50% 45%,rgb(26,26,26),rgb(12,12,12) 70%)'}}><div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)',backgroundSize:'44px 44px'}}/><div style={{position:'absolute',top:0,bottom:0,width:1,[lang==='ar'?'right':'left']:0,background:'linear-gradient(180deg,transparent,rgba(212,160,23,.2) 20%,rgba(212,160,23,.45) 50%,rgba(212,160,23,.2) 80%,transparent)'}}/><div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'40px 48px'}}><div style={{position:'relative',width:210,height:210,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:30}}><svg viewBox="0 0 200 200" fill="none" style={{position:'absolute',inset:0,animation:'spin 22s linear infinite'}}><circle cx="100" cy="100" r="96" stroke="rgba(212,160,23,.18)" strokeWidth="1" strokeDasharray="8 7"/><circle cx="100" cy="100" r="80" stroke="rgba(212,160,23,.07)" strokeWidth="0.8" strokeDasharray="4 9"/><circle cx="100" cy="4" r="2.5" fill="rgba(212,160,23,.6)"/><circle cx="196" cy="100" r="2.5" fill="rgba(212,160,23,.3)"/><circle cx="100" cy="196" r="2.5" fill="rgba(212,160,23,.6)"/><circle cx="4" cy="100" r="2.5" fill="rgba(212,160,23,.3)"/><circle cx="148" cy="18" r="1.5" fill="rgba(212,160,23,.2)"/><circle cx="182" cy="52" r="1.5" fill="rgba(212,160,23,.15)"/><circle cx="18" cy="148" r="1.5" fill="rgba(212,160,23,.2)"/><circle cx="52" cy="182" r="1.5" fill="rgba(212,160,23,.15)"/></svg><div style={{position:'absolute',inset:22,borderRadius:'50%',border:'1px solid rgba(212,160,23,.07)',animation:'spin 14s linear infinite reverse'}}/><div style={{position:'absolute',inset:10,borderRadius:'50%',background:'radial-gradient(circle,rgba(212,160,23,.09),transparent 65%)',animation:'breathe 4s ease-in-out infinite'}}/><Logo size={125}/></div><p style={{fontSize:15,fontWeight:400,color:'rgba(255,255,255,.58)',lineHeight:2}}>{L.tagline}<br/>{L.tagline2}</p></div></div>}

function LangBtn({L,switchLang,abs}){const isToEn=L.otherLang==='English';const s=abs?{position:'absolute',top:22,[isToEn?'left':'right']:22,zIndex:10}:{};return<><style>{`.lang-btn svg text{fill:rgba(255,255,255,.7);transition:fill .2s}.lang-btn:hover svg text{fill:#D4A017}`}</style><div className="lang-btn" onClick={switchLang} title={isToEn?'English':'العربية'} style={{...s,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontFamily:F,padding:4}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><text x="12" y="18" textAnchor="middle" fontSize="18" fontFamily="Cairo, Tajawal, sans-serif" fontWeight="700">{isToEn?'E':'ع'}</text></svg></div></>}

function FField({label,value,set,ph,ltr,type,small}){return<div style={{flex:1}}><div style={{fontSize:'clamp(10px,1.5vw,11px)',fontWeight:700,color:'var(--tx3)',marginBottom:'clamp(3px,.5vw,5px)'}}>{label}</div><input value={value} onChange={e=>set(e.target.value)} type={type||'text'} placeholder={ph||''} style={{width:'100%',height:'clamp(38px,5vw,42px)',background:'rgba(255,255,255,.07)',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,padding:'0 13px',fontFamily:F,fontSize:small?'clamp(9px,1.2vw,10px)':'clamp(11px,1.6vw,12px)',fontWeight:600,color:'var(--tx)',outline:'none',direction:ltr?'ltr':'rtl',textAlign:ltr?'left':'right'}}/></div>}

function GoldBar(){return<div style={{position:'absolute',top:0,left:0,right:0,height:3,borderRadius:'20px 20px 0 0',background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,'+C.gl+' 50%,'+C.gold+' 70%,transparent)',zIndex:1}}/>}

function Badge({v}){const m={active:C.ok,paid:C.ok,completed:C.ok,issue:C.red,cancelled:C.red,suspended:'#e67e22',overdue:C.red,draft:'#999',pending:C.gold,in_progress:C.blue,partial:C.gold,unpaid:C.red,red:C.red,yellow:'#f1c40f',green_low:C.ok,green_mid:C.ok,green_high:C.ok,platinum:C.gold,urgent:C.red,high:'#e67e22',normal:C.blue,low:'#999'};const c=m[v]||'#999';return<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:c+'15',color:c,display:'inline-flex',alignItems:'center',gap:3}}><span style={{width:4,height:4,borderRadius:'50%',background:c}}/>{v||'\u2014'}</span>}

function Css(){return<style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');:root,html[data-theme=dark]{--bg:#1F1F1F;--sf:#2A2A2A;--sb:#171717;--hd:#1A1A1A;--card-bg:#2A2A2A;--modal-bg:#1A1A1A;--modal-input-bg:linear-gradient(180deg,#323232 0%,#262626 100%);--search-bg:#2F2F2F;--choice-bg:#2F2F2F;--tx:rgba(255,255,255,.92);--tx2:rgba(255,255,255,.82);--tx3:rgba(255,255,255,.55);--tx4:rgba(255,255,255,.4);--tx5:rgba(255,255,255,.28);--tx6:rgba(255,255,255,.15);--sbtx:rgba(255,255,255,.88);--sbtx2:rgba(255,255,255,.5);--sbtx3:rgba(255,255,255,.3);--hdtx:rgba(255,255,255,.9);--bd:rgba(255,255,255,.07);--bd2:rgba(255,255,255,.04);--inputBg:rgba(255,255,255,.07);--inputBd:rgba(255,255,255,.12);--hoverBg:rgba(255,255,255,.04);--overlayBg:rgba(8,8,8,.82);--shadowClr:rgba(0,0,0,.5);--afBg:#1C1C1C;--safe-b:env(safe-area-inset-bottom,0px)}html[data-theme=light]{--bg:#faf8f3;--sf:#f2efe6;--sb:#2c2518;--hd:#342c1e;--tx:rgba(40,32,18,.88);--tx2:rgba(50,42,25,.72);--tx3:rgba(90,75,50,.52);--tx4:rgba(110,95,65,.42);--tx5:rgba(130,110,80,.3);--tx6:rgba(150,130,95,.15);--sbtx:rgba(255,255,255,.88);--sbtx2:rgba(255,255,255,.5);--sbtx3:rgba(255,255,255,.3);--hdtx:rgba(255,255,255,.9);--bd:rgba(120,100,60,.1);--bd2:rgba(120,100,60,.06);--inputBg:rgba(0,0,0,.04);--inputBd:rgba(120,100,60,.18);--hoverBg:rgba(0,0,0,.03);--overlayBg:rgba(240,235,225,.9);--shadowClr:rgba(80,60,20,.2);--afBg:#f2efe6}html,body,#root{overflow:hidden;height:100%;width:100%;max-width:100vw;font-size:14px;line-height:1.65;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}*{margin:0;padding:0;box-sizing:border-box;transition:background-color .3s,border-color .25s,color .25s}*::-webkit-scrollbar{width:4px;height:4px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:var(--tx6);border-radius:4px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes breathe{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}@keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}input:focus,select:focus,textarea:focus{box-shadow:none!important;outline:none!important}.topbar-search-box input:focus{border-color:transparent!important;box-shadow:none!important}input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,input:-webkit-autofill:active{-webkit-box-shadow:0 0 0 1000px #2C2C2C inset!important;box-shadow:0 0 0 1000px #2C2C2C inset!important;-webkit-text-fill-color:rgba(255,255,255,.92)!important;caret-color:rgba(255,255,255,.92)!important;transition:background-color 9999s ease-in-out 0s!important}button:hover:not(:disabled){filter:brightness(1.06)}button:active:not(:disabled){filter:brightness(.9)}select{background-color:var(--sf)!important;color:var(--tx)!important}select option{background:var(--sf);color:var(--tx)}.mob-bottom-nav{display:none}.mob-hamburger{display:none!important}.mob-overlay{display:none!important}.dash-side{transition:transform .35s cubic-bezier(.32,.72,.0,1)}@media(max-width:900px){.login-brand,.setup-brand{display:none!important}.login-wrap,.setup-wrap{flex-direction:column!important}.login-form,.setup-form{width:100%!important;max-width:100%!important;min-height:100vh!important;box-shadow:none!important}}@media(max-width:768px){.dash-side{position:fixed!important;top:0!important;bottom:0!important;width:280px!important;max-height:100vh!important;height:100vh!important;z-index:200!important;transform:translateX(100%)!important;box-shadow:-8px 0 40px rgba(0,0,0,.5)!important;border:none!important;overflow-y:auto!important;flex-direction:column!important;}[dir=rtl] .dash-side{right:0!important;left:auto!important;transform:translateX(100%)!important}[dir=ltr] .dash-side{left:0!important;right:auto!important;transform:translateX(-100%)!important}.dash-side.side-open{transform:translateX(0)!important}.mob-overlay{display:block!important;animation:fadeIn .2s ease}.mob-hamburger{display:flex!important}.dash-header{padding:0 12px!important;gap:8px!important}.topbar-datetime{display:none!important}.topbar-weekly{display:none!important}.topbar-weekly span{display:none!important}.topbar-search-box{min-width:120px!important}.topbar-search-box input{font-size:11px!important}.breadcrumb-area span{font-size:13px!important}.breadcrumb-area span:not(:last-child){display:none!important}.dash-content{padding:16px 14px 80px!important}.mob-bottom-nav{display:flex!important;position:fixed!important;bottom:0!important;left:0!important;right:0!important;height:calc(64px + var(--safe-b))!important;padding-bottom:var(--safe-b)!important;background:var(--sb)!important;border-top:1px solid rgba(212,160,23,.15)!important;z-index:198!important;align-items:flex-start!important;padding-top:6px!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important;box-shadow:0 -4px 20px rgba(0,0,0,.3)!important;}input,select,textarea{font-size:16px!important}}@media(max-width:480px){.dash-side{width:85vw!important;max-width:300px!important}.dash-header{height:48px!important;padding:0 10px!important;gap:6px!important}.dash-content{padding:12px 10px 85px!important}.breadcrumb-area span{font-size:14px!important;font-weight:800!important}.topbar-search-box{min-width:34px!important;width:34px!important;padding:0!important;justify-content:center!important;overflow:hidden!important}.topbar-search-box input{width:0!important;padding:0!important;opacity:0!important}.topbar-search-box:focus-within{width:180px!important;min-width:180px!important;padding:0 10px!important}.topbar-search-box:focus-within input{width:100%!important;opacity:1!important}.mob-bottom-nav{height:calc(64px + var(--safe-b))!important}table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}}@media(max-width:360px){.dash-header{gap:4px!important}.dash-content{padding:8px 6px 85px!important}.mob-bottom-nav div span{font-size:9px!important}}@supports(padding:max(0px)){.mob-bottom-nav{padding-bottom:max(var(--safe-b),8px)!important}.dash-content{padding-bottom:max(calc(16px + var(--safe-b)),16px)!important}}@media(max-height:500px) and (max-width:900px){.mob-bottom-nav{height:44px!important;padding-top:2px!important}.mob-bottom-nav svg{width:16px!important;height:16px!important}.mob-bottom-nav span{display:none!important}.dash-content{padding-bottom:55px!important}.dash-side{width:240px!important}}.mob-bottom-nav div>div[style]{transition:width .2s ease!important}.pwa-standalone .dash-header{padding-top:env(safe-area-inset-top)!important}.pwa-standalone .mob-bottom-nav{padding-bottom:max(env(safe-area-inset-bottom),12px)!important;height:calc(70px + env(safe-area-inset-bottom))!important}.pwa-standalone .dash-side{padding-top:env(safe-area-inset-top)!important}.pwa-standalone .login-wrap,.pwa-standalone .setup-wrap{padding-top:env(safe-area-inset-top)!important}.install-banner{animation:slideUp .4s cubic-bezier(.4,0,.2,1)}@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.mob-bottom-nav div{transition:transform .15s ease,opacity .15s ease!important}.mob-bottom-nav div:active{transform:scale(.9)!important;opacity:.7!important}@media(max-width:768px){.dash-header{backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important}.dash-content{scroll-behavior:smooth!important;-webkit-overflow-scrolling:touch!important}}@media print{.dash-side,.dash-header,.mob-bottom-nav{display:none!important}.dash-content{padding:16px!important}body{padding:16px}}"}</style>}

const finS={width:'100%',height:44,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',border:'1px solid rgba(255,255,255,.07)',borderRadius:11,padding:'0 48px',fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',outline:'none',direction:'ltr',textAlign:'center',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}
const goldS={width:'100%',height:48,background:'linear-gradient(180deg,#E5B025 0%,#C49213 100%)',border:'1px solid rgba(212,160,23,.5)',borderRadius:12,fontFamily:F,fontSize:16,fontWeight:700,color:C.dk,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 4px 12px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.18)',transition:'.2s'}
const gBtn={height:34,padding:'0 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(212,160,23,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}
const tBtn={width:28,height:28,borderRadius:6,border:'1px solid rgba(212,160,23,.1)',background:'transparent',display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',marginLeft:4,color:'var(--tx4)',fontFamily:F,fontSize:10}
const lInp={width:'100%',padding:'0 10px',border:'1px solid rgba(212,160,23,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:500,color:'var(--tx)',background:'rgba(255,255,255,.06)',outline:'none',textAlign:'right'}
const num=v=>Number(v||0).toLocaleString('en-US')

function IInp({l,v,s,d,t}){return<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{l}</div><input value={v} onChange={e=>s(e.target.value)} type={t||'text'} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.13)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',direction:d?'ltr':'rtl',textAlign:d?'left':'right',background:'rgba(255,255,255,.06)'}}/></div>}
