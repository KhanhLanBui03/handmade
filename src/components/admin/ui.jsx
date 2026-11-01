// Thành phần UI dùng chung cho trang quản trị
import { CircleNotch } from '@phosphor-icons/react';

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
