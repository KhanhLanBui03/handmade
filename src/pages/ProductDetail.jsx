import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  CaretLeft, CaretRight, CaretRight as Chevron, Phone, ChatCircleDots,
  CheckCircle, HandHeart, Sparkle, Gift, PlayCircle, Flower,
} from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import { CONTACT, formatVND, parsePrice } from '../lib/format';
import { ProductCard } from '../components/ProductCard';

function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-2 lg:px-10" aria-busy="true">
      <div className="aspect-square rounded-3xl bg-paper-dim animate-pulse" />
      <div className="space-y-4 pt-4">
        <div className="h-4 w-24 rounded bg-paper-dim animate-pulse" />
        <div className="h-12 w-3/4 rounded bg-paper-dim animate-pulse" />
        <div className="h-8 w-40 rounded bg-paper-dim animate-pulse" />
        <div className="h-32 w-full rounded bg-paper-dim animate-pulse" />
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchProduct() {
      setLoading(true);
      setActive(0);
      const { data } = await supabase.from('products').select('*, categories(name)').eq('id', id).single();
      if (cancelled) return;
      setProduct(data || null);
      setLoading(false);

      if (data) {
        let q = supabase.from('products').select('*, categories(name)').neq('id', id).limit(4);
        if (data.category_id) q = q.eq('category_id', data.category_id);
        const { data: rel } = await q.order('created_at', { ascending: false });
        if (!cancelled) setRelated(rel || []);
      }
    }
    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <DetailSkeleton />;

  if (!product) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-32 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-blush text-brick">
          <Flower size={30} weight="duotone" />
        </span>
        <h1 className="mt-5 font-display text-3xl">Sản phẩm không tồn tại</h1>
        <p className="mt-2 text-muted">Có thể sản phẩm đã ngừng bán hoặc đường dẫn chưa đúng.</p>
        <Link to="/products" className="btn btn-primary mt-6">Quay lại cửa hàng</Link>
      </div>
    );
  }

  const images = (product.media || []).filter((m) => m.type !== 'video');
  const videos = (product.media || []).filter((m) => m.type === 'video');
  const price = parsePrice(product.price);
  const category = product.categories?.name;
  const go = (dir) => setActive((i) => (i + dir + images.length) % images.length);

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-10">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <li><Link to="/" className="hover:text-ink">Trang chủ</Link></li>
          <li aria-hidden="true"><Chevron size={12} /></li>
          <li><Link to="/products" className="hover:text-ink">Cửa hàng</Link></li>
          {category && (
            <>
              <li aria-hidden="true"><Chevron size={12} /></li>
              <li>
                <Link to={`/products?category=${encodeURIComponent(category)}`} className="hover:text-ink">{category}</Link>
              </li>
            </>
          )}
          <li aria-hidden="true"><Chevron size={12} /></li>
          <li className="truncate text-ink" aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:px-10">
        {/* Thư viện ảnh */}
        <div className="lg:col-span-7">
          <div className="flex flex-col-reverse gap-3 md:flex-row">
            {images.length > 1 && (
              <div className="no-scrollbar flex gap-3 overflow-x-auto md:max-h-[640px] md:flex-col md:overflow-y-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActive(idx)}
                    aria-label={`Xem ảnh ${idx + 1}`}
                    aria-current={active === idx}
                    className={`size-18 shrink-0 overflow-hidden rounded-xl transition md:size-20 ${
                      active === idx ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img.src} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="relative aspect-square flex-1 overflow-hidden rounded-3xl bg-paper-dim">
              {images.length > 0 ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img
                    key={images[active]?.src}
                    src={images[active]?.src}
                    alt={product.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="size-full object-cover"
                  />
                </AnimatePresence>
              ) : (
                <div className="flex size-full items-center justify-center text-ink/15">
                  <Flower size={80} weight="duotone" />
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button type="button" onClick={() => go(-1)} aria-label="Ảnh trước"
                    className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur transition hover:bg-surface">
                    <CaretLeft size={18} weight="bold" />
                  </button>
                  <button type="button" onClick={() => go(1)} aria-label="Ảnh tiếp theo"
                    className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink backdrop-blur transition hover:bg-surface">
                    <CaretRight size={18} weight="bold" />
                  </button>
                  <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-medium text-white">
                    {active + 1} / {images.length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Thông tin */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            {category && <p className="eyebrow">{category}</p>}
            <h1 className="mt-3 font-display text-4xl leading-[1.1] tracking-tight sm:text-5xl">{product.name}</h1>
            <p className="mt-5 text-3xl font-semibold text-brick">{formatVND(price)}</p>

            <p className="mt-6 whitespace-pre-wrap leading-relaxed text-muted">
              {product.description || 'Chưa có mô tả cho sản phẩm này.'}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={`tel:${CONTACT.phone}`} className="btn btn-accent btn-lg flex-1">
                <Phone weight="bold" /> Gọi đặt hàng
              </a>
              <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-outline btn-lg flex-1">
                <ChatCircleDots weight="bold" /> Nhắn Zalo
              </a>
            </div>
            <p className="mt-3 text-center text-sm text-muted sm:text-left">
              Hotline: <a href={`tel:${CONTACT.phone}`} className="font-medium text-ink hover:text-brick">{CONTACT.phoneDisplay}</a>
            </p>

            {product.features?.length > 0 && (
              <div className="mt-10 border-t border-line pt-8">
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-ink">Chi tiết cấu tạo</h2>
                <ul className="mt-4 space-y-3">
                  {product.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-muted">
                      <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-sage" />
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ul className="mt-10 grid grid-cols-3 gap-3 border-t border-line pt-8 text-center text-xs text-muted">
              {[
                [HandHeart, 'Làm thủ công'],
                [Sparkle, 'Bền màu, không héo'],
                [Gift, 'Nhận làm theo yêu cầu'],
              ].map(([Icon, label]) => (
                <li key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-paper-dim px-2 py-4">
                  <Icon size={22} weight="duotone" className="text-brick" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Video */}
      {videos.length > 0 && (
        <section className="mx-auto mt-20 max-w-5xl px-4 sm:px-6 lg:px-10">
          <h2 className="flex items-center gap-3 font-display text-3xl tracking-tight">
            <PlayCircle size={32} weight="duotone" className="text-brick" /> Video thực tế
          </h2>
          <div className="mt-6 space-y-6">
            {videos.map((v, i) => (
              <video key={i} src={v.src} controls playsInline className="max-h-[75vh] w-full rounded-3xl bg-ink object-contain" />
            ))}
          </div>
        </section>
      )}

      {/* Sản phẩm liên quan */}
      {related.length > 0 && (
        <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Có thể bạn cũng thích</h2>
            <Link to="/products" className="shrink-0 font-medium hover:text-brick">Xem thêm</Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
