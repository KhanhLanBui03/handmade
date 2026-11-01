import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MagnifyingGlass, X, FlowerTulip } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import { parsePrice } from '../lib/format';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';

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
];

// Bỏ dấu để tìm "cam tu cau" vẫn ra "Cẩm tú cầu"
const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export default function Products() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || ALL;
  const priceId = params.get('price') || 'all';
  const sort = params.get('sort') || 'new';
  const query = params.get('q') || '';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState(query);

  useEffect(() => {
    async function fetchData() {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('created_at'),
        supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const updateParam = (key, value, fallback) => {
    const next = new URLSearchParams(params);
    if (!value || value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  // Debounce ô tìm kiếm vào URL
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchText !== query) updateParam('q', searchText.trim(), '');
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const filtered = useMemo(() => {
    const range = PRICE_RANGES.find((r) => r.id === priceId) || PRICE_RANGES[0];
    const q = normalize(query);
    const list = products.filter((p) => {
      const catName = p.categories?.name || 'Chưa phân loại';
      if (category !== ALL && catName !== category) return false;
      if (!range.test(parsePrice(p.price))) return false;
      if (q && !normalize(`${p.name} ${catName}`).includes(q)) return false;
      return true;
    });
    if (sort === 'price-asc') list.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    if (sort === 'price-desc') list.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    return list;
  }, [products, category, priceId, sort, query]);

  const hasFilter = category !== ALL || priceId !== 'all' || query;
  const resetFilters = () => {
    setSearchText('');
    setParams({}, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-10 lg:pt-12">
      {/* Tiêu đề */}
      <header className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Cửa hàng</p>
          <h1 className="mt-3 font-display text-5xl tracking-tight sm:text-6xl">Tất cả sản phẩm</h1>
          <p className="mt-3 max-w-xl text-muted">
            Toàn bộ bộ sưu tập hoa kẽm nhung thủ công — chọn một bó cho mình, hoặc làm quà cho người thương.
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
            <button
              type="button"
              onClick={() => setSearchText('')}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn size-8"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Bộ lọc */}
      <div className="sticky top-18 z-30 -mx-4 mb-8 bg-paper/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Danh mục">
            {[{ id: 'all', name: ALL }, ...categories].map((cat) => {
              const active = category === cat.name;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateParam('category', cat.name, ALL)}
                  className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                    active ? 'bg-ink text-paper' : 'border border-line bg-surface text-muted hover:border-ink/30 hover:text-ink'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <select
              value={priceId}
              onChange={(e) => updateParam('price', e.target.value, 'all')}
              aria-label="Lọc theo giá"
              className="input h-10 w-auto flex-1 cursor-pointer rounded-full pr-8 lg:flex-none"
            >
              {PRICE_RANGES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value, 'new')}
              aria-label="Sắp xếp"
              className="input h-10 w-auto flex-1 cursor-pointer rounded-full pr-8 lg:flex-none"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="mb-6 flex items-center justify-between text-sm text-muted" aria-live="polite">
          <span>
            <strong className="font-semibold text-ink">{filtered.length}</strong> sản phẩm
          </span>
          {hasFilter && (
            <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 font-medium text-brick hover:underline">
              <X size={14} weight="bold" /> Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : filtered.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-20 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-blush text-brick">
            <FlowerTulip size={30} weight="duotone" />
          </span>
          <h2 className="mt-5 font-display text-2xl">Chưa tìm thấy bó hoa phù hợp</h2>
          <p className="mt-2 max-w-sm text-muted">Thử đổi danh mục, mức giá hoặc từ khóa khác nhé.</p>
          {hasFilter && (
            <button type="button" onClick={resetFilters} className="btn btn-primary mt-6">
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}
