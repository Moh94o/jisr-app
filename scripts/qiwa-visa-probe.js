/* فاحص تأشيرات قوى — للقراءة فقط، لا يكتب أي شيء في قاعدة البيانات.
   يُشغَّل على المنشأة النشطة حالياً في قوى، ويطرق كل واجهات التأشيرات
   ويعرض ماذا رجع من كلٍّ منها (عدد/رمز خطأ)، ليُعرف أين تضيع التأشيرات.
   شغّله من نطاق فيه وصول لـ api.qiwa.sa (dashboard.qiwa.sa أو visa.qiwa.sa). */
(async () => {
  const A = 'https://api.qiwa.sa', IND = 'https://indicators-api.qiwa.sa';
  const log = [];
  let box = document.getElementById('_jisr_visa_probe');
  if (!box) {
    box = document.createElement('div');
    box.id = '_jisr_visa_probe';
    box.style.cssText = 'position:fixed;top:14px;left:14px;width:520px;max-height:82vh;overflow:auto;background:#0f1115;color:#e7e3d8;padding:14px 16px;border-radius:12px;z-index:2147483647;font:13px/1.7 Tahoma,sans-serif;direction:rtl;text-align:right;box-shadow:0 10px 40px rgba(0,0,0,.6);border:1px solid rgba(176,125,0,.5);white-space:pre-wrap';
    document.body.appendChild(box);
  }
  const P = (s) => { log.push(s); box.textContent = log.join('\n'); box.scrollTop = box.scrollHeight; };
  const get = async (url) => {
    try {
      const r = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json, text/plain, */*' } });
      const t = await r.text();
      let d = null;
      try { d = JSON.parse(t) } catch (e) { d = null }
      return { ok: r.ok, status: r.status, data: d, body: t.slice(0, 200) };
    } catch (e) {
      return { ok: false, status: 'CORS/شبكة', err: String((e && e.message) || e) };
    }
  };
  const mark = (r) => r.ok ? '✅' : ('❌ ' + r.status + (r.err ? ' ' + r.err : ''));
  const out = { at: new Date().toISOString(), origin: location.origin };

  if (!location.hostname.endsWith('qiwa.sa')) { P('افتح بوابة قوى أولاً'); return }
  P('— فاحص تأشيرات قوى (قراءة فقط) —');
  P('الأصل: ' + location.origin);

  /* 1) المنشأة النشطة */
  const ctx = await get(A + '/context/company');
  const cd = ctx.data && ctx.data.data;
  const at = (cd && cd.attributes) || {};
  out.company = {
    id: cd && cd.id,
    name: at['company-name-ar'] || at['company-name'],
    labor_office: at['company-labor-office-id'],
    seq: at['company-sequence-number'],
    unified: at['company-unified-number-id'],
  };
  P('');
  P('[1] المنشأة النشطة ' + mark(ctx));
  P('    id=' + out.company.id + ' · ' + (out.company.name || '') + ' · موحّد=' + (out.company.unified || '-'));
  if (!cd) { P(''); P('⛔ لا توجد منشأة نشطة — ادخل منشأة في قوى ثم أعد التشغيل.'); return }

  /* 2) رقم الكيان (يحتاجه عدّاد الحالات) */
  const cr = await get(IND + '/api/v1/criteria/primary');
  const entityNo = cr.data && cr.data.nitaqat && cr.data.nitaqat.entity_number;
  out.entity_number = entityNo || null;
  P('');
  P('[2] criteria/primary ' + mark(cr) + ' · entity_number=' + (entityNo || '—'));

  /* 3) عدّادات حالات التأشيرات — نجرّب كل أنواع التأشيرة */
  P('');
  P('[3] عدّادات الحالات (visa-statuses)');
  out.visa_statuses = {};
  if (entityNo) {
    for (const t of ['1', '2', '3', '']) {
      const u = A + '/visa-proxy/v3/visa-statuses/' + encodeURIComponent(entityNo) + (t ? '?visa_type_id=' + t : '');
      const r = await get(u);
      const arr = (r.data && r.data.visa_statuses) || [];
      const sum = arr.reduce((s, x) => s + (Number(x.count) || 0), 0);
      out.visa_statuses['type_' + (t || 'none')] = { status: r.status, approved: r.data && r.data.approved_visas, sum: sum, raw: r.data };
      P('    visa_type_id=' + (t || '—') + ' ' + mark(r) + ' · مجموع العدادات=' + sum + ' · approved=' + ((r.data && r.data.approved_visas) != null ? r.data.approved_visas : '—'));
    }
  } else {
    P('    تخطّي — لا يوجد entity_number');
  }

  /* 4) الأرصدة والأهلية */
  const bal = await get(A + '/visa-proxy/v3/balances');
  const absher = await get(A + '/visa-proxy/v3/absher-balance');
  const elig = await get(A + '/visa-proxy/v3/work-visa-eligibility');
  const exp = await get(A + '/visa-proxy/v3/expansion-work-visa-balance');
  out.balances = bal.data; out.absher = absher.data; out.eligibility = elig.data; out.expansion = exp.data;
  const w = (bal.data && bal.data.work_visa) || {};
  P('');
  P('[4] balances ' + mark(bal) + ' · عمل: مسموح=' + (w.allowed_quota != null ? w.allowed_quota : '—') + ' غير مستخدم=' + (w.unused_visas != null ? w.unused_visas : '—'));
  P('    absher ' + mark(absher) + ' · eligibility ' + mark(elig) + ' · expansion ' + mark(exp));

  /* 5) طلبات التأشيرات — الافتراضي ثم كل حالة على حدة، مع كل الصفحات */
  const base = A + '/visa-proxy/v3/visa-requests?sort_by=desc&per=1000';
  const STATUSES = ['', 'accepted', 'rejected', 'pending', 'closed', 'cancelled', 'canceled', 'new', 'in_progress', 'approved', 'expired'];
  const byId = new Map();
  out.requests_probe = {};
  P('');
  P('[5] طلبات التأشيرات (visa-requests)');
  for (const s of STATUSES) {
    const q = s ? '&q%5Bstatus%5D%5Beq%5D=' + s : '';
    const r = await get(base + '&page=1' + q);
    const rows = (r.data && r.data.data) || [];
    const meta = (r.data && r.data.meta) || {};
    const total = meta.total_count != null ? meta.total_count : (meta.total != null ? meta.total : null);
    out.requests_probe[s || 'default'] = { status: r.status, returned: rows.length, total_count: total };
    for (const row of rows) { if (row && row.id != null) byId.set(row.id, row) }
    P('    ' + (s || '(افتراضي)') + ' ' + mark(r) + ' · رجع=' + rows.length + ' · إجمالي حسب قوى=' + (total != null ? total : '—'));
    if (r.ok && total && rows.length && total > rows.length) {
      const pages = Math.min(20, Math.ceil(total / rows.length));
      for (let p = 2; p <= pages; p++) {
        const rp = await get(base + '&page=' + p + q);
        const rr = (rp.data && rp.data.data) || [];
        for (const row of rr) { if (row && row.id != null) byId.set(row.id, row) }
        P('        صفحة ' + p + ' ' + mark(rp) + ' · +' + rr.length);
        if (!rr.length) break;
      }
    }
  }
  const reqs = Array.from(byId.values());
  out.requests = reqs;
  const claimed = reqs.reduce((s, r) => s + (Number(r.visa_number_sum) || 0), 0);
  P('    ⇐ طلبات فريدة=' + reqs.length + ' · تأشيرات مُعلَنة فيها=' + claimed);
  const byType = {};
  for (const r of reqs) { const k = (r.type_id || '?') + '/' + (r.status || '?'); byType[k] = (byType[k] || 0) + 1 }
  P('    التوزيع (type_id/status): ' + JSON.stringify(byType));

  /* 6) other-visas لكل نوع */
  P('');
  P('[6] other-visas');
  out.other = {};
  for (const t of ['1', '2', '3', '4']) {
    const r = await get(A + '/visa-proxy/v3/other-visas?q%5Btype_id%5D%5Beq%5D=' + t + '&page=1&per=1000');
    const rows = (r.data && r.data.data) || [];
    const meta = (r.data && r.data.meta) || {};
    const total = meta.total_count != null ? meta.total_count : null;
    out.other['type_' + t] = { status: r.status, returned: rows.length, total_count: total, sample: rows[0] || null };
    P('    type_id=' + t + ' ' + mark(r) + ' · رجع=' + rows.length + ' · إجمالي=' + (total != null ? total : '—'));
  }

  /* 7) أرقام الحدود لكل طلب — مع تجربة request_type بديل عند الفراغ */
  P('');
  P('[7] أرقام الحدود لكل طلب');
  out.border_numbers = [];
  out.border_probe = [];
  let bnTotal = 0;
  for (const r of reqs) {
    const id = r.request_id;
    if (!id) { P('    طلب ' + r.id + ' بلا request_id — تخطّي'); continue }
    const tries = Array.from(new Set([r.type_id, '1', '3', '2'].filter(Boolean).map(String)));
    let got = null, usedType = null, st = null;
    for (const t of tries) {
      const u = A + '/visa-proxy/v3/visa-requests/' + encodeURIComponent(id) + '/border-numbers?page=1&per=1000&request_type=' + encodeURIComponent(t);
      const bn = await get(u);
      st = bn.status;
      const rows = (bn.data && bn.data.data) || [];
      if (bn.ok && rows.length) { got = rows; usedType = t; break }
      if (bn.ok && !got) { got = rows; usedType = t }
    }
    const n = (got || []).length;
    bnTotal += n;
    out.border_probe.push({ request_id: id, type_id: r.type_id, status: r.status, claimed: r.visa_number_sum, got: n, used_request_type: usedType, http: st });
    for (const b of (got || [])) {
      out.border_numbers.push({
        request_id: id, number: b.number, status: b.status,
        nationality: b.national && b.national.name_ar,
        occupation: b.occupation && b.occupation.name_ar,
        embassy: b.embassy && b.embassy.name_ar, raw: b,
      });
    }
    P('    طلب ' + id + ' (نوع ' + (r.type_id || '?') + '/' + (r.status || '?') + ') · مُعلَن=' + (r.visa_number_sum != null ? r.visa_number_sum : '—') + ' · جُلب=' + n + (n === 0 ? '  ⚠️ فارغ (http ' + st + ')' : '') + (usedType && String(usedType) !== String(r.type_id) ? ' · نجح بـ request_type=' + usedType : ''));
  }
  P('    ⇐ مجموع أرقام الحدود المجلوبة=' + bnTotal + ' من أصل ' + claimed + ' مُعلَنة');

  /* 8) الخلاصة */
  const statusCount = {};
  for (const b of out.border_numbers) { const k = String(b.status); statusCount[k] = (statusCount[k] || 0) + 1 }
  P('');
  P('══ الخلاصة ══');
  P('طلبات: ' + reqs.length + ' · تأشيرات مُعلَنة: ' + claimed + ' · أرقام حدود مجلوبة: ' + bnTotal);
  P('حالات أرقام الحدود: ' + JSON.stringify(statusCount));
  P('رصيد قوى للعمل: مسموح=' + (w.allowed_quota != null ? w.allowed_quota : '—') + ' غير مستخدم=' + (w.unused_visas != null ? w.unused_visas : '—'));
  P('');
  P('النتيجة كاملة في window.__qiwaVisaProbe (والكونسول).');
  window.__qiwaVisaProbe = out;
  console.log('%c قوى — فاحص التأشيرات ', 'background:#b07d00;color:#fff', out);
  try {
    await navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    P('📋 نُسخت النتيجة الكاملة للحافظة.');
  } catch (e) {
    P('(تعذّر النسخ التلقائي — انسخ من الكونسول)');
  }
  const btn = document.createElement('button');
  btn.textContent = 'إغلاق';
  btn.style.cssText = 'margin-top:10px;background:#b07d00;color:#fff;border:0;border-radius:8px;padding:6px 14px;cursor:pointer;font:600 13px Tahoma';
  btn.onclick = () => box.remove();
  box.appendChild(document.createElement('br'));
  box.appendChild(btn);
})();
