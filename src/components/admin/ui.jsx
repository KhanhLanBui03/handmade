// Thành phần UI dùng chung cho trang quản trị
import { useState } from 'react';
import { CalendarBlank, CircleNotch } from '@phosphor-icons/react';

// "2026-11-09" -> "09/11/2026"; "2026-11" -> "11/2026"
const isoToDisplay = (v, type) => {
  if (!v) return '';
  const [y, m, d] = String(v).split('-');
  return type === 'month' ? `${m}/${y}` : `${d}/${m}/${y}`;
};

const makeIso = (d, mo, y) => {
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

// Hỗ trợ: "09/11/2026", "9-11-2026", "22112026" (8 số), "1082026" (7 số -> 10/08/2026), "582026" (6 số -> 05/08/2026)
const displayToIso = (text, type) => {
  const t = text.trim();
  if (type === 'month') {
    const m = /^(\d{1,2})[-/.](\d{4})$/.exec(t) || /^(\d{2})(\d{4})$/.exec(t) || /^(\d{1})(\d{4})$/.exec(t);
    if (!m || +m[1] < 1 || +m[1] > 12) return null;
    return `${m[2]}-${m[1].padStart(2, '0')}`;
  }

  const sep = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t);
  if (sep) return makeIso(+sep[1], +sep[2], +sep[3]);

  // Nhập liền không cần dấu gạch: 22112026, 1082026, 582026
  if (/^\d{8}$/.test(t)) {
    return makeIso(+t.slice(0, 2), +t.slice(2, 4), +t.slice(4, 8));
  }
  if (/^\d{7}$/.test(t)) {
    // Ưu tiên dd + m + yyyy (VD: 1082026 -> 10/08/2026), nếu không hợp lệ thì thử d + mm + yyyy (VD: 5082026 -> 05/08/2026)
    return (
      makeIso(+t.slice(0, 2), +t.slice(2, 3), +t.slice(3, 7)) ||
      makeIso(+t.slice(0, 1), +t.slice(1, 3), +t.slice(3, 7))
    );
  }
  if (/^\d{6}$/.test(t)) {
    return makeIso(+t.slice(0, 1), +t.slice(1, 2), +t.slice(2, 6));
  }
  return null;
};

/**
 * Ô chọn ngày hiển thị dạng dd/mm/yyyy (hoặc mm/yyyy khi type="month").
 * Hỗ trợ gõ tay liền số (VD: 22112026 -> 22/11/2026, 1082026 -> 10/08/2026) hoặc bấm lịch (tương thích iOS).
 * value / onChange dùng chuỗi ISO ("yyyy-mm-dd" hoặc "yyyy-mm").
 */
export function DateField({ value, onChange, type = 'date', min, max, id, required, placeholder, className = '', ...rest }) {
  const [draft, setDraft] = useState(null); // chuỗi đang gõ dở
  const shown = draft ?? isoToDisplay(value, type);

  const isInRange = (iso) => Boolean(iso && (!max || iso <= max) && (!min || iso >= min));

  const handleType = (val) => {
    setDraft(val);
    const t = val.trim();
    if (!t) {
      if (!required) onChange('');
      return;
    }
    const iso = displayToIso(t, type);
    if (isInRange(iso)) onChange(iso);
  };

  const commit = () => {
    if (draft === null) return;
    const t = draft.trim();
    if (!t) {
      if (!required) onChange('');
    } else {
      const iso = displayToIso(t, type);
      if (isInRange(iso)) onChange(iso);
    }
    setDraft(null);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={shown}
        onChange={(e) => handleType(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
        placeholder={placeholder || (type === 'month' ? 'mm/yyyy' : 'dd/mm/yyyy (VD: 22112026)')}
        required={required}
        className="input w-full pr-11"
        {...rest}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted"
      >
        <CalendarBlank size={18} />
      </span>
      <input
        type={type}
        value={value || ''}
        min={min}
        max={max}
        onChange={(e) => {
          setDraft(null);
          onChange(e.target.value);
        }}
        aria-label="Mở lịch"
        className="absolute right-1.5 top-1/2 size-8 -translate-y-1/2 cursor-pointer opacity-0"
      />
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'brick', compact = false }) {
  const tones = {
    brick: 'bg-blush text-brick',
    sage: 'bg-sage-soft text-sage',
    sun: 'bg-sunflower/20 text-[#9a6b00]',
  };
  if (compact) {
    return (
      <div className="card flex items-center gap-2.5 p-2.5">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={16} weight="duotone" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] text-muted">{label}</p>
          <p className="truncate text-sm font-semibold leading-tight tracking-tight">{value}</p>
          {hint && <p className="truncate text-[10px] text-muted">{hint}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={24} weight="duotone" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="truncate text-xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {Icon && (
        <span className="flex size-14 items-center justify-center rounded-full bg-paper-dim text-muted">
          <Icon size={28} weight="duotone" />
        </span>
      )}
      <p className="mt-4 font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-20 ${className}`} role="status" aria-label="Đang tải">
      <CircleNotch size={32} className="animate-spin text-muted" />
    </div>
  );
}

export function Thumb({ src, alt = '', className = 'size-12' }) {
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-lg bg-paper-dim ring-1 ring-line`}>
      {src ? <img src={src} alt={alt} className="size-full object-cover" /> : null}
    </div>
  );
}
