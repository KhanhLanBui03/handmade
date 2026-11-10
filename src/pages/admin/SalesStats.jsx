import { useEffect, useMemo, useState } from 'react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  subWeeks,
} from 'date-fns';
import {
  ChartBar,
  Package,
  CurrencyCircleDollar,
  Receipt,
  TrendUp,
  MagnifyingGlass,
  CaretDown,
  ListDashes,
  ListChecks,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { formatVND, getCover } from '../../lib/format';
import { PageHeader, StatCard, Spinner, EmptyState, Thumb, DateField } from '../../components/admin/ui';
import SalesLedger from '../../components/admin/SalesLedger';
import OrderProfitTable from '../../components/admin/OrderProfitTable';
import InvoiceList from '../../components/admin/InvoiceList';
import Pagination from '../../components/Pagination';

const WEEK = { weekStartsOn: 1 }; // tuần bắt đầu từ thứ Hai
const RANGES = [
  { v: 'this-week', label: 'Tuần này' },
  { v: 'last-week', label: 'Tuần trước' },
  { v: 'this-month', label: 'Tháng này' },
  { v: 'last-month', label: 'Tháng trước' },
  { v: '30d', label: '30 ngày qua' },
  { v: 'this-year', label: 'Năm nay' },
  { v: 'all', label: 'Tất cả' },
  { v: 'month', label: 'Chọn tháng' },
];

function rangeOf(v, month) {
  const now = new Date();
  switch (v) {
    case 'this-week':
      return [startOfWeek(now, WEEK), endOfDay(now)];
    case 'last-week': {
      const w = subWeeks(now, 1);
      return [startOfWeek(w, WEEK), endOfWeek(w, WEEK)];
    }
    case 'this-month':
      return [startOfMonth(now), endOfDay(now)];
    case 'last-month': {
      const m = subMonths(now, 1);
      return [startOfMonth(m), endOfMonth(m)];
    }
    case '30d':
      return [startOfDay(subDays(now, 29)), endOfDay(now)];
    case 'this-year':
      return [startOfYear(now), endOfDay(now)];
    case 'month': {
      if (!month) return null;
      const m = parseISO(`${month}-01`);
      return [startOfMonth(m), endOfMonth(m)];
    }
    default:
      return null; // tất cả
  }
}

const TABS = [
  { v: 'invoices', label: 'Hóa đơn', icon: Receipt },
  { v: 'ledger', label: 'Doanh thu', icon: ListChecks }, // chi tiết từng sản phẩm bán ra
  { v: 'profit', label: 'Lợi nhuận', icon: TrendUp },
  { v: 'products', label: 'Tổng hợp', icon: ChartBar }, // gộp theo sản phẩm
];
const PRODUCTS_PER_PAGE = 12;
const SORTS = [
  { v: 'qty', label: 'Số lượng bán' },
  { v: 'revenue', label: 'Doanh thu' },
  { v: 'profit', label: 'Lợi nhuận' },
];

const num = (v) => Number(v) || 0;

export default function SalesStats() {
  const [tab, setTab] = useState('invoices');
  const [rangeKey, setRangeKey] = useState('this-month');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Tab "Tổng hợp theo sản phẩm"
  const [sortBy, setSortByRaw] = useState('qty');
  const [search, setSearchRaw] = useState('');
  const [prodFilter, setProdFilterRaw] = useState(''); // lọc theo một sản phẩm cụ thể (key)
  const [showUnsold, setShowUnsold] = useState(false);
  const [prodPage, setProdPage] = useState(1);
  const setSortBy = (v) => { setSortByRaw(v); setProdPage(1); };
  const setSearch = (v) => { setSearchRaw(v); setProdPage(1); };
  const setProdFilter = (v) => { setProdFilterRaw(v); setProdPage(1); };

  useEffect(() => {
    supabase
      .from('products')
      .select('*') // đủ cột: media (ảnh), cost (giá vốn), is_hidden
      .then(({ data }) => setProducts(data || []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      // Supabase chỉ trả tối đa 1000 dòng mỗi lần → tải từng đợt cho đến hết
      const r = rangeOf(rangeKey, month);
      const PAGE = 1000;
      const all = [];
      for (let from = 0; ; from += PAGE) {
        let q = supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (r) q = q.gte('created_at', r[0].toISOString()).lte('created_at', r[1].toISOString());
        const { data, error } = await q;
        if (cancelled) return;
        if (error || !data) break;
        all.push(...data);
        if (data.length < PAGE) break;
      }
      setOrders(all);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [rangeKey, month]);

  // Giá vốn mỗi món theo sản phẩm
  const costMap = useMemo(() => {
    const m = {};
    products.forEach((p) => (m[p.id] = num(p.cost)));
    return m;
  }, [products]);
  const costOf = (it) => costMap[it.product_id] || 0;

  // Tổng tiền thực thu cả khoảng (gồm ship & phí khác) — chỉ dùng cho ghi chú, KHÔNG dùng tính lãi
  const collected = orders.reduce((s, o) => s + num(o.total_amount), 0);

  // Cộng dồn theo sản phẩm (khớp theo id, nếu không có thì theo tên) — gồm doanh thu, vốn, lợi nhuận
  const rows = useMemo(() => {
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));
    const map = new Map();
    orders.forEach((o) => {
      const seen = new Set();
      (o.items || []).forEach((it) => {
        const prod = byId.get(String(it.product_id)) || byName.get(String(it.product_name || '').trim().toLowerCase());
        const key = prod ? `p:${prod.id}` : `n:${String(it.product_name || '').trim().toLowerCase()}`;
        if (!map.has(key)) {
          map.set(key, { key, product: prod || null, name: prod?.name || it.product_name || '(Không tên)', qty: 0, revenue: 0, cost: 0, profit: 0, orders: 0, last: o.created_at });
        }
        const row = map.get(key);
        const qty = num(it.quantity);
        const rev = qty * num(it.price);
        const cost = qty * (costMap[it.product_id] || 0);
        row.qty += qty;
        row.revenue += rev;
        row.cost += cost;
        row.profit += rev - cost;
        if (!seen.has(key)) {
          row.orders += 1;
          seen.add(key);
        }
        if (o.created_at > row.last) row.last = o.created_at;
      });
    });
    return [...map.values()];
  }, [orders, products, costMap]);

  // Danh sách sản phẩm để chọn trong bộ lọc cột (đã bán, theo tên)
  const prodOptions = useMemo(
    () => [...rows].sort((a, b) => a.name.localeCompare(b.name, 'vi')).map((r) => ({ key: r.key, name: r.name })),
    [rows],
  );

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const metric = (r) => (sortBy === 'revenue' ? r.revenue : sortBy === 'profit' ? r.profit : r.qty);
    return rows
      .filter((r) => (!prodFilter || r.key === prodFilter) && (!q || r.name.toLowerCase().includes(q)))
      .sort((a, b) => metric(b) - metric(a) || b.revenue - a.revenue);
  }, [rows, sortBy, search, prodFilter]);

  // 4 ô tổng ở tab Tổng hợp — tự cập nhật theo bộ lọc/tìm sản phẩm (tiền hàng, chưa gồm ship)
  const prodTotals = useMemo(
    () =>
      sorted.reduce(
        (a, r) => ({ qty: a.qty + r.qty, revenue: a.revenue + r.revenue, cost: a.cost + r.cost, profit: a.profit + r.profit }),
        { qty: 0, revenue: 0, cost: 0, profit: 0 },
      ),
    [sorted],
  );
  const prodMargin = prodTotals.revenue > 0 ? Math.round((prodTotals.profit / prodTotals.revenue) * 100) : 0;
  const isProdFiltered = !!prodFilter || !!search.trim();

  // Tổng kết sản phẩm cả khoảng (không lọc) — lãi CHỈ tính tiền hàng − giá vốn (không gồm ship & phí khác).
  // Nhờ vậy số ở tab Lợi nhuận và tab Tổng hợp (khi không lọc) luôn bằng nhau.
  const allProd = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({ qty: a.qty + r.qty, revenue: a.revenue + r.revenue, cost: a.cost + r.cost, profit: a.profit + r.profit }),
        { qty: 0, revenue: 0, cost: 0, profit: 0 },
      ),
    [rows],
  );
  const allMargin = allProd.revenue > 0 ? Math.round((allProd.profit / allProd.revenue) * 100) : 0;

  const unsold = useMemo(() => {
    const soldIds = new Set(rows.filter((r) => r.product).map((r) => r.product.id));
    return products.filter((p) => !soldIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [rows, products]);

  const maxQty = Math.max(1, ...sorted.map((r) => r.qty));
  const prodTotalPages = Math.max(1, Math.ceil(sorted.length / PRODUCTS_PER_PAGE));
  const prodCurPage = Math.min(prodPage, prodTotalPages);
  const pageProducts = sorted.slice((prodCurPage - 1) * PRODUCTS_PER_PAGE, prodCurPage * PRODUCTS_PER_PAGE);

  const r = rangeOf(rangeKey, month);
  const rangeLabel = r ? `${format(r[0], 'dd-MM-yyyy')} → ${format(r[1], 'dd-MM-yyyy')}` : 'Toàn bộ thời gian';

  return (
    <div>
      <PageHeader
        title="Thống kê"
        description="Hóa đơn, doanh thu, lợi nhuận và sản phẩm bán ra — tất cả trong một chỗ, theo khoảng thời gian bạn chọn."
      />

      {/* Tab */}
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.v}
            type="button"
            role="tab"
            aria-selected={tab === t.v}
            onClick={() => setTab(t.v)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.v ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Bộ lọc thời gian — gọn, dùng chung cho mọi tab */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {RANGES.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setRangeKey(o.v)}
            aria-pressed={rangeKey === o.v}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              rangeKey === o.v ? 'bg-brick text-white' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
        {rangeKey === 'month' && (
          <DateField type="month" value={month} onChange={(v) => v && setMonth(v)} className="w-32 [&_.input]:h-8 [&_.input]:text-xs" aria-label="Chọn tháng" />
        )}
        <span className="ml-auto text-xs text-muted">{rangeLabel}</span>
      </div>

      {/* 4 ô tổng — chỉ ở tab Lợi nhuận & Tổng hợp; tab Tổng hợp tự cập nhật theo bộ lọc sản phẩm */}
      {(tab === 'profit' || tab === 'products') && (
        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {tab === 'products' ? (
            <>
              <StatCard compact icon={CurrencyCircleDollar} label="Doanh thu" value={formatVND(prodTotals.revenue)} tone="brick" hint={isProdFiltered ? 'Sản phẩm đã lọc' : 'Tiền hàng (chưa gồm ship)'} />
              <StatCard compact icon={Receipt} label="Giá vốn" value={formatVND(prodTotals.cost)} tone="sun" hint="Tổng vốn nguyên liệu" />
              <StatCard compact icon={TrendUp} label="Lợi nhuận" value={formatVND(prodTotals.profit)} tone="sage" hint={prodTotals.revenue > 0 ? `Lãi ${prodMargin}%` : undefined} />
              <StatCard compact icon={Package} label="Đã bán" value={`${prodTotals.qty.toLocaleString('vi-VN')} món`} hint={`${sorted.length} loại sản phẩm`} />
            </>
          ) : (
            <>
              <StatCard compact icon={CurrencyCircleDollar} label="Doanh thu" value={formatVND(allProd.revenue)} tone="brick" hint="Tiền hàng (chưa gồm ship)" />
              <StatCard compact icon={Receipt} label="Chi phí vốn" value={formatVND(allProd.cost)} tone="sun" hint="Tổng vốn nguyên liệu" />
              <StatCard compact icon={TrendUp} label="Lợi nhuận" value={formatVND(allProd.profit)} tone="sage" hint={allProd.revenue > 0 ? `Lãi ${allMargin}% · chưa gồm ship` : undefined} />
              <StatCard compact icon={Package} label="Đã bán" value={`${allProd.qty.toLocaleString('vi-VN')} món`} hint={`${orders.length} hóa đơn · thực thu ${formatVND(collected)}`} />
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="card"><Spinner /></div>
      ) : orders.length === 0 && tab !== 'products' ? (
        <div className="card">
          <EmptyState icon={Receipt} title="Chưa có hóa đơn nào" text="Trong khoảng thời gian này chưa có hóa đơn. Thử chọn khoảng thời gian khác." />
        </div>
      ) : tab === 'invoices' ? (
        <div className="card overflow-hidden">
          <InvoiceList orders={orders} setOrders={setOrders} products={products} costOf={costOf} />
        </div>
      ) : tab === 'ledger' ? (
        <section className="card overflow-hidden">
          <SalesLedger orders={orders} />
        </section>
      ) : tab === 'profit' ? (
        <div className="card overflow-hidden">
          <OrderProfitTable orders={orders} costOf={costOf} />
        </div>
      ) : (
        /* Tổng hợp theo sản phẩm */
        <section className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ChartBar size={20} className="text-muted" /> Sản phẩm đã bán
              <span className="badge bg-paper-dim text-muted">{sorted.length}</span>
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <div className="relative sm:w-48">
                <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm sản phẩm..."
                  aria-label="Tìm sản phẩm"
                  className="input h-9 pl-9 text-sm"
                />
              </div>
              <select
                value={prodFilter}
                onChange={(e) => setProdFilter(e.target.value)}
                aria-label="Lọc theo sản phẩm"
                className="input h-9 pr-8 text-sm sm:w-48"
              >
                <option value="">Tất cả sản phẩm</option>
                {prodOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.name}
                  </option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sắp xếp theo" className="input h-9 pr-8 text-sm sm:w-48">
                {SORTS.map((s) => (
                  <option key={s.v} value={s.v}>
                    Xếp theo {s.label.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isProdFiltered && (
            <div className="flex items-center justify-between gap-2 border-b border-line bg-blush/30 px-4 py-2 text-xs">
              <span className="text-brick">Đang lọc — 4 ô tổng ở trên tính theo {sorted.length} sản phẩm hiển thị.</span>
              <button
                type="button"
                onClick={() => {
                  setProdFilter('');
                  setSearch('');
                }}
                className="font-medium text-ink hover:text-brick"
              >
                Bỏ lọc
              </button>
            </div>
          )}

          {sorted.length === 0 ? (
            <EmptyState
              icon={ChartBar}
              title={search ? 'Không tìm thấy sản phẩm' : 'Chưa bán được sản phẩm nào'}
              text={search ? 'Thử từ khóa khác.' : 'Trong khoảng thời gian này chưa có hóa đơn nào. Thử chọn khoảng thời gian khác.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-paper-dim/60 text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="w-10 px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                    <th className="w-[22%] px-4 py-3 font-semibold">Số lượng bán</th>
                    <th className="px-4 py-3 text-right font-semibold">Doanh thu</th>
                    <th className="px-4 py-3 text-right font-semibold">Giá vốn</th>
                    <th className="px-4 py-3 text-right font-semibold">Lợi nhuận</th>
                    <th className="px-3 py-3 text-right font-semibold">Số đơn</th>
                    <th className="px-4 py-3 text-right font-semibold">Gần nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pageProducts.map((row, i) => {
                    const margin = row.revenue > 0 ? Math.round((row.profit / row.revenue) * 100) : 0;
                    return (
                      <tr key={row.key} className="transition-colors hover:bg-paper/60">
                        <td className="px-4 py-3 font-semibold tabular-nums text-muted">{(prodCurPage - 1) * PRODUCTS_PER_PAGE + i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Thumb src={row.product ? getCover(row.product) : null} className="size-10" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{row.name}</span>
                              {!row.product && <span className="text-xs text-muted">Sản phẩm đã xóa</span>}
                              {row.product?.is_hidden && <span className="text-xs text-muted">Đang ẩn với khách</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 flex-1 rounded-r bg-paper-dim">
                              <div className="h-full rounded-r bg-brick" style={{ width: `${Math.max((row.qty / maxQty) * 100, 2)}%` }} />
                            </div>
                            <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{row.qty.toLocaleString('vi-VN')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">{formatVND(row.revenue)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted">{row.cost > 0 ? formatVND(row.cost) : '—'}</td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.profit >= 0 ? 'text-sage' : 'text-brick'}`}>
                          {row.profit >= 0 ? '+' : ''}
                          {formatVND(row.profit)}
                          {row.revenue > 0 && <span className="ml-1 text-xs font-normal text-muted">({margin}%)</span>}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted">{row.orders}</td>
                        <td className="px-4 py-3 text-right text-muted">{format(parseISO(row.last), 'dd-MM-yyyy')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {prodTotalPages > 1 && (
                <div className="flex justify-center border-t border-line px-4 py-4">
                  <Pagination page={prodCurPage} totalPages={prodTotalPages} onChange={setProdPage} />
                </div>
              )}
            </div>
          )}

          {/* Sản phẩm chưa bán được trong khoảng này */}
          {unsold.length > 0 && !search && !prodFilter && (
            <div className="border-t border-line">
              <button
                type="button"
                onClick={() => setShowUnsold((v) => !v)}
                aria-expanded={showUnsold}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted hover:text-ink"
              >
                <span className="flex items-center gap-2">
                  <ListDashes size={16} /> Chưa bán được trong khoảng này ({unsold.length})
                </span>
                <CaretDown size={16} className={`transition-transform ${showUnsold ? 'rotate-180' : ''}`} />
              </button>
              {showUnsold && (
                <ul className="grid gap-2 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                  {unsold.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line p-2">
                      <Thumb src={getCover(p)} className="size-9" />
                      <span className="min-w-0 truncate text-sm">{p.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
