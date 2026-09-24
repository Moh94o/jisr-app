import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'

// عميل واحد لكل صفحة — والمرجع على `globalThis` لا على متغيّر الوحدة:
// عند إعادة تحميل الوحدة (HMR في التطوير، أو نسخة ثانية من الحزمة) يُنشأ عميل
// ثانٍ بنفس مفتاح التخزين، فيصير مؤقّتا تجديدٍ للتوكن يتسابقان على توكن تحديث
// واحد. من يخسر السباق يتلقّى «Already Used» فيُخرج supabase-js الجلسة ويُكمل
// بمفتاح anon بصمت: الشاشة تبقى كما هي وكل حفظ يرجع 401.
const KEY = '__jisr_sb_client__'

export function getSupabase() {
  if (!globalThis[KEY]) {
    globalThis[KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return globalThis[KEY]
}
