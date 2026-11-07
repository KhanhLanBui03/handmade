import { CaretLeft, CaretRight } from '@phosphor-icons/react';

// Danh sách số trang, rút gọn bằng "…" khi nhiều trang: 1 … 4 5 6 … 12
function getPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const btn =
    'flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-35';

  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Phân trang">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}
        className={`${btn} gap-1 border border-line bg-surface hover:border-ink/30`} aria-label="Trang trước">
        <CaretLeft size={16} weight="bold" /> <span className="hidden sm:inline">Trước</span>
      </button>

      <ul className="hidden items-center gap-1.5 sm:flex">
        {getPages(page, totalPages).map((p, i) =>
          p === '…' ? (
            <li key={`gap-${i}`} className="w-8 text-center text-muted" aria-hidden="true">…</li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onChange(p)}
                aria-label={`Trang ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={`${btn} ${p === page ? 'bg-ink text-paper' : 'text-muted hover:bg-ink/5 hover:text-ink'}`}
              >
                {p}
              </button>
            </li>
          ),
        )}
      </ul>

      {/* Điện thoại: gọn lại thành "2 / 5" */}
      <span className="px-3 text-sm font-medium sm:hidden" aria-live="polite">
        Trang {page} / {totalPages}
      </span>

      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages}
        className={`${btn} gap-1 border border-line bg-surface hover:border-ink/30`} aria-label="Trang sau">
        <span className="hidden sm:inline">Sau</span> <CaretRight size={16} weight="bold" />
      </button>
    </nav>
  );
}
