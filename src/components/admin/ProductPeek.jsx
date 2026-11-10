import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, CaretLeft, CaretRight, PencilSimple, ArrowSquareOut, Flower } from '@phosphor-icons/react';
import { formatVND, parsePrice } from '../../lib/format';

/** Cửa sổ xem nhanh một sản phẩm trong trang admin (ảnh, giá, mô tả). */
export default function ProductPeek({ product, fallbackName, onClose }) {
  const [active, setActive] = useState(0);
  const closeRef = useRef(null);
  const images = (product?.media || []).filter((m) => m.type !== 'video');

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (images.length > 1 && e.key === 'ArrowRight') setActive((i) => (i + 1) % images.length);
      if (images.length > 1 && e.key === 'ArrowLeft') setActive((i) => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, images.length]);

  const go = (d) => setActive((i) => (i + d + images.length) % images.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Chi tiết sản phẩm">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90svh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl sm:flex-row">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow backdrop-blur hover:bg-surface"
        >
          <X size={16} weight="bold" />
        </button>

        {/* Ảnh */}
        <div className="relative flex shrink-0 items-center justify-center bg-paper-dim p-3 sm:w-[46%]">
          <div className="relative aspect-[9/16] h-[min(60svh,520px)] max-w-full overflow-hidden rounded-xl bg-paper-dim">
            {images.length ? (
              <img src={images[active]?.src} alt={product.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-ink/15">
                <Flower size={64} weight="duotone" />
              </div>
            )}
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Ảnh trước" className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink hover:bg-surface">
                  <CaretLeft size={16} weight="bold" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Ảnh tiếp theo" className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink hover:bg-surface">
                  <CaretRight size={16} weight="bold" />
                </button>
                <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2.5 py-0.5 text-xs font-medium text-white">
                  {active + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Thông tin */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6">
          {product ? (
            <>
              {product.categories?.name && <p className="eyebrow">{product.categories.name}</p>}
              <h2 className="mt-1 pr-8 text-2xl font-semibold tracking-tight">{product.name}</h2>
              <p className="mt-2 text-xl font-semibold text-brick">{formatVND(parsePrice(product.price))}</p>
              {product.is_hidden && <span className="badge mt-2 w-fit bg-ink/10 text-ink">Đang ẩn với khách</span>}
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {product.description || 'Chưa có mô tả.'}
              </p>
              {product.features?.length > 0 && (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
                  {product.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex flex-wrap gap-2 pt-2 sm:mt-auto">
                <Link to={`/admin/product/edit/${product.id}`} className="btn btn-outline btn-sm">
                  <PencilSimple size={16} /> Sửa sản phẩm
                </Link>
                <Link to={`/?sp=${product.id}`} target="_blank" className="btn btn-ghost btn-sm">
                  <ArrowSquareOut size={16} /> Xem trên cửa hàng
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="pr-8 text-2xl font-semibold tracking-tight">{fallbackName}</h2>
              <p className="mt-3 text-sm text-muted">Sản phẩm này không còn trong cửa hàng (có thể đã bị xóa).</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
