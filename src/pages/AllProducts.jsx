import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { MagnifyingGlass, X, FlowerTulip, CaretRight } from '@phosphor-icons/react';
import { normalizeText, parsePrice } from '../lib/format';
import { useProducts, useProductModal } from '../lib/useProducts';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import ProductModal from '../components/home/ProductModal';
import Pagination from '../components/Pagination';

const PER_PAGE = 12;
const ALL = 'Tất cả';

const PRICE_RANGES = [
  { id: 'all', label: 'Mọi mức giá', test: () => true },
  { id: 'lt100', label: 'Dưới 100k', test: (p) => p <= 100000 },
  { id: '100-150', label: '100k – 150k', test: (p) => p > 100000 && p <= 150000 },
  { id: '150-200', label: '150k – 200k', test: (p) => p > 150000 && p <= 200000 },
  { id: 'gt200', label: 'Trên 200k', test: (p) => p > 200000 },
];

const SORTS = [
  { id: 'new', label: 'Mới nhất' },
  { id: 'price-asc', label: 'Giá tăng dần' },
  { id: 'price-desc', label: 'Giá giảm dần' },
  { id: 'name', label: 'Tên A → Z' },
];

export default function AllProducts() {
  const { products, categories, loading } = useProducts();
  const { openProduct, open, close } = useProductModal(products);
  const [params, setParams] = useSearchParams();
  const gridTop = useRef(null);

  // Trạng thái lọc nằm trên URL: ?q=&dm=&gia=&sx=&trang=
  const query = params.get('q') || '';
  const category = params.get('dm') || ALL;
  const priceId = params.get('gia') || 'all';
  const sort = params.get('sx') || 'new';
  const requestedPage = Math.max(1, Number(params.get('trang')) || 1);

  const [searchText, setSearchText] = useState(query);

  // Đổi bộ lọc → về trang 1
  const setFilter = (key, value, fallback) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === fallback) next.delete(key);
        else next.set(key, value);
        next.delete('trang');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  // Ô tìm kiếm: chờ người dùng gõ xong 300ms mới cập nhật URL
  useEffect(() => {
    if (searchText.trim() === query) return;
    const t = setTimeout(() => setFilter('q', searchText.trim(), ''), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const filtered = useMemo(() => {
    const range = PRICE_RANGES.find((r) => r.id === priceId) || PRICE_RANGES[0];
    const q = normalizeText(query);
    const list = products.filter((p) => {
      const catName = p.categories?.name || 'Chưa phân loại';
      if (category !== ALL && catName !== category) return false;
      if (!range.test(parsePrice(p.price))) return false;
      return !q || normalizeText(`${p.name} ${catName}`).includes(q);
    });
    if (sort === 'price-asc') list.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    if (sort === 'price-desc') list.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return list;
  }, [products, category, priceId, sort, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const from = filtered.length ? (page - 1) * PER_PAGE + 1 : 0;
  const to = Math.min(page * PER_PAGE, filtered.length);

  const goToPage = (p) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (p <= 1) next.delete('trang');
        else next.set('trang', String(p));
        return next;
      },
      { preventScrollReset: true },
    );
    gridTop.current?.scrollIntoView({ block: 'start' });
  };

  const hasFilter = category !== ALL || priceId !== 'all' || query;
  const reset = () => {
    setSearchText('');
    setParams({}, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm text-muted">
          <li><Link to="/" className="hover:text-ink">Trang chủ</Link></li>
          <li aria-hidden="true"><CaretRight size={12} /></li>
          <li className="text-ink" aria-current="page">Tất cả sản phẩm</li>
        </ol>
      </nav>

      <header className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-5xl tracking-tight sm:text-6xl">Tất cả sản phẩm</h1>
          <p className="mt-3 max-w-xl text-muted">
            Toàn bộ hoa kẽm nhung của Trạm Hoa Nhỏ — bấm vào một mẫu để xem chi tiết và đặt hàng.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Tìm hoa, ví dụ: hướng dương"
            aria-label="Tìm sản phẩm"
            className="input h-12 rounded-full pl-11 pr-10"
          />
          {searchText && (
            <button type="button" onClick={() => setSearchText('')} aria-label="Xóa tìm kiếm"
              className="icon-btn absolute right-2 top-1/2 size-8 -translate-y-1/2">
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Bộ lọc */}
      <div ref={gridTop} className="sticky top-18 z-30 -mx-4 mt-8 scroll-mt-18 border-y border-line bg-paper/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Danh mục">
            {[{ id: 'all', name: ALL }, ...categories].map((cat) => {
              const on = category === cat.name;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter('dm', cat.name, ALL)}
                  className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                    on ? 'bg-ink text-paper' : 'border border-line bg-surface text-muted hover:border-ink/30 hover:text-ink'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <select value={priceId} onChange={(e) => setFilter('gia', e.target.value, 'all')} aria-label="Lọc theo giá"
              className="input h-10 w-auto flex-1 cursor-pointer rounded-full lg:flex-none">
              {PRICE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <select value={sort} onChange={(e) => setFilter('sx', e.target.value, 'new')} aria-label="Sắp xếp"
              className="input h-10 w-auto flex-1 cursor-pointer rounded-full lg:flex-none">
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="my-6 flex items-center justify-between gap-4 text-sm text-muted" aria-live="polite">
          <span>
            {filtered.length > 0 ? (
              <>Hiển thị <strong className="font-semibold text-ink">{from}–{to}</strong> trong <strong className="font-semibold text-ink">{filtered.length}</strong> sản phẩm</>
            ) : (
              'Không có sản phẩm'
            )}
          </span>
          {hasFilter && (
            <button type="button" onClick={reset} className="inline-flex shrink-0 items-center gap-1 font-medium text-brick hover:underline">
              <X size={14} weight="bold" /> Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      <div className={`grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 ${loading ? 'mt-6' : ''}`}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : pageItems.map((p) => <ProductCard key={p.id} product={p} onOpen={open} />)}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-20 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-blush text-brick">
            <FlowerTulip size={30} weight="duotone" />
          </span>
          <h2 className="mt-5 font-display text-2xl">
            {products.length ? 'Chưa tìm thấy bó hoa phù hợp' : 'Sản phẩm đang được hoàn thiện'}
          </h2>
          <p className="mt-2 max-w-sm text-muted">
            {products.length ? 'Thử đổi danh mục, mức giá hoặc từ khóa khác nhé.' : 'Bạn quay lại sau nhé!'}
          </p>
          {hasFilter && <button type="button" onClick={reset} className="btn btn-primary mt-6">Xóa bộ lọc</button>}
        </div>
      )}

      {!loading && (
        <div className="mt-14">
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        </div>
      )}

      <AnimatePresence>
        {openProduct && <ProductModal key={openProduct.id} product={openProduct} onClose={close} />}
      </AnimatePresence>
    </div>
  );
}
