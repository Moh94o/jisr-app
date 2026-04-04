import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import InvoicePageFull from './InvoicePage.jsx'
import SettingsPageFull from './SettingsPage.jsx'
import AdminPageFull from './AdminPage.jsx'
import BranchesPage from './BranchesPage.jsx'
import FacilitiesPage from './FacilitiesPage.jsx'
import WorkforcePage from './WorkforcePage.jsx'
import TransactionsPage from './DynamicTransactionEngine.jsx'
import TasksPageV2 from './TasksPageV2.jsx'
import DataPage from './DataPage.jsx'
import KPIPage from './KPIPage.jsx'
import AutoAlertsPage from './AutoAlertsPage.jsx'
import EmployeePerformancePage from './EmployeePerformancePage.jsx'
import CashFlowPage from './CashFlowPage.jsx'
import SLAPage from './SLAPage.jsx'
import CalendarPage from './CalendarPage.jsx'
import ProfitabilityPage from './ProfitabilityPage.jsx'
import LiveMonitorPage from './LiveMonitorPage.jsx'
import WorkflowPage from './WorkflowPage.jsx'
import MessagingPage from './MessagingPage.jsx'
import ManpowerPage from './ManpowerPage.jsx'
import { ContractsPage, ArchivePage, SuppliersPage, WorkerLeavesPage, BudgetPage } from './ComplianceSuitePage.jsx'
import DataImportPage from './DataImportPage.jsx'
import BranchComparisonPage from './BranchComparisonPage.jsx'
import NPSPage from './NPSPage.jsx'
import AttendancePage from './AttendancePage.jsx'
import WeeklyReportPage from './WeeklyReportPage.jsx'
import PricingCalcPage from './PricingCalcPage.jsx'
import CompliancePage from './CompliancePage.jsx'
import KafalaCalculator from './pages/KafalaCalculator.jsx'
import OTPMessages from './pages/OTPMessages.jsx'

import { getSupabase, saveConfig, clearConfig, getSavedConfig } from './lib/supabase.js'
import { exportToExcel, importFromCSV, sendWhatsApp, buildWhatsAppMessage, printContent, generateClientStatement, checkDuplicate, setupKeyboardShortcuts, calculateNitaqat, num as numFmt } from './lib/utils.js'

const C = { dk:'#171717', md:'#222222', fm:'#1e1e1e', gold:'#c9a84c', gl:'#dcc06e', brd:'rgba(255,255,255,.13)', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const F = "'Cairo','Tajawal',sans-serif"

const ICO = {
  email: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" fill="rgba(201,168,76,.15)" stroke="rgba(201,168,76,.5)" strokeWidth="1.5"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" stroke="rgba(201,168,76,.7)" strokeWidth="1.5"/></svg>,
  lock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2.5" fill="rgba(201,168,76,.15)" stroke="rgba(201,168,76,.5)" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="rgba(201,168,76,.7)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="rgba(201,168,76,.5)"/></svg>,
  unlock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2.5" fill="#141414" fillOpacity=".2" stroke="#141414" strokeWidth="2"/><path d="M7 11V7a5 5 0 019.9-1" stroke="#141414" strokeWidth="2.5" strokeLinecap="round" opacity=".6"/><circle cx="12" cy="16" r="1.5" fill="#141414"/></svg>,
  bolt: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="rgba(201,168,76,.2)" stroke="rgba(201,168,76,.6)" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
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
  ar:{dir:'rtl',otherFlag:'\u{1F1FA}\u{1F1F8}',otherLang:'English',title:'\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643',sub:'\u0633\u062c\u0651\u0644 \u062f\u062e\u0648\u0644\u0643 \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0646\u0638\u0627\u0645',email:'\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',pass:'\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',remember:'\u062a\u0630\u0643\u0651\u0631\u0646\u064a',forgot:'\u0646\u0633\u064a\u062a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061f',login:'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',firstTime:'\u0623\u0648\u0644 \u0645\u0631\u0629\u061f',setup:'\u0625\u0639\u062f\u0627\u062f \u0623\u0648\u0644\u064a \u2014 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0639\u0627\u0645',ver:'\u062c\u0633\u0631 \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u2014 \u0627\u0644\u0646\u0633\u062e\u0629 1.3',tagline:'\u062c\u0633\u0631 \u0644\u0644\u0623\u0639\u0645\u0627\u0644',tagline2:'\u0645\u0646\u0634\u0622\u062a \u00b7 \u0639\u0645\u0627\u0644 \u00b7 \u0641\u0648\u0627\u062a\u064a\u0631 \u00b7 \u0645\u0639\u0627\u0645\u0644\u0627\u062a \u00b7 \u062a\u0642\u0627\u0631\u064a\u0631',setupTitle:'\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0639\u0627\u0645',setupSub:'\u0623\u0648\u0644 \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0646\u0638\u0627\u0645 \u2014 \u064a\u0645\u0644\u0643 \u0643\u0644 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a',nameAr:'\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064a *',nameEn:'\u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a',idNum:'\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064a\u0629',phone:'\u0627\u0644\u062c\u0648\u0627\u0644',emailLbl:'\u0627\u0644\u0628\u0631\u064a\u062f *',pw:'\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 *',pwConfirm:'\u062a\u0623\u0643\u064a\u062f *',create:'\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628',back:'\u2190 \u0631\u062c\u0648\u0639',successTitle:'\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628 \u0628\u0646\u062c\u0627\u062d!',successSub:'\u0633\u062c\u0651\u0644 \u062f\u062e\u0648\u0644\u0643 \u0627\u0644\u0622\u0646',goLogin:'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u2192',configTitle:'\u0627\u062a\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',configSub:'Supabase \u2192 Settings \u2192 API'},
  en:{dir:'ltr',otherFlag:'\u{1F1F8}\u{1F1E6}',otherLang:'\u0627\u0644\u0639\u0631\u0628\u064a\u0629',title:'Welcome Back',sub:'Sign in to access the system',email:'Email Address',pass:'Password',remember:'Remember me',forgot:'Forgot password?',login:'Sign In',firstTime:'First time?',setup:'Initial Setup \u2014 Create Super Admin',ver:'Jisr Business \u2014 v1.3',tagline:'Jisr Business',tagline2:'Facilities \u00b7 Workers \u00b7 Invoices \u00b7 Transactions \u00b7 Reports',setupTitle:'Create Super Admin Account',setupSub:'First account \u2014 has all permissions',nameAr:'Name (Arabic) *',nameEn:'Name (English)',idNum:'ID Number',phone:'Phone',emailLbl:'Email *',pw:'Password *',pwConfirm:'Confirm *',create:'Create Account',back:'Back \u2192',successTitle:'Account Created!',successSub:'Sign in with your email and password',goLogin:'Go to Login \u2192',configTitle:'Connect to Database',configSub:'Supabase \u2192 Settings \u2192 API'}
}
const TR={'الاسم':'Name','الاسم بالعربي':'Name (Arabic)','الاسم بالإنجليزي':'Name (English)','الرقم':'Number','الرقم الموحد':'Unified No.','السجل':'CR No.','حالة السجل':'CR Status','الحالة':'Status','نطاقات':'Nitaqat','الجنسية':'Nationality','الجوال':'Phone','الإقامة':'Iqama','الهوية':'ID','النوع':'Type','المبلغ':'Amount','الدفع':'Payment','التاريخ':'Date','المرجع':'المرجع','البنك':'Bank','الترتيب':'Order','البداية':'Start','النهاية':'End','النقاط':'Points','المستخدم':'Username','الجنس':'Gender','نشط':'Active','الكود':'Code','بالإنجليزي':'English','المفتاح':'Key','نظامي':'System','القيمة':'Value','اسم الملف':'File Name','نوع الكيان':'Entity Type','نوع الملف':'File Type','الانتهاء':'Expiry','الإصدار':'Version','شركة التأمين':'Insurance Company','رقم الوثيقة':'Policy No.','الوثيقة':'Document','مدير':'Manager','نسبة الملكية':'Ownership %','السنة':'Year','بداية الأسبوع':'Week Start','الربط':'Linked','الفك':'Unlinked','الأولوية':'Priority','البدء':'Start','الاستحقاق':'Due','السداد':'Payment','الطريقة':'Method','رقم العامل':'Worker No.','المنشأة':'Facility','المكتب':'Branch','الوسيط':'Broker','تاريخ الميلاد':'Birth Date','رقم الإقامة':'Iqama No.','رقم الحدود':'Border No.','رقم الجواز':'Passport No.','انتهاء الجواز':'Passport Expiry','المهنة':'Occupation','تاريخ دخول المملكة':'Entry Date','طريقة الالتحاق':'Joining Method','صاحب العمل السابق':'Previous Employer','رقم صاحب العمل السابق':'Previous Employer ID','تاريخ نقل الكفالة':'Sponsorship Transfer Date','حالة التأمينات':'GOSI Status','راتب التأمينات':'GOSI Salary','راتب قوى':'Qiwa Salary','انتهاء عقد قوى':'Qiwa Contract Expiry','حالة عقد قوى':'Qiwa Contract Status','حالة العامل':'Worker Status','خارج المملكة':'Outside Kingdom','يملك مركبة':'Has Vehicle','عدد المرافقين':'Dependents','ملف مكتمل':'Complete File','ملاحظات':'Notes','رقم العميل':'Client No.','نوع الهوية':'ID Type','رقم الهوية':'ID Number','البريد الإلكتروني':'Email','العنوان':'Address','الوسيط المُحيل':'Referring Broker','نوع العمولة':'Commission Type','نسبة/مبلغ العمولة':'Commission Rate','اسم البنك':'Bank Name','رقم الحساب البنكي':'Bank Account No.','رقم الآيبان':'IBAN','رقم المعاملة':'Transaction No.','نوع المعاملة':'Transaction Type','العميل':'Client','العامل':'Worker','سبب الإلغاء':'Cancellation Reason','تاريخ البدء':'Start Date','تاريخ الاستحقاق':'Due Date','تاريخ الإنجاز':'Completion Date','الفاتورة':'Invoice','ترتيب القسط':'Installment Order','المرحلة':'Milestone','تاريخ السداد':'Payment Date','رقم المصروف':'Expense No.','نوع المصروف':'Expense Type','التصنيف':'Category','المعاملة':'Transaction','رقم وثيقة التأمين':'Policy No.','تاريخ البداية':'Start Date','تاريخ النهاية':'End Date','السنة الهجرية':'Hijri Year','المالك':'Owner','منشأة المالك':'Owner Facility','مدير المنشأة':'Facility Manager','نسبة الملكية %':'Ownership %','نوع المنصة':'Platform Type','حالة الاشتراك':'Subscription Status','رصيد النقاط':'Points Balance','نوع البيانات':'Credential Type','اسم المستخدم':'Username','كلمة المرور':'Password','الجوال المرتبط':'Linked Phone','البريد المرتبط':'Linked Email','المنشأة المعفاة':'Exempt Facility','المنشأة المرتبطة':'Linked Facility','تاريخ الربط':'Link Date','تاريخ الفك':'Unlink Date','ربط بواسطة':'Linked By','فك بواسطة':'Unlinked By','المنطقة':'Region','مفتاح القائمة':'List Key','القائمة':'List','القيمة بالعربي':'Value (Arabic)','القيمة بالإنجليزي':'Value (English)','العنصر الأب':'Parent Item','بيانات إضافية (JSON)':'Metadata (JSON)','معرف الكيان':'Entity ID','نوع الوثيقة':'Document Type','مسار الملف':'File Path','حجم الملف (بايت)':'File Size (bytes)','رقم الإصدار':'Version No.','تاريخ الانتهاء':'Expiry Date','طريقة الدفع':'Payment Method','تاريخ الدفع':'Payment Date','المستلم':'Collected By','رقم المرجع':'Reference No.','الشكل القانوني':'Legal Form','عدد الشخصيات':'Character Count','حالة المنشأة':'Facility Status','رأس المال':'Capital','النشاط الاقتصادي':'Economic Activity','رقم السجل التجاري':'CR Number','تاريخ إصدار السجل':'CR Issue Date','تاريخ التصديق':'Confirmation Date','تاريخ الشطب':'Deletion Date','رقم نسخة السجل':'CR Version','سجل رئيسي':'Main CR','أنشطة السجل':'CR Activities','المنشأة الأم':'Parent Facility','مالك التأمينات':'GOSI Owner','المدينة':'City','رقم ملف قوى':'Qiwa File No.','رقم ملف التأمينات':'GOSI File No.','رقم عضوية الغرفة':'Chamber No.','انتهاء عضوية الغرفة':'Chamber Expiry','تأشيرة دائمة':'Permanent Visa','تأشيرة مؤقتة':'Temporary Visa','نقل خدمات':'Service Transfer','مستثنى أصلي':'Originally Exempt','رقم ض.ق.م':'VAT No.','حالة الضريبة':'VAT Status','رقم الزكاة':'Zakat No.','حجم نطاقات':'Nitaqat Size','إجمالي العمال':'Total Workers','العمال في نطاقات':'Workers in Nitaqat','سعوديين':'Saudis','سعوديين في نطاقات':'Saudis in Nitaqat','غير سعوديين':'Non-Saudis','غير سعوديين في نطاقات':'Non-Saudis in Nitaqat','نسبة السعودة':'Saudization %','نسبة توثيق العقود':'Contract Auth %','نسبة حماية الأجور':'WPS Compliance %','عقود موثقة':'Authenticated Contracts','عقود غير موثقة':'Unauthenticated','تأشيرات متاحة':'Available Visas','مستخدمة':'Used','غير مستخدمة':'Not Used','ملغاة':'Cancelled','رخص منتهية':'Expired Permits','صادرة هذا العام':'Issued This Year','نموذج التأمينات':'GOSI Form','إجمالي المشتركين':'Total Contributors','مشتركين سعوديين':'Saudi Contributors','مشتركين غير سعوديين':'Non-Saudi Contributors','مشتركين نشطين':'Active Contributors','مشتركين غير نشطين':'Inactive Contributors','إجمالي الاشتراكات':'Total Contributions','إجمالي المديونية':'Total Debit','الغرامات':'Penalties','إجمالي الالتزامات':'Total Obligations','مدد - حماية الأجور':'Mudad WPS','حالة مدد':'Mudad Status','حالة خدمات العمل':'Labor Service Status','عمال أجير مستعارين':'Ajeer Borrowed Workers','عقود أجير نشطة':'Ajeer Active Contracts','رصيد الزكاة المستحق':'Zakat Balance','جوال شخصي':'Personal Phone','جوال عمل':'Work Phone','تاريخ الميلاد ميلادي':'Birth Date (Gregorian)','تاريخ الميلاد هجري':'Birth Date (Hijri)','قريب':'Relative','جاري التحميل...':'Loading...','إضافة':'Add','حفظ':'Save','تعديل':'Edit','حذف':'Delete','حذف؟':'Delete?','تم الحفظ':'Saved','تم الحذف':'Deleted','خطأ':'Error','إلغاء':'Cancel','بحث...':'Search...','لا توجد بيانات':'No data','الإعدادات العامة':'General Settings','الخدمات':'Services','الخانات والعناصر':'Lists & Items','الدول والجنسيات والسفارات':'Countries & Nationalities','المناطق والمدن':'Regions & Cities','الوثائق':'Documents','المكاتب':'Branches','الحسابات البنكية':'Bank Accounts','الموظفين':'Employees','الأدوار والصلاحيات':'Roles & Permissions','قوالب المعاملات':'Transaction Templates','الملف الشخصي':'Profile','تسجيل الخروج':'Sign Out','بحث سريع ...':'Quick search ...','الرئيسية':'Dashboard','المنشآت':'Facilities','العمّال':'Workers','الفواتير':'Invoices','المعاملات':'Transactions','التقارير':'Reports','الإدارة':'Administration','المالية':'Finance','البيانات':'Data'}

export default function App(){const[view,setView]=useState('loading');const[sb,setSb]=useState(null);const[user,setUser]=useState(null);const[gmDone,setGmDone]=useState(false);const[toast,setToast]=useState(null);const[lang,setLang]=useState(()=>localStorage.getItem('jisr_lang')||'ar');const setLangPersist=(l)=>{const v=typeof l==='function'?l(lang):l;setLang(v);localStorage.setItem('jisr_lang',v)};const tt=m=>{setToast(m);setTimeout(()=>setToast(null),3000)};useEffect(()=>{const client=getSupabase();setSb(client);
// Check if user is coming back from password reset link
client.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){setView('reset')}});
// Run settings check and session check in PARALLEL for faster startup
let resolved=false;
const timeout=setTimeout(()=>{if(!resolved){setGmDone(true);setView('login')}},5000);
const settingsP=client.from('system_settings').select('setting_key,setting_value').eq('setting_key','gm_setup_complete').single();
const sessionP=client.auth.getSession();
Promise.all([settingsP,sessionP]).then(async([settingsRes,sessionRes])=>{resolved=true;clearTimeout(timeout);const done=settingsRes.data?.setting_value==='true';setGmDone(done);const session=sessionRes.data?.session;if(!session){setView('login');return}try{const{data:u}=await client.from('users').select('*,roles:role_id(name_ar,name_en,color)').eq('auth_id',session.user.id).single();if(u){if(u.preferred_lang)setLangPersist(u.preferred_lang);setUser(u);setView('app')}else setView('login')}catch(e){setView('login')}}).catch(()=>{resolved=true;clearTimeout(timeout);setView('login')})},[]);const handleLogin=async(email,pass)=>{const withTimeout=(promise,ms=10000)=>Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error(lang==='ar'?'انتهت مهلة الاتصال — حاول مرة أخرى':'Connection timed out — try again')),ms))]);const{data,error}=await withTimeout(sb.auth.signInWithPassword({email,password:pass}));if(error)throw error;const{data:u,error:e2}=await withTimeout(sb.from('users').select('*,roles:role_id(name_ar,name_en,color)').eq('auth_id',data.user.id).single());if(e2||!u)throw new Error('User not found');if(!u.is_active){await sb.auth.signOut();throw new Error(lang==='ar'?'حسابك قيد المراجعة — يرجى انتظار موافقة المسؤول':'Your account is under review — please wait for admin approval')}sb.from('users').update({last_login_at:new Date().toISOString()}).eq('id',u.id).then(()=>{});setUser(u);if(u.preferred_lang)setLangPersist(u.preferred_lang);tt(lang==='ar'?'تم تسجيل الدخول بنجاح':'Logged in successfully');setView('app')};const handleSetup=async(form)=>{
const{data:phoneEx}=await sb.from('users').select('id').eq('phone','+966'+form.ph).is('deleted_at',null).maybeSingle();
if(phoneEx)throw new Error(lang==='ar'?'رقم الجوال مسجّل مسبقاً':'Phone already registered');
const{data:idEx}=await sb.from('users').select('id').eq('id_number',form.id).is('deleted_at',null).maybeSingle();
if(idEx)throw new Error(lang==='ar'?'رقم الهوية مسجّل مسبقاً':'ID number already registered');
const{data:emailEx}=await sb.from('users').select('id').eq('email',form.em).is('deleted_at',null).maybeSingle();
if(emailEx)throw new Error(lang==='ar'?'البريد الإلكتروني مسجّل مسبقاً':'Email already registered');
const{data:auth,error:e1}=await sb.auth.signUp({email:form.em,password:form.pw});if(e1)throw e1;let{data:roles}=await sb.from('roles').select('id').eq('name_ar','\u0627\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0639\u0627\u0645').single();if(!roles){const{data:newRole,error:rErr}=await sb.from('roles').insert({name_ar:'المدير العام',name_en:'General Manager',description:'صلاحيات كاملة على النظام',color:'#c9a84c',is_system:true,is_active:true}).select('id').single();if(rErr)throw new Error('فشل إنشاء الدور');roles=newRole}const{error:e3}=await sb.from('users').insert({auth_id:auth.user?.id,name_ar:form.ar,name_en:form.en,email:form.em,phone:'+966'+form.ph,id_type:form.id_type,id_number:form.id,nationality:form.nat,role_id:roles.id,is_active:true});if(e3)throw e3;await sb.from('system_settings').update({setting_value:'true'}).eq('setting_key','gm_setup_complete');setGmDone(true)};const handleLogout=async()=>{await sb.auth.signOut();setUser(null);setView('login')};const switchLang=()=>{const newL=lang==='ar'?'en':'ar';setLangPersist(newL);if(sb&&user)sb.from('users').update({preferred_lang:newL}).eq('id',user.id)};const L=LANG[lang];
const GlobalToast=()=>toast?((isErr,isDel,clr,bg,bdr)=>(isErr=toast.includes('خطأ'),isDel=toast.includes('حذف'),clr=isErr?C.red:isDel?'#e67e22':C.ok,bg=isErr?'rgba(192,57,43,.12)':isDel?'rgba(230,126,34,.12)':'rgba(39,160,70,.12)',bdr=isErr?'rgba(192,57,43,.2)':isDel?'rgba(230,126,34,.2)':'rgba(39,160,70,.2)',<div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:99999,background:bg,color:clr,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,padding:'12px 24px',borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,.5)',border:'1px solid '+bdr,display:'flex',alignItems:'center',gap:8,animation:'slideDown .3s ease',pointerEvents:'none'}}>{isErr?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}{toast}</div>))():null
if(view==='loading')return<Splash/>;if(view==='setup')return<><SetupPage onSetup={handleSetup} onBack={()=>setView('login')} toast={tt} lang={lang} switchLang={switchLang} L={L}/><GlobalToast/></>;if(view==='reset')return<><ResetPage sb={sb} onDone={()=>setView('login')} toast={tt} lang={lang} L={L}/><GlobalToast/></>;if(view==='login')return<><LoginPage sb={sb} onLogin={handleLogin} onSetup={()=>setView('setup')} toast={tt} gmDone={gmDone} lang={lang} switchLang={switchLang} L={L}/><GlobalToast/></>;return<><DashPage sb={sb} user={user} onLogout={handleLogout} toast={tt} lang={lang} switchLang={switchLang} setLang={setLangPersist}/><GlobalToast/></>}

function Splash(){return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',fontFamily:F,direction:'rtl'}}><Logo size={80}/><Css/></div>}

function ConfigPage({onConnect,toast,lang,switchLang,L}){const[u,setU]=useState('');const[k,setK]=useState('');const[busy,setBusy]=useState(false);useEffect(()=>{const c=getSavedConfig();if(c){setU(c.u||'');setK(c.k||'')}},[]);const go=()=>{if(!u||!k)return toast('\u26a0\ufe0f');setBusy(true);onConnect(u.replace(/\/+$/,''),k);setBusy(false)};return(<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',fontFamily:F,direction:L.dir}}><LangBtn L={L} switchLang={switchLang}/><div style={{width:'min(420px,92vw)',background:'var(--sf)',borderRadius:20,padding:'clamp(24px,4vw,36px) clamp(20px,4vw,32px)',boxShadow:'0 20px 60px rgba(0,0,0,.5)',position:'relative'}}><GoldBar/><div style={{textAlign:'center',marginBottom:24}}><Logo size={70}/><div style={{fontSize:18,fontWeight:900,color:'var(--tx)',marginTop:12}}>{L.configTitle}</div><div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'var(--tx4)',marginTop:4}}>{L.configSub}</div></div><div style={{display:'flex',flexDirection:'column',gap:12}}><FField label="Project URL" value={u} set={setU} ph="https://xxxxx.supabase.co" ltr/><FField label="Anon Key" value={k} set={setK} ph="eyJhbGciOiJIUzI1NiIs..." ltr small/><button onClick={go} disabled={busy} style={{...goldS,opacity:busy?.7:1}}>{L.configTitle}</button></div></div><Css/></div>)}

function LoginPage({sb,onLogin,onSetup,toast,gmDone,lang,switchLang,L}){
const[em,setEm]=useState(()=>localStorage.getItem('jisr_rem_email')||'');
const[pw,setPw]=useState('');
const[busy,setBusy]=useState(false);
const[showPw,setShowPw]=useState(false);
const[rem,setRem]=useState(()=>!!localStorage.getItem('jisr_rem_email'));
const[showForgot,setShowForgot]=useState(false);
const[loginErr,setLoginErr]=useState('');
const[forgotEmail,setForgotEmail]=useState('');
const[forgotBusy,setForgotBusy]=useState(false);
const[forgotSent,setForgotSent]=useState(false);
const[showReg,setShowReg]=useState(false);
const[reg,setReg]=useState({name_ar:'',name_en:'',email:'',phone:'',id_number:'',nationality:'',pw:'',pw2:''});
const[regBusy,setRegBusy]=useState(false);
const[regDone,setRegDone]=useState(false);
const[regStep,setRegStep]=useState(1);
const[regShowPw,setRegShowPw]=useState(false);
const[regShowPw2,setRegShowPw2]=useState(false);
const[regErr,setRegErr]=useState({});
const[natOpen,setNatOpen]=useState(false);
const[natSearch,setNatSearch]=useState('');
const[regIdTypes,setRegIdTypes]=useState([]);
const[regBanks,setRegBanks]=useState([]);
const[regBankOpen,setRegBankOpen]=useState(false);
const[idTypeOpen,setIdTypeOpen]=useState(false);
const[bankDropOpen,setBankDropOpen]=useState(false);
const defaultNats=[{ar:'سعودي',en:'Saudi'},{ar:'يمني',en:'Yemeni'},{ar:'مصري',en:'Egyptian'},{ar:'سوداني',en:'Sudanese'},{ar:'سوري',en:'Syrian'},{ar:'أردني',en:'Jordanian'},{ar:'عراقي',en:'Iraqi'},{ar:'فلسطيني',en:'Palestinian'},{ar:'لبناني',en:'Lebanese'},{ar:'تونسي',en:'Tunisian'},{ar:'مغربي',en:'Moroccan'},{ar:'جزائري',en:'Algerian'},{ar:'ليبي',en:'Libyan'},{ar:'عماني',en:'Omani'},{ar:'إماراتي',en:'Emirati'},{ar:'بحريني',en:'Bahraini'},{ar:'كويتي',en:'Kuwaiti'},{ar:'قطري',en:'Qatari'},{ar:'باكستاني',en:'Pakistani'},{ar:'هندي',en:'Indian'},{ar:'بنغلاديشي',en:'Bangladeshi'},{ar:'فلبيني',en:'Filipino'},{ar:'إندونيسي',en:'Indonesian'},{ar:'نيبالي',en:'Nepali'},{ar:'سريلانكي',en:'Sri Lankan'},{ar:'إثيوبي',en:'Ethiopian'},{ar:'كيني',en:'Kenyan'},{ar:'نيجيري',en:'Nigerian'},{ar:'أمريكي',en:'American'},{ar:'بريطاني',en:'British'},{ar:'أخرى',en:'Other'}];
const[nats,setNats]=useState(defaultNats);
useEffect(()=>{if(!sb)return;sb.from('countries').select('nationality_ar,nationality_en').order('sort_order').order('name_ar').then(({data})=>{if(data&&data.length>0)setNats(data.filter(d=>d.nationality_ar).map(d=>({ar:d.nationality_ar,en:d.nationality_en||d.nationality_ar})))})},[sb]);
const filteredNats=nats.filter(n=>!natSearch||n.ar.includes(natSearch)||n.en.toLowerCase().includes(natSearch.toLowerCase()));
const regInpS={width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:'clamp(12px,1.8vw,13px)',fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',textAlign:'center',boxSizing:'border-box'};
const regLblS={fontSize:'clamp(10px,1.5vw,12px)',fontWeight:700,color:'rgba(255,255,255,.58)',marginBottom:'clamp(3px,.5vw,5px)'};
const regSelS={...regInpS,cursor:'pointer',textAlign:'right',paddingRight:14,appearance:'none',WebkitAppearance:'none',MozAppearance:'none',overflowY:'auto',backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff40' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",backgroundRepeat:'no-repeat',backgroundPosition:'14px center'};

const go=async e=>{
e.preventDefault();if(!em||!pw)return toast(lang==='ar'?'الرجاء إدخال البريد الإلكتروني وكلمة المرور':'Please enter email and password');
if(rem){localStorage.setItem('jisr_rem_email',em)}else{localStorage.removeItem('jisr_rem_email')}
setBusy(true);try{await onLogin(em,pw)}catch(err){const msg=err.message?.includes('Invalid')||err.message?.includes('invalid')?(lang==='ar'?'تعذّر تسجيل الدخول — تحقق من البريد وكلمة المرور':'Login failed — check email and password'):err.message?.includes('fetch')||err.message?.includes('timed out')||err.message?.includes('network')||err.message?.includes('مهلة')?(lang==='ar'?'تعذّر الاتصال بالخادم — تحقق من الإنترنت وحاول مرة أخرى':'Could not connect to server — check your internet and try again'):err.message||'Error';setLoginErr(msg)}setBusy(false)};

const sendReset=async()=>{
if(!forgotEmail){toast(lang==='ar'?'الرجاء إدخال البريد الإلكتروني':'Please enter your email address');return}
if(!sb){toast('خطأ: لا يوجد اتصال');return}
setForgotBusy(true);
try{const{error}=await sb.auth.resetPasswordForEmail(forgotEmail,{redirectTo:window.location.origin});if(error)throw error;setForgotSent(true);toast(lang==='ar'?'تم إرسال رابط إعادة التعيين':'Reset link sent successfully')}
catch(err){toast(lang==='ar'?'خطأ: '+(err.message||'حاول مرة أخرى'):'Error: '+(err.message||'Try again'))}
setForgotBusy(false)};

const doRegister=async()=>{
if(!sb){toast('خطأ: لا يوجد اتصال');return}
setRegBusy(true);
try{
const{data:phoneEx}=await sb.from('users').select('id').eq('phone','+966'+reg.phone).is('deleted_at',null).maybeSingle();
if(phoneEx){setRegErr(p=>({...p,phone:'رقم الجوال مسجّل مسبقاً'}));setRegBusy(false);setRegStep(1);return}
const{data:idEx}=await sb.from('users').select('id').eq('id_number',reg.id_number).is('deleted_at',null).maybeSingle();
if(idEx){setRegErr(p=>({...p,id_number:'رقم الهوية مسجّل مسبقاً'}));setRegBusy(false);setRegStep(1);return}
const{data:emailEx}=await sb.from('users').select('id').eq('email',reg.email).is('deleted_at',null).maybeSingle();
if(emailEx){setRegErr(p=>({...p,email:'البريد الإلكتروني مسجّل مسبقاً'}));setRegBusy(false);setRegStep(2);return}
const{data:auth,error:e1}=await sb.auth.signUp({email:reg.email,password:reg.pw});
if(e1)throw e1;
let{data:defRole}=await sb.from('roles').select('id').eq('name_ar','موظف').single();if(!defRole){const{data:newR}=await sb.from('roles').insert({name_ar:'موظف',name_en:'Employee',description:'دور افتراضي للموظفين الجدد',color:'#3483b4',is_system:false,is_active:true}).select('id').single();defRole=newR}
const{error:e2}=await sb.from('users').insert({auth_id:auth.user?.id,name_ar:reg.name_ar,name_en:reg.name_en||null,email:reg.email,phone:'+966'+reg.phone,id_number:reg.id_number||null,nationality:reg.nationality||null,role_id:defRole?.id||null,is_active:false});
if(e2)throw e2;
if(reg.bank_name&&reg.iban){const{data:newUser}=await sb.from('users').select('id').eq('email',reg.email).maybeSingle();if(newUser){await sb.from('bank_accounts').insert({bank_name:reg.bank_name,iban:reg.iban,account_number:reg.account_number||null,account_type:'deposit',is_active:true,notes:'حساب الموظف '+reg.name_ar})}}
await sb.auth.signOut();
setRegDone(true);toast(lang==='ar'?'تم تسجيل الحساب بنجاح':'Account registered successfully');
}catch(err){toast('خطأ: '+(err.message||'حاول مرة أخرى'))}
setRegBusy(false)};

return(<div className='login-wrap' style={{display:'flex',height:'100vh',direction:L.dir,fontFamily:F,background:'var(--bg)',overflow:'hidden'}}><div className='login-form' style={{width:'100%',maxWidth:520,flexShrink:0,background:'var(--sf)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'clamp(24px,5vw,44px) clamp(20px,5vw,48px)',position:'relative',boxShadow:lang==='ar'?'-28px 0 70px rgba(0,0,0,.38)':'28px 0 70px rgba(0,0,0,.38)',overflowY:'auto'}}><LangBtn L={L} switchLang={switchLang} abs/><div style={{textAlign:'center',marginBottom:'clamp(16px,4vw,32px)',width:'100%'}}><div style={{fontSize:'clamp(22px,4vw,30px)',fontWeight:900,color:'rgba(255,255,255,.98)'}}>{L.title}</div><div style={{fontSize:'clamp(11px,1.8vw,14px)',fontWeight:500,color:'rgba(255,255,255,.65)',marginTop:6}}>{L.sub}</div></div><form onSubmit={go} style={{width:'100%',display:'flex',flexDirection:'column',gap:'clamp(10px,1.8vw,16px)'}}><div><div style={{fontSize:'clamp(11px,1.6vw,13px)',fontWeight:700,color:'rgba(255,255,255,.78)',marginBottom:7}}>{L.email}</div><div style={{position:'relative'}}><span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'right':'left']:16,pointerEvents:'none',display:'flex'}}>{ICO.email}</span><input value={em} onChange={e=>{setEm(e.target.value);setLoginErr('')}} type="email" placeholder={lang==='ar'?'example@jisr.sa':'example@jisr.sa'} required style={finS}/></div></div><div><div style={{fontSize:'clamp(11px,1.6vw,13px)',fontWeight:700,color:'rgba(255,255,255,.78)',marginBottom:7}}>{L.pass}</div><div style={{position:'relative'}}><span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'right':'left']:16,pointerEvents:'none',display:'flex'}}>{ICO.lock}</span><input value={pw} onChange={e=>{setPw(e.target.value);setLoginErr('')}} type={showPw?'text':'password'} placeholder="······" required style={finS}/><button type="button" onClick={()=>setShowPw(!showPw)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'left':'right']:14,background:'none',border:'none',cursor:'pointer',display:'flex',padding:4}}>{showPw?ICO.eyeOn:ICO.eyeOff}</button></div></div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>setRem(!rem)}><div style={{width:18,height:18,borderRadius:5,border:rem?'none':'1.5px solid rgba(255,255,255,.3)',background:rem?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'.2s',flexShrink:0}}>{rem&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#141414" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div><span style={{fontSize:'clamp(10px,1.5vw,12px)',fontWeight:600,color:rem?'rgba(255,255,255,.75)':'rgba(255,255,255,.55)'}}>{L.remember}</span></label><button type="button" onClick={()=>{setForgotEmail(em);setForgotSent(false);setShowForgot(true)}} style={{fontSize:'clamp(10px,1.5vw,12px)',fontWeight:700,color:'rgba(201,168,76,.65)',textDecoration:'none',background:'none',border:'none',cursor:'pointer',fontFamily:F,padding:0}}>{L.forgot}</button></div><button type="submit" disabled={busy} style={{...goldS,height:'clamp(46px,8vw,54px)',minHeight:46,fontSize:'clamp(13px,2vw,16px)',marginTop:4,opacity:busy?.7:1,gap:10,flexShrink:0}}>{busy?<div style={{width:20,height:20,border:'2.5px solid rgba(14,14,14,.3)',borderTopColor:C.dk,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:<>{L.login} {ICO.unlock}</>}</button>{loginErr&&<div style={{background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.15)',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:8,marginTop:4}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(192,57,43,.5)" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="rgba(192,57,43,.6)" strokeWidth="2" strokeLinecap="round"/></svg>
<span style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.8)',lineHeight:1.5}}>{loginErr}</span>
</div>}</form>
<div style={{display:'flex',alignItems:'center',gap:12,margin:'12px 0',width:'100%',flexShrink:0}}><div style={{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/><div style={{fontSize:'clamp(9px,1.3vw,11px)',fontWeight:700,color:'var(--tx4)',whiteSpace:'nowrap'}}>{lang==='ar'?'ليس لديك حساب؟':'No account?'}</div><div style={{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/></div>
<button onClick={()=>{setReg({name_ar:'',name_en:'',email:'',phone:'',id_type:'',id_number:'',nationality:'',pw:'',pw2:'',bank_name:'',iban:'',account_number:''});setRegDone(false);setRegStep(1);setShowReg(true);
sb.from('lookup_lists').select('id,list_key').then(({data:ll})=>{if(!ll)return;const idL=ll.find(l=>l.list_key==='id_type');const bkL=ll.find(l=>l.list_key==='bank_name');if(idL)sb.from('lookup_items').select('value_ar,value_en').eq('list_id',idL.id).eq('is_active',true).order('sort_order').then(({data})=>setRegIdTypes(data||[]));if(bkL)sb.from('lookup_items').select('value_ar,value_en').eq('list_id',bkL.id).eq('is_active',true).order('sort_order').then(({data})=>setRegBanks(data||[]))})
}} style={{width:'100%',height:'clamp(46px,8vw,54px)',minHeight:46,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,fontFamily:F,fontSize:'clamp(11px,1.8vw,14px)',fontWeight:700,color:'rgba(255,255,255,.65)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7,flexShrink:0}}>{lang==='ar'?'تسجيل حساب جديد':'Create New Account'}</button>
{!gmDone&&<button onClick={onSetup} style={{width:'100%',height:36,marginTop:6,background:'none',border:'none',fontFamily:F,fontSize:'clamp(9px,1.3vw,10px)',fontWeight:600,color:'rgba(201,168,76,.3)',cursor:'pointer'}}>{lang==='ar'?'إعداد أولي (المدير العام فقط)':'Initial Setup (Admin only)'}</button>}
</div><BrandPanel lang={lang} L={L}/>
{showForgot&&<div onClick={()=>setShowForgot(false)} style={{position:'fixed',inset:0,background:'rgba(10,10,10,.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:20,width:'min(420px,92vw)',padding:'clamp(24px,4vw,32px) clamp(20px,4vw,28px)',boxShadow:'0 20px 60px rgba(0,0,0,.5)',position:'relative',border:'1px solid rgba(201,168,76,.12)'}}>
<button onClick={()=>setShowForgot(false)} style={{position:'absolute',top:16,[lang==='ar'?'left':'right']:16,width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',fontSize:'clamp(10px,1.5vw,12px)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F,transition:'.2s'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
{!forgotSent?<>
<div style={{textAlign:'center',marginBottom:24}}>
<div style={{width:56,height:56,borderRadius:'50%',background:'rgba(201,168,76,.1)',border:'1.5px solid rgba(201,168,76,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>{ICO.lock}</div>
<div style={{fontSize:'clamp(16px,2.5vw,20px)',fontWeight:900,color:'var(--tx)'}}>{lang==='ar'?'نسيت كلمة المرور؟':'Forgot Password?'}</div>
<div style={{fontSize:'clamp(10px,1.5vw,12px)',color:'var(--tx3)',marginTop:6,lineHeight:1.8}}>{lang==='ar'?'يرجى إدخال بريدك الإلكتروني المسجّل وسيتم إرسال رابط لإعادة تعيين كلمة المرور':'Please enter your registered email address to receive a password reset link'}</div>
</div>
<div style={{marginBottom:14}}>
<div style={{fontSize:'clamp(10px,1.5vw,12px)',fontWeight:700,color:'rgba(255,255,255,.65)',marginBottom:6}}>{lang==='ar'?'البريد الإلكتروني':'Email Address'}</div>
<input value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} type="email" placeholder={lang==='ar'?'example@jisr.sa':'example@jisr.sa'} style={{...finS,textAlign:'center'}} autoFocus/>
</div>
<button onClick={sendReset} disabled={forgotBusy} style={{...goldS,height:'clamp(42px,6vw,50px)',fontSize:'clamp(13px,2vw,15px)',opacity:forgotBusy?.7:1,gap:8}}>{forgotBusy?<div style={{width:18,height:18,border:'2px solid rgba(14,14,14,.3)',borderTopColor:C.dk,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:lang==='ar'?'إرسال رابط التعيين':'Send reset link'}</button>
<button onClick={()=>setShowForgot(false)} style={{width:'100%',height:'clamp(36px,5vw,40px)',marginTop:8,background:'none',border:'none',color:'var(--tx4)',fontFamily:F,fontSize:'clamp(10px,1.5vw,12px)',fontWeight:600,cursor:'pointer'}}>{lang==='ar'?'العودة لتسجيل الدخول':'Return to Login'}</button>
</>:<>
<div style={{textAlign:'center',padding:'10px 0'}}>
<div style={{width:64,height:64,borderRadius:'50%',background:'rgba(39,160,70,.08)',border:'2px solid rgba(39,160,70,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="rgba(39,160,70,.7)" strokeWidth="2" strokeLinecap="round"/><path d="M22 2l-7 20-4-9-9-4 20-7z" fill="rgba(39,160,70,.1)" stroke="rgba(39,160,70,.7)" strokeWidth="2" strokeLinejoin="round"/></svg></div>
<div style={{fontSize:'clamp(16px,2.5vw,20px)',fontWeight:900,color:'var(--tx)',marginBottom:6}}>{lang==='ar'?'تم إرسال الرابط بنجاح':'Link Sent Successfully'}</div>
<div style={{fontSize:'clamp(10px,1.5vw,12px)',color:'var(--tx3)',lineHeight:1.8}}>{lang==='ar'?'تم إرسال رابط إعادة تعيين كلمة المرور إلى':'A password reset link has been sent to'}</div>
<div style={{fontSize:'clamp(12px,1.8vw,14px)',fontWeight:800,color:C.gold,margin:'8px 0 16px',direction:'ltr'}}>{forgotEmail}</div>
<div style={{fontSize:'clamp(9px,1.3vw,11px)',color:'var(--tx4)',lineHeight:1.8,marginBottom:20}}>{lang==='ar'?'يرجى فتح بريدك الإلكتروني والضغط على الرابط المرسل لإعادة تعيين كلمة المرور':'Please open your email and click the link to reset your password'}</div>
<button onClick={()=>setShowForgot(false)} style={{...goldS,height:'clamp(40px,5.5vw,46px)',fontSize:'clamp(12px,1.8vw,14px)'}}>{lang==='ar'?'تم — العودة لتسجيل الدخول':'Done — Return to Login'}</button>
</div>
</>}
</div>
</div>}
{/* Register — Design A: Centered popup like forgot password */}
{showReg&&<div onClick={()=>{setShowReg(false);setNatOpen(false)}} style={{position:'fixed',inset:0,background:'rgba(10,10,10,.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(520px,92vw)',maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.12)'}}>
{/* Header */}
<div style={{position:'relative',flexShrink:0}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,'+C.gl+' 50%,'+C.gold+' 70%,transparent)'}}/>
<div style={{background:'var(--sf)',padding:'14px 24px 0',textAlign:'center'}}>
<button onClick={()=>setShowReg(false)} style={{position:'absolute',[lang==='ar'?'left':'right']:16,top:16,width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
<div style={{width:40,height:40,borderRadius:'50%',background:'rgba(201,168,76,.1)',border:'1.5px solid rgba(201,168,76,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="rgba(201,168,76,.15)" stroke="rgba(201,168,76,.5)" strokeWidth="1.5"/><path d="M4 21v-1a6 6 0 0116 0v1" stroke="rgba(201,168,76,.5)" strokeWidth="1.5"/><path d="M20 8v3m0 0v3m0-3h3m-3 0h-3" stroke="rgba(201,168,76,.7)" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
<div style={{color:'var(--tx)',fontSize:'clamp(14px,2vw,16px)',fontWeight:800}}>{lang==='ar'?'تسجيل حساب جديد':'Create New Account'}</div>

{/* Stepper */}
<div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'8px 20px 6px'}}>
{[lang==='ar'?'البيانات':'Info',lang==='ar'?'الحساب':'Account',lang==='ar'?'البنك':'Bank',lang==='ar'?'مراجعة':'Review'].map((s,i)=>{
const step=i+1;const isA=regStep===step;const isD=regStep>step;
return<React.Fragment key={i}>
{i>0&&<div style={{flex:1,height:2,margin:'0 6px 16px',borderRadius:1,background:'rgba(255,255,255,.1)',position:'relative',overflow:'hidden'}}><div style={{position:'absolute',top:0,right:0,bottom:0,width:regStep>=step?'100%':'0%',background:`linear-gradient(to left, ${C.gold}, rgba(201,168,76,.4))`,borderRadius:1,transition:'width .5s cubic-bezier(.4,0,.2,1)'}}/></div>}
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
<div style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'clamp(9px,1.3vw,11px)',fontWeight:800,background:isA||isD?C.gold:'rgba(255,255,255,.07)',color:isA||isD?C.dk:'rgba(255,255,255,.25)',boxShadow:isA?'0 0 0 4px rgba(201,168,76,.15)':'none',opacity:isD?.55:1,transition:'.3s'}}>{isD?<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>:step}</div>
<div style={{fontSize:'clamp(8px,1.2vw,9px)',color:isA?C.gold:'rgba(255,255,255,.25)',fontWeight:isA?700:500}}>{s}</div>
</div>
</React.Fragment>})}
</div>
<div style={{height:1,background:'rgba(201,168,76,.1)',margin:'4px -24px 0'}}/>
</div>
</div>

{!regDone?<>
<div style={{padding:'14px 22px',flex:1,overflowY:'auto'}}>
{regStep===1&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={regLblS}>{lang==='ar'?'الاسم بالعربي':'Name (Arabic)'}</div><input value={reg.name_ar} onChange={e=>setReg(p=>({...p,name_ar:e.target.value}))} style={{...regInpS,borderColor:regErr.name_ar?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'الاسم الأول والأخير':'First and Last Name'}/>{regErr.name_ar&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{regErr.name_ar}</div>}</div>
<div><div style={regLblS}>{lang==='ar'?'الاسم بالإنجليزي':'Name (English)'}</div><input value={reg.name_en} onChange={e=>setReg(p=>({...p,name_en:e.target.value}))} style={{...regInpS,borderColor:regErr.name_en?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'الاسم الأول والأخير':'First and Last Name'}/>{regErr.name_en&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{regErr.name_en}</div>}</div>
</div>
<div><div style={regLblS}>{lang==='ar'?'رقم الجوال':'Phone Number'}</div>
<div style={{display:'flex',direction:'ltr',border:regErr.phone?'1.5px solid rgba(192,57,43,.5)':'1.5px solid rgba(255,255,255,.1)',borderRadius:8,overflow:'hidden',background:'rgba(255,255,255,.04)'}}>
<div style={{height:'clamp(38px,5vw,42px)',padding:'0 14px',background:'rgba(255,255,255,.06)',borderRight:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',fontSize:'clamp(10px,1.4vw,13px)',fontWeight:700,color:'var(--tx3)',flexShrink:0}}>+966</div>
<input value={reg.phone.replace(/(\d{2})(\d{3})(\d{0,4})/,'$1 $2 $3').trim()} onChange={e=>{const v=e.target.value.replace(/\D/g,'').replace(/ /g,'').slice(0,9);setReg(p=>({...p,phone:v}))}} style={{width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:'none',background:'transparent',fontFamily:F,fontSize:'clamp(12px,1.8vw,14px)',fontWeight:600,color:'var(--tx)',outline:'none',textAlign:'left'}} placeholder={lang==='ar'?'5x xxx xxxx':'5x xxx xxxx'}/>
</div>
{regErr.phone&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{regErr.phone}</div>}
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={regLblS}>{lang==='ar'?'نوع الهوية':'ID Type'}</div>
<div style={{position:'relative'}}>
<div onClick={()=>{setIdTypeOpen(!idTypeOpen);setNatOpen(false);setBankDropOpen(false)}} style={{width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:regErr.id_type?'1.5px solid rgba(192,57,43,.5)':'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:'clamp(11px,1.6vw,13px)',fontWeight:600,color:reg.id_type?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)',background:'rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',boxSizing:'border-box'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,transform:idTypeOpen?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke="#c9a84c" strokeWidth="2.5" fill="none"/></svg>
<span style={{flex:1,textAlign:'center'}}>{reg.id_type?(lang==='ar'?reg.id_type:(regIdTypes.find(t=>t.value_ar===reg.id_type)?.value_en||reg.id_type)):(lang==='ar'?'— اختر —':'— Select —')}</span>
</div>
{idTypeOpen&&<><div onClick={()=>setIdTypeOpen(false)} style={{position:'fixed',inset:0,zIndex:19}}/><div style={{position:'absolute',bottom:'calc(100% + 4px)',right:0,left:0,background:'var(--sb)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,overflow:'hidden',zIndex:20,boxShadow:'0 -8px 32px rgba(0,0,0,.6)'}}>
{regIdTypes.map(t=><div key={t.value_ar} onClick={()=>{setReg(p=>({...p,id_type:t.value_ar}));setIdTypeOpen(false)}} style={{padding:'10px 14px',fontSize:'clamp(11px,1.5vw,12px)',fontWeight:reg.id_type===t.value_ar?700:500,color:reg.id_type===t.value_ar?C.gold:'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid var(--bd2)',background:reg.id_type===t.value_ar?'rgba(201,168,76,.06)':'transparent'}}>{lang==='ar'?t.value_ar:(t.value_en||t.value_ar)}</div>)}
</div></>}
</div>
{regErr.id_type&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{regErr.id_type}</div>}</div>
<div><div style={regLblS}>{lang==='ar'?'رقم الهوية':'ID Number'}</div><input value={reg.id_number} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,10);setReg(p=>({...p,id_number:v}))}} style={{...regInpS,borderColor:regErr.id_number?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'أدخل 10 أرقام':'Enter 10 digits'} maxLength={10}/>{regErr.id_number&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{regErr.id_number}</div>}</div>
</div>
<div><div style={regLblS}>{lang==='ar'?'الجنسية':'Nationality'}</div>
<div style={{position:'relative'}}>
<div onClick={()=>{setNatOpen(!natOpen);setIdTypeOpen(false);setBankDropOpen(false)}} style={{width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:regErr.nationality?'1.5px solid rgba(192,57,43,.5)':'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:'clamp(11px,1.6vw,13px)',fontWeight:600,color:reg.nationality?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)',background:'rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',boxSizing:'border-box'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,transform:natOpen?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke="#c9a84c" strokeWidth="2.5" fill="none"/></svg>
<span style={{flex:1,textAlign:'center'}}>{(()=>{if(!reg.nationality)return lang==='ar'?'اختر الجنسية':'Select nationality';const found=nats.find(n=>n.ar===reg.nationality);return found?(lang==='ar'?found.ar:found.en):reg.nationality})()}</span>
</div>
{natOpen&&<><div onClick={()=>{setNatOpen(false);setNatSearch('')}} style={{position:'fixed',inset:0,zIndex:19}}/><div style={{position:'absolute',bottom:'calc(100% + 4px)',right:0,left:0,background:'var(--sb)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,maxHeight:220,display:'flex',flexDirection:'column',zIndex:20,boxShadow:'0 -8px 32px rgba(0,0,0,.6)'}}>
<div style={{padding:'6px 8px',borderBottom:'1px solid var(--bd)',flexShrink:0}}>
<input value={natSearch} onChange={e=>setNatSearch(e.target.value)} placeholder={lang==='ar'?'بحث...':'Search...'} autoFocus style={{width:'100%',height:30,padding:'0 10px',border:'1px solid var(--bd)',borderRadius:6,background:'rgba(255,255,255,.04)',fontFamily:F,fontSize:'clamp(10px,1.4vw,11px)',fontWeight:500,color:'var(--tx2)',outline:'none',textAlign:'center'}}/>
</div>
<div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
{filteredNats.map(n=><div key={n.ar} onClick={()=>{setReg(p=>({...p,nationality:n.ar}));setNatOpen(false);setNatSearch('')}} style={{padding:'10px 14px',fontSize:'clamp(11px,1.5vw,13px)',fontWeight:reg.nationality===n.ar?700:500,color:reg.nationality===n.ar?C.gold:'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid var(--bd2)',background:reg.nationality===n.ar?'rgba(201,168,76,.06)':'transparent',transition:'.15s'}}>{lang==='ar'?n.ar:n.en}</div>)}
{filteredNats.length===0&&<div style={{padding:12,textAlign:'center',fontSize:'clamp(9px,1.3vw,10px)',color:'var(--tx5)'}}>{lang==='ar'?'لا توجد نتائج':'No results'}</div>}
</div>
</div></>}
</div>
{regErr.nationality&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{regErr.nationality}</div>}</div>
</div>}

{regStep===2&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
<div><div style={regLblS}>{lang==='ar'?'البريد الإلكتروني':'Email Address'}</div><input value={reg.email} onChange={e=>setReg(p=>({...p,email:e.target.value}))} type="email" style={{...regInpS,borderColor:regErr.email?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'example@jisr.sa':'example@jisr.sa'}/>{regErr.email&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{regErr.email}</div>}</div>
<div><div style={regLblS}>{lang==='ar'?'كلمة المرور':'Password'}</div><div style={{position:'relative'}}><input value={reg.pw} onChange={e=>setReg(p=>({...p,pw:e.target.value}))} type={regShowPw?'text':'password'} style={{...regInpS,paddingLeft:36,borderColor:regErr.pw?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'6 أحرف على الأقل':'At least 6 characters'}/><button type="button" onClick={()=>setRegShowPw(!regShowPw)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:10,background:'none',border:'none',cursor:'pointer',display:'flex',padding:2}}>{regShowPw?ICO.eyeOn:ICO.eyeOff}</button></div>{regErr.pw&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3,textAlign:'right'}}>{regErr.pw}</div>}</div>
<div><div style={regLblS}>{lang==='ar'?'تأكيد كلمة المرور':'Confirm Password'}</div><div style={{position:'relative'}}><input value={reg.pw2} onChange={e=>setReg(p=>({...p,pw2:e.target.value}))} type={regShowPw2?'text':'password'} style={{...regInpS,paddingLeft:36,borderColor:regErr.pw2?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'تأكيد كلمة المرور':'Confirm password'}/><button type="button" onClick={()=>setRegShowPw2(!regShowPw2)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:10,background:'none',border:'none',cursor:'pointer',display:'flex',padding:2}}>{regShowPw2?ICO.eyeOn:ICO.eyeOff}</button></div>{regErr.pw2&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3,textAlign:'right'}}>{regErr.pw2}</div>}</div>
</div>}

{regStep===3&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
<div style={{fontSize:'clamp(9px,1.3vw,11px)',color:'var(--tx4)',textAlign:'center',marginBottom:2}}>{lang==='ar'?'اختياري — يمكنك تخطيها':'Optional — you can skip this'}</div>
<div><div style={regLblS}>{lang==='ar'?'اسم البنك':'Bank Name'}</div>
<div style={{position:'relative'}}>
<div onClick={()=>{setBankDropOpen(!bankDropOpen);setNatOpen(false);setIdTypeOpen(false)}} style={{width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:'clamp(11px,1.6vw,13px)',fontWeight:600,color:reg.bank_name?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)',background:'rgba(255,255,255,.07)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',boxSizing:'border-box'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,transform:bankDropOpen?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke="#c9a84c" strokeWidth="2.5" fill="none"/></svg>
<span style={{flex:1,textAlign:'center'}}>{reg.bank_name?(lang==='ar'?reg.bank_name:(regBanks.find(b=>b.value_ar===reg.bank_name)?.value_en||reg.bank_name)):(lang==='ar'?'— اختر البنك —':'— Select Bank —')}</span>
</div>
{bankDropOpen&&<><div onClick={()=>setBankDropOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:25}}/><div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'min(320px,85vw)',background:'var(--sb)',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,maxHeight:300,display:'flex',flexDirection:'column',zIndex:26,boxShadow:'0 20px 48px rgba(0,0,0,.7)'}}>
<div style={{padding:'12px 16px',borderBottom:'1px solid var(--bd)',fontSize:'clamp(11px,1.6vw,13px)',fontWeight:700,color:C.gold,textAlign:'center',flexShrink:0}}>{lang==='ar'?'اختر البنك':'Select Bank'}</div>
<div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
{regBanks.map(b=><div key={b.value_ar} onClick={()=>{setReg(p=>({...p,bank_name:b.value_ar}));setBankDropOpen(false)}} style={{padding:'11px 16px',fontSize:'clamp(11px,1.5vw,12px)',fontWeight:reg.bank_name===b.value_ar?700:500,color:reg.bank_name===b.value_ar?C.gold:'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid var(--bd2)',background:reg.bank_name===b.value_ar?'rgba(201,168,76,.06)':'transparent'}}>{lang==='ar'?b.value_ar:(b.value_en||b.value_ar)}</div>)}
</div>
</div></>}
</div></div>
<div><div style={regLblS}>{lang==='ar'?'رقم الآيبان (IBAN)':'IBAN Number'}</div><input value={reg.iban||''} onChange={e=>setReg(p=>({...p,iban:e.target.value.toUpperCase()}))} style={{...regInpS,direction:'ltr',fontFamily:'monospace',letterSpacing:1}} placeholder={lang==='ar'?'SA...':'SA...'}/></div>
<div><div style={regLblS}>{lang==='ar'?'رقم الحساب':'Account Number'}</div><input value={reg.account_number||''} onChange={e=>setReg(p=>({...p,account_number:e.target.value}))} style={{...regInpS,direction:'ltr',fontFamily:'monospace'}} placeholder={lang==='ar'?'1234567890':'1234567890'}/></div>
</div>}

{regStep===4&&<div style={{display:'flex',flexDirection:'column',gap:0}}>
<div style={{fontSize:'clamp(12px,1.8vw,14px)',fontWeight:700,color:'var(--tx)',marginBottom:4,textAlign:'center'}}>{lang==='ar'?'مراجعة البيانات':'Review'}</div>
<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'var(--tx4)',marginBottom:12,textAlign:'center'}}>{lang==='ar'?'تأكد من صحة البيانات قبل الإرسال':'Verify your information before submitting'}</div>
{[['الاسم بالعربي',reg.name_ar],['الاسم بالإنجليزي',reg.name_en],['الجوال',reg.phone?'+966 '+reg.phone:null],['نوع الهوية',reg.id_type],['رقم الهوية',reg.id_number],['الجنسية',reg.nationality],['البريد',reg.email],['البنك',reg.bank_name],['IBAN',reg.iban],['رقم الحساب',reg.account_number]].filter(([,v])=>v).map(([k,v],i)=>
<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
<span style={{fontSize:'clamp(10px,1.4vw,11px)',color:'var(--tx4)'}}>{k}</span>
<span style={{fontSize:'clamp(11px,1.6vw,12px)',fontWeight:600,color:'rgba(255,255,255,.82)',direction:k==='البريد'||k==='الجوال'||k==='IBAN'?'ltr':'rtl'}}>{v}</span>
</div>)}
<div style={{background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.12)',borderRadius:10,padding:'10px 14px',marginTop:12,display:'flex',alignItems:'center',gap:8}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(201,168,76,.4)" strokeWidth="1.5"/><path d="M12 8v4M12 16h.01" stroke="rgba(201,168,76,.5)" strokeWidth="2" strokeLinecap="round"/></svg>
<span style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(201,168,76,.5)',lineHeight:1.6}}>{lang==='ar'?'حسابك سيكون قيد المراجعة — سيتم تفعيله بعد موافقة المسؤول':'Your account will be under review — it will be activated after admin approval'}</span>
</div>
</div>}
</div>
<div style={{flexShrink:0,padding:'14px 22px 16px',borderTop:'1px solid rgba(201,168,76,.12)',display:'flex',gap:10,flexDirection:'row-reverse',marginTop:6}}>
{regStep===1&&<>
<button onClick={()=>{
setRegErr({});
const err={};
if(!reg.name_ar)err.name_ar='الرجاء إدخال الاسم بالعربي';
else if(reg.name_ar.trim().split(/\s+/).length<2)err.name_ar='الرجاء إدخال الاسم الأول والأخير';
else if(!/^[\u0600-\u06FF\s]+$/.test(reg.name_ar))err.name_ar='يرجى كتابة الاسم باللغة العربية فقط';
if(!reg.name_en)err.name_en='الرجاء إدخال الاسم بالإنجليزي';
else if(reg.name_en.trim().split(/\s+/).length<2)err.name_en='الرجاء إدخال الاسم الأول والأخير';
else if(!/^[a-zA-Z\s]+$/.test(reg.name_en))err.name_en='يرجى كتابة الاسم باللغة الإنجليزية فقط';
if(!reg.phone)err.phone='الرجاء إدخال رقم الجوال';
else if(reg.phone.length!==9)err.phone='رقم الجوال يجب أن يتكون من 9 أرقام';
if(!reg.id_type)err.id_type='الرجاء اختيار نوع الهوية';
if(!reg.id_number)err.id_number='الرجاء إدخال رقم الهوية';
else if(reg.id_number.length!==10)err.id_number='رقم الهوية يجب أن يتكون من 10 أرقام';
if(!reg.nationality)err.nationality='الرجاء اختيار الجنسية';
setRegErr(err);if(Object.keys(err).length>0)return
setRegErr({});setRegStep(2)}} style={{...goldS,height:'clamp(38px,5vw,44px)',fontSize:'clamp(11px,1.6vw,13px)',flex:1}}>{lang==='ar'?'التالي':'Next'}</button>
<button onClick={()=>setShowReg(false)} style={{height:'clamp(38px,5vw,44px)',padding:'0 clamp(14px,2vw,20px)',borderRadius:11,background:'transparent',border:'1.5px solid rgba(255,255,255,.12)',color:'var(--tx4)',fontFamily:F,fontSize:'clamp(11px,1.6vw,13px)',fontWeight:600,cursor:'pointer'}}>{lang==='ar'?'إلغاء':'Cancel'}</button>
</>}
{regStep===2&&<>
<button onClick={()=>{
const err={};
if(!reg.email)err.email='الرجاء إدخال البريد الإلكتروني';
else if(!/\S+@\S+\.\S+/.test(reg.email))err.email='يرجى إدخال بريد إلكتروني صحيح';
if(!reg.pw)err.pw='الرجاء إدخال كلمة المرور';
else if(reg.pw.length<6)err.pw='كلمة المرور يجب أن تكون 6 أحرف على الأقل';
if(!reg.pw2)err.pw2='الرجاء تأكيد كلمة المرور';
else if(reg.pw!==reg.pw2)err.pw2='كلمة المرور غير متطابقة';
setRegErr(err);if(Object.keys(err).length>0)return
setRegErr({});setRegStep(3)}} style={{...goldS,height:'clamp(38px,5vw,44px)',fontSize:'clamp(11px,1.6vw,13px)',flex:1}}>{lang==='ar'?'التالي':'Next'}</button>
<button onClick={()=>setRegStep(1)} style={{height:'clamp(38px,5vw,44px)',padding:'0 clamp(14px,2vw,20px)',borderRadius:11,background:'transparent',border:'1.5px solid rgba(255,255,255,.12)',color:'var(--tx4)',fontFamily:F,fontSize:'clamp(11px,1.6vw,13px)',fontWeight:600,cursor:'pointer'}}>{lang==='ar'?'رجوع':'Back'}</button>
</>}
{regStep===3&&<>
<button onClick={()=>setRegStep(4)} style={{...goldS,height:'clamp(38px,5vw,44px)',fontSize:'clamp(11px,1.6vw,13px)',flex:1}}>{lang==='ar'?'مراجعة':'Review'}</button>
<button onClick={()=>setRegStep(2)} style={{height:'clamp(38px,5vw,44px)',padding:'0 clamp(14px,2vw,20px)',borderRadius:11,background:'transparent',border:'1.5px solid rgba(255,255,255,.12)',color:'var(--tx4)',fontFamily:F,fontSize:'clamp(11px,1.6vw,13px)',fontWeight:600,cursor:'pointer'}}>{lang==='ar'?'رجوع':'Back'}</button>
</>}
{regStep===4&&<>
<button onClick={()=>{doRegister()}} disabled={regBusy} style={{...goldS,height:'clamp(38px,5vw,44px)',fontSize:'clamp(11px,1.6vw,13px)',flex:1,opacity:regBusy?.7:1}}>{regBusy?<div style={{width:18,height:18,border:'2px solid rgba(14,14,14,.3)',borderTopColor:C.dk,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:lang==='ar'?'إرسال الطلب':'Submit'}</button>
<button onClick={()=>setRegStep(3)} style={{height:'clamp(38px,5vw,44px)',padding:'0 clamp(14px,2vw,20px)',borderRadius:11,background:'transparent',border:'1.5px solid rgba(255,255,255,.12)',color:'var(--tx4)',fontFamily:F,fontSize:'clamp(11px,1.6vw,13px)',fontWeight:600,cursor:'pointer'}}>{lang==='ar'?'رجوع':'Back'}</button>
</>}
</div>
</>:<>
<div style={{padding:'28px 24px',textAlign:'center'}}>
<div style={{width:60,height:60,borderRadius:'50%',background:'rgba(39,160,70,.08)',border:'2px solid rgba(39,160,70,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="rgba(39,160,70,.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
<div style={{fontSize:'clamp(15px,2.2vw,18px)',fontWeight:900,color:'var(--tx)',marginBottom:6}}>{lang==='ar'?'تم التسجيل بنجاح':'Registration Successful'}</div>
<div style={{fontSize:'clamp(10px,1.5vw,12px)',color:'var(--tx3)',lineHeight:1.8,marginBottom:4}}>{lang==='ar'?'تم إنشاء حسابك بنجاح':'Your account has been created successfully'}</div>
<div style={{fontSize:'clamp(12px,1.8vw,14px)',fontWeight:700,color:C.gold,marginBottom:16,direction:'ltr'}}>{reg.email}</div>
<div style={{background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.12)',borderRadius:10,padding:'12px 16px',marginBottom:18}}>
<div style={{fontSize:'clamp(9px,1.3vw,11px)',color:'rgba(255,255,255,.58)',lineHeight:1.8}}>{lang==='ar'?'حسابك قيد المراجعة — سيتم تفعيله بعد موافقة المسؤول':'Your account is under review — it will be activated after admin approval'}</div>
</div>
<button onClick={()=>setShowReg(false)} style={{...goldS,height:'clamp(38px,5vw,44px)',fontSize:'clamp(12px,1.8vw,14px)'}}>{lang==='ar'?'العودة لتسجيل الدخول':'Return to Login'}</button>
</div>
</>}
</div>
</div>}
<Css/></div>)}

function SetupPage({onSetup,onBack,toast,lang,switchLang,L}){
const[f,setF]=useState({ar:'',en:'',id_type:'',id:'',nat:'سعودي',ph:'',em:'',pw:'',pw2:''});
const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
const[setupShowPw,setSetupShowPw]=useState(false);const[setupShowPw2,setSetupShowPw2]=useState(false);
const[sErr,setSErr]=useState({});
const[idTypeOpen2,setIdTypeOpen2]=useState(false);
const[natOpen2,setNatOpen2]=useState(false);
const[natSearch2,setNatSearch2]=useState('');
const[idTypes2,setIdTypes2]=useState([]);
const[nats2,setNats2]=useState([{ar:'سعودي',en:'Saudi'},{ar:'يمني',en:'Yemeni'},{ar:'مصري',en:'Egyptian'},{ar:'سوداني',en:'Sudanese'},{ar:'أردني',en:'Jordanian'},{ar:'عراقي',en:'Iraqi'},{ar:'باكستاني',en:'Pakistani'},{ar:'هندي',en:'Indian'},{ar:'بنغلاديشي',en:'Bangladeshi'},{ar:'فلبيني',en:'Filipino'},{ar:'أخرى',en:'Other'}]);
const s=(k,v)=>setF(p=>({...p,[k]:v}));
const filtNats2=nats2.filter(n=>!natSearch2||n.ar.includes(natSearch2)||n.en.toLowerCase().includes(natSearch2.toLowerCase()));

useEffect(()=>{const sb=getSupabase();
sb.from('countries').select('nationality_ar,nationality_en').order('sort_order').order('name_ar').then(({data})=>{if(data?.length>0)setNats2(data.filter(d=>d.nationality_ar).map(d=>({ar:d.nationality_ar,en:d.nationality_en||d.nationality_ar})))});
sb.from('lookup_lists').select('id,list_key').then(({data:ll})=>{if(!ll)return;const idL=ll.find(l=>l.list_key==='id_type');if(idL)sb.from('lookup_items').select('value_ar,value_en').eq('list_id',idL.id).eq('is_active',true).order('sort_order').then(({data})=>setIdTypes2(data||[]))});
},[]);

const go=async()=>{
const ar=lang==='ar';
setSErr({});const err={};
if(!f.ar)err.ar=ar?'الرجاء إدخال الاسم بالعربي':'Please enter Arabic name';else if(f.ar.trim().split(/\s+/).length<2)err.ar=ar?'الرجاء إدخال الاسم الأول والأخير':'Please enter first and last name';else if(!/^[\u0600-\u06FF\s]+$/.test(f.ar))err.ar=ar?'يرجى كتابة الاسم باللغة العربية فقط':'Arabic characters only';
if(!f.en)err.en=ar?'الرجاء إدخال الاسم بالإنجليزي':'Please enter English name';else if(f.en.trim().split(/\s+/).length<2)err.en=ar?'الرجاء إدخال الاسم الأول والأخير':'Please enter first and last name';else if(!/^[a-zA-Z\s]+$/.test(f.en))err.en=ar?'يرجى كتابة الاسم باللغة الإنجليزية فقط':'English characters only';
if(!f.ph)err.ph=ar?'الرجاء إدخال رقم الجوال':'Please enter phone number';else if(f.ph.length!==9)err.ph=ar?'رقم الجوال يجب أن يتكون من 9 أرقام':'Phone must be 9 digits';
if(!f.id_type)err.id_type=ar?'الرجاء اختيار نوع الهوية':'Please select ID type';
if(!f.id)err.id=ar?'الرجاء إدخال رقم الهوية':'Please enter ID number';else if(f.id.length!==10)err.id=ar?'رقم الهوية يجب أن يتكون من 10 أرقام':'ID must be 10 digits';
if(!f.nat)err.nat=ar?'الرجاء اختيار الجنسية':'Please select nationality';
if(!f.em)err.em=ar?'الرجاء إدخال البريد الإلكتروني':'Please enter email';else if(!/\S+@\S+\.\S+/.test(f.em))err.em=ar?'يرجى إدخال بريد إلكتروني صحيح':'Please enter a valid email';
if(!f.pw)err.pw=ar?'الرجاء إدخال كلمة المرور':'Please enter password';else if(f.pw.length<6)err.pw=ar?'كلمة المرور يجب أن تكون 6 أحرف على الأقل':'Password must be at least 6 characters';
if(!f.pw2)err.pw2=ar?'الرجاء تأكيد كلمة المرور':'Please confirm password';else if(f.pw!==f.pw2)err.pw2=ar?'كلمة المرور غير متطابقة':'Passwords do not match';
setSErr(err);if(Object.keys(err).length>0)return
setBusy(true);try{await onSetup(f);setDone(true)}catch(e){toast('خطأ: '+e.message)}setBusy(false)};

const fS2={width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:'clamp(12px,1.8vw,13px)',fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',textAlign:'center',boxSizing:'border-box'};
const lS2={fontSize:'clamp(10px,1.5vw,12px)',fontWeight:700,color:'var(--tx3)',marginBottom:'clamp(3px,.5vw,5px)'};

if(done)return(<div style={{position:'fixed',inset:0,background:'rgba(14,14,14,.96)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F,direction:L.dir,zIndex:9999}}><div style={{textAlign:'center'}}><div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 16px',background:'rgba(39,160,70,.1)',border:'2px solid rgba(39,160,70,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'clamp(28px,4vw,36px)'}}>{'\u2713'}</div><div style={{fontSize:'clamp(18px,3vw,22px)',fontWeight:900,color:'var(--tx)',marginBottom:6}}>{L.successTitle}</div><div style={{fontSize:'clamp(10px,1.4vw,11px)',color:'var(--tx4)',lineHeight:2,marginBottom:20}}>{L.successSub}</div><button onClick={onBack} style={{...goldS,width:'auto',padding:'0 36px',margin:'0 auto'}}>{L.goLogin}</button></div><Css/></div>);

return(<div className='setup-wrap' style={{display:'flex',height:'100vh',background:'var(--bg)',direction:L.dir,fontFamily:F,overflow:'auto'}}>
<div className='setup-form' style={{width:'min(520px,96vw)',flexShrink:0,background:'var(--sf)',display:'flex',flexDirection:'column',alignItems:'center',padding:'28px 36px 48px',position:'relative',overflowY:'auto',minHeight:'100vh'}}>
<GoldBar/><LangBtn L={L} switchLang={switchLang} abs/>
<button onClick={onBack} style={{position:'absolute',top:14,[lang==='ar'?'right':'left']:14,background:'rgba(255,255,255,.06)',border:'1.5px dashed rgba(255,255,255,.07)',borderRadius:11,fontFamily:F,fontSize:'clamp(9px,1.3vw,10px)',fontWeight:700,color:'rgba(201,168,76,.45)',cursor:'pointer',height:32,padding:'0 12px',zIndex:2,display:'flex',alignItems:'center',gap:4}}>{lang==='ar'?<><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>{' رجوع'}</>:<><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>{' Back'}</>}</button>

<div style={{textAlign:'center',marginBottom:14,width:'100%',marginTop:40}}>
<div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.15)',borderRadius:20,padding:'4px 14px',fontSize:'clamp(8px,1.2vw,9px)',fontWeight:800,color:C.gold,marginBottom:8}}>{ICO.bolt} {L.firstTime}</div>
<div style={{fontSize:'clamp(18px,2.8vw,22px)',fontWeight:900,color:'rgba(255,255,255,.96)'}}>{L.setupTitle}</div>
<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'var(--tx4)',marginTop:4}}>{L.setupSub}</div>
</div>

<div style={{width:'100%',display:'flex',flexDirection:'column',gap:'clamp(10px,1.5vw,14px)'}}>
{/* الاسم */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'clamp(8px,1.2vw,10px)'}}>
<div><div style={lS2}>{lang==='ar'?'الاسم بالعربي *':'Name Arabic *'}</div><input value={f.ar} onChange={e=>s('ar',e.target.value)} style={{...fS2,borderColor:sErr.ar?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'الاسم الأول والأخير':'First and Last Name'}/>{sErr.ar&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{sErr.ar}</div>}</div>
<div><div style={lS2}>{lang==='ar'?'الاسم بالإنجليزي *':'Name English *'}</div><input value={f.en} onChange={e=>s('en',e.target.value)} style={{...fS2,direction:'ltr',borderColor:sErr.en?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'الاسم الأول والأخير':'First and Last Name'}/>{sErr.en&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{sErr.en}</div>}</div>
</div>

{/* الجوال */}
<div><div style={lS2}>{lang==='ar'?'رقم الجوال *':'Phone *'}</div>
<div style={{display:'flex',direction:'ltr',border:sErr.ph?'1.5px solid rgba(192,57,43,.5)':'1.5px solid rgba(255,255,255,.1)',borderRadius:8,overflow:'hidden',background:'rgba(255,255,255,.04)'}}>
<div style={{height:'clamp(38px,5vw,42px)',padding:'0 14px',background:'rgba(255,255,255,.06)',borderRight:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',fontSize:'clamp(10px,1.4vw,13px)',fontWeight:700,color:'var(--tx3)',flexShrink:0}}>+966</div>
<input value={f.ph} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,9);s('ph',v)}} style={{width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:'none',background:'transparent',fontFamily:F,fontSize:'clamp(12px,1.8vw,14px)',fontWeight:600,color:'var(--tx)',outline:'none',textAlign:'left'}} placeholder={lang==='ar'?'5x xxx xxxx':'5x xxx xxxx'}/>
</div>{sErr.ph&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{sErr.ph}</div>}</div>

{/* نوع الهوية + رقم الهوية */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={lS2}>{lang==='ar'?'نوع الهوية *':'ID Type *'}</div>
<div style={{position:'relative'}}>
<div onClick={()=>{setIdTypeOpen2(!idTypeOpen2);setNatOpen2(false)}} style={{...fS2,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',color:f.id_type?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)',borderColor:sErr.id_type?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,transform:idTypeOpen2?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke="#c9a84c" strokeWidth="2.5" fill="none"/></svg>
<span style={{flex:1,textAlign:'center'}}>{f.id_type?(lang==='ar'?f.id_type:(idTypes2.find(t=>t.value_ar===f.id_type)?.value_en||f.id_type)):(lang==='ar'?'— اختر —':'— Select —')}</span>
</div>
{idTypeOpen2&&<><div onClick={()=>setIdTypeOpen2(false)} style={{position:'fixed',inset:0,zIndex:19}}/><div style={{position:'absolute',top:'calc(100% + 4px)',right:0,left:0,background:'var(--sb)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,overflow:'hidden',zIndex:20,boxShadow:'0 8px 32px rgba(0,0,0,.6)'}}>
{idTypes2.map(t=><div key={t.value_ar} onClick={()=>{s('id_type',t.value_ar);setIdTypeOpen2(false)}} style={{padding:'10px 14px',fontSize:'clamp(11px,1.5vw,12px)',fontWeight:f.id_type===t.value_ar?700:500,color:f.id_type===t.value_ar?C.gold:'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid var(--bd2)',background:f.id_type===t.value_ar?'rgba(201,168,76,.06)':'transparent'}}>{lang==='ar'?t.value_ar:(t.value_en||t.value_ar)}</div>)}
</div></>}
</div>{sErr.id_type&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{sErr.id_type}</div>}</div>
<div><div style={lS2}>{lang==='ar'?'رقم الهوية *':'ID Number *'}</div><input value={f.id} onChange={e=>s('id',e.target.value.replace(/\D/g,'').slice(0,10))} style={{...fS2,borderColor:sErr.id?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'أدخل 10 أرقام':'Enter 10 digits'} maxLength={10}/>{sErr.id&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{sErr.id}</div>}</div>
</div>

{/* الجنسية */}
<div><div style={lS2}>{lang==='ar'?'الجنسية *':'Nationality *'}</div>
<div style={{position:'relative'}}>
<div onClick={()=>{setNatOpen2(!natOpen2);setIdTypeOpen2(false)}} style={{...fS2,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',color:f.nat?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)',borderColor:sErr.nat?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,transform:natOpen2?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke="#c9a84c" strokeWidth="2.5" fill="none"/></svg>
<span style={{flex:1,textAlign:'center'}}>{f.nat?(lang==='ar'?f.nat:(nats2.find(n=>n.ar===f.nat)?.en||f.nat)):(lang==='ar'?'اختر الجنسية':'Select Nationality')}</span>
</div>
{natOpen2&&<><div onClick={()=>{setNatOpen2(false);setNatSearch2('')}} style={{position:'fixed',inset:0,zIndex:19}}/><div style={{position:'absolute',bottom:'calc(100% + 4px)',right:0,left:0,background:'var(--sb)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,maxHeight:200,display:'flex',flexDirection:'column',zIndex:20,boxShadow:'0 -8px 32px rgba(0,0,0,.6)'}}>
<div style={{padding:'6px 8px',borderBottom:'1px solid var(--bd)',flexShrink:0}}>
<input value={natSearch2} onChange={e=>setNatSearch2(e.target.value)} placeholder={lang==='ar'?'بحث...':'Search...'} autoFocus style={{width:'100%',height:34,padding:'0 10px',border:'1px solid var(--bd)',borderRadius:6,background:'rgba(255,255,255,.04)',fontFamily:F,fontSize:14,color:'var(--tx2)',outline:'none',textAlign:'center'}}/>
</div>
<div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
{filtNats2.map(n=><div key={n.ar} onClick={()=>{s('nat',n.ar);setNatOpen2(false);setNatSearch2('')}} style={{padding:'10px 14px',fontSize:13,fontWeight:f.nat===n.ar?700:500,color:f.nat===n.ar?C.gold:'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid var(--bd2)',background:f.nat===n.ar?'rgba(201,168,76,.06)':'transparent'}}>{lang==='ar'?n.ar:n.en}</div>)}
</div>
</div></>}
</div>{sErr.nat&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{sErr.nat}</div>}</div>

{/* البريد */}
<div><div style={lS2}>{lang==='ar'?'البريد الإلكتروني *':'Email *'}</div><div style={{position:'relative'}}><span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:12,pointerEvents:'none',display:'flex'}}>{ICO.email}</span><input value={f.em} onChange={e=>s('em',e.target.value)} type="email" style={{...fS2,direction:'ltr',paddingRight:42,borderColor:sErr.em?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'admin@jisr.sa':'admin@jisr.sa'}/></div>{sErr.em&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{sErr.em}</div>}</div>

{/* كلمة المرور */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={lS2}>{lang==='ar'?'كلمة المرور *':'Password *'}</div><div style={{position:'relative'}}><span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:12,pointerEvents:'none',display:'flex'}}>{ICO.lock}</span><input value={f.pw} onChange={e=>s('pw',e.target.value)} type={setupShowPw?'text':'password'} style={{...fS2,paddingRight:42,paddingLeft:36,borderColor:sErr.pw?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'6 أحرف على الأقل':'At least 6 characters'}/><button type="button" onClick={()=>setSetupShowPw(!setupShowPw)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:10,background:'none',border:'none',cursor:'pointer',display:'flex',padding:2}}>{setupShowPw?ICO.eyeOn:ICO.eyeOff}</button></div>{sErr.pw&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{sErr.pw}</div>}</div>
<div><div style={lS2}>{lang==='ar'?'تأكيد *':'Confirm *'}</div><div style={{position:'relative'}}><span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:12,pointerEvents:'none',display:'flex'}}>{ICO.lock}</span><input value={f.pw2} onChange={e=>s('pw2',e.target.value)} type={setupShowPw2?'text':'password'} style={{...fS2,paddingRight:42,paddingLeft:36,borderColor:sErr.pw2?'rgba(192,57,43,.5)':'rgba(255,255,255,.1)'}} placeholder={lang==='ar'?'تأكيد كلمة المرور':'Confirm password'}/><button type="button" onClick={()=>setSetupShowPw2(!setupShowPw2)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:10,background:'none',border:'none',cursor:'pointer',display:'flex',padding:2}}>{setupShowPw2?ICO.eyeOn:ICO.eyeOff}</button></div>{sErr.pw2&&<div style={{fontSize:'clamp(9px,1.3vw,10px)',color:'rgba(192,57,43,.7)',marginTop:3}}>{sErr.pw2}</div>}</div>
</div>

<button onClick={go} disabled={busy} style={{...goldS,height:'clamp(42px,6vw,50px)',marginTop:16,marginBottom:40,opacity:busy?.7:1}}>{busy?<div style={{width:20,height:20,border:'2.5px solid rgba(14,14,14,.3)',borderTopColor:C.dk,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:L.create}</button>
</div>
</div>
<div className='setup-brand' style={{flex:1,display:'flex',minHeight:'100vh'}}><BrandPanel lang={lang} L={L}/></div><Css/></div>)}

function ResetPage({sb,onDone,toast,lang,L}){
const[pw,setPw]=useState('');const[pw2,setPw2]=useState('');const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
const go=async()=>{
if(!pw||!pw2){toast(lang==='ar'?'أدخل كلمة المرور الجديدة':'Enter new password');return}
if(pw!==pw2){toast(lang==='ar'?'كلمة المرور غير متطابقة':'Passwords do not match');return}
if(pw.length<6){toast(lang==='ar'?'كلمة المرور 6 أحرف على الأقل':'Password must be at least 6 characters');return}
setBusy(true);
try{const{error}=await sb.auth.updateUser({password:pw});if(error)throw error;setDone(true)}
catch(err){toast(lang==='ar'?'خطأ: '+(err.message||'حاول مرة أخرى'):'Error: '+(err.message||'Try again'))}
setBusy(false)};
if(done)return(<div style={{position:'fixed',inset:0,background:'rgba(14,14,14,.96)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:F,direction:'rtl',zIndex:9999}}><div style={{textAlign:'center'}}>
<div style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 16px',background:'rgba(39,160,70,.1)',border:'2px solid rgba(39,160,70,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="rgba(39,160,70,.8)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
<div style={{fontSize:'clamp(18px,3vw,22px)',fontWeight:900,color:'var(--tx)',marginBottom:6}}>{lang==='ar'?'تم تغيير كلمة المرور':'Password changed!'}</div>
<div style={{fontSize:12,color:'var(--tx4)',lineHeight:2,marginBottom:20}}>{lang==='ar'?'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة':'You can now sign in with your new password'}</div>
<button onClick={onDone} style={{...goldS,width:'auto',padding:'0 36px'}}>{lang==='ar'?'تسجيل الدخول':'Sign In'}</button>
</div><Css/></div>);
return(<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',fontFamily:F,direction:'rtl'}}>
<div style={{width:'min(420px,92vw)',background:'var(--sf)',borderRadius:20,padding:'clamp(24px,4vw,36px) clamp(20px,4vw,28px)',boxShadow:'0 20px 60px rgba(0,0,0,.5)',position:'relative',border:'1px solid rgba(201,168,76,.12)'}}>
<GoldBar/>
<div style={{textAlign:'center',marginBottom:24}}>
<div style={{width:56,height:56,borderRadius:'50%',background:'rgba(201,168,76,.1)',border:'1.5px solid rgba(201,168,76,.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>{ICO.lock}</div>
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

function DashPage({sb,user,onLogout,toast,lang,switchLang,setLang}){const[pg,setPg]=useState('home');const[toastMsg,setToastMsg]=useState(null);const tt=m=>{setToastMsg(m);setTimeout(()=>setToastMsg(null),3000)};const[userMenu,setUserMenu]=useState(false);const[showProfile,setShowProfile]=useState(false);const[profileData,setProfileData]=useState(null);const[profileBank,setProfileBank]=useState(null);const[profileBusy,setProfileBusy]=useState(false);const[profileTab,setProfileTab]=useState('info');const[profileErr,setProfileErr]=useState({});const[profileBanks,setProfileBanks]=useState([]);const[profileBankDrop,setProfileBankDrop]=useState(false);const[profilePerf,setProfilePerf]=useState(null);const[profileAtt,setProfileAtt]=useState([]);const[profileTasks,setProfileTasks]=useState([]);const[profileSalary,setProfileSalary]=useState([]);const[profileLoans,setProfileLoans]=useState([]);const[profileLogins,setProfileLogins]=useState([]);const[stats,setStats]=useState(null);const[notifs,setNotifs]=useState([]);const[myNotifs,setMyNotifs]=useState([]);const[showNotifs,setShowNotifs]=useState(false);const[notifTab,setNotifTab]=useState('my');const[showAiChat,setShowAiChat]=useState(false);const[showUserMenu,setShowUserMenu]=useState(false);const[showTopDrop,setShowTopDrop]=useState(false);const[theme,setTheme]=useState(()=>localStorage.getItem('jisr_theme')||'dark');useEffect(()=>{document.documentElement.setAttribute('data-theme',theme);localStorage.setItem('jisr_theme',theme);const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',theme==='dark'?'#171717':'#faf8f3');document.body.style.background=theme==='dark'?'#171717':'#faf8f3'},[theme]);const toggleTheme=()=>setTheme(t=>t==='dark'?'light':'dark');const[dashBranch,setDashBranch]=useState(null);const[dashBranches,setDashBranches]=useState([]);const[sTabInfo,setSTabInfo]=useState({tab:'general',svcSubTab:'services'});const[searchQ,setSearchQ]=useState('');const[searchResults,setSearchResults]=useState([]);const[searchOpen,setSearchOpen]=useState(false);const[searchLoading,setSearchLoading]=useState(false);const[activityLog,setActivityLog]=useState([]);const[activityLoading,setActivityLoading]=useState(false);const[sideOpen,setSideOpen]=useState(false);const[taskCount,setTaskCount]=useState(0);const[approvalCount,setApprovalCount]=useState(0);const[todayAppointments,setTodayAppointments]=useState([]);const[lastWeeklyUpdate,setLastWeeklyUpdate]=useState(null);const[expanded,setExpanded]=useState({tasks_section:true,facilities_workforce:true,finance:true,data:false,reports:false,admin:false});
const[showKafalaCalc,setShowKafalaCalc]=useState(false);
const[isStandalone]=useState(()=>window.navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches);
const[installPrompt,setInstallPrompt]=useState(null);
const[showInstallBanner,setShowInstallBanner]=useState(false);
useEffect(()=>{const h=e=>{e.preventDefault();setInstallPrompt(e);if(!isStandalone&&!localStorage.getItem('jisr_install_dismissed'))setShowInstallBanner(true)};window.addEventListener('beforeinstallprompt',h);return()=>window.removeEventListener('beforeinstallprompt',h)},[isStandalone]);
const handleInstall=async()=>{if(!installPrompt)return;installPrompt.prompt();const{outcome}=await installPrompt.userChoice;if(outcome==='accepted')setShowInstallBanner(false);setInstallPrompt(null)};const toggleSec=k=>setExpanded(p=>({...p,[k]:!p[k]}));const hubDefaults={workforce:'facilities',operations:'transactions_external',finance_hub:'invoices',clients_hub:'clients',manpower_hub:'mp_dashboard',messaging_hub:'msg_send',admin_hub:'admin_offices',reports_hub:'report_periodic'};const setPage=(id)=>{const mapped=hubDefaults[id]||id;setPg(mapped);setSideOpen(false)};
const loadStats=useCallback(()=>{const brId=dashBranch||null;const today=new Date().toISOString().slice(0,10);Promise.all([sb.rpc('get_branch_stats',{p_branch_id:brId}),sb.from('notifications_view').select('*'),sb.from('employee_notifications').select('*').eq('user_id',user?.id).order('created_at',{ascending:false}).limit(50),sb.from('branches').select('id,name_ar').is('deleted_at',null).order('name_ar'),sb.from('system_settings').select('setting_value').eq('setting_key','last_weekly_update').single(),sb.from('tasks').select('id',{count:'exact',head:true}).is('deleted_at',null).in('status',['pending','in_progress','overdue']),sb.from('approval_requests').select('id',{count:'exact',head:true}).eq('status','pending'),sb.from('appointments').select('*').is('deleted_at',null).eq('date',today).in('status',['scheduled','confirmed'])]).then(([statsR,notifsR,myNotifsR,branchesR,weeklyR,tasksR,approvalsR,apptsR])=>{if(statsR.data)setStats(statsR.data);setNotifs(notifsR.data||[]);setMyNotifs(myNotifsR.data||[]);setDashBranches(branchesR.data||[]);if(weeklyR.data?.setting_value)setLastWeeklyUpdate(new Date(weeklyR.data.setting_value));setTaskCount(tasksR.count||0);setApprovalCount(approvalsR.count||0);setTodayAppointments(apptsR.data||[])})},[sb,dashBranch]);useEffect(()=>{loadStats()},[loadStats]);
// ═══ OTP Push Notifications via Service Worker ═══
const[otpSW,setOtpSW]=useState(null);
useEffect(()=>{
// Register OTP service worker
if('serviceWorker' in navigator){
navigator.serviceWorker.register('/otp-sw.js').then(reg=>{setOtpSW(reg);console.log('OTP SW registered')}).catch(()=>{})
// Listen for copy commands from SW
navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='COPY_OTP'&&e.data.code){navigator.clipboard.writeText(e.data.code);tt('تم نسخ الرمز: '+e.data.code)}})
}
if('Notification' in window&&Notification.permission==='default')Notification.requestPermission()
},[]);
useEffect(()=>{if(!sb)return;let lastOtpCount=0;
sb.from('otp_messages').select('id',{count:'exact',head:true}).then(({count})=>{lastOtpCount=count||0});
const otpInterval=setInterval(()=>{sb.from('otp_messages').select('*').order('received_at',{ascending:false}).limit(5).then(({data})=>{if(!data)return;if(lastOtpCount>0&&data.length>0){const latest=data[0];const age=(Date.now()-new Date(latest.received_at).getTime())/1000;if(age<15){const title=latest.otp_code?'رمز تحقق: '+latest.otp_code:'رسالة تحقق جديدة';const body=(latest.person_name||'')+' — '+(latest.phone_from||'')+'\n'+(latest.message_body||'').substring(0,80);
// Use Service Worker for persistent push notification
if(otpSW&&otpSW.active){otpSW.active.postMessage({type:'OTP_NOTIFICATION',title,body,tag:latest.id,icon:'/icons/icon-192.png',otp_code:latest.otp_code})}else if('Notification' in window&&Notification.permission==='granted'){new Notification(title,{body,icon:'/icons/icon-192.png',tag:latest.id,requireInteraction:true})}
tt(latest.person_name+': '+(latest.otp_code||'جديد')+' — '+(latest.phone_from||''))}}sb.from('otp_messages').select('id',{count:'exact',head:true}).then(({count})=>{lastOtpCount=count||0})})},10000);
return()=>clearInterval(otpInterval)},[sb]);
useEffect(()=>{if(!sb)return;const ch=sb.channel('jisr-realtime-sync').on('postgres_changes',{event:'*',schema:'public',table:'invoices'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'transactions'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'tasks'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'clients'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'workers'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'facilities'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'appointments'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'smart_alerts'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'attendance'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'activity_log'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'daily_stats'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'invoice_payments'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'escalations'},()=>loadStats()).subscribe();return()=>{sb.removeChannel(ch)}},[sb,loadStats]);
useEffect(()=>{const cleanup=setupKeyboardShortcuts({'ctrl+k':()=>{const el=document.querySelector('.topbar-search-box input');if(el)el.focus()},'ctrl+n':()=>{},'ctrl+/':()=>{tt(T('Ctrl+K بحث سريع | Ctrl+N إضافة جديد','Ctrl+K Quick Search | Ctrl+N New'))},'escape':()=>{setSideOpen(false);setShowNotifs(false);setShowAiChat(false)}});return cleanup},[]);
const doSearch=useCallback(async(q)=>{if(!q||q.length<2){setSearchResults([]);return}setSearchLoading(true);try{const[fac,wrk,cli,inv]=await Promise.all([sb.from('facilities').select('id,name_ar,unified_national_number,cr_number').is('deleted_at',null).or(`name_ar.ilike.%${q}%,unified_national_number.ilike.%${q}%,cr_number.ilike.%${q}%`).limit(5),sb.from('workers').select('id,name_ar,iqama_number,phone').is('deleted_at',null).or(`name_ar.ilike.%${q}%,iqama_number.ilike.%${q}%,phone.ilike.%${q}%`).limit(5),sb.from('clients').select('id,name_ar,id_number,phone').is('deleted_at',null).or(`name_ar.ilike.%${q}%,id_number.ilike.%${q}%,phone.ilike.%${q}%`).limit(5),sb.from('invoices').select('id,invoice_number,total_amount,status').is('deleted_at',null).or(`invoice_number.ilike.%${q}%`).limit(5)]);const r=[];(fac.data||[]).forEach(d=>r.push({type:'facility',icon:'facility',label:d.name_ar,sub:d.cr_number||d.unified_national_number||'',pg:'facilities',id:d.id}));(wrk.data||[]).forEach(d=>r.push({type:'worker',icon:'worker',label:d.name_ar,sub:d.iqama_number||d.phone||'',pg:'workers',id:d.id}));(cli.data||[]).forEach(d=>r.push({type:'client',icon:'client',label:d.name_ar,sub:d.id_number||d.phone||'',pg:'clients',id:d.id}));(inv.data||[]).forEach(d=>r.push({type:'invoice',icon:'invoice',label:d.invoice_number,sub:Number(d.total_amount||0).toLocaleString()+' ر.س',pg:'invoices',id:d.id}));setSearchResults(r)}catch(e){setSearchResults([])}setSearchLoading(false)},[sb]);useEffect(()=>{const t=setTimeout(()=>doSearch(searchQ),300);return()=>clearTimeout(t)},[searchQ,doSearch]);
const loadActivityLog=useCallback(async()=>{setActivityLoading(true);try{const{data}=await sb.from('activity_log').select('*,users:user_id(name_ar,name_en)').order('created_at',{ascending:false}).limit(100);setActivityLog(data||[])}catch(e){setActivityLog([])}setActivityLoading(false)},[sb]);
const T=(ar,en)=>lang==='ar'?ar:en;const TL=(ar)=>lang==='ar'?ar:(TR[ar]||ar);const nav=[
{id:'home',l:T('الرئيسية','Dashboard'),i:'home'},
{id:'workforce',l:T('العمالة والمنشآت','Workforce'),i:'worker'},
{id:'operations',l:T('العمليات','Operations'),i:'transaction',n:taskCount},
{id:'finance_hub',l:T('المالية','Finance'),i:'invoice'},
{id:'clients_hub',l:T('العملاء والحسابات','Clients'),i:'client'},
{id:'manpower_hub',l:T('توريد العمالة','Labor Supply'),i:'facility'},
{id:'messaging_hub',l:T('التواصل','Messaging'),i:'message'},
{id:'admin_hub',l:T('الإدارة','Admin'),i:'settings'},
{id:'reports_hub',l:T('التقارير','Reports'),i:'chart'},
{id:'otp_messages',l:T('رسائل التحقق','OTP'),i:'alert'},
{id:'settings',l:T('الإعدادات','Settings'),i:'settings'}
];const pages={
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
{k:'owner_id',l:'المالك',fk:'owners'},
{k:'gosi_owner_id',l:'مالك التأمينات',fk:'owners'},
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

owners:{table:'owners',title:T('الملّاك والشركاء','Owners & Partners'),icon:'client',
cols:[['name_ar','الاسم'],['id_number','الهوية'],['nationality','الجنسية'],['mobile_personal','الجوال'],['gender','الجنس']],
flds:[
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'id_type',l:'نوع الهوية',o:['national_id','iqama','gcc_id','passport']},
{k:'id_number',l:'رقم الهوية',d:1},
{k:'nationality',l:'الجنسية',fk:'lookup_items'},
{k:'mobile_personal',l:'جوال شخصي',d:1},
{k:'mobile_work',l:'جوال عمل',d:1},
{k:'email',l:'البريد الإلكتروني',d:1},
{k:'date_of_birth',l:'تاريخ الميلاد ميلادي',t:'date'},
{k:'date_of_birth_h',l:'تاريخ الميلاد هجري'},
{k:'gender',l:'الجنس',o:['male','female']},
{k:'is_relative',l:'قريب',o:['true','false']},
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

transactions_internal:{table:'transactions',title:T('المعاملات الداخلية','Internal Transactions'),icon:'transaction',
filter:{k:'transaction_type',v:'internal_task'},
cols:[['transaction_number',T('الرقم','No.')],['status',T('الحالة','Status')],['priority',T('الأولوية','Priority')],['start_date',T('البدء','Start')],['due_date',T('الاستحقاق','Due')]],
flds:[
{k:'transaction_number',l:'رقم المعاملة',d:1},
{k:'transaction_type',l:'نوع المعاملة',o:['internal_task'],r:1},
{k:'facility_id',l:'المنشأة',fk:'facilities'},
{k:'branch_id',l:'المكتب',fk:'branches'},
{k:'worker_id',l:'العامل',fk:'workers'},
{k:'status',l:'الحالة',o:['draft','in_progress','completed','cancelled','issue'],r:1},
{k:'cancellation_reason',l:'سبب الإلغاء',w:1},
{k:'priority',l:'الأولوية',o:['low','normal','high','urgent']},
{k:'start_date',l:'تاريخ البدء',t:'date'},
{k:'due_date',l:'تاريخ الاستحقاق',t:'date'},
{k:'completed_date',l:'تاريخ الإنجاز',t:'date'},
{k:'notes',l:'ملاحظات',w:1}
]},

transactions_external:{table:'transactions',title:T('المعاملات الخارجية','External Transactions'),icon:'transaction',
filter:{k:'transaction_type',v:'client_transaction'},
cols:[['transaction_number','الرقم'],['status','الحالة'],['priority','الأولوية'],['start_date','البدء'],['due_date','الاستحقاق']],
flds:[
{k:'transaction_number',l:'رقم المعاملة',d:1},
{k:'transaction_type',l:'نوع المعاملة',o:['client_transaction'],r:1},
{k:'facility_id',l:'المنشأة',fk:'facilities'},
{k:'branch_id',l:'المكتب',fk:'branches'},
{k:'parent_transaction_id',l:'المعاملة الأصلية',fk:'transactions'},
{k:'client_id',l:'العميل',fk:'clients'},
{k:'broker_id',l:'الوسيط',fk:'brokers'},
{k:'worker_id',l:'العامل',fk:'workers'},
{k:'status',l:'الحالة',o:['draft','in_progress','completed','cancelled','issue'],r:1},
{k:'cancellation_reason',l:'سبب الإلغاء',w:1},
{k:'priority',l:'الأولوية',o:['low','normal','high','urgent']},
{k:'start_date',l:'تاريخ البدء',t:'date'},
{k:'due_date',l:'تاريخ الاستحقاق',t:'date'},
{k:'completed_date',l:'تاريخ الإنجاز',t:'date'},
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

facility_partners:{table:'facility_partners',title:'شركاء المنشأة',icon:'client',
cols:[['is_manager','مدير'],['ownership_percentage','نسبة الملكية'],['status','الحالة']],
flds:[
{k:'facility_id',l:'المنشأة',fk:'facilities'},
{k:'owner_id',l:'المالك',fk:'owners'},
{k:'owner_facility_id',l:'منشأة المالك',fk:'facilities'},
{k:'is_manager',l:'مدير المنشأة',o:['true','false']},
{k:'ownership_percentage',l:'نسبة الملكية %',d:1},
{k:'status',l:'الحالة',o:['active','inactive'],r:1},
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
{k:'owner_id',l:'المالك',fk:'owners'},
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

lookup_lists:{table:'lookup_lists',title:'القوائم',icon:'settings',
cols:[['list_key','المفتاح'],['name_ar','الاسم'],['name_en','بالإنجليزي'],['is_system','نظامي'],['is_active','نشط']],
flds:[
{k:'list_key',l:'مفتاح القائمة',r:1,d:1},
{k:'name_ar',l:'الاسم بالعربي',r:1},{k:'name_en',l:'الاسم بالإنجليزي',d:1},
{k:'is_system',l:'نظامي',o:['true','false']},
{k:'is_active',l:'نشط',o:['true','false']}
]},

lookup_items:{table:'lookup_items',title:'عناصر القوائم',icon:'settings',
cols:[['value_ar','القيمة'],['value_en','بالإنجليزي'],['code','الكود'],['sort_order','الترتيب'],['is_active','نشط']],
flds:[
{k:'list_id',l:'القائمة',fk:'lookup_lists'},
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

};const pageConf=pages[pg];const pgTitle=(()=>{for(const n of nav){if(n.id===pg)return n.l;if(n.children){const c=n.children.find(c=>c.id===pg);if(c)return c.l}}return T('الرئيسية','Dashboard')})();const pgIcon=(()=>{for(const n of nav){if(n.id===pg)return n.i;if(n.children){const c=n.children.find(c=>c.id===pg);if(c)return c.i}}return 'home'})();return(<div className='dash-wrap' dir={lang==='ar'?'rtl':'ltr'} style={{display:'flex',height:'100vh',direction:lang==='ar'?'rtl':'ltr',fontFamily:"'Cairo',sans-serif",background:'var(--bg)',WebkitFontSmoothing:'antialiased',overflow:'hidden'}}>
{/* ═══ MOBILE OVERLAY ═══ */}
{sideOpen&&<div className='mob-overlay' onClick={()=>setSideOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',backdropFilter:'blur(3px)',zIndex:199,display:'none'}}/>}
{/* ═══ SIDEBAR — Design 5 Grouped ═══ */}
<aside className={'dash-side'+(sideOpen?' side-open':'')} style={{width:210,background:'var(--sb)',display:'flex',flexDirection:'column',flexShrink:0,[lang==='ar'?'borderLeft':'borderRight']:'1px solid rgba(201,168,76,.12)'}}>
{/* Logo */}
<div style={{padding:'14px 24px 14px',borderBottom:'1px solid var(--bd)',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
<div style={{fontSize:26,fontWeight:900,color:C.gold,letterSpacing:'-1px',lineHeight:1,fontFamily:"'Noto Kufi Arabic','Cairo',sans-serif"}}>{lang==='ar'?'جسر':'JISR'}</div>
<div style={{fontSize:10,fontWeight:500,color:'var(--sbtx3)',marginTop:8}}>{lang==='ar'?'جسر للأعمال':'Jisr Business'}</div>
</div>
{/* Nav */}
<nav style={{flex:1,overflowY:'auto',padding:'8px 10px 60px',scrollbarWidth:'none',msOverflowStyle:'none',WebkitOverflowScrolling:'touch'}}>
<style>{'aside nav::-webkit-scrollbar{display:none}'}</style>
<div style={{display:'flex',flexDirection:'column',gap:3}}>
{nav.map((n,i)=>{
const isActive=pg===n.id||(n.id==='workforce'&&['facilities','workers','compliance','worker_leaves'].includes(pg))||(n.id==='operations'&&['transactions_internal','transactions_external','tasks','sla_monitor','workflow','transfer_calc'].includes(pg))||(n.id==='finance_hub'&&['invoices','payments','pricing_calc','cash_flow','audit','op_expenses','budget','ext_payments','data_import'].includes(pg))||(n.id==='clients_hub'&&['clients','brokers','providers','client_statement','profitability','nps','contracts'].includes(pg))||(n.id==='manpower_hub'&&['mp_dashboard','mp_projects','mp_workers','mp_extracts','mp_partners'].includes(pg))||(n.id==='messaging_hub'&&['msg_send','msg_templates','msg_log','msg_groups','msg_settings'].includes(pg))||(n.id==='admin_hub'&&['admin_offices','attendance','approvals','activity_log','auto_alerts','archive','suppliers'].includes(pg))||(n.id==='reports_hub'&&['report_periodic','emp_performance','branch_compare','live_monitor','weekly_report','invoice_followups','report_alerts','report_performance'].includes(pg))||(n.id==='settings'&&pg==='settings')
const isSep=n.id==='settings'
return<div key={n.id}>
{isSep&&<div style={{height:1,background:'rgba(255,255,255,.06)',margin:'8px 14px'}}/>}
<div onClick={()=>setPage(n.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,cursor:'pointer',fontSize:13,fontWeight:isActive?700:500,color:isActive?C.gold:'rgba(255,255,255,.5)',background:isActive?'rgba(201,168,76,.08)':'transparent',border:isActive?'1px solid rgba(201,168,76,.12)':'1px solid transparent',transition:'.2s',position:'relative'}}>
{isActive&&<div style={{position:'absolute',[lang==='ar'?'right':'left']:0,top:'50%',transform:'translateY(-50%)',width:3,height:22,borderRadius:3,background:C.gold}}/>}
<span style={{flex:1}}>{n.l}</span>
{n.n>0&&<span style={{fontSize:9,fontWeight:700,background:C.red,color:'#fff',padding:'1px 6px',borderRadius:8,minWidth:16,textAlign:'center'}}>{n.n}</span>}
</div>
</div>})}
</div>
</nav>
</aside>
{/* ═══ MAIN AREA ═══ */}
<div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--sf)',minWidth:0}}>
{/* ═══ TOPBAR ═══ */}
<header className='dash-header' style={{height:48,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',borderBottom:'1px solid var(--bd)',flexShrink:0}}>
<div className='mob-hamburger' onClick={()=>setSideOpen(!sideOpen)} style={{display:'none',width:36,height:36,borderRadius:8,background:sideOpen?'rgba(201,168,76,.12)':'rgba(255,255,255,.04)',border:'1px solid '+(sideOpen?'rgba(201,168,76,.2)':'rgba(255,255,255,.08)'),alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sideOpen?C.gold:'rgba(255,255,255,.5)'} strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="16" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></div>
{/* المنطقة اليمنى: البريدكرمب + البحث */}
<div style={{display:'flex',alignItems:'center',gap:10}}>
<span className='breadcrumb-area' style={{fontSize:13,fontWeight:700,color:'var(--tx3)'}}>{pgTitle}</span>
<div style={{width:1,height:16,background:'rgba(255,255,255,.08)'}}/>
<div className='topbar-search-wrap' style={{position:'relative'}}>
<div className='topbar-search-box' style={{height:32,padding:'0 10px',borderRadius:7,background:searchOpen?'rgba(201,168,76,.08)':'rgba(255,255,255,.04)',border:'1px solid '+(searchOpen?'rgba(201,168,76,.2)':'var(--bd)'),display:'flex',alignItems:'center',gap:6,width:200,transition:'.2s'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={searchOpen?'rgba(201,168,76,.5)':'rgba(255,255,255,.25)'} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={searchQ} onChange={e=>{setSearchQ(e.target.value);setSearchOpen(true)}} onFocus={()=>searchQ.length>=2&&setSearchOpen(true)} placeholder={lang==='ar'?'بحث ...':'Search ...'} style={{background:'none',border:'none',outline:'none',color:'var(--tx2)',fontFamily:'inherit',fontSize:11,width:'100%'}}/>
{searchQ&&<button onClick={()=>{setSearchQ('');setSearchResults([]);setSearchOpen(false)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--tx5)',fontSize:14,padding:0,display:'flex'}}>×</button>}
</div>
{searchOpen&&searchResults.length>0&&<><div onClick={()=>setSearchOpen(false)} style={{position:'fixed',inset:0,zIndex:98}}/>
<div style={{position:'absolute',top:'calc(100% + 6px)',[lang==='ar'?'right':'left']:0,width:'min(360px,calc(100vw - 16px))',maxHeight:'min(400px,70vh)',background:'var(--sf)',border:'1px solid rgba(201,168,76,.15)',borderRadius:12,boxShadow:'0 12px 36px rgba(0,0,0,.5)',zIndex:99,overflowY:'auto',scrollbarWidth:'none'}}>
{searchResults.map((r,i)=>{const typeMap={facility:{l:lang==='ar'?'منشأة':'Facility',c:C.gold},worker:{l:lang==='ar'?'عامل':'Worker',c:C.blue},client:{l:lang==='ar'?'عميل':'Client',c:C.ok},invoice:{l:lang==='ar'?'فاتورة':'Invoice',c:'#e67e22'}};const t=typeMap[r.type]||{l:r.type,c:'#999'};return<div key={i} onClick={()=>{setPage(r.pg);setSearchOpen(false);setSearchQ('')}} style={{padding:'10px 16px',borderBottom:'1px solid var(--bd2)',display:'flex',alignItems:'center',gap:10,cursor:'pointer',transition:'.15s'}}>
<div style={{width:28,height:28,borderRadius:7,background:t.c+'12',border:'1px solid '+t.c+'20',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{width:14,height:14,display:'flex',alignItems:'center',justifyContent:'center'}}>{DT(t.c)[r.icon]}</span></div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.label}</div>{r.sub&&<div style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{r.sub}</div>}</div>
<span style={{fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:5,background:t.c+'12',color:t.c,flexShrink:0}}>{t.l}</span>
</div>})}
</div></>}
{searchOpen&&searchQ.length>=2&&searchResults.length===0&&!searchLoading&&<><div onClick={()=>setSearchOpen(false)} style={{position:'fixed',inset:0,zIndex:98}}/>
<div style={{position:'absolute',top:'calc(100% + 6px)',[lang==='ar'?'right':'left']:0,width:'min(300px,calc(100vw - 16px))',background:'var(--sf)',border:'1px solid var(--bd)',borderRadius:12,boxShadow:'0 12px 36px rgba(0,0,0,.5)',zIndex:99,padding:'20px',textAlign:'center'}}>
<div style={{fontSize:12,color:'var(--tx4)'}}>{lang==='ar'?'لا توجد نتائج':'No results found'}</div>
</div></>}
</div>
</div>
{/* المنطقة الوسطى: التاريخ + التحديث */}
<div style={{display:'flex',alignItems:'center',gap:8}}>
<div className='topbar-datetime' style={{display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
<span style={{fontSize:11,fontWeight:500,color:'rgba(255,255,255,.5)'}}>{new Date().toLocaleDateString(lang==='ar'?'ar-SA-u-nu-latn':'en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
<span style={{color:'rgba(255,255,255,.1)'}}>·</span>
<span style={{fontSize:11,color:'rgba(255,255,255,.6)',fontWeight:600}}>{(()=>{const d=new Date();const h=d.getHours();const m=d.getMinutes().toString().padStart(2,'0');const h12=h%12||12;const period=lang==='ar'?(h<12?'صباحاً':'مساءً'):(h<12?'AM':'PM');return `${h12}:${m} ${period}`})()}</span>
</div>
<div style={{width:1,height:16,background:'rgba(255,255,255,.08)'}}/>
<div className='topbar-weekly' onClick={async()=>{try{const{data}=await sb.rpc('weekly_update');tt(T('تم التحديث الأسبوعي ✓','Weekly update done ✓'));loadStats()}catch(e){tt(T('خطأ في التحديث','Update error'))}}} title={T('تحديث أسبوعي — توليد مهام + تحديث إحصائيات','Weekly Update — Tasks + Stats refresh')} style={{height:30,padding:'0 10px',borderRadius:7,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)',display:'flex',alignItems:'center',gap:4,cursor:'pointer',transition:'.15s'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(39,160,70,.5)" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
<span style={{fontSize:9,fontWeight:600,color:'rgba(39,160,70,.6)'}}>{T('تحديث','Refresh')}</span>
</div>
</div>
{/* المنطقة اليسرى: الإشعارات + AI + التقويم */}
<div style={{display:'flex',alignItems:'center',gap:4}}>
{/* الإشعارات */}
<div style={{position:'relative'}}>
<div onClick={()=>setShowNotifs(!showNotifs)} style={{width:34,height:34,borderRadius:8,background:showNotifs?'rgba(201,168,76,.12)':'rgba(255,255,255,.04)',border:'1px solid '+(showNotifs?'rgba(201,168,76,.2)':'rgba(255,255,255,.08)'),display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative'}}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={showNotifs?C.gold:'rgba(255,255,255,.35)'} strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
{myNotifs.filter(n=>!n.is_read).length>0&&<div style={{position:'absolute',top:2,left:2,width:14,height:14,borderRadius:'50%',background:C.red,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'#fff'}}>{myNotifs.filter(n=>!n.is_read).length}</div>}
{myNotifs.filter(n=>!n.is_read).length===0&&notifs.length>0&&<div style={{position:'absolute',top:2,left:2,minWidth:14,height:14,borderRadius:7,background:'#e67e22',border:'1.5px solid '+C.dk,display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:'#fff',padding:'0 3px'}}>{notifs.length}</div>}
</div>
{showNotifs&&<><div onClick={()=>setShowNotifs(false)} style={{position:'fixed',inset:0,zIndex:98}}/><div style={{position:'absolute',top:'calc(100% + 8px)',[lang==='ar'?'right':'left']:0,width:'min(380px,calc(100vw - 16px))',maxHeight:'min(460px,70vh)',background:'var(--sf)',border:'1px solid rgba(201,168,76,.15)',borderRadius:14,boxShadow:'0 16px 48px rgba(0,0,0,.6)',zIndex:99,display:'flex',flexDirection:'column',overflow:'hidden'}}>
<div style={{padding:'12px 18px',borderBottom:'1px solid var(--bd)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{T('الإشعارات','Notifications')}</div>
{myNotifs.filter(n=>!n.is_read).length>0&&<button onClick={async()=>{await sb.from('employee_notifications').update({is_read:true}).eq('user_id',user?.id).eq('is_read',false);setMyNotifs(p=>p.map(n=>({...n,is_read:true})))}} style={{fontSize:9,color:C.gold,background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.12)',borderRadius:5,padding:'2px 8px',cursor:'pointer',fontFamily:"'Cairo',sans-serif"}}>{T('قراءة الكل','Read all')}</button>}</div>
<div style={{display:'flex',gap:4}}>{[['my',T('إشعاراتي','My'),myNotifs.filter(n=>!n.is_read).length,'#3483b4'],['system',T('تنبيهات','Alerts'),notifs.length,'#e67e22']].map(([k,l,n,c])=><div key={k} onClick={()=>setNotifTab(k)} style={{flex:1,padding:'6px 0',textAlign:'center',borderRadius:6,fontSize:11,fontWeight:notifTab===k?700:500,color:notifTab===k?c:'rgba(255,255,255,.4)',background:notifTab===k?c+'12':'transparent',border:notifTab===k?'1px solid '+c+'25':'1px solid rgba(255,255,255,.05)',cursor:'pointer'}}>{l} {n>0&&<span style={{fontSize:9,fontWeight:700,background:c+'25',padding:'1px 5px',borderRadius:4,marginRight:2}}>{n}</span>}</div>)}</div></div>
<div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
{notifTab==='my'?<>{myNotifs.length===0?<div style={{textAlign:'center',padding:40,color:'rgba(52,131,180,.4)',fontSize:11}}>{T('لا توجد إشعارات','No notifications')}</div>:
myNotifs.map((n,i)=>{const clr=n.priority==='high'?C.red:n.type==='escalation'?'#e67e22':n.type==='weekly'?'#9b59b6':'#3483b4';const ico=n.type==='daily'?'📋':n.type==='weekly'?'📊':n.type==='escalation'?'⬆':n.type==='task'?'✓':'🔔'
return<div key={n.id} style={{padding:'10px 18px',borderBottom:'1px solid var(--bd2)',display:'flex',gap:10,alignItems:'flex-start',background:!n.is_read?'rgba(52,131,180,.03)':'transparent',cursor:'pointer'}} onClick={async()=>{if(!n.is_read){await sb.from('employee_notifications').update({is_read:true}).eq('id',n.id);setMyNotifs(p=>p.map(x=>x.id===n.id?{...x,is_read:true}:x))}}}>
<div style={{width:28,height:28,borderRadius:7,background:clr+'12',border:'1px solid '+clr+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>{ico}</div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:n.is_read?500:700,color:'var(--tx2)'}}>{n.title}</div><div style={{fontSize:10,color:'var(--tx4)',lineHeight:1.5,marginTop:2}}>{n.body}</div>
<div style={{fontSize:8,color:'var(--tx5)',marginTop:3}}>{new Date(n.created_at).toLocaleDateString('ar-SA')}</div></div>
{!n.is_read&&<div style={{width:6,height:6,borderRadius:'50%',background:clr,flexShrink:0,marginTop:6}}/>}
</div>})}</>:
<>{notifs.length===0?<div style={{textAlign:'center',padding:40,color:'rgba(39,160,70,.5)'}}><div style={{fontSize:12,fontWeight:600}}>{T('لا توجد تنبيهات','No alerts')}</div></div>:
notifs.map((n,i)=>{const isU=n.severity==='urgent';const clr=isU?C.red:'#e67e22';const ico=n.type==='facility_risk'?'⬡':n.type==='worker_absconded'?'!':n.type.includes('permit')?'▤':n.type.includes('iqama')?'▣':n.type.includes('insurance')?'◈':n.type.includes('invoice')?'◎':'△'
return<div key={i} style={{padding:'10px 18px',borderBottom:'1px solid var(--bd2)',display:'flex',gap:10,alignItems:'flex-start',background:isU?'rgba(192,57,43,.03)':'transparent'}}>
<div style={{width:28,height:28,borderRadius:7,background:clr+'12',border:'1px solid '+clr+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>{ico}</div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>{n.title}</div><div style={{fontSize:10,color:'var(--tx4)',lineHeight:1.5}}>{lang==='ar'?n.message_ar:n.message_en}</div></div>
<div style={{fontSize:8,fontWeight:700,color:clr,background:clr+'15',padding:'2px 6px',borderRadius:4,flexShrink:0}}>{isU?T('عاجل','Urgent'):T('تحذير','Warning')}</div>
</div>})}</>}
</div></div></>}
</div>
{/* مساعد جسر الذكي */}
<div onClick={()=>setShowAiChat(!showAiChat)} title={lang==='ar'?'مساعد جسر الذكي':'Jisr AI'} style={{width:32,height:32,borderRadius:7,background:showAiChat?'rgba(201,168,76,.15)':'rgba(255,255,255,.04)',border:'1px solid '+(showAiChat?'rgba(201,168,76,.25)':'rgba(255,255,255,.08)'),display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'.2s'}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={showAiChat?C.gold:'rgba(255,255,255,.35)'} strokeWidth="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/><path d="M12 3v4M8 7h8"/><circle cx="12" cy="3" r="1"/></svg>
</div>
{/* تبديل اللغة */}
<div onClick={switchLang} title={lang==='ar'?'English':'العربية'} style={{width:32,height:32,borderRadius:7,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'.2s',fontSize:14}}>
{lang==='ar'?'🇬🇧':'🇸🇦'}
</div>
{/* الملف الشخصي + Dropdown */}
<div style={{position:'relative'}}>
<div onClick={()=>setShowTopDrop(!showTopDrop)} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'4px 8px 4px 4px',borderRadius:10,transition:'.15s',background:showTopDrop?'rgba(255,255,255,.06)':'transparent'}} onMouseEnter={e=>{if(!showTopDrop)e.currentTarget.style.background='rgba(255,255,255,.04)'}} onMouseLeave={e=>{if(!showTopDrop)e.currentTarget.style.background='transparent'}}>
<div style={{width:30,height:30,borderRadius:'50%',background:'rgba(201,168,76,.1)',border:'1.5px solid rgba(201,168,76,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:C.gold,flexShrink:0}}>
{(user?.name_ar||'م')[0]}
</div>
<div>
<div style={{fontSize:10,fontWeight:700,color:'var(--tx3)',lineHeight:1.2}}>{user?.name_ar||''}</div>
<div style={{fontSize:8,color:'var(--tx5)'}}>{user?.role==='admin'?T('المدير العام','Admin'):user?.role==='manager'?T('مدير','Manager'):T('موظف','Employee')}</div>
</div>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{marginRight:lang==='ar'?0:0,transform:showTopDrop?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke="rgba(255,255,255,.3)" strokeWidth="2.5" fill="none"/></svg>
</div>
{showTopDrop&&<><div onClick={()=>setShowTopDrop(false)} style={{position:'fixed',inset:0,zIndex:998}}/>
<div style={{position:'absolute',top:'calc(100% + 6px)',[lang==='ar'?'left':'right']:0,width:200,background:'#252525',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,boxShadow:'0 12px 36px rgba(0,0,0,.6)',zIndex:999,overflow:'hidden'}}>
<div onClick={()=>{setShowTopDrop(false);setShowProfile(true);setProfileTab('info');setProfileErr({});setProfileData({phone:user.phone||'',email:user.email||'',id_type:user.id_type||'',nationality:user.nationality||'',name_ar:user.name_ar||'',name_en:user.name_en||'',id_number:user.id_number||'',_origEmail:user.email||''});sb.from('bank_accounts').select('*').eq('user_id',user.id).maybeSingle().then(({data})=>setProfileBank(data||{bank_name:'',iban:'',account_number:''}));sb.from('lookup_lists').select('id,list_key').eq('list_key','bank_name').single().then(({data:ll})=>{if(ll)sb.from('lookup_items').select('value_ar,value_en').eq('list_id',ll.id).eq('is_active',true).order('sort_order').then(({data})=>setProfileBanks(data||[]))});sb.from('v_employee_performance_detailed').select('*').eq('user_id',user.id).maybeSingle().then(({data})=>setProfilePerf(data||null));sb.from('attendance').select('*').eq('user_id',user.id).order('date',{ascending:false}).limit(60).then(({data})=>setProfileAtt(data||[]));sb.from('task_assignees').select('*,tasks(*)').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50).then(({data})=>setProfileTasks(data||[]));sb.from('salary_records').select('*').eq('user_id',user.id).order('month',{ascending:false}).then(({data})=>setProfileSalary(data||[]));sb.from('employee_loans').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).then(({data})=>setProfileLoans(data||[]));sb.from('login_log').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30).then(({data})=>setProfileLogins(data||[]))}} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
<span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{lang==='ar'?'الملف الشخصي':'Profile'}</span>
</div>
<div style={{height:1,background:'rgba(255,255,255,.06)'}}/>
<div onClick={()=>{toggleTheme()}} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
{theme==='dark'?<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
<span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.6)',flex:1}}>{lang==='ar'?'المظهر':'Theme'}</span>
<span style={{fontSize:10,fontWeight:500,color:'rgba(255,255,255,.25)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:6}}>{theme==='dark'?(lang==='ar'?'داكن':'Dark'):(lang==='ar'?'فاتح':'Light')}</span>
</div>
<div style={{height:1,background:'rgba(255,255,255,.06)'}}/>
<div onClick={()=>{switchLang();setShowTopDrop(false)}} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 16px',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
<span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.6)',flex:1}}>{lang==='ar'?'اللغة':'Language'}</span>
<span style={{fontSize:10,fontWeight:500,color:'rgba(255,255,255,.25)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:6}}>{lang==='ar'?'العربية':'English'}</span>
</div>
<div style={{height:1,background:'rgba(255,255,255,.06)'}}/>
<div onClick={()=>{setShowTopDrop(false);onLogout()}} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(192,57,43,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(192,57,43,.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
<span style={{fontSize:12,fontWeight:600,color:'rgba(192,57,43,.6)'}}>{lang==='ar'?'تسجيل الخروج':'Sign Out'}</span>
</div>
</div></>}
</div>
</div>
</header>
{/* ═══ Content ═══ */}
<div className='dash-content' style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'32px 24px 0',msOverflowStyle:'none',scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
{pg==='home'&&<HomePage stats={stats} lang={lang} branches={dashBranches} selectedBranch={dashBranch} onBranchChange={setDashBranch} sb={sb} onNavigate={setPage} toast={tt}/>}

{/* ═══ HUB LAYOUT HELPER — Side tabs + content ═══ */}
{(()=>{
const hubTabs={
  workforce:[{id:'facilities',l:T('المنشآت','Facilities')},{id:'workers',l:T('العمالة','Workers')},{id:'compliance',l:T('الامتثال','Compliance')},{id:'worker_leaves',h:true}],
  operations:[{id:'transactions_external',l:T('خارجية','External')},{id:'transactions_internal',l:T('داخلية','Internal')},{id:'tasks',l:T('المهام','Tasks')},{id:'sla_monitor',l:T('SLA','SLA')},{id:'transfer_calc',l:T('حسبة التنازل','Kafala Calc')}],
  finance_hub:[{id:'invoices',l:T('الفواتير','Invoices')},{id:'invoice_followups',l:T('متابعة التحصيل','Collections')},{id:'payments',l:T('المدفوعات والمصاريف','Payments & Expenses')},{id:'cash_flow',l:T('التدفق','Cash Flow')},{id:'audit',l:T('التدقيق','Audit')},{id:'budget',l:T('الميزانية','Budget')},{id:'data_import',l:T('الاستيراد','Import')}],
  clients_hub:[{id:'clients',l:T('العملاء','Clients')},{id:'brokers',l:T('الوسطاء','Brokers')},{id:'providers',l:T('المعقّبين','Providers')},{id:'profitability',l:T('الربحية','Profitability')},{id:'nps',l:T('رضا العملاء','NPS')}],
  admin_hub:[{id:'admin_offices',l:T('المكاتب والموظفين','Offices & Staff')},{id:'approvals',l:T('الموافقات','Approvals')},{id:'archive',l:T('الأرشيف','Archive')},{id:'activity_log',l:T('السجل','Log')},{id:'admin_automation',l:T('الأتمتة','Automation')},{id:'admin_pricing',l:T('التسعير','Pricing')},{id:'attendance',h:true},{id:'admin_staff',h:true},{id:'auto_alerts',h:true}],
  reports_hub:[{id:'report_periodic',l:T('الدورية','Periodic')},{id:'emp_performance',l:T('الأداء','Performance')},{id:'branch_compare',l:T('الفروع','Branches')},{id:'live_monitor',l:T('المراقبة','Monitor')},{id:'report_alerts',l:T('التنبيهات','Alerts')},{id:'report_performance',h:true},{id:'weekly_report',h:true}]
}
const allHubPages=Object.values(hubTabs).flat().map(t=>t.id)
const currentHub=Object.entries(hubTabs).find(([,tabs])=>tabs.some(t=>t.id===pg))
if(!currentHub||!allHubPages.includes(pg))return null
const[hubKey,tabs]=currentHub
return<div>
{/* Horizontal sub-tabs */}
<div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'1px solid var(--bd)',overflowX:'auto',scrollbarWidth:'none'}} className="dash-content">
{tabs.filter(t=>!t.h).map(t=><div key={t.id} onClick={()=>setPg(t.id)} style={{padding:'8px 14px',fontSize:11,fontWeight:pg===t.id?700:500,color:pg===t.id?C.gold:'rgba(255,255,255,.35)',borderBottom:pg===t.id?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap',transition:'.15s'}}>{t.l}</div>)}
</div>
{/* Content */}
<div>
{/* العمالة */}
{pg==='facilities'&&<FacilitiesPage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='workers'&&<WorkforcePage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='compliance'&&<CompliancePage sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='worker_leaves'&&<WorkerLeavesPage sb={sb} toast={tt} user={user} lang={lang}/>}
{/* العمليات */}
{(pg==='transactions_internal'||pg==='transactions_external')&&<TransactionsPage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo} defaultType={pg==='transactions_internal'?'internal':'external'}/>}
{pg==='tasks'&&<TasksPageV2 sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='sla_monitor'&&<SLAPage sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='transfer_calc'&&<><TransferCalcPage sb={sb} toast={tt} user={user} lang={lang} onNewCalc={()=>setShowKafalaCalc(true)}/>
{showKafalaCalc&&<KafalaCalculator toast={tt} lang={lang} onClose={()=>setShowKafalaCalc(false)}/>}</>}
{/* المالية */}
{pg==='invoices'&&<InvoicePageFull sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch}/>}
{pg==='payments'&&<PaymentsPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='ext_payments'&&<ExtPaymentsPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='cash_flow'&&<CashFlowPage sb={sb} toast={tt} lang={lang} branchId={dashBranch}/>}
{pg==='audit'&&<AuditPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='budget'&&<BudgetPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='data_import'&&<DataImportPage sb={sb} toast={tt} user={user} lang={lang}/>}
{/* العملاء */}
{(pg==='clients'||pg==='brokers'||pg==='providers')&&<DataPage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo} defaultTab={pg} branchId={dashBranch}/>}
{pg==='contracts'&&<ContractsPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='client_statement'&&<ClientStatementPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='profitability'&&<ProfitabilityPage sb={sb} toast={tt} lang={lang} branchId={dashBranch}/>}
{pg==='nps'&&<NPSPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{/* الإدارة */}
{pg==='admin_offices'&&<BranchesPage sb={sb} toast={tt} user={user} lang={lang} showStaff={true} AdminPage={AdminPageFull} adminProps={{sb,toast:tt,user,lang,onTabChange:setSTabInfo,defaultTab:'users',branchId:dashBranch}}/>}
{pg==='attendance'&&<AttendancePage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='approvals'&&<ApprovalsPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='auto_alerts'&&<AutoAlertsPage sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='archive'&&<ArchivePage sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='suppliers'&&<SuppliersPage sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='activity_log'&&<ActivityLogPage sb={sb} lang={lang} data={activityLog} loading={activityLoading} onLoad={loadActivityLog}/>}
{pg==='admin_automation'&&<WorkflowPage sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='admin_pricing'&&<PricingCalcPage sb={sb} toast={tt} user={user} lang={lang}/>}
{/* التقارير */}
{pg==='report_periodic'&&<ReportPeriodicPage sb={sb} lang={lang} branchId={dashBranch}/>}
{pg==='emp_performance'&&<EmployeePerformancePage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='branch_compare'&&<BranchComparisonPage sb={sb} toast={tt} lang={lang}/>}
{pg==='live_monitor'&&<LiveMonitorPage sb={sb} toast={tt} lang={lang} branchId={dashBranch}/>}
{pg==='weekly_report'&&<WeeklyReportPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='invoice_followups'&&<InvoiceFollowupsPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='report_alerts'&&<ReportAlertsPage sb={sb} lang={lang}/>}
{pg==='report_performance'&&<ReportPerformancePage sb={sb} lang={lang} branchId={dashBranch}/>}
</div></div>})()}

{/* ═══ HUB: المانباور ═══ */}
{['mp_dashboard','mp_projects','mp_workers','mp_extracts','mp_partners'].includes(pg)&&<>
<div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'1px solid var(--bd)',overflowX:'auto',scrollbarWidth:'none'}} className="dash-content">
{[{id:'mp_dashboard',l:T('لوحة التحكم','Dashboard')},{id:'mp_projects',l:T('المشاريع','Projects')},{id:'mp_workers',l:T('العمال','Workers')},{id:'mp_extracts',l:T('المستخلصات','Extracts')},{id:'mp_partners',l:T('الشراكات','Partners')}].map(t=><div key={t.id} onClick={()=>setPg(t.id)} style={{padding:'8px 14px',fontSize:11,fontWeight:pg===t.id?700:500,color:pg===t.id?C.gold:'rgba(255,255,255,.35)',borderBottom:pg===t.id?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap',transition:'.15s'}}>{t.l}</div>)}
</div>
<ManpowerPage sb={sb} toast={tt} user={user} lang={lang} defaultTab={pg}/>
</>}

{/* ═══ HUB: التواصل ═══ */}
{['msg_send','msg_templates','msg_log','msg_groups','msg_settings'].includes(pg)&&<>
<div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'1px solid var(--bd)',overflowX:'auto',scrollbarWidth:'none'}} className="dash-content">
{[{id:'msg_send',l:T('إرسال','Send')},{id:'msg_templates',l:T('النماذج','Templates')},{id:'msg_log',l:T('السجل','Log')},{id:'msg_groups',l:T('المجموعات','Groups')},{id:'msg_settings',l:T('الإعدادات','Settings')}].map(t=><div key={t.id} onClick={()=>setPg(t.id)} style={{padding:'8px 14px',fontSize:11,fontWeight:pg===t.id?700:500,color:pg===t.id?C.gold:'rgba(255,255,255,.35)',borderBottom:pg===t.id?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap',transition:'.15s'}}>{t.l}</div>)}
</div>
<MessagingPage sb={sb} toast={tt} user={user} lang={lang} defaultTab={pg}/>
</>}

{/* ═══ الإعدادات ═══ */}
{pg==='otp_messages'&&<OTPMessages sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='settings'&&<SettingsPageFull sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='kpi'&&<KPIPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{pg==='calendar_unified'&&<CalendarPage sb={sb} toast={tt} user={user} lang={lang} onNavigate={setPage}/>}
{(pg==='installments'||pg==='expenses')&&pageConf&&<CrudPage sb={sb} user={user} conf={pageConf} toast={tt} onRefresh={loadStats} lang={lang}/>}
{pg==='appointments'&&<AppointmentsPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
</div>
</div>
{toastMsg&&(()=>{const isErr=toastMsg.includes('خطأ');const isDel=toastMsg.includes('حذف');const clr=isErr?C.red:isDel?'#e67e22':C.ok;const bg=isErr?'rgba(192,57,43,.12)':isDel?'rgba(230,126,34,.12)':'rgba(39,160,70,.12)';const bdr=isErr?'rgba(192,57,43,.2)':isDel?'rgba(230,126,34,.2)':'rgba(39,160,70,.2)';return<div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:bg,color:clr,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,padding:'12px 24px',borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,.5)',border:'1px solid '+bdr,display:'flex',alignItems:'center',gap:8,animation:'slideDown .3s ease'}}>{isErr?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>:isDel?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}{toastMsg}</div>})()}
{/* ═══ PROFILE SIDE PANEL ═══ */}
{showProfile&&profileData&&<><div onClick={()=>setShowProfile(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(4px)',zIndex:9997}}/>
<div style={{position:'fixed',top:0,[lang==='ar'?'left':'right']:0,width:'min(480px,94vw)',height:'100vh',background:'var(--sf)',zIndex:9998,display:'flex',flexDirection:'column',fontFamily:F,direction:lang==='ar'?'rtl':'ltr',boxShadow:'-8px 0 40px rgba(0,0,0,.5)',borderRight:lang==='ar'?'none':'1px solid rgba(201,168,76,.12)',borderLeft:lang==='ar'?'1px solid rgba(201,168,76,.12)':'none',animation:'slideIn .25s ease'}}>
{/* Header */}
<div style={{padding:'20px 22px 14px',borderBottom:'1px solid rgba(201,168,76,.12)',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
<div style={{width:50,height:50,borderRadius:'50%',background:'linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.05))',border:'2px solid rgba(201,168,76,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:C.gold,flexShrink:0}}>{user?.name_ar?.[0]||'م'}</div>
<div style={{flex:1}}><div style={{fontSize:15,fontWeight:800,color:'var(--tx)'}}>{user?.name_ar}</div><div style={{fontSize:10,color:'rgba(201,168,76,.5)',marginTop:2}}>{user?.roles?.name_ar||(lang==='ar'?'المدير العام':'General Manager')}</div>
{user?.branch_id&&<div style={{fontSize:9,color:'var(--tx5)',marginTop:1}}>{dashBranches.find(b=>b.id===user.branch_id)?.name_ar||''}</div>}
</div>
<button onClick={()=>setShowProfile(false)} style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
</div>
{/* Tabs */}
<div style={{display:'flex',borderBottom:'1px solid var(--bd)',padding:'0 16px',overflowX:'auto',flexShrink:0}} className="dash-content">
{[{k:'info',ar:'البيانات',en:'Info'},{k:'perf',ar:'الأداء',en:'Performance'},{k:'attend',ar:'الحضور',en:'Attendance'},{k:'achieve',ar:'الإنجاز',en:'Tasks'},{k:'wallet',ar:'المحفظة',en:'Wallet'}].map(t=>
<div key={t.k} onClick={()=>setProfileTab(t.k)} style={{padding:'10px 12px',fontSize:10,fontWeight:profileTab===t.k?700:500,color:profileTab===t.k?C.gold:'rgba(255,255,255,.4)',borderBottom:profileTab===t.k?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',transition:'.2s',whiteSpace:'nowrap'}}>{lang==='ar'?t.ar:t.en}</div>)}
</div>
{/* Content */}
<div className='dash-content' style={{flex:1,overflowY:'auto',padding:'16px 20px 20px'}}>
{/* ── TAB: البيانات الأساسية ── */}
{profileTab==='info'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>{lang==='ar'?'الاسم بالعربي':'Name (Arabic)'} 🔒</div><input value={profileData.name_ar} readOnly style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.06)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx4)',background:'rgba(255,255,255,.02)',outline:'none',textAlign:'center',cursor:'not-allowed'}}/></div>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>{lang==='ar'?'الاسم بالإنجليزي':'Name (English)'} 🔒</div><input value={profileData.name_en} readOnly style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.06)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx4)',background:'rgba(255,255,255,.02)',outline:'none',textAlign:'center',direction:'ltr',cursor:'not-allowed'}}/></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>{lang==='ar'?'نوع الهوية':'ID Type'} 🔒</div><input value={profileData.id_type} readOnly style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.06)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx4)',background:'rgba(255,255,255,.02)',outline:'none',textAlign:'center',cursor:'not-allowed'}}/></div>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>{lang==='ar'?'رقم الهوية':'ID Number'} 🔒</div><input value={profileData.id_number} readOnly style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.06)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx4)',background:'rgba(255,255,255,.02)',outline:'none',textAlign:'center',cursor:'not-allowed'}}/></div>
</div>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>{lang==='ar'?'رقم الجوال':'Phone'}</div>
<div style={{display:'flex',direction:'ltr',border:profileErr.phone?'1.5px solid rgba(192,57,43,.5)':'1.5px solid rgba(255,255,255,.1)',borderRadius:8,overflow:'hidden',background:'rgba(255,255,255,.04)'}}>
<div style={{height:38,padding:'0 10px',background:'rgba(255,255,255,.06)',borderRight:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',fontSize:11,fontWeight:700,color:'var(--tx3)',flexShrink:0}}>+966</div>
<input value={profileData.phone?.replace('+966','')} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,9);setProfileData(p=>({...p,phone:'+966'+v}))}} style={{width:'100%',height:38,padding:'0 12px',border:'none',background:'transparent',fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',outline:'none',textAlign:'left'}}/>
</div>{profileErr.phone&&<div style={{fontSize:10,color:'rgba(192,57,43,.7)',marginTop:2}}>{profileErr.phone}</div>}</div>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>{lang==='ar'?'الجنسية':'Nationality'}</div><input value={profileData.nationality} onChange={e=>setProfileData(p=>({...p,nationality:e.target.value}))} style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',textAlign:'center'}}/></div>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>{lang==='ar'?'البريد الإلكتروني':'Email'}</div><input value={profileData.email} onChange={e=>setProfileData(p=>({...p,email:e.target.value}))} style={{width:'100%',height:38,padding:'0 12px',border:profileErr.email?'1.5px solid rgba(192,57,43,.5)':'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',textAlign:'center',direction:'ltr'}}/>{profileErr.email&&<div style={{fontSize:10,color:'rgba(192,57,43,.7)',marginTop:2}}>{profileErr.email}</div>}
{profileData.email!==profileData._origEmail&&profileData.email&&<div style={{fontSize:9,color:'rgba(201,168,76,.5)',marginTop:3}}>{lang==='ar'?'سيتم إرسال رابط تأكيد للبريد الجديد':'A confirmation link will be sent to the new email'}</div>}</div>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>{lang==='ar'?'اللغة الافتراضية':'Default Language'}</div>
<div style={{display:'flex',gap:8}}>
<div onClick={()=>{setLang('ar');sb.from('users').update({preferred_lang:'ar'}).eq('id',user.id)}} style={{flex:1,height:38,borderRadius:8,border:lang==='ar'?'1.5px solid rgba(201,168,76,.4)':'1.5px solid rgba(255,255,255,.1)',background:lang==='ar'?'rgba(201,168,76,.08)':'rgba(255,255,255,.04)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,cursor:'pointer',transition:'.2s'}}>
<img src="https://flagcdn.com/w40/sa.png" width="18" height="13" style={{borderRadius:2,objectFit:'cover'}} alt=""/>
<span style={{fontSize:11,fontWeight:lang==='ar'?700:500,color:lang==='ar'?C.gold:'rgba(255,255,255,.5)'}}>العربية</span>
</div>
<div onClick={()=>{setLang('en');sb.from('users').update({preferred_lang:'en'}).eq('id',user.id)}} style={{flex:1,height:38,borderRadius:8,border:lang==='en'?'1.5px solid rgba(201,168,76,.4)':'1.5px solid rgba(255,255,255,.1)',background:lang==='en'?'rgba(201,168,76,.08)':'rgba(255,255,255,.04)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,cursor:'pointer',transition:'.2s'}}>
<img src="https://flagcdn.com/w40/us.png" width="18" height="13" style={{borderRadius:2,objectFit:'cover'}} alt=""/>
<span style={{fontSize:11,fontWeight:lang==='en'?700:500,color:lang==='en'?C.gold:'rgba(255,255,255,.5)'}}>English</span>
</div>
</div>
</div>
{/* Bank Account Section inside Info tab */}
<div style={{marginTop:8,padding:'12px 0 0',borderTop:'1px solid var(--bd)'}}>
<div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:10}}>{lang==='ar'?'الحساب البنكي':'Bank Account'}</div>
{profileBank&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>{lang==='ar'?'اسم البنك':'Bank Name'}</div>
<div style={{position:'relative'}}>
<div onClick={()=>setProfileBankDrop(!profileBankDrop)} style={{width:'100%',height:38,padding:'0 12px',border:profileErr.bank_name?'1.5px solid rgba(192,57,43,.5)':'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:profileBank.bank_name?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)',background:'rgba(255,255,255,.04)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
<span style={{flex:1,textAlign:'center'}}>{profileBank.bank_name?(lang==='ar'?profileBank.bank_name:(profileBanks.find(b=>b.value_ar===profileBank.bank_name)?.value_en||profileBank.bank_name)):(lang==='ar'?'— اختر البنك —':'— Select Bank —')}</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,transform:profileBankDrop?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke="#c9a84c" strokeWidth="2.5" fill="none"/></svg>
</div>
{profileBankDrop&&<><div onClick={()=>setProfileBankDrop(false)} style={{position:'fixed',inset:0,zIndex:19}}/><div style={{position:'absolute',top:'calc(100% + 4px)',right:0,left:0,background:'var(--sb)',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,maxHeight:180,overflowY:'auto',zIndex:20,boxShadow:'0 8px 32px rgba(0,0,0,.6)'}}>
{profileBanks.map(b=><div key={b.value_ar} onClick={()=>{setProfileBank(p=>({...p,bank_name:b.value_ar}));setProfileBankDrop(false)}} style={{padding:'10px 14px',fontSize:12,fontWeight:profileBank.bank_name===b.value_ar?700:500,color:profileBank.bank_name===b.value_ar?C.gold:'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid var(--bd2)',background:profileBank.bank_name===b.value_ar?'rgba(201,168,76,.06)':'transparent'}}>{lang==='ar'?b.value_ar:(b.value_en||b.value_ar)}</div>)}
</div></>}
</div>
{profileErr.bank_name&&<div style={{fontSize:10,color:'rgba(192,57,43,.7)',marginTop:2}}>{profileErr.bank_name}</div>}
</div>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>{lang==='ar'?'رقم الآيبان (IBAN)':'IBAN Number'}</div><input value={profileBank.iban||''} onChange={e=>setProfileBank(p=>({...p,iban:e.target.value.toUpperCase()}))} style={{width:'100%',height:38,padding:'0 12px',border:profileErr.iban?'1.5px solid rgba(192,57,43,.5)':'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',textAlign:'center',direction:'ltr',letterSpacing:1}}/>{profileErr.iban&&<div style={{fontSize:10,color:'rgba(192,57,43,.7)',marginTop:2}}>{profileErr.iban}</div>}</div>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx3)',marginBottom:4}}>{lang==='ar'?'رقم الحساب':'Account Number'}</div><input value={profileBank.account_number||''} onChange={e=>setProfileBank(p=>({...p,account_number:e.target.value}))} style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',textAlign:'center',direction:'ltr'}}/></div>
</div>}
</div>
</div>}
{/* ── TAB: الأداء ── */}
{profileTab==='perf'&&(()=>{const p=profilePerf;const ar=lang==='ar';if(!p)return<div style={{textAlign:'center',padding:'40px 0',color:'var(--tx5)',fontSize:11}}>{ar?'لا توجد بيانات أداء':'No performance data'}</div>;const score=p.performance_score||0;const clr=score>=80?C.ok:score>=50?'#e67e22':C.red;return<div style={{display:'flex',flexDirection:'column',gap:14}}>
{/* Score Circle */}
<div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'16px 0'}}>
<div style={{position:'relative',width:100,height:100}}>
<svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="8"/><circle cx="50" cy="50" r="42" fill="none" stroke={clr} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${score*2.64} 264`} transform="rotate(-90 50 50)" style={{transition:'stroke-dasharray .8s ease'}}/></svg>
<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:26,fontWeight:900,color:clr}}>{score}</div><div style={{fontSize:8,color:'var(--tx5)'}}>{ar?'نقطة':'pts'}</div></div>
</div>
</div>
{/* Stats Grid */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
{[[ar?'معاملات مكتملة':'Completed',p.txn_completed||0,C.ok],[ar?'معاملات نشطة':'Active',p.txn_active||0,C.blue],[ar?'متوسط الإنجاز':'Avg Days',p.avg_completion_days||0,'#e67e22'],[ar?'فواتير محصلة':'Invoices',p.invoices_created||0,C.gold],[ar?'مبالغ محصلة':'Collected',(Number(p.amount_collected)||0).toLocaleString(),C.ok],[ar?'تصعيدات':'Escalations',p.escalations||0,C.red]].map(([l,v,c],i)=>
<div key={i} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
<div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{l}</div>
</div>)}
</div>
{/* Tasks Summary */}
<div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:12}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx)',marginBottom:8}}>{ar?'المهام':'Tasks'}</div>
<div style={{display:'flex',gap:12}}>
{[[ar?'مكتملة':'Done',p.tasks_done||0,C.ok],[ar?'معلقة':'Pending',p.tasks_pending||0,'#e67e22'],[ar?'متأخرة':'Overdue',p.tasks_overdue||0,C.red]].map(([l,v,c],i)=>
<div key={i} style={{flex:1,textAlign:'center'}}><div style={{fontSize:14,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{l}</div></div>)}
</div>
</div>
{/* Login Log */}
{profileLogins.length>0&&<div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:12}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx)',marginBottom:8}}>{ar?'سجل الدخول':'Login Log'}</div>
{profileLogins.slice(0,5).map((l,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<4?'1px solid var(--bd2)':'none',fontSize:10}}>
<span style={{color:'var(--tx3)'}}>{new Date(l.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
<span style={{color:l.action==='login'?C.ok:'#e67e22',fontWeight:600}}>{l.action==='login'?(ar?'دخول':'Login'):(ar?'خروج':'Logout')}</span>
</div>)}
</div>}
</div>})()}
{/* ── TAB: الحضور ── */}
{profileTab==='attend'&&(()=>{const ar=lang==='ar';const att=profileAtt;const thisMonth=att.filter(a=>{const d=new Date(a.date);const now=new Date();return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});const onTime=thisMonth.filter(a=>!a.is_late).length;const late=thisMonth.filter(a=>a.is_late).length;const avgHrs=thisMonth.length>0?(thisMonth.reduce((s,a)=>s+Number(a.work_hours||0),0)/thisMonth.length).toFixed(1):0;const totalLateMin=thisMonth.reduce((s,a)=>s+(a.late_minutes||0),0);return<div style={{display:'flex',flexDirection:'column',gap:12}}>
{/* Month Stats */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
{[[ar?'أيام الحضور':'Present',thisMonth.length,C.ok],[ar?'في الوقت':'On Time',onTime,C.blue],[ar?'تأخير':'Late',late,'#e67e22'],[ar?'متوسط الساعات':'Avg Hrs',avgHrs,C.gold]].map(([l,v,c],i)=>
<div key={i} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
<div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
<div style={{fontSize:8,color:'var(--tx5)',marginTop:2}}>{l}</div>
</div>)}
</div>
{totalLateMin>0&&<div style={{background:'rgba(230,126,34,.06)',border:'1px solid rgba(230,126,34,.15)',borderRadius:10,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
<span style={{fontSize:10,color:'#e67e22',fontWeight:600}}>{ar?'إجمالي دقائق التأخير هذا الشهر:':'Total late minutes this month:'} {totalLateMin} {ar?'دقيقة':'min'}</span>
</div>}
{/* Attendance List */}
<div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,overflow:'hidden'}}>
<div style={{padding:'10px 12px',borderBottom:'1px solid var(--bd)',fontSize:11,fontWeight:700,color:'var(--tx)'}}>{ar?'سجل الحضور':'Attendance Log'}</div>
{att.length===0?<div style={{padding:20,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>{ar?'لا توجد سجلات حضور':'No attendance records'}</div>:
att.slice(0,20).map((a,i)=><div key={i} style={{display:'flex',alignItems:'center',padding:'8px 12px',borderBottom:'1px solid var(--bd2)',gap:8}}>
<div style={{width:6,height:6,borderRadius:'50%',background:a.status==='present'&&!a.is_late?C.ok:a.is_late?'#e67e22':C.red,flexShrink:0}}/>
<div style={{flex:1}}>
<div style={{fontSize:10,fontWeight:600,color:'var(--tx)'}}>{new Date(a.date).toLocaleDateString('ar-SA',{weekday:'short',month:'short',day:'numeric'})}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:1,direction:'ltr',textAlign:ar?'right':'left'}}>{a.check_in_at?new Date(a.check_in_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}):'-'} — {a.check_out_at?new Date(a.check_out_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}):'-'}</div>
</div>
<div style={{textAlign:'center'}}>
<div style={{fontSize:11,fontWeight:700,color:C.blue}}>{a.work_hours?Number(a.work_hours).toFixed(1):'—'}</div>
<div style={{fontSize:8,color:'var(--tx5)'}}>{ar?'ساعة':'hrs'}</div>
</div>
{a.is_late&&<div style={{background:'rgba(230,126,34,.1)',borderRadius:6,padding:'2px 6px',fontSize:8,fontWeight:600,color:'#e67e22'}}>{a.late_minutes}{ar?'د':'m'}</div>}
</div>)}
</div>
</div>})()}
{/* ── TAB: الإنجاز ── */}
{profileTab==='achieve'&&(()=>{const ar=lang==='ar';const tasks=profileTasks;const done=tasks.filter(t=>t.tasks?.status==='completed').length;const active=tasks.filter(t=>['pending','in_progress'].includes(t.tasks?.status)).length;const overdue=tasks.filter(t=>t.tasks?.status==='overdue').length;return<div style={{display:'flex',flexDirection:'column',gap:12}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
{[[ar?'مكتملة':'Completed',done,C.ok],[ar?'نشطة':'Active',active,C.blue],[ar?'متأخرة':'Overdue',overdue,C.red]].map(([l,v,c],i)=>
<div key={i} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
<div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{l}</div>
</div>)}
</div>
{/* Progress Bar */}
{tasks.length>0&&<div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:12}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:10,fontWeight:600,color:'var(--tx3)'}}>{ar?'نسبة الإنجاز':'Completion Rate'}</span><span style={{fontSize:11,fontWeight:800,color:C.gold}}>{tasks.length>0?Math.round(done/tasks.length*100):0}%</span></div>
<div style={{height:6,borderRadius:3,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',borderRadius:3,background:`linear-gradient(90deg,${C.gold},${C.ok})`,width:`${tasks.length>0?done/tasks.length*100:0}%`,transition:'width .5s ease'}}/></div>
</div>}
{/* Tasks List */}
<div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,overflow:'hidden'}}>
<div style={{padding:'10px 12px',borderBottom:'1px solid var(--bd)',fontSize:11,fontWeight:700,color:'var(--tx)'}}>{ar?'آخر المهام':'Recent Tasks'}</div>
{tasks.length===0?<div style={{padding:20,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>{ar?'لا توجد مهام':'No tasks'}</div>:
tasks.slice(0,15).map((t,i)=>{const tk=t.tasks;if(!tk)return null;const stClr=tk.status==='completed'?C.ok:tk.status==='overdue'?C.red:tk.status==='in_progress'?C.blue:'rgba(255,255,255,.4)';return<div key={i} style={{display:'flex',alignItems:'center',padding:'8px 12px',borderBottom:'1px solid var(--bd2)',gap:8}}>
<div style={{width:6,height:6,borderRadius:'50%',background:stClr,flexShrink:0}}/>
<div style={{flex:1}}>
<div style={{fontSize:10,fontWeight:600,color:'var(--tx)'}}>{tk.title||tk.description||'—'}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:1}}>{tk.due_date?new Date(tk.due_date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}):''}</div>
</div>
<div style={{fontSize:9,fontWeight:600,color:stClr,background:stClr+'18',padding:'2px 8px',borderRadius:6}}>{tk.status==='completed'?(ar?'مكتمل':'Done'):tk.status==='overdue'?(ar?'متأخر':'Overdue'):tk.status==='in_progress'?(ar?'جاري':'Active'):(ar?'معلق':'Pending')}</div>
</div>})}
</div>
</div>})()}
{/* ── TAB: المحفظة ── */}
{profileTab==='wallet'&&(()=>{const ar=lang==='ar';const sal=profileSalary;const loans=profileLoans;const totalNet=sal.reduce((s,r)=>s+Number(r.net_salary||0),0);const totalPaid=sal.filter(r=>r.status==='paid').reduce((s,r)=>s+Number(r.net_salary||0),0);const totalLoans=loans.reduce((s,l)=>s+Number(l.amount||0),0);const remainingLoans=loans.filter(l=>l.status==='active').reduce((s,l)=>s+Number(l.remaining||0),0);return<div style={{display:'flex',flexDirection:'column',gap:12}}>
{/* Summary Cards */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
{[[ar?'إجمالي الرواتب':'Total Salary',totalNet.toLocaleString(),C.ok],[ar?'تم الصرف':'Paid',totalPaid.toLocaleString(),C.blue],[ar?'إجمالي السلف':'Total Loans',totalLoans.toLocaleString(),'#e67e22'],[ar?'متبقي السلف':'Remaining',remainingLoans.toLocaleString(),C.red]].map(([l,v,c],i)=>
<div key={i} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'12px 10px',textAlign:'center'}}>
<div style={{fontSize:15,fontWeight:800,color:c}}>{v}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{l}</div>
</div>)}
</div>
{/* Salary Records */}
<div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,overflow:'hidden'}}>
<div style={{padding:'10px 12px',borderBottom:'1px solid var(--bd)',fontSize:11,fontWeight:700,color:'var(--tx)',display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
{ar?'سجل الرواتب':'Salary Records'}
</div>
{sal.length===0?<div style={{padding:20,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>{ar?'لا توجد سجلات':'No records'}</div>:
sal.map((r,i)=><div key={i} style={{display:'flex',alignItems:'center',padding:'8px 12px',borderBottom:'1px solid var(--bd2)',gap:8}}>
<div style={{flex:1}}>
<div style={{fontSize:10,fontWeight:600,color:'var(--tx)'}}>{new Date(r.month).toLocaleDateString('ar-SA',{year:'numeric',month:'long'})}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:1,display:'flex',gap:8}}>
<span>{ar?'أساسي':'Basic'}: {Number(r.basic_salary).toLocaleString()}</span>
<span>{ar?'بدلات':'Allow'}: {Number(r.allowances||0).toLocaleString()}</span>
<span>{ar?'خصم':'Ded'}: {Number(r.deductions||0).toLocaleString()}</span>
</div>
</div>
<div style={{textAlign:'center'}}>
<div style={{fontSize:12,fontWeight:800,color:C.ok}}>{Number(r.net_salary||0).toLocaleString()}</div>
<div style={{fontSize:8,color:'var(--tx5)'}}>{ar?'صافي':'Net'}</div>
</div>
<div style={{fontSize:9,fontWeight:600,color:r.status==='paid'?C.ok:r.status==='delayed'?C.red:'#e67e22',background:(r.status==='paid'?C.ok:r.status==='delayed'?C.red:'#e67e22')+'18',padding:'2px 8px',borderRadius:6}}>{r.status==='paid'?(ar?'مصروف':'Paid'):r.status==='delayed'?(ar?'متأخر':'Delayed'):(ar?'معلق':'Pending')}</div>
</div>)}
</div>
{/* Loans */}
<div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,overflow:'hidden'}}>
<div style={{padding:'10px 12px',borderBottom:'1px solid var(--bd)',fontSize:11,fontWeight:700,color:'var(--tx)',display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
{ar?'السلف والديون':'Loans & Debts'}
</div>
{loans.length===0?<div style={{padding:20,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>{ar?'لا توجد سلف':'No loans'}</div>:
loans.map((l,i)=><div key={i} style={{padding:'10px 12px',borderBottom:'1px solid var(--bd2)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div><div style={{fontSize:10,fontWeight:600,color:'var(--tx)'}}>{l.reason||'—'}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{new Date(l.created_at).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'})}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:12,fontWeight:800,color:'#e67e22'}}>{Number(l.amount).toLocaleString()}</div><div style={{fontSize:8,color:'var(--tx5)'}}>{ar?'المبلغ':'Amount'}</div></div>
</div>
<div style={{display:'flex',gap:8,marginTop:6}}>
<div style={{flex:1,height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:l.status==='paid'?C.ok:'#e67e22',width:`${l.amount>0?((l.amount-l.remaining)/l.amount*100):0}%`}}/></div>
<span style={{fontSize:9,color:'var(--tx5)'}}>{ar?'متبقي':'Left'}: {Number(l.remaining).toLocaleString()}</span>
</div>
{l.monthly_deduction>0&&<div style={{fontSize:9,color:'var(--tx5)',marginTop:4}}>{ar?'خصم شهري':'Monthly'}: {Number(l.monthly_deduction).toLocaleString()} {ar?'ريال':'SAR'}</div>}
</div>)}
</div>
</div>})()}
</div>
{/* Footer - Save (only for info tab) */}
{profileTab==='info'&&<div style={{padding:'12px 20px 16px',borderTop:'1px solid rgba(201,168,76,.12)',display:'flex',gap:10,flexDirection:'row-reverse',flexShrink:0}}>
<button disabled={profileBusy} onClick={async()=>{
const ar=lang==='ar';const err={};
const ph=profileData.phone?.replace('+966','');
if(!ph||ph.length!==9)err.phone=ar?'رقم الجوال يجب أن يتكون من 9 أرقام':'Phone must be 9 digits';
if(!profileData.email)err.email=ar?'الرجاء إدخال البريد الإلكتروني':'Please enter email';
else if(!/\S+@\S+\.\S+/.test(profileData.email))err.email=ar?'يرجى إدخال بريد إلكتروني صحيح':'Please enter a valid email';
if(profileBank){
if(profileBank.iban&&!profileBank.bank_name)err.bank_name=ar?'الرجاء اختيار البنك':'Please select bank';
if(profileBank.iban&&!profileBank.iban.startsWith('SA'))err.iban=ar?'رقم الآيبان يجب أن يبدأ بـ SA':'IBAN must start with SA';
}
setProfileErr(err);if(Object.keys(err).length>0)return;
setProfileBusy(true);try{
const{error}=await sb.from('users').update({phone:profileData.phone,nationality:profileData.nationality,email:profileData.email,updated_at:new Date().toISOString()}).eq('id',user.id);
if(error)throw error;
if(profileData.email!==profileData._origEmail){
await sb.auth.updateUser({email:profileData.email});
tt(ar?'تم إرسال رابط تأكيد للبريد الجديد':'Confirmation link sent to new email');
}
if(profileBank){if(profileBank.id){await sb.from('bank_accounts').update({bank_name:profileBank.bank_name,iban:profileBank.iban,account_number:profileBank.account_number}).eq('id',profileBank.id)}
else if(profileBank.bank_name||profileBank.iban){await sb.from('bank_accounts').insert({user_id:user.id,bank_name:profileBank.bank_name,iban:profileBank.iban,account_number:profileBank.account_number,is_active:true})}}
user.phone=profileData.phone;user.nationality=profileData.nationality;user.email=profileData.email;
tt(ar?'تم تحديث البيانات بنجاح':'Profile updated successfully');setShowProfile(false);
}catch(e){tt('خطأ: '+e.message)}setProfileBusy(false)}} style={{...goldS,width:'auto',padding:'0 28px',height:38,fontSize:12,opacity:profileBusy?.7:1}}>{profileBusy?'...':lang==='ar'?'حفظ التعديلات':'Save Changes'}</button>
<button onClick={()=>setShowProfile(false)} style={{height:38,padding:'0 20px',borderRadius:11,background:'transparent',border:'1.5px solid rgba(255,255,255,.12)',color:'var(--tx4)',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{lang==='ar'?'إلغاء':'Cancel'}</button>
</div>}
</div>
</>}
{/* ═══ AI CHAT POPUP ═══ */}
{showAiChat&&<><div onClick={()=>setShowAiChat(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',backdropFilter:'blur(4px)',zIndex:9997,display:'flex',alignItems:'center',justifyContent:'center'}}/>
<div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'min(520px,96vw)',height:'min(640px,96vh)',background:'var(--sf)',borderRadius:'min(16px,2vw)',boxShadow:'0 20px 60px rgba(0,0,0,.6)',border:'1px solid rgba(201,168,76,.2)',zIndex:9998,display:'flex',flexDirection:'column',overflow:'hidden',direction:lang==='ar'?'rtl':'ltr',fontFamily:"'Cairo',sans-serif"}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:'1px solid rgba(201,168,76,.1)',background:'var(--sb)',flexShrink:0}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:'rgba(201,168,76,.12)',border:'1px solid rgba(201,168,76,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/><path d="M12 3v4M8 7h8"/><circle cx="12" cy="3" r="1"/></svg></div>
<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{T('مساعد جسر','Jisr AI')}</div><div style={{fontSize:9,color:'rgba(201,168,76,.45)'}}>{T('مدعوم بالذكاء الاصطناعي','AI-Powered')}</div></div>
</div>
<button onClick={()=>setShowAiChat(false)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
</div>
<div style={{flex:1,overflow:'hidden'}}><AIChatPage sb={sb} user={user} lang={lang}/></div>
</div></>}
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
{showInstallBanner&&!isStandalone&&<div className='install-banner' style={{position:'fixed',bottom:'calc(70px + var(--safe-b, 0px))',left:12,right:12,zIndex:197,background:'linear-gradient(135deg,#1a1a1a,#252525)',border:'1px solid rgba(201,168,76,.25)',borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,boxShadow:'0 8px 32px rgba(0,0,0,.5)',fontFamily:"'Cairo',sans-serif"}}>
<div style={{width:44,height:44,borderRadius:12,background:'rgba(201,168,76,.12)',border:'1px solid rgba(201,168,76,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
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


function HomePage({stats,lang,branches,selectedBranch,onBranchChange,sb,onNavigate,toast}){
const[selectedBranches,setSelectedBranches]=useState([])
const[compareData,setCompareData]=useState([])
const[compareMode,setCompareMode]=useState(false)
const[dailyData,setDailyData]=useState([])
const[nitaqatData,setNitaqatData]=useState([])
const[recentActivity,setRecentActivity]=useState([])
const[loadingCompare,setLoadingCompare]=useState(false)
const[branchDropOpen,setBranchDropOpen]=useState(false)
const[prevStats,setPrevStats]=useState(null)
const[upcomingDues,setUpcomingDues]=useState([])
const[chartPeriod,setChartPeriod]=useState(6);const[todayTasks,setTodayTasks]=useState([]);const[todayAppts,setTodayAppts]=useState([])
const[monthlyTargets,setMonthlyTargets]=useState([]);const[alertsSummary,setAlertsSummary]=useState({urgent:0,warning:0,items:[]});const[analyticsOpen,setAnalyticsOpen]=useState(false);const[alertDismissed,setAlertDismissed]=useState(false)

const T=(ar,en)=>lang==='ar'?ar:en
const nm=v=>Number(v||0).toLocaleString('en-US')
const C={gold:'#c9a84c',ok:'#27a046',red:'#c0392b',blue:'#3483b4'}
const pctChange=(curr,prev)=>{if(!prev||prev===0)return null;const p=Math.round(((curr-prev)/prev)*100);return p}
const PctBadge=({curr,prev,invert})=>{const p=pctChange(curr,prev);if(p===null)return null;const up=invert?p<0:p>0;const clr=up?C.ok:p===0?'#999':C.red;return<span style={{fontSize:9,fontWeight:700,color:clr,background:clr+'12',padding:'1px 6px',borderRadius:4,marginRight:4,display:'inline-flex',alignItems:'center',gap:2}}>{p>0?'↑':p<0?'↓':'='}{Math.abs(p)}%</span>}

useEffect(()=>{if(!sb)return
const today=new Date().toISOString().slice(0,10)
const prevMonth=new Date();prevMonth.setMonth(prevMonth.getMonth()-1);const pmStr=prevMonth.toISOString().slice(0,10)
const in30=new Date();in30.setDate(in30.getDate()+30);const d30=in30.toISOString().slice(0,10)
const periodDate=new Date();periodDate.setMonth(periodDate.getMonth()-chartPeriod);const pdStr=periodDate.toISOString().slice(0,10)
const curMonth=new Date().toISOString().slice(0,8)+'01'
// ALL homepage queries in ONE parallel batch
Promise.all([
sb.from('daily_stats').select('*').is('branch_id',null).lte('stat_date',pmStr).order('stat_date',{ascending:false}).limit(1),
sb.from('tasks').select('id,title_ar,status,priority,due_date').is('deleted_at',null).in('status',['pending','in_progress','overdue']).order('priority').limit(5),
sb.from('appointments').select('id,title,time,type,status,clients:client_id(name_ar)').is('deleted_at',null).eq('date',today).in('status',['scheduled','confirmed']).order('time'),
sb.from('invoices').select('id,invoice_number,remaining_amount,due_date,clients:client_id(name_ar)').is('deleted_at',null).in('status',['unpaid','partial']).gte('due_date',today).lte('due_date',d30).order('due_date').limit(5),
sb.from('iqama_cards').select('id,iqama_expiry_date,workers:worker_id(name_ar)').is('deleted_at',null).gte('iqama_expiry_date',today).lte('iqama_expiry_date',d30).order('iqama_expiry_date').limit(5),
sb.from('work_permits').select('id,wp_expiry_date,workers:worker_id(name_ar)').is('deleted_at',null).gte('wp_expiry_date',today).lte('wp_expiry_date',d30).order('wp_expiry_date').limit(5),
sb.from('facilities').select('id,name_ar,cr_expiry_date').is('deleted_at',null).gte('cr_expiry_date',today).lte('cr_expiry_date',d30).order('cr_expiry_date').limit(5),
sb.from('facilities').select('nitaqat_color').is('deleted_at',null),
sb.from('daily_stats').select('stat_date,revenue,collected,expenses,net_profit').is('branch_id',null).gte('stat_date',pdStr).order('stat_date',{ascending:true}).limit(60),
sb.from('monthly_targets').select('*').eq('target_month',curMonth).is('branch_id',null),
sb.from('notifications_view').select('severity,type').limit(600),
sb.from('activity_log').select('*,users:user_id(name_ar)').order('created_at',{ascending:false}).limit(8)
]).then(([prevR,tasksR,apptsR,invR,iqR,wpR,facR,nitR,dailyR,targetsR,alertsR,actR])=>{
// Previous stats
if(prevR.data&&prevR.data[0])setPrevStats(prevR.data[0])
// Tasks & appointments
setTodayTasks(tasksR.data||[]);setTodayAppts(apptsR.data||[])
// Upcoming dues
const dues=[];
(invR.data||[]).forEach(r=>dues.push({type:'invoice',icon:'◎',color:'#e67e22',label:r.invoice_number+(r.clients?.name_ar?' — '+r.clients.name_ar:''),sub:nm(r.remaining_amount)+' ر.س',date:r.due_date}));
(iqR.data||[]).forEach(r=>dues.push({type:'iqama',icon:'▣',color:'#c0392b',label:r.workers?.name_ar||'عامل',sub:'إقامة',date:r.iqama_expiry_date}));
(wpR.data||[]).forEach(r=>dues.push({type:'permit',icon:'▤',color:'#c0392b',label:r.workers?.name_ar||'عامل',sub:'رخصة عمل',date:r.wp_expiry_date}));
(facR.data||[]).forEach(r=>dues.push({type:'cr',icon:'▥',color:'#c9a84c',label:r.name_ar,sub:'سجل تجاري',date:r.cr_expiry_date}));
dues.sort((a,b)=>(a.date||'').localeCompare(b.date||''));setUpcomingDues(dues.slice(0,8))
// Nitaqat
if(nitR.data){const counts={};nitR.data.forEach(f=>{const c=f.nitaqat_color||'unknown';counts[c]=(counts[c]||0)+1});setNitaqatData(Object.entries(counts).map(([k,v])=>({name:k,value:v})))}
// Daily stats
if(dailyR.data&&dailyR.data.length>0)setDailyData(dailyR.data.map(d=>({stat_date:d.stat_date,revenue:Number(d.revenue)||0,collected:Number(d.collected)||0,expenses:Number(d.expenses)||0})))
// Targets
setMonthlyTargets(targetsR.data||[])
// Alerts summary
if(alertsR.data){const u=alertsR.data.filter(n=>n.severity==='urgent').length;const w=alertsR.data.filter(n=>n.severity==='warning').length;const byType={};alertsR.data.forEach(n=>{byType[n.type]=(byType[n.type]||0)+1});setAlertsSummary({urgent:u,warning:w,total:alertsR.data.length,byType})}
// Recent activity
if(actR.data&&actR.data.length>0)setRecentActivity(actR.data)
})},[sb,chartPeriod])

// Multi-branch: auto-load stats when selection changes
const toggleBranch=(id)=>{setSelectedBranches(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])}
const selectAll=()=>setSelectedBranches(selectedBranches.length===branches.length?[]:branches.map(b=>b.id))
const[branchStatsMap,setBranchStatsMap]=useState({})
const[activeStats,setActiveStats]=useState(null)
const[txnByCategory,setTxnByCategory]=useState([])
const[txnByStatus,setTxnByStatus]=useState([])
const[txnPerf,setTxnPerf]=useState([])
const[txnStatusSummary,setTxnStatusSummary]=useState([])
const[upcomingTasks,setUpcomingTasks]=useState([]);const[branchDetail,setBranchDetail]=useState(null)

// Load service demand data from invoices
useEffect(()=>{if(!sb)return
sb.from('v_service_demand').select('*').then(({data})=>{
if(!data||data.length===0)return
// Aggregate by service code (across branches)
const catMap={};data.forEach(r=>{const k=r.code||'OTHER';if(!catMap[k])catMap[k]={code:k,name:lang==='ar'?r.name_ar:r.name_en,requests:0,amount:0,paid:0,remaining:0};catMap[k].requests+=Number(r.request_count)||0;catMap[k].amount+=Number(r.total_amount)||0;catMap[k].paid+=Number(r.paid_amount)||0;catMap[k].remaining+=Number(r.remaining_amount)||0})
setTxnByCategory(Object.values(catMap).sort((a,b)=>b.requests-a.requests))
// For donut: amount distribution
setTxnByStatus(Object.values(catMap).filter(c=>c.amount>0).map(c=>({name:c.name,value:Math.round(c.amount)})))
})
// Load transaction performance
sb.from('v_transaction_performance').select('*').then(({data})=>{
if(!data||data.length===0)return
const perfMap={};const statusTotals={completed:0,in_progress:0,pending:0,cancelled:0,has_issue:0,overdue:0}
data.forEach(r=>{const k=r.code||'OTHER';if(!perfMap[k])perfMap[k]={code:k,name:lang==='ar'?r.name_ar:r.name_en,completed:0,in_progress:0,pending:0,cancelled:0,overdue:0,has_issue:0,avg_days:0,total:0};perfMap[k].completed+=Number(r.completed)||0;perfMap[k].in_progress+=Number(r.in_progress)||0;perfMap[k].pending+=Number(r.pending)||0;perfMap[k].cancelled+=Number(r.cancelled)||0;perfMap[k].overdue+=Number(r.overdue)||0;perfMap[k].has_issue+=Number(r.has_issue)||0;perfMap[k].total+=Number(r.total)||0;perfMap[k].avg_days=Number(r.avg_days)||0;statusTotals.completed+=Number(r.completed)||0;statusTotals.in_progress+=Number(r.in_progress)||0;statusTotals.pending+=Number(r.pending)||0;statusTotals.cancelled+=Number(r.cancelled)||0;statusTotals.has_issue+=Number(r.has_issue)||0;statusTotals.overdue+=Number(r.overdue)||0})
setTxnPerf(Object.values(perfMap).filter(p=>p.total>0).sort((a,b)=>b.total-a.total))
setTxnStatusSummary(Object.entries(statusTotals).filter(([k,v])=>v>0).map(([k,v])=>({name:k,value:v})))
})
// Load upcoming tasks
sb.from('tasks').select('*,assigned:assigned_to(name_ar)').in('status',['pending','overdue']).order('due_date').limit(6).then(({data})=>{setUpcomingTasks(data||[])})},[sb,lang])

useEffect(()=>{
if(selectedBranches.length===0){setActiveStats(null);setBranchStatsMap({});setCompareData([]);setCompareMode(false);return}
setLoadingCompare(true)
Promise.all(selectedBranches.map(bid=>sb.rpc('get_branch_stats',{p_branch_id:bid}).then(({data})=>{const br=branches.find(b=>b.id===bid);return{id:bid,name:br?.name_ar||'',data:data||{}}}))).then(results=>{
const map={};const cmp=[];results.forEach(r=>{map[r.id]={name:r.name,...r.data};cmp.push({name:r.name,id:r.id,...r.data})})
setBranchStatsMap(map);setCompareData(cmp);setCompareMode(selectedBranches.length>1)
if(selectedBranches.length===1){setActiveStats(results[0]?.data||null)
// Load single-branch detail
const bid=selectedBranches[0]
Promise.all([
sb.from('users').select('id,name_ar,name_en,role_id,roles:role_id(name_ar)').eq('branch_id',bid).is('deleted_at',null).eq('is_active',true),
sb.from('branch_contracts').select('*').eq('branch_id',bid).is('deleted_at',null),
sb.from('branches').select('*').eq('id',bid).single(),
sb.from('v_transaction_sla').select('id,transaction_number,service_name_ar,status,days_remaining,sla_status,client_name').eq('branch_id',bid).order('created_at',{ascending:false}).limit(5),
sb.from('workers').select('id,iqama_expiry_date,worker_status').eq('branch_id',bid).is('deleted_at',null),
sb.from('facilities').select('id,nitaqat_color').eq('branch_id',bid).is('deleted_at',null)
]).then(([team,contracts,branch,txns,wkrs,facs])=>{
const w=wkrs.data||[];const f=facs.data||[]
const safeIq=w.filter(x=>x.iqama_expiry_date&&new Date(x.iqama_expiry_date)>new Date(Date.now()+90*86400000)).length
const warnIq=w.filter(x=>x.iqama_expiry_date&&new Date(x.iqama_expiry_date)>new Date()&&new Date(x.iqama_expiry_date)<=new Date(Date.now()+90*86400000)).length
const expIq=w.filter(x=>x.iqama_expiry_date&&new Date(x.iqama_expiry_date)<new Date()).length
const greenFac=f.filter(x=>['green_high','green_mid','green_low','platinum'].includes(x.nitaqat_color)).length
setBranchDetail({team:team.data||[],contracts:contracts.data||[],branch:branch.data,txns:txns.data||[],iqama:{safe:safeIq,warn:warnIq,expired:expIq,total:w.length},facHealth:{green:greenFac,total:f.length}})
})}
else{const agg={};['total_facilities','active_facilities','at_risk_facilities','total_workers','active_workers','total_clients','total_brokers','total_providers','total_transactions','completed_transactions','active_transactions','total_invoices','total_revenue','total_paid','total_outstanding','paid_invoices','unpaid_invoices','total_expenses','expired_permits','expired_iqamas','expired_insurance','total_branches','total_users','available_visas','used_visas','active_subscriptions','active_credentials'].forEach(k=>{agg[k]=results.reduce((s,r)=>s+(Number(r.data?.[k])||0),0)});setActiveStats(agg)}
setLoadingCompare(false)})
},[selectedBranches,sb,branches])

if(!stats)return<div style={{textAlign:'center',padding:60,color:'var(--tx4)'}}>{T('جاري التحميل...','Loading...')}</div>

const S=activeStats||stats
const profit=(S.total_paid||0)-(S.total_expenses||0)
const profitColor=profit>=0?C.ok:C.red
const nitColors={'red':'#c0392b','yellow':'#e67e22','green_low':'#27a046','green_mid':'#2ecc71','green_high':'#1abc9c','platinum':'#c9a84c','unknown':'#666'}
const nitLabels={'red':T('أحمر','Red'),'yellow':T('أصفر','Yellow'),'green_low':T('أخضر منخفض','Green Low'),'green_mid':T('أخضر متوسط','Green Mid'),'green_high':T('أخضر مرتفع','Green High'),'platinum':T('بلاتيني','Platinum'),'unknown':T('غير محدد','N/A')}

const SC=({l,v,c,sub,ic})=><div style={{padding:'18px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',transition:'.2s'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={{width:36,height:36,borderRadius:10,background:c+'15',display:'flex',alignItems:'center',justifyContent:'center'}}>{ic}</div>
<span style={{fontSize:10,fontWeight:600,color:'var(--tx4)'}}>{l}</span></div>
<div style={{fontSize:28,fontWeight:800,color:'rgba(255,255,255,.93)',lineHeight:1,marginBottom:4}}>{v}</div>
{sub&&<div style={{fontSize:10,color:'var(--tx5)',marginTop:6}}>{sub}</div>}
</div>

const Alert=({l,v,c})=>v>0?<div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,background:c+'08',border:'1px solid '+c+'20'}}>
<div style={{width:28,height:28,borderRadius:8,background:c+'15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
<span style={{fontSize:12,fontWeight:600,color:c,flex:1}}>{l}</span>
<span style={{fontSize:16,fontWeight:800,color:c}}>{v}</span></div>:null

return<div>
{/* Quick Actions + Title */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)',marginBottom:4}}>{T('لوحة التحكم','Dashboard')}</div><div style={{fontSize:12,color:'var(--tx4)'}}>{T('نظرة شاملة على بيانات النظام','Comprehensive system overview')}</div></div>
<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
{/* Branch Filter — moved to top */}
<div style={{position:'relative'}}>
<button onClick={()=>setBranchDropOpen(!branchDropOpen)} style={{height:34,padding:'0 14px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:selectedBranches.length>0?'rgba(201,168,76,.12)':'rgba(201,168,76,.06)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M12 7V3M6 7V5M18 7V5"/></svg>
{selectedBranches.length===0?T('كل المكاتب','All Branches'):selectedBranches.length===branches.length?T('كل المكاتب','All Branches'):selectedBranches.length===1?branches.find(b=>b.id===selectedBranches[0])?.name_ar||T('مكتب','Branch'):selectedBranches.length+' '+T('مكاتب','branches')}
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transition:'.2s',transform:branchDropOpen?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg></button>
{branchDropOpen&&<><div onClick={()=>setBranchDropOpen(false)} style={{position:'fixed',inset:0,zIndex:98}}/>
<div style={{position:'absolute',top:'calc(100% + 4px)',[lang==='ar'?'right':'left']:0,width:'min(260px,90vw)',background:'#252525',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,boxShadow:'0 12px 36px rgba(0,0,0,.5)',zIndex:99,maxHeight:380,overflowY:'auto'}}>
<div onClick={selectAll} style={{padding:'10px 14px',fontSize:12,fontWeight:700,color:C.gold,cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',gap:8,position:'sticky',top:0,background:'#252525',zIndex:1}}>
<div style={{width:16,height:16,borderRadius:4,border:(branches.length>0&&selectedBranches.length===branches.length)?'none':'1.5px solid rgba(255,255,255,.2)',background:(branches.length>0&&selectedBranches.length===branches.length)?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
{branches.length>0&&selectedBranches.length===branches.length&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#141414" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
</div>{T('تحديد الكل','Select all')} <span style={{fontSize:10,color:'rgba(255,255,255,.25)',marginRight:'auto',marginLeft:'auto'}}>({branches.length})</span></div>
<div onClick={()=>{setSelectedBranches([]);setBranchDropOpen(false)}} style={{padding:'10px 14px',fontSize:12,color:selectedBranches.length===0?C.gold:'rgba(255,255,255,.5)',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',gap:8,background:selectedBranches.length===0?'rgba(201,168,76,.06)':'transparent'}}>
<div style={{width:16,height:16,borderRadius:4,border:selectedBranches.length===0?'none':'1.5px solid rgba(255,255,255,.15)',background:selectedBranches.length===0?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
{selectedBranches.length===0&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#141414" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
</div>{T('الإجمالي (كل المكاتب)','Total (all branches)')}</div>
{(branches||[]).map(b=>{const sel=selectedBranches.includes(b.id);return<div key={b.id} onClick={()=>toggleBranch(b.id)} style={{padding:'10px 14px',fontSize:12,color:sel?C.gold:'rgba(255,255,255,.65)',cursor:'pointer',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,.04)',background:sel?'rgba(201,168,76,.04)':'transparent'}}>
<div style={{width:16,height:16,borderRadius:4,border:sel?'none':'1.5px solid rgba(255,255,255,.15)',background:sel?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
{sel&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#141414" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
</div><span style={{flex:1}}>{b.name_ar}</span></div>})}
</div></>}
</div>
{loadingCompare&&<div style={{width:16,height:16,border:'2px solid rgba(201,168,76,.2)',borderTopColor:C.gold,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>}
{selectedBranches.length>0&&<button onClick={()=>setSelectedBranches([])} style={{height:28,padding:'0 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'var(--tx4)',fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:600,cursor:'pointer'}}>✕ {T('إلغاء الفلتر','Clear')}</button>}
</div>
</div>

{/* ═══ 1. URGENT ALERTS BAR ═══ */}
{!alertDismissed&&alertsSummary.urgent>0&&<div style={{padding:'10px 16px',borderRadius:10,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.15)',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
<span style={{fontSize:16}}>🚨</span>
<div style={{flex:1,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
<span style={{fontSize:11,fontWeight:700,color:C.red}}>{alertsSummary.urgent} {T('تنبيه عاجل','urgent alerts')}</span>
{alertsSummary.byType?.iqama_expired>0&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(192,57,43,.1)',color:C.red}}>🪪 {alertsSummary.byType.iqama_expired} {T('إقامة منتهية','expired iqamas')}</span>}
{alertsSummary.byType?.task_overdue>0&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(192,57,43,.1)',color:C.red}}>📋 {alertsSummary.byType.task_overdue} {T('مهمة متأخرة','overdue tasks')}</span>}
{alertsSummary.byType?.transaction_issue>0&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(192,57,43,.1)',color:C.red}}>⚠ {alertsSummary.byType.transaction_issue} {T('معاملة بمشكلة','issue txns')}</span>}
</div>
{alertsSummary.warning>0&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(230,126,34,.1)',color:'#e67e22'}}>{alertsSummary.warning} {T('تحذير','warnings')}</span>}
<button onClick={()=>onNavigate&&onNavigate('report_alerts')} style={{fontSize:10,fontWeight:700,color:C.red,background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.15)',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:"'Cairo',sans-serif"}}>{T('عرض التفاصيل →','Details →')}</button>
<button onClick={()=>setAlertDismissed(true)} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',color:'var(--tx5)',cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>}
{!alertDismissed&&alertsSummary.urgent===0&&alertsSummary.warning>0&&<div style={{padding:'10px 16px',borderRadius:10,background:'rgba(230,126,34,.04)',border:'1px solid rgba(230,126,34,.1)',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
<span style={{fontSize:14}}>⚠️</span>
<span style={{fontSize:11,fontWeight:600,color:'#e67e22',flex:1}}>{alertsSummary.warning} {T('تحذير يحتاج متابعة','warnings need attention')}</span>
<button onClick={()=>onNavigate&&onNavigate('report_alerts')} style={{fontSize:10,fontWeight:600,color:'#e67e22',background:'transparent',border:'1px solid rgba(230,126,34,.2)',borderRadius:6,padding:'3px 10px',cursor:'pointer',fontFamily:"'Cairo',sans-serif"}}>{T('عرض →','View →')}</button>
<button onClick={()=>setAlertDismissed(true)} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.04)',color:'var(--tx5)',cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>}

{/* ═══ 2. TODAY TASKS + MONTHLY GOALS (side by side) ═══ */}
<div style={{display:'grid',gridTemplateColumns:monthlyTargets.length>0?'3fr 2fr':'1fr',gap:12,marginBottom:16}}>
{/* Left: Today Panel */}
<div style={{padding:'14px 16px',borderRadius:14,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{fontSize:13,fontWeight:800,color:C.gold,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> {T('مهام اليوم','Today')}</div>
<div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
{todayAppts.length>0&&<div style={{flex:1,minWidth:180}}><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:6}}>{T('المواعيد','Appointments')} ({todayAppts.length})</div>
{todayAppts.slice(0,3).map(a=><div key={a.id} style={{fontSize:11,color:'var(--tx2)',padding:'4px 0',display:'flex',gap:6}}><span style={{color:C.blue,fontWeight:700,minWidth:40}}>{a.time?.slice(0,5)}</span><span>{a.title}</span>{a.clients?.name_ar&&<span style={{color:'var(--tx4)'}}>— {a.clients.name_ar}</span>}</div>)}
</div>}
{todayTasks.length>0&&<div style={{flex:1,minWidth:180}}><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:6}}>{T('المهام المطلوبة','Tasks')} ({todayTasks.length})</div>
{todayTasks.slice(0,4).map(t=><div key={t.id} style={{fontSize:11,color:'var(--tx2)',padding:'4px 0',display:'flex',gap:6}}><span style={{width:6,height:6,borderRadius:'50%',background:t.priority==='urgent'?C.red:t.priority==='high'?'#e67e22':C.gold,flexShrink:0,marginTop:5}}/><span>{t.title_ar||'—'}</span></div>)}
</div>}
{todayAppts.length===0&&todayTasks.length===0&&<div style={{flex:1,textAlign:'center',padding:'12px 0',color:'var(--tx5)',fontSize:11}}>✅ {T('لا توجد مهام أو مواعيد اليوم','No tasks or appointments today')}</div>}
</div>
<button onClick={()=>onNavigate&&onNavigate('tasks')} style={{width:'100%',marginTop:10,height:30,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx4)',fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:600,cursor:'pointer'}}>{T('كل المهام →','All tasks →')}</button>
</div>
{/* Right: Monthly Goals Summary */}
{monthlyTargets.length>0&&(()=>{const metricLabels={revenue:T('الإيرادات','Revenue'),collection:T('التحصيل','Collection'),transactions_completed:T('المعاملات','Txns'),new_clients:T('عملاء جدد','New Clients'),expenses_limit:T('سقف المصاريف','Expenses'),invoices_issued:T('فواتير','Invoices')};const metricIcons={revenue:'💰',collection:'💳',transactions_completed:'📋',new_clients:'👥',expenses_limit:'📊',invoices_issued:'🧾'}
const totalPct=monthlyTargets.length>0?Math.round(monthlyTargets.reduce((s,t)=>{const pct=Number(t.target_value)>0?Math.min(100,Math.round(Number(t.actual_value||0)/Number(t.target_value)*100)):0;return s+pct},0)/monthlyTargets.length):0
const overallClr=totalPct>=70?C.ok:totalPct>=50?'#e67e22':C.red
return<div style={{padding:'14px 16px',borderRadius:14,background:'rgba(52,131,180,.03)',border:'1px solid rgba(52,131,180,.08)'}}>
<div style={{fontSize:13,fontWeight:800,color:C.blue,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>🎯 {T('أهداف '+new Date().toLocaleDateString('ar-SA',{month:'long'}),'Monthly Goals')}</div>
{/* Overall progress */}
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
<div style={{fontSize:22,fontWeight:900,color:overallClr}}>{totalPct}%</div>
<div style={{flex:1}}>
<div style={{height:6,borderRadius:3,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:totalPct+'%',borderRadius:3,background:overallClr,transition:'width .5s'}}/></div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{T('الأداء العام','Overall Performance')}</div>
</div>
</div>
{/* Individual metrics */}
<div style={{display:'flex',flexDirection:'column',gap:4}}>
{monthlyTargets.map(t=>{const pct=Number(t.target_value)>0?Math.min(100,Math.round(Number(t.actual_value||0)/Number(t.target_value)*100)):0;const clr=pct>=70?C.ok:pct>=50?'#e67e22':C.red;const isExpense=t.metric_key==='expenses_limit';const displayPct=isExpense?(pct<=100?pct:pct):pct;const expClr=isExpense?(pct<=100?C.ok:C.red):clr
return<div key={t.id} style={{display:'flex',alignItems:'center',gap:6,fontSize:10}}>
<span style={{width:14,textAlign:'center'}}>{metricIcons[t.metric_key]||'📌'}</span>
<span style={{width:60,color:'var(--tx4)',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{metricLabels[t.metric_key]||t.metric_key}</span>
<div style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:Math.min(100,displayPct)+'%',borderRadius:2,background:expClr}}/></div>
<span style={{fontSize:9,fontWeight:700,color:expClr,minWidth:28,textAlign:'center'}}>{displayPct}%</span>
</div>})}
</div>
<button onClick={()=>onNavigate&&onNavigate('kpi')} style={{width:'100%',marginTop:8,height:28,borderRadius:6,border:'1px solid rgba(52,131,180,.15)',background:'rgba(52,131,180,.04)',color:C.blue,fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:600,cursor:'pointer'}}>{T('تفاصيل الأهداف →','Goal details →')}</button>
</div>})()}
</div>

{/* (Today panel merged into section 2 above) */}
{/* Branch filter moved to header above */}

{/* ═══ ENHANCED ROW 1: Operations Overview ═══ */}
{(()=>{const totalInvAmt=(S.total_paid||0)+(S.total_outstanding||0);const collPct=totalInvAmt>0?Math.min(100,Math.round((S.total_paid||0)/totalInvAmt*100)):0;const txnDonePct=(S.total_transactions||0)>0?Math.round((S.completed_transactions||0)/(S.total_transactions)*100):0;const facRiskPct=(S.total_facilities||0)>0?Math.round((S.at_risk_facilities||0)/(S.total_facilities)*100):0
return<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
{/* Card 1: المنشآت والعمالة */}
<div style={{padding:'20px',borderRadius:14,background:'linear-gradient(145deg,rgba(20,22,28,.95),rgba(24,26,32,.95))',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx3)'}}>{T('المنشآت والعمالة','Facilities & Workers')}</span>
<span style={{width:36,height:36,borderRadius:10,background:C.gold+'12',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M7 8V4a2 2 0 012-2h6a2 2 0 012 2v4"/></svg></span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
<div><div style={{fontSize:26,fontWeight:800,color:C.gold}}>{S.total_facilities||0}</div><div style={{fontSize:10,color:'var(--tx5)'}}>{T('منشأة','facilities')}</div></div>
<div><div style={{fontSize:26,fontWeight:800,color:C.blue}}>{S.total_workers||0}</div><div style={{fontSize:10,color:'var(--tx5)'}}>{T('عامل','workers')}</div></div>
</div>
<div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:9,padding:'3px 8px',borderRadius:5,background:C.ok+'12',color:C.ok}}>{S.active_facilities||0} {T('نشطة','active')}</span>
{(S.at_risk_facilities||0)>0&&<span style={{fontSize:9,padding:'3px 8px',borderRadius:5,background:C.red+'12',color:C.red}}>⚠ {S.at_risk_facilities} {T('خطر','at risk')} ({facRiskPct}%)</span>}
<span style={{fontSize:9,padding:'3px 8px',borderRadius:5,background:C.blue+'12',color:C.blue}}>{S.active_workers||0} {T('نشط','active')}</span>
</div>
</div>
{/* Card 2: العملاء والمعاملات */}
<div style={{padding:'20px',borderRadius:14,background:'linear-gradient(145deg,rgba(20,22,28,.95),rgba(24,26,32,.95))',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx3)'}}>{T('العملاء والمعاملات','Clients & Transactions')}</span>
<span style={{width:36,height:36,borderRadius:10,background:'rgba(230,126,34,.12)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10h8M8 14h5"/></svg></span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
<div><div style={{fontSize:26,fontWeight:800,color:C.ok}}>{S.total_clients||0}</div><div style={{fontSize:10,color:'var(--tx5)'}}>{T('عميل','clients')} · {S.total_brokers||0} {T('وسيط','brokers')}</div></div>
<div><div style={{fontSize:26,fontWeight:800,color:'#e67e22'}}>{S.total_transactions||0}</div><div style={{fontSize:10,color:'var(--tx5)'}}>{T('معاملة','transactions')}</div></div>
</div>
{/* Transaction progress */}
<div style={{display:'flex',alignItems:'center',gap:6}}>
<div style={{flex:1,height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:txnDonePct+'%',borderRadius:2,background:C.ok}}/></div>
<span style={{fontSize:9,fontWeight:700,color:C.ok}}>{txnDonePct}% {T('مكتملة','done')}</span>
</div>
<div style={{display:'flex',gap:6,marginTop:6}}>
<span style={{fontSize:9,padding:'3px 8px',borderRadius:5,background:C.ok+'12',color:C.ok}}>{S.completed_transactions||0} {T('مكتملة','done')}</span>
<span style={{fontSize:9,padding:'3px 8px',borderRadius:5,background:C.blue+'12',color:C.blue}}>{S.active_transactions||0} {T('جارية','active')}</span>
</div>
</div>
{/* Card 3: المالية */}
<div style={{padding:'20px',borderRadius:14,background:'linear-gradient(145deg,rgba(20,22,28,.95),rgba(24,26,32,.95))',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx3)'}}>{T('الملخص المالي','Financial Summary')}</span>
<span style={{width:36,height:36,borderRadius:10,background:profitColor+'12',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={profitColor} strokeWidth="1.8"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
<div><div style={{fontSize:9,color:C.gold,marginBottom:2}}>{T('الإيرادات','Revenue')}</div><div style={{fontSize:18,fontWeight:800,color:C.gold}}>{nm(S.total_revenue)}</div></div>
<div><div style={{fontSize:9,color:C.ok,marginBottom:2}}>{T('المحصّل','Collected')}</div><div style={{fontSize:18,fontWeight:800,color:C.ok}}>{nm(S.total_paid)}</div></div>
<div><div style={{fontSize:9,color:C.red,marginBottom:2}}>{T('المتبقي','Outstanding')}</div><div style={{fontSize:16,fontWeight:800,color:C.red}}>{nm(S.total_outstanding)}</div></div>
<div><div style={{fontSize:9,color:profitColor,marginBottom:2}}>{T('صافي الربح','Net Profit')}</div><div style={{fontSize:16,fontWeight:800,color:profitColor}}>{nm(Math.abs(profit))}</div></div>
</div>
{/* Collection rate */}
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:9,color:'var(--tx5)'}}>{T('نسبة التحصيل','Collection')}</span>
<div style={{flex:1,height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:collPct+'%',borderRadius:2,background:collPct>=70?C.ok:collPct>=50?'#e67e22':C.red}}/></div>
<span style={{fontSize:10,fontWeight:800,color:collPct>=70?C.ok:collPct>=50?'#e67e22':C.red}}>{collPct}%</span>
</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:4}}>{S.total_invoices||0} {T('فاتورة','invoices')} · {S.paid_invoices||0} {T('مدفوعة','paid')} · {S.unpaid_invoices||0} {T('معلّقة','pending')}</div>
</div>
</div>})()}

{/* Charts Row */}
<div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14,marginBottom:20}}>
{/* Trend Chart */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{T('الإيرادات والمصروفات','Revenue & Expenses Trend')}</div>
<select value={chartPeriod} onChange={e=>setChartPeriod(Number(e.target.value))} style={{height:28,padding:'0 8px',borderRadius:6,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:700,cursor:'pointer',outline:'none'}}>
<option value={3}>{T('3 شهور','3 months')}</option>
<option value={6}>{T('6 شهور','6 months')}</option>
<option value={12}>{T('سنة','1 year')}</option>
</select>
</div>
{dailyData.length>0?<ResponsiveContainer width="100%" height={200}>
<BarChart data={dailyData} barGap={2}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
<XAxis dataKey="stat_date" tick={{fontSize:10,fill:'rgba(255,255,255,.3)'}} tickFormatter={v=>v?.slice(5)||v}/>
<YAxis tick={{fontSize:10,fill:'rgba(255,255,255,.3)'}} tickFormatter={v=>v>=1000?(v/1000)+'k':v}/>
<Tooltip contentStyle={{background:'#252525',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:11,color:'rgba(255,255,255,.8)'}} formatter={v=>[nm(v),'']}/>
<Bar dataKey="revenue" name={T('الإيرادات','Revenue')} fill="#c9a84c" radius={[4,4,0,0]} barSize={18}/>
<Bar dataKey="collected" name={T('المحصّل','Collected')} fill="#3483b4" radius={[4,4,0,0]} barSize={18}/>
<Bar dataKey="expenses" name={T('المصروفات','Expenses')} fill="#c0392b" radius={[4,4,0,0]} barSize={18}/>
</BarChart>
</ResponsiveContainer>:<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx5)',fontSize:12}}>{T('لا توجد بيانات تاريخية بعد','No historical data yet')}</div>}
</div>
{/* Nitaqat Pie */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14}}>{T('توزيع نطاقات','Nitaqat Distribution')}</div>
{nitaqatData.length>0?<ResponsiveContainer width="100%" height={200}>
<PieChart><Pie data={nitaqatData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" nameKey="name">
{nitaqatData.map((e,i)=><Cell key={i} fill={nitColors[e.name]||'#666'}/>)}
</Pie><Tooltip contentStyle={{background:'#252525',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:11}} formatter={(v,n)=>[v+' '+T('منشأة','facilities'),nitLabels[n]||n]}/></PieChart>
</ResponsiveContainer>:<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx5)',fontSize:12}}>{T('لا توجد بيانات','No data')}</div>}
<div style={{display:'flex',flexWrap:'wrap',gap:4,justifyContent:'center'}}>
{nitaqatData.map((e,i)=><span key={i} style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:(nitColors[e.name]||'#666')+'20',color:nitColors[e.name]||'#666'}}>{nitLabels[e.name]||e.name}: {e.value}</span>)}
</div>
</div>
</div>

{/* ═══ COLLAPSIBLE ANALYTICS ═══ */}
<div onClick={()=>setAnalyticsOpen(!analyticsOpen)} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:10,background:'rgba(201,168,76,.03)',border:'1px solid rgba(201,168,76,.08)',cursor:'pointer',marginBottom:analyticsOpen?14:20}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{transform:analyticsOpen?'rotate(90deg)':'',transition:'.2s'}}><polyline points="9 6 15 12 9 18" stroke={C.gold} strokeWidth="2.5"/></svg>
<span style={{fontSize:12,fontWeight:700,color:C.gold}}>📊 {T('التحليلات التفصيلية','Detailed Analytics')}</span>
<span style={{fontSize:10,color:'var(--tx5)'}}>{T('الطلب على الخدمات · توزيع المبالغ · حالة المعاملات','Service demand · Revenue breakdown · Transaction status')}</span>
</div>
{analyticsOpen&&<>
{/* Service Demand Charts */}
<div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:14,marginBottom:20}}>
{/* Bar: Service demand by count */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10h8M8 14h5"/></svg>
{T('الطلب على الخدمات','Service Demand')}</div>
{txnByCategory.length>0?<ResponsiveContainer width="100%" height={Math.max(180, txnByCategory.length * 36)}>
<BarChart data={txnByCategory} layout="vertical" barGap={4}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" horizontal={false}/>
<XAxis type="number" tick={{fontSize:10,fill:'rgba(255,255,255,.3)'}} allowDecimals={false}/>
<YAxis type="category" dataKey="name" width={140} tick={{fontSize:11,fill:'rgba(255,255,255,.55)'}}/>
<Tooltip contentStyle={{background:'#252525',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:12,color:'rgba(255,255,255,.9)'}} formatter={(v,n)=>{if(n==='requests')return[v+' '+T('طلب','requests'),T('عدد الطلبات','Requests')];return[Number(v).toLocaleString()+' '+T('ر.س','SAR'),T('المبلغ','Amount')]}}/>
<Bar dataKey="requests" name={T('الطلبات','Requests')} fill={C.gold} radius={[0,6,6,0]} barSize={16}/>
</BarChart>
</ResponsiveContainer>:<div style={{height:180,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx5)',fontSize:12}}>{T('لا توجد فواتير','No invoices')}</div>}
</div>
{/* Donut: Amount distribution by service */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0110 10"/></svg>
{T('توزيع المبالغ حسب الخدمة','Revenue by Service')}</div>
{txnByStatus.length>0?<><ResponsiveContainer width="100%" height={180}>
<PieChart><Pie data={txnByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" nameKey="name">
{txnByStatus.map((e,i)=>{const svcColors=['#c9a84c','#3483b4','#27a046','#e67e22','#9b59b6','#1abc9c','#c0392b','#2ecc71','#888'];return<Cell key={i} fill={svcColors[i%svcColors.length]}/>})}
</Pie><Tooltip contentStyle={{background:'#252525',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:11}} formatter={(v)=>[Number(v).toLocaleString()+' '+T('ر.س','SAR')]}/></PieChart>
</ResponsiveContainer>
<div style={{display:'flex',flexWrap:'wrap',gap:4,justifyContent:'center'}}>
{txnByStatus.map((e,i)=>{const svcColors=['#c9a84c','#3483b4','#27a046','#e67e22','#9b59b6','#1abc9c','#c0392b','#2ecc71','#888'];const c=svcColors[i%svcColors.length];return<span key={i} style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:c+'18',color:c,display:'flex',alignItems:'center',gap:3}}><span style={{width:5,height:5,borderRadius:'50%',background:c}}/>{e.name}: {Number(e.value).toLocaleString()}</span>})}
</div></>:<div style={{height:180,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx5)',fontSize:12}}>{T('لا توجد بيانات','No data')}</div>}
</div>
</div>

{/* Transaction Performance Charts */}
{txnPerf.length>0&&<div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:14,marginBottom:20}}>
{/* Stacked Bar: Performance by service */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3483b4" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
{T('إنجاز المعاملات حسب الخدمة','Task Completion by Service')}</div>
<div style={{display:'flex',gap:8,fontSize:9}}>
{[['#27a046',T('مكتملة','Done')],['#3483b4',T('جارية','Active')],['#c9a84c',T('معلّقة','Pending')],['#c0392b',T('متأخرة','Overdue')]].map(([c,l],i)=><span key={i} style={{display:'flex',alignItems:'center',gap:3,color:c}}><span style={{width:6,height:6,borderRadius:2,background:c}}/>{l}</span>)}
</div>
</div>
<ResponsiveContainer width="100%" height={Math.max(180, txnPerf.length * 36)}>
<BarChart data={txnPerf} layout="vertical" barGap={0} barCategoryGap={6}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" horizontal={false}/>
<XAxis type="number" tick={{fontSize:10,fill:'rgba(255,255,255,.3)'}} allowDecimals={false}/>
<YAxis type="category" dataKey="name" width={140} tick={{fontSize:11,fill:'rgba(255,255,255,.55)'}}/>
<Tooltip contentStyle={{background:'#252525',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:11,color:'rgba(255,255,255,.9)'}} formatter={(v,n)=>{const labels={completed:T('مكتملة','Completed'),in_progress:T('جارية','In Progress'),pending:T('معلّقة','Pending'),overdue:T('متأخرة','Overdue')};return[v,labels[n]||n]}}/>
<Bar dataKey="completed" name="completed" stackId="a" fill="#27a046" barSize={16}/>
<Bar dataKey="in_progress" name="in_progress" stackId="a" fill="#3483b4"/>
<Bar dataKey="pending" name="pending" stackId="a" fill="#c9a84c"/>
<Bar dataKey="overdue" name="overdue" stackId="a" fill="#c0392b" radius={[0,4,4,0]}/>
</BarChart>
</ResponsiveContainer>
{/* Avg days row */}
<div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10,padding:'10px 0',borderTop:'1px solid var(--bd2)'}}>
{txnPerf.filter(p=>p.avg_days>0).map((p,i)=><span key={i} style={{fontSize:10,padding:'3px 10px',borderRadius:6,background:'rgba(52,131,180,.08)',border:'1px solid rgba(52,131,180,.12)',color:C.blue,display:'flex',alignItems:'center',gap:4}}>
{p.name}: <strong>{p.avg_days}</strong> {T('يوم','days')}
</span>)}
{txnPerf.every(p=>!p.avg_days)&&<span style={{fontSize:10,color:'var(--tx5)'}}>{T('لا توجد بيانات وقت إنجاز','No completion time data')}</span>}
</div>
</div>

{/* Donut: Overall status + Summary cards */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
{T('حالة المعاملات','Transaction Status')}</div>
{txnStatusSummary.length>0?<><ResponsiveContainer width="100%" height={160}>
<PieChart><Pie data={txnStatusSummary} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value" nameKey="name">
{txnStatusSummary.map((e,i)=>{const stC={completed:'#27a046',in_progress:'#3483b4',pending:'#c9a84c',cancelled:'#888',has_issue:'#c0392b',overdue:'#e67e22'};return<Cell key={i} fill={stC[e.name]||'#666'}/>})}
</Pie><Tooltip contentStyle={{background:'#252525',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:11}} formatter={(v,n)=>{const stL={completed:T('مكتملة','Completed'),in_progress:T('جارية','In Progress'),pending:T('معلّقة','Pending'),cancelled:T('ملغية','Cancelled'),has_issue:T('مشكلة','Issue'),overdue:T('متأخرة','Overdue')};return[v+' '+T('معاملة','transactions'),stL[n]||n]}}/></PieChart>
</ResponsiveContainer>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginTop:6}}>
{txnStatusSummary.map((e,i)=>{const stC={completed:'#27a046',in_progress:'#3483b4',pending:'#c9a84c',cancelled:'#888',has_issue:'#c0392b',overdue:'#e67e22'};const stL={completed:T('مكتملة','Done'),in_progress:T('جارية','Active'),pending:T('معلّقة','Pending'),cancelled:T('ملغية','Cancelled'),has_issue:T('مشكلة','Issue'),overdue:T('متأخرة','Overdue')};const c=stC[e.name]||'#666';return<div key={i} style={{padding:'8px',borderRadius:8,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:18,fontWeight:800,color:c,lineHeight:1}}>{e.value}</div>
<div style={{fontSize:9,color:c,marginTop:4,opacity:.7}}>{stL[e.name]||e.name}</div>
</div>})}
</div></>:<div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx5)',fontSize:12}}>{T('لا توجد معاملات','No transactions')}</div>}
</div>
</div>}

</>}
{/* Alerts + Activity + Tasks + Upcoming */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:14,marginBottom:20}}>
{/* Alerts */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
{T('تنبيهات','Alerts')}</div>
<div style={{display:'flex',flexDirection:'column',gap:6}}>
<Alert l={T('رخص عمل منتهية','Expired Permits')} v={S.expired_permits} c={C.red}/>
<Alert l={T('إقامات منتهية','Expired Iqamas')} v={S.expired_iqamas} c={C.red}/>
<Alert l={T('تأمين منتهي','Expired Insurance')} v={S.expired_insurance} c="#e67e22"/>
<Alert l={T('منشآت خطر','At Risk')} v={S.at_risk_facilities} c={C.red}/>
{(S.expired_permits||0)+(S.expired_iqamas||0)+(S.expired_insurance||0)+(S.at_risk_facilities||0)===0&&
<div style={{textAlign:'center',padding:16,color:'rgba(39,160,70,.5)',fontSize:11,fontWeight:600}}>{T('لا توجد تنبيهات','No alerts')}</div>}
</div>
<button onClick={()=>onNavigate&&onNavigate('report_alerts')} style={{width:'100%',marginTop:10,height:30,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx4)',fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:600,cursor:'pointer'}}>{T('عرض كل التنبيهات →','View all alerts →')}</button>
</div>

{/* Activity Feed */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
{T('آخر الأحداث','Recent Activity')}</div>
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{recentActivity.length===0?<div style={{textAlign:'center',padding:16,color:'var(--tx5)',fontSize:11}}>{T('لا توجد أحداث','No activity')}</div>:
recentActivity.map((a,i)=>{const actC={insert:C.ok,update:C.blue,delete:C.red}[a.action]||'#999';const actL={insert:T('إنشاء','Create'),update:T('تحديث','Update'),delete:T('حذف','Delete')}[a.action]||a.action||'';const entL={transactions:T('معاملة','Transaction'),invoices:T('فاتورة','Invoice'),facilities:T('منشأة','Facility'),workers:T('عامل','Worker'),expenses:T('مصروف','Expense'),tasks:T('مهمة','Task'),clients:T('عميل','Client'),users:T('مستخدم','User'),bank_accounts:T('حساب بنكي','Bank'),attendance:T('حضور','Attendance')}[a.entity_type]||a.entity_type||''
return<div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'6px 0',borderBottom:'1px solid var(--bd2)'}}>
<div style={{width:6,height:6,borderRadius:'50%',background:actC,marginTop:5,flexShrink:0}}/>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:11,color:'var(--tx3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.description||(actL+' '+entL)}</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>{a.users?.name_ar||''}{a.created_at?' · '+new Date(a.created_at).toLocaleDateString(lang==='ar'?'ar-SA':'en-US',{day:'numeric',month:'short'}):''}</div>
</div>
<span style={{fontSize:8,padding:'1px 5px',borderRadius:3,background:actC+'15',color:actC,flexShrink:0}}>{entL}</span>
</div>})}
</div>
</div>

{/* Tasks */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4M16 2v4M8 2v4"/></svg>
{T('مهام قادمة','Upcoming Tasks')}</div>
<div style={{display:'flex',flexDirection:'column',gap:5}}>
{upcomingTasks.length===0?<div style={{textAlign:'center',padding:16,color:'var(--tx5)',fontSize:11}}>{T('لا توجد مهام','No tasks')}</div>:
upcomingTasks.slice(0,5).map((t,i)=>{const dLeft=Math.ceil((new Date(t.due_date)-new Date())/86400000);const stC={pending:C.gold,overdue:C.red}[t.status]||'#999';const isOD=t.status==='overdue'||dLeft<0
return<div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:6,background:isOD?'rgba(192,57,43,.04)':'rgba(255,255,255,.02)',border:'1px solid '+(isOD?'rgba(192,57,43,.08)':'var(--bd2)')}}>
<div style={{width:6,height:6,borderRadius:'50%',background:stC,flexShrink:0}}/>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:11,fontWeight:600,color:'var(--tx3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title_ar}</div>
{t.assigned?.name_ar&&<div style={{fontSize:9,color:'var(--tx5)'}}>{t.assigned.name_ar}</div>}
</div>
<span style={{fontSize:10,fontWeight:700,color:stC,flexShrink:0}}>{dLeft<0?dLeft+T('ي','d'):dLeft===0?T('اليوم','Today'):'+'+dLeft+T('ي','d')}</span>
</div>})}
</div>
<button onClick={()=>onNavigate&&onNavigate('tasks')} style={{width:'100%',marginTop:10,height:30,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx4)',fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:600,cursor:'pointer'}}>{T('كل المهام →','All tasks →')}</button>
</div>

{/* Upcoming Due Dates */}
<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
{T('استحقاقات قادمة','Upcoming Due Dates')}</div>
<div style={{display:'flex',flexDirection:'column',gap:5}}>
{upcomingDues.length===0?<div style={{textAlign:'center',padding:16,color:'var(--tx5)',fontSize:11}}>{T('لا توجد استحقاقات قريبة','No upcoming dues')}</div>:
upcomingDues.map((d,i)=>{const daysLeft=Math.ceil((new Date(d.date)-new Date())/(1000*60*60*24));const urgClr=daysLeft<=3?C.red:daysLeft<=7?'#e67e22':C.gold
return<div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd2)'}}>
<span style={{fontSize:14,width:24,textAlign:'center',flexShrink:0}}>{d.icon}</span>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.label}</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>{d.sub}</div>
</div>
<div style={{textAlign:'center',flexShrink:0}}>
<div style={{fontSize:14,fontWeight:800,color:urgClr}}>{daysLeft}</div>
<div style={{fontSize:8,color:urgClr,opacity:.7}}>{T('يوم','days')}</div>
</div>
</div>})}
</div>
<button onClick={()=>onNavigate&&onNavigate('report_alerts')} style={{width:'100%',marginTop:10,height:30,borderRadius:6,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx4)',fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:600,cursor:'pointer'}}>{T('عرض كل التنبيهات →','View all alerts →')}</button>
</div>
</div>

{/* ═══ SINGLE BRANCH DASHBOARD ═══ */}
{selectedBranches.length===1&&branchDetail&&(()=>{const bd=branchDetail;const br=bd.branch||{};const brName=branches.find(b=>b.id===selectedBranches[0])?.name_ar||'';const facPct=bd.facHealth.total>0?Math.round(bd.facHealth.green/bd.facHealth.total*100):0;const iqPct=bd.iqama.total>0?Math.round(bd.iqama.safe/bd.iqama.total*100):0;const licDays=br.license_expiry_date?Math.ceil((new Date(br.license_expiry_date)-new Date())/86400000):null;const cdDays=br.civil_defense_expiry?Math.ceil((new Date(br.civil_defense_expiry)-new Date())/86400000):null;const slaClr={on_time:C.ok,on_track:C.ok,warning:'#e67e22',critical:C.red,overdue:C.red};const stClr2={completed:C.ok,in_progress:C.blue,pending:C.gold,issue:C.red,cancelled:'#888'}
return<div style={{borderRadius:16,background:'linear-gradient(145deg,rgba(20,22,28,.95),rgba(24,26,32,.95))',border:'1px solid rgba(201,168,76,.12)',padding:'20px',marginBottom:20}}>
{/* Header */}
<div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
<div style={{width:44,height:44,borderRadius:12,background:C.gold+'15',border:'1.5px solid '+C.gold+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏢</div>
<div style={{flex:1}}><div style={{fontSize:17,fontWeight:800,color:'var(--tx)'}}>{brName} — {T('لوحة الأداء','Performance')}</div>
{bd.team.length>0&&<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{bd.team.length} {T('موظف','employees')}</div>}</div>
</div>
{/* Stats row */}
<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
{[[T('المنشآت','Fac.'),S.total_facilities||0,C.gold,'🏢'],[T('العمّال','Workers'),S.total_workers||0,C.blue,'👥'],[T('العملاء','Clients'),S.total_clients||0,C.ok,'👤'],[T('المعاملات','Txns'),S.total_transactions||0,'#e67e22','📋'],[T('الإيرادات','Revenue'),nm(S.total_revenue),C.gold,'💰']].map(([l,v,c,ic],i)=>
<div key={i} style={{padding:'12px',borderRadius:12,background:c+'06',border:'1px solid '+c+'12',textAlign:'center'}}>
<div style={{fontSize:14}}>{ic}</div>
<div style={{fontSize:20,fontWeight:800,color:c,marginTop:4}}>{v}</div>
<div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{/* Health bars */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
<div style={{padding:'14px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:11,fontWeight:700,color:'var(--tx3)'}}>🏢 {T('صحة المنشآت','Facility Health')}</span><span style={{fontSize:12,fontWeight:800,color:facPct>=80?C.ok:facPct>=60?'#e67e22':C.red}}>{facPct}%</span></div>
<div style={{height:6,borderRadius:3,background:'rgba(255,255,255,.06)',overflow:'hidden',marginBottom:6}}><div style={{height:'100%',width:facPct+'%',borderRadius:3,background:facPct>=80?C.ok:facPct>=60?'#e67e22':C.red}}/></div>
<div style={{fontSize:9,color:'var(--tx5)'}}>{bd.facHealth.green} {T('أخضر','green')} · {bd.facHealth.total-bd.facHealth.green} {T('أخرى','other')}</div>
</div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:11,fontWeight:700,color:'var(--tx3)'}}>🪪 {T('صحة الإقامات','Iqama Health')}</span><span style={{fontSize:12,fontWeight:800,color:iqPct>=80?C.ok:iqPct>=60?'#e67e22':C.red}}>{iqPct}%</span></div>
<div style={{height:6,borderRadius:3,background:'rgba(255,255,255,.06)',overflow:'hidden',marginBottom:6}}><div style={{height:'100%',width:iqPct+'%',borderRadius:3,background:iqPct>=80?C.ok:iqPct>=60?'#e67e22':C.red}}/></div>
<div style={{fontSize:9,color:'var(--tx5)'}}>{bd.iqama.safe} {T('سارية','valid')} · {bd.iqama.warn} {T('تحذير','warn')} · {bd.iqama.expired} {T('منتهية','expired')}</div>
</div>
</div>
{/* Team + Licenses */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
{/* Team */}
<div style={{padding:'14px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>👥 {T('فريق الفرع','Branch Team')} ({bd.team.length})</div>
{bd.team.length===0?<div style={{fontSize:10,color:'var(--tx5)',textAlign:'center',padding:12}}>{T('لا يوجد موظفين','No employees')}</div>:
bd.team.slice(0,5).map(u=><div key={u.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--bd2)'}}>
<div style={{width:28,height:28,borderRadius:8,background:C.blue+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:C.blue,flexShrink:0}}>{(u.name_ar||'?')[0]}</div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name_ar}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{u.roles?.name_ar||''}</div></div>
</div>)}
</div>
{/* Licenses + Contracts */}
<div style={{padding:'14px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>📋 {T('التراخيص والمرافق','Licenses & Facilities')}</div>
{licDays!==null&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--bd2)'}}>
<span style={{fontSize:10,color:'var(--tx4)'}}>{T('رخصة بلدية','Municipal')}</span>
<span style={{fontSize:11,fontWeight:700,color:licDays>90?C.ok:licDays>30?'#e67e22':C.red}}>{licDays>0?licDays+' '+T('يوم','days'):T('منتهية','Expired')}</span>
</div>}
{cdDays!==null&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--bd2)'}}>
<span style={{fontSize:10,color:'var(--tx4)'}}>{T('الدفاع المدني','Civil Defense')}</span>
<span style={{fontSize:11,fontWeight:700,color:cdDays>90?C.ok:cdDays>30?'#e67e22':C.red}}>{cdDays>0?cdDays+' '+T('يوم','days'):T('منتهية','Expired')}</span>
</div>}
{bd.contracts.slice(0,4).map(c=>{const isExp=c.contract_end&&new Date(c.contract_end)<new Date();const typeAr={rent:T('إيجار','Rent'),electricity:T('كهرباء','Elec'),water:T('ماء','Water'),internet:T('إنترنت','Internet'),phone:T('هاتف','Phone'),cleaning:T('نظافة','Cleaning')}
return<div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--bd2)'}}>
<span style={{fontSize:10,color:'var(--tx4)'}}>{typeAr[c.contract_type]||c.contract_type}</span>
<div style={{display:'flex',alignItems:'center',gap:4}}>
{c.amount>0&&<span style={{fontSize:10,color:C.gold}}>{nm(c.amount)}</span>}
{isExp&&<span style={{fontSize:8,padding:'1px 4px',borderRadius:3,background:C.red+'12',color:C.red}}>⚠</span>}
</div>
</div>})}
</div>
</div>
{/* Recent transactions */}
{bd.txns.length>0&&<div style={{padding:'14px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>📊 {T('آخر المعاملات','Recent Transactions')}</div>
{bd.txns.map(t=><div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--bd2)'}}>
<div style={{width:6,height:6,borderRadius:'50%',background:stClr2[t.status]||'#999',flexShrink:0}}/>
<span style={{fontSize:10,fontWeight:700,color:C.gold,direction:'ltr',flexShrink:0}}>{t.transaction_number}</span>
<span style={{fontSize:10,color:'var(--tx3)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.service_name_ar||''}</span>
{t.client_name&&<span style={{fontSize:9,color:'var(--tx5)'}}>{t.client_name}</span>}
{t.days_remaining!=null&&<span style={{fontSize:9,fontWeight:700,color:slaClr[t.sla_status]||'#999'}}>{t.days_remaining<0?t.days_remaining:'+'+t.days_remaining}{T('ي','d')}</span>}
</div>)}
</div>}
</div>})()}

{/* Branch Comparison — auto-shown when >1 branch selected */}
{compareMode&&compareData.length>1&&<div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid rgba(201,168,76,.1)',padding:'18px',marginBottom:20}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M12 7V3M6 7V5M18 7V5"/></svg>
{T('مقارنة المكاتب','Branch Comparison')} <span style={{fontSize:10,color:'var(--tx5)',fontWeight:500}}>({compareData.length} {T('مكاتب','branches')})</span></div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
<div><div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:8}}>{T('الإيرادات والمحصّل','Revenue & Collected')}</div>
<ResponsiveContainer width="100%" height={180}>
<BarChart data={compareData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
<XAxis dataKey="name" tick={{fontSize:10,fill:'rgba(255,255,255,.4)'}}/>
<YAxis tick={{fontSize:10,fill:'rgba(255,255,255,.3)'}} tickFormatter={v=>v>=1000?(v/1000)+'k':v}/>
<Tooltip contentStyle={{background:'#252525',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:11}} formatter={v=>[nm(v),'']}/>
<Bar dataKey="total_revenue" name={T('الإيرادات','Revenue')} fill={C.gold} radius={[4,4,0,0]}/>
<Bar dataKey="total_paid" name={T('المحصّل','Collected')} fill={C.ok} radius={[4,4,0,0]}/>
</BarChart></ResponsiveContainer></div>
<div><div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:8}}>{T('المنشآت والعمال','Facilities & Workers')}</div>
<ResponsiveContainer width="100%" height={180}>
<BarChart data={compareData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
<XAxis dataKey="name" tick={{fontSize:10,fill:'rgba(255,255,255,.4)'}}/>
<YAxis tick={{fontSize:10,fill:'rgba(255,255,255,.3)'}}/>
<Tooltip contentStyle={{background:'#252525',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,fontSize:11}}/>
<Bar dataKey="total_facilities" name={T('المنشآت','Facilities')} fill={C.gold} radius={[4,4,0,0]}/>
<Bar dataKey="total_workers" name={T('العمال','Workers')} fill={C.blue} radius={[4,4,0,0]}/>
<Bar dataKey="total_clients" name={T('العملاء','Clients')} fill={C.ok} radius={[4,4,0,0]}/>
</BarChart></ResponsiveContainer></div>
</div>
<div style={{overflowX:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{borderBottom:'1px solid var(--bd)'}}>
<th style={{padding:'8px 10px',textAlign:'right',color:'var(--tx4)',fontWeight:600}}>{T('المكتب','Branch')}</th>
<th style={{padding:'8px 10px',textAlign:'center',color:C.gold}}>{T('المنشآت','Fac.')}</th>
<th style={{padding:'8px 10px',textAlign:'center',color:C.blue}}>{T('العمال','Workers')}</th>
<th style={{padding:'8px 10px',textAlign:'center',color:C.ok}}>{T('العملاء','Clients')}</th>
<th style={{padding:'8px 10px',textAlign:'center',color:'#e67e22'}}>{T('المعاملات','Txn')}</th>
<th style={{padding:'8px 10px',textAlign:'center',color:C.gold}}>{T('الإيرادات','Revenue')}</th>
<th style={{padding:'8px 10px',textAlign:'center',color:C.ok}}>{T('المحصّل','Collected')}</th>
<th style={{padding:'8px 10px',textAlign:'center',color:C.red}}>{T('المتبقي','Due')}</th>
</tr></thead>
<tbody>{compareData.map((r,i)=><tr key={i} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'8px 10px',fontWeight:700,color:'var(--tx2)'}}>{r.name}</td>
<td style={{padding:'8px 10px',textAlign:'center',color:'var(--tx3)'}}>{r.total_facilities||0}</td>
<td style={{padding:'8px 10px',textAlign:'center',color:'var(--tx3)'}}>{r.total_workers||0}</td>
<td style={{padding:'8px 10px',textAlign:'center',color:'var(--tx3)'}}>{r.total_clients||0}</td>
<td style={{padding:'8px 10px',textAlign:'center',color:'var(--tx3)'}}>{r.total_transactions||0}</td>
<td style={{padding:'8px 10px',textAlign:'center',color:C.gold,fontWeight:700}}>{nm(r.total_revenue)}</td>
<td style={{padding:'8px 10px',textAlign:'center',color:C.ok,fontWeight:700}}>{nm(r.total_paid)}</td>
<td style={{padding:'8px 10px',textAlign:'center',color:C.red,fontWeight:700}}>{nm(r.total_outstanding)}</td>
</tr>)}</tbody>
</table>
</div>
</div>}
</div>}


function CrudPage({sb,user,conf,toast,onRefresh,lang}){
const{table,title,cols,flds,filter,stats:statFields}=conf;const T=(ar,en)=>lang==='ar'?ar:en;const TL=ar=>lang==='ar'?ar:(TR[ar]||ar)
const[data,setData]=useState([]);const[loading,setLoading]=useState(true);const[q,setQ]=useState('')
const[pop,setPop]=useState(null);const[form,setForm]=useState({});const[saving,setSaving]=useState(false)
const[viewRow,setViewRow]=useState(null)
const load=useCallback(async()=>{setLoading(true);let qr=sb.from(table).select('*').is('deleted_at',null);if(filter)qr=qr.eq(filter.k,filter.v);const{data:d}=await qr.order('created_at',{ascending:false}).limit(500);setData(d||[]);setLoading(false)},[sb,table,filter?.k,filter?.v])
useEffect(()=>{load()},[load])
const openAdd=()=>{const init={};flds.forEach(f=>init[f.k]='');if(filter)init[filter.k]=filter.v;setForm(init);setPop('add')}
const openEdit=row=>{const init={};flds.forEach(f=>init[f.k]=row[f.k]??'');init._id=row.id;setForm(init);setPop('edit')}
const save=async()=>{for(const f of flds){if(f.r&&!form[f.k]){toast(TL(f.l)+T(' مطلوب',' is required'));return}}setSaving(true);try{const p={...form};delete p._id;Object.keys(p).forEach(k=>{if(p[k]==='')p[k]=null});if(pop==='add'){p.created_by=user?.id;const{error}=await sb.from(table).insert(p);if(error)throw error;toast(T('تمت الإضافة','Added successfully'))}else{p.updated_by=user?.id;const{error}=await sb.from(table).update(p).eq('id',form._id);if(error)throw error;toast(T('تم التعديل','Updated successfully'))}setPop(null);load();onRefresh?.()}catch(e){toast('خطأ: '+((e.message||'').slice(0,80)))}setSaving(false)}
const del=async id=>{if(!confirm(T('حذف؟','Delete?')))return;const{error}=await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id);if(error)toast('خطأ');else{toast(T('تم الحذف','Deleted successfully'));load();onRefresh?.()}}
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

return<div>
{/* Header */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
<div><div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,.93)'}}>{title}</div><div style={{fontSize:11,color:'var(--tx4)',marginTop:2}}>{data.length} {T('سجل','records')}</div></div>
<button onClick={openAdd} style={{height:40,padding:'0 20px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
{T('إضافة','Add')}
</button>
</div>

{/* Stat Cards */}
{statCards.length>1&&<div style={{display:'flex',gap:8,marginBottom:14,overflowX:'auto',scrollbarWidth:'none'}}>
{statCards.map((c,i)=><div key={i} style={{minWidth:100,padding:'10px 14px',borderRadius:10,background:'var(--bg)',border:'1px solid var(--bd)',flex:'0 0 auto'}}>
<div style={{fontSize:9,fontWeight:600,color:c.color,opacity:.7,marginBottom:4,display:'flex',alignItems:'center',gap:4}}>
<span style={{width:5,height:5,borderRadius:'50%',background:c.color,opacity:.5}}/>{c.label}
</div>
<div style={{fontSize:18,fontWeight:800,color:c.color==='#fff'?'rgba(255,255,255,.9)':c.color}}>{c.value}</div>
</div>)}
</div>}

{/* Search */}
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={T('بحث في ','Search in ')+title+' ...'} style={{width:'100%',height:38,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.08)',borderRadius:10,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',textAlign:lang==='ar'?'right':'left',marginBottom:12}}/>

{/* Table */}
{loading?<div style={{textAlign:'center',padding:50,color:'var(--tx5)'}}>{T('جاري التحميل...','Loading...')}</div>:
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontFamily:F,fontSize:11}}>
<thead><tr style={{background:'rgba(255,255,255,.04)',borderBottom:'1px solid var(--bd)'}}>
{cols.map(([,l],i)=><th key={i} style={{padding:'10px 12px',textAlign:lang==='ar'?'right':'left',fontWeight:600,color:'var(--tx5)',fontSize:10,textTransform:'uppercase',letterSpacing:.5}}>{TL(l)}</th>)}
<th style={{padding:'10px',textAlign:'center',width:100,fontSize:10,fontWeight:600,color:'var(--tx5)'}}>{T('إجراءات','Actions')}</th></tr></thead>
<tbody>{filtered.length===0?<tr><td colSpan={cols.length+1} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.14)',fontSize:12}}>{T('لا توجد بيانات','No data found')}</td></tr>:
filtered.map(r=><tr key={r.id} onClick={()=>setViewRow(r)} style={{borderBottom:'1px solid rgba(255,255,255,.025)',cursor:'pointer',transition:'.1s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(201,168,76,.03)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
{cols.map(([c],j)=><td key={j} style={{padding:'10px 12px',fontWeight:600,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.includes('amount')||c.includes('salary')||c.includes('capital')?nm(r[c]):c.includes('status')||c==='nitaqat_color'||c==='priority'||c==='gender'?<B v={r[c]}/>:c==='is_active'||c==='is_system'?(r[c]?T('نعم','Yes'):T('لا','No')):String(r[c]??'—')}</td>)}
<td style={{padding:'8px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>openEdit(r)} style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',color:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 2px'}}><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#c9a84c' strokeWidth='1.8'><path d='M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z'/></svg></button>
<button onClick={()=>del(r.id)} style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(192,57,43,.1)',background:'rgba(192,57,43,.04)',color:C.red,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 2px'}}><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#c0392b' strokeWidth='1.8'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2'/></svg></button>
</td></tr>)}</tbody></table></div>}

{/* ═══ View Row Modal ═══ */}
{viewRow&&<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(700px,94vw)',maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.12)'}}>
<div style={{background:'var(--bg)',padding:'14px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(201,168,76,.12)'}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:C.gold}}>{(viewRow.name_ar||viewRow.worker_number||viewRow.client_number||viewRow.transaction_number||'#')?.[0]}</div>
<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{viewRow.name_ar||viewRow.transaction_number||viewRow.invoice_number||viewRow.expense_number||title}</div>
{viewRow.name_en&&<div style={{fontSize:10,color:'var(--tx4)',direction:'ltr'}}>{viewRow.name_en}</div>}</div>
</div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setViewRow(null);openEdit(viewRow)}} style={{height:30,padding:'0 14px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
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
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(660px,94vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid rgba(201,168,76,.12)'}}>
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
<button onClick={save} disabled={saving} style={{height:42,minWidth:140,padding:'0 22px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving?.7:1}}>{saving?T('جاري الحفظ...','Saving...'):pop==='add'?T('إضافة','Add'):T('حفظ','Save')}</button>
<button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}


function ReportPeriodicPage({sb,lang}){
const T=(a,e)=>lang==='ar'?a:e;const nm=v=>Number(v||0).toLocaleString('en-US')
const[tab,setTab]=useState('daily')
const[rpt,setRpt]=useState(null);const[daily,setDaily]=useState(null);const[weekly,setWeekly]=useState(null)
const[loading,setLoading]=useState(true)
const today=new Date().toISOString().slice(0,10)
const weekAgo=new Date(Date.now()-7*86400000).toISOString().slice(0,10)

useEffect(()=>{setLoading(true);Promise.all([
sb.from('monthly_report').select('*').then(({data})=>data?.[0]||null),
sb.from('daily_stats').select('*').eq('stat_date',today).maybeSingle().then(({data})=>data),
sb.from('daily_stats').select('*').gte('stat_date',weekAgo).order('stat_date').then(({data})=>data||[])
]).then(([m,d,w])=>{
setRpt(m);setDaily(d)
// Aggregate weekly from daily_stats
if(w.length>0){const agg={};['total_invoiced','total_collected','total_expenses','new_transactions','completed_transactions','new_workers','new_clients'].forEach(k=>{agg[k]=w.reduce((s,r)=>s+Number(r[k]||0),0)});agg.days=w.length;setWeekly(agg)}
setLoading(false)
})},[sb])

const fBtnS=a=>({padding:'8px 20px',borderRadius:8,fontSize:12,fontWeight:a?700:500,color:a?C.gold:'rgba(255,255,255,.4)',background:a?'rgba(201,168,76,.1)':'transparent',border:a?'1.5px solid rgba(201,168,76,.2)':'1.5px solid rgba(255,255,255,.08)',cursor:'pointer'})

const StatGrid=({items})=><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))',gap:10,marginBottom:16}}>
{items.map(([l,v,c],i)=><div key={i} style={{padding:'16px',borderRadius:12,background:c+'08',border:'1px solid '+c+'18'}}><div style={{fontSize:10,fontWeight:600,color:c,opacity:.7,marginBottom:8}}>{l}</div><div style={{fontSize:24,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.4,marginTop:2}}>{T('ريال','SAR')}</div></div>)}
</div>

const MiniGrid=({title,items})=><div style={{borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:'18px',marginBottom:14}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:14}}>{title}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(200px,100%),1fr))',gap:8}}>
{items.map(([l,v,c],i)=><div key={i} style={{padding:'10px',borderRadius:8,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.04)',textAlign:'center'}}><div style={{fontSize:8,color:'var(--tx5)',marginBottom:3}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:c}}>{v||0}</div></div>)}
</div></div>

const printReport=(title,data)=>{const w=window.open('','_blank');w.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><style>@import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap");*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Cairo",sans-serif;color:#222;padding:24px 32px;max-width:800px;margin:0 auto;font-size:11px}h1{font-size:18px;font-weight:800;color:#c9a84c;border-bottom:3px solid #c9a84c;padding-bottom:8px;margin-bottom:16px}h2{font-size:13px;font-weight:700;margin:14px 0 8px;color:#333}table{width:100%;border-collapse:collapse;margin-bottom:12px}th{background:#2c3e50;color:#fff;padding:8px;font-size:9px;border:1px solid #1a2836}td{padding:8px;border:1px solid #ddd;text-align:center;font-size:11px}tr:nth-child(even){background:#f9f9f9}.g{color:#27a046;font-weight:800}.r{color:#c0392b;font-weight:800}.y{color:#c9a84c;font-weight:800}.footer{margin-top:20px;font-size:8px;color:#bbb;text-align:center;border-top:2px solid #c9a84c;padding-top:8px}</style></head><body>');w.document.write('<h1>'+title+' — جسر للأعمال</h1>');if(data){w.document.write('<h2>المالية</h2><table><tr><th>المفوتر</th><th>المحصّل</th><th>المصروفات</th><th>الصافي</th></tr><tr><td class="y">'+nm(data.total_invoiced||data.invoiced_amount||0)+'</td><td class="g">'+nm(data.total_collected||data.collected_month||0)+'</td><td class="r">'+nm(data.total_expenses||data.expenses_month||0)+'</td><td class="'+((Number(data.total_collected||data.collected_month||0)-Number(data.total_expenses||data.expenses_month||0))>=0?'g':'r')+'">'+nm((Number(data.total_collected||data.collected_month||0))-(Number(data.total_expenses||data.expenses_month||0)))+'</td></tr></table>');w.document.write('<h2>المعاملات والعمالة</h2><table><tr><th>معاملات جديدة</th><th>مكتملة</th><th>عمال جدد</th><th>عملاء جدد</th></tr><tr><td class="y">'+(data.new_transactions||0)+'</td><td class="g">'+(data.completed_transactions||0)+'</td><td class="y">'+(data.new_workers||0)+'</td><td class="y">'+(data.new_clients||0)+'</td></tr></table>')}w.document.write('<div class="footer">جسر للأعمال — طُبعت بتاريخ '+new Date().toLocaleDateString('ar-SA')+'</div></body></html>');w.document.close();setTimeout(()=>w.print(),300)}

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>

return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('التقارير الدورية','Periodic Reports')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('تقارير يومية وأسبوعية وشهرية','Daily, weekly & monthly reports')}</div></div>
<button onClick={()=>printReport(tab==='daily'?'التقرير اليومي — '+today:tab==='weekly'?'التقرير الأسبوعي':rpt?'التقرير الشهري — '+rpt.month_key:'تقرير',tab==='daily'?daily:tab==='weekly'?weekly:rpt)} style={{height:36,padding:'0 14px',borderRadius:8,border:'1px solid rgba(155,89,182,.15)',background:'rgba(155,89,182,.06)',color:'#9b59b6',fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>{T('طباعة','Print')}</button>
</div>

{/* Tabs */}
<div style={{display:'flex',gap:6,marginBottom:20}}>
{[['daily',T('يومي','Daily'),'📅'],['weekly',T('أسبوعي','Weekly'),'📊'],['monthly',T('شهري','Monthly'),'📈']].map(([k,l,ico])=>
<div key={k} onClick={()=>setTab(k)} style={fBtnS(tab===k)}>{ico} {l}</div>)}
</div>

{/* DAILY */}
{tab==='daily'&&<div>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx3)',marginBottom:12}}>{T('تقرير اليوم','Today\'s Report')} — {today}</div>
{!daily?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد إحصائيات لليوم بعد — اضغط "تحديث أسبوعي" أو انتظر التحديث التلقائي','No stats for today yet')}</div>:<>
<StatGrid items={[[T('المفوتر','Invoiced'),nm(daily.total_invoiced||0),C.gold],[T('المحصّل','Collected'),nm(daily.total_collected||0),C.ok],[T('المصروفات','Expenses'),nm(daily.total_expenses||0),C.red],[T('الصافي','Net'),nm((daily.total_collected||0)-(daily.total_expenses||0)),(daily.total_collected||0)>=(daily.total_expenses||0)?C.ok:C.red]]}/>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
<MiniGrid title={T('المعاملات','Transactions')} items={[[T('جديدة','New'),daily.new_transactions,C.gold],[T('مكتملة','Done'),daily.completed_transactions,C.ok],[T('ملغاة','Cancel'),daily.cancelled_transactions,C.red]]}/>
<MiniGrid title={T('العمالة والعملاء','Workers & Clients')} items={[[T('عمال جدد','New Workers'),daily.new_workers,C.gold],[T('عملاء جدد','New Clients'),daily.new_clients,C.blue],[T('خطوات مكتملة','Steps'),daily.steps_completed,C.ok]]}/>
</div></>}
</div>}

{/* WEEKLY */}
{tab==='weekly'&&<div>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx3)',marginBottom:12}}>{T('تقرير الأسبوع','Weekly Report')} — {weekAgo} → {today}</div>
{!weekly?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد إحصائيات أسبوعية بعد','No weekly stats yet')}</div>:<>
<StatGrid items={[[T('المفوتر','Invoiced'),nm(weekly.total_invoiced||0),C.gold],[T('المحصّل','Collected'),nm(weekly.total_collected||0),C.ok],[T('المصروفات','Expenses'),nm(weekly.total_expenses||0),C.red],[T('الصافي','Net'),nm((weekly.total_collected||0)-(weekly.total_expenses||0)),(weekly.total_collected||0)>=(weekly.total_expenses||0)?C.ok:C.red]]}/>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:14}}>{weekly.days} {T('يوم مسجّل','days recorded')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
<MiniGrid title={T('المعاملات','Transactions')} items={[[T('جديدة','New'),weekly.new_transactions,C.gold],[T('مكتملة','Done'),weekly.completed_transactions,C.ok],[T('عمال جدد','Workers'),weekly.new_workers,C.blue]]}/>
<MiniGrid title={T('العملاء','Clients')} items={[[T('عملاء جدد','New'),weekly.new_clients,C.blue],[T('—','—'),0,'#666'],[T('—','—'),0,'#666']]}/>
</div></>}
</div>}

{/* MONTHLY */}
{tab==='monthly'&&<div>
{!rpt?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد بيانات شهرية','No monthly data')}</div>:<>
{(()=>{const profit=Number(rpt.net_profit_month);const profitClr=profit>=0?C.ok:C.red;return<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx3)'}}>{rpt.month_key}</div>
<div style={{padding:'6px 14px',borderRadius:8,background:profitClr+'10',border:'1px solid '+profitClr+'20',fontSize:12,fontWeight:800,color:profitClr}}>{T('صافي: ','Net: ')}{nm(profit)} {T('ريال','SAR')}</div>
</div>
<StatGrid items={[[T('المفوتر','Invoiced'),nm(rpt.invoiced_amount),C.gold],[T('المحصّل','Collected'),nm(rpt.collected_month),C.ok],[T('المصروفات','Expenses'),nm(rpt.expenses_month),C.red],[T('صافي الربح','Net'),nm(profit),profitClr]]}/>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
<MiniGrid title={T('المعاملات','Transactions')} items={[[T('جديدة','New'),rpt.new_transactions,C.gold],[T('مكتملة','Done'),rpt.completed_transactions,C.ok],[T('ملغاة','Cancel'),rpt.cancelled_transactions,C.red],[T('متأخرة','Overdue'),rpt.overdue_transactions,'#e67e22'],[T('خطوات','Steps'),rpt.steps_completed_month,C.ok],[T('مشاكل','Issues'),rpt.transactions_with_issues,C.red]]}/>
<MiniGrid title={T('العمالة والعملاء','Workers & Clients')} items={[[T('عمال جدد','New'),rpt.new_workers,C.gold],[T('نشطين','Active'),rpt.active_workers,C.ok],[T('هاربين','Abscond'),rpt.absconded_workers,C.red],[T('خروج/نقل','Exit'),rpt.exited_workers,'#999'],[T('عملاء جدد','Clients'),rpt.new_clients,C.blue],[T('عملاء نشطين','Active'),rpt.active_clients,C.ok]]}/>
</div>
{(rpt.facilities_at_risk>0||rpt.expired_permits>0||rpt.expired_iqamas>0)&&<div style={{borderRadius:14,background:'rgba(192,57,43,.03)',border:'1px solid rgba(192,57,43,.1)',padding:'18px'}}><div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:14}}>{T('تنبيهات','Alerts')}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(200px,100%),1fr))',gap:8}}>
{[[T('منشآت خطر','At Risk'),rpt.facilities_at_risk,C.red],[T('رخص منتهية','Permits'),rpt.expired_permits,C.red],[T('إقامات منتهية','Iqamas'),rpt.expired_iqamas,C.red],[T('رخص 30 يوم','30d Permits'),rpt.expiring_permits_30d,'#e67e22'],[T('إقامات 30 يوم','30d Iqamas'),rpt.expiring_iqamas_30d,'#e67e22'],[T('تأمين منتهي','Insurance'),rpt.expired_insurance,C.red]].filter(([,v])=>v>0).map(([l,v,c],i)=><div key={i} style={{padding:'10px 12px',borderRadius:8,background:c+'08',border:'1px solid '+c+'15',display:'flex',justifyContent:'space-between'}}><span style={{fontSize:11,fontWeight:600,color:c}}>{l}</span><span style={{fontSize:18,fontWeight:800,color:c}}>{v}</span></div>)}
</div></div>}
</>})()}</>}
</div>}
</div>}

function ReportPerformancePage({sb,lang}){
const T=(a,e)=>lang==='ar'?a:e;const nm=v=>Number(v||0).toLocaleString('en-US')
const[data,setData]=useState([])
useEffect(()=>{sb.from('employee_performance').select('*').then(({data})=>setData(data||[]))},[sb])
return<div>
<div style={{fontSize:22,fontWeight:800,color:'var(--tx)',marginBottom:6}}>{T('أداء الموظفين','Employee Performance')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginBottom:24}}>{T('تقرير شامل عن إنتاجية كل موظف','Comprehensive productivity report per employee')}</div>
{data.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)'}}>...</div>:
<div style={{display:'flex',flexDirection:'column',gap:14}}>
{data.map(p=><div key={p.user_id} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden'}}>
<div style={{padding:'16px 18px',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:52,height:52,borderRadius:14,background:'rgba(201,168,76,.1)',border:'1.5px solid rgba(201,168,76,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:C.gold,flexShrink:0}}>{(p.name_ar||'?')[0]}</div>
<div style={{flex:1}}><div style={{fontSize:17,fontWeight:700,color:'var(--tx)',marginBottom:3}}>{p.name_ar}</div><div style={{display:'flex',gap:8}}>{p.role_name&&<span style={{fontSize:10,color:C.gold,background:'rgba(201,168,76,.1)',padding:'2px 8px',borderRadius:5}}>{p.role_name}</span>}{p.branch_name&&<span style={{fontSize:10,color:'var(--tx5)'}}>{p.branch_name}</span>}</div></div>
<div style={{textAlign:'center',padding:'0 20px'}}><div style={{fontSize:32,fontWeight:900,color:Number(p.completion_rate)>=50?C.ok:C.red}}>{p.completion_rate}%</div><div style={{fontSize:9,color:'var(--tx5)'}}>{T('نسبة الإنجاز','Completion')}</div></div></div>
<div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',borderTop:'1px solid var(--bd2)',background:'rgba(255,255,255,.015)'}}>
{[[T('المعاملات','TXN'),p.total_transactions,C.gold],[T('مكتملة','Done'),p.completed_transactions,C.ok],[T('جارية','Active'),p.active_transactions,C.blue],[T('خطوات','Steps'),p.steps_completed,C.ok],[T('مشاكل','Issues'),p.steps_with_issues,C.red],[T('متوسط الوقت','Avg Time'),(Number(p.avg_step_duration)||0).toFixed(0)+T(' دق',' min'),'rgba(255,255,255,.5)']].map(([l,v,c],i)=><div key={i} style={{padding:'10px',textAlign:'center',borderLeft:i>0?'1px solid rgba(255,255,255,.03)':'none'}}><div style={{fontSize:8,color:'var(--tx5)',marginBottom:3}}>{l}</div><div style={{fontSize:15,fontWeight:800,color:c}}>{v||0}</div></div>)}
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))',borderTop:'1px solid rgba(255,255,255,.03)',background:'rgba(255,255,255,.01)'}}>
{[[T('إيرادات','Revenue'),nm(p.total_revenue)+' '+T('ر.س','SAR'),C.gold],[T('محصّل','Collected'),nm(p.collected_amount)+' '+T('ر.س','SAR'),C.ok],[T('عمال مضافين','Workers'),p.workers_added,C.blue],[T('عملاء مضافين','Clients'),p.clients_added,'#9b59b6']].map(([l,v,c],i)=><div key={i} style={{padding:'10px',textAlign:'center',borderLeft:i>0?'1px solid rgba(255,255,255,.03)':'none'}}><div style={{fontSize:8,color:'var(--tx6)',marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:c}}>{v||0}</div></div>)}
</div></div>)}
</div>}
</div>}

function ReportAlertsPage({sb,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[notifs,setNotifs]=useState([]);const[filter,setFilter]=useState('all');const[typeFilter,setTypeFilter]=useState('all');const[expanded,setExpanded]=useState({})
useEffect(()=>{sb.from('notifications_view').select('*').limit(500).then(({data})=>setNotifs(data||[]))},[sb])
const urgentCount=notifs.filter(n=>n.severity==='urgent').length
const warnCount=notifs.filter(n=>n.severity==='warning').length
const typeLabels={iqama_expired:T('إقامات منتهية','Expired Iqamas'),iqama_expiring:T('إقامات تنتهي قريباً','Expiring Iqamas'),task_overdue:T('مهام متأخرة','Overdue Tasks'),transaction_issue:T('معاملات بمشكلة','Issue Transactions'),invoice_overdue:T('فواتير متأخرة','Overdue Invoices'),passport_expiring:T('جوازات تنتهي','Expiring Passports')}
const typeIcons={iqama_expired:'🪪',iqama_expiring:'🪪',task_overdue:'📋',transaction_issue:'⚠️',invoice_overdue:'🧾',passport_expiring:'✈️'}
const typeColors={iqama_expired:C.red,iqama_expiring:'#e67e22',task_overdue:C.red,transaction_issue:C.red,invoice_overdue:'#e67e22',passport_expiring:'#e67e22'}
// Group by type
const groups={};notifs.forEach(n=>{if(!groups[n.type])groups[n.type]={items:[],severity:n.severity};groups[n.type].items.push(n)})
const filtered1=filter==='all'?notifs:notifs.filter(n=>n.severity===filter)
const filtered2=typeFilter==='all'?filtered1:filtered1.filter(n=>n.type===typeFilter)
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('التنبيهات الذكية','Smart Alerts')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('تنبيهات مُولّدة تلقائياً من بيانات النظام','Auto-generated alerts from system data')}</div></div>
<div style={{display:'flex',gap:6}}>
{[['all',T('الكل','All'),notifs.length,'rgba(255,255,255,.4)'],['urgent',T('عاجل','Urgent'),urgentCount,C.red],['warning',T('تحذير','Warning'),warnCount,'#e67e22']].map(([k,l,n,c])=><button key={k} onClick={()=>{setFilter(k);setTypeFilter('all')}} style={{height:34,padding:'0 14px',borderRadius:8,border:'1.5px solid '+(filter===k?c+'40':'rgba(255,255,255,.08)'),background:filter===k?c+'12':'transparent',color:filter===k?c:'rgba(255,255,255,.4)',fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>{l} <span style={{fontSize:10,fontWeight:700,background:c+'20',padding:'0 5px',borderRadius:4}}>{n}</span></button>)}
</div></div>
{/* Summary cards by type */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(200px,100%),1fr))',gap:10,marginBottom:18}}>
{Object.entries(groups).sort((a,b)=>b[1].items.length-a[1].items.length).map(([type,g])=>{const c=typeColors[type]||'#888';const isActive=typeFilter===type;return<div key={type} onClick={()=>setTypeFilter(isActive?'all':type)} style={{padding:'14px 16px',borderRadius:12,background:isActive?c+'12':c+'06',border:'1.5px solid '+(isActive?c+'30':c+'12'),cursor:'pointer',transition:'.2s'}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
<span style={{fontSize:18}}>{typeIcons[type]||'📌'}</span>
<span style={{fontSize:11,fontWeight:700,color:c}}>{typeLabels[type]||type}</span>
</div>
<div style={{fontSize:26,fontWeight:800,color:c}}>{g.items.length}</div>
<div style={{fontSize:9,color:c,opacity:.6}}>{g.severity==='urgent'?T('عاجل','Urgent'):T('تحذير','Warning')}</div>
</div>})}
</div>
{/* Alert for critical count */}
{urgentCount>0&&<div style={{padding:'12px 16px',borderRadius:10,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.15)',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
<span style={{fontSize:16}}>🚨</span>
<div style={{flex:1}}><span style={{fontSize:12,fontWeight:700,color:C.red}}>{urgentCount} {T('تنبيه عاجل يحتاج إجراء فوري','urgent alerts need immediate action')}</span></div>
</div>}
{/* Grouped list */}
{filtered2.length===0?<div style={{textAlign:'center',padding:60,color:'rgba(39,160,70,.5)'}}>
<div style={{fontSize:40,marginBottom:10}}>✅</div>
<div style={{fontSize:14,fontWeight:600,color:C.ok}}>{T('لا توجد تنبيهات من هذا النوع','No alerts of this type')}</div>
</div>:
typeFilter!=='all'?
/* Flat list when type is selected */
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{filtered2.slice(0,50).map((n,i)=>{const isU=n.severity==='urgent';const clr=isU?C.red:'#e67e22'
return<div key={i} style={{background:isU?'rgba(192,57,43,.03)':'rgba(255,255,255,.02)',border:'1px solid '+(isU?'rgba(192,57,43,.1)':'rgba(255,255,255,.06)'),borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
<span style={{fontSize:14}}>{typeIcons[n.type]||'📌'}</span>
<div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{n.title}</div><div style={{fontSize:10,color:'var(--tx4)',marginTop:1}}>{lang==='ar'?n.message_ar:n.message_en}</div></div>
<span style={{fontSize:9,fontWeight:700,color:clr,background:clr+'15',padding:'3px 8px',borderRadius:5}}>{isU?T('عاجل','Urgent'):T('تحذير','Warning')}</span>
</div>})}
{filtered2.length>50&&<div style={{textAlign:'center',padding:10,color:'var(--tx5)',fontSize:10}}>+{filtered2.length-50} {T('تنبيه آخر','more alerts')}</div>}
</div>:
/* Grouped view when "all" */
<div style={{display:'flex',flexDirection:'column',gap:12}}>
{Object.entries(groups).sort((a,b)=>b[1].items.length-a[1].items.length).map(([type,g])=>{const c=typeColors[type]||'#888';const isOpen=expanded[type];const items=g.items.filter(n=>filter==='all'||n.severity===filter)
if(items.length===0)return null
return<div key={type} style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,overflow:'hidden'}}>
<div onClick={()=>setExpanded(p=>({...p,[type]:!isOpen}))} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',cursor:'pointer',background:c+'04'}}>
<span style={{fontSize:16}}>{typeIcons[type]||'📌'}</span>
<span style={{fontSize:12,fontWeight:700,color:c,flex:1}}>{typeLabels[type]||type}</span>
<span style={{fontSize:14,fontWeight:800,color:c}}>{items.length}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{transform:isOpen?'rotate(90deg)':'',transition:'.2s'}}><polyline points="9 6 15 12 9 18" stroke={c} strokeWidth="2.5"/></svg>
</div>
{isOpen&&<div style={{padding:'4px 8px 8px'}}>
{items.slice(0,20).map((n,i)=><div key={i} style={{padding:'8px 12px',borderBottom:i<Math.min(items.length,20)-1?'1px solid var(--bd2)':'none',fontSize:11,color:'var(--tx3)'}}>{lang==='ar'?n.message_ar:n.message_en}</div>)}
{items.length>20&&<div style={{padding:'8px 12px',fontSize:10,color:'var(--tx5)',textAlign:'center'}}>+{items.length-20} {T('تنبيه آخر','more')}</div>}
</div>}
</div>})}
</div>}
</div>}

function TransferCalcPage({sb,toast,user,lang,onNewCalc}){
const T=(a,e)=>lang==='ar'?a:e;const nm=v=>Number(v||0).toLocaleString('en-US')
const[data,setData]=useState([]);const[workers,setWorkers]=useState([]);const[facilities,setFacilities]=useState([])
const[pop,setPop]=useState(false);const[form,setForm]=useState({});const[saving,setSaving]=useState(false);const[viewRow,setViewRow]=useState(null);const[wizStep,setWizStep]=useState(0);const[workerMode,setWorkerMode]=useState('existing')
useEffect(()=>{Promise.all([sb.from('worker_transfers').select('*,workers:worker_id(name_ar,iqama_number),facilities:facility_id(name_ar)').is('deleted_at',null).order('created_at',{ascending:false}),sb.from('workers').select('id,name_ar').is('deleted_at',null),sb.from('facilities').select('id,name_ar').is('deleted_at',null)]).then(([t,w,f])=>{setData(t.data||[]);setWorkers(w.data||[]);setFacilities(f.data||[])})},[sb])
const stClr={draft:'#999',pending:C.gold,approved:C.blue,completed:C.ok,cancelled:C.red}
const save=async()=>{setSaving(true);try{const d={...form};const id=d._id;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null;if(['visa_cost','iqama_cost','work_permit_cost','insurance_cost','ticket_cost','gosi_cost','government_fees','other_costs','transfer_fee','client_charge'].includes(k)&&d[k]!=null)d[k]=Number(d[k])})
if(id){d.updated_by=user?.id;await sb.from('worker_transfers').update(d).eq('id',id)}else{d.created_by=user?.id;await sb.from('worker_transfers').insert(d)}
toast(T('تم الحفظ','Saved'));setPop(false);const{data:r}=await sb.from('worker_transfers').select('*,workers:worker_id(name_ar,iqama_number),facilities:facility_id(name_ar)').is('deleted_at',null).order('created_at',{ascending:false});setData(r||[])}catch(e){toast('خطأ: '+e.message?.slice(0,60))}setSaving(false)}
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
client_charge:'',status:'draft',new_employer_name:'',notes:''});setWizStep(0);setWorkerMode('existing');setPop(true)}
const openEdit=r=>{const f={_id:r.id};['worker_id','facility_id','transfer_type','visa_cost','iqama_cost','work_permit_cost','insurance_cost','ticket_cost','gosi_cost','government_fees','other_costs','other_costs_desc','transfer_fee','client_charge','status','new_employer_name','notes'].forEach(k=>f[k]=r[k]??'');setPop(true);setForm(f)}
const totalCost=()=>{let t=0;['transfer_fee','iqama_cost','iqama_fine','insurance_cost','work_permit_cost','occupation_change_cost','office_fee','extra_fee_amount'].forEach(k=>t+=Number(form[k])||0);t-=Number(form.absher_balance)||0;return Math.max(t,0)}
const profit=()=>(Number(form.client_charge)||0)-totalCost()
const printCalc=(r)=>{const w=window.open('','_blank');const tc=Number(r.total_cost||0);const cc=Number(r.client_charge||0);const pr=cc-tc
w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Cairo',sans-serif;color:#222;font-size:12px;max-width:800px;margin:0 auto;padding:24px 32px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.office-name{font-size:20px;font-weight:800;color:#333}.office-addr{font-size:10px;color:#666;line-height:1.8}
.branch-bar{background:#2c3e50;color:#fff;text-align:center;padding:6px;border-radius:6px;margin-bottom:14px;font-size:12px;font-weight:700}
.section{margin-bottom:14px}.section-title{font-size:13px;font-weight:700;color:#333;padding:6px 0;border-bottom:2px solid #c9a84c;margin-bottom:8px;display:flex;align-items:center;gap:6px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
th{background:#4a6fa5;color:#fff;padding:8px 10px;font-size:9px;font-weight:700;border:1px solid #3d5d8f;text-align:center}
td{padding:8px 10px;font-size:11px;border:1px solid #ddd;text-align:center}
tr:nth-child(even){background:#f8f8f8}
.fee-table th{background:#d4a843;border-color:#c19530}.fee-table td{font-weight:700}
.total-table th{background:#2c3e50}.total-row{background:#f0ede4!important}
.total-big{font-size:16px;font-weight:900;color:#333}
.green{color:#27a046}.red{color:#c0392b}.gold{color:#c9a84c}
.notice{background:#fff8e1;border:1px solid #f0d36e;border-radius:6px;padding:8px 12px;font-size:9px;color:#8a6d00;margin-top:14px;text-align:center}
.footer{margin-top:16px;padding-top:8px;border-top:2px solid #c9a84c;font-size:8px;color:#aaa;text-align:center}
.pwa-standalone .dash-header{padding-top:env(safe-area-inset-top)!important}.pwa-standalone .mob-bottom-nav{padding-bottom:max(env(safe-area-inset-bottom),12px)!important;height:calc(70px + env(safe-area-inset-bottom))!important}.pwa-standalone .dash-side{padding-top:env(safe-area-inset-top)!important}.pwa-standalone .login-wrap,.pwa-standalone .setup-wrap{padding-top:env(safe-area-inset-top)!important}.install-banner{animation:slideUp .4s cubic-bezier(.4,0,.2,1)}@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.mob-bottom-nav div{transition:transform .15s ease,opacity .15s ease!important}.mob-bottom-nav div:active{transform:scale(.9)!important;opacity:.7!important}@media(max-width:768px){.dash-header{backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important}.dash-content{scroll-behavior:smooth!important;-webkit-overflow-scrolling:touch!important}}@media print{body{padding:16px}}
</style></head><body>
<div class="header">
<div class="header-r"><div class="office-name">مؤسسة تأشيرة البناء والإنشاء للمقاولات</div><div class="office-addr">خدمات مكاتب الاستقدام<br>المملكة العربية السعودية</div></div>
<div style="text-align:center"><div style="font-size:32px;color:#c9a84c;font-weight:900">جسر</div><div style="font-size:9px;color:#999">Jisr Business</div></div>
<div style="text-align:left;direction:ltr;font-size:10px;color:#666">${new Date().toLocaleDateString('en-US')}</div>
</div>
<div class="branch-bar">نقل كفالة — Sponsorship Transfer</div>
<div class="section"><div class="section-title">تفاصيل الطلب — Order Details</div>
<table><thead><tr><th>الاسم<br>Name</th><th>رقم الإقامة<br>Iqama No</th><th>المنشأة<br>Facility</th><th>صاحب العمل الجديد<br>New Employer</th></tr></thead>
<tbody><tr><td style="font-weight:700">${r.workers?.name_ar||'—'}</td><td style="direction:ltr">${r.workers?.iqama_number||'—'}</td><td>${r.facilities?.name_ar||'—'}</td><td>${r.new_employer_name||'—'}</td></tr></tbody></table></div>
<div class="section"><div class="section-title">تفاصيل الرسوم — Fee Details</div>
<table class="fee-table"><thead><tr><th>النقل<br>Transfer</th><th>تجديد الإقامة<br>Iqama Renewal</th><th>كرت العمل<br>Work Permit</th><th>التأمين الصحي<br>Health Insurance</th><th>التأمينات<br>GOSI</th><th>رسوم حكومية<br>Gov Fees</th></tr></thead>
<tbody><tr><td>${nm(r.visa_cost||0)}</td><td>${nm(r.iqama_cost||0)}</td><td>${nm(r.work_permit_cost||0)}</td><td>${nm(r.insurance_cost||0)}</td><td>${nm(r.gosi_cost||0)}</td><td>${nm(r.government_fees||0)}</td></tr></tbody></table></div>
${Number(r.ticket_cost)>0||Number(r.other_costs)>0?'<table><thead><tr><th>التذكرة — Ticket</th><th>تكاليف أخرى — Other</th><th>وصف — Description</th></tr></thead><tbody><tr><td>'+nm(r.ticket_cost||0)+'</td><td>'+nm(r.other_costs||0)+'</td><td>'+(r.other_costs_desc||'—')+'</td></tr></tbody></table>':''}
<table class="total-table"><thead><tr><th>تكاليف المكتب<br>Office Cost</th><th>رسوم النقل<br>Transfer Fee</th><th>المجموع النهائي<br>Final Total</th></tr></thead>
<tbody><tr class="total-row"><td class="gold" style="font-size:14px;font-weight:800">${nm(tc)}</td><td>${nm(r.transfer_fee||0)}</td><td class="total-big">${nm(cc)}</td></tr></tbody></table>
<div style="display:flex;justify-content:center;gap:20px;margin:16px 0;padding:12px;background:#f8f6f0;border-radius:8px">
<div style="text-align:center"><div style="font-size:9px;color:#888">إجمالي التكلفة</div><div style="font-size:18px;font-weight:900;color:#c0392b">${nm(tc)} ريال</div></div>
<div style="text-align:center"><div style="font-size:9px;color:#888">المطلوب من العميل</div><div style="font-size:18px;font-weight:900;color:#c9a84c">${nm(cc)} ريال</div></div>
<div style="text-align:center"><div style="font-size:9px;color:#888">الربح</div><div style="font-size:18px;font-weight:900;color:${pr>=0?'#27a046':'#c0392b'}">${nm(pr)} ريال</div></div>
</div>
${r.notes?'<div style="background:#f0f0f0;border-radius:6px;padding:8px 12px;font-size:10px;color:#555;margin-bottom:10px"><b>ملاحظات:</b> '+r.notes+'</div>':''}
<div class="notice">إشعار هام: المكتب غير مسؤول عن أي مدفوعات بدون فاتورة رسمية. يجب على العميل طلب فاتورة لجميع تعاملاته<br>Important Notice: Office not responsible for payments without official invoice</div>
<div class="footer">جسر للأعمال — طُبعت بتاريخ ${new Date().toLocaleDateString('ar-SA')}</div>
</body></html>`);w.document.close();setTimeout(()=>w.print(),300)}
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center',direction:'ltr'}
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('حسبة التنازل','Transfer Calculator')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('حساب تكاليف نقل خدمات العمال','Worker transfer cost calculation')}</div></div><button onClick={()=>onNewCalc?onNewCalc():openAdd()} style={{height:38,padding:'0 20px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer'}}>+ {T('حسبة جديدة','New Calc')}</button></div>
{(()=>{
const statusLabel={draft:T('مسودة','Draft'),pending:T('قيد الانتظار','Pending'),approved:T('مقبولة','Approved'),completed:T('مكتملة','Done'),cancelled:T('ملغاة','Cancelled')}
const typeLabel=v=>v==='final_exit'?T('خروج نهائي','Final Exit'):T('نقل كفالة','Sponsorship')
const[listFilter,setListFilter]=useState('all')
const filteredData=listFilter==='all'?data:data.filter(r=>r.status===listFilter)
const daysSince=d=>{if(!d)return 0;return Math.floor((Date.now()-new Date(d).getTime())/86400000)}
return<>
{/* Filter bar */}
<div style={{display:'flex',gap:4,marginBottom:14}}>
{[{v:'all',l:T('الكل','All'),n:data.length},{v:'pending',l:T('قيد الانتظار','Pending'),n:data.filter(r=>r.status==='pending').length},{v:'completed',l:T('مكتمل','Done'),n:data.filter(r=>r.status==='completed').length},{v:'draft',l:T('مسودة','Draft'),n:data.filter(r=>r.status==='draft').length}].map(f=><button key={f.v} onClick={()=>setListFilter(f.v)} style={{padding:'6px 14px',borderRadius:8,fontSize:10,fontWeight:listFilter===f.v?700:500,color:listFilter===f.v?C.gold:'rgba(255,255,255,.35)',background:listFilter===f.v?'rgba(201,168,76,.08)':'transparent',border:listFilter===f.v?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',fontFamily:"'Cairo',sans-serif"}}>{f.l} ({f.n})</button>)}
</div>
{filteredData.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)'}}>{T('لا توجد حسبات','No calculations')}</div>:
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:12}}>{filteredData.map(r=>{const sc=stClr[r.status]||'#999';const tc=Number(r.total_cost||0);const cc=Number(r.client_charge||0);const pr=cc-tc;const prPct=tc>0?Math.round((pr/tc)*100):0;const ds=daysSince(r.created_at)
return<div key={r.id} onClick={()=>openEdit(r)} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.15)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}>
<div style={{padding:'16px 18px',display:'flex',alignItems:'center',gap:12}}>
<div style={{width:44,height:44,borderRadius:12,background:sc+'15',border:'1px solid '+sc+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{r.transfer_type==='final_exit'?'↗':'⟲'}</div>
<div style={{flex:1}}>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx2)',marginBottom:2}}>{r.workers?.name_ar||T('عامل','Worker')}</div>
<div style={{fontSize:9,color:'var(--tx6)',marginBottom:4}}>{r.created_at?new Date(r.created_at).toLocaleDateString('ar-SA',{day:'numeric',month:'short',year:'numeric'}):''}{r.status==='pending'&&ds>0?<span style={{color:'#e67e22',marginRight:6}}> — {T('منذ','since')} {ds} {T('يوم','days')}</span>:''}</div>
<div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
<span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:5,background:sc+'15',color:sc}}>{statusLabel[r.status]||r.status}</span>
<span style={{fontSize:9,fontWeight:500,padding:'2px 6px',borderRadius:4,background:'rgba(255,255,255,.04)',color:'var(--tx5)'}}>{typeLabel(r.transfer_type)}</span>
{r.new_employer_name&&<span style={{fontSize:10,color:'var(--tx5)'}}>{T('←','→')} {r.new_employer_name}</span>}
</div>
</div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderTop:'1px solid var(--bd2)',background:'rgba(255,255,255,.015)'}}>
{[[T('التكلفة','Cost'),nm(tc),C.red],[T('المطلوب','Charge'),nm(cc),C.gold],[T('الربح','Profit'),nm(pr)+' ('+prPct+'%)',pr>=0?C.ok:C.red]].map(([l,v,c],i)=><div key={i} style={{padding:'10px',textAlign:'center',borderLeft:i>0?'1px solid rgba(255,255,255,.03)':'none'}}><div style={{fontSize:8,color:'var(--tx6)',marginBottom:3}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div></div>)}
</div>
<div style={{display:'flex',gap:4,padding:'8px 12px',borderTop:'1px solid var(--bd2)',justifyContent:'center'}}>
<button onClick={e=>{e.stopPropagation();printCalc(r)}} style={{height:28,padding:'0 12px',borderRadius:6,border:'1px solid rgba(155,89,182,.15)',background:'rgba(155,89,182,.06)',color:'#9b59b6',fontFamily:"'Cairo',sans-serif",fontSize:9,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>{T('طباعة','Print')}</button>
<button onClick={e=>{e.stopPropagation();openEdit(r)}} style={{height:28,padding:'0 12px',borderRadius:6,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:9,fontWeight:700,cursor:'pointer'}}>{T('تعديل','Edit')}</button>
</div></div>})}</div>}
</>})()}
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

return<div onClick={()=>setPop(false)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(840px,95vw)',height:'88vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.15)'}}>
{/* Header */}
<div style={{background:'var(--bg)',padding:'14px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(201,168,76,.12)',flexShrink:0}}>
<div><div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>{form._id?T('تعديل الحسبة','Edit'):T('حسبة تنازل جديدة','New Transfer Calc')}</div></div>
<div style={{display:'flex',gap:6}}>
<button onClick={save} disabled={saving} style={{height:34,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
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
<div style={{display:'flex',gap:0,marginBottom:16,borderRadius:10,overflow:'hidden',border:'1.5px solid rgba(201,168,76,.2)'}}>
{[{v:'existing',l:T('عامل مسجّل','Existing Worker')},{v:'new',l:T('عامل جديد','New Worker')}].map(o=><button key={o.v} onClick={()=>setWorkerMode(o.v)} style={{flex:1,height:42,border:'none',background:workerMode===o.v?'rgba(201,168,76,.12)':'rgba(255,255,255,.02)',color:workerMode===o.v?C.gold:'var(--tx5)',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:workerMode===o.v?700:500,cursor:'pointer'}}>{o.l}</button>)}
</div>

{workerMode==='existing'?<div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><LBL t={T('العامل','Worker')} r/><SEL k="worker_id" opts={workers.map(w=>({v:w.id,l:w.name_ar}))} ph={T('اختر العامل','Select worker')}/></div>
<div><LBL t={T('المنشأة الحالية','Current Facility')} r/><SEL k="facility_id" opts={facilities.map(f=>({v:f.id,l:f.name_ar}))}/></div>
</div>
{selWorker&&<div style={{marginTop:12,padding:'14px',borderRadius:10,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)',fontSize:13,fontWeight:700,color:'var(--tx)'}}>{selWorker.name_ar}</div>}
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
<div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:14}}>{T('تفاصيل إضافية','Additional Details')}</div>
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
<div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:16}}>{T('تفاصيل عملية النقل والرسوم التلقائية','Transfer Details & Auto Fees')}</div>
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
<div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:16}}>{T('ملخص التكاليف','Cost Summary')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
{[['transfer_fee',T('رسوم النقل','Transfer Fee'),true],['iqama_cost',T('تجديد الإقامة','Iqama Renewal'),true],['iqama_fine',T('غرامة التأخير','Delay Fine'),true],['insurance_cost',T('التأمين الطبي','Health Insurance')],['work_permit_cost',T('رخصة العمل','Work Permit')],['occupation_change_cost',T('تغيير المهنة','Occupation Change'),true],['office_fee',T('رسوم المكتب','Office Fee')],['absher_balance',T('رصيد أبشر (خصم)','Absher Balance (deduct)')]].map(([k,l,auto])=><div key={k} style={{background:auto?'rgba(201,168,76,.03)':'rgba(255,255,255,.02)',borderRadius:10,padding:'10px 14px',border:'1px solid '+(auto?'rgba(201,168,76,.08)':'rgba(255,255,255,.04)')}}>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:6,display:'flex',justifyContent:'space-between'}}><span>{l}</span>{auto&&<span style={{fontSize:8,color:C.gold}}>{T('تلقائي','Auto')}</span>}</div>
<input value={form[k]||''} onChange={e=>setF(k,e.target.value)} style={{...fS,height:38,fontSize:14,fontWeight:700}} type="number"/></div>)}
</div>
{/* Extra fee */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16,padding:'12px',borderRadius:10,border:'1px dashed rgba(255,255,255,.08)'}}>
<div><LBL t={T('اسم رسوم إضافية','Extra Fee Name')}/><INP k="extra_fee_name"/></div>
<div><LBL t={T('المبلغ','Amount')}/><input value={form.extra_fee_amount||''} onChange={e=>setF('extra_fee_amount',e.target.value)} style={{...fS,height:42}} type="number"/></div>
</div>
{/* Totals */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,padding:'18px',borderRadius:14,background:'rgba(201,168,76,.04)',border:'1.5px solid rgba(201,168,76,.12)'}}>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.red,marginBottom:6}}>{T('إجمالي التكلفة','Total Cost')}</div><div style={{fontSize:26,fontWeight:900,color:C.red}}>{nm(totalCost())}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.gold,marginBottom:6}}>{T('المطلوب من العميل','Client Charge')}</div><input value={form.client_charge||''} onChange={e=>setF('client_charge',e.target.value)} style={{...fS,height:42,fontSize:18,fontWeight:800,color:C.gold,background:'rgba(201,168,76,.08)',border:'1.5px solid rgba(201,168,76,.25)'}} type="number"/></div>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:profit()>=0?C.ok:C.red,marginBottom:6}}>{T('الربح','Profit')}</div><div style={{fontSize:26,fontWeight:900,color:profit()>=0?C.ok:C.red}}>{nm(profit())}</div></div>
</div>
</div>}

{/* ═══ Step 4: الملخص ═══ */}
{wizStep===3&&<div>
<div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:16}}>{T('ملخص الحسبة','Calculation Summary')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
{[[T('العامل','Worker'),selWorker?.name_ar||form.w_name||'—'],[T('نوع النقل','Type'),form.transfer_type==='final_exit'?T('خروج نهائي','Final Exit'):T('نقل كفالة','Sponsorship')],[T('صاحب العمل الجديد','New Employer'),form.new_employer_name||'—'],[T('الحالة','Status'),form.status],[T('تعديل مهنة','Occ. Change'),form.wants_occupation_change?T('نعم — ','Yes — ')+form.new_occupation:T('لا','No')],[T('موافقة صاحب العمل','Employer Consent'),form.employer_consent?T('نعم','Yes'):T('لا','No')]].map(([l,v],i)=><div key={i} style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.04)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{v}</div></div>)}
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,padding:'18px',borderRadius:14,background:'rgba(201,168,76,.04)',border:'1.5px solid rgba(201,168,76,.12)',marginBottom:16}}>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.red,marginBottom:4}}>{T('التكلفة','Cost')}</div><div style={{fontSize:24,fontWeight:900,color:C.red}}>{nm(totalCost())}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:C.gold,marginBottom:4}}>{T('المطلوب','Charge')}</div><div style={{fontSize:24,fontWeight:900,color:C.gold}}>{nm(Number(form.client_charge)||0)}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:10,color:profit()>=0?C.ok:C.red,marginBottom:4}}>{T('الربح','Profit')}</div><div style={{fontSize:24,fontWeight:900,color:profit()>=0?C.ok:C.red}}>{nm(profit())}</div></div>
</div>
<div><LBL t={T('ملاحظات','Notes')}/><textarea value={form.notes||''} onChange={e=>setF('notes',e.target.value)} rows={3} style={{...fS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/></div>
</div>}

</div>
{/* Footer */}
<div style={{padding:'12px 24px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexShrink:0}}>
<button onClick={()=>wizStep>0?setWizStep(wizStep-1):setPop(false)} style={{height:40,padding:'0 18px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx3)',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,cursor:'pointer'}}>{wizStep>0?T('السابق','Back'):T('إلغاء','Cancel')}</button>
{wizStep<steps.length-1?<button onClick={()=>setWizStep(wizStep+1)} style={{height:40,padding:'0 18px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer'}}>{T('التالي','Next')}</button>:
<button onClick={save} disabled={saving} style={{height:40,padding:'0 22px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.15)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>}
</div>
</div></div>})()}
</div>}

function AuditPage({sb,toast,user,lang,branchId}){
const T=(a,e)=>lang==='ar'?a:e;const nm=v=>Number(v||0).toLocaleString('en-US')
const[data,setData]=useState([]);const[filter,setFilter]=useState('all');const[uploading,setUploading]=useState(false)
const reload=()=>{let q=sb.from('bank_reconciliation').select('*').is('deleted_at',null);if(branchId)q=q.eq('branch_id',branchId);q.order('transaction_date',{ascending:false}).then(({data})=>setData(data||[]))}
useEffect(()=>{reload()},[sb])
const filtered=filter==='all'?data:data.filter(r=>r.match_status===filter)
const stClr={pending:C.gold,matched:C.ok,unmatched:C.red,disputed:'#e67e22'}
const typIco={deposit:'↓',withdrawal:'↑',transfer_in:'⇩',transfer_out:'⇧'}
const matchIt=async(id,status)=>{await sb.from('bank_reconciliation').update({match_status:status,matched_at:new Date().toISOString(),matched_by:user?.id}).eq('id',id);toast(T('تم التحديث','Updated'));reload()}
const totalDeposits=data.filter(r=>r.transaction_type==='deposit'||r.transaction_type==='transfer_in').reduce((s,r)=>s+Number(r.amount||0),0)
const totalWithdrawals=data.filter(r=>r.transaction_type==='withdrawal'||r.transaction_type==='transfer_out').reduce((s,r)=>s+Number(r.amount||0),0)
// CSV Upload
const handleUpload=async(e)=>{const file=e.target.files?.[0];if(!file)return;setUploading(true);try{
const text=await file.text();const lines=text.split('\n').filter(l=>l.trim());if(lines.length<2){toast(T('الملف فارغ','Empty file'));setUploading(false);return}
const headers=lines[0].split(',').map(h=>h.trim().replace(/"/g,'').toLowerCase())
const dateIdx=headers.findIndex(h=>h.includes('date')||h.includes('تاريخ'))
const amtIdx=headers.findIndex(h=>h.includes('amount')||h.includes('مبلغ')||h.includes('credit')||h.includes('debit'))
const descIdx=headers.findIndex(h=>h.includes('desc')||h.includes('وصف')||h.includes('narr'))
const refIdx=headers.findIndex(h=>h.includes('ref')||h.includes('مرجع'))
let inserted=0
for(let i=1;i<lines.length;i++){const cols=lines[i].split(',').map(c=>c.trim().replace(/"/g,''));if(cols.length<2)continue
const amt=parseFloat((cols[amtIdx]||cols[1]||'0').replace(/[^0-9.-]/g,''));if(!amt||isNaN(amt))continue
const desc=descIdx>=0?cols[descIdx]:cols[2]||''
const dateStr=dateIdx>=0?cols[dateIdx]:cols[0]||new Date().toISOString().slice(0,10)
const ref=refIdx>=0?cols[refIdx]:''
await sb.from('bank_reconciliation').insert({transaction_date:dateStr,amount:Math.abs(amt),transaction_type:amt>=0?'deposit':'withdrawal',description:desc,reference_number:ref,match_status:'pending',bank_name:file.name.replace(/\.[^.]+$/,''),created_by:user?.id})
inserted++}
toast(T('تم استيراد '+inserted+' عملية','Imported '+inserted+' rows'));reload()
}catch(err){toast(T('خطأ في القراءة','Parse error'))}setUploading(false);e.target.value=''}
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('التدقيق المالي','Financial Audit')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('مطابقة كشف البنك مع العمليات','Bank statement reconciliation')}</div></div>
<label style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(52,131,180,.2)',background:'rgba(52,131,180,.08)',color:C.blue,fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
{uploading?'...':T('رفع كشف البنك (CSV)','Upload Bank CSV')}
<input type="file" accept=".csv,.txt" onChange={handleUpload} style={{display:'none'}}/>
</label>
</div>
{/* Summary with match percentage */}
{(()=>{const matchedCount=data.filter(r=>r.match_status==='matched').length;const matchPct=data.length>0?Math.round(matchedCount/data.length*100):0;const pendingCount=data.filter(r=>r.match_status==='pending').length;const unmatchedCount=data.filter(r=>r.match_status==='unmatched').length
// Duplicate detection
const amounts=data.map(r=>r.amount);const dupAmounts=amounts.filter((a,i)=>amounts.indexOf(a)!==i&&a>0);const hasDuplicates=dupAmounts.length>0
return<>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
<div style={{padding:'12px 16px',borderRadius:12,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)',textAlign:'center'}}>
<div style={{fontSize:9,color:C.ok,marginBottom:4}}>{T('إيداعات','Deposits')}</div><div style={{fontSize:20,fontWeight:800,color:C.ok}}>{nm(totalDeposits)}</div></div>
<div style={{padding:'12px 16px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.1)',textAlign:'center'}}>
<div style={{fontSize:9,color:C.red,marginBottom:4}}>{T('مسحوبات','Withdrawals')}</div><div style={{fontSize:20,fontWeight:800,color:C.red}}>{nm(totalWithdrawals)}</div></div>
<div style={{padding:'12px 16px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)',textAlign:'center'}}>
<div style={{fontSize:9,color:C.gold,marginBottom:4}}>{T('الصافي','Net')}</div><div style={{fontSize:20,fontWeight:800,color:C.gold}}>{nm(totalDeposits-totalWithdrawals)}</div></div>
<div style={{padding:'12px 16px',borderRadius:12,background:matchPct>=80?'rgba(39,160,70,.06)':matchPct>=50?'rgba(230,126,34,.06)':'rgba(192,57,43,.06)',border:'1px solid '+(matchPct>=80?'rgba(39,160,70,.1)':matchPct>=50?'rgba(230,126,34,.1)':'rgba(192,57,43,.1)'),textAlign:'center'}}>
<div style={{fontSize:9,color:matchPct>=80?C.ok:matchPct>=50?'#e67e22':C.red,marginBottom:4}}>{T('نسبة المطابقة','Match Rate')}</div>
<div style={{fontSize:20,fontWeight:800,color:matchPct>=80?C.ok:matchPct>=50?'#e67e22':C.red}}>{matchPct}%</div>
<div style={{height:3,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden',marginTop:6}}><div style={{height:'100%',width:matchPct+'%',borderRadius:2,background:matchPct>=80?C.ok:matchPct>=50?'#e67e22':C.red}}/></div>
</div>
</div>
{/* Duplicate alert */}
{hasDuplicates&&<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(230,126,34,.06)',border:'1px solid rgba(230,126,34,.15)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:14}}>⚠️</span>
<span style={{fontSize:10,color:'#e67e22',fontWeight:600}}>{T('يوجد حركات بمبالغ مكررة — تحقق من الحركات المحتملة','Duplicate amounts detected — verify possible duplicate transactions')}</span>
</div>}
{/* Filter cards */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
{[['all',T('الكل','All'),data.length,'rgba(255,255,255,.4)'],['pending',T('بانتظار المراجعة','Pending'),pendingCount,C.gold],['matched',T('مطابقة','Matched'),matchedCount,C.ok],['unmatched',T('غير مطابقة','Unmatched'),unmatchedCount,C.red]].map(([k,l,n,c])=><div key={k} onClick={()=>setFilter(k)} style={{padding:'14px',borderRadius:12,background:filter===k?c+'12':'rgba(255,255,255,.02)',border:'1.5px solid '+(filter===k?c+'30':'rgba(255,255,255,.06)'),cursor:'pointer',textAlign:'center'}}><div style={{fontSize:22,fontWeight:900,color:c,marginBottom:4}}>{n}</div><div style={{fontSize:10,fontWeight:600,color:c,opacity:.7}}>{l}</div></div>)}
</div>
</>})()}
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{filtered.map(r=>{const sc=stClr[r.match_status]||'#999';return<div key={r.id} style={{background:'var(--bg)',border:'1px solid '+(r.match_status==='unmatched'?'rgba(192,57,43,.15)':'rgba(255,255,255,.06)'),borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:42,height:42,borderRadius:12,background:(r.transaction_type.includes('out')||r.transaction_type==='withdrawal'?C.red:C.ok)+'12',border:'1px solid '+(r.transaction_type.includes('out')||r.transaction_type==='withdrawal'?C.red:C.ok)+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{typIco[r.transaction_type]||'▦'}</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{r.description||T('عملية','Transaction')}</span><span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:5,background:sc+'15',color:sc}}>{r.match_status==='pending'?T('بانتظار','Pending'):r.match_status==='matched'?T('مطابقة','Matched'):r.match_status==='unmatched'?T('غير مطابقة','Unmatched'):r.match_status==='disputed'?T('متنازع','Disputed'):r.match_status}</span></div>
<div style={{display:'flex',gap:10,fontSize:10,color:'var(--tx4)'}}><span style={{direction:'ltr'}}>{r.transaction_date}</span>{r.reference_number&&<span>{r.reference_number}</span>}{r.bank_name&&<span>{r.bank_name}</span>}</div>
</div>
<div style={{fontSize:18,fontWeight:800,color:(r.transaction_type.includes('out')||r.transaction_type==='withdrawal')?C.red:C.ok,direction:'ltr',flexShrink:0}}>{(r.transaction_type.includes('out')||r.transaction_type==='withdrawal')?'-':'+'}{nm(r.amount)}</div>
{r.match_status==='pending'&&<div style={{display:'flex',gap:4,flexShrink:0}}>
<button onClick={()=>matchIt(r.id,'matched')} style={{height:30,padding:'0 10px',borderRadius:6,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.08)',color:C.ok,fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:700,cursor:'pointer'}}>✓ {T('مطابقة','Match')}</button>
<button onClick={()=>matchIt(r.id,'unmatched')} style={{height:30,padding:'0 10px',borderRadius:6,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.08)',color:C.red,fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:700,cursor:'pointer'}}>✗</button>
</div>}
</div>})}
</div></div>}

function InvoiceFollowupsPage({sb,toast,user,lang,branchId}){
const T=(a,e)=>lang==='ar'?a:e;const nm=v=>Number(v||0).toLocaleString('en-US')
const[data,setData]=useState([]);const[pop,setPop]=useState(false);const[form,setForm]=useState({})
const[saving,setSaving]=useState(false);const[invoices,setInvoices]=useState([])
const[dues,setDues]=useState([]);const[viewMode,setViewMode]=useState('dues')
useEffect(()=>{Promise.all([sb.from('invoice_followups').select('*,invoices:invoice_id(invoice_number,total_amount,remaining_amount,status),clients:client_id(name_ar,phone)').is('deleted_at',null).order('followup_date',{ascending:false}),sb.from('invoices').select('id,invoice_number,client_id,remaining_amount,clients:client_id(name_ar)').is('deleted_at',null).in('status',['unpaid','partial']),sb.from('v_invoice_dues').select('*').order('days_overdue',{ascending:false})]).then(([f,i,d])=>{setData(f.data||[]);setInvoices(i.data||[]);setDues(d.data||[])})},[sb])
const stClr={pending:C.gold,done:C.ok,promise:C.blue,no_response:C.red,escalated:'#e67e22'}
const urgClr={critical:C.red,overdue:C.red,warning:'#e67e22',normal:C.gold}
const reasonLabel={due_date_passed:T('تاريخ الاستحقاق مضى','Due date passed'),transaction_completed:T('المعاملة اكتملت','Transaction completed'),due_soon:T('يستحق قريباً','Due soon'),scheduled:T('مجدول','Scheduled')}
const typIco={call:'☎',whatsapp:'✉',email:'@',visit:'⌂',sms:'✆'}
const overdueCount=dues.filter(d=>d.urgency==='overdue'||d.urgency==='critical').length
const totalDue=dues.reduce((s,d)=>s+Number(d.remaining_amount||0),0)
const save=async()=>{setSaving(true);try{const d={...form};delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null;if(k==='promise_amount'&&d[k])d[k]=Number(d[k])});d.created_by=user?.id
await sb.from('invoice_followups').insert(d);toast(T('تم الحفظ','Saved'));setPop(false)
const{data:r}=await sb.from('invoice_followups').select('*,invoices:invoice_id(invoice_number,total_amount,remaining_amount,status),clients:client_id(name_ar,phone)').is('deleted_at',null).order('followup_date',{ascending:false});setData(r||[])}catch(e){toast('خطأ: '+e.message?.slice(0,60))}setSaving(false)}
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)'}
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('متابعة الفواتير','Invoice Follow-ups')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('الفواتير المستحقة والتواصل مع العملاء','Due invoices & client follow-up')}</div></div><button onClick={()=>{setForm({invoice_id:'',client_id:'',followup_type:'call',followup_date:new Date().toISOString().split('T')[0],next_followup_date:'',client_response:'',promise_date:'',promise_amount:'',status:'pending',notes:''});setPop(true)}} style={{height:38,padding:'0 20px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer'}}>+ {T('متابعة جديدة','New Follow-up')}</button></div>
{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))',gap:10,marginBottom:18}}>
<div style={{padding:'14px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.1)'}}><div style={{fontSize:9,color:C.red,opacity:.7,marginBottom:4}}>{T('فواتير مستحقة','Due')}</div><div style={{fontSize:22,fontWeight:800,color:C.red}}>{dues.length}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(230,126,34,.06)',border:'1px solid rgba(230,126,34,.1)'}}><div style={{fontSize:9,color:'#e67e22',opacity:.7,marginBottom:4}}>{T('متأخرة','Overdue')}</div><div style={{fontSize:22,fontWeight:800,color:'#e67e22'}}>{overdueCount}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)'}}><div style={{fontSize:9,color:C.gold,opacity:.7,marginBottom:4}}>{T('إجمالي المتبقي','Total Due')}</div><div style={{fontSize:22,fontWeight:800,color:C.gold}}>{nm(totalDue)}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(52,131,180,.06)',border:'1px solid rgba(52,131,180,.1)'}}><div style={{fontSize:9,color:C.blue,opacity:.7,marginBottom:4}}>{T('متابعات','Follow-ups')}</div><div style={{fontSize:22,fontWeight:800,color:C.blue}}>{data.length}</div></div>
</div>
{/* View mode tabs */}
<div style={{display:'flex',gap:4,marginBottom:14}}>
{[{v:'dues',l:T('فواتير مستحقة','Due Invoices'),n:dues.length},{v:'followups',l:T('سجل المتابعات','Follow-up Log'),n:data.length}].map(t=><div key={t.v} onClick={()=>setViewMode(t.v)} style={{padding:'6px 14px',borderRadius:8,fontSize:11,fontWeight:viewMode===t.v?700:500,color:viewMode===t.v?C.gold:'rgba(255,255,255,.4)',background:viewMode===t.v?'rgba(201,168,76,.08)':'transparent',border:viewMode===t.v?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{t.l} <span style={{fontSize:9,opacity:.6}}>({t.n})</span></div>)}
</div>
{/* Auto-detected dues */}
{viewMode==='dues'&&<div style={{display:'flex',flexDirection:'column',gap:6}}>
{dues.length===0?<div style={{textAlign:'center',padding:50,color:'var(--tx6)'}}>{T('لا توجد فواتير مستحقة','No due invoices')}</div>:
dues.map(d=>{const uc=urgClr[d.urgency]||C.gold;return<div key={d.invoice_id} style={{background:'var(--bg)',border:'1px solid '+(d.urgency==='critical'?'rgba(192,57,43,.15)':'var(--bd)'),borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:42,height:42,borderRadius:12,background:uc+'12',border:'1px solid '+uc+'20',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<span style={{fontSize:14,fontWeight:800,color:uc}}>{d.days_overdue>0?d.days_overdue:'!'}</span></div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{d.client_name||T('عميل','Client')}</span>
<span style={{fontSize:10,color:C.gold,background:'rgba(201,168,76,.1)',padding:'2px 6px',borderRadius:4}}>{d.invoice_number}</span>
<span style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:uc+'12',color:uc}}>{reasonLabel[d.due_reason]||d.due_reason}</span>
</div>
<div style={{display:'flex',gap:10,fontSize:10,color:'var(--tx4)'}}>
{d.facility_name&&<span>{d.facility_name}</span>}
{d.transaction_number&&<span>{d.transaction_number} ({d.txn_status})</span>}
{d.last_followup&&<span>{T('آخر متابعة:','Last:')} {d.last_followup}</span>}
</div>
</div>
<div style={{textAlign:'center',flexShrink:0}}>
<div style={{fontSize:18,fontWeight:800,color:uc}}>{nm(d.remaining_amount)}</div>
<div style={{fontSize:8,color:uc,opacity:.6}}>{T('ر.س','SAR')}</div>
</div>
{d.client_phone&&<button onClick={()=>{const ph=d.client_phone.replace(/\D/g,'').replace(/^0/,'966');const msg=encodeURIComponent('السلام عليكم '+(d.client_name||'')+'\n\nنود تذكيركم بالمستحقات — فاتورة '+d.invoice_number+'\nالمتبقي: '+nm(d.remaining_amount)+' ريال\n\nجسر للأعمال');window.open('https://wa.me/'+ph+'?text='+msg,'_blank')}} style={{width:36,height:36,borderRadius:10,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27a046" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button>}
</div>})}
</div>}
{/* Follow-up log */}
{viewMode==='followups'&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
{data.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)'}}>{T('لا توجد متابعات','No follow-ups')}</div>:data.map(r=>{const sc=stClr[r.status]||'#999';return<div key={r.id} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:42,height:42,borderRadius:12,background:sc+'12',border:'1px solid '+sc+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{typIco[r.followup_type]||'▤'}</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{r.clients?.name_ar||T('عميل','Client')}</span><span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:5,background:sc+'15',color:sc}}>{r.status}</span><span style={{fontSize:10,color:C.gold,background:'rgba(201,168,76,.1)',padding:'2px 6px',borderRadius:4}}>{r.invoices?.invoice_number}</span></div>
<div style={{display:'flex',gap:10,fontSize:10,color:'var(--tx4)'}}><span>{r.followup_date}</span>{r.client_response&&<span style={{color:'var(--tx3)'}}>"{r.client_response}"</span>}{r.promise_date&&<span style={{color:C.blue}}>{T('وعد:','Promise:')} {r.promise_date}</span>}{r.promise_amount&&<span style={{color:C.ok}}>{nm(r.promise_amount)} {T('ر.س','SAR')}</span>}</div>
{r.next_followup_date&&<div style={{fontSize:9,color:'#e67e22',marginTop:3}}>{T('المتابعة القادمة:','Next:')} {r.next_followup_date}</div>}
</div>
{r.clients?.phone&&<button onClick={()=>{const ph=r.clients.phone.replace(/\D/g,'').replace(/^0/,'966');const msg=encodeURIComponent('السلام عليكم '+r.clients.name_ar+'\n\nنود تذكيركم بالمستحقات المالية — فاتورة '+(r.invoices?.invoice_number||'')+'\nالمتبقي: '+nm(r.invoices?.remaining_amount||0)+' ريال\n\nجسر للأعمال');window.open('https://wa.me/'+ph+'?text='+msg,'_blank')}} style={{width:36,height:36,borderRadius:10,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'/></svg></button>}
</div>})}
</div>}
{pop&&<div onClick={()=>setPop(false)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(560px,96vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)'}}/><div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{T('متابعة جديدة','New Follow-up')}</div><button onClick={()=>setPop(false)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('الفاتورة','Invoice')}</div><select value={form.invoice_id||''} onChange={e=>{const inv=invoices.find(i=>i.id===e.target.value);setForm(p=>({...p,invoice_id:e.target.value,client_id:inv?.client_id||''}))}} style={fS}><option value="">—</option>{invoices.map(i=><option key={i.id} value={i.id}>{i.invoice_number} — {i.clients?.name_ar} ({nm(i.remaining_amount)} {T('ر.س','SAR')})</option>)}</select></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('نوع المتابعة','Type')}</div><select value={form.followup_type||''} onChange={e=>setForm(p=>({...p,followup_type:e.target.value}))} style={fS}><option value="call">{T('اتصال','Call')}</option><option value="whatsapp">{T('واتساب','WhatsApp')}</option><option value="email">{T('بريد','Email')}</option><option value="visit">{T('زيارة','Visit')}</option></select></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('التاريخ','Date')}</div><input type="date" value={form.followup_date||''} onChange={e=>setForm(p=>({...p,followup_date:e.target.value}))} style={{...fS,direction:'ltr'}}/></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('الحالة','Status')}</div><select value={form.status||''} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={fS}><option value="pending">{T('بانتظار','Pending')}</option><option value="done">{T('تم','Done')}</option><option value="promise">{T('وعد','Promise')}</option><option value="no_response">{T('لم يرد','No Response')}</option></select></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('تاريخ الوعد','Promise Date')}</div><input type="date" value={form.promise_date||''} onChange={e=>setForm(p=>({...p,promise_date:e.target.value}))} style={{...fS,direction:'ltr'}}/></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('المبلغ الموعود','Promise Amt')}</div><input type="number" value={form.promise_amount||''} onChange={e=>setForm(p=>({...p,promise_amount:e.target.value}))} style={{...fS,direction:'ltr'}}/></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('المتابعة القادمة','Next Follow-up')}</div><input type="date" value={form.next_followup_date||''} onChange={e=>setForm(p=>({...p,next_followup_date:e.target.value}))} style={{...fS,direction:'ltr'}}/></div>
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('رد العميل','Client Response')}</div><textarea value={form.client_response||''} onChange={e=>setForm(p=>({...p,client_response:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:10,resize:'vertical',textAlign:'right'}}/></div>
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}><button onClick={save} disabled={saving} style={{height:42,padding:'0 24px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button><button onClick={()=>setPop(false)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button></div>
</div></div>}
</div>}

function ExtPaymentsPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e;const nm=v=>Number(v||0).toLocaleString('en-US')
const[data,setData]=useState([]);const[filter,setFilter]=useState('all')
useEffect(()=>{sb.from('external_payments').select('*,facilities:facility_id(name_ar)').is('deleted_at',null).order('payment_date',{ascending:false}).then(({data})=>setData(data||[]))},[sb])
const filtered=filter==='all'?data:data.filter(r=>r.status===filter)
const stClr={pending:C.gold,sent:C.blue,confirmed:C.ok,failed:C.red,refunded:'#e67e22'}
const typLbl={government_fee:T('رسوم حكومية','Gov Fee'),visa_fee:T('تأشيرة','Visa'),insurance:T('تأمين','Insurance'),gosi:T('تأمينات','GOSI'),qiwa:T('قوى','Qiwa'),mol:T('وزارة العمل','MOL'),chamber:T('الغرفة','Chamber'),other:T('أخرى','Other')}
const confirm=async(id)=>{await sb.from('external_payments').update({status:'confirmed',confirmed_at:new Date().toISOString(),confirmed_by:user?.id}).eq('id',id);toast(T('تم التأكيد','Confirmed'));sb.from('external_payments').select('*,facilities:facility_id(name_ar)').is('deleted_at',null).order('payment_date',{ascending:false}).then(({data})=>setData(data||[]))}
const totalPending=data.filter(r=>r.status==='pending').reduce((s,r)=>s+Number(r.amount||0),0)
const totalConfirmed=data.filter(r=>r.status==='confirmed').reduce((s,r)=>s+Number(r.amount||0),0)
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('السدادات الخارجية','External Payments')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('تحويلات ورسوم حكومية وسدادات','Government fees, transfers & payments')}</div></div></div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
<div style={{padding:'16px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.12)',textAlign:'center'}}><div style={{fontSize:10,color:'rgba(201,168,76,.5)',marginBottom:6}}>{T('إجمالي السدادات','Total')}</div><div style={{fontSize:24,fontWeight:900,color:C.gold}}>{nm(data.reduce((s,r)=>s+Number(r.amount||0),0))}</div></div>
<div style={{padding:'16px',borderRadius:12,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.12)',textAlign:'center'}}><div style={{fontSize:10,color:'rgba(39,160,70,.5)',marginBottom:6}}>{T('مؤكدة','Confirmed')}</div><div style={{fontSize:24,fontWeight:900,color:C.ok}}>{nm(totalConfirmed)}</div></div>
<div style={{padding:'16px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.12)',textAlign:'center'}}><div style={{fontSize:10,color:'rgba(201,168,76,.5)',marginBottom:6}}>{T('معلّقة','Pending')}</div><div style={{fontSize:24,fontWeight:900,color:C.gold}}>{nm(totalPending)}</div></div>
</div>
<div style={{display:'flex',gap:4,marginBottom:14}}>{[['all',T('الكل','All')],['pending',T('معلّقة','Pending')],['sent',T('مرسلة','Sent')],['confirmed',T('مؤكدة','Confirmed')]].map(([k,l])=><button key={k} onClick={()=>setFilter(k)} style={{padding:'6px 14px',borderRadius:8,fontSize:10,fontWeight:filter===k?700:500,color:filter===k?C.gold:'rgba(255,255,255,.4)',background:filter===k?'rgba(201,168,76,.08)':'transparent',border:filter===k?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{l}</button>)}</div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{filtered.map(r=>{const sc=stClr[r.status]||'#999';return<div key={r.id} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:42,height:42,borderRadius:12,background:sc+'12',border:'1px solid '+sc+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'><rect x='2' y='6' width='20' height='12' rx='2'/><circle cx='12' cy='12' r='2.5'/><path d='M6 12h.01M18 12h.01'/></svg></div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{r.payment_to||T('جهة','Payee')}</span><span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:5,background:sc+'15',color:sc}}>{r.status}</span><span style={{fontSize:9,color:'var(--tx5)',background:'rgba(255,255,255,.04)',padding:'2px 6px',borderRadius:4}}>{typLbl[r.payment_type]||r.payment_type}</span></div>
<div style={{display:'flex',gap:10,fontSize:10,color:'var(--tx4)'}}><span style={{direction:'ltr'}}>{r.payment_date}</span>{r.payment_number&&<span style={{color:C.gold}}>{r.payment_number}</span>}{r.reference_number&&<span>{r.reference_number}</span>}{r.bank_name&&<span>{r.bank_name}</span>}{r.facilities?.name_ar&&<span>{r.facilities.name_ar}</span>}</div>
</div>
<div style={{fontSize:18,fontWeight:800,color:C.red,direction:'ltr',flexShrink:0}}>{nm(r.amount)}</div>
{r.status==='pending'&&<button onClick={()=>confirm(r.id)} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.08)',color:C.ok,fontFamily:"'Cairo',sans-serif",fontSize:10,fontWeight:700,cursor:'pointer'}}>✓ {T('تأكيد','Confirm')}</button>}
</div>})}
</div></div>}

function PaymentsPage({sb,toast,user,lang,branchId}){
const T=(a,e)=>lang==='ar'?a:e;const isAr=lang!=='en';const nm=v=>Number(v||0).toLocaleString('en-US')
const C={gold:'#c9a84c',ok:'#27a046',red:'#c0392b',blue:'#3483b4'}
const[tab,setTab]=useState('office')
const[expenses,setExpenses]=useState([]);const[extPayments,setExtPayments]=useState([]);const[opExpenses,setOpExpenses]=useState([]);const[loading,setLoading]=useState(true)
const[pop,setPop]=useState(null);const[form,setForm]=useState({});const[saving,setSaving]=useState(false)
const[q,setQ]=useState('')
const load=useCallback(async()=>{setLoading(true);const[ex,ep,op]=await Promise.all([sb.from('expenses').select('*,facilities:facility_id(name_ar)').is('deleted_at',null).order('created_at',{ascending:false}),sb.from('external_payments').select('*,facilities:facility_id(name_ar)').is('deleted_at',null).order('created_at',{ascending:false}),sb.from('operational_expenses').select('*').is('deleted_at',null).order('date',{ascending:false})]);setExpenses(ex.data||[]);setExtPayments(ep.data||[]);setOpExpenses(op.data||[]);setLoading(false)},[sb])
useEffect(()=>{load()},[load])
const saveExp=async()=>{setSaving(true);try{const d={...form};const id=d._id;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null});if(id){d.updated_by=user?.id;await sb.from('expenses').update(d).eq('id',id)}else{d.created_by=user?.id;await sb.from('expenses').insert(d)};toast(T('تم الحفظ','Saved'));setPop(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}
const saveExt=async()=>{setSaving(true);try{const d={...form};const id=d._id;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null});if(id){await sb.from('external_payments').update(d).eq('id',id)}else{d.created_by=user?.id;await sb.from('external_payments').insert(d)};toast(T('تم الحفظ','Saved'));setPop(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}
const saveOp=async()=>{setSaving(true);try{const d={...form};const id=d._id;delete d._id;delete d.users;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null});if(d.amount)d.amount=Number(d.amount);if(id){const{error}=await sb.from('operational_expenses').update(d).eq('id',id);if(error)throw error}else{d.created_by=user?.id;const{error}=await sb.from('operational_expenses').insert(d);if(error)throw error};toast(T('تم الحفظ','Saved'));setPop(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}
const del=async(table,id)=>{if(!confirm(T('حذف؟','Delete?')))return;await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id);toast(T('تم الحذف','Deleted'));load()}

const officeExp=expenses.filter(e=>e.expense_group==='office'||e.expense_type==='branch_expense'||e.expense_type==='employee_expense')
const govExp=expenses.filter(e=>e.expense_group==='government'||e.expense_type==='sadad_payment'||e.expense_type==='saudization_expense')
const extExp=extPayments

const totalOffice=officeExp.reduce((s,e)=>s+Number(e.amount||0),0)
const totalGov=govExp.reduce((s,e)=>s+Number(e.amount||0),0)
const totalExt=extExp.reduce((s,e)=>s+Number(e.amount||0),0)
const totalOp=opExpenses.reduce((s,e)=>s+Number(e.amount||0),0)
const totalAll=totalOffice+totalGov+totalExt+totalOp

const allCurrent=tab==='office'?officeExp:tab==='government'?govExp:tab==='operational'?opExpenses:extExp
const filtered=allCurrent.filter(r=>!q||JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))

const Badge=({v,c})=><span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:(c||'#999')+'15',color:c||'#999'}}>{v}</span>
const F="'Cairo',sans-serif"
const bS={height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}
const fBtnS=a=>({padding:'6px 14px',borderRadius:8,fontSize:11,fontWeight:a?700:500,color:a?C.gold:'rgba(255,255,255,.4)',background:a?'rgba(201,168,76,.08)':'transparent',border:a?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'})

return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
<div><div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,.93)'}}>{T('المدفوعات والمصاريف','Payments & Expenses')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('مصاريف المكتب والسدادات الحكومية والحوالات والمصاريف التشغيلية','Office, gov payments, transfers & operational expenses')}</div></div>
<button onClick={()=>{if(tab==='operational'){setForm({amount:'',category:'other',description:'',date:new Date().toISOString().slice(0,10),payment_method:'cash',vendor_name:'',is_recurring:false});setPop('op')}else if(tab==='external'){setForm({amount:'',payment_type:'',payment_to:'',facility_id:'',payment_date:'',reference_number:'',notes:''});setPop('ext')}else{setForm({expense_type:tab==='office'?'branch_expense':'sadad_payment',expense_group:tab==='government'?'government':'office',amount:'',facility_id:'',payment_date:'',notes:''});setPop('exp')}}} style={bS}>+ {T('إضافة','Add')}</button>
</div>
{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))',gap:10,marginBottom:18}}>
<div style={{padding:'14px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)'}}><div style={{fontSize:9,color:C.gold,opacity:.7,marginBottom:4}}>{T('الإجمالي','Total')}</div><div style={{fontSize:22,fontWeight:800,color:C.gold}}>{nm(totalAll)}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(52,131,180,.06)',border:'1px solid rgba(52,131,180,.1)',cursor:'pointer'}} onClick={()=>setTab('office')}><div style={{fontSize:9,color:C.blue,opacity:.7,marginBottom:4}}>{T('مصاريف المكتب','Office')}</div><div style={{fontSize:22,fontWeight:800,color:C.blue}}>{nm(totalOffice)}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(230,126,34,.06)',border:'1px solid rgba(230,126,34,.1)',cursor:'pointer'}} onClick={()=>setTab('government')}><div style={{fontSize:9,color:'#e67e22',opacity:.7,marginBottom:4}}>{T('سدادات حكومية','Gov')}</div><div style={{fontSize:22,fontWeight:800,color:'#e67e22'}}>{nm(totalGov)}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(155,89,182,.06)',border:'1px solid rgba(155,89,182,.1)',cursor:'pointer'}} onClick={()=>setTab('external')}><div style={{fontSize:9,color:'#9b59b6',opacity:.7,marginBottom:4}}>{T('حوالات خارجية','External')}</div><div style={{fontSize:22,fontWeight:800,color:'#9b59b6'}}>{nm(totalExt)}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)',cursor:'pointer'}} onClick={()=>setTab('operational')}><div style={{fontSize:9,color:C.ok,opacity:.7,marginBottom:4}}>{T('مصاريف تشغيلية','Operational')}</div><div style={{fontSize:22,fontWeight:800,color:C.ok}}>{nm(totalOp)}</div></div>
</div>
{/* Tabs */}
<div style={{display:'flex',gap:4,marginBottom:14}}>
{[{v:'office',l:T('مصاريف المكتب','Office'),n:officeExp.length},{v:'government',l:T('سدادات حكومية','Government'),n:govExp.length},{v:'external',l:T('حوالات خارجية','External'),n:extExp.length},{v:'operational',l:T('مصاريف تشغيلية','Operational'),n:opExpenses.length}].map(t=><div key={t.v} onClick={()=>{setTab(t.v);setQ('')}} style={fBtnS(tab===t.v)}>{t.l} <span style={{fontSize:9,opacity:.6}}>({t.n})</span></div>)}
</div>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={T('بحث...','Search...')} style={{width:'100%',height:36,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.08)',borderRadius:8,fontFamily:F,fontSize:11,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',marginBottom:12}}/>
{loading?<div style={{textAlign:'center',padding:50,color:'var(--tx5)'}}>...</div>:filtered.length===0?<div style={{textAlign:'center',padding:50,color:'var(--tx6)'}}>{T('لا توجد بيانات','No data')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{filtered.map(r=>{const amt=Number(r.amount||0);return<div key={r.id} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:4}}>{r.description||r.vendor_name||r.payment_to||r.payment_type||r.expense_type||r.notes||'—'}</div>
<div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',fontSize:10,color:'var(--tx5)'}}>
{r.facilities?.name_ar&&<span>{r.facilities.name_ar}</span>}
{r.vendor_name&&<span>{r.vendor_name}</span>}
{r.payment_to&&<span>{r.payment_to}</span>}
{(r.expense_date||r.payment_date||r.date)&&<span style={{direction:'ltr'}}>{r.expense_date||r.payment_date||r.date}</span>}
{r.reference_number&&<span style={{direction:'ltr'}}>#{r.reference_number}</span>}
{r.category&&<Badge v={r.category} c={C.ok}/>}
{(r.expense_type||r.payment_type)&&<Badge v={r.expense_type||r.payment_type} c={tab==='office'?C.blue:tab==='government'?'#e67e22':tab==='operational'?C.ok:'#9b59b6'}/>}
{r.payment_method&&<span style={{opacity:.6}}>{r.payment_method}</span>}
</div>
</div>
<div style={{fontSize:18,fontWeight:800,color:C.red,flexShrink:0}}>{nm(amt)}</div>
<button onClick={()=>del(tab==='external'?'external_payments':tab==='operational'?'operational_expenses':'expenses',r.id)} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.12)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
</div>})}
</div>}
{/* Add popup */}
{pop&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(500px,96vw)',maxHeight:'80vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)'}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:15,fontWeight:700,color:'var(--tx)'}}>{T(pop==='ext'?'حوالة خارجية':pop==='op'?'مصروف تشغيلي':'مصروف',pop==='ext'?'External Payment':pop==='op'?'Operational Expense':'Expense')}</div>
<div style={{padding:'18px 22px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('المبلغ','Amount')}</div><input value={form.amount||''} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} style={{width:'100%',height:40,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:14,fontWeight:700,color:'var(--tx)',background:'rgba(255,255,255,.07)',outline:'none',textAlign:'center',direction:'ltr'}} type="number"/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الوصف','Description')}</div><input value={form.description||form.notes||''} onChange={e=>setForm(p=>({...p,description:e.target.value,notes:e.target.value}))} style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.06)',outline:'none'}}/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('التاريخ','Date')}</div><input type="date" value={form.expense_date||form.payment_date||form.date||''} onChange={e=>setForm(p=>({...p,expense_date:e.target.value,payment_date:e.target.value,date:e.target.value}))} style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.06)',outline:'none',direction:'ltr'}}/></div>
{pop==='op'&&<><div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الجهة','Vendor')}</div><input value={form.vendor_name||''} onChange={e=>setForm(p=>({...p,vendor_name:e.target.value}))} style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.06)',outline:'none'}}/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('التصنيف','Category')}</div><select value={form.category||'other'} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{width:'100%',height:38,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.06)',outline:'none'}}>{[['rent','إيجار'],['salary','رواتب'],['gov_fee','رسوم حكومية'],['transport','نقل'],['utilities','خدمات'],['office_supplies','مستلزمات مكتبية'],['maintenance','صيانة'],['marketing','تسويق'],['insurance','تأمين'],['telecom','اتصالات'],['legal','قانوني'],['other','أخرى']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div></>}
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={pop==='ext'?saveExt:pop==='op'?saveOp:saveExp} disabled={saving} style={{...bS,height:40,minWidth:120,opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
<button onClick={()=>setPop(null)} style={{height:40,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}

function AIChatPage({sb,user,lang}){
const T=(a,e)=>lang==='ar'?a:e;const isAr=lang!=='en'
const[messages,setMessages]=useState(()=>{try{const s=localStorage.getItem('jisr_chat_history');return s?JSON.parse(s):[]}catch{return[]}})
const[input,setInput]=useState('');const[loading,setLoading]=useState(false);const[context,setContext]=useState(null)
const[listening,setListening]=useState(false);const[chatList,setChatList]=useState(()=>{try{return JSON.parse(localStorage.getItem('jisr_chat_list')||'[]')}catch{return[]}})
const[currentChatId,setCurrentChatId]=useState(()=>localStorage.getItem('jisr_chat_current')||null)
const[showHistory,setShowHistory]=useState(false)
const[typingMsg,setTypingMsg]=useState(null)
const[typingDisplay,setTypingDisplay]=useState('')
const typingRef=React.useRef(null)
const msgEndRef=React.useRef(null)
const recognitionRef=React.useRef(null)

// Auto-scroll to bottom
useEffect(()=>{msgEndRef.current?.scrollIntoView({behavior:'smooth'})},[messages,loading,typingDisplay])

// Typewriter effect
useEffect(()=>{
if(!typingMsg){setTypingDisplay('');return}
const words=typingMsg.split(/(\s+)/)
let idx=0;setTypingDisplay('')
const speed=words.length>100?20:words.length>50?30:40
typingRef.current=setInterval(()=>{
idx++
const shown=words.slice(0,idx).join('')
setTypingDisplay(shown)
if(idx>=words.length){
clearInterval(typingRef.current)
setMessages(p=>[...p,{role:'assistant',text:typingMsg}])
setTypingMsg(null);setTypingDisplay('')
}},speed)
return()=>{if(typingRef.current)clearInterval(typingRef.current)}
},[typingMsg])

// Save messages to localStorage
useEffect(()=>{if(messages.length>0){localStorage.setItem('jisr_chat_history',JSON.stringify(messages));if(!currentChatId){const id=Date.now().toString();setCurrentChatId(id);localStorage.setItem('jisr_chat_current',id);const title=messages[0]?.text?.slice(0,40)||'محادثة جديدة';setChatList(p=>{const n=[{id,title,date:new Date().toISOString().slice(0,10),count:messages.length},...p.filter(c=>c.id!==id)].slice(0,20);localStorage.setItem('jisr_chat_list',JSON.stringify(n));return n})}else{setChatList(p=>{const n=p.map(c=>c.id===currentChatId?{...c,count:messages.length}:c);localStorage.setItem('jisr_chat_list',JSON.stringify(n));return n})}}},[messages])

// Load system context
useEffect(()=>{if(!sb)return;Promise.all([
sb.rpc('get_branch_stats',{p_branch_id:null}),
sb.from('facilities').select('name_ar,nitaqat_color,facility_status,cr_status').is('deleted_at',null),
sb.from('workers').select('name_ar,worker_status,facility_id').is('deleted_at',null),
sb.from('transactions').select('transaction_number,status,transaction_type').is('deleted_at',null),
sb.from('invoices').select('invoice_number,status,total_amount,paid_amount,remaining_amount,clients:client_id(name_ar,phone)').is('deleted_at',null),
sb.from('notifications_view').select('*'),
sb.from('weekly_report').select('*'),
sb.from('monthly_report').select('*'),
sb.from('clients').select('name_ar,status,phone').is('deleted_at',null),
sb.from('worker_transfers').select('*,workers:worker_id(name_ar)').is('deleted_at',null),
sb.from('external_payments').select('payment_type,amount,status,payment_to').is('deleted_at',null),
sb.from('bank_reconciliation').select('amount,transaction_type,match_status,description').is('deleted_at',null),
sb.from('expenses').select('expense_type,amount,category').is('deleted_at',null),
sb.from('employee_performance').select('*')
]).then(([stats,fac,wrk,txn,inv,notif,weekly,monthly,clients,transfers,extPay,audit,expenses,perf])=>{
setContext(JSON.stringify({stats:stats.data,
facilities:(fac.data||[]).map(f=>({name:f.name_ar,nitaqat:f.nitaqat_color,status:f.facility_status})),
workers_summary:{total:(wrk.data||[]).length,active:(wrk.data||[]).filter(w=>w.worker_status==='active').length,absconded:(wrk.data||[]).filter(w=>w.worker_status==='absconded').length},
transactions:(txn.data||[]).map(t=>({no:t.transaction_number,status:t.status,type:t.transaction_type})),
invoices:(inv.data||[]).map(i=>({no:i.invoice_number,status:i.status,total:i.total_amount,paid:i.paid_amount,remaining:i.remaining_amount,client:i.clients?.name_ar,phone:i.clients?.phone})),
notifications:notif.data||[],weekly_report:weekly.data?.[0]||null,monthly_report:monthly.data?.[0]||null,
clients:(clients.data||[]).map(c=>({name:c.name_ar,status:c.status,phone:c.phone})),
transfers:(transfers.data||[]).map(t=>({worker:t.workers?.name_ar,total_cost:t.total_cost,profit:t.profit,status:t.status})),
external_payments:(extPay.data||[]).map(p=>({to:p.payment_to,amount:p.amount,type:p.payment_type,status:p.status})),
audit_summary:{total:(audit.data||[]).length,matched:(audit.data||[]).filter(a=>a.match_status==='matched').length,pending:(audit.data||[]).filter(a=>a.match_status==='pending').length,unmatched:(audit.data||[]).filter(a=>a.match_status==='unmatched').length},
expenses:(expenses.data||[]).map(e=>({type:e.expense_type,amount:e.amount,category:e.category})),
employee_performance:perf.data||[]},null,0))

// ═══ Daily Briefing — auto-send once per day ═══
const todayKey=new Date().toISOString().slice(0,10)
const lastBriefing=localStorage.getItem('jisr_daily_briefing_date')
if(lastBriefing!==todayKey){
localStorage.setItem('jisr_daily_briefing_date',todayKey)
const overdueInvs=(inv.data||[]).filter(i=>i.status==='unpaid'||i.status==='partial')
const overdueCount=overdueInvs.length
const overdueTotal=overdueInvs.reduce((s,i)=>s+Number(i.remaining_amount||0),0)
const activeFac=(fac.data||[]).filter(f=>f.facility_status==='active').length
const riskFac=(fac.data||[]).filter(f=>f.nitaqat_color==='red'||f.nitaqat_color==='yellow').length
const totalWorkers=(wrk.data||[]).length
const abscondedWorkers=(wrk.data||[]).filter(w=>w.worker_status==='absconded').length
const pendingTxn=(txn.data||[]).filter(t=>t.status==='in_progress'||t.status==='draft').length
const totalRevenue=(inv.data||[]).reduce((s,i)=>s+Number(i.total_amount||0),0)
const totalCollected=(inv.data||[]).reduce((s,i)=>s+Number(i.paid_amount||0),0)
const collectionRate=totalRevenue>0?Math.round((totalCollected/totalRevenue)*100):0
const nm=v=>Number(v||0).toLocaleString('en-US')

const greeting=new Date().getHours()<12?'صباح الخير':'مساء الخير'
const dayNames=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const monthNames=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const now=new Date()
const dateStr=dayNames[now.getDay()]+' '+now.getDate()+' '+monthNames[now.getMonth()]+' '+now.getFullYear()

let briefing=`${greeting} 👋\n📅 **${dateStr}**\n\nهذا ملخصك اليومي:\n\n`
briefing+=`🏢 **المنشآت:** ${activeFac} نشطة`
if(riskFac>0)briefing+=` · ⚠️ ${riskFac} في نطاق خطر`
briefing+=`\n👷 **العمّال:** ${nm(totalWorkers)} عامل`
if(abscondedWorkers>0)briefing+=` · 🔴 ${abscondedWorkers} هارب`
briefing+=`\n📋 **المعاملات:** ${pendingTxn} قيد التنفيذ`
briefing+=`\n💰 **الإيرادات:** ${nm(totalRevenue)} · التحصيل: **${collectionRate}%**`
if(overdueCount>0)briefing+=`\n\n⏰ **تنبيه:** ${overdueCount} فاتورة متأخرة بإجمالي **${nm(overdueTotal)}** ريال`
if(riskFac>0)briefing+=`\n🔶 **تنبيه:** ${riskFac} منشآت تحتاج مراجعة النطاقات`
if(abscondedWorkers>0)briefing+=`\n🚨 **تنبيه:** ${abscondedWorkers} عمّال هاربين يحتاجون إجراء`
briefing+=`\n\nكيف أقدر أساعدك اليوم؟ 😊`

setMessages(p=>{if(p.length===0||p[0]?.role!=='briefing')return[{role:'assistant',text:briefing},...p];return p})
}

})},[sb])

// Voice recognition
const toggleVoice=()=>{
if(listening){recognitionRef.current?.stop();setListening(false);return}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition
if(!SR){alert(T('المتصفح لا يدعم التعرف على الصوت','Browser does not support voice recognition'));return}
const r=new SR();r.lang='ar-SA';r.continuous=false;r.interimResults=true
r.onresult=(e)=>{const t=Array.from(e.results).map(r=>r[0].transcript).join('');setInput(t)}
r.onend=()=>setListening(false)
r.onerror=()=>setListening(false)
recognitionRef.current=r;r.start();setListening(true)}

const sendMessage=async()=>{if(!input.trim()||loading)return
const userMsg={role:'user',text:input.trim()};setMessages(p=>[...p,userMsg]);setInput('');setLoading(true)
try{
const systemPrompt=`أنت مساعد ذكي لنظام "جسر للأعمال" — نظام إدارة منشآت وعمالة في المملكة العربية السعودية.
اسمك "مساعد جسر". أجب بناءً على البيانات الحقيقية. كن دقيقاً ومختصراً. أجب بنفس لغة السؤال.

قواعد التنسيق المهمة:
- عند عرض قوائم أو بيانات متعددة، استخدم جداول بتنسيق Markdown (| عمود1 | عمود2 |)
- عند ذكر أرقام مالية كبيرة، ضعها بين علامات **رقم** للتوضيح
- عند ذكر فاتورة محددة، اكتب رقمها بالشكل [INV-XXXX-XXXX]
- عند ذكر منشأة، اكتب اسمها بالشكل [FAC:اسم المنشأة]
- إذا طُلب ملخص أداء أو مقارنة، أضف قسم "الأرقام:" في النهاية بتنسيق: الأرقام: label1=value1, label2=value2

بيانات النظام:\n${context||'جاري تحميل البيانات...'}`

const response=await fetch('https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/ai-chat',{
method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({system:systemPrompt,messages:[{role:'user',content:messages.map(m=>(m.role==='user'?'المستخدم: ':'المساعد: ')+m.text).join('\n')+'\n\nالسؤال الجديد: '+userMsg.text}]})})
const data=await response.json()
const aiText=data.content?.map(c=>c.text||'').join('\n')||T('عذراً، لم أتمكن من المعالجة','Sorry, could not process')
setLoading(false);setTypingMsg(aiText)
}catch(e){setMessages(p=>[...p,{role:'assistant',text:T('خطأ في الاتصال: ','Connection error: ')+e.message}]);setLoading(false)}
}

// New chat
const newChat=()=>{setMessages([]);const id=Date.now().toString();setCurrentChatId(id);localStorage.setItem('jisr_chat_current',id);localStorage.removeItem('jisr_chat_history')}

// Load saved chat
const loadChat=(chatId)=>{try{const saved=localStorage.getItem('jisr_chat_'+chatId);if(saved){setMessages(JSON.parse(saved));setCurrentChatId(chatId);localStorage.setItem('jisr_chat_current',chatId)}}catch{}setShowHistory(false)}

// Rich text renderer
const RichText=({text})=>{
const lines=text.split('\n')
const elements=[];let tableRows=[];let inTable=false

const flushTable=()=>{if(tableRows.length<2)return
const headers=tableRows[0].split('|').filter(c=>c.trim())
const rows=tableRows.slice(2).map(r=>r.split('|').filter(c=>c.trim()))
elements.push(<div key={'t'+elements.length} style={{overflowX:'auto',margin:'8px 0',borderRadius:10,border:'1px solid rgba(201,168,76,.1)'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<thead><tr style={{background:'rgba(201,168,76,.08)'}}>{headers.map((h,i)=><th key={i} style={{padding:'8px 12px',textAlign:'right',fontWeight:700,color:C.gold,borderBottom:'1px solid rgba(201,168,76,.1)',whiteSpace:'nowrap'}}>{h.trim()}</th>)}</tr></thead>
<tbody>{rows.map((row,ri)=><tr key={ri} style={{background:ri%2===0?'transparent':'rgba(255,255,255,.015)'}}>
{row.map((cell,ci)=>{const v=cell.trim();const isNum=/^[\d,٫.]+$/.test(v.replace(/[,٫]/g,''));return<td key={ci} style={{padding:'7px 12px',borderBottom:'1px solid rgba(255,255,255,.03)',color:isNum?'rgba(201,168,76,.7)':'var(--tx3)',fontWeight:isNum?700:500,textAlign:isNum?'center':'right',fontFamily:isNum?'monospace':'inherit'}}>{v}</td>})}
</tr>)}</tbody></table></div>)
tableRows=[]}

lines.forEach((line,li)=>{
if(line.trim().startsWith('|')&&line.trim().endsWith('|')){inTable=true;tableRows.push(line);return}
if(inTable){flushTable();inTable=false}

// Chart data detection
if(line.startsWith('الأرقام:')){
const pairs=line.replace('الأرقام:','').split(',').map(p=>{const[l,v]=p.split('=');return{name:(l||'').trim(),value:Number((v||'0').trim().replace(/,/g,''))}}).filter(p=>p.name&&!isNaN(p.value))
if(pairs.length>=2){elements.push(<div key={'ch'+li} style={{margin:'10px 0',padding:12,background:'rgba(201,168,76,.04)',borderRadius:12,border:'1px solid rgba(201,168,76,.08)'}}>
<div style={{display:'flex',gap:8,alignItems:'flex-end',height:80}}>
{pairs.map((p,i)=>{const max=Math.max(...pairs.map(x=>x.value));const h=max>0?Math.max((p.value/max)*70,4):4
return<div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
<span style={{fontSize:9,fontWeight:700,color:C.gold}}>{p.value.toLocaleString()}</span>
<div style={{width:'100%',height:h,borderRadius:4,background:`linear-gradient(180deg,${C.gold},${C.gold}88)`,transition:'height .5s ease'}}/>
<span style={{fontSize:8,color:'var(--tx4)',textAlign:'center',lineHeight:1.3}}>{p.name}</span>
</div>})}
</div></div>);return}}

// Invoice reference [INV-XXXX]
let processed=line
const invMatches=processed.match(/\[INV-[\w-]+\]/g)
const facMatches=processed.match(/\[FAC:[^\]]+\]/g)

// Bold **text**
const parts=[]
let remaining=processed
while(remaining.length>0){
const boldMatch=remaining.match(/\*\*([^*]+)\*\*/)
if(boldMatch){
const idx=remaining.indexOf(boldMatch[0])
if(idx>0)parts.push(<span key={parts.length}>{remaining.slice(0,idx)}</span>)
parts.push(<strong key={parts.length} style={{color:C.gold,fontWeight:800}}>{boldMatch[1]}</strong>)
remaining=remaining.slice(idx+boldMatch[0].length)
}else{parts.push(<span key={parts.length}>{remaining}</span>);break}}

elements.push(<div key={li} style={{lineHeight:2}}>{parts}</div>)

// Action buttons for invoice/facility references
if(invMatches){
const actions=invMatches.map(m=>m.replace(/[\[\]]/g,''))
elements.push(<div key={'a'+li} style={{display:'flex',gap:6,flexWrap:'wrap',margin:'4px 0'}}>
{actions.map((inv,i)=><button key={i} style={{height:26,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.2)',background:'rgba(52,131,180,.06)',color:C.blue,fontFamily:"'Cairo',sans-serif",fontSize:9,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={C.blue} strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke={C.blue} strokeWidth="1.5"/></svg>
{T('فتح ','Open ')}{inv}</button>)}
</div>)}})
if(inTable)flushTable()
return<>{elements}</>}

const suggestions=isAr?['كم عدد المنشآت النشطة؟','ما هي الفواتير المتأخرة؟','اعطني ملخص الشهر','كم صافي الربح؟','ما هي المنشآت في نطاق خطر؟','كم عامل هارب؟','ملخص أداء الموظفين','حالة التدقيق المالي']:['How many active facilities?','What invoices are overdue?','Give me a monthly summary','What is the net profit?']

return<div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:'var(--bg)'}}>
{/* Status + History bar */}
<div style={{padding:'6px 16px',borderBottom:'1px solid rgba(255,255,255,.03)',display:'flex',alignItems:'center',gap:8}}>
{context?<div style={{fontSize:9,color:'rgba(39,160,70,.5)',display:'flex',alignItems:'center',gap:4}}><span style={{width:5,height:5,borderRadius:'50%',background:C.ok}}/>{T('متصل','Connected')}</div>:<div style={{fontSize:9,color:'rgba(201,168,76,.5)',display:'flex',alignItems:'center',gap:4}}><div style={{width:5,height:5,borderRadius:'50%',background:C.gold,animation:'breathe 1.5s ease-in-out infinite'}}/>{T('جاري التحميل...','Loading...')}</div>}
<div style={{flex:1}}/>
<button onClick={newChat} style={{height:24,padding:'0 10px',borderRadius:6,border:'1px solid rgba(201,168,76,.12)',background:'rgba(201,168,76,.05)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:9,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{T('محادثة جديدة','New Chat')}</button>
{chatList.length>0&&<button onClick={()=>setShowHistory(!showHistory)} style={{height:24,padding:'0 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx4)',fontFamily:"'Cairo',sans-serif",fontSize:9,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{T('السابقة','History')} ({chatList.length})</button>}
</div>

{/* Chat history dropdown */}
{showHistory&&<div style={{padding:'8px 16px',borderBottom:'1px solid rgba(255,255,255,.04)',maxHeight:150,overflowY:'auto',background:'rgba(0,0,0,.2)'}}>
{chatList.map(c=><div key={c.id} onClick={()=>loadChat(c.id)} style={{padding:'6px 10px',borderRadius:8,marginBottom:3,background:c.id===currentChatId?'rgba(201,168,76,.08)':'transparent',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,color:c.id===currentChatId?C.gold:'var(--tx4)',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{c.title}</span>
<span style={{fontSize:8,color:'var(--tx6)',flexShrink:0,marginRight:8}}>{c.date}</span>
</div>)}
</div>}

{/* Messages */}
<div style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:12,scrollbarWidth:'none'}}>
{messages.length===0&&<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
<div style={{width:64,height:64,borderRadius:20,background:'rgba(201,168,76,.08)',border:'1.5px solid rgba(201,168,76,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width='28' height='28' viewBox='0 0 24 24' fill='none' stroke={C.gold} strokeWidth='1.5'><rect x='3' y='11' width='18' height='10' rx='2'/><circle cx='8.5' cy='15.5' r='1.5'/><circle cx='15.5' cy='15.5' r='1.5'/><path d='M12 3v4M8 7h8'/><circle cx='12' cy='3' r='1'/></svg></div>
<div style={{textAlign:'center'}}><div style={{fontSize:16,fontWeight:700,color:'rgba(255,255,255,.7)',marginBottom:6}}>{T('مرحباً! أنا مساعد جسر','Hi! I\'m Jisr Assistant')}</div><div style={{fontSize:12,color:'var(--tx4)',maxWidth:400,lineHeight:2}}>{T('اسألني أي سؤال عن بيانات النظام — المنشآت، العمال، الفواتير، المعاملات، التقارير، أو أي شيء آخر','Ask me anything about system data')}</div></div>
<div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',maxWidth:500}}>
{suggestions.map((s,i)=><button key={i} onClick={()=>setInput(s)} style={{padding:'6px 14px',borderRadius:20,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:600,cursor:'pointer'}}>{s}</button>)}
</div></div>}

{messages.map((m,i)=>{const isUser=m.role==='user';return<div key={i} style={{display:'flex',flexDirection:isUser?'row-reverse':'row',gap:8,maxWidth:'88%',alignSelf:isUser?'flex-end':'flex-start'}}>
<div style={{width:32,height:32,borderRadius:10,background:isUser?'rgba(52,131,180,.15)':'rgba(201,168,76,.15)',border:'1px solid '+(isUser?'rgba(52,131,180,.2)':'rgba(201,168,76,.2)'),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,alignSelf:'flex-start',marginTop:2}}>{isUser?<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2'/><circle cx='12' cy='7' r='4'/></svg>:<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={C.gold} strokeWidth='1.5'><rect x='3' y='11' width='18' height='10' rx='2'/><circle cx='8.5' cy='15.5' r='1.5'/><circle cx='15.5' cy='15.5' r='1.5'/><path d='M12 3v4M8 7h8'/></svg>}</div>
<div style={{background:isUser?'rgba(52,131,180,.06)':'rgba(201,168,76,.04)',borderRadius:14,padding:'12px 16px',border:'1px solid '+(isUser?'rgba(52,131,180,.1)':'rgba(201,168,76,.08)'),fontSize:13,color:'var(--tx2)',minWidth:0,overflow:'hidden'}}>
{isUser?<span style={{whiteSpace:'pre-wrap'}}>{m.text}</span>:<RichText text={m.text}/>}
</div></div>})}

{/* Typewriter display */}
{typingDisplay&&<div style={{display:'flex',gap:8,maxWidth:'88%',alignSelf:'flex-start'}}>
<div style={{width:32,height:32,borderRadius:10,background:'rgba(201,168,76,.15)',border:'1px solid rgba(201,168,76,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,alignSelf:'flex-start',marginTop:2}}><svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={C.gold} strokeWidth='1.5'><rect x='3' y='11' width='18' height='10' rx='2'/><circle cx='8.5' cy='15.5' r='1.5'/><circle cx='15.5' cy='15.5' r='1.5'/><path d='M12 3v4M8 7h8'/></svg></div>
<div style={{background:'rgba(201,168,76,.04)',borderRadius:14,padding:'12px 16px',border:'1px solid rgba(201,168,76,.08)',fontSize:13,color:'var(--tx2)',minWidth:0,overflow:'hidden'}}>
<RichText text={typingDisplay}/><span style={{display:'inline-block',width:2,height:14,background:C.gold,marginRight:2,animation:'blink 1s step-end infinite',verticalAlign:'middle'}}/>
</div></div>}

{loading&&<div style={{display:'flex',gap:8,alignSelf:'flex-start'}}>
<div style={{width:32,height:32,borderRadius:10,background:'rgba(201,168,76,.15)',border:'1px solid rgba(201,168,76,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={C.gold} strokeWidth='1.5'><rect x='3' y='11' width='18' height='10' rx='2'/><circle cx='8.5' cy='15.5' r='1.5'/><circle cx='15.5' cy='15.5' r='1.5'/><path d='M12 3v4'/></svg></div>
<div style={{background:'rgba(201,168,76,.04)',borderRadius:12,padding:'12px 16px',border:'1px solid rgba(201,168,76,.08)',display:'flex',alignItems:'center',gap:6}}>
<div style={{display:'flex',gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:C.gold,opacity:.4,animation:'breathe 1.2s ease-in-out infinite',animationDelay:i*.2+'s'}}/>)}</div>
<span style={{fontSize:11,color:'rgba(201,168,76,.5)'}}>{T('جاري التحليل...','Analyzing...')}</span>
</div></div>}
<div ref={msgEndRef}/>
</div>

{/* Input + Voice */}
<div style={{padding:'12px 16px',borderTop:'1px solid rgba(201,168,76,.08)',background:'var(--sb)',display:'flex',gap:8,alignItems:'center'}}>
{/* Voice button */}
<button onClick={toggleVoice} title={T('إملاء صوتي','Voice Input')} style={{width:44,height:44,borderRadius:12,border:listening?'2px solid rgba(192,57,43,.4)':'1.5px solid rgba(255,255,255,.1)',background:listening?'rgba(192,57,43,.1)':'rgba(255,255,255,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'.2s',animation:listening?'breathe 1s ease-in-out infinite':'none'}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={listening?C.red:'rgba(255,255,255,.35)'} strokeWidth="2" strokeLinecap="round"><rect x="9" y="1" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>
</button>
<input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}} placeholder={listening?T('🎤 تحدث الآن...','🎤 Speak now...'):T('اسأل مساعد جسر...','Ask Jisr AI...')} style={{flex:1,height:44,padding:'0 16px',border:'1.5px solid '+(listening?'rgba(192,57,43,.25)':'rgba(201,168,76,.15)'),borderRadius:12,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:listening?'rgba(192,57,43,.04)':'rgba(255,255,255,.04)',textAlign:isAr?'right':'left',transition:'.2s'}}/>
<button onClick={sendMessage} disabled={loading||!input.trim()} style={{height:44,padding:'0 20px',borderRadius:12,border:'1.5px solid rgba(201,168,76,.25)',background:'linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.08))',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:700,cursor:'pointer',opacity:(loading||!input.trim())?.5:1,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
{T('إرسال','Send')}</button>
</div>
</div>}

function ActivityLogPage({sb,lang,data,loading,onLoad}){
const T=(a,e)=>lang==='ar'?a:e;const isAr=lang!=='en';const F="'Cairo',sans-serif";const C={gold:'#c9a84c',ok:'#27a046',red:'#c0392b',blue:'#3483b4'}
const[logs,setLogs]=useState(data||[]);const[busy,setBusy]=useState(loading);const[filter,setFilter]=useState('all');const[q,setQ]=useState('')
useEffect(()=>{if(onLoad)onLoad();loadLogs()},[])
useEffect(()=>{setLogs(data||[]);setBusy(loading)},[data,loading])
const loadLogs=async()=>{setBusy(true);try{const{data:d}=await sb.from('activity_log').select('*,users:user_id(name_ar,name_en)').order('created_at',{ascending:false}).limit(500);setLogs(d||[])}catch(e){}setBusy(false)}
const actionMap={insert:{l:isAr?'إضافة':'Add',c:C.ok,ic:'＋'},update:{l:isAr?'تعديل':'Edit',c:C.blue,ic:'✎'},delete:{l:isAr?'حذف':'Delete',c:C.red,ic:'✕'},login:{l:isAr?'دخول':'Login',c:C.gold,ic:'→'}}
const entityMap={facilities:{l:isAr?'منشأة':'Facility',ic:'🏢',c:'#e67e22'},workers:{l:isAr?'عامل':'Worker',ic:'👤',c:C.blue},clients:{l:isAr?'عميل':'Client',ic:'👥',c:'#9b59b6'},invoices:{l:isAr?'فاتورة':'Invoice',ic:'📄',c:C.gold},transactions:{l:isAr?'معاملة':'Transaction',ic:'📋',c:'#1abc9c'},expenses:{l:isAr?'مصروف':'Expense',ic:'💰',c:C.red},brokers:{l:isAr?'وسيط':'Broker',ic:'🤝',c:'#e67e22'},users:{l:isAr?'مستخدم':'User',ic:'⚙',c:'#888'}}
const filtered=logs.filter(l=>{if(filter!=='all'&&l.action!==filter)return false;if(q&&!JSON.stringify(l).toLowerCase().includes(q.toLowerCase()))return false;return true})
const counts={all:logs.length,insert:logs.filter(l=>l.action==='insert').length,update:logs.filter(l=>l.action==='update').length,delete:logs.filter(l=>l.action==='delete').length}
// Group by day
const byDay={};filtered.forEach(l=>{const d=l.created_at?.slice(0,10)||'unknown';if(!byDay[d])byDay[d]=[];byDay[d].push(l)})
const dayName=(d)=>{const dt=new Date(d);return dt.toLocaleDateString(isAr?'ar-SA':'en-US',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
const timeStr=(t)=>{if(!t)return'';const dt=new Date(t);return dt.toLocaleTimeString(isAr?'ar-SA':'en-US',{hour:'2-digit',minute:'2-digit'})}
const fBtn=(v,l,n,c)=>({padding:'8px 16px',borderRadius:10,fontSize:11,fontWeight:filter===v?700:500,color:filter===v?(c||C.gold):'rgba(255,255,255,.35)',background:filter===v?(c||C.gold)+'12':'transparent',border:filter===v?'1.5px solid '+(c||C.gold)+'30':'1.5px solid rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',gap:6})
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:20,fontWeight:800,color:'var(--tx)'}}>{T('سجل النشاطات','Activity Log')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('تتبع جميع التغييرات في النظام','Track all system changes')}</div></div>
<button onClick={loadLogs} style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>{T('تحديث','Refresh')}</button>
</div>
{/* Stats badges */}
<div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
{[['all',T('إجمالي','Total'),counts.all,'#999'],['update',T('تعديل','Edit'),counts.update,C.blue],['insert',T('إضافة','Add'),counts.insert,C.ok],['delete',T('حذف','Delete'),counts.delete,C.red]].map(([v,l,n,c])=><div key={v} onClick={()=>setFilter(v)} style={fBtn(v,l,n,c)}>{l}: <span style={{fontWeight:800}}>{n}</span></div>)}
</div>
{/* Search */}
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={T('ابحث باسم المستخدم أو الكيان...','Search by user or entity...')} style={{width:'100%',height:42,padding:'0 18px',border:'1.5px solid rgba(255,255,255,.08)',borderRadius:12,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.03)',outline:'none',marginBottom:20}}/>
{busy?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:
filtered.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>{T('لا توجد سجلات','No logs')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:24}}>
{Object.entries(byDay).map(([day,items])=><div key={day}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:10,paddingBottom:6,borderBottom:'1px solid rgba(255,255,255,.05)'}}>{dayName(day)}</div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{items.map((log,i)=>{const act=actionMap[log.action]||{l:log.action,c:'#999',ic:'•'};const ent=entityMap[log.entity_type]||{l:log.entity_type||'—',ic:'•',c:'#999'};const userName=isAr?log.users?.name_ar:log.users?.name_en||log.users?.name_ar||'—';const initials=userName?userName.split(' ').map(w=>w[0]).join('').slice(0,2):'?'
return<div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',background:'var(--bg)',borderRadius:14,border:'1px solid rgba(255,255,255,.04)'}}>
{/* Avatar */}
<div style={{width:40,height:40,borderRadius:12,background:'rgba(201,168,76,.08)',border:'1px solid rgba(201,168,76,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:C.gold,flexShrink:0}}>{initials}</div>
{/* Entity icon */}
<div style={{width:32,height:32,borderRadius:8,background:ent.c+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{ent.ic}</div>
{/* Content */}
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{userName}</span>
<span style={{fontSize:10,fontWeight:600,padding:'2px 10px',borderRadius:6,background:act.c+'15',color:act.c}}>{act.l}</span>
<span style={{fontSize:10,fontWeight:600,padding:'2px 10px',borderRadius:6,background:'rgba(255,255,255,.05)',color:'var(--tx3)'}}>{ent.l}</span>
</div>
<div style={{fontSize:12,color:'var(--tx4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.description||log.entity_name||'—'}</div>
{log.changes&&<div style={{fontSize:10,color:'rgba(201,168,76,.4)',marginTop:3,cursor:'pointer'}}>{T('اضغط لعرض التغييرات','Click to view changes')}</div>}
</div>
{/* Time */}
<div style={{fontSize:11,color:'var(--tx5)',flexShrink:0,textAlign:'left',direction:'ltr'}}>{timeStr(log.created_at)}</div>
</div>})}
</div>
</div>)}
</div>}
</div>}

function TasksPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e;const isAr=lang!=='en'
const C={gold:'#c9a84c',ok:'#27a046',red:'#c0392b',blue:'#3483b4'}
const[tasks,setTasks]=useState([]);const[templates,setTemplates]=useState([]);const[loading,setLoading]=useState(true)
const[filter,setFilter]=useState('all');const[catFilter,setCatFilter]=useState('all')
const[typeTab,setTypeTab]=useState('all')
const[users,setUsers]=useState([])
const[adhocPop,setAdhocPop]=useState(false);const[adhocForm,setAdhocForm]=useState({});const[saving,setSaving]=useState(false)
const[escPop,setEscPop]=useState(null);const[escReason,setEscReason]=useState('')
const load=useCallback(async()=>{setLoading(true);const[t,tmpl,u]=await Promise.all([sb.from('tasks').select('*,assigned:assigned_to(name_ar)').order('due_date').order('priority'),sb.from('task_templates').select('*').eq('is_active',true).order('recurrence').order('title_ar'),sb.from('users').select('id,name_ar').is('deleted_at',null)]);setTasks(t.data||[]);setTemplates(tmpl.data||[]);setUsers(u.data||[]);setLoading(false)},[sb])
useEffect(()=>{load()},[load])
const nm=v=>Number(v||0).toLocaleString('en-US')
const complete=async(id)=>{await sb.from('tasks').update({status:'completed',completed_date:new Date().toISOString().slice(0,10),updated_at:new Date().toISOString()}).eq('id',id);toast(T('تم الإنجاز','Completed'));load()}
const skip=async(id)=>{await sb.from('tasks').update({status:'skipped',updated_at:new Date().toISOString()}).eq('id',id);toast(T('تم التخطي','Skipped'));load()}
const assign=async(id,uid)=>{await sb.from('tasks').update({assigned_to:uid||null,updated_at:new Date().toISOString()}).eq('id',id);load()}
const genNow=async()=>{await sb.rpc('weekly_update');toast(T('تم التحديث الأسبوعي','Weekly update done'));load()}
// Add adhoc task
const saveAdhoc=async()=>{setSaving(true);try{await sb.from('tasks').insert({title_ar:adhocForm.title||'مهمة جديدة',description:adhocForm.desc||null,category:adhocForm.category||'general',priority:adhocForm.priority||'normal',status:'pending',task_type:'adhoc',due_date:adhocForm.due_date||new Date().toISOString().slice(0,10),assigned_to:adhocForm.assigned_to||null,created_by:user?.id});toast(T('تم إضافة المهمة','Task added'));setAdhocPop(false);load()}catch(e){toast('خطأ')}setSaving(false)}
// Escalate task
const escalateTask=async(taskId)=>{if(!escReason.trim()){toast(T('اكتب سبب التصعيد','Enter reason'));return}
try{const{data:superiors}=await sb.from('users').select('id,name_ar,roles:role_id(escalation_level)').is('deleted_at',null).gt('roles.escalation_level',1);const toUser=superiors?.find(s=>s.roles?.escalation_level>1)
await sb.from('escalations').insert({entity_type:'task',entity_id:taskId,from_user_id:user?.id,to_user_id:toUser?.id||null,reason:escReason,priority:'high',created_by:user?.id})
if(toUser){await sb.from('employee_notifications').insert({user_id:toUser.id,type:'escalation',title:'تصعيد مهمة',body:escReason,priority:'high',entity_type:'task',entity_id:taskId})}
toast(T('تم التصعيد','Escalated'));setEscPop(null);setEscReason('')}catch(e){toast('خطأ')}}
const cats=[{v:'all',l:T('الكل','All'),c:'#999'},{v:'nitaqat',l:T('نطاقات','Nitaqat'),c:C.gold},{v:'workers',l:T('عمالة','Workers'),c:C.blue},{v:'finance',l:T('مالية','Finance'),c:C.ok},{v:'facilities',l:T('منشآت','Facilities'),c:'#e67e22'},{v:'platforms',l:T('منصات','Platforms'),c:'#9b59b6'},{v:'reports',l:T('تقارير','Reports'),c:'#1abc9c'},{v:'admin',l:T('إدارة','Admin'),c:'#888'}]
const fBtnS=a=>({padding:'5px 12px',borderRadius:6,fontSize:10,fontWeight:a?700:500,color:a?C.gold:'rgba(255,255,255,.4)',background:a?'rgba(201,168,76,.08)':'transparent',border:a?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'})
const stClr={pending:C.gold,in_progress:C.blue,completed:C.ok,overdue:C.red,skipped:'#888'}
const priClr={high:C.red,urgent:C.red,normal:C.gold,low:'#888'}
let filtered=tasks.filter(t=>{if(filter!=='all'&&t.status!==filter)return false;if(catFilter!=='all'&&t.category!==catFilter)return false;if(typeTab!=='all'&&t.task_type!==typeTab)return false;return true})
const pendingCount=tasks.filter(t=>t.status==='pending').length
const overdueCount=tasks.filter(t=>t.status==='overdue').length
const completedCount=tasks.filter(t=>t.status==='completed').length
const todayTasks=tasks.filter(t=>t.due_date===new Date().toISOString().slice(0,10)&&t.status!=='completed'&&t.status!=='skipped')
const recurringCount=tasks.filter(t=>t.task_type==='recurring').length
const adhocCount=tasks.filter(t=>t.task_type==='adhoc').length
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('المهام','Tasks')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('المهام الدورية والطارئة','Recurring & ad-hoc tasks')}</div></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setAdhocForm({title:'',desc:'',category:'general',priority:'normal',due_date:new Date().toISOString().slice(0,10),assigned_to:''});setAdhocPop(true)}} style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(52,131,180,.2)',background:'rgba(52,131,180,.08)',color:C.blue,fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>+ {T('مهمة طارئة','Ad-hoc Task')}</button>
<button onClick={genNow} style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>{T('تحديث','Update')}</button>
</div></div>
{/* Type tabs */}
<div style={{display:'flex',gap:4,marginBottom:14}}>
{[{v:'all',l:T('الكل','All'),n:tasks.length,c:'#999'},{v:'recurring',l:T('دورية','Recurring'),n:recurringCount,c:C.gold},{v:'adhoc',l:T('طارئة','Ad-hoc'),n:adhocCount,c:C.blue}].map(t=><div key={t.v} onClick={()=>setTypeTab(t.v)} style={{padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:typeTab===t.v?700:500,color:typeTab===t.v?t.c:'rgba(255,255,255,.4)',background:typeTab===t.v?t.c+'12':'transparent',border:typeTab===t.v?'1.5px solid '+t.c+'30':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{t.l} <span style={{fontSize:9,opacity:.6}}>({t.n})</span></div>)}
</div>
{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))',gap:10,marginBottom:18}}>
<div style={{padding:'14px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)'}}><div style={{fontSize:10,color:C.gold,opacity:.7,marginBottom:6}}>{T('معلّقة','Pending')}</div><div style={{fontSize:26,fontWeight:800,color:C.gold}}>{pendingCount}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.1)'}}><div style={{fontSize:10,color:C.red,opacity:.7,marginBottom:6}}>{T('متأخرة','Overdue')}</div><div style={{fontSize:26,fontWeight:800,color:C.red}}>{overdueCount}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)'}}><div style={{fontSize:10,color:C.ok,opacity:.7,marginBottom:6}}>{T('مكتملة','Done')}</div><div style={{fontSize:26,fontWeight:800,color:C.ok}}>{completedCount}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(52,131,180,.06)',border:'1px solid rgba(52,131,180,.1)'}}><div style={{fontSize:10,color:C.blue,opacity:.7,marginBottom:6}}>{T('اليوم','Today')}</div><div style={{fontSize:26,fontWeight:800,color:C.blue}}>{todayTasks.length}</div></div>
</div>
{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
<div style={{display:'flex',gap:4}}>{[{v:'all',l:T('الكل','All')},{v:'pending',l:T('معلّقة','Pending')},{v:'overdue',l:T('متأخرة','Overdue')},{v:'completed',l:T('مكتملة','Done')}].map(f=><div key={f.v} onClick={()=>setFilter(f.v)} style={fBtnS(filter===f.v)}>{f.l}</div>)}</div>
<div style={{display:'flex',gap:3}}>{cats.map(c=><div key={c.v} onClick={()=>setCatFilter(c.v)} style={{padding:'4px 10px',borderRadius:6,fontSize:9,fontWeight:catFilter===c.v?700:500,color:catFilter===c.v?c.c:'rgba(255,255,255,.35)',background:catFilter===c.v?c.c+'12':'transparent',border:catFilter===c.v?'1px solid '+c.c+'25':'1px solid rgba(255,255,255,.05)',cursor:'pointer'}}>{c.l}</div>)}</div>
</div>
{/* Task list */}
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:filtered.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)'}}>{T('لا توجد مهام','No tasks')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{filtered.map(t=>{const sc=stClr[t.status]||'#999';const pc=priClr[t.priority]||C.gold;const catObj=cats.find(c=>c.v===t.category);const daysLeft=Math.ceil((new Date(t.due_date)-new Date())/86400000);const isToday=daysLeft===0;const isPast=daysLeft<0
return<div key={t.id} style={{background:'var(--bg)',border:'1px solid '+(t.status==='overdue'?'rgba(192,57,43,.15)':'var(--bd)'),borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
{/* Complete button */}
{t.status!=='completed'&&t.status!=='skipped'?<div onClick={e=>{e.stopPropagation();complete(t.id)}} style={{width:28,height:28,borderRadius:8,border:'2px solid '+sc+'40',background:sc+'08',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} title={T('إنجاز','Complete')}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={sc} strokeWidth="3" opacity=".3"><polyline points="20 6 9 17 4 12"/></svg>
</div>:<div style={{width:28,height:28,borderRadius:8,background:sc+'15',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={sc} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
</div>}
{/* Content */}
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
<span style={{fontSize:13,fontWeight:700,color:t.status==='completed'?'var(--tx5)':'var(--tx2)',textDecoration:t.status==='completed'?'line-through':'none'}}>{t.title_ar}</span>
{catObj&&catObj.v!=='all'&&<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:catObj.c+'12',color:catObj.c}}>{catObj.l}</span>}
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:pc+'12',color:pc}}>{t.priority}</span>
</div>
{t.description&&<div style={{fontSize:11,color:'var(--tx5)',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.description}</div>}
<div style={{display:'flex',gap:8,alignItems:'center'}}>
{t.assigned?.name_ar&&<span style={{fontSize:10,color:C.blue}}>{t.assigned.name_ar}</span>}
<select value={t.assigned_to||''} onChange={e=>assign(t.id,e.target.value)} onClick={e=>e.stopPropagation()} style={{height:22,padding:'0 6px',borderRadius:4,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:'var(--tx5)',fontFamily:"'Cairo',sans-serif",fontSize:9,outline:'none',cursor:'pointer'}}>
<option value="">{T('تعيين','Assign')}</option>
{users.map(u=><option key={u.id} value={u.id}>{u.name_ar}</option>)}
</select>
</div>
</div>
{/* Due date */}
<div style={{textAlign:'center',flexShrink:0,minWidth:50}}>
<div style={{fontSize:9,color:isPast?C.red:isToday?C.gold:'var(--tx5)'}}>{t.due_date?.slice(5)}</div>
<div style={{fontSize:12,fontWeight:800,color:isPast?C.red:isToday?C.gold:'var(--tx4)'}}>{isPast?daysLeft+T('ي','d'):isToday?T('اليوم','Today'):'+'+daysLeft+T('ي','d')}</div>
</div>
{/* Skip + Escalate */}
{t.status!=='completed'&&t.status!=='skipped'&&<div style={{display:'flex',gap:3,flexShrink:0}}>
<div onClick={e=>{e.stopPropagation();skip(t.id)}} style={{width:24,height:24,borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}} title={T('تخطي','Skip')}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2"><path d="M5 4h4l10 8-10 8H5l10-8z"/></svg></div>
<div onClick={e=>{e.stopPropagation();setEscPop(t.id)}} style={{width:24,height:24,borderRadius:6,border:'1px solid rgba(230,126,34,.15)',background:'rgba(230,126,34,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}} title={T('تصعيد','Escalate')}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg></div>
</div>}
</div>})}
</div>}
{/* Templates section */}
<div style={{marginTop:24,borderTop:'1px solid var(--bd)',paddingTop:18}}>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx3)',marginBottom:12}}>{T('القوالب المجدولة','Scheduled Templates')} <span style={{fontSize:11,color:'var(--tx5)',fontWeight:500}}>({templates.length})</span></div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:8}}>
{templates.map(t=>{const catObj=cats.find(c=>c.v===t.category);return<div key={t.id} style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:10}}>
<div style={{width:32,height:32,borderRadius:8,background:(catObj?.c||'#999')+'10',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={catObj?.c||'#999'} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title_ar}</div>
<div style={{display:'flex',gap:6,alignItems:'center',marginTop:3}}>
<span style={{fontSize:9,color:(catObj?.c||'#999'),background:(catObj?.c||'#999')+'10',padding:'1px 6px',borderRadius:3}}>{catObj?.l||t.category}</span>
<span style={{fontSize:9,color:'var(--tx5)'}}>{t.recurrence==='weekly'?T('أسبوعي','Weekly'):T('شهري','Monthly')}</span>
<span style={{fontSize:9,color:'var(--tx5)'}}>{t.estimated_minutes} {T('دقيقة','min')}</span>
</div>
</div>
</div>})}
</div>
</div>
{/* Adhoc task popup */}
{adhocPop&&<div onClick={()=>setAdhocPop(false)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(500px,96vw)',maxHeight:'80vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.blue+' 30%,#6eb5e0 50%,'+C.blue+' 70%,transparent)'}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:15,fontWeight:700,color:'var(--tx)',display:'flex',justifyContent:'space-between'}}><span>{T('مهمة طارئة جديدة','New Ad-hoc Task')}</span><button onClick={()=>setAdhocPop(false)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>
<div style={{padding:'18px 22px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('عنوان المهمة','Title')}</div><input value={adhocForm.title||''} onChange={e=>setAdhocForm(p=>({...p,title:e.target.value}))} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.07)',outline:'none'}}/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الأولوية','Priority')}</div><select value={adhocForm.priority||'normal'} onChange={e=>setAdhocForm(p=>({...p,priority:e.target.value}))} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.07)',outline:'none'}}><option value="low">{T('منخفضة','Low')}</option><option value="normal">{T('عادية','Normal')}</option><option value="high">{T('عالية','High')}</option><option value="urgent">{T('عاجلة','Urgent')}</option></select></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('التاريخ','Date')}</div><input type="date" value={adhocForm.due_date||''} onChange={e=>setAdhocForm(p=>({...p,due_date:e.target.value}))} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.07)',outline:'none',direction:'ltr'}}/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('التصنيف','Category')}</div><select value={adhocForm.category||'general'} onChange={e=>setAdhocForm(p=>({...p,category:e.target.value}))} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.07)',outline:'none'}}>{cats.filter(c=>c.v!=='all').map(c=><option key={c.v} value={c.v}>{c.l}</option>)}</select></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('المسؤول','Assign')}</div><select value={adhocForm.assigned_to||''} onChange={e=>setAdhocForm(p=>({...p,assigned_to:e.target.value}))} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.07)',outline:'none'}}><option value="">{T('بدون','None')}</option>{users.map(u=><option key={u.id} value={u.id}>{u.name_ar}</option>)}</select></div>
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الوصف','Description')}</div><textarea value={adhocForm.desc||''} onChange={e=>setAdhocForm(p=>({...p,desc:e.target.value}))} rows={2} style={{width:'100%',height:'auto',padding:12,border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.07)',outline:'none',resize:'vertical'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={saveAdhoc} disabled={saving} style={{height:40,padding:'0 20px',borderRadius:8,border:'1px solid rgba(52,131,180,.2)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('إضافة','Add')}</button>
<button onClick={()=>setAdhocPop(false)} style={{height:40,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
{/* Escalation popup */}
{escPop&&<div onClick={()=>setEscPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(420px,96vw)',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid rgba(230,126,34,.15)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,#e67e22 30%,#f0a050 50%,#e67e22 70%,transparent)'}}/>
<div style={{padding:'16px 22px',fontSize:15,fontWeight:700,color:'var(--tx)'}}>{T('تصعيد المهمة','Escalate Task')}</div>
<div style={{padding:'0 22px 18px'}}><div style={{fontSize:11,color:'var(--tx4)',marginBottom:8}}>{T('سبب التصعيد','Reason')}</div>
<textarea value={escReason} onChange={e=>setEscReason(e.target.value)} rows={3} placeholder={T('اكتب سبب التصعيد بالتفصيل...','Describe the reason...')} style={{width:'100%',padding:12,border:'1.5px solid rgba(230,126,34,.15)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',resize:'vertical'}}/>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={()=>escalateTask(escPop)} style={{height:38,padding:'0 20px',borderRadius:8,border:'1px solid rgba(230,126,34,.2)',background:'rgba(230,126,34,.1)',color:'#e67e22',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer'}}>⬆ {T('تصعيد','Escalate')}</button>
<button onClick={()=>setEscPop(null)} style={{height:38,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}

/* ChatPage removed */

function AppointmentsPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e;const[data,setData]=useState([]);const[loading,setLoading]=useState(true);const[pop,setPop]=useState(null);
const[f,setF]=useState({title:'',type:'client_visit',date:new Date().toISOString().slice(0,10),time:'09:00',client_id:'',worker_id:'',assigned_to:'',location:'',notes:'',status:'scheduled'});
const load=useCallback(async()=>{setLoading(true);const{data:d}=await sb.from('appointments').select('*,clients:client_id(name_ar),workers:worker_id(name_ar),users:assigned_to(name_ar)').is('deleted_at',null).order('date',{ascending:true}).order('time',{ascending:true});setData(d||[]);setLoading(false)},[sb]);
useEffect(()=>{load()},[load]);
const save=async()=>{if(!f.title||!f.date){toast(T('خطأ: العنوان والتاريخ مطلوبين','Error: Title and date required'));return}
const row={...f,created_by:user?.id};delete row.clients;delete row.workers;delete row.users;
if(pop==='new'){const{error}=await sb.from('appointments').insert(row);if(error){toast('خطأ: '+error.message);return}}
else{const{error}=await sb.from('appointments').update(row).eq('id',pop);if(error){toast('خطأ: '+error.message);return}}
toast(T('تم الحفظ','Saved'));setPop(null);load()};
const typeLabels={client_visit:T('زيارة عميل','Client Visit'),passport_office:T('الجوازات','Passports'),insurance:T('التأمينات','Insurance'),jawazat:T('الجوازات','Jawazat'),labor_office:T('مكتب العمل','Labor Office'),gosi:T('التأمينات الاجتماعية','GOSI'),court:T('محكمة','Court'),other:T('أخرى','Other')};
const statusColors={scheduled:C.gold,confirmed:C.blue,completed:C.ok,cancelled:C.red,no_show:'#e67e22'};
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'};
return<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>{T('المواعيد','Appointments')}</div>
<button onClick={()=>{setF({title:'',type:'client_visit',date:new Date().toISOString().slice(0,10),time:'09:00',client_id:'',worker_id:'',assigned_to:'',location:'',notes:'',status:'scheduled'});setPop('new')}} style={{height:36,padding:'0 18px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>+ {T('موعد جديد','New')}</button>
</div>
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:
data.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>{T('لا توجد مواعيد','No appointments')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:8}}>{data.map(a=>{const isToday=a.date===new Date().toISOString().slice(0,10);const isPast=new Date(a.date)<new Date(new Date().toISOString().slice(0,10));
return<div key={a.id} onClick={()=>{setF({...a});setPop(a.id)}} style={{padding:'12px 16px',borderRadius:12,background:isToday?'rgba(201,168,76,.04)':'var(--bg)',border:'1px solid '+(isToday?'rgba(201,168,76,.15)':'var(--bd)'),cursor:'pointer',display:'flex',gap:12,alignItems:'center',opacity:isPast&&a.status!=='completed'?.6:1}}>
<div style={{textAlign:'center',minWidth:50}}><div style={{fontSize:18,fontWeight:800,color:isToday?C.gold:'var(--tx2)'}}>{a.date?.slice(8,10)}</div><div style={{fontSize:9,color:'var(--tx4)'}}>{new Date(a.date+'T00:00').toLocaleDateString(lang==='ar'?'ar-SA':'en',{month:'short'})}</div></div>
<div style={{width:3,height:36,borderRadius:2,background:statusColors[a.status]||C.gold,flexShrink:0}}/>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{a.title}</div><div style={{fontSize:11,color:'var(--tx4)',display:'flex',gap:8,flexWrap:'wrap'}}>{a.time&&<span>{a.time?.slice(0,5)}</span>}<span>{typeLabels[a.type]||a.type}</span>{a.clients?.name_ar&&<span>{a.clients.name_ar}</span>}{a.location&&<span>{a.location}</span>}</div></div>
<span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:6,background:(statusColors[a.status]||'#999')+'15',color:statusColors[a.status]||'#999'}}>{a.status}</span>
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
if(pop==='new'){const{error}=await sb.from('operational_expenses').insert(row);if(error){toast('خطأ: '+error.message);return}}
else{const{error}=await sb.from('operational_expenses').update(row).eq('id',pop);if(error){toast('خطأ: '+error.message);return}}
toast(T('تم الحفظ','Saved'));setPop(null);load()};
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'};
return<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>{T('المصاريف التشغيلية','Operational Expenses')}</div>
<div style={{display:'flex',gap:8,alignItems:'center'}}>
<input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:'inherit',fontSize:12}}/>
<div style={{padding:'6px 14px',borderRadius:8,background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.12)',fontSize:12,fontWeight:700,color:C.red}}>{T('الإجمالي','Total')}: {Number(total).toLocaleString()} {T('ر.س','SAR')}</div>
<button onClick={()=>exportToExcel(data,[['date',T('التاريخ','Date')],['category',T('التصنيف','Category')],['amount',T('المبلغ','Amount')],['description',T('الوصف','Description')],['vendor_name',T('المورد','Vendor')]],'expenses_'+month)} style={{height:34,padding:'0 14px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx3)',fontFamily:'inherit',fontSize:11,fontWeight:600,cursor:'pointer'}}>Excel ↓</button>
<button onClick={()=>{setF({amount:'',category:'other',description:'',date:new Date().toISOString().slice(0,10),payment_method:'cash',vendor_name:'',is_recurring:false});setPop('new')}} style={{height:36,padding:'0 18px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,cursor:'pointer'}}>+ {T('مصروف','New')}</button>
</div></div>
{/* Stats cards */}
{(()=>{const catTotals={};data.forEach(r=>{catTotals[r.category]=(catTotals[r.category]||0)+Number(r.amount||0)});const topCat=Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];const catColors={rent:C.gold,salary:C.blue,gov_fee:C.red,transport:'#9b59b6',utilities:'#e67e22',maintenance:'#1abc9c',other:'#888'}
return<>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
<div style={{padding:'12px 14px',borderRadius:12,background:C.red+'08',border:'1px solid '+C.red+'15',textAlign:'center'}}>
<div style={{fontSize:9,color:C.red,marginBottom:4}}>{T('إجمالي الشهر','Month Total')}</div><div style={{fontSize:20,fontWeight:800,color:C.red}}>{Number(total).toLocaleString()}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{T('ر.س','SAR')}</div></div>
<div style={{padding:'12px 14px',borderRadius:12,background:C.gold+'08',border:'1px solid '+C.gold+'15',textAlign:'center'}}>
<div style={{fontSize:9,color:C.gold,marginBottom:4}}>{T('عدد المصاريف','Count')}</div><div style={{fontSize:20,fontWeight:800,color:C.gold}}>{data.length}</div></div>
<div style={{padding:'12px 14px',borderRadius:12,background:C.blue+'08',border:'1px solid '+C.blue+'15',textAlign:'center'}}>
<div style={{fontSize:9,color:C.blue,marginBottom:4}}>{T('الأعلى صرفاً','Top Category')}</div><div style={{fontSize:14,fontWeight:800,color:C.blue}}>{topCat?cats[topCat[0]]||topCat[0]:'—'}</div>{topCat&&<div style={{fontSize:9,color:'var(--tx5)'}}>{Number(topCat[1]).toLocaleString()}</div>}</div>
<div style={{padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',textAlign:'center'}}>
<div style={{fontSize:9,color:'var(--tx4)',marginBottom:4}}>{T('المتوسط','Average')}</div><div style={{fontSize:20,fontWeight:800,color:'var(--tx3)'}}>{data.length>0?Number(Math.round(total/data.length)).toLocaleString():'0'}</div></div>
</div>
{/* Category breakdown chips */}
{Object.keys(catTotals).length>0&&<div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
{Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{const c=catColors[k]||'#888';return<div key={k} style={{padding:'6px 12px',borderRadius:8,background:c+'08',border:'1px solid '+c+'15',display:'flex',alignItems:'center',gap:6}}>
<span style={{width:4,height:4,borderRadius:'50%',background:c}}/>
<span style={{fontSize:10,fontWeight:600,color:c}}>{cats[k]||k}</span>
<span style={{fontSize:10,fontWeight:800,color:c}}>{Number(v).toLocaleString()}</span>
</div>})}
</div>}
</>})()}
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:data.length===0?
<div style={{textAlign:'center',padding:'50px 20px',background:'var(--bg)',borderRadius:12,border:'1px solid var(--bd)'}}>
<div style={{fontSize:32,marginBottom:10}}>📊</div>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx4)'}}>{T('لم تُسجّل مصاريف لشهر '+new Date(month+'-01').toLocaleDateString('ar-SA',{year:'numeric',month:'long'}),'No expenses for this month')}</div>
<div style={{fontSize:11,color:'var(--tx5)',marginTop:4}}>{T('أضف أول مصروف باستخدام الزر أعلاه','Add your first expense using the button above')}</div>
</div>:
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('التاريخ','Date'),T('التصنيف','Category'),T('الوصف','Description'),T('المورد','Vendor'),T('المبلغ','Amount')].map(h=><th key={h} style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--tx3)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{data.map(r=>{const cc={rent:C.gold,salary:C.blue,gov_fee:C.red,transport:'#9b59b6',utilities:'#e67e22',other:'#888'}[r.category]||'#888';return<tr key={r.id} onClick={()=>{setF({...r});setPop(r.id)}} style={{cursor:'pointer',borderBottom:'1px solid var(--bd2)'}}><td style={{padding:'10px 12px',fontSize:11,color:'var(--tx4)'}}>{r.date?new Date(r.date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}):'—'}</td><td style={{padding:'10px 12px'}}><span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:5,background:cc+'12',color:cc}}>{cats[r.category]||r.category}</span></td><td style={{padding:'10px 12px',fontSize:12,color:'var(--tx2)'}}>{r.description||'—'}</td><td style={{padding:'10px 12px',fontSize:11,color:'var(--tx4)'}}>{r.vendor_name||'—'}</td><td style={{padding:'10px 12px',fontSize:13,fontWeight:700,color:C.red,direction:'ltr',textAlign:'left'}}>{Number(r.amount).toLocaleString()}</td></tr>})}</tbody>
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

function ClientStatementPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e;const[clients,setClients]=useState([]);const[sel,setSel]=useState(null);const[invoices,setInvoices]=useState([]);const[payments,setPayments]=useState([]);const[loading,setLoading]=useState(false);
useEffect(()=>{sb.from('clients').select('id,name_ar,phone,rating').is('deleted_at',null).order('name_ar').then(({data})=>setClients(data||[]))},[sb]);
const loadStatement=async(cid)=>{setSel(cid);setLoading(true);
const{data:inv}=await sb.from('invoices').select('*').eq('client_id',cid).is('deleted_at',null).order('created_at');
const{data:pay}=await sb.from('payments').select('*').is('deleted_at',null);
setInvoices(inv||[]);setPayments(pay||[]);setLoading(false)};
const rows=sel?generateClientStatement(clients.find(c=>c.id===sel),invoices,payments,lang):[];
const client=clients.find(c=>c.id===sel);
return<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>{T('كشف حساب عميل','Client Statement')}</div>
<div style={{display:'flex',gap:8,alignItems:'center'}}>
<select value={sel||''} onChange={e=>loadStatement(e.target.value)} style={{height:36,padding:'0 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:'inherit',fontSize:12,minWidth:200}}>
<option value="">{T('اختر عميل...','Select client...')}</option>
{clients.map(c=><option key={c.id} value={c.id}>{c.name_ar} {c.rating?'★'.repeat(c.rating):''}</option>)}
</select>
{sel&&<button onClick={()=>{const cl=client;const html='<table><thead><tr><th>التاريخ</th><th>النوع</th><th>المرجع</th><th>مدين</th><th>دائن</th><th>الرصيد</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r.date+'</td><td>'+r.type+'</td><td>'+r.ref+'</td><td>'+(r.debit?Number(r.debit).toLocaleString():'')+'</td><td>'+(r.credit?Number(r.credit).toLocaleString():'')+'</td><td>'+Number(r.balance).toLocaleString()+'</td></tr>').join('')+'</tbody></table>';printContent('كشف حساب — '+(cl?.name_ar||''),html,lang)}} style={{height:36,padding:'0 14px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx3)',fontFamily:'inherit',fontSize:11,fontWeight:600,cursor:'pointer'}}>🖨 {T('طباعة','Print')}</button>}
{sel&&<button onClick={()=>exportToExcel(rows,[['date',T('التاريخ','Date')],['type',T('النوع','Type')],['ref',T('المرجع','Ref')],['debit',T('مدين','Debit')],['credit',T('دائن','Credit')],['balance',T('الرصيد','Balance')]],'statement_'+client?.name_ar)} style={{height:36,padding:'0 14px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx3)',fontFamily:'inherit',fontSize:11,fontWeight:600,cursor:'pointer'}}>Excel ↓</button>}
</div></div>
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:
sel&&rows.length>0?<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<div style={{padding:'12px 16px',borderBottom:'1px solid var(--bd)',display:'flex',justifyContent:'space-between'}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{client?.name_ar}</span>
<span style={{fontSize:13,fontWeight:800,color:rows[rows.length-1]?.balance>0?C.red:C.ok,direction:'ltr'}}>{T('الرصيد:','Balance:')} {Number(rows[rows.length-1]?.balance||0).toLocaleString()} {T('ر.س','SAR')}</span>
</div>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('التاريخ','Date'),T('النوع','Type'),T('المرجع','Ref'),T('مدين','Debit'),T('دائن','Credit'),T('الرصيد','Balance')].map(h=><th key={h} style={{padding:'8px 12px',fontSize:11,fontWeight:700,color:'var(--tx3)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{rows.map((r,i)=><tr key={i} style={{borderBottom:'1px solid var(--bd2)'}}><td style={{padding:'8px 12px',fontSize:11,color:'var(--tx4)'}}>{r.date}</td><td style={{padding:'8px 12px',fontSize:11,fontWeight:600,color:r.type.includes('فاتورة')?C.red:C.ok}}>{r.type}</td><td style={{padding:'8px 12px',fontSize:11,color:'var(--tx4)'}}>{r.ref}</td><td style={{padding:'8px 12px',fontSize:12,fontWeight:600,color:C.red,direction:'ltr',textAlign:'left'}}>{r.debit?Number(r.debit).toLocaleString():''}</td><td style={{padding:'8px 12px',fontSize:12,fontWeight:600,color:C.ok,direction:'ltr',textAlign:'left'}}>{r.credit?Number(r.credit).toLocaleString():''}</td><td style={{padding:'8px 12px',fontSize:12,fontWeight:700,direction:'ltr',textAlign:'left'}}>{Number(r.balance).toLocaleString()}</td></tr>)}</tbody>
</table></div>:sel?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>{T('لا توجد حركات','No transactions')}</div>:
<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>{T('اختر عميل لعرض كشف حسابه','Select a client to view statement')}</div>}
</div>}

function ApprovalsPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e;const[data,setData]=useState([]);const[loading,setLoading]=useState(true);const[filter,setFilter]=useState('pending');
const load=useCallback(async()=>{setLoading(true);let q=sb.from('approval_requests').select('*,requester:requested_by(name_ar),decider:decision_by(name_ar)').order('created_at',{ascending:false});if(filter!=='all')q=q.eq('status',filter);const{data:d}=await q.limit(100);setData(d||[]);setLoading(false)},[sb,filter]);
useEffect(()=>{load()},[load]);
const decide=async(id,status)=>{const notes=prompt(T('ملاحظات (اختياري):','Notes (optional):'));
await sb.from('approval_requests').update({status,decision_by:user?.id,decision_at:new Date().toISOString(),decision_notes:notes||null,updated_at:new Date().toISOString()}).eq('id',id);
toast(status==='approved'?T('تمت الموافقة','Approved'):T('تم الرفض','Rejected'));load()};
const typeLabels={delete_invoice:T('حذف فاتورة','Delete Invoice'),cancel_invoice:T('إلغاء فاتورة','Cancel Invoice'),apply_discount:T('تطبيق خصم','Apply Discount'),large_payment:T('صرف مبلغ كبير','Large Payment'),delete_transaction:T('حذف معاملة','Delete Transaction'),refund:T('استرداد','Refund'),write_off:T('إعدام دين','Write Off'),other:T('أخرى','Other')};
const statusColors={pending:C.gold,approved:C.ok,rejected:C.red,cancelled:'#999'};
return<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>{T('طلبات الموافقة','Approval Requests')}</div>
<div style={{display:'flex',gap:4}}>{['pending','approved','rejected','all'].map(s=><button key={s} onClick={()=>setFilter(s)} style={{height:32,padding:'0 14px',borderRadius:8,border:'1px solid '+(filter===s?'rgba(201,168,76,.2)':'var(--bd)'),background:filter===s?'rgba(201,168,76,.08)':'transparent',color:filter===s?C.gold:'var(--tx4)',fontFamily:'inherit',fontSize:11,fontWeight:filter===s?700:500,cursor:'pointer'}}>{s==='pending'?T('معلق','Pending'):s==='approved'?T('موافق','Approved'):s==='rejected'?T('مرفوض','Rejected'):T('الكل','All')}</button>)}</div>
</div>
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:
data.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>{T('لا توجد طلبات','No requests')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:8}}>{data.map(r=><div key={r.id} style={{padding:'14px 16px',borderRadius:12,background:'var(--bg)',border:'1px solid var(--bd)',display:'flex',gap:12,alignItems:'center'}}>
<div style={{width:40,height:40,borderRadius:10,background:(statusColors[r.status]||'#999')+'12',border:'1px solid '+(statusColors[r.status]||'#999')+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{r.priority==='urgent'?'⚡':r.priority==='high'?'▲':'○'}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{typeLabels[r.action_type]||r.action_type}</div>
<div style={{fontSize:11,color:'var(--tx4)',marginTop:2}}>{r.description}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:4,display:'flex',gap:8}}><span>{T('بواسطة:','By:')} {r.requester?.name_ar||'—'}</span><span>{new Date(r.created_at).toLocaleDateString('ar-SA')}</span>{r.amount&&<span style={{fontWeight:700}}>{Number(r.amount).toLocaleString()} {T('ر.س','SAR')}</span>}</div>
</div>
<span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:6,background:(statusColors[r.status]||'#999')+'15',color:statusColors[r.status]||'#999',flexShrink:0}}>{r.status}</span>
{r.status==='pending'&&<div style={{display:'flex',gap:4,flexShrink:0}}>
<button onClick={()=>decide(r.id,'approved')} style={{width:32,height:32,borderRadius:8,background:'rgba(39,160,70,.1)',border:'1px solid rgba(39,160,70,.2)',color:C.ok,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>✓</button>
<button onClick={()=>decide(r.id,'rejected')} style={{width:32,height:32,borderRadius:8,background:'rgba(192,57,43,.1)',border:'1px solid rgba(192,57,43,.2)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>✕</button>
</div>}
</div>)}</div>}
</div>}



function Logo({size=60,style:sx}){const s=size*.6;const fs=Math.max(5,size*.08);return<div style={{width:size,height:size,borderRadius:'50%',background:'linear-gradient(145deg,rgb(28,28,28),rgb(26,26,26))',border:'1.5px solid rgba(201,168,76,.22)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxShadow:'0 0 40px rgba(201,168,76,.12),0 0 0 6px rgba(201,168,76,.03)',margin:'0 auto',...sx}}><svg width={s} height={s*.72} viewBox="0 0 60 40" fill="none"><path d="M6 36 C6 16 18 4 30 4 C42 4 54 16 54 36" stroke="#c9a84c" strokeWidth="3" fill="none"/><line x1="18" y1="36" x2="18" y2="22" stroke="#c9a84c" strokeWidth="2"/><line x1="30" y1="36" x2="30" y2="4" stroke="#c9a84c" strokeWidth="2"/><line x1="42" y1="36" x2="42" y2="22" stroke="#c9a84c" strokeWidth="2"/><line x1="4" y1="36" x2="56" y2="36" stroke="#c9a84c" strokeWidth="2.5"/></svg><div style={{fontSize:fs,fontWeight:800,color:'var(--tx3)',letterSpacing:3,marginTop:1}}>JISR</div></div>}

function BrandPanel({lang,L}){return<div style={{flex:1,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'radial-gradient(ellipse 110% 90% at 50% 45%,rgb(26,26,26),rgb(12,12,12) 70%)'}}><div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.015) 1px,transparent 1px)',backgroundSize:'44px 44px'}}/><div style={{position:'absolute',top:0,bottom:0,width:1,[lang==='ar'?'right':'left']:0,background:'linear-gradient(180deg,transparent,rgba(201,168,76,.2) 20%,rgba(201,168,76,.45) 50%,rgba(201,168,76,.2) 80%,transparent)'}}/><div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'40px 48px'}}><div style={{position:'relative',width:210,height:210,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:30}}><svg viewBox="0 0 200 200" fill="none" style={{position:'absolute',inset:0,animation:'spin 22s linear infinite'}}><circle cx="100" cy="100" r="96" stroke="rgba(201,168,76,.18)" strokeWidth="1" strokeDasharray="8 7"/><circle cx="100" cy="100" r="80" stroke="rgba(201,168,76,.07)" strokeWidth="0.8" strokeDasharray="4 9"/><circle cx="100" cy="4" r="2.5" fill="rgba(201,168,76,.6)"/><circle cx="196" cy="100" r="2.5" fill="rgba(201,168,76,.3)"/><circle cx="100" cy="196" r="2.5" fill="rgba(201,168,76,.6)"/><circle cx="4" cy="100" r="2.5" fill="rgba(201,168,76,.3)"/><circle cx="148" cy="18" r="1.5" fill="rgba(201,168,76,.2)"/><circle cx="182" cy="52" r="1.5" fill="rgba(201,168,76,.15)"/><circle cx="18" cy="148" r="1.5" fill="rgba(201,168,76,.2)"/><circle cx="52" cy="182" r="1.5" fill="rgba(201,168,76,.15)"/></svg><div style={{position:'absolute',inset:22,borderRadius:'50%',border:'1px solid rgba(201,168,76,.07)',animation:'spin 14s linear infinite reverse'}}/><div style={{position:'absolute',inset:10,borderRadius:'50%',background:'radial-gradient(circle,rgba(201,168,76,.09),transparent 65%)',animation:'breathe 4s ease-in-out infinite'}}/><Logo size={125}/></div><p style={{fontSize:15,fontWeight:400,color:'rgba(255,255,255,.58)',lineHeight:2}}>{L.tagline}<br/>{L.tagline2}</p></div></div>}

function LangBtn({L,switchLang,abs}){const isToEn=L.otherLang==='English';const s=abs?{position:'absolute',top:18,[isToEn?'left':'right']:18,zIndex:10}:{};return<div onClick={switchLang} style={{...s,display:'flex',alignItems:'center',gap:7,padding:'0 14px',height:36,background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.25)',borderRadius:20,cursor:'pointer',fontFamily:F}}><img src={isToEn?'https://flagcdn.com/w40/us.png':'https://flagcdn.com/w40/sa.png'} width="20" height="14" style={{borderRadius:2,objectFit:'cover'}} alt=""/><span style={{fontSize:12,fontWeight:700,color:C.gold}}>{L.otherLang}</span></div>}

function FField({label,value,set,ph,ltr,type,small}){return<div style={{flex:1}}><div style={{fontSize:'clamp(10px,1.5vw,11px)',fontWeight:700,color:'var(--tx3)',marginBottom:'clamp(3px,.5vw,5px)'}}>{label}</div><input value={value} onChange={e=>set(e.target.value)} type={type||'text'} placeholder={ph||''} style={{width:'100%',height:'clamp(38px,5vw,42px)',background:'rgba(255,255,255,.07)',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,padding:'0 13px',fontFamily:F,fontSize:small?'clamp(9px,1.2vw,10px)':'clamp(11px,1.6vw,12px)',fontWeight:600,color:'var(--tx)',outline:'none',direction:ltr?'ltr':'rtl',textAlign:ltr?'left':'right'}}/></div>}

function GoldBar(){return<div style={{position:'absolute',top:0,left:0,right:0,height:3,borderRadius:'20px 20px 0 0',background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,'+C.gl+' 50%,'+C.gold+' 70%,transparent)',zIndex:1}}/>}

function Badge({v}){const m={active:C.ok,paid:C.ok,completed:C.ok,issue:C.red,cancelled:C.red,suspended:'#e67e22',overdue:C.red,draft:'#999',pending:C.gold,in_progress:C.blue,partial:C.gold,unpaid:C.red,red:C.red,yellow:'#f1c40f',green_low:C.ok,green_mid:C.ok,green_high:C.ok,platinum:C.gold,urgent:C.red,high:'#e67e22',normal:C.blue,low:'#999'};const c=m[v]||'#999';return<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:c+'15',color:c,display:'inline-flex',alignItems:'center',gap:3}}><span style={{width:4,height:4,borderRadius:'50%',background:c}}/>{v||'\u2014'}</span>}

function Css(){return<style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');:root,html[data-theme=dark]{--bg:#171717;--sf:#1e1e1e;--sb:#111111;--hd:#1a1a1a;--tx:rgba(255,255,255,.92);--tx2:rgba(255,255,255,.82);--tx3:rgba(255,255,255,.55);--tx4:rgba(255,255,255,.4);--tx5:rgba(255,255,255,.28);--tx6:rgba(255,255,255,.15);--sbtx:rgba(255,255,255,.88);--sbtx2:rgba(255,255,255,.5);--sbtx3:rgba(255,255,255,.3);--hdtx:rgba(255,255,255,.9);--bd:rgba(255,255,255,.07);--bd2:rgba(255,255,255,.04);--inputBg:rgba(255,255,255,.07);--inputBd:rgba(255,255,255,.12);--hoverBg:rgba(255,255,255,.04);--overlayBg:rgba(14,14,14,.8);--shadowClr:rgba(0,0,0,.5);--afBg:#1e1e1e;--safe-b:env(safe-area-inset-bottom,0px)}html[data-theme=light]{--bg:#faf8f3;--sf:#f2efe6;--sb:#2c2518;--hd:#342c1e;--tx:rgba(40,32,18,.88);--tx2:rgba(50,42,25,.72);--tx3:rgba(90,75,50,.52);--tx4:rgba(110,95,65,.42);--tx5:rgba(130,110,80,.3);--tx6:rgba(150,130,95,.15);--sbtx:rgba(255,255,255,.88);--sbtx2:rgba(255,255,255,.5);--sbtx3:rgba(255,255,255,.3);--hdtx:rgba(255,255,255,.9);--bd:rgba(120,100,60,.1);--bd2:rgba(120,100,60,.06);--inputBg:rgba(0,0,0,.04);--inputBd:rgba(120,100,60,.18);--hoverBg:rgba(0,0,0,.03);--overlayBg:rgba(240,235,225,.9);--shadowClr:rgba(80,60,20,.2);--afBg:#f2efe6}html,body,#root{overflow:hidden;height:100%;width:100%;max-width:100vw;font-size:14px;line-height:1.65;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}*{margin:0;padding:0;box-sizing:border-box;transition:background-color .3s,border-color .25s,color .25s}*::-webkit-scrollbar{width:4px;height:4px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:var(--tx6);border-radius:4px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes breathe{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}@keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}input:focus,select:focus,textarea:focus{border-color:rgba(201,168,76,.25)!important;box-shadow:none!important}.topbar-search-box input:focus{border-color:transparent!important;box-shadow:none!important}input:-webkit-autofill{-webkit-box-shadow:0 0 0 30px var(--afBg) inset!important;-webkit-text-fill-color:var(--tx)!important}button:hover:not(:disabled){filter:brightness(1.06);transform:translateY(-.5px)}button:active:not(:disabled){transform:translateY(0)!important;filter:brightness(.95)}select{background-color:var(--sf)!important;color:var(--tx)!important}select option{background:var(--sf);color:var(--tx)}.mob-bottom-nav{display:none}.mob-hamburger{display:none!important}.mob-overlay{display:none!important}.dash-side{transition:transform .35s cubic-bezier(.32,.72,.0,1)}@media(max-width:900px){.login-brand,.setup-brand{display:none!important}.login-wrap,.setup-wrap{flex-direction:column!important}.login-form,.setup-form{width:100%!important;max-width:100%!important;min-height:100vh!important;box-shadow:none!important}}@media(max-width:768px){.dash-side{position:fixed!important;top:0!important;bottom:0!important;width:280px!important;max-height:100vh!important;height:100vh!important;z-index:200!important;transform:translateX(100%)!important;box-shadow:-8px 0 40px rgba(0,0,0,.5)!important;border:none!important;overflow-y:auto!important;flex-direction:column!important;}[dir=rtl] .dash-side{right:0!important;left:auto!important;transform:translateX(100%)!important}[dir=ltr] .dash-side{left:0!important;right:auto!important;transform:translateX(-100%)!important}.dash-side.side-open{transform:translateX(0)!important}.mob-overlay{display:block!important;animation:fadeIn .2s ease}.mob-hamburger{display:flex!important}.dash-header{padding:0 12px!important;gap:8px!important}.topbar-datetime{display:none!important}.topbar-weekly{display:none!important}.topbar-weekly span{display:none!important}.topbar-search-box{min-width:120px!important}.topbar-search-box input{font-size:11px!important}.breadcrumb-area span{font-size:13px!important}.breadcrumb-area span:not(:last-child){display:none!important}.dash-content{padding:16px 14px 80px!important}.mob-bottom-nav{display:flex!important;position:fixed!important;bottom:0!important;left:0!important;right:0!important;height:calc(64px + var(--safe-b))!important;padding-bottom:var(--safe-b)!important;background:var(--sb)!important;border-top:1px solid rgba(201,168,76,.15)!important;z-index:198!important;align-items:flex-start!important;padding-top:6px!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important;box-shadow:0 -4px 20px rgba(0,0,0,.3)!important;}input,select,textarea{font-size:16px!important}}@media(max-width:480px){.dash-side{width:85vw!important;max-width:300px!important}.dash-header{height:48px!important;padding:0 10px!important;gap:6px!important}.dash-content{padding:12px 10px 85px!important}.breadcrumb-area span{font-size:14px!important;font-weight:800!important}.topbar-search-box{min-width:34px!important;width:34px!important;padding:0!important;justify-content:center!important;overflow:hidden!important}.topbar-search-box input{width:0!important;padding:0!important;opacity:0!important}.topbar-search-box:focus-within{width:180px!important;min-width:180px!important;padding:0 10px!important}.topbar-search-box:focus-within input{width:100%!important;opacity:1!important}.mob-bottom-nav{height:calc(64px + var(--safe-b))!important}table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}}@media(max-width:360px){.dash-header{gap:4px!important}.dash-content{padding:8px 6px 85px!important}.mob-bottom-nav div span{font-size:9px!important}}@supports(padding:max(0px)){.mob-bottom-nav{padding-bottom:max(var(--safe-b),8px)!important}.dash-content{padding-bottom:max(calc(16px + var(--safe-b)),16px)!important}}@media(max-height:500px) and (max-width:900px){.mob-bottom-nav{height:44px!important;padding-top:2px!important}.mob-bottom-nav svg{width:16px!important;height:16px!important}.mob-bottom-nav span{display:none!important}.dash-content{padding-bottom:55px!important}.dash-side{width:240px!important}}.mob-bottom-nav div>div[style]{transition:width .2s ease!important}.pwa-standalone .dash-header{padding-top:env(safe-area-inset-top)!important}.pwa-standalone .mob-bottom-nav{padding-bottom:max(env(safe-area-inset-bottom),12px)!important;height:calc(70px + env(safe-area-inset-bottom))!important}.pwa-standalone .dash-side{padding-top:env(safe-area-inset-top)!important}.pwa-standalone .login-wrap,.pwa-standalone .setup-wrap{padding-top:env(safe-area-inset-top)!important}.install-banner{animation:slideUp .4s cubic-bezier(.4,0,.2,1)}@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.mob-bottom-nav div{transition:transform .15s ease,opacity .15s ease!important}.mob-bottom-nav div:active{transform:scale(.9)!important;opacity:.7!important}@media(max-width:768px){.dash-header{backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important}.dash-content{scroll-behavior:smooth!important;-webkit-overflow-scrolling:touch!important}}@media print{.dash-side,.dash-header,.mob-bottom-nav{display:none!important}.dash-content{padding:16px!important}body{padding:16px}}"}</style>}

const finS={width:'100%',height:'clamp(44px,6vw,52px)',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.22)',borderRadius:12,padding:'0 48px',fontFamily:F,fontSize:'clamp(13px,2vw,15px)',fontWeight:600,color:'var(--tx)',outline:'none',direction:'ltr',textAlign:'center'}
const goldS={width:'100%',height:'clamp(42px,6vw,48px)',background:C.gold,border:'none',borderRadius:11,fontFamily:F,fontSize:'clamp(12px,1.8vw,14px)',fontWeight:800,color:C.dk,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}
const gBtn={height:34,padding:'0 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}
const tBtn={width:28,height:28,borderRadius:6,border:'1px solid rgba(201,168,76,.1)',background:'transparent',display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',marginLeft:4,color:'var(--tx4)',fontFamily:F,fontSize:10}
const lInp={width:'100%',padding:'0 10px',border:'1px solid rgba(201,168,76,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:500,color:'var(--tx)',background:'rgba(255,255,255,.06)',outline:'none',textAlign:'right'}
const num=v=>Number(v||0).toLocaleString('en-US')

function IInp({l,v,s,d,t}){return<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{l}</div><input value={v} onChange={e=>s(e.target.value)} type={t||'text'} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.13)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',direction:d?'ltr':'rtl',textAlign:d?'left':'right',background:'rgba(255,255,255,.06)'}}/></div>}
