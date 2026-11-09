import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, CaretLeft, CaretRight, At, ChatCircleDots, CheckCircle, Flower, PlayCircle } from '@phosphor-icons/react';
import { CONTACT, formatVND, parsePrice } from '../../lib/format';

export default function ProductModal({ product, onClose }) {
  const [active, setActive] = useState(0);
  const closeRef = useRef(null);
  const trackRef = useRef(null); // dải ảnh lướt ngang
  const dragRef = useRef(null); // kéo bằng chuột trên máy tính

  const images = (product.media || []).filter((m) => m.type !== 'video');
  const videos = (product.media || []).filter((m) => m.type === 'video');
  const category = product.categories?.name;

  // Cuộn dải ảnh tới ảnh thứ i (dùng cho mũi tên, ảnh nhỏ, phím, kéo chuột)
  const scrollToIndex = (i, smooth = true) => {
    const el = trackRef.current;
    if (!el || !images.length) return;
    const idx = (i + images.length) % images.length;
    el.scrollTo({ left: idx * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  };
  // Ảnh đang hiện, đọc thẳng từ vị trí cuộn
  const currentIndex = () => {
    const el = trackRef.current;
    return el ? Math.round(el.scrollLeft / el.clientWidth) : 0;
  };
  const go = (dir) => scrollToIndex(currentIndex() + dir);

  // Vuốt / lướt: cập nhật ảnh đang xem theo vị trí cuộn
  const handleScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active && i >= 0 && i < images.length) setActive(i);
  };

  // Kéo bằng chuột (điện thoại & trackpad đã tự lướt được)
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || images.length < 2) return;
    dragRef.current = { x: e.clientX, left: trackRef.current.scrollLeft };
    trackRef.current.style.scrollSnapType = 'none';
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    trackRef.current.scrollLeft = dragRef.current.left - (e.clientX - dragRef.current.x);
  };
  const endDrag = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    dragRef.current = null;
    trackRef.current.style.scrollSnapType = '';
    if (Math.abs(dx) > 40) scrollToIndex(active + (dx < 0 ? 1 : -1));
    else scrollToIndex(active);
  };

  // Khóa cuộn trang, focus nút đóng, Esc để đóng, phím mũi tên đổi ảnh
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      const el = trackRef.current;
      if (images.length > 1 && el && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const cur = Math.round(el.scrollLeft / el.clientWidth);
        const next = (cur + (e.key === 'ArrowRight' ? 1 : -1) + images.length) % images.length;
        el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, images.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="product-title">
      <motion.div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative flex max-h-[92svh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] bg-paper shadow-2xl sm:rounded-[2rem]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow backdrop-blur transition hover:bg-surface"
        >
          <X size={18} weight="bold" />
        </button>

        <div className="overflow-y-auto">
          <div className="grid md:grid-cols-2">
            {/* Ảnh */}
            <div className="flex flex-col items-center bg-paper-dim p-3 sm:p-4">
              {/* Cùng tỉ lệ 9:16 với ảnh ở thẻ sản phẩm; giới hạn chiều cao để luôn thấy trọn ảnh */}
              <div className="relative aspect-[9/16] w-full max-w-[calc(78svh*9/16)] overflow-hidden rounded-2xl bg-paper-dim">
                {images.length > 0 ? (
                  <div
                    ref={trackRef}
                    onScroll={handleScroll}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerLeave={endDrag}
                    className={`no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain ${
                      images.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                    aria-roledescription="carousel"
                  >
                    {images.map((img, i) => (
                      <img
                        key={img.src + i}
                        src={img.src}
                        alt={`${product.name} — ảnh ${i + 1}`}
                        draggable={false}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        className="size-full shrink-0 snap-center select-none object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex size-full items-center justify-center text-ink/15"><Flower size={80} weight="duotone" /></div>
                )}
                {images.length > 1 && (
                  <>
                    <button type="button" onClick={() => go(-1)} aria-label="Ảnh trước"
                      className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur hover:bg-surface">
                      <CaretLeft size={18} weight="bold" />
                    </button>
                    <button type="button" onClick={() => go(1)} aria-label="Ảnh tiếp theo"
                      className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur hover:bg-surface">
                      <CaretRight size={18} weight="bold" />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-medium text-white">
                      {active + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="no-scrollbar mt-3 flex w-full max-w-[calc(78svh*9/16)] gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} type="button" onClick={() => scrollToIndex(i)} aria-label={`Xem ảnh ${i + 1}`} aria-current={i === active}
                      className={`aspect-[9/16] w-12 shrink-0 overflow-hidden rounded-xl transition ${i === active ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper-dim' : 'opacity-60 hover:opacity-100'}`}>
                      <img src={img.src} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Thông tin */}
            <div className="flex flex-col p-6 sm:p-8">
              {category && <p className="eyebrow">{category}</p>}
              <h2 id="product-title" className="mt-2 pr-10 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{product.name}</h2>
              <p className="mt-4 text-2xl font-semibold text-brick">{formatVND(parsePrice(product.price))}</p>

              <p className="mt-5 whitespace-pre-wrap leading-relaxed text-muted">
                {product.description || 'Chưa có mô tả cho sản phẩm này.'}
              </p>

              {product.features?.length > 0 && (
                <div className="mt-6 border-t border-line pt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.15em]">Chi tiết cấu tạo</h3>
                  <ul className="mt-3 space-y-2.5">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted">
                        <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-sage" />
                        <span className="leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-8 grid gap-3 pt-2 sm:grid-cols-2 md:mt-auto">
                <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-accent btn-lg">
                  <ChatCircleDots weight="bold" /> Nhắn Zalo đặt mẫu
                </a>
                <a href={CONTACT.threads} target="_blank" rel="noreferrer" className="btn btn-outline btn-lg">
                  <At weight="bold" /> Nhắn Threads
                </a>
              </div>
              <p className="mt-3 text-center text-xs text-muted">
                Shop tư vấn và chốt đơn qua Zalo & Threads · Phản hồi nhanh nhất có thể
              </p>
            </div>
          </div>

          {videos.length > 0 && (
            <div className="border-t border-line p-6 sm:p-8">
              <h3 className="flex items-center gap-2 font-display text-2xl">
                <PlayCircle size={26} weight="duotone" className="text-brick" /> Video thực tế
              </h3>
              <div className="mt-4 space-y-4">
                {videos.map((v, i) => (
                  <video key={i} src={v.src} controls playsInline className="max-h-[60vh] w-full rounded-2xl bg-ink object-contain" />
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
