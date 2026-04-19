# Jisr Muqeem Bot

بوت يسجّل دخول مقيم تلقائياً كل ~50 دقيقة، يأخذ OTP من جدول `otp_messages` في Jisr، ينشر الجلسة الطازجة إلى Supabase. الواجهة (Jisr) تقرأ الجلسة وتستخدمها مباشرة.

## التشغيل المحلي (على جهازك)

```bash
cd bot
cp .env.example .env       # عدّل MUQEEM_PASSWORD لو احتجت
npm install                # ~30s
npm start                  # يشتغل بشكل خفي (headless)
# أو
npm run start:visible      # يفتح نافذة Chromium للمراقبة
```

البوت يطبع logs في الـ console:
```
[2026-04-19T05:30:00Z] → Navigating to muqeem.sa/#/login
[2026-04-19T05:30:08Z] → Filling credentials
[2026-04-19T05:30:11Z] → Clicking login
[2026-04-19T05:30:14Z] → Waiting for OTP input
[2026-04-19T05:30:18Z] → Polling Supabase for OTP (90s window)
[2026-04-19T05:30:36Z] → Got OTP: 390901
[2026-04-19T05:30:42Z] → Pushing session to Supabase
[2026-04-19T05:30:42Z] ✓ Session active until 19/04/2026, 06:31:00
```

## التشغيل على VPS (للإنتاج)

```bash
ssh user@your-vps
cd /opt && git clone <your-jisr-repo> jisr && cd jisr/bot
cp .env.example .env && nano .env       # ضع كلمة المرور
npm install
# تشغيل دائم عبر pm2:
sudo npm install -g pm2
pm2 start muqeem-bot.mjs --name muqeem-bot
pm2 save && pm2 startup                 # auto-start at boot
```

**نصائح VPS:**
- استخدم سيرفر سعودي (Hostinger Saudi, OVH KSA, Aramco IT) لتقليل احتمال كشف reCAPTCHA
- 1 vCPU + 1GB RAM كافي تماماً
- Chromium يحتاج: `apt-get install -y libnss3 libxss1 libasound2 libgbm1 libgtk-3-0 libxcomposite1 libxdamage1`

## كيف يشتغل

```
[loop كل 50 دقيقة]
  ├─ Playwright + Chrome stealth
  ├─ يفتح muqeem.sa/#/login
  ├─ يملأ اسم المستخدم + كلمة المرور
  ├─ يضغط دخول (Google reCAPTCHA يمر تلقائياً مع stealth plugin غالباً)
  ├─ ينتظر صفحة OTP
  ├─ كل 3 ثواني: يستعلم Supabase RPC `get_latest_muqeem_otp`
  ├─ يجد OTP خلال ~30s (مقيم يرسل SMS فوراً)
  ├─ يملأ OTP + يضغط تحقق
  ├─ ينتقل لصفحة الاستعلام
  ├─ يلتقط Authorization header من أول طلب API
  ├─ ينشر الجلسة في جدول muqeem_sessions
  └─ يقفل المتصفح
```

الفرونت في Jisr يقرأ من نفس الجدول كل 30 ثانية → الجلسة دائماً طازجة.

## الإعداد المطلوب من Jisr

- ✅ جدول `muqeem_sessions` (موجود)
- ✅ RPC `get_latest_muqeem_otp` (موجود)
- ✅ جدول `otp_messages` يستقبل رسائل MOI.GOV.SA (موجود — 2329 رسالة)

كل شي جاهز من جهة Jisr. فقط شغّل البوت.

## استكشاف الأخطاء

| الخطأ | الحل |
|---|---|
| `OTP did not arrive in 90s` | تأكد إن SMS-to-Supabase pipeline شغّال (افحص جدول `otp_messages`) |
| `Could not locate username field` | مقيم غيّر بنية صفحة الدخول — أعطني صورة من DevTools |
| `Did not capture JWT` | الدخول فشل (reCAPTCHA blocked or wrong creds). جرّب `npm run start:visible` لرؤية ما يحصل |
| `pm2: command not found` | `sudo npm install -g pm2` |
| Chromium ما يطلع على VPS | ثبّت dependencies: `apt-get install -y libnss3 libxss1 libasound2 libgbm1 libgtk-3-0` |

## التكلفة

- **محلياً (جهازك)**: مجاناً، يكفي تشغيل Node.js
- **VPS سعودي**: $5–10/شهر (Hostinger/OVH/Contabo)
- **VPS أوروبا**: $3–5/شهر (Hetzner/Vultr) — قد يكتشفه reCAPTCHA أكثر

## الأمان

- كلمة السر فقط في `.env` — لا ترفعها للـ Git (`.env` مدرجة في `.gitignore`)
- الجلسة (JWT) تُحفظ في Supabase تحت RLS — لا تظهر للمستخدمين العاديين
- البوت لا يخزّن كلمة السر في أي مكان آخر
