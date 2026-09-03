/* ملتقط شبكة قوى — للقراءة فقط، لا يكتب شيئاً ولا يرسل شيئاً خارج الصفحة.
   يعترض fetch و XMLHttpRequest ويسجّل كل نداء يذهب إلى *.qiwa.sa مع رمز الحالة
   وعدد الصفوف في الرد، ليُعرف المسار الحقيقي الذي تقرأ منه صفحة
   «Permanent work visas requests» — وهو المسار الذي لا تعرفه مزامنتنا.

   الاستعمال: افتح الصفحة ← اضغط الزر ← ثم اضغط تبويب «Permanent work visas
   requests» أو غيّر الفرز/الصفحة لتوليد نداءات جديدة (الاعتراض لا يرى ما
   حدث قبل تشغيله). */
(() => {
  if (window.__qiwaNetCap) { window.__qiwaNetCap.show(); return }
  const hits = [];
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;top:12px;right:12px;width:560px;max-height:80vh;overflow:auto;background:#0f1115;color:#e7e3d8;padding:14px 16px;border-radius:12px;z-index:2147483647;font:12px/1.6 Consolas,monospace;direction:ltr;text-align:left;box-shadow:0 10px 40px rgba(0,0,0,.6);border:1px solid rgba(176,125,0,.5);white-space:pre-wrap';
  document.body.appendChild(box);

  const head = document.createElement('div');
  head.style.cssText = 'direction:rtl;text-align:right;font:600 13px Tahoma;color:#e3b341;margin-bottom:8px';
  head.textContent = 'ملتقط قوى — اضغط تبويب التأشيرات الآن لتوليد النداءات';
  box.appendChild(head);
  const list = document.createElement('div');
  box.appendChild(list);

  /* عدّ الصفوف في أي شكل رد شائع في قوى */
  const rowsOf = (d) => {
    if (!d || typeof d !== 'object') return null;
    for (const k of ['data', 'items', 'content', 'requests', 'results', 'workspaces']) {
      if (Array.isArray(d[k])) return d[k].length;
      if (d[k] && Array.isArray(d[k].data)) return d[k].data.length;
    }
    return Array.isArray(d) ? d.length : null;
  };
  const totalOf = (d) => {
    const m = (d && (d.meta || d.pagination)) || {};
    return m.total_count != null ? m.total_count : (m.total != null ? m.total : (d && d.totalElements));
  };

  const render = () => {
    list.textContent = hits.map((h, i) =>
      (i + 1) + ') ' + h.method + ' ' + h.status + '  rows=' + (h.rows == null ? '-' : h.rows)
      + (h.total != null ? ' total=' + h.total : '') + '\n   ' + h.url
    ).join('\n\n') || '(لا نداءات بعد — اضغط التبويب أو أعِد الفرز)';
    head.textContent = 'ملتقط قوى — ' + hits.length + ' نداء · انسخ بالزر أدناه';
  };

  const record = (method, url, status, text) => {
    try {
      if (!/qiwa\.sa/.test(url)) return;
      if (/\.(js|css|png|jpg|svg|woff2?|ico)(\?|$)/i.test(url)) return;
      let d = null;
      try { d = JSON.parse(text) } catch (e) { d = null }
      hits.push({ method, url, status, rows: rowsOf(d), total: totalOf(d), sample: d });
      render();
    } catch (e) { /* الالتقاط لا يجوز أن يكسر الصفحة */ }
  };

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
      const method = (args[1] && args[1].method) || (args[0] && args[0].method) || 'GET';
      res.clone().text().then((t) => record(method, url, res.status, t)).catch(() => {});
    } catch (e) {}
    return res;
  };

  const OrigOpen = XMLHttpRequest.prototype.open;
  const OrigSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) {
    this.__cap = { m: m, u: u };
    return OrigOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', () => {
      const c = this.__cap || {};
      record(c.m || 'GET', c.u || '', this.status, this.responseText || '');
    });
    return OrigSend.apply(this, arguments);
  };

  const btn = document.createElement('button');
  btn.textContent = 'نسخ النتيجة';
  btn.style.cssText = 'margin:10px 6px 0 0;background:#b07d00;color:#fff;border:0;border-radius:8px;padding:6px 14px;cursor:pointer;font:600 12px Tahoma';
  btn.onclick = async () => {
    const out = hits.map((h) => ({ method: h.method, url: h.url, status: h.status, rows: h.rows, total: h.total, sample: h.sample }));
    window.__qiwaNetHits = out;
    console.log('%c قوى — الملتقط ', 'background:#b07d00;color:#fff', out);
    try { await navigator.clipboard.writeText(JSON.stringify(out, null, 2)); btn.textContent = '✔ نُسخ'; }
    catch (e) { btn.textContent = 'انسخ من الكونسول'; }
  };
  const close = document.createElement('button');
  close.textContent = 'إغلاق';
  close.style.cssText = btn.style.cssText;
  close.onclick = () => box.remove();
  box.appendChild(btn);
  box.appendChild(close);

  window.__qiwaNetCap = { hits, show: () => { box.style.display = 'block' } };
  render();
})();
