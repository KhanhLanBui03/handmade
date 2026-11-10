import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, CaretLeft, CaretRight, At, ChatCircleDots, CheckCircle, Flower, PlayCircle, ShoppingBag } from '@phosphor-icons/react';
import { CONTACT, formatVND, getCover, parsePrice } from '../../lib/format';
import { useCart } from '../../lib/cart-context';
import { Stepper } from '../cart/CartDrawer';
import { getVariants } from '../../lib/variants';

// Khóa cuộn trang khi mở cửa sổ; trả về hàm mở khóa
function lockPageScroll() {
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = prev;
  };
}

export default function ProductModal({ product, onClose }) {
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const cart = useCart();
  const closeRef = useRef(null);
  const variants = getVariants(product);
  const [vIdx, setVIdx] = useState(0); // phân loại đang chọn
  const variant = variants[vIdx] || null;
  const price = variant ? variant.price : parsePrice(product.price);

  // Món bỏ vào giỏ: mỗi phân loại là một dòng riêng trong giỏ
  const cartItem = () => ({
    id: variant ? `${product.id}::${variant.name}` : product.id,
    product_id: product.id,
    variant: variant?.name || null,
    name: variant ? `${product.name} — ${variant.name}` : product.name,
    price,
    image: variant?.image || getCover(product),
  });
  const addToCart = () => {
    cart.add(cartItem(), qty);
    setAdded(true);
  };
  const buyNow = () => {
    if (!added) cart.add(cartItem(), qty);
    onClose();
    cart.openCart();
  };
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
  // Chọn phân loại → đổi giá và nhảy tới ảnh gắn với phân loại đó
  const chooseVariant = (i) => {
    setVIdx(i);
    setAdded(false);
    const img = variants[i]?.image;
    const idx = img ? images.findIndex((m) => m.src === img) : -1;
    if (idx >= 0) scrollToIndex(idx);
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
    // Lướt tới ảnh gắn với một phân loại → tự chọn phân loại đó
    const vi = variants.findIndex((v) => v.image && v.image === images[i]?.src);
    if (vi >= 0 && vi !== vIdx) {
      setVIdx(vi);
      setAdded(false);
    }
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
    const unlock = lockPageScroll();
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
      unlock();
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
              <p className="mt-4 text-2xl font-semibold text-brick" aria-live="polite">{formatVND(price)}</p>

              {variants.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-medium">
                    Phân loại: <span className="text-muted">{variant?.name}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Chọn phân loại">
                    {variants.map((v, i) => (
                      <button
                        key={v.name}
                        type="button"
                        role="radio"
                        aria-checked={i === vIdx}
                        onClick={() => chooseVariant(i)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                          i === vIdx ? 'border-brick bg-blush text-brick ring-1 ring-brick' : 'border-line bg-surface text-ink hover:border-ink/30'
                        }`}
                      >
                        {v.image && <img src={v.image} alt="" className="size-8 rounded-md object-cover" />}
                        <span>
                          <span className="block font-semibold leading-tight">{v.name}</span>
                          <span className={`text-xs ${i === vIdx ? 'text-brick' : 'text-muted'}`}>{formatVND(v.price)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

              <div className="mt-8 space-y-3 pt-2 md:mt-auto">
                {price > 0 ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-muted">Số lượng</span>
                      <Stepper value={qty} onChange={(q) => { setQty(Math.max(1, Math.min(99, q))); setAdded(false); }} label={product.name} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={addToCart} className="btn btn-outline btn-lg">
                        {added ? <CheckCircle weight="fill" className="text-sage" /> : <ShoppingBag weight="bold" />}
                        {added ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ'}
                      </button>
                      <button type="button" onClick={buyNow} className="btn btn-accent btn-lg">
                        Đặt hàng ngay
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="rounded-xl bg-blush px-4 py-3 text-sm text-brick">Mẫu này báo giá theo yêu cầu — nhắn shop để được tư vấn nhé.</p>
                )}
                <div className="flex items-center justify-center gap-4 pt-1 text-sm text-muted">
                  <span>Hoặc nhắn shop:</span>
                  <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-ink hover:text-brick">
                    <ChatCircleDots weight="bold" /> Zalo
                  </a>
                  <a href={CONTACT.threads} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-ink hover:text-brick">
                    <At weight="bold" /> Threads
                  </a>
                </div>
              </div>
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
