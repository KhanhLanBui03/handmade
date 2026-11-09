// Thành phần UI dùng chung cho trang quản trị
import { useRef, useState } from 'react';
import { CalendarBlank, CircleNotch } from '@phosphor-icons/react';

// "2026-11-09" -> "09-11-2026"; "2026-11" -> "11-2026"
const isoToDisplay = (v, type) => {
  if (!v) return '';
  const [y, m, d] = String(v).split('-');
  return type === 'month' ? `${m}-${y}` : `${d}-${m}-${y}`;
};

// "9-11-2026" / "09/11/2026" -> "2026-11-09"; trả về null nếu sai
const displayToIso = (text, type) => {
  const t = text.trim();
  if (type === 'month') {
    const m = /^(\d{1,2})[-/.](\d{4})$/.exec(t);
    if (!m || +m[1] < 1 || +m[1] > 12) return null;
    return `${m[2]}-${m[1].padStart(2, '0')}`;
  }
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t);
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

/**
 * Ô chọn ngày luôn hiển thị dạng dd-mm-yyyy (hoặc mm-yyyy khi type="month"),
 * không phụ thuộc ngôn ngữ trình duyệt. Gõ tay được, hoặc bấm biểu tượng lịch để chọn.
 * value / onChange dùng chuỗi ISO ("yyyy-mm-dd" hoặc "yyyy-mm").
 */
export function DateField({ value, onChange, type = 'date', min, max, id, required, placeholder, className = '', ...rest }) {
  const pickerRef = useRef(null);
  const [draft, setDraft] = useState(null); // chuỗi đang gõ dở
  const shown = draft ?? isoToDisplay(value, type);

  const commit = () => {
    if (draft === null) return;
    const t = draft.trim();
    if (!t) {
      if (!required) onChange('');
    } else {
      const iso = displayToIso(t, type);
      if (iso && (!max || iso <= max) && (!min || iso >= min)) onChange(iso);
    }
    setDraft(null);
  };

  const openPicker = () => {
    try {
      pickerRef.current?.showPicker();
    } catch {
      pickerRef.current?.focus();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
        placeholder={placeholder || (type === 'month' ? 'mm-yyyy' : 'dd-mm-yyyy')}
        required={required}
        className="input w-full pr-11"
        {...rest}
      />
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
        aria-label="Mở lịch"
        tabIndex={-1}
      >
        <CalendarBlank size={18} />
      </button>
      <input
        ref={pickerRef}
        type={type}
        value={value || ''}
        min={min}
        max={max}
        onChange={(e) => {
          setDraft(null);
          onChange(e.target.value);
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 size-px opacity-0"
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

export function StatCard({ icon: Icon, label, value, hint, tone = 'brick' }) {
  const tones = {
    brick: 'bg-blush text-brick',
    sage: 'bg-sage-soft text-sage',
    sun: 'bg-sunflower/20 text-[#9a6b00]',
  };
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
