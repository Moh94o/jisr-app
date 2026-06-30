import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import BackButton from './components/BackButton'
import InvoicePageFull from './InvoicePage.jsx'
import SettingsPageFull from './SettingsPage.jsx'
import AdminPageFull from './AdminPage.jsx'
import BranchesPage from './BranchesPage.jsx'
import BankAccountsPage from './BankAccountsPage.jsx'
import SbcFacilities from './pages/SbcFacilities.jsx'
import FacilitiesPage from './FacilitiesPage.jsx'
import WorkforcePage from './WorkforcePage.jsx'
import TempWorkforcePage from './TempWorkforcePage.jsx'
import WorkVisasPage from './WorkVisasPage.jsx'
import PageSkeleton from './components/ui/Skeleton.jsx'
import KPIPage from './KPIPage.jsx'
import ServiceRequestPage from './ServiceRequestPage.jsx'
import ServiceAdminPage from './ServiceAdminPage.jsx'
import FeesAdminPage from './pages/FeesAdminPage.jsx'
import { WakalahChamberPage, MedicalStagePage, WorkCardsStagePage, IqamaIssuanceStagePage, IqamaPrintStagePage } from './pages/VisaStagesPage.jsx'
import {hydrateSvcAdminFromDb} from './lib/serviceAdminSync.js'
import KafalaCalculator, { DateField, Sel } from './pages/KafalaCalculator.jsx'
import RenewalCalcPage from './pages/RenewalCalcPage.jsx'
import RenewalCalculator from './pages/RenewalCalculator.jsx'
import ClientsPage from './pages/admin/ClientsPage.jsx'
import AgentsPage from './pages/admin/AgentsPage.jsx'
import PermissionsPage from './pages/admin/PermissionsPage.jsx'
import RolesAdminPage from './pages/admin/RolesAdminPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import SbcCenterPage from './pages/SbcCenterPage.jsx'
import BaladiCenterPage from './pages/BaladiCenterPage.jsx'
import SectionStub from './pages/SectionStub.jsx'
import PaymentsPage from './pages/PaymentsPage.jsx'
import ExternalPaymentsPage from './pages/ExternalPaymentsPage.jsx'
import DepositsPage from './pages/DepositsPage.jsx'
import StampBadge from './components/ui/StampBadge.jsx'
import OfficialStampBadge from './components/ui/OfficialStampBadge.jsx'
import WelcomeToast from './components/WelcomeToast.jsx'
import { Modal as FKModal, ModalSection, ActionButton, SuccessView, ConfirmDialog, ScrollBox, InfoRow, InfoGrid, GRID, TextField, TextArea, FileField, CurrencyField, PhoneField, IdField, Select as FKSelect, DateField as FKDateField, TimeField as FKTimeField, Segmented, YesNo, EmptyState, C as FKC, FKLang } from './components/ui/FormKit.jsx'
import SyncHub, { SyncActivitiesPage } from './pages/SyncHub.jsx'
import VisibilityAdmin, { getVisibility, isItemVisible } from './pages/VisibilityAdmin.jsx'
import { FileText, Sparkles, Tag, Lock, Mail, Send, User, UserPlus, ShieldCheck, Pencil, Eye, Calendar, Wallet, Banknote, ArrowLeftRight, BadgeCheck, Calculator, Trash2, CalendarRange, CalendarClock, RefreshCw, Users, FileCheck, HeartPulse, UserCog, Plane, PlaneTakeoff, IdCard, Printer, FileStack, Coins, Percent, MessageSquare, Paperclip, Plus, AlertCircle, Phone, Globe } from 'lucide-react'

import { getSupabase } from './lib/supabase.js'
import { OFFICE_LOGO_SVG } from './lib/officeBrand.js'
import { exportToExcel, importFromCSV, printContent, generateClientStatement, checkDuplicate, setupKeyboardShortcuts, calculateNitaqat, noDash } from './lib/utils.js'
import { canViewPage, can as canPerm, tabOffices, cardVisible, canCardBtn, fieldVisible, fieldEditable, modalAllowed, mergeRoleVis } from './lib/permissions.js'
import { getKafalaPricingConfig } from './lib/kafalaPricing.js'

const C = { dk:'#171717', md:'#222222', fm:'#1e1e1e', gold:'#D4A017', gl:'#dcc06e', brd:'rgba(255,255,255,.13)', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const F = "'Cairo','Tajawal',sans-serif"

const QuoteCopyBtn=({val,title})=>{const[copied,setCopied]=useState(false);return<button title={title} onClick={()=>{try{navigator.clipboard?.writeText(val);setCopied(true);setTimeout(()=>setCopied(false),1500)}catch{}}} style={{width:19,height:19,padding:0,borderRadius:4,background:'transparent',border:'none',color:copied?C.ok:'var(--tx4)',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'color .15s'}} onMouseEnter={e=>{if(!copied)e.currentTarget.style.color=C.gold}} onMouseLeave={e=>{if(!copied)e.currentTarget.style.color='var(--tx4)'}}>
{copied?<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
</button>}

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
  facility: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 22V4a1 1 0 011-1h8a1 1 0 011 1v18" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 9H5a1 1 0 00-1 1v11a1 1 0 001 1h14" stroke={clr} strokeWidth="1.5" strokeLinejoin="round" opacity=".6"/><line x1="12.5" y1="7" x2="15.5" y2="7" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".7"/><line x1="12.5" y1="11" x2="15.5" y2="11" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".7"/><line x1="12.5" y1="15" x2="15.5" y2="15" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".7"/></svg>,
  worker: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M4 21v-1a6 6 0 0116 0v1" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/></svg>,
  labor: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4.5 15a7.5 7.5 0 0115 0" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 4v3.5M12 4a4 4 0 00-4 4v.5M12 4a4 4 0 014 4v.5" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/><rect x="2.5" y="15" width="19" height="3" rx="1.5" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/></svg>,
  client: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M2 21v-1a5 5 0 0114 0v1" stroke={clr} strokeWidth="1.5" opacity=".6"/><circle cx="19" cy="7" r="2" stroke={clr} strokeWidth="1.5" opacity=".4"/><path d="M22 21v-1a3 3 0 00-3-3" stroke={clr} strokeWidth="1.5" opacity=".35"/></svg>,
  clients: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="9" r="2.6" stroke={clr} strokeWidth="1.4" opacity=".55"/><circle cx="17" cy="9" r="2.6" stroke={clr} strokeWidth="1.4" opacity=".55"/><circle cx="12" cy="7" r="3" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M7.5 20v-.5a4.5 4.5 0 0 1 9 0V20" stroke={clr} strokeWidth="1.5" strokeLinecap="round"/><path d="M2.5 19.5a4 4 0 0 1 4-3.8M21.5 19.5a4 4 0 0 0-4-3.8" stroke={clr} strokeWidth="1.3" strokeLinecap="round" opacity=".45"/></svg>,
  broker: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6.5" r="2.8" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><circle cx="5.5" cy="16.5" r="2.5" stroke={clr} strokeWidth="1.4" opacity=".6"/><circle cx="18.5" cy="16.5" r="2.5" stroke={clr} strokeWidth="1.4" opacity=".6"/><path d="M10.5 8.8L7 14M13.5 8.8L17 14" stroke={clr} strokeWidth="1.4" strokeLinecap="round" opacity=".55"/></svg>,
  transaction: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M8 10h8M8 14h5" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".7"/><circle cx="17" cy="17" r="4" fill={clr} fillOpacity=".2" stroke={clr} strokeWidth="1.5"/><path d="M17 15.5v3l1.5-1" stroke={clr} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  general: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" fill={clr} fillOpacity=".15"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>,
  invoice: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill={clr} fillOpacity=".12"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8" opacity=".6"/><path d="M16 13H8" opacity=".6"/><path d="M16 17H8" opacity=".6"/></svg>,
  payment: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><line x1="2" y1="10" x2="22" y2="10" stroke={clr} strokeWidth="1.5" opacity=".5"/><circle cx="7" cy="15" r="1.5" fill={clr} opacity=".4"/></svg>,
  coins: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="8" r="6" fill={clr} fillOpacity=".15"/><path d="M15 6h1v4" opacity=".6"/><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"/><path d="m6.134 14.768.866-.5 2 3.464" opacity=".6"/></svg>,
  bank: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/></svg>,
  expense: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="14" rx="2" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M3 6V5a2 2 0 012-2h10a2 2 0 012 2v1" stroke={clr} strokeWidth="1.5" opacity=".4"/><circle cx="12" cy="13" r="3" stroke={clr} strokeWidth="1.5" opacity=".6"/><line x1="12" y1="11.5" x2="12" y2="14.5" stroke={clr} strokeWidth="1.3" strokeLinecap="round"/></svg>,
  branch: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="m2 7 4.41-4.41A2 2 0 017.83 2h8.34a2 2 0 011.42.59L22 7" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".6"/><path d="M2 7h20" stroke={clr} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/><path d="M15 22v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".5"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3.5" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M2 20v-1a5 5 0 0114 0v1" stroke={clr} strokeWidth="1.5" opacity=".5"/><circle cx="17" cy="9" r="2.5" fill={clr} fillOpacity=".1" stroke={clr} strokeWidth="1.3" opacity=".6"/><path d="M22 20v-1a3.5 3.5 0 00-4-3.5" stroke={clr} strokeWidth="1.3" opacity=".4"/></svg>,
  userPerm: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2.5l7.5 3.3v5c0 4.8-3.2 8.8-7.5 10.2C7.7 19.6 4.5 15.6 4.5 10.8v-5L12 2.5Z" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5" strokeLinejoin="round"/><circle cx="12" cy="9.5" r="2" stroke={clr} strokeWidth="1.3"/><path d="M9 15a3 3 0 0 1 6 0" stroke={clr} strokeWidth="1.3" strokeLinecap="round"/></svg>,
  role: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v5c0 5.55-3.84 10.74-8 12-4.16-1.26-8-6.45-8-12V6l8-4z" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke={clr} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".7"/></svg>,
  notification: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke={clr} strokeWidth="1.5" opacity=".6"/><circle cx="12" cy="4" r="1.5" fill={clr} opacity=".4"/></svg>,
  notes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M8 7h8M8 11h8M8 15h4" stroke={clr} strokeWidth="1.3" strokeLinecap="round" opacity=".5"/><circle cx="17" cy="17" r="3" fill={clr} fillOpacity=".2" stroke={clr} strokeWidth="1.3"/><path d="M17 16v2h1.5" stroke={clr} strokeWidth="1" strokeLinecap="round"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill={clr} fillOpacity=".15" stroke={clr} strokeWidth="1.5"/><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" stroke={clr} strokeWidth="1.3" opacity=".5"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.5" opacity=".4"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" opacity=".5"/></svg>,
  chart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill={clr} fillOpacity=".1" stroke={clr} strokeWidth="1.5"/><rect x="7" y="13" width="3" height="5" rx="1" fill={clr} opacity=".5"/><rect x="11" y="9" width="3" height="9" rx="1" fill={clr} opacity=".7"/><rect x="15" y="6" width="3" height="12" rx="1" fill={clr} opacity=".4"/></svg>,
  calc: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" fill={clr} fillOpacity=".1" stroke={clr} strokeWidth="1.5"/><rect x="7" y="6" width="10" height="3" rx="1" stroke={clr} strokeWidth="1.3" opacity=".6"/><circle cx="8.5" cy="12.5" r="1" fill={clr}/><circle cx="12" cy="12.5" r="1" fill={clr}/><circle cx="15.5" cy="12.5" r="1" fill={clr}/><circle cx="8.5" cy="16" r="1" fill={clr}/><circle cx="12" cy="16" r="1" fill={clr}/><circle cx="15.5" cy="16" r="1" fill={clr}/></svg>,
  refresh: <RefreshCw color={clr} size={18} strokeWidth={1.7} />,
  deposit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3v9M9 9l3 3 3-3" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5" strokeLinecap="round"/></svg>,
  receipt: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l3 3v13.5l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2V5a2 2 0 0 1 2-2Z" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 9h6M8 12.5h6M8 16h3" stroke={clr} strokeWidth="1.3" strokeLinecap="round" opacity=".6"/></svg>,
  alert: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><line x1="12" y1="9" x2="12" y2="13" stroke={clr} strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill={clr}/></svg>,
  calendar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><line x1="16" y1="2" x2="16" y2="6" stroke={clr} strokeWidth="1.5" opacity=".5"/><line x1="8" y1="2" x2="8" y2="6" stroke={clr} strokeWidth="1.5" opacity=".5"/><line x1="3" y1="10" x2="21" y2="10" stroke={clr} strokeWidth="1.5" opacity=".4"/><path d="M8 14h2v2H8z" fill={clr} opacity=".5"/><path d="M12 14h2v2h-2z" fill={clr} opacity=".3"/></svg>,
  // ── أيقونات تبويبات المعاملات — نفس أيقونات الفاتورة (lucide) ──
  svc_visa_perm:    <CalendarRange color={clr} size={18} strokeWidth={1.7} />,
  svc_visa_temp:    <CalendarClock color={clr} size={18} strokeWidth={1.7} />,
  svc_transfer:     <ArrowLeftRight color={clr} size={18} strokeWidth={1.7} />,
  svc_renew:        <RefreshCw color={clr} size={18} strokeWidth={1.7} />,
  svc_ajeer:        <Users color={clr} size={18} strokeWidth={1.7} />,
  svc_chamber:      <FileCheck color={clr} size={18} strokeWidth={1.7} />,
  svc_medical:      <HeartPulse color={clr} size={18} strokeWidth={1.7} />,
  svc_profession:   <UserCog color={clr} size={18} strokeWidth={1.7} />,
  svc_ext_transfer: <BadgeCheck color={clr} size={18} strokeWidth={1.7} />,
  svc_salary:       <Wallet color={clr} size={18} strokeWidth={1.7} />,
  svc_exit_reentry: <Plane color={clr} size={18} strokeWidth={1.7} />,
  svc_final_exit:   <PlaneTakeoff color={clr} size={18} strokeWidth={1.7} />,
  svc_passport:     <IdCard color={clr} size={18} strokeWidth={1.7} />,
  svc_iqama_print:  <Printer color={clr} size={18} strokeWidth={1.7} />,
  svc_docs:         <FileStack color={clr} size={18} strokeWidth={1.7} />,
  svc_payroll:      <Coins color={clr} size={18} strokeWidth={1.7} />,
  svc_general:      <Sparkles color={clr} size={18} strokeWidth={1.7} />,
  svc_saudization:  <Percent color={clr} size={18} strokeWidth={1.7} />,
  tasks: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="4" width="14" height="17" rx="2" fill={clr} fillOpacity=".12" stroke={clr} strokeWidth="1.5"/><path d="M9 3h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill={clr} fillOpacity=".2" stroke={clr} strokeWidth="1.4"/><path d="M8.5 12.2l1.4 1.4 3-3" stroke={clr} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity=".85"/><path d="M8.5 17h6" stroke={clr} strokeWidth="1.4" strokeLinecap="round" opacity=".5"/></svg>,
})

const LANG = {
  ar:{dir:'rtl',otherFlag:'\u{1F1FA}\u{1F1F8}',otherLang:'English',title:'\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643',sub:'\u0633\u062c\u0651\u0644 \u062f\u062e\u0648\u0644\u0643 \u0644\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0646\u0638\u0627\u0645',email:'\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',pass:'\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',remember:'\u062a\u0630\u0643\u0651\u0631\u0646\u064a',forgot:'\u0646\u0633\u064a\u062a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061f',login:'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',firstTime:'\u0623\u0648\u0644 \u0645\u0631\u0629\u061f',setup:'\u0625\u0639\u062f\u0627\u062f \u0623\u0648\u0644\u064a \u2014 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0639\u0627\u0645',ver:'\u062a\u0623\u0634\u064a\u0631\u0629 \u0627\u0644\u0628\u0646\u0627\u0621 \u0648\u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u2014 \u0627\u0644\u0646\u0633\u062e\u0629 1.3',tagline:'\u062a\u0623\u0634\u064a\u0631\u0629 \u0627\u0644\u0628\u0646\u0627\u0621 \u0648\u0627\u0644\u0625\u0646\u0634\u0627\u0621',tagline2:'\u0645\u0646\u0634\u0622\u062a \u00b7 \u0639\u0645\u0627\u0644\u0629 \u00b7 \u0641\u0648\u0627\u062a\u064a\u0631 \u00b7 \u0645\u0639\u0627\u0645\u0644\u0627\u062a \u00b7 \u062a\u0642\u0627\u0631\u064a\u0631',setupTitle:'\u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0639\u0627\u0645',setupSub:'\u0623\u0648\u0644 \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0646\u0638\u0627\u0645 \u2014 \u064a\u0645\u0644\u0643 \u0643\u0644 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a',nameAr:'\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064a *',nameEn:'\u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a',idNum:'\u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064a\u0629',phone:'\u0627\u0644\u062c\u0648\u0627\u0644',emailLbl:'\u0627\u0644\u0628\u0631\u064a\u062f *',pw:'\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 *',pwConfirm:'\u062a\u0623\u0643\u064a\u062f *',create:'\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628',back:'\u2190 \u0631\u062c\u0648\u0639',successTitle:'\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628 \u0628\u0646\u062c\u0627\u062d!',successSub:'\u0633\u062c\u0651\u0644 \u062f\u062e\u0648\u0644\u0643 \u0627\u0644\u0622\u0646',goLogin:'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u2192',configTitle:'\u0627\u062a\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a',configSub:'Supabase \u2192 Settings \u2192 API'},
  en:{dir:'ltr',otherFlag:'\u{1F1F8}\u{1F1E6}',otherLang:'\u0627\u0644\u0639\u0631\u0628\u064a\u0629',title:'Welcome Back',sub:'Sign in to access the system',email:'Email',pass:'Password',remember:'Remember me',forgot:'Forgot password?',login:'Sign In',firstTime:'First time?',setup:'Initial Setup \u2014 Create Super Admin',ver:'Visa Albina & Alinsha \u2014 v1.3',tagline:'Visa Albina & Alinsha',tagline2:'Facilities \u00b7 Workers \u00b7 Invoices \u00b7 Transactions \u00b7 Reports',setupTitle:'Create Super Admin Account',setupSub:'First account \u2014 has all permissions',nameAr:'Name (Arabic) *',nameEn:'Name (English)',idNum:'ID Number',phone:'Phone',emailLbl:'Email *',pw:'Password *',pwConfirm:'Confirm *',create:'Create Account',back:'Back \u2192',successTitle:'Account Created!',successSub:'Sign in with your email and password',goLogin:'Go to Login \u2192',configTitle:'Connect to Database',configSub:'Supabase \u2192 Settings \u2192 API'}
}
const TR={'الاسم':'Name','الاسم بالعربي':'Name (Arabic)','الاسم بالإنجليزي':'Name (English)','الرقم':'Number','الرقم الموحد':'Unified No.','السجل':'CR No.','حالة السجل':'CR Status','الحالة':'Status','نطاقات':'Nitaqat','الجنسية':'Nationality','الجوال':'Phone','الإقامة':'Iqama','الهوية':'ID','النوع':'Type','المبلغ':'Amount','الدفع':'Payment','التاريخ':'Date','المرجع':'المرجع','البنك':'Bank','الترتيب':'Order','البداية':'Start','النهاية':'End','النقاط':'Points','المستخدم':'Username','الجنس':'Gender','نشط':'Active','الكود':'Code','بالإنجليزي':'English','المفتاح':'Key','نظامي':'System','القيمة':'Value','اسم الملف':'File Name','نوع الكيان':'Entity Type','نوع الملف':'File Type','الانتهاء':'Expiry','الإصدار':'Version','شركة التأمين':'Insurance Company','رقم الوثيقة':'Policy No.','الوثيقة':'Document','مدير':'Manager','نسبة الملكية':'Ownership %','السنة':'Year','بداية الأسبوع':'Week Start','الربط':'Linked','الفك':'Unlinked','الأولوية':'Priority','البدء':'Start','الاستحقاق':'Due','السداد':'Payment','الطريقة':'Method','رقم العامل':'Worker No.','المنشأة':'Facility','المكتب':'Branch','الوسيط':'Broker','تاريخ الميلاد':'Birth Date','رقم الإقامة':'Iqama No.','رقم الحدود':'Border No.','رقم الجواز':'Passport No.','انتهاء الجواز':'Passport Expiry','المهنة':'Occupation','تاريخ دخول المملكة':'Entry Date','طريقة الالتحاق':'Joining Method','صاحب العمل السابق':'Previous Employer','رقم صاحب العمل السابق':'Previous Employer ID','تاريخ نقل الكفالة':'Sponsorship Transfer Date','حالة التأمينات':'GOSI Status','راتب التأمينات':'GOSI Salary','راتب قوى':'Qiwa Salary','انتهاء عقد قوى':'Qiwa Contract Expiry','حالة عقد قوى':'Qiwa Contract Status','حالة العامل':'Worker Status','خارج المملكة':'Outside Kingdom','يملك مركبة':'Has Vehicle','عدد المرافقين':'Dependents','ملف مكتمل':'Complete File','ملاحظات':'Notes','رقم العميل':'Client No.','نوع الهوية':'ID Type','رقم الهوية':'ID Number','البريد الإلكتروني':'Email','العنوان':'Address','الوسيط المُحيل':'Referring Broker','نوع العمولة':'Commission Type','نسبة/مبلغ العمولة':'Commission Rate','اسم البنك':'Bank Name','رقم الحساب البنكي':'Bank Account No.','رقم الآيبان':'IBAN','رقم المعاملة':'Transaction No.','نوع المعاملة':'Transaction Type','العميل':'Client','العامل':'Worker','سبب الإلغاء':'Cancellation Reason','تاريخ البدء':'Start Date','تاريخ الاستحقاق':'Due Date','تاريخ الإنجاز':'Completion Date','الفاتورة':'Invoice','ترتيب الدفعة':'Installment Order','المرحلة':'Milestone','تاريخ السداد':'Payment Date','رقم المصروف':'Expense No.','نوع المصروف':'Expense Type','التصنيف':'Category','المعاملة':'Transaction','رقم وثيقة التأمين':'Policy No.','تاريخ البداية':'Start Date','تاريخ النهاية':'End Date','السنة الهجرية':'Hijri Year','المالك':'Owner','منشأة المالك':'Owner Facility','مدير المنشأة':'Facility Manager','نسبة الملكية %':'Ownership %','نوع المنصة':'Platform Type','حالة الاشتراك':'Subscription Status','رصيد النقاط':'Points Balance','نوع البيانات':'Credential Type','اسم المستخدم':'Username','كلمة المرور':'Password','الجوال المرتبط':'Linked Phone','البريد المرتبط':'Linked Email','المنشأة المعفاة':'Exempt Facility','المنشأة المرتبطة':'Linked Facility','تاريخ الربط':'Link Date','تاريخ الفك':'Unlink Date','ربط بواسطة':'Linked By','فك بواسطة':'Unlinked By','المنطقة':'Region','مفتاح القائمة':'List Key','القائمة':'List','القيمة بالعربي':'Value (Arabic)','القيمة بالإنجليزي':'Value (English)','العنصر الأب':'Parent Item','بيانات إضافية (JSON)':'Metadata (JSON)','معرف الكيان':'Entity ID','نوع الوثيقة':'Document Type','مسار الملف':'File Path','حجم الملف (بايت)':'File Size (bytes)','رقم الإصدار':'Version No.','تاريخ الانتهاء':'Expiry Date','طريقة الدفع':'Payment Method','تاريخ الدفع':'Payment Date','المستلم':'Collected By','رقم المرجع':'Reference No.','الشكل القانوني':'Legal Form','عدد الشخصيات':'Character Count','حالة المنشأة':'Facility Status','رأس المال':'Capital','النشاط الاقتصادي':'Economic Activity','رقم السجل التجاري':'CR Number','تاريخ إصدار السجل':'CR Issue Date','تاريخ التصديق':'Confirmation Date','تاريخ الشطب':'Deletion Date','رقم نسخة السجل':'CR Version','سجل رئيسي':'Main CR','أنشطة السجل':'CR Activities','المنشأة الأم':'Parent Facility','مالك التأمينات':'GOSI Owner','المدينة':'City','رقم ملف قوى':'Qiwa File No.','رقم ملف التأمينات':'GOSI File No.','رقم عضوية الغرفة':'Chamber No.','انتهاء عضوية الغرفة':'Chamber Expiry','تأشيرة دائمة':'Permanent Visa','تأشيرة مؤقتة':'Temporary Visa','نقل خدمات':'Service Transfer','مستثنى أصلي':'Originally Exempt','رقم ض.ق.م':'VAT No.','حالة الضريبة':'VAT Status','رقم الزكاة':'Zakat No.','حجم نطاقات':'Nitaqat Size','إجمالي العمال':'Total Workers','العمال في نطاقات':'Workers in Nitaqat','سعوديين':'Saudis','سعوديين في نطاقات':'Saudis in Nitaqat','غير سعوديين':'Non-Saudis','غير سعوديين في نطاقات':'Non-Saudis in Nitaqat','نسبة السعودة':'Saudization %','نسبة توثيق العقود':'Contract Auth %','نسبة حماية الأجور':'WPS Compliance %','عقود موثقة':'Authenticated Contracts','عقود غير موثقة':'Unauthenticated','تأشيرات متاحة':'Available Visas','مستخدمة':'Used','غير مستخدمة':'Not Used','ملغاة':'Cancelled','رخص منتهية':'Expired Permits','صادرة هذا العام':'Issued This Year','نموذج التأمينات':'GOSI Form','إجمالي المشتركين':'Total Contributors','مشتركين سعوديين':'Saudi Contributors','مشتركين غير سعوديين':'Non-Saudi Contributors','مشتركين نشطين':'Active Contributors','مشتركين غير نشطين':'Inactive Contributors','إجمالي الاشتراكات':'Total Contributions','إجمالي المديونية':'Total Debit','الغرامات':'Penalties','إجمالي الالتزامات':'Total Obligations','مدد - حماية الأجور':'Mudad WPS','حالة مدد':'Mudad Status','حالة خدمات العمل':'Labor Service Status','عمال أجير مستعارين':'Ajeer Borrowed Workers','عقود أجير نشطة':'Ajeer Active Contracts','رصيد الزكاة المستحق':'Zakat Balance','جوال شخصي':'Personal Phone','جوال عمل':'Work Phone','تاريخ الميلاد ميلادي':'Birth Date (Gregorian)','تاريخ الميلاد هجري':'Birth Date (Hijri)','قريب':'Relative','جاري التحميل...':'Loading...','إضافة':'Add','حفظ':'Save','تعديل':'Edit','حذف':'Delete','حذف؟':'Delete?','تم الحفظ':'Saved','تم الحذف':'Deleted','خطأ':'Error','إلغاء':'Cancel','بحث...':'Search...','لا توجد بيانات':'No data','الإعدادات العامة':'General Settings','الخدمات':'Services','الخانات والعناصر':'Lists & Items','الدول والجنسيات والسفارات':'Countries & Nationalities','المناطق والمدن':'Regions & Cities','الوثائق':'Documents','المكاتب':'Branches','الحسابات البنكية':'Bank Accounts','الموظفين':'Employees','الأدوار والصلاحيات':'Roles & Permissions','قوالب المعاملات':'Transaction Templates','الملف الشخصي':'Profile','تسجيل الخروج':'Sign Out','بحث سريع ...':'Quick search ...','الرئيسية':'Dashboard','المنشآت':'Facilities','العمّال':'Workers','الفواتير':'Invoices','المعاملات':'Transactions','التقارير':'Reports','الإدارة':'Administration','المالية':'Finance','البيانات':'Data'}

// Translate common Supabase / network errors to current language
const translateErr=(err,lang)=>{const ar=lang==='ar';const raw=(err?.message||err?.error_description||err?.error||String(err||'')).trim();if(!raw)return ar?'حدث خطأ غير متوقع':'Unexpected error';const s=raw.toLowerCase();const map=[[/invalid login credentials|invalid credentials/,ar?'بيانات الدخول غير صحيحة':'Invalid credentials'],[/email not confirmed/,ar?'البريد لم يتم تأكيده بعد':'Email not confirmed yet'],[/unable to validate email|invalid email|email.*invalid|invalid.*email|bad email/i,ar?'صيغة البريد الإلكتروني غير صحيحة':'Invalid email format'],[/user (not found|already registered|exists)/,ar?'المستخدم غير موجود أو مسجّل مسبقاً':'User not found or already exists'],[/already.*registered|email.*exists/,ar?'البريد الإلكتروني مسجّل مسبقاً':'Email already registered'],[/duplicate key|already exists|unique constraint/,ar?'القيمة موجودة مسبقاً':'Value already exists'],[/violates foreign key|foreign key constraint/,ar?'لا يمكن الحذف — مرتبط بسجلات أخرى':'Cannot delete — linked to other records'],[/violates not.?null|null value in column/,ar?'حقل مطلوب فارغ':'A required field is empty'],[/violates check constraint|check constraint/,ar?'القيمة غير مسموح بها':'Value not allowed'],[/permission denied|insufficient.*privileg|not authorized|unauthorized|forbidden|rls/,ar?'ليست لديك صلاحية لهذا الإجراء':'You don’t have permission for this action'],[/jwt expired|jwt.*invalid|invalid token|session/,ar?'انتهت الجلسة — أعد تسجيل الدخول':'Session expired — please sign in again'],[/otp_expired|otp expired|email link.*expired|link.*expired|expired.*confirmation/i,ar?'انتهت صلاحية رابط التأكيد — اطلب رابطاً جديداً':'Confirmation link expired — request a new one'],[/access_denied|access denied/i,ar?'تم رفض الوصول':'Access denied'],[/network|failed to fetch|networkerror|fetch.*failed/,ar?'تعذّر الاتصال بالخادم — تحقق من الإنترنت':'Could not connect to server — check your internet'],[/timeout|timed out|انتهت مهلة/,ar?'انتهت مهلة الاتصال — حاول مرة أخرى':'Connection timed out — try again'],[/for security purposes.*after\s*(\d+)\s*seconds?/i,ar?'لأسباب أمنية — انتظر قليلاً ثم حاول مرة أخرى':'For security — please wait a bit and try again'],[/rate limit|too many requests|over_email_send_rate_limit|email rate limit/i,ar?'محاولات كثيرة — انتظر قليلاً':'Too many attempts — please wait'],[/password.*short|weak.*password|password.*weak|password should be|easy to guess|known to be weak|password is known/,ar?'كلمة المرور ضعيفة — اختر كلمة أقوى':'Password is too weak — choose a stronger one'],[/not found/,ar?'العنصر غير موجود':'Item not found']];for(const[re,msg]of map){if(re.test(s))return msg}return raw.length>120?raw.slice(0,120)+'…':raw};
export default function App(){const[view,setView]=useState('loading');const[sb,setSb]=useState(null);const[user,setUser]=useState(null);const[gmDone,setGmDone]=useState(false);const[toast,setToast]=useState(null);const[welcome,setWelcome]=useState(null);const[lang,setLang]=useState(()=>localStorage.getItem('jisr_lang')||'ar');const setLangPersist=(l)=>{const v=typeof l==='function'?l(lang):l;setLang(v);localStorage.setItem('jisr_lang',v)};const tt=(m,type)=>{if(m==null)return;const msg=String(m);let t=type;if(!t){const sLow=msg.toLowerCase();const arErr=['خطأ','فشل','تعذّر','تعذر','مطلوب','الرجاء','يجب','لا يمكن','لا يدعم','غير متطابق','غير صحيح','غير صالح','غير مسجّل','غير مسجل','أدخل','املأ','أكبر من','منتهية','انتهت'];const enErrRe=/\berror\b|\bfail|\binvalid\b|\bdenied\b|\bforbidden\b|\bcannot\b|can['\u2019]t|don['\u2019]t|doesn['\u2019]t|\bmust\s|\brequired\b|do(es)?\s+not\s|is\s+not\s|\bplease\s+(enter|fill|complete|select|provide)\b|\bexpired\b|\btimed?\s*out\b|\bpermission\b|\bunauthor/i;if(arErr.some(k=>msg.includes(k))||enErrRe.test(sLow))t='error';else if(msg.includes('حذف')||msg.includes('إلغاء')||/\bdelet|\bremov|\bcancel/i.test(sLow))t='delete';else t='success'}setToast({msg,type:t});setTimeout(()=>setToast(null),3000)};const ttErr=(err)=>{const m=translateErr(err,lang);tt((lang==='ar'?'خطأ: ':'Error: ')+m,'error')};useEffect(()=>{const client=getSupabase();setSb(client);
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
Promise.all([settingsP,sessionP]).then(async([settingsRes,sessionRes])=>{resolved=true;clearTimeout(timeout);const done=settingsRes.data?.setting_value==='true';setGmDone(done);const session=sessionRes.data?.session;if(!session){setView('login');return}try{const{data:u}=await client.from('users').select('*,person:persons!users_person_id_fkey(*),role:roles!users_role_id_fkey(id,name_ar,name_en,color)').eq('auth_user_id',session.user.id).single();if(u){if(!u.is_active){await client.auth.signOut();setView('login')}else{if(u.preferred_lang)setLangPersist(u.preferred_lang);try{const{data:permRows}=await client.from('v_user_effective_permissions').select('module,action,is_granted,branch_scope,branch_id').eq('user_id',u.id).eq('is_granted',true);u.perms=permRows||[];try{const{data:bp}=await client.from('v_user_branch_permissions').select('module,action,branch_id').eq('user_id',u.id);u.branchPerms=bp||[]}catch{u.branchPerms=[]}try{const{data:_ur}=await client.from('user_roles').select('role_id').eq('user_id',u.id);const _rids=Array.from(new Set([...(_ur||[]).map(r=>r.role_id),...(u.role_id?[u.role_id]:[])]));if(_rids.length){const{data:_rv}=await client.from('roles').select('ui_visibility').in('id',_rids);u.ui_visibility=mergeRoleVis((_rv||[]).map(r=>r.ui_visibility))}}catch{}}catch{u.perms=[];u.branchPerms=[]}setUser(u);setView('app')}}else setView('login')}catch(e){setView('login')}}).catch(()=>{resolved=true;clearTimeout(timeout);setView('login')})},[]);const handleLogin=async(email,pass)=>{const withTimeout=(promise,ms=10000)=>Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error(lang==='ar'?'انتهت مهلة الاتصال — حاول مرة أخرى':'Connection timed out — try again')),ms))]);const{data,error}=await withTimeout(sb.auth.signInWithPassword({email:(email||'').trim().toLowerCase(),password:pass}));if(error)throw error;const{data:u,error:e2}=await withTimeout(sb.from('users').select('*,person:persons!users_person_id_fkey(*),role:roles!users_role_id_fkey(id,name_ar,name_en,color)').eq('auth_user_id',data.user.id).single());if(e2||!u)throw new Error('User not found');if(!u.is_active){await sb.auth.signOut();throw new Error(lang==='ar'?'حسابك قيد المراجعة — يرجى انتظار موافقة المسؤول':'Your account is under review — please wait for admin approval')}sb.from('users').update({last_login_at:new Date().toISOString()}).eq('id',u.id).then(()=>{});try{const{data:permRows}=await sb.from('v_user_effective_permissions').select('module,action,is_granted,branch_scope,branch_id').eq('user_id',u.id).eq('is_granted',true);u.perms=permRows||[];try{const{data:bp}=await sb.from('v_user_branch_permissions').select('module,action,branch_id').eq('user_id',u.id);u.branchPerms=bp||[]}catch{u.branchPerms=[]}try{const{data:_ur}=await sb.from('user_roles').select('role_id').eq('user_id',u.id);const _rids=Array.from(new Set([...(_ur||[]).map(r=>r.role_id),...(u.role_id?[u.role_id]:[])]));if(_rids.length){const{data:_rv}=await sb.from('roles').select('ui_visibility').in('id',_rids);u.ui_visibility=mergeRoleVis((_rv||[]).map(r=>r.ui_visibility))}}catch{}}catch{u.perms=[];u.branchPerms=[]}setUser(u);if(u.preferred_lang)setLangPersist(u.preferred_lang);const wlang=u.preferred_lang||lang;const _war=wlang==='ar';const _nm=(((_war?u.person?.name_ar:u.person?.name_en)||u.person?.name_ar||'').trim().split(/\s+/).slice(0,2).join(' '))||(_war?'بك':'back');setWelcome({name:_nm,lang:wlang});try{localStorage.setItem('jisr_last_activity',String(Date.now()))}catch{}setView('app')};const handleSetup=async(form)=>{
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
setGmDone(true)};const handleLogout=async()=>{try{localStorage.removeItem('jisr_last_activity')}catch{}await sb.auth.signOut();setUser(null);setView('login')};const switchLang=()=>{const newL=lang==='ar'?'en':'ar';setLangPersist(newL);if(sb&&user)sb.from('users').update({preferred_lang:newL}).eq('id',user.id)};const L=LANG[lang];
// تسجيل خروج تلقائي بعد ساعة من الخمول (عدم النشاط)
const idleRef=React.useRef(Date.now());
useEffect(()=>{if(view!=='app'||!user)return;const IDLE_MS=3600000;const ACT_KEY='jisr_last_activity';const logoutIdle=()=>{try{localStorage.removeItem(ACT_KEY)}catch{}handleLogout();setTimeout(()=>tt(lang==='ar'?'انتهت الجلسة — تم تسجيل خروجك تلقائيًا بعد ساعة من عدم النشاط':'Session ended — logged out after 1 hour of inactivity'),120)};const stored=parseInt(localStorage.getItem(ACT_KEY)||'0',10);if(stored&&Date.now()-stored>=IDLE_MS){logoutIdle();return}let _lw=Date.now()-15000;const touch=()=>{const n=Date.now();idleRef.current=n;if(n-_lw>=15000){_lw=n;try{localStorage.setItem(ACT_KEY,String(n))}catch{}}};touch();const evs=['mousemove','mousedown','keydown','scroll','touchstart','wheel','click'];evs.forEach(e=>window.addEventListener(e,touch,{passive:true}));const iv=setInterval(()=>{if(Date.now()-idleRef.current>=IDLE_MS)logoutIdle()},30000);return()=>{evs.forEach(e=>window.removeEventListener(e,touch));clearInterval(iv)}},[view,user]);
const GlobalToast=()=>{if(!toast)return null;const{msg,type}=toast;const isErr=type==='error';const isDel=type==='delete';const clr=isErr?C.red:(isDel?'#e67e22':C.ok);const bg=isErr?'rgba(192,57,43,.12)':(isDel?'rgba(230,126,34,.12)':'rgba(39,160,70,.12)');const bdr=isErr?'rgba(192,57,43,.2)':(isDel?'rgba(230,126,34,.2)':'rgba(39,160,70,.2)');return<div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',zIndex:99999,background:bg,color:clr,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:700,padding:'12px 24px',borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,.5)',border:'1px solid '+bdr,display:'flex',alignItems:'center',gap:8,animation:'slideDown .3s ease',pointerEvents:'none',direction:lang==='ar'?'rtl':'ltr'}}>{isErr?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}{msg}</div>}
if(view==='loading')return<Splash/>;if(view==='setup')return<><LoginPage sb={sb} onLogin={handleLogin} onSetup={()=>setView('setup')} toast={tt} gmDone={gmDone} lang={lang} switchLang={switchLang} L={L}/><SetupPage sb={sb} onSetup={handleSetup} onBack={()=>setView('login')} toast={tt} lang={lang} switchLang={switchLang} L={L}/><GlobalToast/></>;if(view==='reset')return<><ResetPage sb={sb} onDone={()=>setView('login')} toast={tt} lang={lang} L={L}/><GlobalToast/></>;if(view==='login')return<><LoginPage sb={sb} onLogin={handleLogin} onSetup={()=>setView('setup')} toast={tt} gmDone={gmDone} lang={lang} switchLang={switchLang} L={L}/><GlobalToast/></>;return<FKLang.Provider value={lang}><DashPage sb={sb} user={user} onLogout={handleLogout} toast={tt} lang={lang} switchLang={switchLang} setLang={setLangPersist}/><GlobalToast/>{welcome&&<WelcomeToast name={welcome.name} lang={welcome.lang} onDone={()=>setWelcome(null)}/>}</FKLang.Provider>}

function Splash(){return<div style={{position:'fixed',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:28,background:'radial-gradient(ellipse 120% 90% at 50% 42%,var(--sf),var(--bg) 72%)',fontFamily:F,direction:'rtl'}}>
  <style>{`@keyframes splGlow{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.65;transform:scale(1.14)}}@keyframes splFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
  {/* شبكة خافتة مموّهة في الخلفية */}
  <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(var(--bd2) 1px,transparent 1px),linear-gradient(90deg,var(--bd2) 1px,transparent 1px)',backgroundSize:'46px 46px',maskImage:'radial-gradient(ellipse 58% 50% at 50% 44%,#000,transparent 78%)',WebkitMaskImage:'radial-gradient(ellipse 58% 50% at 50% 44%,#000,transparent 78%)'}}/>
  {/* الشعار + هالة نابضة + قوس تحميل ذهبي يدور */}
  <div style={{position:'relative',width:144,height:144,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{position:'absolute',width:122,height:122,borderRadius:'50%',background:'radial-gradient(circle,rgba(212,160,23,.42),transparent 70%)',filter:'blur(10px)',animation:'splGlow 2.6s ease-in-out infinite'}}/>
    <div style={{position:'absolute',width:132,height:132,borderRadius:'50%',background:'conic-gradient(from 90deg,rgba(212,160,23,0),rgba(212,160,23,.15) 55%,#D4A017)',WebkitMask:'radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 3px))',mask:'radial-gradient(farthest-side,transparent calc(100% - 3px),#000 calc(100% - 3px))',animation:'spin 1.1s linear infinite'}}/>
    <div style={{animation:'splFloat 3s ease-in-out infinite'}}><Logo size={94}/></div>
  </div>
  {/* اسم التطبيق */}
  <div style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',gap:7,animation:'fadeIn .9s ease'}}>
    <div style={{fontSize:20,fontWeight:800,color:'var(--tx)',letterSpacing:'.3px',fontFamily:"'Reem Kufi','Cairo',sans-serif"}}>تأشيرة البناء والإنشاء</div>
    <div style={{fontSize:10.5,fontWeight:600,color:'var(--tx3)',letterSpacing:'2.5px',textTransform:'uppercase',direction:'ltr'}}>Visa Albina &amp; Alinsha</div>
  </div>
  <Css/>
</div>}

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
    ticks.push(<line key={i} x1={c+inner*Math.cos(a)} y1={c+inner*Math.sin(a)} x2={c+outer*Math.cos(a)} y2={c+outer*Math.sin(a)} stroke={i%3===0?'rgba(212,160,23,.7)':'var(--clk-tick)'} strokeWidth={i%3===0?1.1:0.6} strokeLinecap="round"/>);
  }
  const ph=pt(hAng,r*0.46),pm=pt(mAng,r*0.66),ps=pt(sAng,r*0.78);
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'block',flexShrink:0}}>
      <defs>
        <linearGradient id="clockBg" gradientTransform="rotate(70)">
          <stop offset="0%" stopColor="var(--clk1)"/>
          <stop offset="50%" stopColor="var(--clk2)"/>
          <stop offset="100%" stopColor="var(--clk3)"/>
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width={size-1} height={size-1} rx={size/4} ry={size/4} fill="url(#clockBg)" stroke="var(--clk-bd)" strokeWidth="1"/>
      {ticks}
      <line x1={c} y1={c} x2={ph.x} y2={ph.y} stroke="var(--clk-hand)" strokeWidth="1.7" strokeLinecap="round"/>
      <line x1={c} y1={c} x2={pm.x} y2={pm.y} stroke="var(--clk-hand2)" strokeWidth="1.2" strokeLinecap="round"/>
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
const encPw=(v)=>{try{return btoa(unescape(encodeURIComponent(v||'')))}catch{return ''}};
const decPw=(v)=>{try{return v?decodeURIComponent(escape(atob(v))):''}catch{return ''}};
const[em,setEm]=useState(()=>localStorage.getItem('jisr_rem_id')||'');
const[pw,setPw]=useState(()=>decPw(localStorage.getItem('jisr_rem_pw')));
const[busy,setBusy]=useState(false);
const[showPw,setShowPw]=useState(false);
const[rem,setRem]=useState(()=>!!(localStorage.getItem('jisr_rem_id')||localStorage.getItem('jisr_rem_pw')));
const[showForgot,setShowForgot]=useState(false);
const[loginErr,setLoginErr]=useState('');
const[forgotEmail,setForgotEmail]=useState('');
const[forgotResolvedEmail,setForgotResolvedEmail]=useState('');
const[forgotBusy,setForgotBusy]=useState(false);
const[forgotSent,setForgotSent]=useState(false);
const[forgotErr,setForgotErr]=useState('');
const[showReg,setShowReg]=useState(false);
const[reg,setReg]=useState({nationality_id:'',nationality_ar:'',name_ar:'',name_en:'',email:'',phone:'',id_number:'',branch_id:'',pw:'',pw2:''});
const[regBusy,setRegBusy]=useState(false);
const[regDone,setRegDone]=useState(false);
const[regStep,setRegStep]=useState(1);
const[regErr,setRegErr]=useState({});
const[regSubmitErr,setRegSubmitErr]=useState('');
const[regBranches,setRegBranches]=useState([]);
const[regIdTypes,setRegIdTypes]=useState([]);
const[regBanks,setRegBanks]=useState([]);
const[regBankOpen,setRegBankOpen]=useState(false);
const[idTypeOpen,setIdTypeOpen]=useState(false);
const[bankDropOpen,setBankDropOpen]=useState(false);
const defaultNats=[{ar:'سعودي',en:'Saudi'},{ar:'يمني',en:'Yemeni'},{ar:'مصري',en:'Egyptian'},{ar:'سوداني',en:'Sudanese'},{ar:'سوري',en:'Syrian'},{ar:'أردني',en:'Jordanian'},{ar:'عراقي',en:'Iraqi'},{ar:'فلسطيني',en:'Palestinian'},{ar:'لبناني',en:'Lebanese'},{ar:'تونسي',en:'Tunisian'},{ar:'مغربي',en:'Moroccan'},{ar:'جزائري',en:'Algerian'},{ar:'ليبي',en:'Libyan'},{ar:'عماني',en:'Omani'},{ar:'إماراتي',en:'Emirati'},{ar:'بحريني',en:'Bahraini'},{ar:'كويتي',en:'Kuwaiti'},{ar:'قطري',en:'Qatari'},{ar:'باكستاني',en:'Pakistani'},{ar:'هندي',en:'Indian'},{ar:'بنغلاديشي',en:'Bangladeshi'},{ar:'فلبيني',en:'Filipino'},{ar:'إندونيسي',en:'Indonesian'},{ar:'نيبالي',en:'Nepali'},{ar:'سريلانكي',en:'Sri Lankan'},{ar:'إثيوبي',en:'Ethiopian'},{ar:'كيني',en:'Kenyan'},{ar:'نيجيري',en:'Nigerian'},{ar:'أمريكي',en:'American'},{ar:'بريطاني',en:'British'},{ar:'أخرى',en:'Other'}];
const[nats,setNats]=useState(defaultNats);
useEffect(()=>{if(!sb)return;sb.from('nationalities').select('id,name_ar,name_en').eq('is_active',true).order('sort_order',{nullsFirst:false}).order('name_ar').then(({data})=>{if(data&&data.length>0){const seen=new Set();const unique=data.filter(d=>d.name_ar&&!seen.has(d.name_ar)&&seen.add(d.name_ar)).map(d=>({id:d.id,ar:d.name_ar,en:d.name_en||d.name_ar}));setNats(unique)}})},[sb]);
useEffect(()=>{if(!sb)return;sb.from('branches').select('id,branch_code').is('deleted_at',null).then(({data})=>{if(data){const sorted=[...data].sort((a,b)=>{const na=parseInt((a.branch_code||'').match(/\d+/g)?.pop()||'0',10);const nb=parseInt((b.branch_code||'').match(/\d+/g)?.pop()||'0',10);return na-nb});setRegBranches(sorted)}})},[sb]);
const regInpS={width:'100%',height:'clamp(38px,5vw,42px)',padding:'0 14px',border:'1px solid var(--bd)',borderRadius:9,fontFamily:F,fontSize:'clamp(12px,1.8vw,13px)',fontWeight:600,color:'var(--tx)',background:'var(--modal-input-bg)',outline:'none',textAlign:'center',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'};
const regLblS={fontSize:'clamp(10px,1.5vw,12px)',fontWeight:700,color:'var(--tx3)',marginBottom:'clamp(3px,.5vw,5px)'};
const regSelS={...regInpS,cursor:'pointer',textAlign:'right',paddingRight:14,appearance:'none',WebkitAppearance:'none',MozAppearance:'none',overflowY:'auto',backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff40' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",backgroundRepeat:'no-repeat',backgroundPosition:'14px center'};

const go=async e=>{
e.preventDefault();if(!em||!pw)return toast(lang==='ar'?'الرجاء إدخال البريد الإلكتروني وكلمة المرور':'Please enter email and password');
if(rem){localStorage.setItem('jisr_rem_id',em);localStorage.setItem('jisr_rem_pw',encPw(pw))}else{localStorage.removeItem('jisr_rem_id');localStorage.removeItem('jisr_rem_pw')}
setBusy(true);try{await onLogin(em,pw)}catch(err){const msg=err.message?.includes('Invalid')||err.message?.includes('invalid')?(lang==='ar'?'تعذّر تسجيل الدخول — تحقق من البريد وكلمة المرور':'Login failed — check email and password'):err.message?.includes('fetch')||err.message?.includes('timed out')||err.message?.includes('network')||err.message?.includes('مهلة')?(lang==='ar'?'تعذّر الاتصال بالخادم — تحقق من الإنترنت وحاول مرة أخرى':'Could not connect to server — check your internet and try again'):err.message||(lang==='ar'?'خطأ':'Error');toast((lang==='ar'?'خطأ: ':'Error: ')+msg,'error')}setBusy(false)};

const sendReset=async()=>{
const ar=lang==='ar';
setForgotErr('');
if(!forgotEmail){setForgotErr(ar?'الرجاء إدخال رقم الهوية':'Please enter your ID number');return}
if(!/^\d{10}$/.test(forgotEmail)){setForgotErr(ar?'رقم الهوية 10 أرقام':'ID must be 10 digits');return}
if(!sb){setForgotErr(ar?'خطأ: لا يوجد اتصال':'Error: No connection');return}
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
catch(err){setForgotErr((ar?'خطأ: ':'Error: ')+translateErr(err,lang))}
setForgotBusy(false)};

// إغلاق تلقائي بعد شاشة النجاح الموحّدة (نمط FormKit)
useEffect(()=>{if(!forgotSent)return;const t=setTimeout(()=>{setShowForgot(false);setForgotSent(false)},1400);return()=>clearTimeout(t)},[forgotSent]);
useEffect(()=>{if(!regDone)return;const t=setTimeout(()=>{setShowReg(false);setRegDone(false)},1400);return()=>clearTimeout(t)},[regDone]);

const doRegister=async()=>{
setRegSubmitErr('');
if(!sb){setRegSubmitErr(lang==='ar'?'خطأ: لا يوجد اتصال':'Error: No connection');return}
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
// Pre-flight uniqueness — catches the common case of someone re-registering, so we never
// create an orphan auth.users row when persons/users insert is doomed to fail.
const[{data:dupId},{data:dupEmail}]=await Promise.all([
sb.from('persons').select('id').eq('id_number',idDigits).limit(1),
sb.from('users').select('id').eq('email',email).limit(1)
]);
if(dupId&&dupId.length){setRegErr({id_number:ar?'رقم الهوية مسجل مسبقاً':'ID number already registered'});throw new Error(ar?'رقم الهوية مسجل مسبقاً':'ID number already registered')}
if(dupEmail&&dupEmail.length){setRegErr({email:ar?'البريد الإلكتروني مسجّل مسبقاً':'Email already registered'});throw new Error(ar?'البريد الإلكتروني مسجّل مسبقاً':'Email already registered')}
const{data:auth,error:e1}=await sb.auth.signUp({email,password:reg.pw});
if(e1){if(/already.*registered|exists/i.test(e1.message))setRegErr({email:ar?'البريد الإلكتروني مسجّل مسبقاً':'Email already registered'});throw e1}
if(!auth.user)throw new Error(ar?'فشل إنشاء حساب المصادقة':'Failed to create auth user');
const{error:rpcError}=await sb.rpc('register_new_user',{p_auth_user_id:auth.user.id,p_name_ar:nameAr,p_name_en:nameEn,p_id_number:idDigits,p_id_type_code:idTypeCode,p_nationality_id:reg.nationality_id,p_personal_phone:phoneFull,p_email:email,p_branch_id:reg.branch_id});
if(rpcError){
// Race-condition fallback: pre-flight passed but RPC still failed (another concurrent register
// won). The auth.users row is orphaned; we sign out so the session is at least invalidated.
// TODO: add a service-role Edge function to actually delete the orphaned auth user.
console.error('RPC register_new_user failed:',rpcError);
await sb.auth.signOut().catch(()=>{});
throw new Error(ar?'تم إنشاء حساب المصادقة لكن فشل إعداد الملف الشخصي — تواصل مع الدعم':'Auth created but profile setup failed — contact support')
}
await sb.auth.signOut();
setReg({nationality_id:'',nationality_ar:'',name_ar:'',name_en:'',email:'',phone:'',id_number:'',branch_id:'',pw:'',pw2:''});
setRegDone(true);toast(ar?'تم تسجيل الحساب بنجاح':'Account registered successfully');
}catch(err){if(!Object.keys(regErr).length)setRegSubmitErr((ar?'خطأ: ':'Error: ')+translateErr(err,lang))}
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

const regFirstErr=Object.values(regErr)[0];
const RegErrBadge=regFirstErr?<div style={{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',display:'flex',alignItems:'center',gap:6,fontSize:'clamp(10px,1.4vw,12px)',color:'rgba(192,57,43,.85)',fontWeight:600,maxWidth:'60%',pointerEvents:'none',whiteSpace:'nowrap'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{regFirstErr}</span></div>:null;

return(<div className='login-wrap' style={{display:'flex',height:'100vh',direction:L.dir,fontFamily:F,background:'var(--bg)',overflow:'hidden'}}><div className='login-form' style={{width:'100%',maxWidth:520,flexShrink:0,background:'var(--modal-bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'clamp(28px,6vh,70px) clamp(18px,6vw,80px) clamp(20px,4vw,44px)',position:'relative',boxShadow:lang==='ar'?'-28px 0 70px var(--shadowClr)':'28px 0 70px var(--shadowClr)',overflow:'hidden'}}><LangBtn L={L} switchLang={switchLang} abs/><div style={{textAlign:'center',marginBottom:'clamp(20px,4vw,32px)',width:'100%',display:'flex',flexDirection:'column',alignItems:'center',gap:14}}><div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(145deg,rgba(212,160,23,.14),rgba(212,160,23,.04))',border:'1px solid rgba(212,160,23,.22)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 24px rgba(212,160,23,.12), inset 0 1px 0 rgba(255,255,255,.06)'}}><svg width="34" height="32" viewBox="0 0 120 112" fill="none"><defs><linearGradient id="vGoldLogin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F7E08A"/><stop offset="0.5" stopColor="#D4A017"/><stop offset="1" stopColor="#9C7410"/></linearGradient></defs><path d="M32.0,18.0 L32.5,19.6 L32.7,21.3 L32.9,23.1 L33.0,24.8 L33.2,26.5 L33.7,28.2 L34.5,29.6 L35.7,31.0 L37.3,32.2 L39.0,33.3 L40.9,34.4 L42.6,35.5 L44.1,36.7 L45.1,38.1 L45.5,39.8 L45.4,41.6 L44.7,43.7 L43.7,45.9 L42.5,48.2 L41.3,50.4 L40.5,52.5 L40.1,54.5 L40.4,56.2 L41.4,57.6 L42.9,58.8 L45.0,59.8 L47.3,60.7 L49.8,61.5 L52.0,62.5 L53.9,63.5 L55.3,64.8 L56.0,66.3 L56.3,68.0 L56.0,69.9 L55.5,71.9 L54.9,74.0 L54.3,76.0 L54.0,77.9 L54.0,79.7 L54.4,81.4 L55.1,82.9 L56.1,84.3 L57.2,85.7 L58.3,87.1 L59.3,88.5 L60.0,90.0" stroke="url(#vGoldLogin)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M88.0,18.0 L87.5,19.6 L87.3,21.3 L87.1,23.1 L87.0,24.8 L86.8,26.5 L86.3,28.2 L85.5,29.6 L84.3,31.0 L82.7,32.2 L81.0,33.3 L79.1,34.4 L77.4,35.5 L75.9,36.7 L74.9,38.1 L74.5,39.8 L74.6,41.6 L75.3,43.7 L76.3,45.9 L77.5,48.2 L78.7,50.4 L79.5,52.5 L79.9,54.5 L79.6,56.2 L78.6,57.6 L77.1,58.8 L75.0,59.8 L72.7,60.7 L70.2,61.5 L68.0,62.5 L66.1,63.5 L64.7,64.8 L64.0,66.3 L63.7,68.0 L64.0,69.9 L64.5,71.9 L65.1,74.0 L65.7,76.0 L66.0,77.9 L66.0,79.7 L65.6,81.4 L64.9,82.9 L63.9,84.3 L62.8,85.7 L61.7,87.1 L60.7,88.5 L60.0,90.0" stroke="url(#vGoldLogin)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg></div><div><div style={{fontSize:'clamp(22px,3.5vw,28px)',fontWeight:600,color:'var(--tx)',letterSpacing:'-.5px',lineHeight:1.2}}>{L.title}</div><div style={{fontSize:14,fontWeight:500,color:'var(--tx3)',marginTop:8}}>{L.sub}</div></div></div><form onSubmit={go} style={{width:'100%',display:'flex',flexDirection:'column',gap:'clamp(10px,1.8vw,16px)'}}><div><div style={{fontSize:14,fontWeight:500,color:'var(--tx2)',marginBottom:8}}>{L.email}</div><div style={{position:'relative'}}><span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'right':'left']:16,pointerEvents:'none',display:'flex'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#D4A017" strokeWidth="1.5"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" stroke="#D4A017" strokeWidth="1.5"/></svg></span><input value={em} onChange={e=>{setEm(e.target.value);setLoginErr('')}} type="email" inputMode="email" autoComplete="username" placeholder="name@jisr.com" required style={finS}/></div></div><div><div style={{fontSize:14,fontWeight:500,color:'var(--tx2)',marginBottom:8}}>{L.pass}</div><div style={{position:'relative'}}><span style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'right':'left']:16,pointerEvents:'none',display:'flex'}}>{pw?<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2.5" stroke="#D4A017" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 019.9-1" stroke="#D4A017" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#D4A017"/></svg>:ICO.lock}</span><input value={pw} onChange={e=>{setPw(arToEn(e.target.value));setLoginErr('')}} type={showPw?'text':'password'} placeholder="······" autoComplete="current-password" required style={finS}/><button type="button" onClick={()=>setShowPw(!showPw)} style={{position:'absolute',top:'50%',transform:'translateY(-50%)',[lang==='ar'?'left':'right']:14,background:'none',border:'none',cursor:'pointer',display:'flex',padding:4}}>{showPw?ICO.eyeOn:ICO.eyeOff}</button></div></div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>{const _n=!rem;setRem(_n);if(!_n){localStorage.removeItem('jisr_rem_id');localStorage.removeItem('jisr_rem_pw')}}}><div style={{width:16,height:16,borderRadius:5,border:rem?'none':'1.5px solid var(--inputBd)',background:rem?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'.2s',flexShrink:0}}>{rem&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#141414" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div><span style={{fontSize:'clamp(10px,1.5vw,12px)',fontWeight:600,color:rem?'var(--tx2)':'var(--tx3)'}}>{L.remember}</span></label></div><button type="submit" disabled={busy} style={{...goldS,marginTop:6,opacity:busy?.7:1,flexShrink:0}}>{busy?<div style={{width:20,height:20,border:'2.5px solid rgba(240,203,106,.3)',borderTopColor:'#F0CB6A',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:L.login}</button></form>
{!gmDone&&<button onClick={onSetup} style={{width:'100%',height:36,marginTop:6,background:'none',border:'none',fontFamily:F,fontSize:'clamp(9px,1.3vw,10px)',fontWeight:700,color:C.gold,cursor:'pointer'}}>{lang==='ar'?'إعداد أولي (المدير العام فقط)':'Initial Setup (Admin only)'}</button>}
</div><BrandPanel lang={lang} L={L}/>
{/* ═══ نافذة نسيت كلمة المرور — FormKit ═══ */}
{(()=>{const ar=lang==='ar';return(
<FKModal open={showForgot} onClose={()=>{setShowForgot(false);setForgotSent(false);setForgotErr('')}} width={520} height="auto"
 title={ar?'نسيت كلمة المرور؟':'Forgot Password?'} Icon={Lock} variant="create"
 success={forgotSent?<SuccessView title={ar?'تم إرسال الرابط بنجاح':'Link sent successfully'}/>:null}
 errorMsg={forgotErr}
 footer={<ActionButton Icon={Send} onClick={sendReset} disabled={forgotBusy}>{forgotBusy?(ar?'جاري الإرسال…':'Sending…'):(ar?'إرسال الرابط':'Send Link')}</ActionButton>}>
<ModalSection Icon={Mail} label={ar?'استعادة الحساب':'Account Recovery'}>
<div style={{fontSize:13,fontWeight:500,color:FKC.tx3,lineHeight:1.7,marginBottom:14,textAlign:'start'}}>{ar?'أدخل رقم هويتك وسيتم إرسال رابط إعادة التعيين إلى البريد الإلكتروني المرتبط بحسابك':'Enter your ID number and a password reset link will be sent to the email associated with your account'}</div>
<div style={GRID}>
<IdField label={ar?'رقم الهوية':'ID Number'} req full value={forgotEmail} onChange={v=>{setForgotErr('');setForgotEmail(v)}} placeholder="1XXXXXXXXX"/>
</div>
</ModalSection>
</FKModal>)})()}
{/* ═══ نافذة تسجيل حساب جديد — FormKit (صفحتان) ═══ */}
{showReg && (()=>{
const ar=lang==='ar';
const isSaudi=reg.nationality_ar==='سعودي';
const isNonSaudi=!!reg.nationality_ar&&!isSaudi;
const idLabel=isNonSaudi?(ar?'رقم الإقامة':'Iqama Number'):(ar?'رقم الهوية الوطنية':'National ID');
const idPlaceholder=isNonSaudi?'2XXXXXXXXX':'1XXXXXXXXX';
const pickErr=keys=>{for(const k of keys){if(regErr[k])return regErr[k]}return ''};
const pwSt=reg.pw?passwordStrength(reg.pw):{level:0};
const pwClr=pwSt.level===1?'#e74c3c':pwSt.level===2?'#f39c12':'#27a060';
const submitReg=()=>{
const err={};
const idDigits=normalizeDigits(reg.id_number);
const phoneDigits=normalizePhone(reg.phone);
if(!reg.nationality_ar)err.nationality=ar?'يجب اختيار الجنسية':'Select nationality';
const nameAr=collapseSpaces(reg.name_ar);
if(!nameAr)err.name_ar=ar?'الرجاء إدخال الاسم':'Enter name';
else if(!/^[؀-ۿ\s]+$/.test(nameAr))err.name_ar=ar?'حروف عربية فقط':'Arabic only';
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
setRegSubmitErr('');
setRegErr(err);if(Object.keys(err).length>0)return;
setRegErr({});doRegister();
};
const page1Valid=!!reg.nationality_ar&&!!collapseSpaces(reg.name_ar)&&normalizeDigits(reg.id_number||'').length===10&&!!reg.branch_id;
const page2Valid=!!reg.phone&&!!reg.email&&!!reg.pw&&!!reg.pw2;
return <FKModal open onClose={()=>{setShowReg(false);setRegDone(false);setRegSubmitErr('')}} width={640}
 title={ar?'حساب جديد':'New Account'} Icon={UserPlus} variant="create"
 success={regDone?<SuccessView title={ar?'تم تسجيل الحساب بنجاح':'Account registered'}/>:null}
 onSubmit={submitReg} submitting={regBusy} submitLabel={ar?'تسجيل':'Register'}
 nextLabel={ar?'التالي':'Next'} backLabel={ar?'السابق':'Back'}
 pages={[
 {title:ar?'الهوية والمكتب':'Identity & Branch',valid:page1Valid,error:pickErr(['nationality','name_ar','id_number','branch_id']),content:(
 <ModalSection Icon={User} label={ar?'بيانات الحساب':'Account Info'}>
 <div style={GRID}>
 <FKSelect label={ar?'الجنسية':'Nationality'} req error={regErr.nationality} placeholder={ar?'اختر':'Select'} value={reg.nationality_ar} options={nats} getKey={n=>n.ar} getLabel={n=>ar?n.ar:n.en} onChange={(k,n)=>setReg(p=>({...p,nationality_ar:n.ar,nationality_id:n.id||'',name_ar:'',name_en:'',id_number:''}))}/>
 <TextField label={ar?'الاسم':'Name'} req error={regErr.name_ar} value={reg.name_ar} onChange={v=>setReg(p=>({...p,name_ar:v}))} filter="ar" maxLength={30} placeholder={ar?'الاسم':'Name'}/>
 <IdField label={idLabel} req error={regErr.id_number} value={reg.id_number} onChange={v=>setReg(p=>({...p,id_number:v}))} placeholder={idPlaceholder}/>
 <FKSelect label={ar?'المكتب':'Branch'} req error={regErr.branch_id} placeholder={ar?'اختر':'Select'} value={reg.branch_id} options={regBranches} getKey={b=>b.id} getLabel={b=>b.branch_code||''} onChange={v=>setReg(p=>({...p,branch_id:v}))}/>
 </div>
 </ModalSection>)},
 {title:ar?'التواصل وكلمة المرور':'Contact & Password',valid:page2Valid,error:pickErr(['phone','email','pw','pw2'])||regSubmitErr,content:(
 <ModalSection Icon={Lock} label={ar?'التواصل وكلمة المرور':'Contact & Password'}>
 <div style={GRID}>
 <PhoneField label={ar?'رقم الجوال':'Mobile Number'} req error={regErr.phone} value={reg.phone} onChange={v=>setReg(p=>({...p,phone:v}))}/>
 <TextField label={ar?'البريد الإلكتروني':'Email'} req error={regErr.email} value={reg.email} onChange={v=>setReg(p=>({...p,email:v}))} dir="ltr" placeholder="example@jisr.sa"/>
 <div>
 <TextField label={ar?'كلمة المرور':'Password'} req error={regErr.pw} value={reg.pw} onChange={v=>setReg(p=>({...p,pw:arToEn(v)}))} dir="ltr" placeholder={ar?'8 أحرف على الأقل':'Min 8 chars'}/>
 <div style={{display:'flex',gap:3,marginTop:6,alignItems:'center',height:3}}>{[1,2,3].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:reg.pw&&i<=pwSt.level?pwClr:'var(--bd)',transition:'.2s'}}/>)}</div>
 </div>
 <TextField label={ar?'تأكيد كلمة المرور':'Confirm'} req error={regErr.pw2} value={reg.pw2} onChange={v=>setReg(p=>({...p,pw2:arToEn(v)}))} dir="ltr" placeholder={ar?'تأكيد':'Confirm'}/>
 </div>
 </ModalSection>)}
 ]}/>;
})()}
<Css/></div>)}

function SetupPage({sb,onSetup,onBack,toast,lang,switchLang,L}){
const[f,setF]=useState({ar:'',en:'',id_type:'هوية وطنية',id:'',nat:'سعودي',ph:'',em:'',pw:'',pw2:''});
const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
const[sErr,setSErr]=useState({});
const[submitErr,setSubmitErr]=useState('');
const s=(k,v)=>{setSubmitErr('');setF(p=>({...p,[k]:v}))};

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
setSubmitErr('');
const err=validate();setSErr(err);if(Object.keys(err).length>0)return;
setBusy(true);try{await onSetup(f);setDone(true)}catch(e){setSubmitErr((lang==='ar'?'خطأ: ':'Error: ')+translateErr(e,lang))}setBusy(false);
};

// إغلاق تلقائي بعد شاشة النجاح الموحّدة (نمط FormKit)
useEffect(()=>{if(!done)return;const t=setTimeout(()=>onBack(),1400);return()=>clearTimeout(t)},[done]);

const pickErr=keys=>{for(const k of keys){if(sErr[k])return sErr[k]}return ''};
const pwSt=f.pw?passwordStrength(f.pw):{level:0};
const pwClr=pwSt.level===1?'#e74c3c':pwSt.level===2?'#f39c12':'#27a060';
const ar=lang==='ar';
return(<>
<FKModal open onClose={()=>{setSubmitErr('');onBack()}} width={640}
 title={ar?'المدير العام':'General Manager'} Icon={ShieldCheck} variant="create"
 success={done?<SuccessView title={ar?'تم إرسال رابط التفعيل إلى بريدك':'Activation link sent'}/>:null}
 onSubmit={go} submitting={busy} submitLabel={ar?'تسجيل':'Register'}
 nextLabel={ar?'التالي':'Next'} backLabel={ar?'السابق':'Back'}
 pages={[
 {title:ar?'بيانات الحساب':'Account Info',valid:!!f.ar&&!!f.id&&!!f.em&&!!f.ph,error:pickErr(['ar','id','em','ph']),content:(
 <ModalSection Icon={User} label={ar?'بيانات الحساب':'Account Info'}>
 <div style={GRID}>
 <TextField label={ar?'الاسم':'Name'} req error={sErr.ar} value={f.ar} onChange={v=>s('ar',v)} filter="ar" maxLength={30} placeholder={ar?'الاسم':'Name'}/>
 <IdField label={ar?'رقم الهوية الوطنية':'National ID'} req error={sErr.id} value={f.id} onChange={v=>s('id',v)} placeholder="1XXXXXXXXX"/>
 <TextField label={ar?'البريد الإلكتروني':'Email'} req error={sErr.em} value={f.em} onChange={v=>s('em',v)} dir="ltr" placeholder="admin@jisr.sa"/>
 <PhoneField label={ar?'رقم الجوال':'Mobile Number'} req error={sErr.ph} value={f.ph} onChange={v=>s('ph',v)}/>
 </div>
 </ModalSection>)},
 {title:ar?'كلمة المرور':'Password',valid:!!f.pw&&!!f.pw2,error:pickErr(['pw','pw2'])||submitErr,content:(
 <ModalSection Icon={Lock} label={ar?'كلمة المرور':'Password'}>
 <div style={GRID}>
 <div>
 <TextField label={ar?'كلمة المرور':'Password'} req error={sErr.pw} value={f.pw} onChange={v=>s('pw',arToEn(v))} dir="ltr" placeholder={ar?'8 أحرف على الأقل':'Min 8 chars'}/>
 <div style={{display:'flex',gap:3,marginTop:6,alignItems:'center',height:3}}>{[1,2,3].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:f.pw&&i<=pwSt.level?pwClr:'var(--bd)',transition:'.2s'}}/>)}</div>
 </div>
 <TextField label={ar?'تأكيد كلمة المرور':'Confirm'} req error={sErr.pw2} value={f.pw2} onChange={v=>s('pw2',arToEn(v))} dir="ltr" placeholder={ar?'تأكيد':'Confirm'}/>
 </div>
 </ModalSection>)}
 ]}/>
<Css/></>);}

function ResetPage({sb,onDone,toast,lang,L}){
const[pw,setPw]=useState('');const[pw2,setPw2]=useState('');const[busy,setBusy]=useState(false);const[done,setDone]=useState(false);
const go=async()=>{
if(!pw||!pw2){toast(lang==='ar'?'أدخل كلمة المرور الجديدة':'Enter new password');return}
if(pw!==pw2){toast(lang==='ar'?'كلمة المرور غير متطابقة':'Passwords do not match');return}
if(pw.length<8){toast(lang==='ar'?'كلمة المرور 8 أحرف على الأقل':'Password must be at least 8 characters');return}
if(passwordStrength(pw).level<3){toast(lang==='ar'?'كلمة المرور ضعيفة — أضف أحرف كبيرة وأرقام ورموز':'Password too weak — add uppercase, digits, symbols');return}
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
<div><div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:6}}>{lang==='ar'?'كلمة المرور الجديدة':'New Password'}</div>
<input value={pw} onChange={e=>setPw(arToEn(e.target.value))} type="password" placeholder="······" style={{...finS,textAlign:'center'}}/></div>
<div><div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:6}}>{lang==='ar'?'تأكيد كلمة المرور':'Confirm Password'}</div>
<input value={pw2} onChange={e=>setPw2(arToEn(e.target.value))} type="password" placeholder="······" style={{...finS,textAlign:'center'}}/></div>
<button onClick={go} disabled={busy} style={{...goldS,height:'clamp(42px,6vw,50px)',fontSize:'clamp(13px,2vw,15px)',opacity:busy?.7:1}}>{busy?<div style={{width:18,height:18,border:'2px solid rgba(240,203,106,.3)',borderTopColor:'#F0CB6A',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:lang==='ar'?'تغيير كلمة المرور':'Change Password'}</button>
</div>
</div><Css/></div>)}

// Transaction sub-pages — one per request type (mirrors the service list in ServiceRequestPage).
// `code` is the service_type lookup code each page filters the transactions list by.
const TX_TYPES=[
{id:'tx_work_visa_permanent',code:'work_visa_permanent',ar:'تأشيرة وإقامة دائمة',en:'Permanent Visa & Iqama',i:'calendar'},
{id:'tx_work_visa_temporary',code:'work_visa_temporary',ar:'تأشيرة وإقامة مؤقتة',en:'Temporary Visa & Iqama',i:'calendar'},
{id:'tx_transfer',code:'transfer',ar:'نقل كفالة',en:'Sponsorship Transfer',i:'broker'},
{id:'tx_iqama_renewal',code:'iqama_renewal',ar:'تجديد الإقامة',en:'Iqama Renewal',i:'role'},
{id:'tx_ajeer',code:'ajeer',ar:'عقد أجير',en:'Ajeer Contract',i:'users'},
{id:'tx_chamber',code:'other',ar:'الغرفة التجارية',en:'Chamber of Commerce',i:'branch'},
{id:'tx_medical_insurance',code:'medical_insurance',ar:'تأمين طبي',en:'Medical Insurance',i:'alert'},
{id:'tx_profession_change',code:'profession_change',ar:'تغيير المهنة',en:'Occupation Change',i:'worker'},
{id:'tx_salary',code:'name_translation',ar:'تعديل الراتب',en:'Salary Adjustment',i:'payment'},
{id:'tx_exit_reentry',code:'exit_reentry_visa',ar:'خروج وعودة',en:'Exit / Re-entry Visa',i:'calendar'},
{id:'tx_final_exit',code:'final_exit_visa',ar:'خروج نهائي',en:'Final Exit',i:'alert'},
{id:'tx_passport_update',code:'passport_update',ar:'تحديث بيانات الجواز',en:'Passport Update',i:'client'},
{id:'tx_iqama_print',code:'iqama_print',ar:'طباعة الإقامة',en:'Iqama Print',i:'notes'},
{id:'tx_documents',code:'documents',ar:'مستندات',en:'Documents',i:'notes'},
{id:'tx_general',code:'general',ar:'خدمة عامة',en:'General',i:'transaction'},
{id:'tx_saudization',code:'saudization',ar:'سعودة',en:'Saudization',i:'chart'},
]

// Transaction sections shown under the المعاملات hub.
// Mirrors the invoice service catalog 1:1 (ServiceRequestPage MAIN_SERVICES +
// OTHER_SERVICES) + السعودة. Every section has a `code` → TransactionsPage filtered
// by that service_type. Order matches the invoice popup (main services first).
const TXN_SECTIONS=[
// — الخدمات الرئيسية (تأشيرات/إقامات/نقل) —
{id:'work-visa-permanent',  ar:'تأشيرة وإقامة دائمة',      en:'Permanent Visa & Iqama',     i:'svc_visa_perm',    code:'work_visa_permanent'},
{id:'work-visa-temporary',  ar:'تأشيرة وإقامة مؤقتة',      en:'Temporary Visa & Iqama',     i:'svc_visa_temp',    code:'work_visa_temporary'},
{id:'transfer',             ar:'نقل كفالة',               en:'Sponsorship Transfer',      i:'svc_transfer',     code:'transfer'},
{id:'iqama-renewal',        ar:'تجديد الإقامة',           en:'Iqama Renewal',             i:'svc_renew',        code:'iqama_renewal'},
{id:'ajeer',                ar:'عقد أجير',                en:'Ajeer Contract',            i:'svc_ajeer',        code:'ajeer'},
{id:'chamber',              ar:'الغرفة التجارية',         en:'Chamber of Commerce',       i:'svc_chamber',      code:'other'},
// — خدمات أخرى —
{id:'medical-insurance',    ar:'تأمين طبي',               en:'Medical Insurance',         i:'svc_medical',      code:'medical_insurance'},
{id:'profession-change',    ar:'تغيير المهنة',            en:'Occupation Change',         i:'svc_profession',   code:'profession_change'},
{id:'external-transfer',    ar:'الموافقة للنقل الخارجي',  en:'External Transfer Approval',i:'svc_ext_transfer', code:'external_transfer_approval'},
{id:'salary',               ar:'تعديل الراتب',            en:'Salary Adjustment',         i:'svc_salary',       code:'name_translation'},
{id:'exit-reentry',         ar:'خروج وعودة',       en:'Exit / Re-entry Visa',      i:'svc_exit_reentry', code:'exit_reentry_visa'},
{id:'final-exit',           ar:'خروج نهائي',  en:'Final Exit',                i:'svc_final_exit',   code:'final_exit_visa'},
{id:'passport-update',      ar:'تحديث بيانات الجواز',     en:'Passport Update',           i:'svc_passport',     code:'passport_update'},
{id:'iqama-print',          ar:'طباعة الإقامة',           en:'Iqama Print',               i:'svc_iqama_print',  code:'iqama_print'},
{id:'documents',            ar:'مستندات',                 en:'Documents',                 i:'svc_docs',         code:'documents'},
{id:'supplier-payroll',     ar:'طلب رواتب سبلاير',        en:'Supplier Payroll',          i:'svc_payroll',      code:'supplier_payroll'},
{id:'general',              ar:'خدمة عامة',               en:'General',                   i:'svc_general',      code:'general'},
// — صندوق موافقات المحاسب (عابر للخدمات: النقل الخارجي + الخروج النهائي) —
{id:'accountant-approvals', ar:'موافقات المحاسب',         en:'Accountant Approvals',      i:'svc_ext_transfer', accountant:true},
]

// Sidebar hub «المهام» (Tasks) — internal task-style sections, separate from invoice services.
const TASK_SECTIONS=[
{id:'saudization',          ar:'السعودة',                 en:'Saudization',               i:'svc_saudization',  code:'saudization'},
]

function DashPage({sb,user,onLogout,toast,lang,switchLang,setLang}){const[pg,setPg]=useState('home');const[toastMsg,setToastMsg]=useState(null);const tt=m=>{setToastMsg(m);setTimeout(()=>setToastMsg(null),2500)};const[userMenu,setUserMenu]=useState(false);const[showProfile,setShowProfile]=useState(false);const[emailConfirmStep,setEmailConfirmStep]=useState(false);const[profileData,setProfileData]=useState(null);const[profileBank,setProfileBank]=useState(null);const[profileBusy,setProfileBusy]=useState(false);const[profileTab,setProfileTab]=useState('info');const[profileErr,setProfileErr]=useState({});const[profileBanks,setProfileBanks]=useState([]);const[profileBankDrop,setProfileBankDrop]=useState(false);const[profilePerf,setProfilePerf]=useState(null);const[profileAtt,setProfileAtt]=useState([]);const[profileTasks,setProfileTasks]=useState([]);const[profileSalary,setProfileSalary]=useState([]);const[profileLoans,setProfileLoans]=useState([]);const[profileLogins,setProfileLogins]=useState([]);const[stats,setStats]=useState(null);const[showUserMenu,setShowUserMenu]=useState(false);useEffect(()=>{document.documentElement.setAttribute('data-theme','light');localStorage.setItem('jisr_theme','light');const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#e2dac6');document.body.style.background='#f2ece0'},[]);
// Pull service-admin config (pricing minimums, overrides, etc.) from system_settings on login —
// otherwise pages that read these synchronously from localStorage (ServiceRequestPage, InvoicePage…)
// would use stale or default values for users who never opened ServiceAdminPage on this browser.
useEffect(()=>{hydrateSvcAdminFromDb().catch(e=>console.warn('[svcAdminSync] startup hydrate failed',e))},[]);const[dashBranch,setDashBranch]=useState(null);const[dashBranches,setDashBranches]=useState([]);const[sTabInfo,setSTabInfo]=useState({tab:'general',svcSubTab:'services'});const[activityLog,setActivityLog]=useState([]);const[activityLoading,setActivityLoading]=useState(false);const[sideOpen,setSideOpen]=useState(false);const[hbHover,setHbHover]=useState(false);const[taskCount,setTaskCount]=useState(0);const[approvalCount,setApprovalCount]=useState(0);const[todayAppointments,setTodayAppointments]=useState([]);const[lastWeeklyUpdate,setLastWeeklyUpdate]=useState(null);const[expanded,setExpanded]=useState({tasks_section:true,facilities_workforce:true,finance:true,data:false,reports:false,admin:false});const[showServiceRequest,setShowServiceRequest]=useState(false);const[navExpanded,setNavExpanded]=useState({});
const[showKafalaCalc,setShowKafalaCalc]=useState(false);
const[showRenewalCalc,setShowRenewalCalc]=useState(false);
const[avatarUrl,setAvatarUrl]=useState(user?.avatar_url||user?.person?.avatar_url||'');
useEffect(()=>{setAvatarUrl(user?.avatar_url||user?.person?.avatar_url||'')},[user?.id,user?.avatar_url,user?.person?.avatar_url]);
const[natCache,setNatCache]=useState(null);
const[subCrumbs,setSubCrumbs]=useState([]);
useEffect(()=>{const handler=(e)=>setSubCrumbs(Array.isArray(e.detail)?e.detail:[]);window.addEventListener('topbar-breadcrumbs',handler);return()=>window.removeEventListener('topbar-breadcrumbs',handler)},[]);
useEffect(()=>{const handler=(e)=>{setPg('sync_hub');setTimeout(()=>window.dispatchEvent(new CustomEvent('sync-focus-source',{detail:e.detail})),50)};window.addEventListener('app-navigate-sync',handler);return()=>window.removeEventListener('app-navigate-sync',handler)},[]);
useEffect(()=>{const handler=(e)=>{setPg('invoices');setTimeout(()=>window.dispatchEvent(new CustomEvent('invoice-open',{detail:e.detail})),80)};window.addEventListener('app-navigate-invoice',handler);return()=>window.removeEventListener('app-navigate-invoice',handler)},[]);
useEffect(()=>{const handler=(e)=>{setPg('workers');setTimeout(()=>window.dispatchEvent(new CustomEvent('worker-open',{detail:e.detail})),80)};window.addEventListener('app-navigate-worker',handler);return()=>window.removeEventListener('app-navigate-worker',handler)},[]);
useEffect(()=>{const handler=(e)=>{setPg('facilities');setTimeout(()=>window.dispatchEvent(new CustomEvent('facility-open',{detail:e.detail})),80)};window.addEventListener('app-navigate-facility',handler);return()=>window.removeEventListener('app-navigate-facility',handler)},[]);
useEffect(()=>{const handler=()=>setPg('payments');window.addEventListener('app-navigate-payments',handler);return()=>window.removeEventListener('app-navigate-payments',handler)},[]);
// Open a transfer quote's details from anywhere (e.g. the invoice Service card link). Set the ?q= hash then switch page;
// TransferCalcPage reads the hash and auto-opens the matching quote, refetching on hashchange if needed.
useEffect(()=>{const handler=(e)=>{const q=e.detail?.q||'';try{window.location.hash='#transfer_calc?q='+encodeURIComponent(q)}catch{}setPg('transfer_calc');setTimeout(()=>{try{window.dispatchEvent(new HashChangeEvent('hashchange'))}catch{}},60)};window.addEventListener('app-navigate-transfer-calc',handler);return()=>window.removeEventListener('app-navigate-transfer-calc',handler)},[]);
useEffect(()=>{const handler=(e)=>{const q=e.detail?.q||'';try{window.location.hash='#renewal_calc?q='+encodeURIComponent(q)}catch{}setPg('renewal_calc');setTimeout(()=>{try{window.dispatchEvent(new HashChangeEvent('hashchange'))}catch{}},60)};window.addEventListener('app-navigate-renewal-calc',handler);return()=>window.removeEventListener('app-navigate-renewal-calc',handler)},[]);
useEffect(()=>{const natId=user?.person?.nationality_id;if(!sb||!natId)return;sb.from('nationalities').select('id,name_ar,name_en,code,flag_url').eq('id',natId).maybeSingle().then(({data})=>{if(data)setNatCache(data)})},[sb,user?.person?.nationality_id]);
const[visibility,setVisibility]=useState(()=>getVisibility());
const saveVisibility=(cfg)=>{setVisibility(cfg);localStorage.setItem('jisr_visibility',JSON.stringify(cfg))};
// ROLE-FIRST: a non-GM sees a tab when their role grants its view permission
// (canViewPage), UNLESS it's explicitly hidden for them (ui_visibility[id]===false)
// or the global config hides it. The GM bypasses personal overrides.
const isVisible=(id)=>{const locked=['admin_visibility'].includes(id);if(locked)return true;if(!isItemVisible(id))return false;if(visibility[id]===false)return false;if(!isGM&&user?.ui_visibility?.[id]===false)return false;if(!isGM&&!canViewPage(user,id))return false;return true;};
// Admin-only nav items: Sync Hub is hidden from non-GM users regardless of visibility toggles.
const isGM=user?.role?.name_ar==='المدير العام'||user?.role?.name_en==='General Manager';
// Employee Mahmoud Hassan is granted Sync Hub access despite not being GM.
const isSyncHubGrantedEmployee=(user?.person?.name_ar||'').replace(/\s+/g,' ').trim().includes('محمود حسن');
const canSeeSyncHub=isGM||isSyncHubGrantedEmployee||canPerm(user,'sync_hub.access');
const ADMIN_ONLY=['sync_hub'];
const canSeeAdminOnly=(id)=>isGM||visibility['grant_'+id]===true||(id==='sync_hub'&&isSyncHubGrantedEmployee);
const[isStandalone]=useState(()=>window.navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches);
const[installPrompt,setInstallPrompt]=useState(null);
const[showInstallBanner,setShowInstallBanner]=useState(false);
useEffect(()=>{const h=e=>{e.preventDefault();setInstallPrompt(e);if(!isStandalone&&!localStorage.getItem('jisr_install_dismissed'))setShowInstallBanner(true)};window.addEventListener('beforeinstallprompt',h);return()=>window.removeEventListener('beforeinstallprompt',h)},[isStandalone]);
const handleInstall=async()=>{if(!installPrompt)return;installPrompt.prompt();const{outcome}=await installPrompt.userChoice;if(outcome==='accepted')setShowInstallBanner(false);setInstallPrompt(null)};const toggleSec=k=>setExpanded(p=>({...p,[k]:!p[k]}));const hubDefaults={workforce:'facilities',sync_center:'sync_hub',finance_hub:'invoices',pricing_hub:'transfer_calc',persons_hub:'admin_clients',transactions_hub:'work-visa-permanent',tasks_hub:'saudization',admin_hub:'admin_offices'};// Pages with inner hash routing land on this canonical hash so they reset
// to their list/home view.
const pageHashes={};
// Bumped when the user taps a sidebar entry while already on that page.
// Used as a `key` on page roots so they force-remount, clearing any
// in-component state (e.g. BranchesPage's open detail view).
const[navResetKey,setNavResetKey]=useState(0);
const setPage=(id)=>{const mapped=hubDefaults[id]||id;if(mapped===pg)setNavResetKey(k=>k+1);setPg(mapped);setSubCrumbs([]);setSideOpen(false);
// Normalize the URL so pages with internal hash routing return to their
// default view (pages without hash routing are unaffected).
try{const target=pageHashes[mapped]||'';if(window.location.hash!==target){window.history.replaceState(null,'',target||window.location.pathname);window.dispatchEvent(new HashChangeEvent('hashchange'))}}catch{}};
// فتح تفاصيل الخدمة مباشرة من الفاتورة عبر الرقم المرجعي: نحفظ معرّف الطلب ثم ننتقل لتبويب معاملات التأشيرة المناسب (دائمة/مؤقتة).
const[txnDeepLink,setTxnDeepLink]=useState(null);
const onOpenService=({srId,svcCode})=>{
  // وجّه إلى تبويب معاملات الخدمة المطابق لكودها (تأشيرة/غرفة تجارية…) ثم افتح المعاملة مباشرة عبر الـ deep link.
  const norm=/temporary/i.test(svcCode||'')?'work_visa_temporary':(/^work_visa|permanent/i.test(svcCode||'')?'work_visa_permanent':(svcCode||''));
  const sec=TXN_SECTIONS.find(s=>s.code===norm);
  setTxnDeepLink(srId||null);setPage(sec?.id||'work-visa-permanent');
};
const loadStats=useCallback(()=>{const brId=dashBranch||null;Promise.all([sb.rpc('get_branch_stats',{p_branch_id:brId}),sb.from('branches').select('id,name_ar').is('deleted_at',null).order('name_ar')]).then(([statsR,branchesR])=>{if(statsR.data)setStats(statsR.data);setDashBranches(branchesR.data||[])})},[sb,dashBranch]);useEffect(()=>{loadStats()},[loadStats]);
useEffect(()=>{if(!sb)return;const ch=sb.channel('jisr-realtime-sync').on('postgres_changes',{event:'*',schema:'public',table:'invoices'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'clients'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'workers'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'facilities'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'activity_log'},()=>loadStats()).on('postgres_changes',{event:'*',schema:'public',table:'invoice_payments'},()=>loadStats()).subscribe();return()=>{sb.removeChannel(ch)}},[sb,loadStats]);
useEffect(()=>{const cleanup=setupKeyboardShortcuts({'ctrl+n':()=>{},'ctrl+/':()=>{tt(T('Ctrl+N إضافة جديد','Ctrl+N New'))},'escape':()=>{setSideOpen(false)}});return cleanup},[]);
const loadActivityLog=useCallback(async()=>{setActivityLoading(true);try{const{data}=await sb.from('activity_log').select('*,users:user_id(name_ar,name_en)').order('created_at',{ascending:false}).limit(100);setActivityLog(data||[])}catch(e){setActivityLog([])}setActivityLoading(false)},[sb]);
const T=(ar,en)=>lang==='ar'?ar:en;const TL=(ar)=>lang==='ar'?ar:(TR[ar]||ar);const nav=[
{id:'home',l:T('الرئيسية','Dashboard'),i:'home'},
{id:'workforce',l:T('المنشآت والعمالة','Workforce'),i:'worker'},
{id:'finance_hub',l:T('المالية','Operations'),i:'invoice'},
{id:'pricing_hub',l:T('الحسبات','Calc'),i:'calc'},
{id:'transactions_hub',l:T('الخدمات','Services'),i:'transaction'},
{id:'tasks_hub',l:T('المهام','Tasks'),i:'tasks'},
{id:'persons_hub',l:T('الأشخاص','Persons'),i:'client'},
{id:'sync_center',l:T('مركز المزامنة','Sync Hub'),i:'transaction'},
{id:'admin_hub',l:T('الإدارة','Admin'),i:'settings'}
];
const hubTabs={
  workforce:[{id:'facilities',l:T('المنشآت','Facilities'),i:'facility'},{id:'workers',l:T('العمالة الدائمة','Permanent Workforce'),i:'labor'},{id:'temp_workers',l:T('العمالة المؤقتة','Temporary Workforce'),i:'labor'},{id:'work_visas',l:T('تأشيرات العمل','Work Visas'),i:'labor'}],
  sync_center:[{id:'sync_hub',l:T('مزامنة المنشآت والعمالة','Sync Facilities & Workers'),i:'facility'},{id:'sync_log',l:T('سجل المزامنات','Sync Log'),i:'transaction'}],
  finance_hub:[{id:'invoices',l:T('الفواتير والمعاملات','Invoices'),i:'invoice'},{id:'deposits',l:T('الإيداعات','Deposits'),i:'deposit'},{id:'payments',l:T('سدادات الخدمات','Service Payments'),i:'receipt'},{id:'ext_payments',l:T('سدادات خارجية','External Payments'),i:'receipt'}],
  pricing_hub:[{id:'transfer_calc',l:T('حسبة نقل الكفالات','Transfer Calc'),i:'calc'},{id:'renewal_calc',l:T('حسبة تجديد الإقامات','Renewal Calc'),i:'refresh'}],
  persons_hub:[{id:'admin_clients',l:T('العملاء','Clients'),i:'clients'},{id:'admin_agents',l:T('الوسطاء','Agents'),i:'broker'}],
  transactions_hub:TXN_SECTIONS.map(t=>({id:t.id,l:T(t.ar,t.en),i:t.i})),
  tasks_hub:TASK_SECTIONS.map(t=>({id:t.id,l:T(t.ar,t.en),i:t.i})),
  admin_hub:[{id:'admin_offices',l:T('المكاتب','Offices'),i:'branch'},{id:'admin_bank_accounts',l:T('الحسابات البنكية','Bank Accounts'),i:'bank'},{id:'admin_permissions',l:T('المستخدمون','Users'),i:'userPerm'},{id:'admin_roles',l:T('الأدوار والصلاحيات','Roles & Permissions'),i:'userPerm'},{id:'admin_services',l:T('الخدمات','Services'),i:'notes'},{id:'admin_fees',l:T('الرسوم','Fees'),i:'payment'},{id:'settings_fields',l:T('الحقول','Fields'),i:'settings'}]
};
// Single source of truth for a page's icon: resolve a tab's nav icon (by page id) rendered
// in gold at empty-state size, so any "no records" card automatically matches its tab icon.
const navEmptyIcon=(pgId,size=22)=>{const nm=Object.values(hubTabs).flat().find(t=>t.id===pgId)?.i;const el=nm&&DT(C.gold)[nm];return el?React.cloneElement(el,{width:size,height:size}):null};
const pages={
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

clients:{table:'clients',title:T('العملاء','Clients'),icon:'clients',
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
{k:'installment_order',l:'ترتيب الدفعة',d:1,r:1},
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
{k:'installment_id',l:'الدفعة',fk:'invoice_installments'},
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
<div style={{padding:'14px 24px 44px',flexShrink:0,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
<div style={{fontSize:lang==='ar'?16:13,fontWeight:700,color:'var(--accent)',lineHeight:1.3,fontFamily:"'Reem Kufi','Cairo',sans-serif",letterSpacing:lang==='ar'?'.3px':'2px',textAlign:'center'}}>{lang==='ar'?'تأشيرة البناء والإنشاء':'VISA ALBINA & ALINSHA'}</div>
<div style={{fontSize:8.5,fontWeight:500,color:'var(--accent)',opacity:.6,letterSpacing:lang==='ar'?'2.2px':'.3px',marginTop:6,fontFamily:"'Reem Kufi','Cairo',sans-serif",direction:lang==='ar'?'ltr':'rtl',textAlign:'center'}}>{lang==='ar'?'VISA ALBINA & ALINSHA':'تأشيرة البناء والإنشاء'}</div>
</div>
{/* Nav */}
<nav style={{flex:1,overflowY:'auto',padding:'0 10px 12px',scrollbarWidth:'none',msOverflowStyle:'none',WebkitOverflowScrolling:'touch'}}>
<style>{'aside nav::-webkit-scrollbar{display:none}.dash-content::-webkit-scrollbar{display:none}.sr-scroll{scrollbar-width:thin;scrollbar-color:rgba(212,160,23,.25) transparent}.sr-scroll::-webkit-scrollbar{width:2px}.sr-scroll::-webkit-scrollbar-track{background:transparent}.sr-scroll::-webkit-scrollbar-thumb{background:rgba(212,160,23,.25);border-radius:3px}.sr-scroll::-webkit-scrollbar-thumb:hover{background:rgba(212,160,23,.4)}'}</style>
<div style={{display:'flex',flexDirection:'column',gap:2}}>
{nav.filter(n=>{if(ADMIN_ONLY.includes(n.id)&&!canSeeAdminOnly(n.id))return false;if(!isVisible(n.id))return false;const s=hubTabs[n.id];return !s||s.some(t=>isVisible(t.id))}).map((n,idx)=>{
const rawSubs=hubTabs[n.id]||null
const subs=rawSubs?rawSubs.filter(t=>isVisible(t.id)):null
const hubActive=subs&&subs.some(t=>t.id===pg)
const isOpen=subs?(navExpanded[n.id]!==undefined?navExpanded[n.id]:hubActive):false
const isActive=pg===n.id||hubActive
const mainClr=isActive?C.gold:'var(--sbtx)'
return<div key={n.id}>
<div onClick={()=>{if(subs){setNavExpanded(p=>({...p,[n.id]:!isOpen}))}else{setPage(n.id)}}} style={{display:'flex',alignItems:'center',gap:8,padding:idx===0?'0 14px 10px':'10px 14px',cursor:'pointer',fontSize:13,fontWeight:600,color:mainClr,letterSpacing:'.2px',transition:'.18s',opacity:1}}>
<span style={{flex:1,textAlign:lang==='ar'?'right':'left'}}>{n.l}</span>
{n.n>0&&<span style={{fontSize:9,fontWeight:700,background:C.red,color:'#fff',padding:'1px 6px',borderRadius:8,minWidth:16,textAlign:'center'}}>{n.n}</span>}
{subs&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={isActive?C.gold:'var(--sbtx2)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{transition:'transform .2s',transform:isOpen?'rotate(0deg)':'rotate(180deg)',flexShrink:0}}><polyline points="18 15 12 9 6 15"/></svg>}
</div>
{subs&&isOpen&&<div style={{display:'flex',flexDirection:'column',gap:1,margin:'3px 0 6px',[lang==='ar'?'paddingLeft':'paddingRight']:10}}>
{subs.map(t=>{const sAct=pg===t.id;const subClr=sAct?C.gold:'var(--sbtx)';const subIcon=DT(subClr)[t.i||n.i];return<div key={t.id} onClick={()=>setPage(t.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',borderRadius:10,cursor:'pointer',fontSize:12,fontWeight:sAct?700:500,color:subClr,background:sAct?'rgba(212,160,23,.08)':'transparent',transition:'.15s',position:'relative'}}>
{sAct&&<div style={{position:'absolute',[lang==='ar'?'right':'left']:4,top:10,bottom:10,width:3,borderRadius:3,background:C.gold}}/>}
<span style={{width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,opacity:sAct?1:.8}}>{subIcon}</span>
<span style={{flex:1,textAlign:lang==='ar'?'right':'left'}}>{t.l}</span>
{t.n>0&&<span style={{fontSize:9,fontWeight:700,background:sAct?'rgba(212,160,23,.15)':'var(--bd)',color:sAct?C.gold:'var(--sbtx2)',padding:'1px 7px',borderRadius:8,minWidth:16,textAlign:'center'}}>{t.n}</span>}
</div>})}
</div>}
</div>})}
</div>
</nav>
</aside>
{/* ═══ MAIN AREA ═══ */}
<div style={{flex:1,display:'flex',flexDirection:'column',background:'var(--bg)',minWidth:0}}>
{/* ═══ TOPBAR ═══ */}
<header className='dash-header' style={{height:56,background:'var(--sb)',display:'flex',alignItems:'center',gap:14,padding:'0 20px',flexShrink:0,boxShadow:'0 2px 12px rgba(0,0,0,.12)',minWidth:0}}>
<div className='mob-hamburger' onClick={()=>setSideOpen(!sideOpen)} onMouseEnter={()=>setHbHover(true)} onMouseLeave={()=>setHbHover(false)} style={{display:'none',width:40,height:40,borderRadius:10,background:sideOpen?'rgba(212,160,23,.12)':(hbHover?'rgba(212,160,23,.07)':'transparent'),flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,cursor:'pointer',flexShrink:0,transition:'.18s'}}><span style={{width:22,height:2.2,borderRadius:2,background:'linear-gradient(90deg,var(--accent-strong),var(--accent))',transition:'.22s'}}/><span style={{width:22,height:2.2,borderRadius:2,background:'linear-gradient(90deg,var(--accent-strong),var(--accent))',transition:'.22s'}}/><span style={{width:22,height:2.2,borderRadius:2,background:'linear-gradient(90deg,var(--accent-strong),var(--accent))',transition:'.22s'}}/></div>
{/* عنوان الصفحة الحالية — يعكس اختيار السايد بار */}
{(()=>{
const specials={home:T('الرئيسية','Dashboard'),sync_hub:T('مركز المزامنة','Sync Hub'),settings:T('الإعدادات','Settings'),worker_leaves:T('إجازات العمالة','Worker Leaves'),transfer_calc:T('تسعيرات التنازل','Transfer Calc'),renewal_calc:T('تسعيرات التجديد','Renewal Calc'),kpi:T('المؤشرات','KPIs'),appointments:T('المواعيد','Appointments'),installments:T('الدفعات','Installments'),expenses:T('المصروفات','Expenses')};
let hubLabel='',pageLabel='';
for(const [hubId,tabs] of Object.entries(hubTabs)){const tab=tabs.find(t=>t.id===pg);if(tab){const hub=nav.find(n=>n.id===hubId);hubLabel=hub?.l||'';pageLabel=tab.l;break}}
if(!pageLabel){const direct=nav.find(n=>n.id===pg);if(direct)pageLabel=direct.l;else if(specials[pg])pageLabel=specials[pg]}
if(!pageLabel)return null;
const chev=lang==='ar'?<polyline points="15 18 9 12 15 6"/>:<polyline points="9 18 15 12 9 6"/>;
return<div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,overflow:'hidden'}}>
{hubLabel&&<>
<span style={{fontSize:11.5,fontWeight:600,color:'var(--hdtx2)',whiteSpace:'nowrap'}}>{hubLabel}</span>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent-bd)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{chev}</svg>
</>}
<span style={{fontSize:13.5,fontWeight:600,color:'var(--accent)',whiteSpace:'nowrap',textShadow:'0 1px 8px rgba(212,160,23,.18)'}}>{pageLabel}</span>
</div>
})()}
{/* فاصل مرن: يدفع كل المحتوى لليسار */}
<div style={{flex:1,minWidth:0}}/>
{/* اليسار: الساعة + التاريخ */}
<div className='topbar-datetime' style={{display:'flex',alignItems:'center',gap:11,whiteSpace:'nowrap',flexShrink:0}}>
{(()=>{const d=new Date();const pad=n=>String(n).padStart(2,'0');const greg=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());const day=d.toLocaleDateString(lang==='ar'?'ar-SA':'en-US',{weekday:'long'});let hijri='';try{const hp=new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'}).formatToParts(d);const hv=t=>{const p=hp.find(x=>x.type===t);return p?p.value:''};hijri=hv('year')+'-'+pad(+hv('month'))+'-'+pad(+hv('day'))}catch{}return<div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',lineHeight:1.3,gap:3,fontFamily:"'Reem Kufi','Cairo',sans-serif"}}><span style={{fontSize:9.5,fontWeight:500,color:'var(--hdtx2)',letterSpacing:'.5px',direction:'ltr',alignSelf:'center'}}>{hijri}</span><div style={{display:'flex',alignItems:'baseline',gap:7}}><span style={{fontSize:11.5,fontWeight:700,color:C.gold}}>{day}</span><span style={{fontSize:12,fontWeight:600,color:C.gold,letterSpacing:'.5px',direction:'ltr',opacity:.9}}>{greg}</span></div></div>})()}
</div>
{/* اليسار: مساعد جسر · اللغة | الملف الشخصي · خروج */}
<div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
{/* زر تغيير اللغة — يبدّل بين العربية والإنجليزية */}
<div onClick={switchLang} title={lang==='ar'?'English':'العربية'} style={{width:36,height:36,borderRadius:9,background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'.18s'}} onMouseEnter={e=>{e.currentTarget.style.background='var(--hd-ico-hv-bg)';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke='var(--hd-ico-hv)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke='rgba(212,160,23,.72)'}}>
<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,.72)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,transition:'stroke .18s'}}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z"/></svg>
</div>
{/* الملف الشخصي — كرت الاسم يفتح بيانات المستخدم مباشرة */}
<div data-avatar onClick={()=>{const nat=natCache;const natLabel=nat?(lang==='en'?nat.name_en||nat.name_ar:nat.name_ar)||'':'';setShowProfile(true);setProfileTab('info');setProfileErr({});setProfileData({phone:user.personal_phone||user.person?.phone_primary||'',email:user.email||user.person?.email||'',name_ar:user.person?.name_ar||'',name_en:user.person?.name_en||'',id_number:user.person?.id_number||'',nationality:natLabel,nationality_code:nat?.code||'',nationality_flag:nat?.flag_url||'',avatar_url:user.person?.avatar_url||'',_origEmail:user.email||user.person?.email||''});
// Fallback: fetch nationality only if cache wasn't ready yet
if(!nat){(async()=>{const natId=user.person?.nationality_id;if(natId){const{data}=await sb.from('nationalities').select('id,name_ar,name_en,code,flag_url').eq('id',natId).maybeSingle();if(data){setNatCache(data);const lbl=lang==='en'?data.name_en||data.name_ar:data.name_ar;setProfileData(p=>({...p,nationality:lbl||'',nationality_code:data.code||'',nationality_flag:data.flag_url||''}))}}})();}}} title={(lang==='en'?(user?.person?.name_en||user?.person?.name_ar):(user?.person?.name_ar||user?.person?.name_en))||(lang==='ar'?'الملف الشخصي':'Profile')} style={{width:36,height:36,borderRadius:9,background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer',transition:'.18s',overflow:'hidden'}} onMouseEnter={e=>{e.currentTarget.style.background='var(--hd-ico-hv-bg)';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke='var(--hd-ico-hv)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke='rgba(212,160,23,.72)'}}>{avatarUrl?<img src={avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,.72)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{display:'block',flexShrink:0,transition:'stroke .18s'}}><path d="M20 21v-1.5a4.5 4.5 0 00-4.5-4.5h-7A4.5 4.5 0 004 19.5V21"/><circle cx="12" cy="7.5" r="4"/></svg>}</div>
{/* زر الخروج — كرت أيقونة مثل الإشعارات */}
<div onClick={onLogout} title={lang==='ar'?'تسجيل الخروج':'Sign Out'} style={{width:36,height:36,borderRadius:9,background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'.18s',position:'relative'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.14)';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke='rgba(232,120,100,.95)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';const s=e.currentTarget.querySelector('svg');if(s)s.style.stroke='rgba(192,57,43,1)'}}>
<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(192,57,43,1)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke .18s',transform:lang==='ar'?'scaleX(-1)':'none'}}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
</div>
</div>
</header>
{/* ═══ Content ═══ */}
<div className='dash-content' style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:'32px max(44px, calc((100% - 1500px) / 2))',msOverflowStyle:'none',scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
{/* Permission gate — block direct access to pages the user lacks "view" on. */}
{(()=>{const blocked=!canViewPage(user,pg);if(!blocked)return null;return(
<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'80px 24px',gap:14,color:'var(--tx3)'}}>
<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.85}}><rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
<div style={{fontSize:18,fontWeight:700,color:'var(--tx)'}}>{T('لا تملك صلاحية الوصول','No access')}</div>
<div style={{fontSize:13,color:'var(--tx4)',maxWidth:380,lineHeight:1.7}}>{T('ليس لديك صلاحية لعرض هذه الصفحة. تواصل مع المدير العام لمنحك الصلاحية.','You do not have permission to view this page. Contact the General Manager to request access.')}</div>
</div>)})()}
{canViewPage(user,pg)&&pg==='home'&&<HomePage stats={stats} lang={lang} branches={dashBranches} selectedBranch={dashBranch} onBranchChange={setDashBranch} sb={sb} onNavigate={setPage} toast={tt}/>}

{/* ═══ HUB CONTENT (sidebar handles navigation) ═══ */}
{(()=>{
const allHubPages=Object.values(hubTabs).flat().map(t=>t.id).concat(['worker_leaves','transfer_calc','renewal_calc'])
if(!allHubPages.includes(pg))return null
if(!canViewPage(user,pg))return null
return<div><div>
{/* العمالة */}
{pg==='facilities'&&<FacilitiesPage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='workers'&&<WorkforcePage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='temp_workers'&&<TempWorkforcePage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='work_visas'&&<WorkVisasPage sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo}/>}
{pg==='worker_leaves'&&<WorkerLeavesPage sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='transfer_calc'&&<TransferCalcPage sb={sb} toast={tt} user={user} lang={lang} emptyIcon={navEmptyIcon('transfer_calc')} onNewCalc={()=>setShowKafalaCalc(true)}/>}
{pg==='renewal_calc'&&<RenewalCalcPage sb={sb} toast={tt} user={user} lang={lang} emptyIcon={navEmptyIcon('renewal_calc')} onNewCalc={()=>setShowRenewalCalc(true)}/>}
{/* مركز المزامنة */}
{pg==='sync_hub'&&canSeeSyncHub&&<SyncHub sb={sb} toast={tt} user={user} lang={lang} initialFocus="sbc"/>}
{pg==='sync_log'&&<SyncActivitiesPage sb={sb} lang={lang}/>}
{/* العمليات */}
{pg==='invoices'&&<InvoicePageFull sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch} emptyIcon={navEmptyIcon('invoices')} onNewInvoice={()=>setShowServiceRequest(true)} onOpenService={onOpenService}/>}
{pg==='payments'&&<PaymentsPage sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch} emptyIcon={navEmptyIcon('payments')}/>}
{pg==='ext_payments'&&<ExternalPaymentsPage sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch} emptyIcon={navEmptyIcon('ext_payments')}/>}
{pg==='deposits'&&<DepositsPage sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch} emptyIcon={navEmptyIcon('deposits')}/>}
{pg==='sbc'&&<SbcCenterPage sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch}/>}
{pg==='baladi'&&<BaladiCenterPage sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch}/>}
{/* لوحات مراحل ما بعد التأشيرة — تظهر فوق قوائم المعاملات في تبويب كل قسم */}
{pg==='medical'&&<MedicalStagePage sb={sb} user={user} toast={tt} lang={lang}/>}
{pg==='work-cards'&&<WorkCardsStagePage sb={sb} user={user} toast={tt} lang={lang}/>}
{pg==='iqama'&&<IqamaIssuanceStagePage sb={sb} user={user} toast={tt} lang={lang}/>}
{pg==='iqama-print'&&<IqamaPrintStagePage sb={sb} user={user} toast={tt} lang={lang}/>}
{TXN_SECTIONS.filter(s=>s.code&&s.id===pg).map(s=><TransactionsPage key={s.id} tabId={s.id} sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch} lockedService={s.code} lockedLabel={T(s.ar,s.en)} emptyIcon={navEmptyIcon(s.id)} initialDetailId={txnDeepLink} onConsumeInitialDetail={()=>setTxnDeepLink(null)}/>)}
{TXN_SECTIONS.filter(s=>s.accountant&&s.id===pg).map(s=><TransactionsPage key={s.id} tabId={s.id} accountantMode sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch} lockedLabel={T(s.ar,s.en)} emptyIcon={navEmptyIcon(s.id)}/>)}
{TXN_SECTIONS.filter(s=>!s.code&&!s.page&&!s.accountant&&s.id===pg).map(s=><SectionStub key={s.id} title={T(s.ar,s.en)} lang={lang}/>)}
{/* المهام */}
{TASK_SECTIONS.filter(s=>s.code&&s.id===pg).map(s=><TransactionsPage key={s.id} tabId={s.id} sb={sb} user={user} toast={tt} lang={lang} branchId={dashBranch} lockedService={s.code} lockedLabel={T(s.ar,s.en)} emptyIcon={navEmptyIcon(s.id)}/>)}
{/* الإدارة */}
{pg==='admin_offices'&&<BranchesPage key={navResetKey} sb={sb} toast={tt} user={user} lang={lang} showStaff={false} singleTab="branches" AdminPage={AdminPageFull} adminProps={{sb,toast:tt,user,lang,onTabChange:setSTabInfo,defaultTab:'users',branchId:dashBranch}}/>}
{pg==='admin_bank_accounts'&&<BankAccountsPage key={navResetKey} sb={sb} toast={tt} user={user} lang={lang}/>}
{pg==='admin_clients'&&<ClientsPage sb={sb} user={user} toast={tt} lang={lang} emptyIcon={navEmptyIcon('admin_clients')}/>}
{pg==='admin_agents'&&<AgentsPage sb={sb} user={user} toast={tt} lang={lang} emptyIcon={navEmptyIcon('admin_agents')}/>}
{pg==='admin_services'&&<ServiceAdminPage sb={sb} user={user} toast={tt} lang={lang}/>}
{pg==='admin_fees'&&<FeesAdminPage sb={sb} user={user} toast={tt} lang={lang}/>}
{pg==='admin_permissions'&&<PermissionsPage sb={sb} user={user} toast={tt} lang={lang} nav={nav} hubTabs={hubTabs} visibility={visibility} onVisibilityChange={saveVisibility} emptyIcon={navEmptyIcon('admin_permissions')}/>}
{pg==='admin_roles'&&<RolesAdminPage sb={sb} user={user} toast={tt} lang={lang} nav={nav} hubTabs={hubTabs} emptyIcon={navEmptyIcon('admin_roles')}/>}
{pg==='admin_ui_controls'&&(()=>{window.setTimeout(()=>setPg('admin_permissions'),0);return null})()}
{pg==='admin_visibility'&&(()=>{window.setTimeout(()=>setPg('admin_ui_controls'),0);return null})()}
{/* الإعدادات */}
{pg==='settings_fields'&&<SettingsPageFull sb={sb} toast={tt} user={user} lang={lang} onTabChange={setSTabInfo} defaultMainTab="fields_group"/>}
</div></div>})()}

{/* ═══ الإعدادات ═══ */}
{pg==='kpi'&&<KPIPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
{(pg==='installments'||pg==='expenses')&&pageConf&&<CrudPage sb={sb} user={user} conf={pageConf} toast={tt} onRefresh={loadStats} lang={lang}/>}
{pg==='appointments'&&<AppointmentsPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch}/>}
</div>
</div>
{showKafalaCalc&&<KafalaCalculator sb={sb} user={user} toast={tt} lang={lang} onClose={()=>setShowKafalaCalc(false)} onGoToTransferCalc={(q)=>{setShowKafalaCalc(false);try{window.location.hash='#transfer_calc?q='+encodeURIComponent(q||'')}catch{}setPg('transfer_calc')}}/>}
{showRenewalCalc&&<RenewalCalculator sb={sb} user={user} toast={tt} lang={lang} onClose={()=>setShowRenewalCalc(false)} onGoToRenewalCalc={(q)=>{setShowRenewalCalc(false);try{window.location.hash='#renewal_calc?q='+encodeURIComponent(q||'')}catch{}setPg('renewal_calc')}}/>}
{/* نافذة الفاتورة — ترسم نافذتها الموحّدة بنفسها (ويزارد متحكَّم عبر pages) */}
{showServiceRequest&&<ServiceRequestPage sb={sb} toast={tt} user={user} lang={lang} branchId={dashBranch} onClose={()=>setShowServiceRequest(false)}/>}
{toastMsg&&(()=>{const isErr=toastMsg.includes('خطأ');const isDel=toastMsg.includes('حذف');const clr=isErr?'#e5867a':isDel?'#e5867a':'#6fc28a';const bg=isErr?'rgba(32,18,18,.92)':isDel?'rgba(32,18,18,.92)':'rgba(18,32,22,.92)';const bdr=isErr?'rgba(192,57,43,.35)':isDel?'rgba(192,57,43,.35)':'rgba(55,140,85,.45)';return<div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:bg,color:clr,fontFamily:"'Cairo',sans-serif",fontSize:12.5,fontWeight:600,padding:'11px 18px',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.45), 0 0 0 1px '+bdr,backdropFilter:'blur(10px)',display:'flex',alignItems:'center',gap:10,animation:'toastSlide .35s cubic-bezier(.2,.85,.3,1.05)',maxWidth:'calc(100vw - 32px)'}}>{isErr?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>:isDel?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}<span>{toastMsg}</span><style>{`@keyframes toastSlide{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style></div>})()}
{/* ═══ PROFILE MODAL — FormKit (variant="edit") ═══ */}
{showProfile&&profileData&&(()=>{
const ar=lang==='ar';
const T2=(arT,enT)=>ar?arT:enT;
const emailChanged=profileData.email!==profileData._origEmail&&profileData.email;
const doSave=async()=>{
const err={};
const ph=profileData.phone?.replace('+966','');
if(!ph||ph.length!==9)err.phone=T2('رقم الجوال يجب أن يتكون من 9 أرقام','Phone must be 9 digits');
if(!profileData.email)err.email=T2('الرجاء إدخال البريد الإلكتروني','Please enter email');
else if(!/\S+@\S+\.\S+/.test(profileData.email))err.email=T2('يرجى إدخال بريد إلكتروني صحيح','Please enter a valid email');
setProfileErr(err);if(Object.keys(err).length>0)return;
setProfileBusy(true);try{
const{error}=await sb.from('users').update({personal_phone:profileData.phone||null,email:profileData.email||null,updated_at:new Date().toISOString()}).eq('id',user.id);
if(error)throw error;
await sb.from('persons').update({phone_primary:profileData.phone||null,email:profileData.email||null,updated_at:new Date().toISOString()}).eq('id',user.person_id);
if(emailChanged){await sb.auth.updateUser({email:profileData.email});tt(T2('تم إرسال رابط تأكيد للبريد الجديد','Confirmation link sent to new email'))}
user.personal_phone=profileData.phone;user.email=profileData.email;
if(user.person){user.person.phone_primary=profileData.phone;user.person.email=profileData.email}
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
const avatarSrc=profileData.avatar_url||user?.avatar_url||user?.person?.avatar_url;
const lblS={fontSize:11,fontWeight:600,color:'var(--tx4)'};
const valS={fontSize:14,fontWeight:600,color:'var(--tx)',marginTop:4,textAlign:'right'};
const roleName=(ar?user?.role?.name_ar:user?.role?.name_en)||'';
const initial=(profileData.name_ar||'').trim().charAt(0)||'م';
return<>
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
<FKModal open onClose={()=>{setShowProfile(false);setEmailConfirmStep(false)}} width={600} height="auto" accent="#D4A017"
 title={T2('الملف الشخصي','Profile')}
 Icon={User}>
<ModalSection Icon={Lock} label={T2('الملف الشخصي','Profile')}>
<InfoGrid>
<InfoRow label={T2('الاسم بالعربي','Name (Arabic)')} value={profileData.name_ar||'—'}/>
<InfoRow label={T2('الاسم بالإنجليزي','Name (English)')} value={profileData.name_en||'—'} mono/>
<InfoRow label={T2('رقم الهوية','ID Number')} value={profileData.id_number||'—'} mono/>
<InfoRow label={T2('الجنسية','Nationality')} value={profileData.nationality||T2('غير محدد','—')}/>
<InfoRow label={T2('البريد الإلكتروني','Email')} value={profileData.email||T2('غير محدد','—')} mono/>
<InfoRow label={T2('رقم الجوال','Phone')} value={profileData.phone?profileData.phone.replace(/^\+966/,'0'):T2('غير محدد','—')} mono/>
</InfoGrid>
</ModalSection>
</FKModal>
<ConfirmDialog open={!!emailConfirmStep} danger={false}
 title={T2('تأكيد تغيير البريد الإلكتروني','Confirm Email Change')}
 message={<span>{T2('سيتم إرسال رابط تأكيد إلى البريد الجديد. يجب فتح الرابط لإكمال التغيير.','A confirmation link will be sent to the new email. You must open the link to complete the change.')}<br/><span style={{display:'inline-block',marginTop:8,direction:'ltr'}}><b style={{color:'var(--tx2)'}}>{profileData._origEmail}</b><span style={{margin:'0 8px',color:'rgba(255,255,255,.4)'}}>→</span><b style={{color:'#D4A017'}}>{profileData.email}</b></span></span>}
 confirmText={profileBusy?T2('جارٍ الإرسال...','Sending...'):T2('تأكيد وإرسال الرابط','Confirm & Send Link')}
 cancelText={T2('تراجع','Back')}
 onConfirm={()=>{if(!profileBusy)doSave()}}
 onCancel={()=>setEmailConfirmStep(false)}/>
</>})()}
<Css/>
{/* ═══ MOBILE BOTTOM NAV ═══ */}
<nav className='mob-bottom-nav'>{[
{id:'home',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3l9 7.5V21a1.5 1.5 0 01-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 013 21V10.5z" fill={pg==='home'?C.gold+'30':'none'} stroke={pg==='home'?C.gold:'var(--sbtx2)'} strokeWidth="1.5" strokeLinejoin="round"/></svg>,l:T('الرئيسية','Home')},
{id:'facilities',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 22V4a1 1 0 011-1h8a1 1 0 011 1v18" fill={pg==='facilities'?C.gold+'30':'none'} stroke={pg==='facilities'?C.gold:'var(--sbtx2)'} strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 9H5a1 1 0 00-1 1v11a1 1 0 001 1h14" stroke={pg==='facilities'?C.gold:'var(--sbtx2)'} strokeWidth="1.5" strokeLinejoin="round" opacity=".6"/><line x1="12.5" y1="7" x2="15.5" y2="7" stroke={pg==='facilities'?C.gold:'var(--sbtx2)'} strokeWidth="1.5" strokeLinecap="round" opacity=".7"/><line x1="12.5" y1="11" x2="15.5" y2="11" stroke={pg==='facilities'?C.gold:'var(--sbtx2)'} strokeWidth="1.5" strokeLinecap="round" opacity=".7"/><line x1="12.5" y1="15" x2="15.5" y2="15" stroke={pg==='facilities'?C.gold:'var(--sbtx2)'} strokeWidth="1.5" strokeLinecap="round" opacity=".7"/></svg>,l:T('المنشآت','Facilities')},
{id:'invoices',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" fill={pg==='invoices'?C.gold+'30':'none'} stroke={pg==='invoices'?C.gold:'var(--sbtx2)'} strokeWidth="1.5"/><path d="M14 2v4a2 2 0 0 0 2 2h4" stroke={pg==='invoices'?C.gold:'var(--sbtx2)'} strokeWidth="1.5"/><path d="M10 9H8M16 13H8M16 17H8" stroke={pg==='invoices'?C.gold:'var(--sbtx2)'} strokeWidth="1.5" opacity=".6"/></svg>,l:T('الفواتير','Invoices')},
{id:'workers',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4.5 15a7.5 7.5 0 0115 0" fill={pg==='workers'?C.gold+'30':'none'} stroke={pg==='workers'?C.gold:'var(--sbtx2)'} strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 4v3.5M12 4a4 4 0 00-4 4v.5M12 4a4 4 0 014 4v.5" stroke={pg==='workers'?C.gold:'var(--sbtx2)'} strokeWidth="1.5" strokeLinecap="round" opacity=".6"/><rect x="2.5" y="15" width="19" height="3" rx="1.5" fill={pg==='workers'?C.gold+'30':'none'} stroke={pg==='workers'?C.gold:'var(--sbtx2)'} strokeWidth="1.5"/></svg>,l:T('العمّال','Workers')},
{id:'_more',icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="2" fill={sideOpen?C.gold:'var(--sbtx2)'}/><circle cx="12" cy="12" r="2" fill={sideOpen?C.gold:'var(--sbtx2)'}/><circle cx="19" cy="12" r="2" fill={sideOpen?C.gold:'var(--sbtx2)'}/></svg>,l:T('المزيد','More')}
].map(n=><div key={n.id} onClick={()=>{n.id==='_more'?setSideOpen(!sideOpen):setPage(n.id)}} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'6px 0',cursor:'pointer',position:'relative'}}>
{pg===n.id&&n.id!=='_more'&&<div style={{position:'absolute',top:0,width:20,height:3,borderRadius:'0 0 3px 3px',background:C.gold,transition:'all .2s ease'}}/>}
{n.icon}<span style={{fontSize:10,fontWeight:pg===n.id?700:500,color:pg===n.id?C.gold:sideOpen&&n.id==='_more'?C.gold:'var(--sbtx2)',transition:'color .15s ease'}}>{n.l}</span>
</div>)}</nav>
{/* ═══ INSTALL BANNER ═══ */}
{showInstallBanner&&!isStandalone&&<div className='install-banner' style={{position:'fixed',bottom:'calc(70px + var(--safe-b, 0px))',left:12,right:12,zIndex:197,background:'linear-gradient(135deg,#1a1a1a,#252525)',border:'1px solid rgba(212,160,23,.25)',borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,boxShadow:'0 8px 32px rgba(0,0,0,.5)',fontFamily:"'Cairo',sans-serif"}}>
<div style={{width:44,height:44,borderRadius:12,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12l7 7 7-7" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
</div>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.9)'}}>{T('ثبّت التطبيق','Install App')}</div>
<div style={{fontSize:10,color:'rgba(255,255,255,.45)',marginTop:2}}>{T('أضف تأشيرة البناء والإنشاء لشاشتك الرئيسية','Add Visa Albina & Alinsha to your home screen')}</div>
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
const[saveErr,setSaveErr]=useState(null)
const[viewRow,setViewRow]=useState(null)
const[delId,setDelId]=useState(null)
const load=useCallback(async()=>{setLoading(true);let qr=sb.from(table).select('*').is('deleted_at',null);if(filter)qr=qr.eq(filter.k,filter.v);const{data:d}=await qr.order('created_at',{ascending:false}).limit(500);setData(d||[]);setLoading(false)},[sb,table,filter?.k,filter?.v])
useEffect(()=>{load()},[load])
const openAdd=()=>{setSaveErr(null);const init={};flds.forEach(f=>init[f.k]='');if(filter)init[filter.k]=filter.v;setForm(init);setPop('add')}
const openEdit=row=>{setSaveErr(null);const init={};flds.forEach(f=>init[f.k]=row[f.k]??'');init._id=row.id;setForm(init);setPop('edit')}
const save=async()=>{setSaveErr(null);for(const f of flds){if(f.r&&!form[f.k]){setSaveErr(TL(f.l)+T(' مطلوب',' is required'));return}}setSaving(true);try{const p={...form};delete p._id;Object.keys(p).forEach(k=>{if(p[k]==='')p[k]=null});if(pop==='add'){p.created_by=user?.id;const{error}=await sb.from(table).insert(p);if(error)throw error;toast(T('تمت الإضافة','Added successfully'))}else{p.updated_by=user?.id;const{error}=await sb.from(table).update(p).eq('id',form._id);if(error)throw error;toast(T('تم التعديل','Updated successfully'))}setPop(null);load();onRefresh?.()}catch(e){setSaveErr((lang==='ar'?'خطأ: ':'Error: ')+((e.message||'').slice(0,80)))}setSaving(false)}
const del=async id=>{const{error}=await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id);if(error)toast(T('خطأ','Error'));else{toast(T('تم الحذف','Deleted successfully'));load();onRefresh?.()}}
const filtered=data.filter(r=>!q||cols.some(([c])=>String(r[c]??'').toLowerCase().includes(q.toLowerCase())))
const nm=v=>Number(v||0).toLocaleString('en-US')
const sMap={active:C.ok,paid:C.ok,completed:C.ok,issue:C.red,cancelled:C.red,suspended:'#e67e22',draft:'#999',pending:C.gold,in_progress:C.blue,partial:C.gold,unpaid:C.red,red:C.red,yellow:'#e67e22',green_low:C.ok,green_mid:C.ok,green_high:C.ok,platinum:C.gold,urgent:C.red,high:'#e67e22',normal:C.blue,low:'#999',male:'#3483b4',female:'#9b59b6',absconded:C.red,final_exit:'#999',transferred:'#e67e22'}
const B=({v})=>{const cl=sMap[v]||'#999';return<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:cl+'15',color:cl,display:'inline-flex',alignItems:'center',gap:3}}><span style={{width:4,height:4,borderRadius:'50%',background:cl}}/>{v||'—'}</span>}
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
cards.unshift({label:T('الإجمالي','Total'),value:data.length,color:'var(--tx)'})
return cards.slice(0,6)},[data,cols])

return<div style={{fontFamily:F,paddingTop:0}}>
{/* ═══ Page header (Kafala-style) ═══ */}
<div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:24,fontWeight:600,color:'var(--tx)',letterSpacing:'-.3px',lineHeight:1.2}}>{title}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>{data.length} {T('سجل','records')}</div>
</div>
<button onClick={openAdd} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
{T('إضافة','Add')}
</button>
</div>

{/* ═══ Stat cards row (Kafala glass card with embedded pills) ═══ */}
{statCards.length>1&&<div style={{background:'var(--card-grad)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:'10px 12px',marginBottom:14,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(statCards.length,6)},1fr)`,gap:8}}>
{statCards.map((c,i)=>{const isWhite=c.color==='var(--tx)';const cl=isWhite?'var(--tx)':c.color;return<div key={i} style={{padding:'7px 12px',borderRadius:10,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,minWidth:0}}>
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
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={T('بحث في ','Search in ')+title+' ...'} style={{width:'100%',height:40,padding:'0 14px 0 36px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid var(--bd)',borderRadius:11,fontFamily:F,fontSize:14,fontWeight:400,color:'var(--tx)',outline:'none',direction:lang==='ar'?'rtl':'ltr',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}/>
</div>

{/* ═══ Table (wrapped in glass card) ═══ */}
{loading?<PageSkeleton columns={cols.length+1} rows={8} />:
<div style={{background:'var(--card-grad)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontFamily:F,fontSize:12}}>
<thead><tr style={{background:'var(--bd2)',borderBottom:'1px solid var(--bd)'}}>
{cols.map(([,l],i)=><th key={i} style={{padding:'12px 14px',textAlign:lang==='ar'?'right':'left',fontWeight:600,color:'var(--tx3)',fontSize:11,letterSpacing:'.3px'}}>{TL(l)}</th>)}
<th style={{padding:'12px',textAlign:'center',width:100,fontSize:11,fontWeight:600,color:'var(--tx3)',letterSpacing:'.3px'}}>{T('إجراءات','Actions')}</th></tr></thead>
<tbody>{filtered.length===0?<tr><td colSpan={cols.length+1} style={{textAlign:'center',padding:60,color:'var(--tx6)',fontSize:13,fontWeight:500}}>{T('لا توجد بيانات','No data found')}</td></tr>:
filtered.map(r=><tr key={r.id} onClick={()=>setViewRow(r)} style={{borderBottom:'1px solid rgba(255,255,255,.04)',cursor:'pointer',transition:'.18s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(212,160,23,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
{cols.map(([c],j)=><td key={j} style={{padding:'12px 14px',fontSize:12,fontWeight:500,color:'var(--tx2)',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.includes('amount')||c.includes('salary')||c.includes('capital')?nm(r[c]):c.includes('status')||c==='nitaqat_color'||c==='priority'||c==='gender'?<B v={r[c]}/>:c==='is_active'||c==='is_system'?(r[c]?T('نعم','Yes'):T('لا','No')):String(r[c]??'—')}</td>)}
<td style={{padding:'8px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>openEdit(r)} style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.08)',color:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 2px',transition:'.15s'}}><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#D4A017' strokeWidth='1.8'><path d='M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z'/></svg></button>
<button onClick={()=>setDelId(r.id)} style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(192,57,43,.18)',background:'rgba(192,57,43,.06)',color:C.red,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 2px',transition:'.15s'}}><svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='#c0392b' strokeWidth='1.8'><polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2'/></svg></button>
</td></tr>)}</tbody></table></div>}

{/* ═══ View Row Modal — FormKit ═══ */}
{viewRow&&<FKModal open onClose={()=>setViewRow(null)} width={700} height="auto"
 title={viewRow.name_ar||viewRow.transaction_number||viewRow.invoice_number||viewRow.expense_number||title}
 subtitle={viewRow.name_en||undefined} Icon={Eye}
 footer={<ActionButton Icon={Pencil} onClick={()=>{setViewRow(null);openEdit(viewRow)}}>{T('تعديل','Edit')}</ActionButton>}>
<ModalSection Icon={FileText} label={T('التفاصيل','Details')}>
<ScrollBox maxHeight={300}>
<InfoGrid>
{flds.filter(f=>viewRow[f.k]!=null&&viewRow[f.k]!=='').map(f=><InfoRow key={f.k} full={!!f.w} label={TL(f.l)} value={
f.o&&(viewRow[f.k]==='true'||viewRow[f.k]===true)?T('نعم','Yes'):
f.o&&(viewRow[f.k]==='false'||viewRow[f.k]===false)?T('لا','No'):
sMap[viewRow[f.k]]?<B v={viewRow[f.k]}/>:
(f.k.includes('amount')||f.k.includes('salary')||f.k.includes('capital'))?nm(viewRow[f.k])+' '+T('ر.س','SAR'):
String(viewRow[f.k])
}/>)}
</InfoGrid>
</ScrollBox>
</ModalSection>
</FKModal>}

{/* ═══ Add/Edit Modal — FormKit (صفحات حسب عدد الحقول) ═══ */}
{pop&&(()=>{
const fldPages=[];let grp=[];let slots=0;
flds.forEach(f=>{const w=f.w?2:1;if(slots+w>8&&grp.length){fldPages.push(grp);grp=[];slots=0}grp.push(f);slots+=w});
if(grp.length)fldPages.push(grp);
const setFld=(k,val)=>{setSaveErr(null);setForm(p=>({...p,[k]:val}))};
const renderFld=f=>{
if(f.o)return <FKSelect key={f.k} label={TL(f.l)} req={!!f.r} value={form[f.k]||''} onChange={v=>setFld(f.k,v)} placeholder={T('— اختر —','— Select —')} options={f.o}/>;
if(f.t==='date')return <FKDateField key={f.k} label={TL(f.l)} req={!!f.r} value={form[f.k]||''} onChange={v=>setFld(f.k,v)}/>;
if(f.w)return <TextArea key={f.k} label={TL(f.l)} req={!!f.r} value={form[f.k]||''} onChange={v=>setFld(f.k,v)} rows={2}/>;
return <TextField key={f.k} label={TL(f.l)} req={!!f.r} value={form[f.k]||''} onChange={v=>setFld(f.k,v)} dir={f.d?'ltr':'rtl'}/>;
};
const pages=fldPages.map((g,i)=>({
title:fldPages.length>1?T('البيانات','Details')+' '+(i+1)+'/'+fldPages.length:undefined,
valid:g.every(f=>!f.r||!!form[f.k]),
error:i===fldPages.length-1?saveErr:undefined,
content:(<ModalSection Icon={FileText} label={T('البيانات','Details')}><div style={GRID}>{g.map(renderFld)}</div></ModalSection>)
}));
return <FKModal open onClose={()=>{setSaveErr(null);setPop(null)}} width={660}
 title={(pop==='add'?T('إضافة — ','Add — '):T('تعديل — ','Edit — '))+title}
 Icon={FileText} variant={pop==='add'?'create':'edit'}
 onSubmit={save} submitting={saving} submitLabel={pop==='add'?T('إضافة','Add'):T('حفظ','Save')}
 nextLabel={T('التالي','Next')} backLabel={T('السابق','Back')}
 pages={pages}/>;
})()}

{/* ═══ تأكيد الحذف — FormKit ═══ */}
<ConfirmDialog open={!!delId} title={T('تأكيد الحذف','Confirm Delete')} message={T('هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.','Are you sure? This action cannot be undone.')} confirmText={T('حذف','Delete')} cancelText={T('إلغاء','Cancel')} onCancel={()=>setDelId(null)} onConfirm={()=>{const id=delId;setDelId(null);del(id)}}/>
</div>}


// ── Loading skeleton — mirrors the KPI strip + quote card layout so the page
//    loads without shift when data arrives (same pattern as the invoices page). ──
function TcSkeleton({listRows=6}){
  const shimmer={display:'inline-block',borderRadius:6,background:'linear-gradient(90deg, var(--bd2) 25%, var(--bd) 37%, var(--bd2) 63%)',backgroundSize:'400% 100%',animation:'tc-shimmer 1.4s ease infinite'}
  const bar=(w,h=11,r=6)=><span style={{...shimmer,width:w,height:h,borderRadius:r}}/>
  const card={borderRadius:16,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'var(--shadow-sm)',minHeight:190}
  return<>
  <style>{`@keyframes tc-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
  {/* بطاقات الإحصاء — المتوسط · مؤشّران · الحالات */}
  <div style={{display:'grid',gridTemplateColumns:'2.2fr 1fr 1.5fr',gap:14,marginBottom:24}}>
    <div style={{...card,padding:'18px 22px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>{bar(10,10,999)}{bar('30%',22)}</div>
      {bar('55%',40)}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:8,borderTop:'1px solid var(--bd)'}}>{bar('30%',10)}{bar('12%',12)}</div>
    </div>
    <div style={{...card,display:'flex',flexDirection:'column'}}>
      {[0,1].map(i=><div key={i} style={{flex:1,padding:'12px 16px',borderTop:i?'1px solid var(--bd)':'none',display:'flex',flexDirection:'column',justifyContent:'center',gap:8}}>{bar('60%',11)}{bar('35%',18)}</div>)}
    </div>
    <div style={{...card,padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',justifyContent:'space-between'}}>{bar('40%',11)}{bar('20%',11)}</div>
      {bar('100%',8,999)}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px 16px',marginTop:2}}>
        {Array.from({length:4}).map((_,i)=><span key={i} style={{display:'flex',gap:7,alignItems:'center'}}>{bar(14,10)}{bar('70%',10)}</span>)}
      </div>
    </div>
  </div>
  {/* صفوف التسعيرات — بنفس حجم وتخطيط كرت التسعيرة الحقيقي */}
  <div style={{display:'flex',flexDirection:'column',gap:14}}>
    {Array.from({length:listRows}).map((_,i)=><div key={i} style={{borderRadius:18,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'var(--shadow-md)',padding:'18px 22px 22px',display:'grid',gridTemplateColumns:'1fr auto auto',gap:22,alignItems:'center'}}>
      {/* القسم الأيمن — اسم + شبكة الحقول */}
      <div style={{minWidth:0,display:'flex',flexDirection:'column',gap:9}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>{bar('30%',14)}{bar(24,16,3)}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'9px 16px'}}>
          {Array.from({length:5}).map((_,j)=><div key={j} style={{display:'flex',flexDirection:'column',gap:5}}>{bar('45%',8)}{bar('72%',11)}</div>)}
        </div>
      </div>
      {/* الختم */}
      <div style={{width:96,height:96,borderRadius:12,...shimmer}}/>
      {/* الإجمالي */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,borderInlineStart:'1px dashed var(--bd)',paddingInlineStart:24,paddingInlineEnd:6,minWidth:120}}>
        {bar('70%',26)}{bar('50%',10)}
      </div>
    </div>)}
  </div>
  </>
}

/* إضافة تعليق على تسعيرة التنازل — نافذة منبثقة: نص + إرفاق ملف واحد (يُحفظ في quotation_notes + attachments). */
function QuoteNoteModal({ sb, T, toast, tcId, user, onClose, onSaved }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [saved, setSaved] = useState(false)
  const submit = async () => {
    const note = text.trim(); if (!note) return
    setSubmitting(true); setErr(null)
    try {
      const { data: row, error } = await sb.from('quotation_notes')
        .insert({ transfer_calculation_id: tcId, note, created_by: user?.id || null }).select('id').single()
      if (error || !row) throw (error || new Error('insert failed'))
      if (file) {
        const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `quotation-note/${row.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
        if (!upErr) {
          const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
          await sb.from('attachments').insert({ entity_type: 'quotation_note', entity_id: row.id, file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path, mime_type: file.type || null, size_bytes: file.size || null, uploaded_by: user?.id || null })
        }
      }
      await onSaved?.(); setSubmitting(false); setSaved(true)
    } catch (e) { setSubmitting(false); setErr(T('تعذّر إضافة التعليق: ', 'Failed to add comment: ') + (e?.message || e)) }
  }
  return (
    <FKModal open onClose={onClose} title={T('إضافة تعليق', 'Add comment')} Icon={MessageSquare} width={560} height={520} accent={FKC.gold}
      success={saved ? <SuccessView title={T('تمت إضافة التعليق', 'Comment added')} /> : null}
      pages={[{ valid: !!text.trim(), error: err, content: (
        <ModalSection Icon={MessageSquare} label={T('تفاصيل التعليق', 'Comment details')}>
          <div style={GRID}>
            <TextArea req full label={T('نص التعليق', 'Comment text')} value={text} onChange={v => { setText(v); setErr(null) }}
              placeholder={T('اكتب تعليقك…', 'Write your comment…')} rows={4} />
            <FileField full label={T('المرفق', 'Attachment')} hint={T('يمكن إرفاق ملف واحد', 'You can attach a single file')} value={file} onChange={setFile} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={submitting} submitLabel={T('إضافة', 'Add')} submitIcon={Plus} />
  )
}

function TransferCalcPage({sb,toast,user,lang,onNewCalc,emptyIcon}){
const isAr=lang!=='en';const T=(a,e)=>isAr?a:e;const dir=isAr?'rtl':'ltr';const nm=v=>Number(v||0).toLocaleString('en-US')
const isGM=user?.role?.name_ar==='المدير العام'||user?.role?.name_en==='General Manager'
// مكاتب المستخدم لتبويب حسبة نقل الكفالات: null=بلا قيد (المدير العام/«كل المكاتب»). يقيّد القائمة والإحصاءات معاً.
const officeScope=useMemo(()=>tabOffices(user,'transfer_calc'),[user])
const tcOrScope=officeScope?`branch_id.in.(${officeScope.join(',')}),branch_id.is.null`:null
const[data,setData]=useState([]);const[tcLoading,setTcLoading]=useState(true);const[workers,setWorkers]=useState([]);const[facilities,setFacilities]=useState([]);const[branches,setBranches]=useState([]);const[nationalities,setNationalities]=useState([])
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
const mapTcToLegacy=(t,userMap={})=>{const extras=Array.isArray(t.extras)?t.extras:[];const extrasTotal=extras.reduce((s,e)=>s+Number(e?.amount||0),0);const meta={quote_no:t.quote_no,worker_name:t.worker_name,iqama_number:t.iqama_number,phone:t.phone?'+966'+t.phone:null,iqama_expiry:t.iqama_expiry_gregorian,expected_expiry:t.expected_expiry_date,duration_months:t.duration_months,duration_days:t.duration_days,expected_duration_months:t.expected_duration_months,expected_duration_days:t.expected_duration_days,billed_renewal_months:t.billed_renewal_months,government_fees:Number(t.government_fees||0),office_fee_net:Number(t.office_fee_net||0),renewal_months:t.renewal_months,transfer_only:!!t.transfer_only,change_profession:!!t.change_profession,new_occupation:t.new_occupation_name_ar,prof_change_fee:Number(t.prof_change_fee||0),office_fee:Number(t.office_fee||0),transfer_fee:Number(t.transfer_fee||0),absher_discount:Number(t.absher_discount||0),extras,warnings:(t.warnings||[]).map(w=>typeof w==='string'?w:(w?.text||''))};return{id:t.id,status:t.status,created_at:t.created_at,updated_at:t.updated_at,deleted_at:t.deleted_at,priced_at:t.priced_at,priced_by:t.priced_by,approved_at:t.approved_at,approved_by:t.approved_by,created_by:t.created_by,transfer_fee:Number(t.transfer_fee||0),iqama_cost:Number(t.iqama_renewal_fee||0),work_permit_cost:Number(t.work_permit_fee||0),insurance_cost:Number(t.medical_fee||0),other_costs:Number(t.office_fee||0)+Number(t.prof_change_fee||0)+Number(t.late_fine_amount||0)+extrasTotal,other_costs_desc:[t.prof_change_fee>0?'تغيير المهنة':null,'رسوم المكتب',...extras.map(e=>e.name)].filter(Boolean).join(' + '),government_fees:0,total_cost:Number(t.subtotal||0),client_charge:Number(t.total_amount||0),profit:0,transfer_type:t.transfer_only?'transfer_only':'sponsorship',new_employer_name:t.worker_name,workers:null,facilities:null,cancelled_at:t.cancelled_at,cancelled_by:t.cancelled_by,cancel_reason:t.cancel_reason,priced_user:flattenTcUser(userMap[t.priced_by]),approved_user:flattenTcUser(userMap[t.approved_by]),created_user:flattenTcUser(userMap[t.created_by]),invoiced_user:flattenTcUser(userMap[t.invoiced_by]),cancelled_user:flattenTcUser(userMap[t.cancelled_by]),notes:JSON.stringify(meta),_meta:meta,_tc:t}}
const TC_SELECT='*'
const USER_SELECT='id,primary_branch_id,person:persons(name_ar,name_en),branch:branches!users_primary_branch_id_fkey(code:branch_code)'
const buildUserMap=(rows)=>Object.fromEntries((rows||[]).map(u=>[u.id,u]))
const refetchTc=async()=>{let tcQ=sb.from('transfer_calculation').select(TC_SELECT).is('deleted_at',null).order('created_at',{ascending:false});if(tcOrScope)tcQ=tcQ.or(tcOrScope);const[tRes,uRes]=await Promise.all([tcQ,sb.from('users').select(USER_SELECT).is('deleted_at',null)]);const userMap=buildUserMap(uRes.data);setData((tRes.data||[]).map(r=>mapTcToLegacy(r,userMap)))}
useEffect(()=>{let tcQ=sb.from('transfer_calculation').select(TC_SELECT).is('deleted_at',null).order('created_at',{ascending:false});if(tcOrScope)tcQ=tcQ.or(tcOrScope);Promise.all([tcQ,sb.from('branches').select('id,code:branch_code').is('deleted_at',null).order('branch_code'),sb.from('nationalities').select('id,name_ar,name_en,code,flag_url').order('name_ar'),sb.from('users').select(USER_SELECT).is('deleted_at',null)]).then(([t,b,n,u])=>{const userMap=buildUserMap(u?.data);setData((t.data||[]).map(r=>mapTcToLegacy(r,userMap)));setWorkers([]);setFacilities([]);setBranches(b?.data||[]);setNationalities(n?.data||[]);setTcLoading(false)})},[sb,tcOrScope])
// Auto-open a quote's details when arriving via #transfer_calc?q=<quote_no> (e.g. from the Kafala calculator success screen).
useEffect(()=>{if(!data.length)return;let q='';try{const m=(window.location.hash||'').match(/[?&]q=([^&]*)/);if(m)q=decodeURIComponent(m[1])}catch{}if(!q)return;const row=data.find(r=>r._tc?.quote_no===q||r._meta?.quote_no===q);if(row){setDetailsRow(row);try{window.history.replaceState(null,'','#transfer_calc')}catch{}}},[data])
// The Kafala calculator opens as an overlay over this (already-mounted) page, so its data is stale and the
// effect above won't re-run on return. Re-fetch when a ?q= hash arrives so the just-issued quote is in `data`,
// then the effect above opens its details.
useEffect(()=>{const onHash=()=>{if(/[?&]q=/.test(window.location.hash||''))refetchTc()};window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash)},[])
// Fetch field-level audit log when a row is opened — drives per-field source badges and edit history.
const[detailsAudit,setDetailsAudit]=useState({})
// رقم الفاتورة المرتبط (invoice_no الفعلي = رقم الطلب) + منشئ الفاتورة — يُجلبان عند فتح حسبة مفوترة.
// invoice_no يُعرض بدل معرّف UUID؛ منشئ الفاتورة يُستخدم كاسم لختم «مفوترة» حين لا يكون invoiced_by مسجَّلاً (سجلات بابل).
const[detailsInvoiceNo,setDetailsInvoiceNo]=useState(null)
const[detailsInvoicedBy,setDetailsInvoicedBy]=useState(null)
useEffect(()=>{const invId=detailsRow?._tc?.invoice_id;if(!invId){setDetailsInvoiceNo(null);setDetailsInvoicedBy(null);return}let cancelled=false;(async()=>{const{data:inv}=await sb.from('invoices').select('invoice_no,created_by').eq('id',invId).maybeSingle();if(cancelled)return;setDetailsInvoiceNo(inv?.invoice_no||null);if(inv?.created_by){const{data:u}=await sb.from('users').select('person:persons(name_ar,name_en)').eq('id',inv.created_by).maybeSingle();if(cancelled)return;const p=u?.person;setDetailsInvoicedBy(p?(lang==='en'?(p.name_en||p.name_ar):(p.name_ar||p.name_en)):null)}else setDetailsInvoicedBy(null)})();return()=>{cancelled=true}},[sb,detailsRow?._tc?.invoice_id,lang])
// Approval modal: collects required fields + optional discount, then approves atomically.
const[approveForm,setApproveForm]=useState(null)
const[approveSaving,setApproveSaving]=useState(false)
const[approveSaved,setApproveSaved]=useState(false)
const submitApproval=async()=>{if(!approveForm||approveSaving)return;setApproveSaving(true);try{const{data:{session}}=await sb.auth.getSession();if(!session)throw new Error('انتهت الجلسة');const fields={};['worker_name','phone','dob','nationality_id','gender','work_permit_expiry','has_notice_period','employer_consent','manual_discount','approval_note'].forEach(k=>{if(approveForm[k]!==undefined&&approveForm[k]!==null&&approveForm[k]!=='')fields[k]=approveForm[k]});const _kc=getKafalaPricingConfig();fields.manual_discount=_kc.kafalaOfficeDiscountEnabled!==false?Math.max(0,Math.round(Number(approveForm.manual_discount||0))):0;const res=await fetch(`${sb.supabaseUrl}/functions/v1/update-quotation`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'approve_with_data',id:approveForm._id,fields})});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw new Error(data.detail||data.error||`HTTP ${res.status}`);setApproveSaved(true);await refetchTc()}catch(e){toast((lang==='ar'?'خطأ: ':'Error: ')+(e.message||'').slice(0,80))}setApproveSaving(false)}
// إلغاء الحسبة — عبر دالة update-quotation (change_status → cancelled) مع تسجيل من ألغاها ومتى وسبب اختياري.
const[cancelForm,setCancelForm]=useState(null)
const[cancelSaving,setCancelSaving]=useState(false)
const[cancelSaved,setCancelSaved]=useState(false)
const submitCancel=async()=>{if(!cancelForm||cancelSaving)return;setCancelSaving(true);try{const{data:{session}}=await sb.auth.getSession();if(!session)throw new Error('انتهت الجلسة');const reason=(cancelForm.reason||'').trim();const res=await fetch(`${sb.supabaseUrl}/functions/v1/update-quotation`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'change_status',id:cancelForm._id,status:'cancelled',cancel_reason:reason||undefined})});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw new Error(data.detail||data.error||`HTTP ${res.status}`);setCancelSaved(true);await refetchTc()}catch(e){toast((lang==='ar'?'خطأ: ':'Error: ')+(e.message||'').slice(0,80))}setCancelSaving(false)}
useEffect(()=>{if(!detailsRow?.id){setDetailsAudit({});return}sb.from('transfer_calculation_audit').select('*,changed_user:changed_by(name_ar,name_en)').eq('quotation_id',detailsRow.id).order('changed_at',{ascending:true}).then(({data})=>{const map={};(data||[]).forEach(a=>{if(!map[a.field_name])map[a.field_name]=[];map[a.field_name].push(a)});setDetailsAudit(map)})},[sb,detailsRow?.id])
// تعليقات التسعيرة (quotation_notes) — تُحمَّل عند فتح التسعيرة مع الكاتب والمرفقات.
const[quoteNotes,setQuoteNotes]=useState([])
const loadQuoteNotes=useCallback(async()=>{if(!detailsRow?.id){setQuoteNotes([]);return}
  const{data:notes}=await sb.from('quotation_notes').select('id,note,created_at,author:created_by(person:persons(name_ar,name_en))').eq('transfer_calculation_id',detailsRow.id).is('deleted_at',null).order('created_at',{ascending:true})
  const list=notes||[];const ids=list.map(n=>n.id);const attMap={}
  if(ids.length){const{data:atts}=await sb.from('attachments').select('id,entity_id,file_name,file_url').eq('entity_type','quotation_note').in('entity_id',ids).is('deleted_at',null);(atts||[]).forEach(a=>{(attMap[a.entity_id]=attMap[a.entity_id]||[]).push(a)})}
  setQuoteNotes(list.map(n=>({...n,attachments:attMap[n.id]||[]})))
},[sb,detailsRow?.id])
useEffect(()=>{loadQuoteNotes()},[loadQuoteNotes])
const[quoteNoteModal,setQuoteNoteModal]=useState(false)
// ── Per-card inline edit (تعديل لكل كرت في تفاصيل تسعيرة التنازل) ──
// كل كرت له زر «تعديل» يفتح نافذة بحقول ذلك الكرت فقط، ثم يُحفظ عبر update-quotation
// (update_fields للبيانات / adjust_fees للرسوم) — والخادم يكتب سجل التغيير في transfer_calculation_audit.
const CARD_FIELDS={worker:['worker_name','iqama_number','phone','nationality_id','dob'],professional:['occupation_name_ar','sponsor_changes','change_profession','new_occupation_name_ar','hrsd_worker_status','resident_status_ar','iqama_expiry_gregorian','iqama_expiry_hijri'],conditions:['renewal_months','has_notice_period','employer_consent'],pricing:['transfer_fee','iqama_renewal_fee','work_permit_fee','prof_change_fee','medical_fee','office_fee','late_fine_amount','absher_discount','manual_discount']}
const tcFieldLabel=(k)=>({worker_name:T('الإسم','Name'),iqama_number:T('رقم الإقامة','Iqama'),phone:T('رقم الجوال','Mobile'),nationality_id:T('الجنسية','Nationality'),nationality:T('الجنسية','Nationality'),dob:T('تاريخ الميلاد','Date of Birth'),occupation_name_ar:T('المهنة','Occupation'),sponsor_changes:T('عدد مرات نقل الخدمات','Transfer Count'),change_profession:T('تغيير المهنة','Change Occupation'),new_occupation_name_ar:T('المهنة الجديدة','New Occupation'),hrsd_worker_status:T('حالة العامل','Worker Status'),resident_status_ar:T('حالة المقيم','Resident Status'),iqama_expiry_gregorian:T('انتهاء الإقامة (ميلادي)','Iqama Expiry (G)'),iqama_expiry_hijri:T('انتهاء الإقامة (هجري)','Iqama Expiry (H)'),transfer_fee:T('رسوم نقل الكفالة','Transfer Fee'),iqama_renewal_fee:T('تجديد الإقامة','Iqama Renewal'),work_permit_fee:T('رخصة العمل','Work Permit'),prof_change_fee:T('تغيير المهنة','Change Occupation'),medical_fee:T('التأمين الطبي','Medical'),office_fee:T('رسوم المكتب','Office Fee'),late_fine_amount:T('غرامة الإقامة','Late Fine'),absher_discount:T('خصم أبشر','Absher Discount'),manual_discount:T('خصم المكتب','Office Discount')}[k]||k)
const[cardEdit,setCardEdit]=useState(null)
const[cardSaving,setCardSaving]=useState(false)
const openCardEdit=(card)=>{const tc=detailsRow?._tc||{};const f={card,_id:detailsRow.id};CARD_FIELDS[card].forEach(k=>{f[k]=tc[k]??(typeof tc[k]==='boolean'?tc[k]:'')});if(card==='worker'&&!f.nationality_id&&tc.nationality){const n=(nationalities||[]).find(x=>x.name_ar===tc.nationality);if(n)f.nationality_id=n.id}setCardEdit(f)}
const saveCardEdit=async()=>{if(!cardEdit||cardSaving)return;setCardSaving(true);try{const{data:{session}}=await sb.auth.getSession();if(!session)throw new Error('انتهت الجلسة');let payload;if(cardEdit.card==='pricing'){const fees={};CARD_FIELDS.pricing.forEach(k=>fees[k]=Number(cardEdit[k])||0);payload={action:'adjust_fees',id:cardEdit._id,fees}}else{const BOOL_KEYS=new Set(['has_notice_period','employer_consent','change_profession']);const fields={};CARD_FIELDS[cardEdit.card].forEach(k=>{let v=cardEdit[k];if(k==='sponsor_changes'||k==='renewal_months')v=(v===''||v==null)?null:Number(v);else if(BOOL_KEYS.has(k))v=(v===''||v==null)?null:v;fields[k]=v});payload={action:'update_fields',id:cardEdit._id,fields}}const res=await fetch(`${sb.supabaseUrl}/functions/v1/update-quotation`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(payload)});const d=await res.json().catch(()=>({}));if(!res.ok||!d.ok)throw new Error(d.detail||d.error||`HTTP ${res.status}`);const[tRes,uRes,aRes]=await Promise.all([sb.from('transfer_calculation').select(TC_SELECT).eq('id',cardEdit._id).maybeSingle(),sb.from('users').select(USER_SELECT).is('deleted_at',null),sb.from('transfer_calculation_audit').select('*,changed_user:changed_by(name_ar,name_en)').eq('quotation_id',cardEdit._id).order('changed_at',{ascending:true})]);const userMap=buildUserMap(uRes.data);if(tRes.data)setDetailsRow(mapTcToLegacy(tRes.data,userMap));const map={};(aRes.data||[]).forEach(a=>{if(!map[a.field_name])map[a.field_name]=[];map[a.field_name].push(a)});setDetailsAudit(map);refetchTc();toast(T('تم حفظ التعديل','Changes saved'));setCardEdit(null)}catch(e){toast((lang==='ar'?'خطأ: ':'Error: ')+(e.message||'').slice(0,90))}setCardSaving(false)}
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
// طباعة تسعيرة التنازل — نفس تصميم الفاتورة (Royal Black & Gold، صفحتان A4).
// يأخذ لغة الطباعة مباشرةً (ar · en · hi · ur · bn) كما في printInvoice.
const printTransferDoc=(r,printLang='ar')=>{
const rtl=printLang==='ar'||printLang==='ur'
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])
const nm2=v=>{const n=Number(v||0);return (n<0?'- ':'')+Math.abs(n).toLocaleString('en-US')}
const fmtD=d=>{if(!d)return'—';const dt=new Date(d);if(isNaN(dt))return'—';return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`}
const m=r._meta||(()=>{try{return typeof r.notes==='string'?JSON.parse(r.notes):(r.notes||{})}catch{return {}}})()
const tc=r._tc||{}

// ── Label dictionary (ar · en · hi · ur · bn) ──
const L={
transferQuote:{ar:'حسبة نقل الكفالة',en:'Transfer Quote',hi:'स्थानांतरण कोटेशन',ur:'منتقلی کوٹیشن',bn:'স্থানান্তর কোটেশন'},
quoteNoLbl:{ar:'رقم التسعيرة',en:'Quote No.',hi:'कोटेशन संख्या',ur:'کوٹیشن نمبر',bn:'কোটেশন নম্বর'},
issueDate:{ar:'تاريخ الإصدار',en:'Issue Date',hi:'जारी तिथि',ur:'تاریخ اجرا',bn:'ইস্যু তারিখ'},
finalTotal:{ar:'المجموع النهائي',en:'Final Total',hi:'कुल योग',ur:'حتمی مجموعہ',bn:'চূড়ান্ত মোট'},
date:{ar:'التاريخ',en:'Date',hi:'तारीख',ur:'تاریخ',bn:'তারিখ'},
status:{ar:'الحالة',en:'Status',hi:'स्थिति',ur:'حالت',bn:'অবস্থা'},
expectedDuration:{ar:'المدة المتوقعة في الإقامة',en:'Expected Duration',hi:'अपेक्षित अवधि',ur:'متوقع مدت',bn:'প্রত্যাশিত সময়কাল'},
notGuaranteed:{ar:'تقديرية وغير مضمونة',en:'Estimated · not guaranteed',hi:'अनुमानित · गारंटीकृत नहीं',ur:'تخمینی · ضمانت نہیں',bn:'আনুমানিক · নিশ্চিত নয়'},
workerData:{ar:'بيانات العامل',en:'Worker',hi:'कर्मचारी',ur:'ملازم',bn:'কর্মী'},
personalInfo:{ar:'المعلومات الشخصية',en:'Personal Info',hi:'व्यक्तिगत जानकारी',ur:'ذاتی معلومات',bn:'ব্যক্তিগত তথ্য'},
professional:{ar:'البيانات المهنية والنقل',en:'Professional & Transfer',hi:'पेशेवर एवं स्थानांतरण',ur:'پیشہ ورانہ و منتقلی',bn:'পেশাগত ও স্থানান্তর'},
transferDetails:{ar:'تفاصيل النقل',en:'Transfer Details',hi:'स्थानांतरण विवरण',ur:'منتقلی کی تفصیلات',bn:'স্থানান্তর বিবরণ'},
pricing:{ar:'بيانات التسعير والملخّص المالي',en:'Pricing & Summary',hi:'मूल्य एवं सारांश',ur:'قیمت اور خلاصہ',bn:'মূল্য ও সারসংক্ষেপ'},
name:{ar:'الاسم',en:'Name',hi:'नाम',ur:'نام',bn:'নাম'},
iqamaNo:{ar:'رقم الإقامة',en:'Iqama No.',hi:'इक़ामा संख्या',ur:'اقامہ نمبر',bn:'ইকামা নম্বর'},
phone:{ar:'رقم الجوال',en:'Phone',hi:'फ़ोन',ur:'فون',bn:'ফোন'},
nationality:{ar:'الجنسية',en:'Nationality',hi:'राष्ट्रीयता',ur:'قومیت',bn:'জাতীয়তা'},
birthDate:{ar:'تاريخ الميلاد',en:'Birth Date',hi:'जन्म तिथि',ur:'تاریخ پیدائش',bn:'জন্ম তারিখ'},
age:{ar:'العمر',en:'Age',hi:'आयु',ur:'عمر',bn:'বয়স'},
occupation:{ar:'المهنة الحالية',en:'Current Occupation',hi:'पेशा',ur:'پیشہ',bn:'পেশা'},
newOccupation:{ar:'المهنة الجديدة',en:'New Occupation',hi:'नया पेशा',ur:'نیا پیشہ',bn:'নতুন পেশা'},
residentStatus:{ar:'حالة المقيم',en:'Resident Status',hi:'निवासी स्थिति',ur:'مقیم کی حیثیت',bn:'বাসিন্দার অবস্থা'},
transferTimes:{ar:'عدد مرات نقل الخدمات',en:'Transfer Count',hi:'स्थानांतरण संख्या',ur:'منتقلی کی تعداد',bn:'স্থানান্তর সংখ্যা'},
iqamaExpiryG:{ar:'انتهاء الإقامة',en:'Iqama Expiry',hi:'इक़ामा समाप्ति',ur:'اقامہ میعاد',bn:'ইকামা মেয়াদ'},
expectedIqamaExpiry:{ar:'انتهاء الإقامة المتوقع',en:'Expected Iqama Expiry',hi:'अपेक्षित इक़ामा समाप्ति',ur:'متوقع اقامہ میعاد',bn:'প্রত্যাশিত ইকামা মেয়াদ'},
renewalDuration:{ar:'فترة التجديد',en:'Renewal Period',hi:'नवीनीकरण अवधि',ur:'تجدید مدت',bn:'নবায়ন মেয়াদ'},
noticePeriod:{ar:'فترة الإشعار',en:'Notice Period',hi:'नोटिस अवधि',ur:'نوٹس مدت',bn:'নোটিশ পিরিয়ড'},
employerConsent:{ar:'موافقة صاحب العمل الحالي',en:'Employer Consent',hi:'नियोक्ता की सहमति',ur:'آجر کی رضامندی',bn:'নিয়োগকর্তার সম্মতি'},
transferFee:{ar:'رسوم نقل الكفالة',en:'Sponsorship Transfer',hi:'प्रायोजन स्थानांतरण',ur:'کفالہ منتقلی',bn:'স্পনসরশিপ স্থানান্তর'},
iqamaRenewal:{ar:'تجديد الإقامة',en:'Iqama Renewal',hi:'इक़ामा नवीनीकरण',ur:'اقامہ تجدید',bn:'ইকামা নবায়ন'},
workPermit:{ar:'رخصة العمل',en:'Work Permit',hi:'कार्य परमिट',ur:'ورک پرمٹ',bn:'ওয়ার্ক পারমিট'},
profChange:{ar:'تغيير المهنة',en:'Occupation Change',hi:'पेशा परिवर्तन',ur:'پیشہ تبدیلی',bn:'পেশা পরিবর্তন'},
medical:{ar:'التأمين الطبي',en:'Medical Insurance',hi:'चिकित्सा बीमा',ur:'طبی بیمہ',bn:'চিকিৎসা বীমা'},
lateFine:{ar:'غرامة الإقامة',en:'Iqama Late Fine',hi:'इक़ामा विलंब जुर्माना',ur:'تاخیر جرمانہ',bn:'বিলম্ব জরিমানা'},
officeFee:{ar:'رسوم المكتب (تشمل رسوم السجل التجاري وقوى ومقيم والغرفة التجارية والسعودة)',en:'Office Fee (incl. Commercial Registration, Qiwa, Muqeem, Chamber of Commerce & Saudization)',hi:'कार्यालय शुल्क (वाणिज्यिक रजिस्टर, क़िवा, मुक़ीम, वाणिज्य चैंबर और सऊदीकरण शुल्क सहित)',ur:'دفتر فیس (تجارتی رجسٹریشن، قوی، مقیم، چیمبر آف کامرس اور سعودائزیشن کی فیسوں سمیت)',bn:'অফিস ফি (বাণিজ্যিক রেজিস্ট্রেশন, কিওয়া, মুকিম, চেম্বার অফ কমার্স ও সৌদিকরণ ফি সহ)'},
subtotal:{ar:'إجمالي الرسوم',en:'Subtotal',hi:'उप-योग',ur:'ذیلی کل',bn:'উপমোট'},
absherDiscount:{ar:'خصم أبشر',en:'Absher Discount',hi:'अबशर छूट',ur:'ابشر رعایت',bn:'আবশের ছাড়'},
discount:{ar:'خصم المكتب',en:'Office Discount',hi:'कार्यालय छूट',ur:'دفتر رعایت',bn:'অফিস ছাড়'},
item:{ar:'البند',en:'Item',hi:'मद',ur:'آئٹم',bn:'আইটেম'},
value:{ar:'القيمة',en:'Value',hi:'मूल्य',ur:'قیمت',bn:'মূল্য'},
total:{ar:'الإجمالي',en:'Total',hi:'कुल',ur:'کل',bn:'মোট'},
yes:{ar:'نعم',en:'Yes',hi:'हाँ',ur:'جی ہاں',bn:'হ্যাঁ'},
no:{ar:'لا',en:'No',hi:'नहीं',ur:'نہیں',bn:'না'},
phoneLbl:{ar:'الجوال',en:'Phone',hi:'फ़ोन',ur:'فون',bn:'ফোন'},
page:{ar:'صفحة',en:'Page',hi:'पृष्ठ',ur:'صفحہ',bn:'পৃষ্ঠা'},
importantNotice:{ar:'إشعار هام',en:'Important Notice',hi:'महत्वपूर्ण सूचना',ur:'اہم اطلاع',bn:'গুরুত্বপূর্ণ বিজ্ঞপ্তি'},
thankYou:{ar:'شكراً لتعاملكم معنا',en:'Thank You',hi:'धन्यवाद',ur:'شکریہ',bn:'ধন্যবাদ'},
cancelled:{ar:'ملغاة',en:'CANCELLED',hi:'रद्द',ur:'منسوخ',bn:'বাতিল'},
statusPriced:{ar:'مسعّرة',en:'Priced',hi:'मूल्यांकित',ur:'قیمت شدہ',bn:'মূল্যায়িত'},
statusPricedAwait:{ar:'مسعّرة · بانتظار التصديق',en:'Priced · awaiting certification',hi:'मूल्यांकित · प्रमाणन प्रतीक्षारत',ur:'قیمت شدہ · تصدیق کے منتظر',bn:'মূল্যায়িত · অনুমোদনের অপেক্ষায়'},
statusApproved:{ar:'مصدّقة',en:'Approved',hi:'अनुमोदित',ur:'منظور شدہ',bn:'অনুমোদিত'},
statusInvoiced:{ar:'مفوترة',en:'Invoiced',hi:'चालान जारी',ur:'انوائس شدہ',bn:'চালানকৃত'},
}
const lab=k=>esc((L[k]&&(L[k][printLang]||L[k].en||L[k].ar))||k)
const pick=o=>{if(!o)return'';const a=o.ar||'';const e=o.en||'';return (printLang==='ar'||printLang==='ur')?(a||e):(e||a)}
// ── Value translations for enumerable status fields (resident status + HRSD worker status) ──
const VAL={
'صالح':{en:'Valid',hi:'वैध',ur:'کارآمد',bn:'বৈধ'},
'منتهي':{en:'Expired',hi:'समाप्त',ur:'ختم شدہ',bn:'মেয়াদোত্তীর্ণ'},
'منتهية':{en:'Expired',hi:'समाप्त',ur:'ختم شدہ',bn:'মেয়াদোত্তীর্ণ'},
'تحت الإجراء':{en:'Under Process',hi:'प्रक्रियाधीन',ur:'زیرِ کارروائی',bn:'প্রক্রিয়াধীন'},
'على رأس العمل':{en:'On the Job',hi:'कार्यरत',ur:'برسرِ کار',bn:'কর্মরত'},
'هروب':{en:'Absconded',hi:'फ़रार',ur:'فرار',bn:'পলাতক'},
'تغيب':{en:'Absent',hi:'अनुपस्थित',ur:'غیر حاضر',bn:'অনুপস্থিত'},
'متغيب':{en:'Absent',hi:'अनुपस्थित',ur:'غیر حاضر',bn:'অনুপস্থিত'},
'خارج المملكة':{en:'Outside KSA',hi:'देश से बाहर',ur:'مملکت سے باہر',bn:'দেশের বাইরে'},
'خروج نهائي':{en:'Final Exit',hi:'अंतिम प्रस्थान',ur:'حتمی خروج',bn:'চূড়ান্ত প্রস্থান'},
'نقل خدمات':{en:'Services Transferred',hi:'सेवाएँ स्थानांतरित',ur:'خدمات منتقل',bn:'সেবা স্থানান্তরিত'},
'نُقلت خدماته':{en:'Services Transferred',hi:'सेवाएँ स्थानांतरित',ur:'خدمات منتقل',bn:'সেবা স্থানান্তরিত'},
'موقوف':{en:'Suspended',hi:'निलंबित',ur:'معطل',bn:'স্থগিত'},
}
const tVal=v=>{const s=String(v||'').trim();if(!s)return'';if(printLang==='ar')return s;const t=VAL[s];return (t&&t[printLang])||(t&&t.en)||s}
const curTxt=printLang==='ar'?'ريال':printLang==='ur'?'ریال':'SAR'
const cur=`<span class="riyal">${curTxt}</span>`
const num2=v=>`<span class="num">${esc(v)}</span>`
const secTitle=k=>`<div class="sec-title"><span class="bar"></span><h3>${lab(k)}</h3><span class="ln"></span></div>`
const kvRow=(k,v,strong)=>v?`<div class="kv"><span class="k">${k}</span><span class="v${strong?' strong':''}">${v}</span></div>`:''

// ── Data extraction (mirrors the on-screen quote detail) ──
const today=new Date()
const workerName=r.workers?.name_ar||m.worker_name||tc.worker_name||r.new_employer_name||'—'
const iqamaNo=r.workers?.iqama_number||m.iqama_number||tc.iqama_number||'—'
const phone=(()=>{const raw=m.phone||(tc.phone?'0'+tc.phone:'');return raw?String(raw).replace(/^\+?966/,'0'):'—'})()
const quoteNo=noDash(m.quote_no||tc.quote_no||('Q-'+String(r.id||'').slice(0,8).toUpperCase()))
const iqExpG=m.iqama_expiry||tc.iqama_expiry_gregorian
const expExpiry=m.expected_expiry||tc.expected_expiry_date
const dob=tc.dob||m.dob
const ageY=(()=>{if(!dob)return null;const b=new Date(dob);if(isNaN(b))return null;let a=today.getFullYear()-b.getFullYear();const mo=today.getMonth()-b.getMonth();if(mo<0||(mo===0&&today.getDate()<b.getDate()))a--;return a})()
const natObj=(()=>{let ar=tc.nationality||'';let en='';let flag='';const byId=tc.nationality_id&&(nationalities||[]).find(n=>n.id===tc.nationality_id);const byName=ar&&(nationalities||[]).find(n=>n.name_ar===ar);const nn=byId||byName;if(nn){ar=nn.name_ar||ar;en=nn.name_en||'';flag=nn.flag_url||''}return {ar:ar||'—',en,flag}})()
const occObj={ar:tc.occupation_name_ar||m.occupation||'',en:''}
const changeProf=!!(tc.change_profession||m.change_profession)
const newOcc=tc.new_occupation_name_ar||m.new_occupation||''
const transferTimes=tc.sponsor_changes
const hasNotice=tc.has_notice_period
const employerConsent=tc.employer_consent
const fTransfer=Number(tc.transfer_fee||r.transfer_fee||0)
const fIqama=Number(tc.iqama_renewal_fee||r.iqama_cost||0)
const fWP=Number(tc.work_permit_fee||r.work_permit_cost||0)
const fProf=Number(tc.prof_change_fee||0)
const fMed=Number(tc.medical_fee||r.insurance_cost||0)
const fLate=Number(tc.late_fine_amount||0)
const officeFee=Number(tc.office_fee||m.office_fee||0)
const fAbsher=Number(tc.absher_discount||m.absher_discount||0)
const manualDisc=Number(tc.manual_discount||m.manual_discount||0)
const totalDiscount=fAbsher+manualDisc
const finalTotal=Number(tc.total_amount||r.client_charge||0)
const subtotalV=Number(tc.subtotal||0)||(finalTotal+totalDiscount)
const durMoV=Number(tc.expected_duration_months??m.duration_months??tc.duration_months??0),durDyV=Number(tc.expected_duration_days??m.duration_days??tc.duration_days??0),expDaysV=Number(m.expected_iqama_days||tc.expected_iqama_days||0),renMoV=Number(tc.renewal_months||m.renewal_months||0)
const moU=n=>printLang==='ar'?((n>=3&&n<=10)?'أشهر':'شهر'):printLang==='en'?(n===1?'month':'months'):printLang==='hi'?'माह':printLang==='bn'?'মাস':'ماہ'
const dyU=n=>printLang==='ar'?((n>=3&&n<=10)?'أيام':'يوم'):printLang==='en'?(n===1?'day':'days'):printLang==='hi'?'दिन':printLang==='bn'?'দিন':'دن'
const durJoin=printLang==='ar'?' و ':' · '
let durLabel=''
if(durMoV>0||durDyV>0){const p=[];if(durMoV>0)p.push(durMoV+' '+moU(durMoV));if(durDyV>0)p.push(durDyV+' '+dyU(durDyV));durLabel=p.join(durJoin)}
else if(expDaysV>0){const mo=Math.floor(expDaysV/30),dy=expDaysV%30;const p=[];if(mo>0)p.push(mo+' '+moU(mo));if(dy>0)p.push(dy+' '+dyU(dy));durLabel=p.join(durJoin)}
else if(renMoV>0){durLabel=renMoV+' '+moU(renMoV)}
const moWord=printLang==='ar'?'شهر':printLang==='en'?(renMoV===1?'month':'months'):printLang==='hi'?'माह':printLang==='bn'?'মাস':'ماہ'
const renSuffix=renMoV>0?` (${num2(renMoV)} ${moWord})`:''
const dateVal=tc.priced_at||r.priced_at||r.created_at
// أشهر تجديد الإقامة المحسوبة (تشمل الفترة المتأخرة عند انتهاء الإقامة) — نفس صيغة شاشة التسعيرة، قد تكون أكبر من أشهر التجديد المختارة.
const billedMosV=tc.billed_renewal_months!=null?Number(tc.billed_renewal_months):(()=>{let billed=renMoV;const exp=iqExpG?new Date(iqExpG):null;if(exp&&!isNaN(exp)){const ref=dateVal?new Date(dateVal):new Date();ref.setHours(0,0,0,0);exp.setHours(0,0,0,0);if(exp<ref){const end=new Date(ref);end.setMonth(end.getMonth()+renMoV);let mm=(end.getFullYear()-exp.getFullYear())*12+(end.getMonth()-exp.getMonth());let d=end.getDate()-exp.getDate();if(d<0){mm-=1;d+=new Date(end.getFullYear(),end.getMonth(),0).getDate()}billed=d>0?mm+1:mm}}return billed})()
const renIqamaSuffix=billedMosV>0?` (${num2(billedMosV)} ${moWord})`:''
const residentCombined=[tc.resident_status_ar,tc.hrsd_worker_status].filter(s=>s&&String(s).trim()).map(tVal).join(' · ')
const cancelled=r.status==='cancelled'
const stKey=r.status==='approved'?'statusApproved':(r.status==='invoiced'||r.status==='completed')?'statusInvoiced':r.status==='cancelled'?'cancelled':'statusPricedAwait'
const extras=(Array.isArray(tc.extras)?tc.extras:[]).filter(e=>Number(e?.amount)>0)
const lineItems=[fTransfer>0?['transferFee',fTransfer]:null,fIqama>0?['iqamaRenewal',fIqama]:null,fWP>0?['workPermit',fWP]:null,fProf>0?['profChange',fProf]:null,fMed>0?['medical',fMed]:null,fLate>0?['lateFine',fLate]:null].filter(Boolean)

// علم الجنسية الصغير بجوار العنوان (أو نص احتياطي إن لم يوجد علم)
const natBadge=()=>{if(natObj.flag)return ` <img class="flag" src="${esc(natObj.flag)}" alt="${esc(pick(natObj))}" title="${esc(pick(natObj))}"/>`;const n=pick(natObj);return (n&&n!=='—')?` <span class="nat-txt">${esc(n)}</span>`:''}

// ── HERO: المجموع النهائي (final total) ──
const heroBlk=`
<div class="hero-wrap">
<div class="svc-type"><span class="svc-name">${lab('transferQuote')}</span></div>
<section class="hero">
<span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
<div class="hero-main">
<div class="hero-eyebrow">${lab('finalTotal')} <span class="star">★</span></div>
<div class="hero-amount"><span class="val">${num2(nm2(finalTotal))}</span><span class="cur">${curTxt}</span></div>
</div>
<div class="hero-side">
<div class="hero-fact"><div class="k">${lab('date')}</div><div class="v">${num2(fmtD(dateVal))}</div></div>
<div class="hero-fact"><div class="k">${lab('status')}</div><div class="v">${lab(stKey)}</div></div>
${durLabel?`<div class="hero-fact full"><div class="k">${lab('expectedDuration')}</div><div class="v remain">${esc(durLabel)}</div><div class="dur-note">${lab('notGuaranteed')}</div></div>`:''}
</div>
</section></div>`

// ── Status chip in the masthead (replaces the invoice office-code chip) ──
const statusBlk=`<div class="office-code">${lab('status')}: <span style="color:var(--gold);font-weight:700;margin-inline-start:6px">${lab(stKey)}</span></div>`

// ── Worker section (personal + professional cards) ──
const idLine=(iqamaNo&&iqamaNo!=='—')?kvRow(lab('iqamaNo'),num2(iqamaNo)):''
const iqExpLine=iqExpG?kvRow(lab('iqamaExpiryG'),num2(fmtD(iqExpG))):''
const phoneLine=(phone&&phone!=='—')?kvRow(lab('phoneLbl'),num2(phone)):''
const dobLine=dob?kvRow(lab('birthDate'),(ageY!=null?'('+num2(ageY)+') ':'')+num2(fmtD(dob))):''
const personalCard=`<div class="card"><h4>${lab('personalInfo')}${natBadge()}</h4>${kvRow(lab('name'),esc(workerName),true)}${idLine}${iqExpLine}${dobLine}${phoneLine}</div>`
const profRows=[
(transferTimes!=null)?kvRow(lab('transferTimes'),num2(String(transferTimes))):'',
occObj.ar?kvRow(lab('occupation'),esc(pick(occObj)||occObj.ar)):'',
(changeProf&&newOcc)?kvRow(lab('newOccupation'),esc(newOcc)):'',
residentCombined?kvRow(lab('residentStatus'),esc(residentCombined)):'',
expExpiry?kvRow(lab('expectedIqamaExpiry'),num2(fmtD(expExpiry))):'',
].filter(Boolean).join('')
const profCard=profRows?`<div class="card"><h4>${lab('professional')}</h4>${profRows}</div>`:''
const workerBlk=secTitle('workerData')+`<div class="cards">${personalCard}${profCard}</div>`

// ── تفاصيل النقل أُدمجت في بطاقة «البيانات المهنية والنقل» (فترة التجديد + الانتهاء المتوقع) ──
const transferBlk=''

// ── Pricing table + financial summary ──
const priceRows=lineItems.map(([k,amt])=>`<tr><td>${lab(k)}${k==='iqamaRenewal'?renIqamaSuffix:k==='workPermit'?renSuffix:''}</td><td class="l">${num2(nm2(amt))} ${cur}</td></tr>`).join('')
const extraRows=extras.map(e=>`<tr><td>${esc(e.name||'')}</td><td class="l">${num2(nm2(Number(e.amount)))} ${cur}</td></tr>`).join('')
const officeRow=officeFee>0?`<tr><td>${lab('officeFee')}</td><td class="l">${num2(nm2(officeFee))} ${cur}</td></tr>`:''
const priceTbl=`<table class="price-table"><thead><tr><th>${lab('item')}</th><th class="l">${lab('value')}</th></tr></thead><tbody>${priceRows}${extraRows}${officeRow}<tr class="total-row"><td>${lab('subtotal')}</td><td class="l">${num2(nm2(subtotalV))} ${cur}</td></tr></tbody></table>`
const sumRows=`<div class="sum-row"><span class="k">${lab('subtotal')}</span><span class="v">${num2(nm2(subtotalV))} ${cur}</span></div>`+(fAbsher>0?`<div class="sum-row paid"><span class="k">${lab('absherDiscount')}</span><span class="v">${num2(nm2(fAbsher))} ${cur}</span></div>`:'')+(manualDisc>0?`<div class="sum-row paid"><span class="k">${lab('discount')}</span><span class="v">${num2(nm2(manualDisc))} ${cur}</span></div>`:'')+`<div class="sum-row remain"><span class="k">${lab('finalTotal')}</span><span class="v">${num2(nm2(finalTotal))} ${cur}</span></div>`
const summaryBlk=`<div class="summary-card">${sumRows}</div>`
const priceSummaryBlk=secTitle('pricing')+`<div class="price-summary">${priceTbl}${summaryBlk}</div>`

// ── Legal notice — جملة واحدة بلغة الطباعة فقط (clause التصديق/الفاتورة يظهر قبل الفوترة فقط) ──
const showBinding=!cancelled&&r.status!=='invoiced'&&r.status!=='completed'
const noticeByLang={
ar:'هذه التسعيرة تقديرية وقابلة للتغيير وفق الرسوم الحكومية وقت تنفيذ المعاملة، وصلاحيتها 4 أيام من تاريخ إصدارها.',
en:'This quotation is an estimate, subject to change per government fees at the time of processing, and valid for 4 days from its issue date.',
hi:'यह कोटेशन एक अनुमान है, जो प्रसंस्करण के समय सरकारी शुल्क के अनुसार बदल सकता है, और जारी होने की तिथि से 4 दिनों के लिए वैध है।',
ur:'یہ کوٹیشن تخمینی ہے، کارروائی کے وقت سرکاری فیس کے مطابق تبدیل ہو سکتی ہے، اور اجرا کی تاریخ سے 4 دن کے لیے کارآمد ہے۔',
bn:'এই কোটেশনটি একটি প্রাক্কলন, যা প্রক্রিয়াকরণের সময় সরকারি ফি অনুযায়ী পরিবর্তিত হতে পারে এবং ইস্যু তারিখ থেকে ৪ দিনের জন্য বৈধ।',
}
const noticeFullByLang={
ar:'هذه التسعيرة تقديرية وقابلة للتغيير وفق الرسوم الحكومية وقت تنفيذ المعاملة وصلاحيتها 4 أيام من تاريخ إصدارها، وتتأكد بعد التصديق عليها، والمستند المعتمد للمحاسبة هو الفاتورة الصادرة بعدها وليست هذه الحسبة.',
en:'This quotation is an estimate, subject to change per government fees at the time of processing and valid for 4 days from its issue date, confirmed only upon certification, with the invoice issued thereafter — not this quote — being the accountable document for billing.',
hi:'यह कोटेशन एक अनुमान है, जो प्रसंस्करण के समय सरकारी शुल्क के अनुसार बदल सकता है और जारी होने की तिथि से 4 दिनों के लिए वैध है, प्रमाणन के बाद ही पुष्ट होता है, तथा बिलिंग के लिए उत्तरदायी दस्तावेज़ बाद में जारी चालान है, यह कोटेशन नहीं।',
ur:'یہ کوٹیشن تخمینی ہے، کارروائی کے وقت سرکاری فیس کے مطابق تبدیل ہو سکتی ہے اور اجرا کی تاریخ سے 4 دن کے لیے کارآمد ہے، تصدیق کے بعد ہی حتمی ہوتی ہے، اور حساب کتاب کے لیے معتبر دستاویز بعد میں جاری ہونے والا انوائس ہے، یہ کوٹیشن نہیں۔',
bn:'এই কোটেশনটি একটি প্রাক্কলন, যা প্রক্রিয়াকরণের সময় সরকারি ফি অনুযায়ী পরিবর্তিত হতে পারে এবং ইস্যু তারিখ থেকে ৪ দিনের জন্য বৈধ, অনুমোদনের পরেই নিশ্চিত হয়, এবং বিলিংয়ের জন্য দায়বদ্ধ নথি হলো পরে ইস্যু করা চালান, এই কোটেশন নয়।',
}
const noticeSrc=showBinding?noticeFullByLang:noticeByLang
const noticePrimary=noticeSrc[printLang]||noticeSrc.en
const noticeBlk=`<div class="notice"><div class="ttl">⚠ ${lab('importantNotice')}</div><div class="ar">${esc(noticePrimary)}</div></div>`

const wm=cancelled?`<div class="cancel-wm">${lab('cancelled')}</div>`:''

const html=`<!DOCTYPE html><html dir="${rtl?'rtl':'ltr'}" lang="${printLang}"><head><meta charset="utf-8"><title>${lab('transferQuote')} ${esc(quoteNo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Playfair+Display:wght@700&display=swap">
<style>
:root{--ink:#1a1a1a;--ink-soft:#4a4640;--charcoal:#14110b;--gold:#d4af37;--gold-deep:#b8932c;--gold-soft:#e8d49a;--gold-faint:#f6efdc;--paper:#fff;--line:#e4ddcb;--hair:#cdbf95;--ok:#1c7a4a;--ok-bg:#e7f3ec;--warn:#a8741a;--warn-bg:#fbf2dd;--no:#9a2f2f;--no-bg:#f6e6e6}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
html,body{background:#cfcfcf}
body{font-family:'Tajawal','Noto Naskh Arabic','Noto Sans Devanagari','Noto Sans Bengali',sans-serif;color:var(--ink);font-size:12.5px;line-height:1.35;-webkit-font-smoothing:antialiased}
.num{direction:ltr;font-variant-numeric:tabular-nums;unicode-bidi:isolate;display:inline-block}
h1,h2,h3,h4,.kufi{font-family:'Reem Kufi','Tajawal',sans-serif}
@page{size:A4;margin:0}
.page{width:210mm;min-height:297mm;margin:0 auto;background:var(--paper);position:relative;overflow:hidden;box-shadow:0 2px 18px rgba(0,0,0,.25)}
.page+.page{margin-top:8mm;page-break-before:always;break-before:page}
.page2{display:flex;flex-direction:column}
.page2 .pad{flex:1;display:flex;flex-direction:column}
.page2-bottom{margin-top:auto}
.pad{padding:0 14mm}
.masthead{background:linear-gradient(135deg,#1f1a10 0%,#14110b 55%,#0e0b06 100%);color:#fff;padding:8mm 14mm 6mm;position:relative}
.masthead::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-soft),var(--gold),var(--gold-deep))}
.masthead .corner{position:absolute;width:24px;height:24px;opacity:.9}
.masthead .corner.tl{top:5mm;right:5mm;border-top:1.5px solid var(--gold);border-right:1.5px solid var(--gold)}
.masthead .corner.tr{top:5mm;left:5mm;border-top:1.5px solid var(--gold);border-left:1.5px solid var(--gold)}
.mast-row{display:flex;justify-content:space-between;align-items:stretch;gap:14px}
.inv-id{display:flex;flex-direction:column}
.inv-id .office-code{margin-top:8px;align-self:flex-end}
.brand{display:flex;flex-direction:column;align-items:flex-start}
.logo{width:120px;height:auto;display:block;margin-bottom:5px}
.brand .group{font-family:'Playfair Display',serif;font-weight:700;font-size:23px;color:var(--gold);letter-spacing:.5px;direction:ltr;line-height:1.05;margin-bottom:16px}
.brand .name-ar{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:16.5px;color:var(--gold-soft);letter-spacing:.3px;line-height:1.2}
.brand .name-en{font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:11px;color:#9b9482;letter-spacing:2.2px;margin-top:6px}
.brand .meta{margin-top:auto;padding-top:10px;font-size:12px;color:#d8d2c2;line-height:1.45}
.brand .meta .ar{display:block}
.brand .meta .en{display:block;color:#9b9482;font-size:10.5px;letter-spacing:.4px}
.brand .meta .mob{display:flex;align-items:center;gap:6px;margin-top:1px;font-size:12.5px;color:var(--gold-soft)}
.inv-id{text-align:end;align-items:flex-end}
.inv-id .tag{font-family:'Reem Kufi',sans-serif;font-size:13.5px;letter-spacing:1px;color:#fff;font-weight:600}
.inv-id .tag-en{font-size:9.5px;letter-spacing:3px;color:#9b9482;display:block;margin-top:1px}
.inv-id .no-box{margin-top:7px;border:1px solid var(--gold);background:rgba(212,175,55,.07);padding:6px 14px;display:inline-block}
.inv-id .no-lbl{font-size:9.5px;color:#b9b09a;letter-spacing:1.5px}
.inv-id .no-val{font-family:'Reem Kufi',sans-serif;font-size:18px;color:var(--gold);font-weight:700}
.inv-id .date-line{margin-top:6px;font-size:10.5px;color:#cfc8b6}
.inv-id .date-line .num{color:#fff;font-weight:700}
.office-code{display:inline-flex;align-items:center;gap:7px;margin-top:8px;padding:5px 13px;border:1px solid var(--gold);background:rgba(212,175,55,.08);color:var(--gold-soft);font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:12px;letter-spacing:1px}
.office-code .num{color:var(--gold);font-weight:700;font-size:13.5px}
.hero-wrap{padding:5mm 14mm 0}
.svc-type{display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:3.5mm}
.svc-type .svc-name{font-family:'Reem Kufi',sans-serif;font-size:24px;font-weight:700;color:var(--charcoal);letter-spacing:.3px}
.svc-type .svc-qty{font-family:'Reem Kufi',sans-serif;font-size:13.5px;font-weight:700;color:var(--gold);background:var(--charcoal);padding:2px 10px}
.hero{background:linear-gradient(140deg,#1c1810 0%,#14110b 60%,#0c0904 100%);color:#fff;position:relative;padding:6mm 8mm 5.5mm;display:flex;gap:8mm;align-items:stretch;border:1px solid #2c2517}
.hero::before{content:"";position:absolute;inset:0;border:1px solid rgba(212,175,55,.32);margin:5px;pointer-events:none}
.hero .corner{position:absolute;width:20px;height:20px;z-index:2}
.hero .corner.tl{top:0;right:0;border-top:2px solid var(--gold);border-right:2px solid var(--gold)}
.hero .corner.tr{top:0;left:0;border-top:2px solid var(--gold);border-left:2px solid var(--gold)}
.hero .corner.bl{bottom:0;right:0;border-bottom:2px solid var(--gold);border-right:2px solid var(--gold)}
.hero .corner.br{bottom:0;left:0;border-bottom:2px solid var(--gold);border-left:2px solid var(--gold)}
.hero-main{flex:0 0 auto;min-width:72mm;position:relative;z-index:1}
.hero-eyebrow{display:flex;align-items:center;gap:8px;font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:15.5px;letter-spacing:.5px;color:var(--gold-soft)}
.hero-eyebrow .star{color:var(--gold);font-size:14.5px}
.hero-eyebrow .en{font-family:'Reem Kufi',sans-serif;font-size:9.5px;letter-spacing:2.5px;color:#8d856f}
.hero-amount{display:flex;align-items:baseline;gap:9px;margin-top:5px}
.hero-amount .val{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:48px;line-height:1;color:var(--gold);letter-spacing:.5px;text-shadow:0 1px 0 rgba(0,0,0,.4)}
.hero-amount .cur{font-size:19px;color:var(--gold-soft);font-weight:500;font-family:'Reem Kufi',sans-serif}
.riyal{margin-inline-start:5px;white-space:nowrap}
.flag{width:21px;height:14px;object-fit:cover;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.18);vertical-align:middle;margin-inline-start:7px}
.nat-txt{font-size:11px;color:var(--gold-deep);font-weight:600;margin-inline-start:6px}
.hero-sub{margin-top:7px;font-size:11px;color:#cdc6b4}
.hero-sub b{color:#fff;font-weight:700}
.hero-side{flex:1;position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;align-content:center;border-inline-start:1px solid rgba(212,175,55,.25);padding-inline-start:8mm;margin-inline-start:2mm}
.hero-fact{padding:4px 10px 4px 0}
.hero-fact .k{font-size:10.5px;color:var(--gold-soft);letter-spacing:1.2px;font-family:'Reem Kufi',sans-serif;font-weight:600}
.hero-fact .v{font-size:14px;color:#fff;font-weight:700;margin-top:2px}
.hero-fact.full{grid-column:1 / -1;border-top:1px solid rgba(255,255,255,.08);margin-top:3px;padding-top:6px}
.hero-fact.full .k{color:var(--gold-soft);font-size:10.5px;font-weight:600}
.hero-fact .v.remain{color:var(--gold);font-family:'Reem Kufi',sans-serif;font-size:19px}
.hero-fact .dur-note{font-size:8.5px;color:#b9a86a;font-weight:400;margin-top:2px;letter-spacing:.2px}
.sec-title{display:flex;align-items:center;gap:9px;margin:4.5mm 0 2.5mm}
.sec-title .bar{width:4px;height:14px;background:var(--gold)}
.sec-title h3{font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:14px;color:var(--charcoal);letter-spacing:.3px}
.sec-title .ln{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--hair))}
[dir=ltr] .sec-title .ln{background:linear-gradient(90deg,var(--hair),transparent)}
.sec-title .en{font-size:9.5px;letter-spacing:2px;color:#a99a6c;font-family:'Reem Kufi',sans-serif}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.card{border:1px solid var(--line);border-top:2px solid var(--gold);background:#fff;padding:3.5mm 4mm 3mm}
.card.full{grid-column:1 / -1}
.desc-text{font-size:12.5px;line-height:1.65;color:var(--ink);font-weight:500;white-space:pre-wrap;word-break:break-word}
.card h4{font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:12px;color:var(--gold-deep);margin-bottom:2.5mm;letter-spacing:.3px;display:flex;justify-content:flex-start;align-items:center}
.card h4 .en{font-size:9px;letter-spacing:1.5px;color:#b3a576;font-weight:400}
.kv{display:flex;justify-content:space-between;gap:10px;padding:2.5px 0;border-bottom:1px dotted #ece5d3}
.kv:last-child{border-bottom:0}
.kv .k{color:var(--ink-soft);font-size:11px;white-space:nowrap}
.kv .v{color:var(--ink);font-weight:500;font-size:11.5px;text-align:end}
.kv .v.strong{font-weight:700}
.est-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 7mm}
.service-row{display:flex;justify-content:space-between;align-items:center}
.service-name{font-family:'Reem Kufi',sans-serif;font-size:14.5px;color:var(--charcoal);font-weight:600}
.service-en{font-size:9.5px;color:#a99a6c;letter-spacing:1px;margin-top:1px}
.qty-badge{background:var(--charcoal);color:var(--gold);font-family:'Reem Kufi',sans-serif;font-weight:700;padding:5px 14px;font-size:14px;display:flex;align-items:center;gap:7px}
.qty-badge .lbl{font-size:9.5px;color:#c9bf9f;font-weight:400;letter-spacing:1px}
.fd{margin-top:1mm}
.fd-file{margin-bottom:2mm}
.fd-flabel{display:flex;justify-content:space-between;align-items:baseline;font-family:'Reem Kufi',sans-serif;font-size:11.5px;color:var(--gold-deep);font-weight:600;margin-bottom:1mm}
.fd-count{font-size:9.5px;color:#a99a6c}
.fd-item{display:flex;justify-content:space-between;font-size:11px;color:var(--ink);padding:1px 0}
.fd-x{font-weight:700;direction:ltr}
table{width:100%;border-collapse:collapse}
thead th{background:var(--charcoal);color:var(--gold-soft);font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:10.5px;letter-spacing:.5px;padding:5.5px 9px;text-align:start}
thead th.c{text-align:center}
thead th.l{text-align:end}
tbody td{padding:5.5px 9px;font-size:11.5px;border-bottom:1px solid var(--line);color:var(--ink)}
tbody td.c{text-align:center}
tbody td.l{text-align:end}
tbody tr:nth-child(even){background:#faf7ee}
tbody td .milestone{font-weight:500}
tbody td .stage{font-family:'Reem Kufi',sans-serif;font-size:10px;color:var(--gold-deep);letter-spacing:.3px}
td .amt{font-weight:700}
.pill{display:inline-block;font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:10px;padding:2.5px 9px;border:1px solid transparent;letter-spacing:.3px;white-space:nowrap}
.pill.ok{background:var(--ok-bg);color:var(--ok);border-color:#bcdcc7}
.pill.partial{background:var(--warn-bg);color:var(--warn);border-color:#e6cf8f}
.pill.no{background:var(--no-bg);color:var(--no);border-color:#e3bcbc}
.pill .sub{font-size:9px;opacity:.85}
.row-latest{box-shadow:inset 3px 0 0 var(--gold)}
.latest-tag{font-family:'Reem Kufi',sans-serif;font-size:9px;letter-spacing:1px;color:var(--charcoal);background:var(--gold);padding:1.5px 6px;margin-inline-start:7px}
.latest-tag.no{background:var(--no);color:#fff}
.price-summary{display:grid;grid-template-columns:1.25fr 1fr;gap:6mm;align-items:start}
.price-table tbody td{font-size:11.5px}
.price-table .total-row td{background:var(--charcoal);color:var(--gold);font-family:'Reem Kufi',sans-serif;font-weight:700;font-size:14px;border-bottom:0}
.price-table .total-row td.l{white-space:nowrap}
.price-table .total-row td .num{color:var(--gold-soft)}
.summary-card{border:1px solid var(--charcoal);background:linear-gradient(160deg,#1c1810,#14110b);color:#fff;padding:5mm}
.summary-card .sum-row{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.09)}
.summary-card .sum-row .k{font-size:11.5px;color:#c9c0aa;font-family:'Reem Kufi',sans-serif}
.summary-card .sum-row .v{font-size:14.5px;font-weight:700;color:#E6B43C}
.summary-card .sum-row.paid .v{color:#2FA85A}
.summary-card .sum-row.remain{border-bottom:0;margin-top:2px;padding-top:7px;border-top:1.5px solid var(--gold)}
.summary-card .sum-row.remain .k{color:var(--gold-soft);font-size:13px}
.summary-card .sum-row.remain .v{color:var(--gold);font-family:'Reem Kufi',sans-serif;font-size:25px}
.progress{margin-top:4mm}
.progress .track{height:7px;background:rgba(255,255,255,.12);position:relative;overflow:hidden}
.progress .fill{position:absolute;top:0;inset-inline-start:0;bottom:0;background:linear-gradient(90deg,var(--gold-deep),var(--gold))}
.progress .cap{display:flex;justify-content:space-between;margin-top:5px;font-size:10px;color:#b3a983}
.progress .cap b{color:var(--gold-soft)}
.bank-card{border:1px solid var(--line);border-inline-start:3px solid var(--gold);background:var(--gold-faint);padding:3.5mm 4mm 3mm}
.note-card{font-size:11.5px;line-height:1.6;color:var(--ink);white-space:pre-wrap}
.notice{margin-top:4.5mm;background:var(--charcoal);color:#e9e2cf;padding:4mm 6mm;position:relative}
.notice::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-deep))}
.notice .ttl{font-family:'Reem Kufi',sans-serif;font-weight:600;color:var(--gold);font-size:12px;letter-spacing:.5px;margin-bottom:3px;display:flex;align-items:center;gap:7px}
.notice .ar{font-size:10.5px;line-height:1.55;color:#ddd5c1}
.notice .en{font-size:9.5px;line-height:1.5;color:#9b937e;direction:ltr;text-align:left;margin-top:4px;border-top:1px solid rgba(255,255,255,.08);padding-top:4px}
.footer-bar{display:flex;justify-content:space-between;align-items:center;padding:4mm 0;font-size:10px;color:#8a826b}
.footer-bar .kufi{color:var(--gold-deep);letter-spacing:1px}
.footer-bar .signs{display:flex;gap:12mm}
.footer-bar .sign{text-align:center}
.footer-bar .sign .ln2{width:38mm;border-top:1px solid var(--hair);margin-bottom:3px}
.page-foot{position:absolute;left:0;right:0;bottom:11mm;padding:0 14mm}
.mini-head{background:linear-gradient(135deg,#1f1a10,#14110b);color:#fff;padding:5mm 14mm;display:flex;justify-content:space-between;align-items:center;position:relative}
.mini-head::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2.5px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-deep))}
.mini-head .l-side{display:flex;align-items:center;gap:11px}
.mini-head .logo{width:78px;margin-bottom:0}
.mini-head .mh-name{font-family:'Reem Kufi',sans-serif;font-weight:700;color:var(--gold);font-size:14.5px}
.mini-head .mh-en{font-size:9px;color:#9b9482;letter-spacing:2px}
.mini-head .mh-inv{text-align:left}
.mini-head .mh-inv .l{font-size:9.5px;color:#b9b09a;letter-spacing:1px}
.mini-head .mh-inv .v{font-family:'Reem Kufi',sans-serif;color:var(--gold);font-weight:700;font-size:14.5px}
.page-num{text-align:center;font-size:9.5px;color:#a99a6c;letter-spacing:1px;padding:5mm 14mm 7mm}
.page-num .kufi{color:var(--gold-deep)}
.cancel-wm{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Reem Kufi',sans-serif;font-size:120px;font-weight:700;color:rgba(154,47,47,.10);letter-spacing:8px;white-space:nowrap;pointer-events:none;z-index:5}
@media print{html,body{background:#fff}.page{box-shadow:none;margin:0}.page+.page{margin-top:0}}
</style></head><body>
<div class="page page2">
${wm}
<header class="masthead">
<span class="corner tl"></span><span class="corner tr"></span>
<div class="mast-row">
<div class="brand">
<div class="group">HUSSAIN OFFICES</div>
<div class="name-ar">تأشيرة البناء والإنشاء</div>
<div class="name-en">VISA ALBINA &amp; ALINSHA</div>
<div class="meta"><span class="ar">المملكة العربية السعودية، الجبيل</span><span class="en">Kingdom of Saudi Arabia – Al Jubail</span><span class="mob"><span>${lab('phoneLbl')}:</span><span class="num">0569036528</span></span></div>
</div>
<div class="inv-id">
<div class="tag">${lab('transferQuote')}</div>
<div class="no-box"><div class="no-lbl">${lab('quoteNoLbl')}</div><div class="no-val"><span class="num">${esc(quoteNo)}</span></div></div>
<div class="date-line">${lab('issueDate')}: <span class="num">${fmtD(dateVal)}</span></div>
${statusBlk}
</div>
</div>
</header>
${heroBlk}
<div class="pad">
${workerBlk}
${transferBlk}
${priceSummaryBlk}
<div class="page2-bottom">
${noticeBlk}
<div class="footer-bar" style="border-top:1px solid var(--hair);margin-top:5mm"><span class="kufi">تأشيرة البناء والإنشاء — VISA ALBINA &amp; ALINSHA</span><span>${printLang==='ar'?'شكراً لتعاملكم معنا':lab('thankYou')} · <span class="num">${esc(quoteNo)}</span> · <span class="num">${fmtD(dateVal)}</span></span></div>
</div>
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
},900)
setTimeout(cleanup,60000)
}
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
if(m.change_profession&&Number(m.prof_change_fee||0)>0)svcItems.push([T2('تغيير مهنة'+(m.new_occupation?' ('+m.new_occupation+')':''),'Occupation Change'+(m.new_occupation?' ('+m.new_occupation+')':'')),Number(m.prof_change_fee)])
if(Number(m.office_fee||0)>0)svcItems.push([T2('رسوم المكتب','Office Fee'),Number(m.office_fee)])
}else{
const otherTotal=Number(r.other_costs||0)
if(otherTotal>0){
if(m.change_profession){const profEst=Math.min(2000,otherTotal);const officeFee=otherTotal-profEst
svcItems.push([T2('تغيير مهنة'+(m.new_occupation?' ('+m.new_occupation+')':''),'Occupation Change'+(m.new_occupation?' ('+m.new_occupation+')':'')),profEst])
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
const html=`<!DOCTYPE html><html dir="${rtl?'rtl':'ltr'}" lang="${printLang}"><head><meta charset="utf-8"><title>${T2('حسبة نقل الكفالة','Sponsorship Transfer Calculation')} ${esc(noDash(quoteNo))}</title>
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
<div class="title">${T2('حسبة نقل الكفالة','Sponsorship Transfer Calculation')}</div>
</div>
<div class="corner-left">
<div class="mini-label">${T2('رقم المرجع','Reference No.')}</div>
<div class="mini-val">${esc(noDash(quoteNo))}</div>
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
return<div style={{fontFamily:"'Cairo',sans-serif",paddingTop:0}}>
{!detailsRow&&<>
<div style={{marginBottom:22,position:'relative'}}>
<div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:24,fontWeight:600,color:'var(--tx)',letterSpacing:'-.3px',lineHeight:1.2}}>{T('حسبة نقل الكفالات','Transfer Calculator')}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx2)',marginTop:12,lineHeight:1.6}}>{T('حساب تكاليف نقل خدمات العمال وإصدار التسعيرات ومتابعة حالتها','Worker transfer cost calculation, quote issuance and status tracking')}</div>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx3)',marginTop:6,lineHeight:1.6,opacity:.8}}>{T('كروت الإحصاء إجمالي تراكمي دائم يشمل جميع التسعيرات (غير مرتبطة بيوم أو أسبوع)','The stat cards are all-time totals across every quote (not daily or weekly)')}</div>
</div>
{canPerm(user,'quotations.create')&&<button onClick={()=>onNewCalc?.()} className="btn-primary-modal"
style={{height:42,padding:'0 18px',borderRadius:11,fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,whiteSpace:'nowrap',flexShrink:0,transition:'background .15s ease, border-color .15s ease, box-shadow .15s ease'}}>
{T('حسبة نقل كفالة','New Transfer Calc')}
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>
</div>
{(()=>{
if(tcLoading)return<TcSkeleton listRows={6}/>
const typeLabel=v=>v==='final_exit'?T('خروج نهائي','Final Exit'):T('نقل كفالة','Sponsorship')
const daysSince=d=>{if(!d)return 0;return Math.floor((Date.now()-new Date(d).getTime())/86400000)}
// Apply search + advanced filters before status tabs
const metaOf=r=>{let m={};try{if(r.notes)m=typeof r.notes==='string'?JSON.parse(r.notes):r.notes}catch{}return m}
const matches=r=>{
  const meta=metaOf(r)
  // Office scope: non-GM is restricted server-side by the row's branch_id (see tcOrScope);
  // here only the GM's optional office dropdown filters further.
  const rowBranch=r.priced_user?.branch_id||r.approved_user?.branch_id||r.created_user?.branch_id||null
  if(isGM&&officeFilter&&rowBranch!==officeFilter)return false
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
// Status pipeline stats — تعكس البحث/الفلاتر الحالية (عدا تبويب الحالة نفسه، ليبقى تفصيل الحالات ظاهراً).
const sCounts={draft:searched.filter(r=>r.status==='draft').length,priced:searched.filter(r=>r.status==='priced').length,approved:searched.filter(r=>r.status==='approved').length,invoiced:searched.filter(r=>r.status==='invoiced').length,completed:searched.filter(r=>r.status==='completed').length,cancelled:searched.filter(r=>r.status==='cancelled').length}
// Aggregate statistics (ignore cancelled quotes) — محسوبة على المجموعة المفلترة
const active=searched.filter(r=>r.status!=='cancelled')
const totalRevenue=active.reduce((s,r)=>s+Number(r.client_charge||0),0)
const totalProfit=active.reduce((s,r)=>s+Number(r.profit||0),0)
const pendingApproval=sCounts.priced||0
const invoiceReady=sCounts.approved||0
const thisMonth=searched.filter(r=>{if(!r.created_at)return false;const d=new Date(r.created_at);const now=new Date();return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()})
const thisMonthCount=thisMonth.length
// Group filtered calcs by day (use priced_at/approved_at/created_at depending on status)
const todayStr=new Date().toISOString().slice(0,10)
const tcDayKey=(r)=>{const d=r.status==='priced'?(r.priced_at||r.created_at):(r.status==='approved'||r.status==='invoiced'||r.status==='completed')?(r.approved_at||r.priced_at||r.created_at):r.created_at;return(d||'').slice(0,10)||T('بدون تاريخ','No date')}
const tcGroups={}
const tcGroupOrder=[]
filteredData.forEach(r=>{const key=tcDayKey(r);if(!tcGroups[key]){tcGroups[key]=[];tcGroupOrder.push(key)}tcGroups[key].push(r)})
const tcDayNames=[T('الأحد','Sun'),T('الاثنين','Mon'),T('الثلاثاء','Tue'),T('الأربعاء','Wed'),T('الخميس','Thu'),T('الجمعة','Fri'),T('السبت','Sat')]
const tcMonthNames=[T('يناير','Jan'),T('فبراير','Feb'),T('مارس','Mar'),T('أبريل','Apr'),T('مايو','May'),T('يونيو','Jun'),T('يوليو','Jul'),T('أغسطس','Aug'),T('سبتمبر','Sep'),T('أكتوبر','Oct'),T('نوفمبر','Nov'),T('ديسمبر','Dec')]
const tcDayLabel=(k)=>{if(k===todayStr)return T('اليوم','Today');try{const d=new Date(k+'T12:00:00');return tcDayNames[d.getDay()]}catch{return k}}
const tcDayFull=(k)=>{try{const d=new Date(k+'T12:00:00');return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}catch{return k}}
// ═══ Trend comparisons (this month vs last) ═══
const monthKey=d=>{const x=new Date(d);return x.getFullYear()+'-'+x.getMonth()}
const now=new Date()
const thisMonthKey=now.getFullYear()+'-'+now.getMonth()
const lastMonthDate=new Date(now.getFullYear(),now.getMonth()-1,1)
const lastMonthKey=lastMonthDate.getFullYear()+'-'+lastMonthDate.getMonth()
const lastMonthData=searched.filter(r=>r.created_at&&monthKey(r.created_at)===lastMonthKey)
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
let months=Number(m.expected_duration_months??m.duration_months??0)
const days=Number(m.expected_iqama_days||0)
if(!months&&days>0)months=days/30
if(!months)months=Number(m.renewal_months||0)
if(fee>0&&months>0){totalFee+=fee;totalMonths+=months;count++}})
return{perMonth:totalMonths>0?Math.round(totalFee/totalMonths):0,totalFee:Math.round(totalFee),totalMonths:Math.round(totalMonths),count}})()
// Card surfaces — flat, layered grays so the inner stat boxes feel embedded in the parent card
const glassCard={background:'var(--card-grad)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:'10px 12px',position:'relative',overflow:'hidden',transition:'.25s cubic-bezier(.4,0,.2,1)',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}
const innerBox={background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}
return<>
{/* ═══ KPI strip — invoice-style 3-card layout ═══ */}
<div style={{display:'grid',gridTemplateColumns:'2.2fr 1fr 1.5fr',gap:14,marginBottom:24}}>
{/* Hero — متوسط رسوم المكتب */}
<div style={{position:'relative',padding:'18px 22px',borderRadius:16,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'var(--shadow-sm)',display:'flex',flexDirection:'column',justifyContent:'space-between',overflow:'hidden',minHeight:190}}>
<div style={{position:'absolute',insetInlineStart:-60,top:-60,width:180,height:180,borderRadius:'50%',background:`radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`,pointerEvents:'none'}}/>
<div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:-6}}>
<span style={{width:8,height:8,borderRadius:'50%',background:C.gold,boxShadow:`0 0 10px ${C.gold}aa`}}/>
<span style={{fontSize:24,color:'var(--tx)',fontWeight:600,letterSpacing:'.2px'}}>{T('المتوسط','Average')}</span>
</div>
<div style={{position:'relative',display:'flex',alignItems:'baseline',gap:7,direction:'ltr'}}>
<span style={{fontSize:42,fontWeight:800,color:C.gold,letterSpacing:'-1.5px',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{nm(officeStats.perMonth)}</span>
</div>
<div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid var(--bd)'}}>
<span style={{fontSize:11,color:'var(--tx3)',fontWeight:600}}>{T('عدد التسعيرات','Quotes')}</span>
<span style={{fontSize:13,color:C.gold,fontWeight:700,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{nm(officeStats.count)}</span>
</div>
</div>

{/* Sidebar — 2 stacked status KPIs */}
<div style={{borderRadius:16,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'var(--shadow-sm)',display:'flex',flexDirection:'column',overflow:'hidden',minHeight:190}}>
{[{k:'approved',l:T('مصدّقة','Approved'),v:sCounts.approved,c:C.blue},{k:'invoiced',l:T('مفوترة','Invoiced'),v:sCounts.invoiced+sCounts.completed,c:C.ok}].map((s,i)=>{
const isActive=listFilter===s.k||(s.k==='invoiced'&&listFilter==='completed')
return<div key={i} onClick={()=>setListFilter(isActive?'all':s.k)} style={{position:'relative',padding:'12px 16px',flex:1,borderTop:i>0?'1px solid var(--bd)':'none',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:6,overflow:'hidden',cursor:'pointer',background:isActive?`${s.c}10`:'transparent',transition:'.15s'}}>
<div style={{position:'absolute',insetInlineStart:-25,top:'50%',transform:'translateY(-50%)',width:70,height:70,borderRadius:'50%',background:`radial-gradient(circle, ${s.c}10 0%, transparent 70%)`,pointerEvents:'none'}}/>
<div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:s.c}}/>
<span style={{fontSize:13,color:'var(--tx)',fontWeight:600}}>{s.l}</span>
</div>
<div style={{position:'relative',display:'flex',alignItems:'baseline',direction:'ltr'}}>
<span style={{fontSize:22,fontWeight:700,color:s.c,fontVariantNumeric:'tabular-nums',lineHeight:1,letterSpacing:'-.5px'}}>{nm(s.v)}</span>
</div>
</div>})}
</div>

{/* Status breakdown card */}
{(()=>{
const STATUSES=[{k:'priced',c:'#eab308',l:T('مسعّرة','Priced')},{k:'approved',c:C.blue,l:T('مصدّقة','Approved')},{k:'invoiced',c:C.ok,l:T('مفوترة','Invoiced')},{k:'cancelled',c:C.red,l:T('ملغاة','Cancelled')}]
const totalSt=STATUSES.reduce((a,s)=>a+(sCounts[s.k]||0),0)
return<div style={{borderRadius:16,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'var(--shadow-sm)',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10,minHeight:190}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,color:'var(--tx2)',fontWeight:600,letterSpacing:'.2px'}}>{T('الحالات','Statuses')}</span>
<span style={{fontSize:11,color:'var(--tx4)',fontWeight:600}}><span style={{color:C.gold,fontWeight:700,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{nm(totalSt)}</span> {T('تسعيرة','quotes')}</span>
</div>
{totalSt>0&&<div style={{display:'flex',height:8,borderRadius:999,overflow:'hidden',background:'var(--bd2)'}}>
{STATUSES.filter(s=>(sCounts[s.k]||0)>0).map(s=>{const cnt=sCounts[s.k]||0;const pct=(cnt/totalSt)*100;return<div key={s.k} title={`${s.l}: ${cnt}`} style={{width:pct+'%',background:s.c,transition:'width .3s'}}/>})}
</div>}
<div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:'6px 16px'}}>
{STATUSES.map(s=>{const cnt=sCounts[s.k]||0;const isZero=cnt===0;const isActive=listFilter===s.k;return<div key={s.k} onClick={()=>setListFilter(isActive?'all':s.k)} style={{display:'flex',alignItems:'center',gap:7,fontSize:11,fontWeight:600,opacity:isZero?0.45:1,cursor:'pointer',color:isActive?s.c:undefined,transition:'.15s'}}>
<span style={{color:isZero?'var(--tx4)':s.c,fontVariantNumeric:'tabular-nums',direction:'ltr',minWidth:14,textAlign:'center',flexShrink:0,fontWeight:700}}>{nm(cnt)}</span>
<span style={{color:isActive?s.c:'var(--tx2)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.l}</span>
</div>})}
</div>
</div>})()}
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
  background-color:var(--sf)!important;
  border-color:var(--bd)!important;
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
<div style={{flex:'1 1 280px',position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--tx4)'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input className="tc-noring tc-search" value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder={T('ابحث باسم العامل أو رقم الإقامة أو رقم التسعيرة...','Search by worker name, iqama, or quote no...')} style={{width:'100%',height:44,paddingBlock:0,paddingLeft:38,paddingRight:14,background:'var(--search-bg)',border:'1px solid transparent',borderRadius:12,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:400,color:'var(--tx)',outline:'none',direction:dir,boxSizing:'border-box',transition:'.2s'}}/>
</div>
<button onClick={()=>setAdvOpen(o=>!o)} style={{height:44,padding:'0 16px',borderRadius:12,border:advOpen||Object.values(advFilter).some(Boolean)?'1px solid var(--accent-bd)':'1px solid transparent',background:advOpen||Object.values(advFilter).some(Boolean)?'var(--accent-soft)':'var(--search-bg)',color:advOpen||Object.values(advFilter).some(Boolean)?'var(--accent)':'var(--tx2)',fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,flexShrink:0,transition:'.2s',boxSizing:'border-box',boxShadow:advOpen||Object.values(advFilter).some(Boolean)?'var(--shadow-sm)':'none'}}>
{T('تصفية','Filter')}
<span style={{width:18,height:18,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{!Object.values(advFilter).some(Boolean)?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>:<span role="button" tabIndex={0} title={T('مسح الفلاتر','Clear filters')} onClick={e=>{e.stopPropagation();setAdvFilter({from:'',to:'',service:'',employee:'',officeMin:'',officeMax:''})}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.stopPropagation();e.preventDefault();setAdvFilter({from:'',to:'',service:'',employee:'',officeMin:'',officeMax:''})}}} onMouseEnter={e=>{e.currentTarget.style.background=C.red;e.currentTarget.style.color='#fff'}} onMouseLeave={e=>{e.currentTarget.style.background=C.gold;e.currentTarget.style.color='#000'}} style={{background:C.gold,color:'#000',width:18,height:18,borderRadius:999,display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'.18s'}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></span>}</span>
</button>
</div>
{advOpen&&(()=>{const fLbl={fontSize:12,fontWeight:500,color:'var(--tx3)',paddingInlineStart:2,marginBottom:7};const fInp={height:42,padding:'0 14px',borderRadius:9,border:'1px solid transparent',background:'var(--inputBg)',color:'var(--tx)',fontFamily:"'Cairo',sans-serif",fontSize:14,fontWeight:600,outline:'none',boxShadow:'inset 0 1px 2px rgba(0,0,0,.08)',transition:'.2s',width:'100%',boxSizing:'border-box'};return<div style={{marginBottom:14,padding:'16px 18px',background:'var(--card-grad2)',border:'1px solid var(--bd)',borderRadius:14,boxShadow:'var(--shadow-md)'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
<div><div style={fLbl}>{T('تاريخ من','Date From')}</div><DateField value={advFilter.from} onChange={v=>setAdvFilter(p=>({...p,from:v}))} lang={lang}/></div>
<div><div style={fLbl}>{T('تاريخ إلى','Date To')}</div><DateField value={advFilter.to} onChange={v=>setAdvFilter(p=>({...p,to:v}))} lang={lang}/></div>
<div><div style={fLbl}>{T('الحالة','Status')}</div><Sel value={advFilter.service} onChange={v=>setAdvFilter(p=>({...p,service:v}))} placeholder={T('الكل','All')} options={[{v:'',l:T('الكل','All')},{v:'priced',l:T('مسعّرة','Priced')},{v:'approved',l:T('مصدّقة','Approved')},{v:'invoiced',l:T('مفوترة','Invoiced')},{v:'completed',l:T('مكتملة','Completed')}]} /></div>
<div><div style={fLbl}>{T('اسم الموظف','Employee Name')}</div><input type="text" value={advFilter.employee} onChange={e=>setAdvFilter(p=>({...p,employee:e.target.value}))} placeholder={T('مهدي اليامي','...')} style={{...fInp,textAlign:'center'}} /></div>
<div><div style={fLbl}>{T('رسوم المكتب من','Office Fee Min')}</div><input type="number" inputMode="decimal" value={advFilter.officeMin} onChange={e=>setAdvFilter(p=>({...p,officeMin:e.target.value}))} placeholder="0" style={{...fInp,textAlign:'center',direction:'ltr'}} /></div>
<div><div style={fLbl}>{T('رسوم المكتب إلى','Office Fee Max')}</div><input type="number" inputMode="decimal" value={advFilter.officeMax} onChange={e=>setAdvFilter(p=>({...p,officeMax:e.target.value}))} placeholder="∞" style={{...fInp,textAlign:'center',direction:'ltr'}} /></div>
</div>
</div>})()}
{filteredData.length===0?<EmptyState icon={emptyIcon} title={T('لا توجد تسعيرات','No quotes')} desc={T('أنشئ أول تسعيرة من زر «حسبة نقل كفالة»','Create your first quote using “New Transfer Quote”')} />:
<div>{tcGroupOrder.map(dateKey=>{const items=tcGroups[dateKey];const isToday=dateKey===todayStr;const dayCounts={priced:items.filter(rr=>rr.status==='priced').length,approved:items.filter(rr=>rr.status==='approved').length,invoiced:items.filter(rr=>rr.status==='invoiced'||rr.status==='completed').length};return<div key={dateKey} style={{marginBottom:28}}><div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,paddingBottom:10,borderBottom:'1px solid var(--bd)'}}><div style={{display:'flex',alignItems:'baseline',gap:12}}><span style={{fontSize:14,fontWeight:600,color:isToday?C.gold:'var(--tx2)'}}>{tcDayLabel(dateKey)}</span><span style={{fontSize:12,color:'var(--tx4)',fontVariantNumeric:'tabular-nums',direction:'ltr'}}>{tcDayFull(dateKey)}</span></div><div style={{fontSize:11,color:'var(--tx3)',display:'flex',gap:16,fontWeight:600}}>{dayCounts.priced>0&&<span style={{color:'#eab308',direction:lang==='ar'?'rtl':'ltr',fontVariantNumeric:'tabular-nums'}}>{dayCounts.priced} {T('مسعّرة','priced')}</span>}{dayCounts.approved>0&&<span style={{color:C.blue,direction:lang==='ar'?'rtl':'ltr',fontVariantNumeric:'tabular-nums'}}>{dayCounts.approved} {T('مصدّقة','approved')}</span>}{dayCounts.invoiced>0&&<span style={{color:C.ok,direction:lang==='ar'?'rtl':'ltr',fontVariantNumeric:'tabular-nums'}}>{dayCounts.invoiced} {T('مفوترة','invoiced')}</span>}</div></div><div style={{display:'flex',flexDirection:'column',gap:14}}>{items.map((r,idx)=>{const sc=stClr[r.status]||'#999';const tc=Number(r.total_cost||0);const cc=Number(r.client_charge||0);const pr=cc-tc;const prMargin=cc>0?Math.round((pr/cc)*100):0;const ds=daysSince(r.created_at);const nxt=stNext[r.status]
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
else if(meta.renewal_months&&Number(meta.renewal_months)>0)tags.push(T(meta.renewal_months+' شهر',meta.renewal_months+'mo'))
if(!meta.transfer_only&&Number(r.work_permit_cost||0)>0)tags.push(T('رخصة عمل','Work Permit'))
if(Number(r.insurance_cost||0)>0)tags.push(T('تأمين طبي','Medical Insurance'))
if(meta.change_profession)tags.push(T('تغيير مهنة','Occupation Chg'))
// Warning strip for expired iqama
const warn=(()=>{if(meta.iqama_expiry){const d=new Date(meta.iqama_expiry);if(!isNaN(d)){const diffDays=Math.floor((Date.now()-d.getTime())/86400000);if(diffDays>0)return{text:T('إقامة منتهية منذ '+diffDays+' يوم','Iqama expired '+diffDays+' days ago')+(meta.renewal_months?' · '+T('غرامة 500 ر.س','500 SAR fine'):''),color:C.red}}}return null})()
// Invoice footer when invoiced
const isInvoiced=r.status==='invoiced'||r.status==='completed'
const isCancelled=r.status==='cancelled'
const invFoot=isInvoiced?{text:T('دُفع بالكامل · تحويل بنكي','Paid in full · bank transfer'),color:C.ok}:null
// Validity ribbon — only meaningful while a quote is in priced/approved state and could still go to invoice.
const pricedAtMs=r.priced_at?new Date(r.priced_at).getTime():0
const remainingMs=pricedAtMs?(5*86400000)-(Date.now()-pricedAtMs):0
const showValidity=(r.status==='priced'||r.status==='approved')&&pricedAtMs>0
const isExpired=showValidity&&remainingMs<=0
const remDays=Math.max(0,Math.floor(remainingMs/86400000))
const remHrs=Math.max(0,Math.floor((remainingMs%86400000)/3600000))
return<div key={r.id} onClick={()=>{setDetailsRow({...r,_meta:meta})}} style={{background:'var(--card-grad2)',borderRadius:18,overflow:'hidden',transition:'all .15s',border:'1px solid '+(isExpired?'rgba(192,57,43,.35)':'var(--bd)'),position:'relative',cursor:'pointer',padding:'18px 22px 22px',display:'grid',gridTemplateColumns:'1fr auto auto',gap:22,alignItems:'center',opacity:isExpired?.7:1,boxShadow:'var(--shadow-md)'}}
onMouseEnter={e=>{e.currentTarget.style.borderColor=sc+'55'}}
onMouseLeave={e=>{e.currentTarget.style.borderColor=isExpired?'rgba(192,57,43,.35)':'var(--bd)'}}>
<button onClick={e=>{e.stopPropagation();setViewRow({...r,_meta:meta})}} title={showValidity?(isExpired?T('انتهت — معاينة الحسبة','Expired — Quote preview'):T(`صالحة ${remDays}ي ${remHrs}س — معاينة الحسبة`,`${remDays}d ${remHrs}h — Quote preview`)):isCancelled?T('ملغاة — معاينة الحسبة','Cancelled — Quote preview'):T('معاينة الحسبة','Quote preview')} style={{position:'absolute',top:10,insetInlineEnd:10,width:28,height:28,borderRadius:'50%',background:showValidity?'transparent':(isCancelled?'rgba(192,57,43,.12)':isInvoiced?'rgba(39,160,70,.12)':'rgba(212,160,23,.12)'),border:showValidity?'none':'1px solid '+(isCancelled?'rgba(192,57,43,.35)':isInvoiced?'rgba(39,160,70,.35)':'rgba(212,160,23,.3)'),color:isCancelled?C.red:isInvoiced?C.ok:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,zIndex:2,transition:'.15s'}} onMouseEnter={e=>{if(!showValidity){e.currentTarget.style.background=isCancelled?'rgba(192,57,43,.22)':isInvoiced?'rgba(39,160,70,.22)':'rgba(212,160,23,.22)';e.currentTarget.style.borderColor=isCancelled?'rgba(192,57,43,.6)':isInvoiced?'rgba(39,160,70,.6)':'rgba(212,160,23,.55)'}else{e.currentTarget.style.transform='scale(1.08)'}}} onMouseLeave={e=>{if(!showValidity){e.currentTarget.style.background=isCancelled?'rgba(192,57,43,.12)':isInvoiced?'rgba(39,160,70,.12)':'rgba(212,160,23,.12)';e.currentTarget.style.borderColor=isCancelled?'rgba(192,57,43,.35)':isInvoiced?'rgba(39,160,70,.35)':'rgba(212,160,23,.3)'}else{e.currentTarget.style.transform='scale(1)'}}}>
{showValidity?(()=>{
const total=5
const active=isExpired?0:Math.min(total,Math.ceil(remainingMs/86400000))
const sw=2.4,size=24,r=(size-sw)/2,cx=size/2,cy=size/2
const gapDeg=22,segDeg=360/total,arcDeg=segDeg-gapDeg
const arc=startDeg=>{const s=(startDeg-90)*Math.PI/180,e=(startDeg+arcDeg-90)*Math.PI/180;const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s),x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e);return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`}
const onClr=isExpired?'rgba(192,57,43,.5)':(active<=1?C.gold:'#27a046')
const offClr='var(--bd)'
return<svg width={size} height={size} style={{display:'block'}}>
{Array.from({length:total}).map((_,i)=><path key={i} d={arc(i*segDeg)} fill="none" stroke={i<active?onClr:offClr} strokeWidth={sw} strokeLinecap="round"/>)}
<text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fontFamily="'Cairo',sans-serif" fill={onClr}>{active}</text>
</svg>
})():isCancelled?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>:isInvoiced?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
</button>
{(()=>{const CopyBtn=({val})=>{const[copied,setCopied]=useState(false);return<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(val);setCopied(true);setTimeout(()=>setCopied(false),1500)}} title={T('نسخ','Copy')} style={{width:18,height:18,background:'transparent',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,color:copied?C.ok:'var(--tx6)',transition:'color .15s',flexShrink:0,opacity:copied?1:.55}} onMouseEnter={e=>{if(!copied){e.currentTarget.style.color=C.gold;e.currentTarget.style.opacity=1}}} onMouseLeave={e=>{if(!copied){e.currentTarget.style.color='var(--tx6)';e.currentTarget.style.opacity=.55}}}>
{copied?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
</button>};const absher=Number(meta.absher_discount||0);const durMo=meta.expected_duration_months??meta.duration_months??0;const durDays=meta.expected_duration_days??meta.duration_days??0;const durText=durMo>0?durMo+T(' شهر','mo'):(durDays>0?durDays+T(' يوم','d'):'');const fmtD=d=>{if(!d)return'—';const dt=new Date(d);if(isNaN(dt))return'—';const y=dt.getFullYear();const mo=String(dt.getMonth()+1).padStart(2,'0');const da=String(dt.getDate()).padStart(2,'0');return `${da}-${mo}-${y}`};return <>

{(()=>{
const officeCodeLocal=r.priced_user?.branch?.code||r.approved_user?.branch?.code||r.created_user?.branch?.code||null
const expectedDays=Number(meta.expected_iqama_days||0)
const durMonths=Number(meta.expected_duration_months??meta.duration_months??0)||(expectedDays>0?Math.round(expectedDays/30):0)
const durLabel=durMonths>0?(durMonths+' '+T('شهر','mo')):(expectedDays>0?(expectedDays+' '+T('يوم','d')):null)
const natFlag=(()=>{const tcc=r._tc||{};const n=tcc.nationality_id?(nationalities||[]).find(x=>x.id===tcc.nationality_id):(tcc.nationality?(nationalities||[]).find(x=>x.name_ar===tcc.nationality):null);return n?.flag_url||null})()
const phoneVal=(r._tc?.phone)?'0'+r._tc.phone:(meta.phone||null)
const svcPrimary=tags[0]||null
const ico=p=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p}</svg>
const idIco=ico(<><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></>)
const phIco=ico(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>)
const brIco=ico(<><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></>)
const svcIco=ico(<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>)
const invIco=ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></>)
const gcell=(icon,label,value)=>value?<div style={{display:'flex',flexDirection:'column',gap:3,minWidth:0,alignItems:'flex-start'}}><span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:9,color:'var(--tx4)',fontWeight:600,letterSpacing:'.2px'}}>{icon}{label}</span><span style={{display:'inline-flex',minWidth:0,maxWidth:'100%'}}>{value}</span></div>:null
return<>
{/* Section 1: name + flag, then labelled field grid (invoice-card style) */}
<div style={{minWidth:0,display:'flex',flexDirection:'column',gap:9}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
<span style={{fontSize:14.5,fontWeight:600,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0,direction:'ltr',letterSpacing:'-.2px'}}>{workerName}</span>
{natFlag&&<img src={natFlag} alt="" style={{width:24,height:17,objectFit:'cover',flexShrink:0,borderRadius:3}}/>}
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'9px 16px'}}>
{gcell(idIco,T('رقم الإقامة','Iqama No'),(iqamaNo&&iqamaNo!=='—')?<span style={{fontSize:11.5,color:'var(--tx2)',fontWeight:600,direction:'ltr',fontVariantNumeric:'tabular-nums',fontFamily:'monospace'}}>{iqamaNo}</span>:null)}
{gcell(phIco,T('الجوال','Phone'),phoneVal?<span style={{fontSize:11.5,color:'var(--tx2)',fontWeight:600,direction:'ltr',fontVariantNumeric:'tabular-nums',fontFamily:'monospace'}}>{phoneVal}</span>:null)}
{gcell(brIco,T('المكتب','Branch'),officeCodeLocal?<span style={{fontSize:11.5,color:'var(--tx2)',fontWeight:600,direction:'ltr'}}>{officeCodeLocal}</span>:null)}
{gcell(svcIco,T('الخدمة','Service'),svcPrimary?<span style={{fontSize:11.5,color:C.gold,fontWeight:700}}>{svcPrimary}</span>:null)}
{gcell(invIco,invoiceNo?T('رقم الفاتورة','Invoice no'):T('رقم التسعيرة','Quote no'),<span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{fontSize:11.5,color:invoiceNo?C.ok:C.gold,fontWeight:600,direction:'ltr',fontFamily:'monospace',fontVariantNumeric:'tabular-nums'}}>{noDash(invoiceNo||quoteNo)}</span><CopyBtn val={noDash(invoiceNo||quoteNo)}/></span>)}
</div>
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
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,flexShrink:0,borderInlineStart:'1px dashed var(--bd)',paddingInlineStart:24,paddingInlineEnd:6,paddingTop:18,minWidth:120}}>
<div style={{lineHeight:1,fontVariantNumeric:'tabular-nums',textAlign:'center'}}><bdi style={{fontSize:38,fontWeight:600,color:C.gold,letterSpacing:'-.5px'}}>{nm(Math.round(Number(cc)||0))}</bdi></div>
</div>
</>})()}
<div style={{position:'absolute',bottom:0,left:0,right:0,height:5,background:'var(--bd2)'}}><div style={{height:'100%',width:'100%',background:sc,opacity:.7}}/></div>
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
const nmSar=v=>v===null||v===undefined||v===''?'—':nm(v)+' '+T('ريال','SAR')
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
const sec=(title,rows,icon,dotColor)=>{const filtered=rows.filter(Boolean);if(!filtered.length)return null;return<div style={{background:'var(--card-grad2)',border:'1px solid var(--bd)',borderRadius:16,overflow:'hidden'}}>
<div style={{padding:'14px 22px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:10}}>
<span style={{width:6,height:6,borderRadius:'50%',background:dotColor||C.gold}}/>
<span style={{fontSize:16,fontWeight:600,color:C.gold,letterSpacing:'.2px'}}>{title}</span>
</div>
<div style={{padding:'4px 22px 14px'}}>
{filtered.map((row,i)=>{const fieldKey=row[5];const auditEntries=fieldKey?(detailsAudit[fieldKey]||[]):[];const latest=auditEntries[auditEntries.length-1];const srcKey=latest?.source||'employee';const srcMeta=SRC_META[srcKey]||SRC_META.employee;const modified=auditEntries.length>1;const editor=latest?.changed_user;const editorName=editor?(lang==='en'?(editor.name_en||editor.name_ar):editor.name_ar):null;const badgeLabel=srcKey==='employee'&&editorName?editorName:srcMeta.l;const tooltip=auditEntries.length?(modified?T(`عُدّل: ${formatAuditValue(auditEntries[0].new_value)} ← ${formatAuditValue(latest.new_value)}${editorName?`\nبواسطة: ${editorName}`:''}\nالمصدر: ${srcMeta.l}`,`Modified: ${formatAuditValue(auditEntries[0].new_value)} → ${formatAuditValue(latest.new_value)}${editorName?`\nBy: ${editorName}`:''}\nSource: ${srcMeta.l}`):T(`المصدر: ${srcMeta.l}${editorName?`\nبواسطة: ${editorName}`:''}`,`Source: ${srcMeta.l}${editorName?`\nBy: ${editorName}`:''}`)):'';const showBadge=fieldKey&&auditEntries.length>0;const v=fmt(row[1]);const hasArabic=typeof v==='string'&&/[؀-ۿ]/.test(v);const isMono=typeof v==='string'&&/^[\d+\-]/.test(v)&&!hasArabic;const isLast=i===filtered.length-1;return<div key={i} title={tooltip} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',minHeight:28,gap:10,borderBottom:isLast?'none':'1px solid var(--bd2)'}}>
<span style={{fontSize:12,color:'var(--tx3)',fontWeight:600}}>{row[0]}</span>
<span style={{display:'inline-flex',alignItems:'center',gap:6}}>
{showBadge&&<span style={{display:'inline-flex',alignItems:'center',gap:3,padding:'1px 6px',borderRadius:4,fontSize:9,fontWeight:600,background:srcMeta.c+'18',color:srcMeta.c,letterSpacing:'.2px',whiteSpace:'nowrap'}}>{modified?'✎ ':''}{badgeLabel}</span>}
<span style={{fontSize:13,color:row[2]||'var(--tx2)',fontVariantNumeric:isMono?'tabular-nums':undefined,fontFamily:isMono?'monospace':F,direction:isMono?'ltr':undefined,fontWeight:600,wordBreak:'break-word'}}>{v}</span>
</span>
</div>})}
</div>
</div>}
const quoteNo=mm.quote_no||'#'+String(dr.id||'').slice(0,8).toUpperCase()
return<div style={{fontFamily:"'Cairo','Tajawal',sans-serif",paddingTop:0,color:'var(--tx2)'}}>
<div style={{marginBottom:20}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:12}}>
<BackButton onBack={()=>setDetailsRow(null)} label={T('رجوع','Back')} />
</div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:20}}>
<div>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>
<div style={{fontSize:22,fontWeight:600,color:C.gold,letterSpacing:'-.2px'}}>{T('تفاصيل حسبة نقل الكفالة','Transfer Quote Details')}</div>
</div>
<div style={{marginTop:14,display:'flex',alignItems:'center',gap:11,flexWrap:'wrap',fontSize:13,color:'var(--tx3)'}}>
<span style={{display:'inline-flex',alignItems:'center',gap:5,direction:'ltr'}}>
<span style={{color:C.gold,fontFamily:'monospace',fontWeight:700,fontSize:14}}>{noDash(quoteNo)}</span>
<QuoteCopyBtn val={noDash(quoteNo)} title={T('نسخ رقم التسعيرة','Copy quote no')}/>
</span>
{(()=>{const branch=dr.priced_user?.branch?.code||dr.approved_user?.branch?.code||dr.created_user?.branch?.code;if(!branch)return null;return<>
<span style={{width:3.5,height:3.5,borderRadius:'50%',background:'var(--tx4)'}}/>
<span title={T('المكتب','Branch')} style={{color:C.gold,fontWeight:700,fontSize:13.5,direction:'ltr',display:'inline-flex',alignItems:'center',gap:4}}>
<span>{branch}</span>
</span>
</>})()}
<span style={{width:3.5,height:3.5,borderRadius:'50%',background:'var(--tx4)'}}/>
<span style={{color:'var(--tx4)',fontSize:12.5}}>{(()=>{try{const d=new Date(dr.created_at);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}catch{return ''}})()}</span>
</div>
</div>
{(()=>{const nameOf=u=>u?(lang==='en'?(u.name_en||u.name_ar):u.name_ar):null;const done=s=>(['priced','approved','invoiced','completed'].includes(dr.status)&&s==='priced')||(['approved','invoiced','completed'].includes(dr.status)&&s==='approved')||(['invoiced','completed'].includes(dr.status)&&s==='invoiced');const stamps=[];if(dr.status==='cancelled'){const cb=nameOf(dr.cancelled_user);const cd=dr.cancelled_at?(()=>{try{const d=new Date(dr.cancelled_at);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}catch{return''}})():'';stamps.push({lbl:stLabel.cancelled,clr:stClr.cancelled,by:[cb,cd].filter(Boolean).join(' · ')||null})}else{if(done('priced'))stamps.push({lbl:stLabel.priced,clr:stClr.priced,by:nameOf(dr.priced_user||dr.created_user)});if(done('approved'))stamps.push({lbl:stLabel.approved,clr:stClr.approved,by:nameOf(dr.approved_user)});if(done('invoiced'))stamps.push({lbl:stLabel.invoiced,clr:stClr.invoiced,by:nameOf(dr.invoiced_user)||detailsInvoicedBy})}if(!stamps.length)return null;return<div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',justifyContent:'center',flexShrink:0}}>{stamps.map((s,i)=><div key={i} style={{transform:'rotate(-5deg)',border:`2.5px solid ${s.clr}`,borderRadius:8,color:s.clr,padding:'6px 16px',display:'flex',flexDirection:'column',alignItems:'center',gap:2,opacity:.92,boxShadow:`inset 0 0 0 2px ${s.clr}33`,flexShrink:0}}><span style={{fontSize:15,fontWeight:900,letterSpacing:'1.5px',lineHeight:1.1}}>{s.lbl}</span>{s.by&&<span style={{fontSize:8,fontWeight:700,letterSpacing:'.3px',opacity:.85}}>{s.by}</span>}</div>)}</div>})()}
{(()=>{
// The 5-day countdown only matters while a quote is still awaiting an invoice. Once it's
// invoiced (or in any terminal state) the window is moot, so drop the ring entirely.
if(['invoiced','completed','cancelled'].includes(dr.status))return null;
const tc=dr._tc||{};const pricedAt=tc.priced_at?new Date(tc.priced_at).getTime():0;const ageMs=Date.now()-pricedAt;const remainingMs=Math.max(0,(5*86400000)-ageMs);const expired=remainingMs<=0;const remDays=Math.floor(remainingMs/86400000);const remHrs=Math.floor((remainingMs%86400000)/3600000);const progress=expired?0:(remainingMs/(5*86400000));const ringClr=expired?C.red:(remDays<=1?C.gold:'#27a046');const stampClr=stClr[dr.status]||'#999';const stampLabel=stLabel[dr.status]||dr.status||'';return<>
{/* Day-dots countdown for the 5-day quote validity */}
<div style={{justifySelf:'end'}}>
<div title={expired?T('انتهت الصلاحية','Expired'):T(`متبقي ${remDays} يوم و ${remHrs} ساعة`,`${remDays}d ${remHrs}h left`)} style={{padding:8,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:6,boxSizing:'border-box'}}>
<div style={{position:'relative',width:74,height:74,display:'flex',alignItems:'center',justifyContent:'center'}}>
<svg width="74" height="74" viewBox="0 0 74 74" style={{transform:'rotate(-90deg)'}}>
<circle cx="37" cy="37" r="32" fill="none" stroke="var(--bd)" strokeWidth="5"/>
<circle cx="37" cy="37" r="32" fill="none" stroke={ringClr} strokeWidth="5" strokeLinecap="round" strokeDasharray={2*Math.PI*32} strokeDashoffset={2*Math.PI*32*(1-progress)} style={{transition:'stroke-dashoffset .5s ease'}}/>
</svg>
<div style={{position:'absolute',display:'flex',flexDirection:'column',alignItems:'center',color:ringClr,lineHeight:1}}>
<span style={{fontSize:23,fontWeight:700,lineHeight:1}}>{expired?'!':remDays}</span>
<span style={{fontSize:8.5,fontWeight:600,opacity:.78,marginTop:2}}>{expired?T('انتهت','exp'):T('من 5 أيام','of 5d')}</span>
</div>
</div>
</div>
</div>
</>})()}
</div>
</div>
<div style={{direction:dir,display:'grid',gridTemplateColumns:'1fr 340px',gap:14,alignItems:'flex-start'}}>
<div style={{display:'flex',flexDirection:'column',gap:14,minWidth:0}}>
{(()=>{const tc=dr._tc||{};
let ageStr=null;if(tc.dob){const dob=new Date(tc.dob);const tod=new Date();let y=tod.getFullYear()-dob.getFullYear();let m=tod.getMonth()-dob.getMonth();if(tod.getDate()<dob.getDate())m-=1;if(m<0){y-=1;m+=12};const yr=m>=6?y+1:y;ageStr=yr+T(' سنة',' yr')}
const iqExp=tc.iqama_expired===true;const iqValid=tc.iqama_expired===false;const iqColor=iqExp?C.red:(iqValid?'#27a046':null)
const insured=tc.insurance_status==='insured'
// زر «تعديل» موحّد لرأس الكرت
const editBtn=(card)=>(!canCardBtn(user,'transfer_calc',card,'edit')||!modalAllowed(user,'transfer_calc','card_edit'))?null:<button onClick={()=>openCardEdit(card)} style={{marginInlineStart:'auto',height:28,padding:'0 12px',borderRadius:8,background:'transparent',border:'1px dashed '+C.gold+'80',color:C.gold,fontFamily:F,fontSize:11.5,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.background=C.gold+'1a'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>{T('تعديل','Edit')}</button>
// سجل التغييرات لكرت — يجمع قيود transfer_calculation_audit لحقول الكرت (الشخص · كان→صار · التاريخ والوقت)
const auditLog=(keys)=>{const entries=[];keys.forEach(k=>{(detailsAudit[k]||[]).forEach(a=>entries.push({...a,_k:k}))});if(!entries.length)return null;entries.sort((a,b)=>new Date(b.changed_at)-new Date(a.changed_at));const fmtVal=(k,v)=>{if(v===null||v===undefined||v==='')return'—';if(k==='nationality_id'){const n=(nationalities||[]).find(x=>x.id===v);return n?(lang==='en'?(n.name_en||n.name_ar):n.name_ar):formatAuditValue(v)}return formatAuditValue(v)};return<div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--bd)',display:'flex',flexDirection:'column',gap:8}}>
<div style={{fontSize:11,color:'var(--tx4)',fontWeight:700,display:'inline-flex',alignItems:'center',gap:6}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{T('سجل التغييرات','Change Log')}</div>
{entries.map((a,i)=>{const ed=a.changed_user;const who=ed?(lang==='en'?(ed.name_en||ed.name_ar):ed.name_ar):null;const dt=new Date(a.changed_at);const hhmm=String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');return<div key={i} style={{background:'var(--inputBg)',border:'1px solid var(--bd)',borderRadius:9,padding:'8px 10px',display:'flex',flexDirection:'column',gap:5}}>
<div style={{fontSize:12,color:'var(--tx2)',fontWeight:600,lineHeight:1.7,wordBreak:'break-word'}}>{tcFieldLabel(a._k)}: <span style={{color:'var(--tx4)'}}>{T('كان','was')} </span><span style={{color:'#e5867a',textDecoration:'line-through'}}>{fmtVal(a._k,a.old_value)}</span><span style={{color:'var(--tx4)'}}> {T('صار','→')} </span><span style={{color:'#27a046'}}>{fmtVal(a._k,a.new_value)}</span></div>
<div style={{display:'flex',direction:dir,justifyContent:'space-between',alignItems:'center',gap:8,fontSize:10,color:'var(--tx5)'}}>{who?<span style={{fontWeight:600,color:C.gold}}>{who}</span>:<span/>}<span style={{display:'inline-flex',gap:6,direction:'ltr',fontVariantNumeric:'tabular-nums'}}><span>{fmtD(a.changed_at)}</span><span>{hhmm}</span></span></div>
</div>})}
</div>}
const gridCard=(title,nameField,cells,flagUrl,editCard,auditKeys)=>{const ff=cells.filter(Boolean).filter(c=>!c.fk||fieldVisible(user,'transfer_calc',c.fk));const CardCopyBtn=({val})=>{const[copied,setCopied]=useState(false);return<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(val));setCopied(true);setTimeout(()=>setCopied(false),1500)}} title={T('نسخ','Copy')} style={{width:18,height:18,background:'transparent',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,color:copied?C.ok:'var(--tx6)',transition:'color .15s',flexShrink:0,opacity:copied?1:.55}} onMouseEnter={e=>{if(!copied){e.currentTarget.style.color=C.gold;e.currentTarget.style.opacity=1}}} onMouseLeave={e=>{if(!copied){e.currentTarget.style.color='var(--tx6)';e.currentTarget.style.opacity=.55}}}>{copied?<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}</button>};return<div style={{background:'var(--card-grad2)',border:'1px solid var(--bd)',borderRadius:16,overflow:'hidden'}}>
<div style={{padding:'14px 22px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:10}}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/><span style={{fontSize:16,fontWeight:600,color:C.gold,letterSpacing:'.2px'}}>{title}</span>{flagUrl&&<img src={flagUrl} alt="" style={{width:22,height:16,objectFit:'cover',borderRadius:2,flexShrink:0}}/>}{editCard&&editBtn(editCard)}</div>
<div style={{padding:'16px 22px',display:'flex',flexDirection:'column',gap:12}}>
{nameField&&<div style={{display:'flex',flexDirection:'column',gap:4}}><span style={{fontSize:10.5,color:'var(--tx4)',fontWeight:600}}>{nameField.label}</span><span style={{fontSize:14,color:'var(--tx1)',fontWeight:600,lineHeight:1.4,textAlign:'start',direction:nameField.ltr?'ltr':undefined}}>{nameField.value||'—'}</span></div>}
<div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(3,Math.max(1,ff.length))},1fr)`,gap:8}}>
{ff.map((f,i)=><div key={i} style={{background:'var(--inputBg)',border:'1px solid var(--bd)',borderRadius:10,padding:'10px 12px',display:'flex',flexDirection:'column',gap:5,...(f.full?{gridColumn:'1 / -1'}:{})}}><span style={{fontSize:9.5,color:'var(--tx4)',fontWeight:600}}>{f.label}</span>{f.node?f.node:(f.copy&&f.value?<span style={{display:'flex',alignItems:'center',gap:6}}><span style={{flex:1,minWidth:0,fontSize:13,color:f.color||'var(--tx2)',fontWeight:600,wordBreak:'break-word',textAlign:'start',...(f.mono?{fontFamily:'monospace',direction:'ltr',fontVariantNumeric:'tabular-nums',textAlign:'right'}:f.ltr?{direction:'ltr',textAlign:'right'}:{})}}>{f.value}</span><CardCopyBtn val={f.value}/></span>:<span style={{fontSize:13,color:f.color||'var(--tx2)',fontWeight:600,wordBreak:'break-word',textAlign:'start',...(f.mono?{fontFamily:'monospace',direction:'ltr',fontVariantNumeric:'tabular-nums',textAlign:'right'}:f.ltr?{direction:'ltr',textAlign:'right'}:{})}}>{f.value||'—'}</span>)}</div>)}
</div>
{auditKeys&&auditLog(auditKeys)}
</div>
</div>}
const isLatinName=/[A-Za-z]/.test(tc.worker_name||mm.worker_name||'')
const natFlag=(()=>{const n=tc.nationality_id?(nationalities||[]).find(x=>x.id===tc.nationality_id):(tc.nationality?(nationalities||[]).find(x=>x.name_ar===tc.nationality):null);return n?.flag_url||null})()
return<>
{cardVisible(user,'transfer_calc','worker')&&gridCard(T('العامل','Worker'),null,[
{fk:'worker_name',label:T('الإسم','Name'),value:tc.worker_name||mm.worker_name,ltr:isLatinName,full:true,copy:true},
{fk:'iqama_number',label:T('رقم الإقامة','Iqama Number'),value:tc.iqama_number||mm.iqama_number,mono:true,copy:true},
{fk:'phone',label:T('رقم الجوال','Mobile'),value:tc.phone?'0'+tc.phone:null,mono:true,copy:true},
{fk:'dob',label:T('تاريخ الميلاد','Date of Birth'),node:<span style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8,direction:'ltr'}}>{ageStr&&<span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:C.gold,background:'rgba(212,160,23,.08)',borderRadius:20,padding:'3px 10px',direction:dir,flexShrink:0}}>{ageStr}</span>}<span style={{fontSize:13,color:'var(--tx2)',fontWeight:600,direction:'ltr',fontFamily:'monospace',fontVariantNumeric:'tabular-nums'}}>{tc.dob?fmtD(tc.dob):'—'}</span></span>},
],natFlag,'worker',['worker_name','iqama_number','phone','nationality_id','nationality','dob'])}
{cardVisible(user,'transfer_calc','professional')&&gridCard(T('البيانات المهنية','Professional Data'),null,[
{fk:'occupation_name_ar',label:T('المهنة الحالية','Current Occupation'),value:tc.occupation_name_ar||mm.occupation},
tc.change_profession?{fk:'new_occupation_name_ar',label:T('المهنة الجديدة','New Occupation'),value:tc.new_occupation_name_ar,color:C.gold}:null,
{fk:'sponsor_changes',label:T('عدد مرات نقل الخدمات','Service Transfer Count'),value:typeof tc.sponsor_changes==='number'?String(tc.sponsor_changes):null,mono:true},
{fk:'hrsd_worker_status',label:T('حالة العامل','Worker Status'),value:tc.hrsd_worker_status},
{fk:'resident_status_ar',label:T('حالة المقيم','Resident Status'),value:tc.resident_status_ar},
{fk:'iqama_expiry_gregorian',label:T('انتهاء الإقامة (ميلادي)','Iqama Expiry (Gregorian)'),value:tc.iqama_expiry_gregorian?fmtD(tc.iqama_expiry_gregorian):null,mono:true,color:iqColor},
{fk:'iqama_expiry_hijri',label:T('انتهاء الإقامة (هجري)','Iqama Expiry (Hijri)'),value:(()=>{const h=tc.iqama_expiry_hijri;if(!h)return null;const p=String(h).split('/');return p.length===3?`${p[2]}-${p[1]}-${p[0]}`:h})(),mono:true,color:iqColor},
],null,'professional',['occupation_name_ar','sponsor_changes','change_profession','new_occupation_name_ar','hrsd_worker_status','resident_status_ar','iqama_expiry_gregorian','iqama_expiry_hijri'])}
{cardVisible(user,'transfer_calc','conditions')&&gridCard(T('النقل','Transfer'),null,[
{fk:'renewal_period',label:T('مدة التجديد','Renewal Period'),value:(!tc.transfer_only&&tc.renew_iqama!==false&&Number(tc.renewal_months||0)>0)?(tc.renewal_months+' '+T('شهر','mo')):tc.transfer_only?T('نقل فقط','Transfer Only'):'—',color:((!tc.transfer_only&&tc.renew_iqama!==false&&Number(tc.renewal_months||0)>0)||tc.transfer_only)?C.gold:'var(--tx5)'},
{fk:'has_notice_period',label:T('فترة الإشعار','Notice Period'),value:tc.has_notice_period===true?T('نعم','Yes'):tc.has_notice_period===false?T('لا','No'):T('غير محدد','Not set'),color:tc.has_notice_period===null||tc.has_notice_period===undefined?'var(--tx5)':tc.has_notice_period?C.gold:'var(--tx2)'},
{fk:'employer_consent',label:T('موافقة صاحب العمل الحالي','Current Employer Consent'),value:tc.employer_consent===true?T('نعم','Yes'):tc.employer_consent===false?T('لا','No'):T('غير محدد','Not set'),color:tc.employer_consent===null||tc.employer_consent===undefined?'var(--tx5)':tc.employer_consent?C.gold:'var(--tx2)'},
],null,'conditions',['renewal_months','has_notice_period','employer_consent'])}
{cardVisible(user,'transfer_calc','pricing')&&(()=>{const ren=Number(tc.renewal_months||0);const renSuffix=ren>0?T(` (${ren} شهر)`,` (${ren} mo)`):'';
// أشهر تجديد الإقامة المحسوبة = المدى من انتهاء الإقامة حتى (تاريخ التسعير + أشهر التجديد) — تشمل الشهور المتأخرة عند انتهاء الإقامة،
// لذا قد تكون أكبر من أشهر التجديد المختارة. نُعيد حساب نفس صيغة الحاسبة من الحقول المخزّنة (انتهاء الإقامة + التجديد + تاريخ التسعير).
// أشهر التجديد المحتسبة مجمّدة في عمود billed_renewal_months وقت الإصدار؛ الحساب أدناه احتياطي للسجلات القديمة فقط.
const billedMos=tc.billed_renewal_months!=null?Number(tc.billed_renewal_months):(()=>{let billed=ren;const exp=tc.iqama_expiry_gregorian?new Date(tc.iqama_expiry_gregorian):null;if(exp&&!isNaN(exp)){const ref=tc.priced_at?new Date(tc.priced_at):new Date();ref.setHours(0,0,0,0);exp.setHours(0,0,0,0);if(exp<ref){const end=new Date(ref);end.setMonth(end.getMonth()+ren);let m=(end.getFullYear()-exp.getFullYear())*12+(end.getMonth()-exp.getMonth());let d=end.getDate()-exp.getDate();if(d<0){m-=1;d+=new Date(end.getFullYear(),end.getMonth(),0).getDate()}billed=d>0?m+1:m}}return billed})();
// لا نُظهر لاحقة الأشهر إلا إذا اختير تجديد فعلي (renewal_months>0)؛ السجلات المجلوبة بـ renewal_months=0 تبقى بلا لاحقة
// (الحساب الاحتياطي كان يُلفّق «1 شهر» من أيام تأخّر الإقامة بين انتهائها وتاريخ التسعير).
const renIqamaSuffix=(ren>0&&billedMos>0)?T(` (${billedMos} شهر)`,` (${billedMos} mo)`):'';
const lateFine=Number(tc.late_fine_amount||0);const officeFeeV=Number(tc.office_fee||0);const subtotalV=Number(tc.subtotal||0);const discountV=Number(tc.absher_discount||0)+Number(tc.manual_discount||0);const totalV=Number(tc.total_amount||0);
const lineItems=[
Number(tc.transfer_fee||0)>0?[T('رسوم نقل الكفالة','Sponsorship Transfer Fee'),tc.transfer_fee,null]:null,
Number(tc.iqama_renewal_fee||0)>0?[T('تجديد الإقامة','Iqama Renewal')+renIqamaSuffix,tc.iqama_renewal_fee,null]:null,
Number(tc.work_permit_fee||0)>0?[T('رخصة العمل','Work Permit')+renSuffix,tc.work_permit_fee,null]:null,
Number(tc.prof_change_fee||0)>0?[T('تغيير المهنة','Change Occupation'),tc.prof_change_fee,null]:null,
Number(tc.medical_fee||0)>0?[T('التأمين الطبي','Medical Insurance'),tc.medical_fee,null]:null,
lateFine>0?[T('غرامة الإقامة','Iqama Late Fine'),lateFine,'#e5867a']:null,
...((Array.isArray(tc.extras)?tc.extras:[]).map((e)=>{const a=Number(e?.amount)||0;return a>0?[e?.name||T('بند إضافي','Extra'),a,C.blue]:null}).filter(Boolean)),
].filter(Boolean);
return<div style={{background:'var(--card-grad2)',border:'1px solid var(--bd)',borderRadius:16,overflow:'hidden'}}>
<div style={{padding:'14px 22px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:10}}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/><span style={{fontSize:16,fontWeight:600,color:C.gold,letterSpacing:'.2px'}}>{T('التسعيرة','Pricing')}</span>{editBtn('pricing')}</div>
<div style={{padding:'8px 22px 2px'}}>
{lineItems.map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',minHeight:26}}><span style={{fontSize:12,color:'var(--tx4)',fontWeight:600}}>{it[0]}</span><span style={{fontSize:12.5,color:it[2]||'var(--tx2)',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{nmSar(it[1])}</span></div>)}
</div>
<div style={{margin:'8px 22px 0',borderTop:'1px solid var(--bd)',paddingTop:10}}>
{officeFeeV>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}><span style={{fontSize:13,color:'var(--tx3)',fontWeight:600}}>{T('رسوم المكتب','Office Fees')}</span><span style={{fontSize:14,color:'var(--tx)',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{nmSar(officeFeeV)}</span></div>}
<div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}><span style={{fontSize:13,color:C.gold,fontWeight:600}}>{T('الإجمالي الابتدائي','Subtotal')}</span><span style={{fontSize:14,color:C.gold,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{nmSar(subtotalV)}</span></div>
{Number(tc.absher_discount||0)>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}><span style={{fontSize:13,color:'#27a046',fontWeight:600}}>{T('خصم أبشر','Absher Discount')}</span><span style={{fontSize:14,color:'#27a046',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{nmSar(Number(tc.absher_discount||0))}</span></div>}
{Number(tc.manual_discount||0)>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}><span style={{fontSize:13,color:'#27a046',fontWeight:600}}>{T('خصم المكتب','Office Discount')}</span><span style={{fontSize:14,color:'#27a046',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{nmSar(Number(tc.manual_discount||0))}</span></div>}
</div>
<div style={{margin:'10px 22px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 18px',background:'linear-gradient(135deg,#d4a017,#bd8a13)',borderRadius:12,borderInlineEnd:'3px solid #9c7610'}}><span style={{color:'#1a1a1a',fontWeight:700,fontSize:14.5}}>{T('الإجمالي النهائي','Final Total')}</span><span style={{color:'#1a1a1a',fontWeight:800,fontSize:24,fontVariantNumeric:'tabular-nums'}}>{nm(totalV)} <span style={{fontSize:12,fontWeight:600}}>{T('ريال','SAR')}</span></span></div>
<div style={{padding:'0 22px 16px'}}>{auditLog(['transfer_fee','iqama_renewal_fee','work_permit_fee','prof_change_fee','medical_fee','office_fee','late_fine_amount','absher_discount','manual_discount'])}</div>
</div>})()}
</>})()}
{/* كرت التعليقات — تحت التسعيرة (نفس كرت التعليقات في تبويبات الخدمات، بدون أزرار سير العمل) */}
{cardVisible(user,'transfer_calc','comments')&&(<div style={{background:'var(--card-grad2)',border:'1px solid var(--bd)',borderRadius:16,overflow:'hidden'}}>
<div style={{padding:'14px 22px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:10}}><span style={{width:6,height:6,borderRadius:'50%',background:C.blue}}/><span style={{fontSize:16,fontWeight:600,color:C.blue,letterSpacing:'.2px'}}>{T('التعليقات','Comments')}</span></div>
<div style={{padding:'14px 22px',display:'flex',flexDirection:'column',gap:8}}>
{(()=>{
// خط زمني مدمج: التعليقات + معالم المراحل (تسعير · تصديق · فوترة) مرتّبة زمنياً،
// فيظهر فاصل لكل مرحلة بين التعليقات ليُعرف في أي مرحلة كُتب كل تعليق.
const _t=dr._tc||{};
const milestones=[
{ts:_t.priced_at,label:T('تم التسعير','Priced'),color:'#eab308'},
{ts:_t.approved_at,label:T('تم التصديق','Approved'),color:C.blue},
{ts:_t.invoiced_at,label:T('تمت الفوترة','Invoiced'),color:C.ok},
].filter(m=>m.ts).map(m=>({kind:'ms',...m}));
const timeline=[...quoteNotes.map(n=>({kind:'note',ts:n.created_at,n})),...milestones]
.sort((a,b)=>new Date(a.ts)-new Date(b.ts));
return timeline.map((ev,i)=>{
if(ev.kind==='ms'){const md=new Date(ev.ts);const mhhmm=String(md.getHours()).padStart(2,'0')+':'+String(md.getMinutes()).padStart(2,'0');return(
<div key={'ms-'+i} style={{display:'flex',alignItems:'center',gap:10,margin:'4px 0',direction:dir}}>
<span style={{flex:1,height:1,background:ev.color+'33'}}/>
<span style={{display:'inline-flex',flexDirection:'column',alignItems:'center',gap:1,padding:'0 6px',flexShrink:0}}>
<span style={{display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:ev.color}}/>
<span style={{fontSize:11,fontWeight:700,color:ev.color}}>{ev.label}</span>
</span>
<span style={{fontSize:9,color:'var(--tx5)',direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{fmtD(ev.ts)} · {mhhmm}</span>
</span>
<span style={{flex:1,height:1,background:ev.color+'33'}}/>
</div>);}
const n=ev.n;const p=n.author?.person;const name=((lang==='en'?(p?.name_en||p?.name_ar):(p?.name_ar||p?.name_en))||'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ');const dt=new Date(n.created_at);const hhmm=String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');return(
<div key={n.id} style={{background:'var(--inputBg)',borderRadius:10,padding:'10px 12px',display:'flex',flexDirection:'column',gap:6,border:'1px solid var(--bd)'}}>
<span style={{fontSize:13,color:'var(--tx2)',fontWeight:600,lineHeight:1.6,wordBreak:'break-word',whiteSpace:'pre-wrap'}}>{n.note}</span>
{Array.isArray(n.attachments)&&n.attachments.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:12}}>{n.attachments.map((a,j)=><a key={a.id||j} href={a.file_url} target="_blank" rel="noreferrer" title={a.file_name||T('مرفق','Attachment')} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:C.gold,textDecoration:'none'}}><Paperclip size={12} strokeWidth={2}/><span style={{textDecoration:'underline',textUnderlineOffset:3,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',direction:'ltr'}}>{a.file_name||(T('مرفق','Attachment')+' '+(j+1))}</span></a>)}</div>}
<div style={{display:'flex',direction:dir,justifyContent:'space-between',alignItems:'center',gap:8,fontSize:10.5,color:'var(--tx5)'}}>{name?<span style={{fontWeight:600,color:C.gold}}>{name}</span>:<span/>}<span style={{display:'inline-flex',alignItems:'center',gap:6,direction:'ltr',fontVariantNumeric:'tabular-nums'}}><span>{fmtD(n.created_at)}</span><span>{hhmm}</span></span></div>
</div>);
});
})()}
{quoteNotes.length===0&&<span style={{fontSize:11.5,color:'var(--tx5)'}}>{T('لا توجد تعليقات بعد','No comments yet')}</span>}
{modalAllowed(user,'transfer_calc','add_comment')&&<button onClick={()=>setQuoteNoteModal(true)} onMouseEnter={e=>{e.currentTarget.style.background=C.blue+'1f'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}} style={{alignSelf:'stretch',justifyContent:'center',height:42,padding:'0 16px',borderRadius:9,background:'transparent',border:'1px dashed '+C.blue+'80',color:C.blue,fontFamily:F,fontSize:12.5,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7,transition:'.15s'}}>{T('إضافة تعليق','Add comment')}<Plus size={15} strokeWidth={2.4}/></button>}
</div>
</div>)}
{quoteNoteModal&&<QuoteNoteModal sb={sb} T={T} toast={toast} tcId={dr.id} user={user} onClose={()=>setQuoteNoteModal(false)} onSaved={loadQuoteNotes}/>}
{<>
{cardVisible(user,'transfer_calc','notes')&&(((dr.notes&&typeof dr.notes==='string'&&dr.notes.trim()&&!dr.notes.trim().startsWith('{'))||mm.internal_notes)?sec(T('ملاحظات','Notes'),[
mm.internal_notes?[T('ملاحظات داخلية','Internal Notes'),mm.internal_notes]:null,
(dr.notes&&typeof dr.notes==='string'&&!dr.notes.trim().startsWith('{'))?[T('ملاحظات','Notes'),dr.notes]:null,
],icoNote):null)}
</>}
</div>
{/* ═══ Sticky sidebar — Summary + Actions ═══ */}
{(()=>{const tc=dr._tc||{};const total=Number(tc.total_amount||dr.client_charge||0);const absher=Number(tc.absher_discount||0);const manualDisc=Number(tc.manual_discount||0);const totalDiscount=absher+manualDisc;const officeFee=Number(tc.office_fee||mm.office_fee||0);const durMo=Number(tc.expected_duration_months??mm.duration_months??tc.duration_months??0);const durDays=Number(tc.expected_duration_days??mm.duration_days??tc.duration_days??0);const expDays=Number(mm.expected_iqama_days||tc.expected_iqama_days||0);const renMo=Number(mm.renewal_months||tc.renewal_months||0);const moU=n=>(n>=3&&n<=9)?T('شهر','mo'):T('شهور','mo');const dyU=n=>(n>=3&&n<=9)?T('يوم','d'):T('أيام','d');let durLabel='';const _durJoin=T(' و ',' ');if(durMo>0||durDays>0){const parts=[];if(durMo>0)parts.push(durMo+' '+moU(durMo));if(durDays>0)parts.push(durDays+' '+dyU(durDays));durLabel=parts.join(_durJoin)}else if(expDays>0){const m=Math.floor(expDays/30);const d=expDays%30;const parts=[];if(m>0)parts.push(m+' '+moU(m));if(d>0)parts.push(d+' '+dyU(d));durLabel=parts.join(_durJoin)}else if(renMo>0){durLabel=renMo+' '+moU(renMo)}const cardChrome={background:'var(--card-grad2)',border:'1px solid var(--bd)',borderRadius:16,overflow:'hidden'};const cardHeader={padding:'14px 22px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:10};const cardTitle={fontSize:16,fontWeight:600,color:C.gold,letterSpacing:'.2px'};const AmountBox=({label,value,color})=><div style={{padding:'14px 18px',background:'var(--inputBg)',textAlign:'center'}}><div style={{fontSize:11,color:'var(--tx2)',fontWeight:600,marginBottom:6,letterSpacing:1}}>{label}</div><div style={{fontSize:18,fontWeight:700,color,direction:'ltr',fontVariantNumeric:'tabular-nums',letterSpacing:'-.5px'}}>{value}</div></div>;return<div style={{position:'sticky',top:14,display:'flex',flexDirection:'column',gap:14}}>
{/* Summary card — تصميم مطابق لتسعيرة التجديد: رأس ذهبي متدرّج + الإجمالي البارز + بطاقتان بشريط لوني + فوتر الخصومات */}
{cardVisible(user,'transfer_calc','financial_summary')&&(()=>{const subtotalV=Number(tc.subtotal||0);const pricerNm=dr.priced_user?(lang==='en'?(dr.priced_user.name_en||dr.priced_user.name_ar):dr.priced_user.name_ar):null;const twoNames=(pricerNm||'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ');
const Pill=({color,label,value})=><div style={{position:'relative',padding:'12px 14px',borderRadius:12,background:'var(--inputBg)',border:'1px solid var(--bd)',overflow:'hidden'}}><div style={{position:'absolute',top:0,bottom:0,insetInlineStart:0,width:4,background:color}}/><div style={{fontSize:12,color:'var(--tx3)',fontWeight:600,marginBottom:5}}>{label}</div><div style={{display:'flex',alignItems:'baseline',gap:5,direction:dir}}><span style={{fontSize:19,fontWeight:800,color,fontVariantNumeric:'tabular-nums',letterSpacing:'-.5px',direction:'ltr',unicodeBidi:'isolate'}}>{value}</span><span style={{fontSize:11,fontWeight:700,color,opacity:.72}}>{T('ريال','SAR')}</span></div></div>;
const Meta=({label,value,color='var(--tx2)'})=><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12,gap:10}}><span style={{color:'var(--tx4)'}}>{label}</span><span style={{color,fontWeight:700}}>{value}</span></div>;
// الإنتهاء المتوقع للإقامة — يُقرأ من العمود المجمّد، فإن غاب (سجلات بابل المستوردة) يُحسب بنفس صيغة الحاسبة:
// لا تجديد ⇒ —؛ وإلا البداية = انتهاء الإقامة (أو تاريخ التسعير + أيام المعالجة إن انتهت ≥ الحدّ) + أشهر التجديد.
const expExpiryV=tc.expected_expiry_date||(()=>{const expStr=tc.iqama_expiry_gregorian;if(!expStr)return null;const exp=new Date(expStr);if(isNaN(exp))return null;if(tc.transfer_only||tc.renew_iqama===false)return null;const ren=Number(tc.renewal_months||0);if(ren<=0)return null;const _cfg=getKafalaPricingConfig();const ref=tc.priced_at?new Date(tc.priced_at):new Date();ref.setHours(0,0,0,0);exp.setHours(0,0,0,0);const threshold=parseInt(_cfg.thresholdCase2)||30;const daysSinceExpiry=Math.floor((ref-exp)/86400000);const start=daysSinceExpiry>=threshold?(()=>{const d=new Date(ref);d.setDate(d.getDate()+(parseInt(_cfg.procDaysCase2)||7));return d})():new Date(exp);start.setMonth(start.getMonth()+ren);return start.toISOString().slice(0,10)})();
return<div style={cardChrome}>
<div style={{position:'relative',padding:'16px 22px 20px',background:`linear-gradient(135deg, ${C.gold} 0%, #b8860b 100%)`,overflow:'hidden'}}>
<div style={{position:'absolute',top:-34,insetInlineEnd:-18,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,.10)'}}/>
<div style={{position:'relative',display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
<span style={{width:6,height:6,borderRadius:'50%',background:'#000'}}/>
<span style={{fontSize:16,fontWeight:700,color:'#000',letterSpacing:'.2px'}}>{T('الملخص المالي','Financial Summary')}</span>
{twoNames&&<span style={{marginInlineStart:'auto',display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:999,background:'rgba(0,0,0,.14)',color:'#000',fontSize:9.5,fontWeight:600}}>{twoNames}</span>}
</div>
<div style={{position:'relative',display:'flex',alignItems:'baseline',justifyContent:'flex-end',gap:6,marginTop:2}}>
<span style={{fontSize:32,fontWeight:900,color:'#000',direction:'ltr',fontVariantNumeric:'tabular-nums',letterSpacing:'-1px'}}>{nm(Math.round(total))}</span>
<span style={{fontSize:13,fontWeight:800,color:'#000'}}>{T('ريال','SAR')}</span>
</div>
</div>
<div style={{padding:'14px 18px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<Pill color={C.gold} label={T('الرسوم المكتبية','Office Fee')} value={nm(tc.office_fee_net??Math.max(0,officeFee-manualDisc))}/>
<Pill color={'var(--tx2)'} label={T('الرسوم الحكومية','Government Fees')} value={nm(tc.government_fees??Math.max(0,subtotalV-officeFee-absher))}/>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',flexDirection:'column',gap:8}}>
{absher>0&&<Meta label={T('خصم أبشر','Absher Discount')} color={C.ok} value={<span style={{direction:'ltr',fontVariantNumeric:'tabular-nums',unicodeBidi:'isolate'}}>{nm(absher)}</span>}/>}
{manualDisc>0&&<Meta label={T('خصم المكتب','Office Discount')} color={C.ok} value={<span style={{direction:'ltr',fontVariantNumeric:'tabular-nums',unicodeBidi:'isolate'}}>{nm(manualDisc)}</span>}/>}
<Meta label={T('المدة المتوقعة','Expected Duration')} color={C.gold} value={durLabel||'—'}/>
<Meta label={T('الإنتهاء المتوقع','Expected Expiry')} color={C.gold} value={expExpiryV?<span style={{direction:'ltr',fontVariantNumeric:'tabular-nums',unicodeBidi:'isolate'}}>{fmtD(expExpiryV)}</span>:'—'}/>
{tc.invoice_id&&(dr.status==='invoiced'||dr.status==='completed')&&<Meta label={T('الفاتورة','Invoice')} color={C.gold} value={<span onClick={()=>{try{window.dispatchEvent(new CustomEvent('app-navigate-invoice',{detail:{id:tc.invoice_id}}))}catch{}}} title={T('فتح تفاصيل الفاتورة','Open invoice details')} style={{direction:'ltr',unicodeBidi:'isolate',cursor:'pointer',textDecoration:'underline',textUnderlineOffset:3,fontVariantNumeric:'tabular-nums'}}>{detailsInvoiceNo||('INV-'+String(tc.invoice_id).slice(0,8).toUpperCase())}</span>}/>}
</div>
</div>})()}
{/* Action buttons grid 2x2 */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
{(()=>{const expired=tc.priced_at?(Date.now()-new Date(tc.priced_at).getTime())>(5*86400000):false;const hasApprovePerm=Array.isArray(user?.perms)&&user.perms.some(p=>p.module==='quotations'&&p.action==='approve');const canApprove=isGM||hasApprovePerm;const showApprove=dr.status==='priced'&&canApprove&&modalAllowed(user,'transfer_calc','approve');const showCancel=['priced','approved'].includes(dr.status)&&canApprove&&modalAllowed(user,'transfer_calc','cancel');const blocked=expired;return<>{showApprove&&<button onClick={()=>{if(expired){toast(T('انتهت صلاحية التسعيرة — لا يمكن التصديق','Quote expired'));return}setApproveSaved(false);setApproveForm({_id:dr.id,worker_name:(tc.worker_name&&tc.worker_name!=='—'&&tc.worker_name!=='-')?tc.worker_name:'',phone:tc.phone||'',dob:tc.dob||'',nationality_id:tc.nationality_id||((nationalities||[]).find(n=>n.name_ar===tc.nationality)?.id)||'',gender:tc.gender||'',work_permit_expiry:tc.work_permit_expiry||'',has_notice_period:tc.has_notice_period,employer_consent:tc.employer_consent,manual_discount:Number(tc.manual_discount||0),_subtotal:Number(tc.subtotal||0),_absher:Number(tc.absher_discount||0),_currentTotal:Number(tc.total_amount||0),_officeFee:Number(tc.office_fee||0),_renewalMonths:Number(tc.renewal_months||0),_workerName:tc.worker_name,_quoteNo:tc.quote_no})}} disabled={saving||blocked} onMouseEnter={e=>{if(!blocked)e.currentTarget.style.background='rgba(52,131,180,.18)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(52,131,180,.1)'}} style={{height:44,padding:'0 18px',borderRadius:11,background:'rgba(52,131,180,.1)',border:'1px solid rgba(52,131,180,.32)',boxShadow:'var(--shadow-sm)',color:C.blue,cursor:blocked?'not-allowed':'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:F,fontSize:12.5,fontWeight:700,opacity:blocked?.55:1,gridColumn:showCancel?'span 1':'span 2',whiteSpace:'nowrap',transition:'background .15s ease, border-color .15s ease'}}><span>{T('تصديق الحسبة','Approve Quote')}</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>}{showCancel&&<button onClick={()=>{setCancelSaved(false);setCancelForm({_id:dr.id,_workerName:tc.worker_name,_quoteNo:tc.quote_no,reason:''})}} disabled={saving} onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.18)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(192,57,43,.1)'}} style={{height:44,padding:'0 18px',borderRadius:11,background:'rgba(192,57,43,.1)',border:'1px solid rgba(192,57,43,.3)',boxShadow:'var(--shadow-sm)',color:C.red,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:F,fontSize:12.5,fontWeight:700,gridColumn:showApprove?'span 1':'span 2',whiteSpace:'nowrap',transition:'background .15s ease, border-color .15s ease'}}><span>{T('إلغاء الحسبة','Cancel Quote')}</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></button>}</>})()}
{/* Print section header */}
<div style={{gridColumn:'span 2',display:'flex',alignItems:'center',gap:8,marginTop:6,paddingBottom:2}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:C.gold}}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
<span style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:'.3px'}}>{T('طباعة','Print')}</span>
<span style={{flex:1,height:1,background:'rgba(212,160,23,.18)'}}/>
</div>
{[{k:'ar',l:'عربي',cc:'sa'},{k:'en',l:'English',cc:'gb'},{k:'hi',l:'हिन्दी',cc:'in'},{k:'ur',l:'اردو',cc:'pk'},{k:'bn',l:'বাংলা',cc:'bd'}].map(o=>(
<button key={o.k} onClick={()=>printTransferDoc(dr,o.k)} title={T('طباعة بـ ','Print in ')+o.l} style={{height:40,padding:'0 10px',borderRadius:10,background:'rgba(212,160,23,.06)',border:'1px solid rgba(212,160,23,.22)',color:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,fontFamily:F,fontSize:12,fontWeight:700,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.14)';e.currentTarget.style.borderColor='rgba(212,160,23,.45)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(212,160,23,.06)';e.currentTarget.style.borderColor='rgba(212,160,23,.22)'}}>
<img src={`https://flagcdn.com/w40/${o.cc}.png`} alt="" width="18" height="13" style={{display:'block',borderRadius:2,objectFit:'cover',flexShrink:0}}/>
<span>{o.l}</span>
</button>
))}
</div>
</div>})()}
</div>
</div>
})()}
{/* ═══ Per-card edit modal — حقول الكرت فقط (variant=edit) ═══ */}
{cardEdit&&(()=>{const f=cardEdit;const setF=(k,v)=>setCardEdit(p=>({...p,[k]:v}));
const fVis=(k)=>fieldVisible(user,'transfer_calc',k),fEd=(k)=>fieldEditable(user,'transfer_calc',k);
const titles={worker:T('تعديل بيانات العامل','Edit Worker Data'),professional:T('تعديل البيانات المهنية','Edit Professional Data'),conditions:T('تعديل النقل','Edit Transfer'),pricing:T('تعديل التسعيرة','Edit Pricing')};
let content;
if(f.card==='worker')content=<ModalSection Icon={User} label={T('بيانات العامل','Worker Data')}><div style={GRID}>
{fVis('worker_name')&&<TextField full label={T('الإسم','Name')} value={f.worker_name||''} onChange={v=>setF('worker_name',v)} disabled={!fEd('worker_name')}/>}
{fVis('iqama_number')&&<TextField label={T('رقم الإقامة','Iqama Number')} dir="ltr" value={f.iqama_number||''} onChange={v=>setF('iqama_number',v)} disabled={!fEd('iqama_number')}/>}
{fVis('phone')&&<TextField label={T('رقم الجوال','Mobile')} dir="ltr" value={f.phone||''} onChange={v=>setF('phone',v)} disabled={!fEd('phone')}/>}
{fVis('nationality_id')&&<FKSelect label={T('الجنسية','Nationality')} value={f.nationality_id||''} onChange={v=>setF('nationality_id',v)} placeholder={'— '+T('اختر','Select')+' —'} options={nationalities} getKey={x=>x.id} getLabel={x=>lang==='en'?(x.name_en||x.name_ar):x.name_ar} disabled={!fEd('nationality_id')}/>}
{fVis('dob')&&<FKDateField label={T('تاريخ الميلاد','Date of Birth')} value={f.dob||''} onChange={v=>setF('dob',v)} disabled={!fEd('dob')}/>}
</div></ModalSection>;
else if(f.card==='professional')content=<ModalSection Icon={FileText} label={T('البيانات المهنية','Professional Data')}><div style={GRID}>
{fVis('occupation_name_ar')&&<TextField full label={T('المهنة','Occupation')} value={f.occupation_name_ar||''} onChange={v=>setF('occupation_name_ar',v)} disabled={!fEd('occupation_name_ar')}/>}
{fVis('sponsor_changes')&&<TextField label={T('عدد مرات نقل الخدمات','Transfer Count')} dir="ltr" value={f.sponsor_changes??''} onChange={v=>setF('sponsor_changes',String(v).replace(/[^0-9]/g,''))} disabled={!fEd('sponsor_changes')}/>}
{fVis('change_profession')&&<YesNo label={T('تغيير المهنة','Change Occupation')} value={f.change_profession} onChange={v=>setF('change_profession',v)} disabled={!fEd('change_profession')}/>}
{f.change_profession&&fVis('new_occupation_name_ar')?<TextField label={T('المهنة الجديدة','New Occupation')} value={f.new_occupation_name_ar||''} onChange={v=>setF('new_occupation_name_ar',v)} disabled={!fEd('new_occupation_name_ar')}/>:null}
{fVis('hrsd_worker_status')&&<TextField label={T('حالة العامل','Worker Status')} value={f.hrsd_worker_status||''} onChange={v=>setF('hrsd_worker_status',v)} disabled={!fEd('hrsd_worker_status')}/>}
{fVis('resident_status_ar')&&<TextField label={T('حالة المقيم','Resident Status')} value={f.resident_status_ar||''} onChange={v=>setF('resident_status_ar',v)} disabled={!fEd('resident_status_ar')}/>}
{fVis('iqama_expiry_gregorian')&&<FKDateField label={T('انتهاء الإقامة (ميلادي)','Iqama Expiry (G)')} value={f.iqama_expiry_gregorian||''} onChange={v=>setF('iqama_expiry_gregorian',v)} disabled={!fEd('iqama_expiry_gregorian')}/>}
{fVis('iqama_expiry_hijri')&&<TextField label={T('انتهاء الإقامة (هجري)','Iqama Expiry (H)')} dir="ltr" value={f.iqama_expiry_hijri||''} onChange={v=>setF('iqama_expiry_hijri',v)} disabled={!fEd('iqama_expiry_hijri')}/>}
</div></ModalSection>;
else if(f.card==='conditions')content=<ModalSection Icon={FileText} label={T('النقل','Transfer')}><div style={GRID}>
{fVis('renewal_period')&&<TextField label={T('مدة التجديد (شهور)','Renewal (months)')} dir="ltr" value={f.renewal_months??''} onChange={v=>setF('renewal_months',String(v).replace(/[^0-9]/g,''))} disabled={!fEd('renewal_period')}/>}
{fVis('has_notice_period')&&<YesNo label={T('فترة الإشعار','Notice Period')} value={f.has_notice_period} onChange={v=>setF('has_notice_period',v)} disabled={!fEd('has_notice_period')}/>}
{fVis('employer_consent')&&<YesNo label={T('موافقة صاحب العمل الحالي','Current Employer Consent')} value={f.employer_consent} onChange={v=>setF('employer_consent',v)} disabled={!fEd('employer_consent')}/>}
</div></ModalSection>;
else content=<ModalSection Icon={Banknote} label={T('الرسوم','Fees')}><div style={GRID}>
{[['transfer_fee',T('رسوم نقل الكفالة','Transfer Fee')],['iqama_renewal_fee',T('تجديد الإقامة','Iqama Renewal')],['work_permit_fee',T('رخصة العمل','Work Permit')],['prof_change_fee',T('تغيير المهنة','Change Occupation')],['medical_fee',T('التأمين الطبي','Medical Insurance')],['late_fine_amount',T('غرامة الإقامة','Iqama Late Fine')],['office_fee',T('رسوم المكتب','Office Fee')],['absher_discount',T('خصم أبشر','Absher Discount')],['manual_discount',T('خصم المكتب','Office Discount')]].filter(([k])=>fVis(k)).map(([k,l])=><CurrencyField key={k} label={l} value={f[k]??''} onChange={v=>setF(k,v)} disabled={!fEd(k)}/>)}
<div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:9,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.3)',minHeight:44}}><span style={{fontSize:13,fontWeight:600,color:'var(--tx2)'}}>{T('الإجمالي بعد التعديل','New total')}</span><span style={{flex:1}}/><span style={{fontSize:16,fontWeight:700,color:FKC.gold,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{(()=>{const sum=['transfer_fee','iqama_renewal_fee','work_permit_fee','prof_change_fee','medical_fee','office_fee','late_fine_amount'].reduce((s,k)=>s+(Number(f[k])||0),0);const tot=Math.max(0,sum-(Number(f.absher_discount)||0)-(Number(f.manual_discount)||0));return nm(tot)+' '+T('ريال','SAR')})()}</span></div>
</div></ModalSection>;
return<FKModal open onClose={()=>{if(!cardSaving)setCardEdit(null)}} width={560} variant="edit" title={titles[f.card]} Icon={FileText}
 onSubmit={saveCardEdit} submitting={cardSaving} submitLabel={T('حفظ','Save')}
 pages={[{valid:true,content}]}/>
})()}
{/* ═══ Approval modal — FormKit (صفحتان، variant="edit") ═══ */}
{approveForm&&(()=>{
const f=approveForm;
const setF=(k,v)=>setApproveForm(p=>({...p,[k]:v}));
const _kcfg=getKafalaPricingConfig();const _discEnabled=_kcfg.kafalaOfficeDiscountEnabled!==false;const _appliedDisc=Math.max(0,Math.round(Number(f.manual_discount||0)));
const phRaw=String(f.phone||'').replace(/^\+?966/,'');
const phErr=phRaw&&!/^5[013-9]\d{7}$/.test(phRaw);
const required=['nationality_id','gender','work_permit_expiry'];
const missing=required.filter(k=>!f[k]);
const noticeSet=f.has_notice_period===true||f.has_notice_period===false;
const consentSet=f.employer_consent===true||f.employer_consent===false;
// اسم العامل يُعدّ مفقوداً إذا كان فارغاً أو مجرد شرطة نائبة («—»/«-») — فيُطلب إدخاله عند التصديق.
const _wnTrim=String(f._workerName||'').trim();
const nameMissing=!_wnTrim||_wnTrim==='—'||_wnTrim==='-';
const _wnInput=String(f.worker_name||'').trim();
const nameOk=!nameMissing||(!!_wnInput&&_wnInput!=='—'&&_wnInput!=='-');
const ready=noticeSet&&consentSet&&nameOk;
return <FKModal open onClose={()=>{if(approveSaving)return;setApproveForm(null);if(approveSaved){setApproveSaved(false);setDetailsRow(null)}}} width={560} variant="edit"
 success={approveSaved?<SuccessView title={T('تم تصديق الحسبة','Quote approved')} code={f._quoteNo?noDash(f._quoteNo):undefined}/>:null}
 title={T('تصديق الحسبة','Approve Quote')+(f._quoteNo?' — '+noDash(f._quoteNo):'')} subtitle={f._workerName||undefined} Icon={BadgeCheck}
 onSubmit={submitApproval} submitting={approveSaving} submitLabel={T('تصديق الحسبة','Approve Quote')}
 nextLabel={T('التالي','Next')} backLabel={T('السابق','Back')}
 pages={[
 {valid:ready,content:(<>
 <ModalSection Icon={FileText} label={T('الإقرارات','Declarations')}>
 <div style={GRID}>
 <YesNo label={T('فترة الإشعار','Notice Period')} req value={f.has_notice_period} onChange={v=>setF('has_notice_period',v)}/>
 <YesNo label={T('موافقة صاحب العمل الحالي','Current Employer Consent')} req value={f.employer_consent} onChange={v=>setF('employer_consent',v)}/>
 </div>
 </ModalSection>
 {nameMissing&&<ModalSection Icon={User} label={T('اسم العامل','Worker Name')}>
 <div style={GRID}>
 <TextField full req label={T('اسم العامل','Worker Name')} placeholder={T('أدخل اسم العامل','Enter worker name')} value={f.worker_name||''} onChange={v=>setF('worker_name',v)}/>
 </div>
 </ModalSection>}
 <ModalSection Icon={Banknote} label={T('الخصم والملاحظة','Discount & Note')}>
 <div style={GRID}>
 {_discEnabled?<CurrencyField full label={T(<>خصم المكتب <span style={{fontSize:11,fontWeight:500,color:'var(--tx4)'}}>(اختياري)</span></>,<>Office Discount <span style={{fontSize:11,fontWeight:500,color:'var(--tx4)'}}>(optional)</span></>)} value={f.manual_discount||''} onChange={v=>setF('manual_discount',v)}/>:<div style={{gridColumn:'1/-1',fontSize:11.5,color:'var(--tx4)',fontWeight:600,padding:'10px 12px',borderRadius:9,background:'var(--inputBg)',border:'1px solid var(--bd)'}}>{T('خصم المكتب غير مُتاح (معطّل من إعدادات الخدمات).','Office discount is disabled in service settings.')}</div>}
 <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:9,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.3)',minHeight:44}}><span style={{fontSize:13,fontWeight:600,color:'var(--tx2)'}}>{T('الإجمالي بعد الخصم','Total after discount')}</span><span style={{flex:1}}/><span style={{fontSize:16,fontWeight:700,color:FKC.gold,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{nm(Math.max(0,f._subtotal-(f._absher||0)-_appliedDisc))+' '+T('ريال','SAR')}</span></div>
 </div>
 </ModalSection></>)}
 ]}/>
})()}
{/* ═══ نافذة إلغاء الحسبة — FormKit (نجاح داخل النافذة) ═══ */}
{cancelForm&&(()=>{
const f=cancelForm;
const setF=(k,v)=>setCancelForm(p=>({...p,[k]:v}));
return<FKModal open onClose={()=>{if(cancelSaving)return;setCancelForm(null);if(cancelSaved){setCancelSaved(false);setDetailsRow(null)}}} width={520} variant="edit"
 success={cancelSaved?<SuccessView title={T('تم إلغاء الحسبة','Quote cancelled')} code={f._quoteNo?noDash(f._quoteNo):undefined}/>:null}
 title={T('إلغاء الحسبة','Cancel Quote')+(f._quoteNo?' — '+noDash(f._quoteNo):'')} subtitle={f._workerName||undefined} Icon={AlertCircle}
 onSubmit={submitCancel} submitting={cancelSaving} submitLabel={T('تأكيد الإلغاء','Confirm Cancellation')}
 pages={[{valid:true,content:(
 <ModalSection Icon={AlertCircle} label={T('تأكيد الإلغاء','Confirm Cancellation')}>
 <div style={{display:'flex',flexDirection:'column',gap:12}}>
 <div style={{display:'flex',flexDirection:'column',gap:9,padding:'12px 14px',borderRadius:10,background:'var(--inputBg)',border:'1px solid var(--bd)'}}>
 <div style={{fontSize:12.5,fontWeight:600,color:'var(--tx2)'}}>{T('سبب الإلغاء','Cancellation reason')} <span style={{fontSize:10,fontWeight:400,color:'var(--tx4)'}}>({T('اختياري','optional')})</span></div>
 <textarea value={f.reason} onChange={e=>setF('reason',e.target.value.slice(0,500))} placeholder={T('سبب الإلغاء (اختياري)…','Reason (optional)…')} rows={3} style={{width:'100%',padding:'10px 12px',border:'1px solid var(--bd)',borderRadius:9,fontFamily:F,fontSize:13,fontWeight:500,color:'var(--tx)',outline:'none',background:'var(--inputBg)',boxSizing:'border-box',resize:'vertical',direction:dir}}/>
 </div>
 <div style={{fontSize:12,color:C.red,lineHeight:1.7,background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.25)',borderRadius:9,padding:'10px 12px'}}>{T('بالإلغاء تنتقل الحسبة إلى حالة «ملغاة» ويُسجَّل اسمك وتاريخ الإلغاء. ولا يمكن استخدامها في فاتورة بعد ذلك.','Cancelling moves the quote to “Cancelled”, records your name and the date, and it can no longer be invoiced.')}</div>
 </div>
 </ModalSection>
 )}]}/>
})()}
{/* ═══ نافذة التسعيرة (المعالج) — FormKit pages ═══ */}
{pop&&(()=>{
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
const isEdit=!!form._id
const modeField=<Segmented full label={T('وضع العامل','Worker Mode')} value={workerMode} onChange={setWorkerMode} options={[{v:'existing',l:T('عامل مسجّل','Existing Worker')},{v:'new',l:T('عامل جديد','New Worker')}]}/>
const workerPages=workerMode==='existing'?[
{title:T('بيانات العامل','Worker Info'),content:(
<ModalSection Icon={User} label={T('بيانات العامل','Worker Info')}>
<div style={GRID}>
{modeField}
<FKSelect label={T('العامل','Worker')} req value={form.worker_id} onChange={v=>setF('worker_id',v)} placeholder={T('اختر العامل','Select worker')} options={workers} getKey={w=>w.id} getLabel={w=>w.name_ar}/>
<FKSelect label={T('المنشأة الحالية','Current Facility')} req value={form.facility_id} onChange={v=>setF('facility_id',v)} placeholder={'— '+T('اختر','Select')+' —'} options={facilities} getKey={x=>x.id} getLabel={x=>x.name_ar}/>
</div>
</ModalSection>)}
]:[
{title:T('بيانات العامل','Worker Info'),content:(
<ModalSection Icon={User} label={T('بيانات العامل','Worker Info')}>
<div style={GRID}>
{modeField}
<TextField label={T('اسم العامل','Worker Name')} req value={form.w_name||''} onChange={v=>setF('w_name',v)}/>
<TextField label={T('رقم الإقامة','Iqama No.')} req dir="ltr" value={form.w_iqama||''} onChange={v=>setF('w_iqama',v)}/>
<TextField label={T('الجنسية','Nationality')} req value={form.w_nationality||''} onChange={v=>setF('w_nationality',v)}/>
<Segmented label={T('الجنس','Gender')} value={form.w_gender} onChange={v=>setF('w_gender',v)} options={[{v:'male',l:T('ذكر','Male'),c:FKC.blue},{v:'female',l:T('أنثى','Female'),c:'#9b59b6'}]}/>
<TextField label={T('رقم الجوال','Phone')} dir="ltr" value={form.w_phone||''} onChange={v=>setF('w_phone',v)}/>
<TextField label={T('المهنة الحالية','Current Occupation')} value={form.w_occupation||''} onChange={v=>setF('w_occupation',v)}/>
</div>
</ModalSection>)},
{title:T('وثائق العامل','Worker Documents'),content:(
<ModalSection Icon={FileText} label={T('وثائق العامل','Worker Documents')}>
<div style={GRID}>
<FKDateField label={T('تاريخ نهاية الإقامة ميلادي','Iqama Expiry (G)')} value={form.w_iqama_expiry||''} onChange={v=>setF('w_iqama_expiry',v)}/>
<TextField label={T('تاريخ نهاية الإقامة هجري','Iqama Expiry (H)')} dir="ltr" value={form.w_iqama_expiry_h||''} onChange={v=>setF('w_iqama_expiry_h',v)}/>
<FKDateField label={T('تاريخ الميلاد','Date of Birth')} value={form.w_dob||''} onChange={v=>setF('w_dob',v)}/>
<FKSelect label={T('الوضع القانوني','Legal Status')} value={form.w_legal_status} onChange={v=>setF('w_legal_status',v)} placeholder={'— '+T('اختر','Select')+' —'} options={[{v:'regular',l:T('نظامي','Regular')},{v:'irregular',l:T('مخالف','Irregular')},{v:'runaway',l:T('هارب','Runaway')},{v:'expired_iqama',l:T('إقامة منتهية','Expired Iqama')}]} getKey={o=>o.v} getLabel={o=>o.l}/>
</div>
</ModalSection>)}
]
const pages=[...workerPages,
{title:T('تفاصيل إضافية','Additional Details'),content:(
<ModalSection Icon={FileText} label={T('تفاصيل إضافية','Additional Details')}>
<div style={GRID}>
<YesNo label={T('هل يطلب تعديل مهنة؟','Wants occupation change?')} value={form.wants_occupation_change} onChange={v=>setF('wants_occupation_change',v)}/>
{form.wants_occupation_change?<TextField label={T('المهنة الجديدة','New Occupation')} value={form.new_occupation||''} onChange={v=>setF('new_occupation',v)}/>:null}
<FKDateField label={T('تاريخ نهاية رخصة العمل','Work Permit Expiry')} value={form.wp_expiry||''} onChange={v=>setF('wp_expiry',v)}/>
<YesNo label={T('فترة إشعار؟','Notice Period?')} value={form.has_notice_period} onChange={v=>setF('has_notice_period',v)}/>
<YesNo label={T('موافقة صاحب العمل الحالي؟','Current Employer Consent?')} value={form.employer_consent} onChange={v=>setF('employer_consent',v)}/>
{workerMode==='new'
?<FKSelect label={T('المنشأة الحالية','Current Facility')} value={form.facility_id} onChange={v=>setF('facility_id',v)} placeholder={'— '+T('اختر','Select')+' —'} options={facilities} getKey={x=>x.id} getLabel={x=>x.name_ar}/>
:<InfoRow label={T('المنشأة الحالية','Current Facility')} value={facilities.find(x=>x.id===form.facility_id)?.name_ar||'—'}/>}
</div>
</ModalSection>)},
{title:T('تفاصيل النقل','Transfer Details'),content:(
<ModalSection Icon={ArrowLeftRight} label={T('تفاصيل النقل والرسوم التلقائية','Transfer Details & Auto Fees')}>
<div style={GRID}>
<Segmented label={T('نوع النقل','Transfer Type')} req value={form.transfer_type} onChange={v=>setF('transfer_type',v)} options={[{v:'sponsorship',l:T('نقل كفالة','Sponsorship'),c:FKC.gold},{v:'final_exit',l:T('خروج نهائي','Final Exit'),c:FKC.blue}]}/>
<FKSelect label={T('الحالة','Status')} value={form.status} onChange={v=>setF('status',v)} placeholder={'— '+T('اختر','Select')+' —'} options={[{v:'draft',l:T('مسودة','Draft')},{v:'pending',l:T('معلّقة','Pending')},{v:'approved',l:T('مقبولة','Approved')},{v:'completed',l:T('مكتملة','Done')}]} getKey={o=>o.v} getLabel={o=>o.l}/>
<TextField full label={T('صاحب العمل الجديد','New Employer')} value={form.new_employer_name||''} onChange={v=>setF('new_employer_name',v)}/>
<FKSelect label={T('عدد مرات النقل للعامل','Transfer Count')} hint={T('رسوم النقل:','Fee:')+' '+nm(Number(form.transfer_fee))} value={form.transfer_count} onChange={v=>setF('transfer_count',v)} placeholder={'— '+T('اختر','Select')+' —'} options={[{v:1,l:T('المرة الأولى — 2,000 ر.س','1st — 2,000')},{v:2,l:T('المرة الثانية — 4,000 ر.س','2nd — 4,000')},{v:3,l:T('المرة الثالثة+ — 6,000 ر.س','3rd+ — 6,000')}]} getKey={o=>o.v} getLabel={o=>o.l}/>
<YesNo label={T('هل الإقامة منتهية؟','Iqama Expired?')} value={form.iqama_expired} onChange={v=>setF('iqama_expired',v)}/>
{form.iqama_expired?<FKSelect label={T('كم مرة تأخر بالتجديد؟','Renewal Delay Count')} hint={T('الغرامة:','Fine:')+' '+nm(Number(form.iqama_fine))} value={form.iqama_fine_count} onChange={v=>setF('iqama_fine_count',v)} placeholder={'— '+T('اختر','Select')+' —'} options={[{v:1,l:T('المرة الأولى — 500 ر.س','1st — 500')},{v:2,l:T('المرة الثانية — 1,000 ر.س','2nd — 1,000')}]} getKey={o=>o.v} getLabel={o=>o.l}/>:null}
<FKSelect label={T('عدد أشهر تجديد الإقامة','Iqama Renewal Months')} hint={T('رسوم التجديد:','Renewal:')+' '+nm(Number(form.iqama_cost))} value={form.iqama_renewal_months} onChange={v=>setF('iqama_renewal_months',v)} placeholder={'— '+T('اختر','Select')+' —'} options={[{v:3,l:T('3 أشهر — 163 ر.س','3m — 163')},{v:6,l:T('6 أشهر — 325 ر.س','6m — 325')},{v:12,l:T('سنة — 650 ر.س','12m — 650')},{v:24,l:T('سنتين — 1,300 ر.س','24m — 1,300')}]} getKey={o=>o.v} getLabel={o=>o.l}/>
</div>
</ModalSection>)},
{title:T('التكاليف','Costs'),content:(
<ModalSection Icon={Banknote} label={T('ملخص التكاليف','Cost Summary')}>
<div style={GRID}>
{[['transfer_fee',T('رسوم النقل','Transfer Fee'),1],['iqama_cost',T('تجديد الإقامة','Iqama Renewal'),1],['iqama_fine',T('غرامة التأخير','Delay Fine'),1],['insurance_cost',T('التأمين الطبي','Health Insurance')],['work_permit_cost',T('رخصة العمل','Work Permit')],['occupation_change_cost',T('تغيير المهنة','Occupation Change'),1],['office_fee',T('رسوم المكتب','Office Fee')],['absher_balance',T('رصيد أبشر (خصم)','Absher Balance (deduct)')]].map(([k,l,auto])=><CurrencyField key={k} label={l} hint={auto?T('تلقائي','Auto'):undefined} value={form[k]||''} onChange={v=>setF(k,v)}/>)}
</div>
</ModalSection>)},
{title:T('رسوم إضافية والتواريخ','Extras & Dates'),content:(<>
<ModalSection Icon={Calendar} label={T('رسوم إضافية والتواريخ','Extra Fees & Dates')}>
<div style={GRID}>
<TextField label={T('اسم رسوم إضافية','Extra Fee Name')} value={form.extra_fee_name||''} onChange={v=>setF('extra_fee_name',v)}/>
<CurrencyField label={T('المبلغ','Amount')} value={form.extra_fee_amount||''} onChange={v=>setF('extra_fee_amount',v)}/>
<FKDateField label={T('تاريخ التسديد','Sedd Date')} req value={form.sedd_date||''} onChange={v=>setF('sedd_date',v)}/>
<FKDateField label={T('تاريخ الاستحقاق','Due Date')} value={form.due_date||''} onChange={v=>setF('due_date',v)}/>
</div>
</ModalSection>
<ModalSection Icon={Banknote} label={T('الإجمالي','Totals')}>
<div style={GRID}>
<InfoRow label={T('إجمالي التكلفة','Total Cost')} value={nm(totalCost())} color={FKC.red}/>
<CurrencyField label={T('المطلوب من العميل','Client Charge')} value={form.client_charge||''} onChange={v=>setF('client_charge',v)}/>
<InfoRow label={T('الربح','Profit')} value={nm(profit())} color={profit()>=0?FKC.ok:FKC.red}/>
</div>
</ModalSection></>)},
{title:T('الملخص','Summary'),content:(
<ModalSection Icon={FileText} label={T('ملخص الحسبة','Calculation Summary')}>
<InfoGrid>
<InfoRow label={T('العامل','Worker')} value={selWorker?.name_ar||form.w_name||'—'}/>
<InfoRow label={T('نوع النقل','Type')} value={form.transfer_type==='final_exit'?T('خروج نهائي','Final Exit'):T('نقل كفالة','Sponsorship')}/>
<InfoRow label={T('صاحب العمل الجديد','New Employer')} value={form.new_employer_name||'—'}/>
<InfoRow label={T('الحالة','Status')} value={stLabel[form.status]||form.status}/>
<InfoRow label={T('تاريخ التسديد','Sedd Date')} value={form.sedd_date||'—'} mono/>
<InfoRow label={T('تاريخ الاستحقاق','Due Date')} value={form.due_date||'—'} mono/>
<InfoRow label={T('التكلفة','Cost')} value={nm(totalCost())} color={FKC.red}/>
<InfoRow label={T('المطلوب','Charge')} value={nm(Number(form.client_charge)||0)} color={FKC.gold}/>
<InfoRow label={T('الربح','Profit')} value={nm(profit())} color={profit()>=0?FKC.ok:FKC.red}/>
</InfoGrid>
<div style={{marginTop:14}}>
<TextArea label={T('ملاحظات','Notes')} rows={2} value={form.notes||''} onChange={v=>setF('notes',v)}/>
</div>
</ModalSection>)}
]
return <FKModal open onClose={()=>setPop(false)} width={720}
 title={isEdit?T('تعديل التسعيرة','Edit'):T('حسبة نقل كفالة','New Transfer Calc')} Icon={Calculator}
 variant={isEdit?'edit':'create'}
 onSubmit={save} submitting={saving} submitLabel={T('حفظ','Save')}
 nextLabel={T('التالي','Next')} backLabel={T('السابق','Back')}
 pages={pages}/>
})()}
</div>}


function AppointmentsPage({sb,toast,user,lang,branchId}){
const T=(a,e)=>lang==='ar'?a:e;const[data,setData]=useState([]);const[loading,setLoading]=useState(true);const[pop,setPop]=useState(null);const[saving,setSaving]=useState(false);const[saveErr,setSaveErr]=useState(null);
// Use local-date string (Saudi is GMT+3) so dates don't shift forward/back at UTC boundary.
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const isGM=user?.role?.name_ar==='المدير العام'||user?.role?.name_en==='General Manager';
const scopeBranchId=isGM?branchId:(user?.primary_branch_id||user?.branch_id||null);
const[f,setF]=useState({title:'',type:'client_visit',date:todayISO(),time:'09:00',client_id:'',worker_id:'',assigned_to:'',location:'',notes:'',status:'scheduled'});
const load=useCallback(async()=>{setLoading(true);let q=sb.from('appointments').select('*,clients:client_id(name_ar),workers:worker_id(name_ar),users:assigned_to(name_ar)').is('deleted_at',null).order('date',{ascending:true}).order('time',{ascending:true});if(scopeBranchId)q=q.eq('branch_id',scopeBranchId);const{data:d}=await q;setData(d||[]);setLoading(false)},[sb,scopeBranchId]);
useEffect(()=>{load()},[load]);
const save=async()=>{setSaveErr(null);if(!f.title||!f.date){setSaveErr(T('خطأ: العنوان والتاريخ مطلوبين','Error: Title and date required'));return}
setSaving(true);
const row={...f,created_by:user?.id};delete row.clients;delete row.workers;delete row.users;
if(!row.branch_id&&scopeBranchId)row.branch_id=scopeBranchId;
let err;
if(pop==='new'){err=(await sb.from('appointments').insert(row)).error}
else{err=(await sb.from('appointments').update(row).eq('id',pop)).error}
setSaving(false);
if(err){setSaveErr((lang==='ar'?'خطأ: ':'Error: ')+err.message);return}
toast(T('تم الحفظ','Saved'));setPop(null);load()};
const typeLabels={client_visit:T('زيارة عميل','Client Visit'),passport_office:T('الجوازات','Passports'),insurance:T('التأمينات','Insurance'),jawazat:T('الجوازات','Jawazat'),labor_office:T('مكتب العمل','Labor Office'),gosi:T('التأمينات الاجتماعية','GOSI'),court:T('محكمة','Court'),other:T('أخرى','Other')};
const statusColors={scheduled:C.gold,confirmed:C.blue,completed:C.ok,cancelled:C.red,no_show:'#e67e22'};
return<div style={{fontFamily:"'Cairo',sans-serif",paddingTop:0}}>
{/* ═══ Page header (Kafala-style) ═══ */}
<div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:24,fontWeight:600,color:'var(--tx)',letterSpacing:'-.3px',lineHeight:1.2}}>{T('المواعيد','Appointments')}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>{T('متابعة الزيارات والاجتماعات والمراجعات الحكومية','Track visits, meetings, and government office reviews')}</div>
</div>
<button onClick={()=>{setSaveErr(null);setF({title:'',type:'client_visit',date:todayISO(),time:'09:00',client_id:'',worker_id:'',assigned_to:'',location:'',notes:'',status:'scheduled'});setPop('new')}} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
{T('موعد جديد','New')}
</button>
</div>
{loading?<PageSkeleton variant="list" listRows={5} />:
data.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)',fontSize:13,fontWeight:500}}>{T('لا توجد مواعيد','No appointments')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:14}}>{data.map(a=>{const today=todayISO();const isToday=a.date===today;const isPast=(a.date||'')<today;const sc=statusColors[a.status]||C.gold;
return<div key={a.id} onClick={()=>{setSaveErr(null);setF({...a});setPop(a.id)}} style={{padding:'18px 22px',borderRadius:16,background:'var(--card-grad)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid '+(isToday?'rgba(212,160,23,.25)':'rgba(255,255,255,.08)'),cursor:'pointer',display:'flex',gap:18,alignItems:'center',opacity:isPast&&a.status!=='completed'?.65:1,transition:'.25s cubic-bezier(.4,0,.2,1)',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=sc+'66';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+sc+'33, inset 0 1px 0 rgba(255,255,255,.08)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor=isToday?'rgba(212,160,23,.25)':'rgba(255,255,255,.08)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{textAlign:'center',minWidth:54,padding:'8px 10px',borderRadius:10,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}>
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
{/* ═══ نافذة الموعد — FormKit (صفحتان) ═══ */}
{pop&&<FKModal open onClose={()=>{setSaveErr(null);setPop(null)}} width={520}
 title={pop==='new'?T('موعد جديد','New Appointment'):T('تعديل الموعد','Edit')} Icon={Calendar}
 variant={pop==='new'?'create':'edit'}
 headerExtra={pop!=='new'?<ActionButton Icon={Trash2} color={FKC.red} onClick={async()=>{const{error}=await sb.from('appointments').update({deleted_at:new Date().toISOString()}).eq('id',pop);if(error){toast((lang==='ar'?'خطأ: ':'Error: ')+error.message);return}toast(T('تم الحذف','Deleted'));setPop(null);load()}}>{T('حذف','Delete')}</ActionButton>:null}
 onSubmit={save} submitting={saving} submitLabel={T('حفظ','Save')}
 nextLabel={T('التالي','Next')} backLabel={T('السابق','Back')}
 pages={[
 {title:T('الموعد','Appointment'),valid:!!f.title&&!!f.date,error:saveErr,content:(
 <ModalSection Icon={Calendar} label={T('الموعد','Appointment')}>
 <div style={GRID}>
 <TextField full label={T('العنوان','Title')} req value={f.title||''} onChange={v=>{setSaveErr(null);setF(p=>({...p,title:v}))}}/>
 <FKDateField label={T('التاريخ','Date')} req value={f.date||''} onChange={v=>{setSaveErr(null);setF(p=>({...p,date:v}))}}/>
 <FKTimeField label={T('الوقت','Time')} value={(f.time||'').slice(0,5)} onChange={v=>setF(p=>({...p,time:v}))}/>
 <FKSelect label={T('النوع','Type')} value={f.type||''} onChange={v=>setF(p=>({...p,type:v}))} placeholder={'— '+T('اختر','Select')+' —'} options={Object.entries(typeLabels).map(([k,l])=>({v:k,l}))} getKey={o=>o.v} getLabel={o=>o.l}/>
 <FKSelect label={T('الحالة','Status')} value={f.status||''} onChange={v=>setF(p=>({...p,status:v}))} placeholder={'— '+T('اختر','Select')+' —'} options={[{v:'scheduled',l:T('مجدول','Scheduled')},{v:'confirmed',l:T('مؤكد','Confirmed')},{v:'completed',l:T('مكتمل','Completed')},{v:'cancelled',l:T('ملغي','Cancelled')},{v:'no_show',l:T('لم يحضر','No Show')}]} getKey={o=>o.v} getLabel={o=>o.l}/>
 </div>
 </ModalSection>)},
 {title:T('التفاصيل','Details'),valid:true,error:saveErr,content:(
 <ModalSection Icon={FileText} label={T('التفاصيل','Details')}>
 <div style={GRID}>
 <TextField full label={T('الموقع','Location')} value={f.location||''} onChange={v=>setF(p=>({...p,location:v}))}/>
 <TextArea label={T('ملاحظات','Notes')} rows={3} value={f.notes||''} onChange={v=>setF(p=>({...p,notes:v}))}/>
 </div>
 </ModalSection>)}
 ]}/>}
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
return<div style={{fontFamily:"'Cairo',sans-serif",paddingTop:0}}>
{/* ═══ Page header (Kafala-style) ═══ */}
<div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:24,fontWeight:600,color:'var(--tx)',letterSpacing:'-.3px',lineHeight:1.2}}>{T('المصاريف التشغيلية','Operational Expenses')}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>{T('متابعة المصاريف الشهرية وتصنيفها وتحليل أعلى البنود','Track monthly expenses, categorize them, and analyze top items')}</div>
</div>
<div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0,flexWrap:'wrap'}}>
<input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{height:40,padding:'0 14px',borderRadius:11,border:'1px solid var(--bd)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'var(--tx)',fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:500,outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',direction:'ltr'}}/>
<button onClick={()=>exportToExcel(data,[['date',T('التاريخ','Date')],['category',T('التصنيف','Category')],['amount',T('المبلغ','Amount')],['description',T('الوصف','Description')],['vendor_name',T('المورد','Vendor')]],'expenses_'+month)} style={{height:40,padding:'0 14px',borderRadius:11,border:'1px solid var(--bd)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'rgba(255,255,255,.78)',fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:500,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}>Excel ↓</button>
<button onClick={()=>{setF({amount:'',category:'other',description:'',date:new Date().toISOString().slice(0,10),payment_method:'cash',vendor_name:'',is_recurring:false});setPop('new')}} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:"'Cairo',sans-serif",fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
{T('مصروف','New')}
</button>
</div></div>
{/* ═══ Stats cards (Kafala glass card with embedded pills) ═══ */}
{(()=>{const catTotals={};data.forEach(r=>{catTotals[r.category]=(catTotals[r.category]||0)+Number(r.amount||0)});const topCat=Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];const catColors={rent:C.gold,salary:C.blue,gov_fee:C.red,transport:'#9b59b6',utilities:'#e67e22',maintenance:'#1abc9c',other:'#888'}
const stats=[{l:T('إجمالي الشهر','Month Total'),v:Number(total).toLocaleString(),c:C.red,sub:T('ر.س','SAR')},{l:T('عدد المصاريف','Count'),v:data.length,c:C.gold},{l:T('الأعلى صرفاً','Top Category'),v:topCat?(cats[topCat[0]]||topCat[0]):'—',c:C.blue,sub:topCat?Number(topCat[1]).toLocaleString():null},{l:T('المتوسط','Average'),v:data.length>0?Number(Math.round(total/data.length)).toLocaleString():'0',c:'rgba(255,255,255,.85)'}]
return<>
<div style={{background:'var(--card-grad)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:'10px 12px',marginBottom:14,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
{stats.map((s,i)=><div key={i} style={{padding:'7px 12px',borderRadius:10,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,minWidth:0}}>
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
{loading?<PageSkeleton columns={5} rows={8} />:data.length===0?
<div style={{textAlign:'center',padding:'60px 20px',background:'var(--card-grad)',borderRadius:16,border:'1px solid rgba(255,255,255,.08)',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{fontSize:14,fontWeight:600,color:'var(--tx3)',letterSpacing:'.15px'}}>{T('لم تُسجّل مصاريف لشهر '+new Date(month+'-01').toLocaleDateString('ar-SA',{year:'numeric',month:'long'}),'No expenses for this month')}</div>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx5)',marginTop:8}}>{T('أضف أول مصروف باستخدام الزر أعلاه','Add your first expense using the button above')}</div>
</div>:
<div style={{background:'var(--card-grad)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontFamily:"'Cairo',sans-serif",fontSize:12}}>
<thead><tr style={{background:'var(--bd2)',borderBottom:'1px solid var(--bd)'}}>{[T('التاريخ','Date'),T('التصنيف','Category'),T('الوصف','Description'),T('المورد','Vendor'),T('المبلغ','Amount')].map(h=><th key={h} style={{padding:'12px 14px',fontSize:11,fontWeight:600,color:'var(--tx3)',textAlign:'right',letterSpacing:'.3px'}}>{h}</th>)}</tr></thead>
<tbody>{data.map(r=>{const cc={rent:C.gold,salary:C.blue,gov_fee:C.red,transport:'#9b59b6',utilities:'#e67e22',other:'#888'}[r.category]||'#888';return<tr key={r.id} onClick={()=>{setF({...r});setPop(r.id)}} style={{cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,.04)',transition:'.18s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(212,160,23,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><td style={{padding:'12px 14px',fontSize:12,fontWeight:500,color:'var(--tx4)'}}>{r.date?new Date(r.date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}):'—'}</td><td style={{padding:'12px 14px'}}><span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:cc+'15',color:cc,display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:cc}}/>{cats[r.category]||r.category}</span></td><td style={{padding:'12px 14px',fontSize:12,fontWeight:500,color:'var(--tx2)'}}>{r.description||'—'}</td><td style={{padding:'12px 14px',fontSize:12,fontWeight:500,color:'var(--tx4)'}}>{r.vendor_name||'—'}</td><td style={{padding:'12px 14px',fontSize:14,fontWeight:600,color:C.red,direction:'ltr',textAlign:'left',fontFamily:"'JetBrains Mono',monospace"}}>{Number(r.amount).toLocaleString()}</td></tr>})}</tbody>
</table></div>}
{/* ═══ نافذة المصروف — FormKit ═══ */}
{pop&&<FKModal open onClose={()=>setPop(null)} width={520} height="auto"
 title={pop==='new'?T('مصروف جديد','New Expense'):T('تعديل','Edit')} Icon={Wallet}
 variant={pop==='new'?'create':'edit'}
 footer={<ActionButton onClick={save}>{T('حفظ','Save')}</ActionButton>}>
<ModalSection Icon={Wallet} label={T('المصروف','Expense')}>
<div style={GRID}>
<CurrencyField label={T('المبلغ','Amount')} req value={f.amount||''} onChange={v=>setF(p=>({...p,amount:v}))}/>
<FKSelect label={T('التصنيف','Category')} value={f.category||''} onChange={v=>setF(p=>({...p,category:v}))} placeholder={'— '+T('اختر','Select')+' —'} options={Object.entries(cats).map(([k,l])=>({v:k,l}))} getKey={o=>o.v} getLabel={o=>o.l}/>
<TextField full label={T('الوصف','Description')} value={f.description||''} onChange={v=>setF(p=>({...p,description:v}))}/>
<FKDateField label={T('التاريخ','Date')} value={f.date||''} onChange={v=>setF(p=>({...p,date:v}))}/>
<TextField label={T('المورد','Vendor')} value={f.vendor_name||''} onChange={v=>setF(p=>({...p,vendor_name:v}))}/>
</div>
</ModalSection>
</FKModal>}
</div>}

function Logo({size=60,style:sx}){const s=size*.6;const fs=Math.max(5,size*.08);return<div style={{width:size,height:size,borderRadius:'50%',background:'radial-gradient(circle at 50% 44%,var(--sf),var(--bg) 72%)',border:'3px solid rgba(212,160,23,.55)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxShadow:'var(--shadow-md),0 0 0 1px rgba(212,160,23,.12)',margin:'0 auto',...sx}}><svg width={s} height={s*.93} viewBox="0 0 120 112" fill="none"><defs><linearGradient id="vGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E2B53A"/><stop offset="0.5" stopColor="#C8930F"/><stop offset="1" stopColor="#8C6410"/></linearGradient></defs><path d="M32.0,18.0 L32.5,19.6 L32.7,21.3 L32.9,23.1 L33.0,24.8 L33.2,26.5 L33.7,28.2 L34.5,29.6 L35.7,31.0 L37.3,32.2 L39.0,33.3 L40.9,34.4 L42.6,35.5 L44.1,36.7 L45.1,38.1 L45.5,39.8 L45.4,41.6 L44.7,43.7 L43.7,45.9 L42.5,48.2 L41.3,50.4 L40.5,52.5 L40.1,54.5 L40.4,56.2 L41.4,57.6 L42.9,58.8 L45.0,59.8 L47.3,60.7 L49.8,61.5 L52.0,62.5 L53.9,63.5 L55.3,64.8 L56.0,66.3 L56.3,68.0 L56.0,69.9 L55.5,71.9 L54.9,74.0 L54.3,76.0 L54.0,77.9 L54.0,79.7 L54.4,81.4 L55.1,82.9 L56.1,84.3 L57.2,85.7 L58.3,87.1 L59.3,88.5 L60.0,90.0" stroke="url(#vGold)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M88.0,18.0 L87.5,19.6 L87.3,21.3 L87.1,23.1 L87.0,24.8 L86.8,26.5 L86.3,28.2 L85.5,29.6 L84.3,31.0 L82.7,32.2 L81.0,33.3 L79.1,34.4 L77.4,35.5 L75.9,36.7 L74.9,38.1 L74.5,39.8 L74.6,41.6 L75.3,43.7 L76.3,45.9 L77.5,48.2 L78.7,50.4 L79.5,52.5 L79.9,54.5 L79.6,56.2 L78.6,57.6 L77.1,58.8 L75.0,59.8 L72.7,60.7 L70.2,61.5 L68.0,62.5 L66.1,63.5 L64.7,64.8 L64.0,66.3 L63.7,68.0 L64.0,69.9 L64.5,71.9 L65.1,74.0 L65.7,76.0 L66.0,77.9 L66.0,79.7 L65.6,81.4 L64.9,82.9 L63.9,84.3 L62.8,85.7 L61.7,87.1 L60.7,88.5 L60.0,90.0" stroke="url(#vGold)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg></div>}

function BrandPanel({lang,L}){return<div style={{flex:1,position:'relative',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:'radial-gradient(ellipse 110% 90% at 50% 45%,var(--sf),var(--bg) 70%)'}}><div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'linear-gradient(var(--bd2) 1px,transparent 1px),linear-gradient(90deg,var(--bd2) 1px,transparent 1px)',backgroundSize:'44px 44px'}}/><div style={{position:'absolute',top:0,bottom:0,width:1,[lang==='ar'?'right':'left']:0,background:'linear-gradient(180deg,transparent,rgba(212,160,23,.2) 20%,rgba(212,160,23,.45) 50%,rgba(212,160,23,.2) 80%,transparent)'}}/><div style={{position:'relative',zIndex:2,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'40px 48px'}}><div style={{position:'relative',width:172,height:172,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:30}}><Logo size={150}/></div><p style={{fontSize:15,fontWeight:400,color:'var(--tx3)',lineHeight:2,fontFamily:"'Reem Kufi','Cairo',sans-serif"}}><span style={{color:'var(--tx)',fontWeight:700,letterSpacing:'.3px'}}>{L.tagline}</span><br/>{L.tagline2}</p></div></div>}

function LangBtn({L,switchLang,abs}){const isToEn=L.otherLang==='English';const s=abs?{position:'absolute',top:22,[isToEn?'left':'right']:22,zIndex:10}:{};return<><style>{`.lang-btn svg text{fill:var(--tx2);transition:fill .2s}.lang-btn:hover svg text{fill:#D4A017}`}</style><div className="lang-btn" onClick={switchLang} title={isToEn?'English':'العربية'} style={{...s,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontFamily:F,padding:4}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><text x="12" y="18" textAnchor="middle" fontSize="18" fontFamily="Cairo, Tajawal, sans-serif" fontWeight="700">{isToEn?'E':'ع'}</text></svg></div></>}

function FField({label,value,set,ph,ltr,type,small}){return<div style={{flex:1}}><div style={{fontSize:'clamp(10px,1.5vw,11px)',fontWeight:700,color:'var(--tx3)',marginBottom:'clamp(3px,.5vw,5px)'}}>{label}</div><input value={value} onChange={e=>set(e.target.value)} type={type||'text'} placeholder={ph||''} style={{width:'100%',height:'clamp(38px,5vw,42px)',background:'var(--inputBg)',border:'1.5px solid var(--inputBd)',borderRadius:10,padding:'0 13px',fontFamily:F,fontSize:small?'clamp(9px,1.2vw,10px)':'clamp(11px,1.6vw,12px)',fontWeight:600,color:'var(--tx)',outline:'none',direction:ltr?'ltr':'rtl',textAlign:ltr?'left':'right'}}/></div>}

function GoldBar(){return<div style={{position:'absolute',top:0,left:0,right:0,height:3,borderRadius:'20px 20px 0 0',background:'linear-gradient(90deg,transparent,var(--accent) 30%,var(--accent-2) 50%,var(--accent) 70%,transparent)',zIndex:1}}/>}

function Badge({v}){const m={active:C.ok,paid:C.ok,completed:C.ok,issue:C.red,cancelled:C.red,suspended:'#e67e22',overdue:C.red,draft:'#999',pending:C.gold,in_progress:C.blue,partial:C.gold,unpaid:C.red,red:C.red,yellow:'#f1c40f',green_low:C.ok,green_mid:C.ok,green_high:C.ok,platinum:C.gold,urgent:C.red,high:'#e67e22',normal:C.blue,low:'#999'};const c=m[v]||'#999';return<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:c+'15',color:c,display:'inline-flex',alignItems:'center',gap:3}}><span style={{width:4,height:4,borderRadius:'50%',background:c}}/>{v||'\u2014'}</span>}

function Css(){return<style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Reem+Kufi:wght@400;500;600;700&display=swap');:root,html[data-theme=dark]{--bg:#0E0E0E;--sf:#2A2A2A;--sb:#1F1F1F;--hd:#222222;--card-bg:#2A2A2A;--card-grad:var(--card-grad);--card-grad2:var(--card-grad2);--fk-input-bg:rgba(212,160,23,.1);--fk-line:rgba(255,255,255,.06);--modal-bg:#1A1A1A;--modal-portal-bg:#0f0f0f;--modal-input-bg:rgba(212,160,23,.1);--search-bg:rgba(212,160,23,.1);--choice-bg:rgba(212,160,23,.1);--tx:rgba(255,255,255,.92);--tx2:rgba(255,255,255,.82);--tx3:rgba(255,255,255,.55);--tx4:rgba(255,255,255,.4);--tx5:rgba(255,255,255,.6);--tx6:rgba(255,255,255,.15);--sbtx:rgba(255,255,255,.88);--sbtx2:rgba(255,255,255,.5);--sbtx3:rgba(255,255,255,.3);--hdtx:rgba(255,255,255,.9);--hdtx2:rgba(255,255,255,.42);--bd:rgba(255,255,255,.07);--bd2:rgba(255,255,255,.04);--inputBg:rgba(212,160,23,.1);--inputBd:rgba(212,160,23,.3);--hoverBg:rgba(255,255,255,.04);--overlayBg:rgba(8,8,8,.82);--shadowClr:rgba(0,0,0,.5);--afBg:#1C1C1C;--clk1:#2D2D2D;--clk2:#252525;--clk3:#1F1F1F;--clk-hand:rgba(255,255,255,.92);--clk-hand2:rgba(255,255,255,.75);--clk-tick:rgba(255,255,255,.35);--hd-ico-hv:#F0C947;--hd-ico-hv-bg:rgba(212,160,23,.14);--clk-bd:rgba(212,160,23,.4);--accent:#D4A017;--accent-2:#dcc06e;--accent-deep:#9C6F12;--accent-strong:#F0C947;--accent-soft:rgba(212,160,23,.12);--accent-bg:rgba(212,160,23,.14);--accent-bd:rgba(212,160,23,.4);--shadow-sm:0 1px 2px rgba(0,0,0,.28);--shadow-md:0 4px 14px rgba(0,0,0,.34);--shadow-lg:0 14px 34px rgba(0,0,0,.42);--safe-b:env(safe-area-inset-bottom,0px)}html[data-theme=light]{--bg:#f2ece0;--sf:#faf8f3;--sb:#e2dac6;--hd:#e2dac6;--card-bg:#faf8f3;--card-grad:linear-gradient(160deg,#ffffff 0%,#faf7f0 50%,#f3efe6 100%);--card-grad2:linear-gradient(180deg,#ffffff 0%,#f3f0e8 100%);--modal-bg:#faf8f3;--modal-portal-bg:#ffffff;--modal-input-bg:rgba(212,160,23,.06);--search-bg:rgba(212,160,23,.06);--choice-bg:rgba(212,160,23,.06);--tx:rgba(40,32,18,.9);--tx2:rgba(50,42,25,.74);--tx3:rgba(90,75,50,.56);--tx4:rgba(110,95,65,.46);--tx5:rgba(88,72,46,.72);--tx6:rgba(150,130,95,.16);--sbtx:rgba(34,27,14,.92);--sbtx2:rgba(48,40,22,.62);--sbtx3:rgba(60,50,28,.48);--hdtx:rgba(34,27,14,.92);--hdtx2:rgba(60,50,28,.58);--bd:rgba(120,100,60,.16);--bd2:rgba(120,100,60,.08);--inputBg:rgba(212,160,23,.06);--inputBd:rgba(212,160,23,.28);--fk-input-bg:rgba(212,160,23,.06);--fk-line:rgba(120,100,60,.18);--hoverBg:rgba(0,0,0,.035);--overlayBg:rgba(240,235,225,.9);--shadowClr:rgba(80,60,20,.18);--afBg:#faf8f3;--clk1:#e6dcc2;--clk2:#dccfae;--clk3:#cdbd95;--clk-hand:rgba(35,28,14,.9);--clk-hand2:rgba(55,45,24,.66);--clk-tick:rgba(90,72,40,.42);--hd-ico-hv:#9c7515;--hd-ico-hv-bg:rgba(150,116,26,.12);--clk-bd:rgba(140,104,18,.85);--accent:#D4A017;--accent-2:#c89a32;--accent-deep:#9C6F12;--accent-strong:#b8932c;--accent-soft:rgba(212,160,23,.12);--accent-bg:rgba(212,160,23,.13);--accent-bd:rgba(212,160,23,.32);--shadow-sm:0 1px 2px rgba(90,70,30,.08);--shadow-md:0 4px 14px rgba(90,70,30,.10);--shadow-lg:0 14px 34px rgba(90,70,30,.13)}html,body,#root{overflow:hidden;height:100%;width:100%;max-width:100vw;font-size:14px;line-height:1.65;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}*{margin:0;padding:0;box-sizing:border-box;transition:background-color .3s,border-color .25s,color .25s}*::-webkit-scrollbar{width:4px;height:4px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:var(--tx6);border-radius:4px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes breathe{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.04)}}@keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}input:focus,select:focus,textarea:focus{box-shadow:none!important;outline:none!important}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;appearance:none;margin:0}input[type=number]{-moz-appearance:textfield;appearance:textfield}.topbar-search-box input:focus{border-color:transparent!important;box-shadow:none!important}input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,input:-webkit-autofill:active{-webkit-box-shadow:0 0 0 1000px #2C2C2C inset!important;box-shadow:0 0 0 1000px #2C2C2C inset!important;-webkit-text-fill-color:rgba(255,255,255,.92)!important;caret-color:rgba(255,255,255,.92)!important;transition:background-color 9999s ease-in-out 0s!important}.login-form input:-webkit-autofill,.login-form input:-webkit-autofill:hover,.login-form input:-webkit-autofill:focus,.login-form input:-webkit-autofill:active{-webkit-box-shadow:0 0 0 1000px var(--sf) inset!important;box-shadow:0 0 0 1000px var(--sf) inset!important;-webkit-text-fill-color:var(--tx)!important;caret-color:var(--tx)!important}button:hover:not(:disabled){filter:brightness(1.06)}button:active:not(:disabled){filter:brightness(.9)}.btn-primary-modal{background:linear-gradient(160deg,#23201a,#141210);border:1px solid rgba(212,160,23,.5);color:#F0CB6A;box-shadow:0 5px 16px rgba(0,0,0,.26),inset 0 1px 0 rgba(212,160,23,.18)}.btn-primary-modal:hover{background:linear-gradient(160deg,#2c2820,#1a1714)}select{background-color:var(--sf)!important;color:var(--tx)!important}select option{background:var(--sf);color:var(--tx)}.mob-bottom-nav{display:none}.mob-hamburger{display:none!important}.mob-overlay{display:none!important}.dash-side{transition:transform .35s cubic-bezier(.32,.72,.0,1)}@media(max-width:900px){.login-brand,.setup-brand{display:none!important}.login-wrap,.setup-wrap{flex-direction:column!important}.login-form,.setup-form{width:100%!important;max-width:100%!important;min-height:100vh!important;box-shadow:none!important}}@media(max-width:768px){.dash-side{position:fixed!important;top:0!important;bottom:0!important;width:280px!important;max-height:100vh!important;height:100vh!important;z-index:200!important;transform:translateX(100%)!important;box-shadow:-8px 0 40px rgba(0,0,0,.5)!important;border:none!important;overflow-y:auto!important;flex-direction:column!important;}[dir=rtl] .dash-side{right:0!important;left:auto!important;transform:translateX(100%)!important}[dir=ltr] .dash-side{left:0!important;right:auto!important;transform:translateX(-100%)!important}.dash-side.side-open{transform:translateX(0)!important}.mob-overlay{display:block!important;animation:fadeIn .2s ease}.mob-hamburger{display:flex!important}.dash-header{padding:0 12px!important;gap:8px!important}.topbar-datetime{display:none!important}.topbar-weekly{display:none!important}.topbar-weekly span{display:none!important}.topbar-search-box{min-width:120px!important}.topbar-search-box input{font-size:11px!important}.breadcrumb-area span{font-size:13px!important}.breadcrumb-area span:not(:last-child){display:none!important}.dash-content{padding:16px 14px 80px!important}.mob-bottom-nav{display:flex!important;position:fixed!important;bottom:0!important;left:0!important;right:0!important;height:calc(64px + var(--safe-b))!important;padding-bottom:var(--safe-b)!important;background:var(--sb)!important;border-top:1px solid rgba(212,160,23,.15)!important;z-index:198!important;align-items:flex-start!important;padding-top:6px!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important;box-shadow:0 -4px 20px rgba(0,0,0,.3)!important;}input,select,textarea{font-size:16px!important}}@media(max-width:480px){.dash-side{width:85vw!important;max-width:300px!important}.dash-header{height:48px!important;padding:0 10px!important;gap:6px!important}.dash-content{padding:12px 10px 85px!important}.breadcrumb-area span{font-size:14px!important;font-weight:800!important}.topbar-search-box{min-width:34px!important;width:34px!important;padding:0!important;justify-content:center!important;overflow:hidden!important}.topbar-search-box input{width:0!important;padding:0!important;opacity:0!important}.topbar-search-box:focus-within{width:180px!important;min-width:180px!important;padding:0 10px!important}.topbar-search-box:focus-within input{width:100%!important;opacity:1!important}.mob-bottom-nav{height:calc(64px + var(--safe-b))!important}table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}}@media(max-width:360px){.dash-header{gap:4px!important}.dash-content{padding:8px 6px 85px!important}.mob-bottom-nav div span{font-size:9px!important}}@supports(padding:max(0px)){.mob-bottom-nav{padding-bottom:max(var(--safe-b),8px)!important}.dash-content{padding-bottom:max(calc(16px + var(--safe-b)),16px)!important}}@media(max-height:500px) and (max-width:900px){.mob-bottom-nav{height:44px!important;padding-top:2px!important}.mob-bottom-nav svg{width:16px!important;height:16px!important}.mob-bottom-nav span{display:none!important}.dash-content{padding-bottom:55px!important}.dash-side{width:240px!important}}.mob-bottom-nav div>div[style]{transition:width .2s ease!important}.pwa-standalone .dash-header{padding-top:env(safe-area-inset-top)!important}.pwa-standalone .mob-bottom-nav{padding-bottom:max(env(safe-area-inset-bottom),12px)!important;height:calc(70px + env(safe-area-inset-bottom))!important}.pwa-standalone .dash-side{padding-top:env(safe-area-inset-top)!important}.pwa-standalone .login-wrap,.pwa-standalone .setup-wrap{padding-top:env(safe-area-inset-top)!important}.install-banner{animation:slideUp .4s cubic-bezier(.4,0,.2,1)}@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}.mob-bottom-nav div{transition:transform .15s ease,opacity .15s ease!important}.mob-bottom-nav div:active{transform:scale(.9)!important;opacity:.7!important}@media(max-width:768px){.dash-header{backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important}.dash-content{scroll-behavior:smooth!important;-webkit-overflow-scrolling:touch!important}}@media print{.dash-side,.dash-header,.mob-bottom-nav{display:none!important}.dash-content{padding:16px!important}body{padding:16px}}"}</style>}

const finS={width:'100%',height:42,background:'rgba(212,160,23,.06)',border:'1px solid rgba(212,160,23,.25)',borderRadius:9,padding:'0 44px',fontFamily:F,fontSize:14,fontWeight:600,color:'var(--tx)',outline:'none',direction:'ltr',textAlign:'center',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(120,90,30,.06)',transition:'.2s'}
const goldS={width:'100%',height:48,background:'linear-gradient(160deg,#23201a,#141210)',border:'1px solid rgba(212,160,23,.5)',borderRadius:12,fontFamily:F,fontSize:16,fontWeight:700,color:'#F0CB6A',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,boxShadow:'0 6px 18px rgba(0,0,0,.28), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s'}
const gBtn={height:34,padding:'0 16px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--accent-soft)',color:'var(--accent)',fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}
const tBtn={width:28,height:28,borderRadius:6,border:'1px solid var(--accent-soft)',background:'transparent',display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:'pointer',marginLeft:4,color:'var(--tx4)',fontFamily:F,fontSize:10}
const lInp={width:'100%',padding:'0 10px',border:'1px solid rgba(212,160,23,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:500,color:'var(--tx)',background:'rgba(255,255,255,.06)',outline:'none',textAlign:'right'}
const num=v=>Number(v||0).toLocaleString('en-US')

function IInp({l,v,s,d,t}){return<div><div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>{l}</div><input value={v} onChange={e=>s(e.target.value)} type={t||'text'} style={{width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.13)',borderRadius:10,fontFamily:"'Cairo',sans-serif",fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',direction:d?'ltr':'rtl',textAlign:d?'left':'right',background:'rgba(255,255,255,.06)'}}/></div>}
