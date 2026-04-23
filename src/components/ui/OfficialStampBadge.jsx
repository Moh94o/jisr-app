import React from 'react';
import './OfficialStampBadge.css';

/**
 * ختم رسمي متعدد الأسطر — يحل محل status badge
 *
 * @param {string} status        نص الحالة الرئيسي (مطلوب) — مثل "مسعّرة"
 * @param {string} employeeName  اسم الموظف اللي سوى الإجراء
 * @param {string} branchCode    كود الفرع (JUB / DAM / KHO)
 * @param {string|Date} date     تاريخ الإجراء — يتنسّق تلقائياً DD/MM/YY
 * @param {string} color         لون الختم (افتراضي: #c9a84c الذهبي)
 * @param {number} rotate        زاوية الميلان بالدرجات (افتراضي: -5)
 */
export default function OfficialStampBadge({
  status,
  employeeName,
  branchCode,
  date,
  color = '#c9a84c',
  rotate = -5,
}) {
  const formattedDate = date ? formatDate(date) : null;

  return (
    <span
      className="official-stamp"
      style={{
        '--stamp-color': color,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <span className="official-stamp__body">
        {(branchCode || formattedDate) && (
          <span className="official-stamp__top">
            {branchCode && <span className="official-stamp__branch">{branchCode}</span>}
            {formattedDate && <span className="official-stamp__date">{formattedDate}</span>}
          </span>
        )}
        <span className="official-stamp__status">{status}</span>
        {employeeName && (
          <span className="official-stamp__employee">{employeeName}</span>
        )}
      </span>
    </span>
  );
}

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date)) return null;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${yy}/${mm}/${dd}`;
}
