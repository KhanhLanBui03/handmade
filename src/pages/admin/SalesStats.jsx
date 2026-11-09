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
import { ChartBar, Package, CurrencyCircleDollar, Receipt, MagnifyingGlass, CaretDown } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { formatVND, getCover } from '../../lib/format';
import { PageHeader, StatCard, Spinner, EmptyState, Thumb, DateField } from '../../components/admin/ui';
import SalesLedger from '../../components/admin/SalesLedger';

// Các khoảng thời gian chọn nhanh
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

const SORTS = [
  { v: 'qty', label: 'Số lượng bán' },
  { v: 'revenue', label: 'Doanh thu' },
];

export default function SalesStats() {
  const [rangeKey, setRangeKey] = useState('this-month');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('qty');
  const [search, setSearch] = useState('');
  const [showUnsold, setShowUnsold] = useState(false);
  const [view, setView] = useState('products'); // 'products' | 'ledger'

  useEffect(() => {
    supabase
      .from('products')
      .select('*') // lấy đủ cột: vẫn chạy được khi Supabase chưa có cột is_hidden
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

  // Cộng dồn theo sản phẩm (ưu tiên khớp theo id, nếu không có thì theo tên)
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
          map.set(key, { key, product: prod || null, name: prod?.name || it.product_name || '(Không tên)', qty: 0, revenue: 0, orders: 0, last: o.created_at });
        }
        const row = map.get(key);
        const qty = Number(it.quantity) || 0;
        row.qty += qty;
        row.revenue += qty * (Number(it.price) || 0);
        if (!seen.has(key)) {
          row.orders += 1;
          seen.add(key);
        }
        if (o.created_at > row.last) row.last = o.created_at;
      });
    });
    return [...map.values()];
  }, [orders, products]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => (sortBy === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty) || b.revenue - a.revenue);
  }, [rows, sortBy, search]);

  const unsold = useMemo(() => {
    const soldIds = new Set(rows.filter((r) => r.product).map((r) => r.product.id));
    return products.filter((p) => !soldIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [rows, products]);

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const max = Math.max(1, ...sorted.map((r) => (sortBy === 'revenue' ? r.revenue : r.qty)));
  const best = [...rows].sort((a, b) => b.qty - a.qty)[0];

  const r = rangeOf(rangeKey, month);
  const rangeLabel = r
    ? `${format(r[0], 'dd-MM-yyyy')} → ${format(r[1], 'dd-MM-yyyy')}`
    : 'Toàn bộ thời gian';

  return (
    <div>
      <PageHeader title="Thống kê bán hàng" description="Tính từ các hóa đơn đã lưu. Chọn khoảng thời gian rồi xem theo sản phẩm hoặc chi tiết từng món." />

      {/* Chế độ xem */}
      <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1 text-sm font-medium" role="tablist">
        {[
          { v: 'products', label: 'Theo sản phẩm' },
          { v: 'ledger', label: 'Chi tiết từng món' },
        ].map((t) => (
          <button
            key={t.v}
            type="button"
            role="tab"
            aria-selected={view === t.v}
            onClick={() => setView(t.v)}
            className={`rounded-lg px-4 py-2 transition-colors ${view === t.v ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bộ lọc thời gian */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {RANGES.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setRangeKey(o.v)}
            aria-pressed={rangeKey === o.v}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              rangeKey === o.v ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
        {rangeKey === 'month' && (
          <DateField type="month" value={month} onChange={(v) => v && setMonth(v)} className="w-36" aria-label="Chọn tháng" />
        )}
        <span className="ml-auto text-sm text-muted">{rangeLabel}</span>
      </div>

      {view === 'ledger' ? (
        <section className="card overflow-hidden">{loading ? <Spinner /> : <SalesLedger orders={orders} />}</section>
      ) : (
      <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Package} label="Tổng sản phẩm đã bán" value={totalQty.toLocaleString('vi-VN')} />
        <StatCard icon={CurrencyCircleDollar} label="Tiền hàng bán ra" value={formatVND(totalRevenue)} tone="sage" hint="Chưa gồm ship & phí khác" />
        <StatCard icon={Receipt} label="Số hóa đơn" value={orders.length} tone="sun" hint={best ? `Bán chạy nhất: ${best.name}` : undefined} />
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ChartBar size={20} className="text-muted" /> Sản phẩm đã bán
            <span className="badge bg-paper-dim text-muted">{sorted.length}</span>
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-56">
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
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sắp xếp theo" className="input h-9 pr-8 text-sm sm:w-56">
              {SORTS.map((s) => (
                <option key={s.v} value={s.v}>
                  Xếp theo {s.label.toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={ChartBar}
            title={search ? 'Không tìm thấy sản phẩm' : 'Chưa bán được sản phẩm nào'}
            text={search ? 'Thử từ khóa khác.' : 'Trong khoảng thời gian này chưa có hóa đơn nào. Thử chọn khoảng thời gian khác.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-paper-dim/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="w-12 px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                  <th className="w-[34%] px-4 py-3 font-semibold">{sortBy === 'revenue' ? 'Doanh thu' : 'Số lượng bán'}</th>
                  <th className="px-4 py-3 text-right font-semibold">{sortBy === 'revenue' ? 'Số lượng' : 'Doanh thu'}</th>
                  <th className="px-4 py-3 text-right font-semibold">Số đơn</th>
                  <th className="px-4 py-3 text-right font-semibold">Bán gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.map((row, i) => {
                  const val = sortBy === 'revenue' ? row.revenue : row.qty;
                  const pct = (val / max) * 100;
                  return (
                    <tr key={row.key} className="transition-colors hover:bg-paper/60">
                      <td className="px-4 py-3 font-semibold tabular-nums text-muted">{i + 1}</td>
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
                        {/* Thanh độ dài theo giá trị — một màu, mép tròn, có số bên cạnh */}
                        <div className="flex items-center gap-3" title={`${row.name}: ${sortBy === 'revenue' ? formatVND(val) : `${val} sản phẩm`}`}>
                          <div className="h-2.5 flex-1 rounded-r bg-paper-dim">
                            <div className="h-full rounded-r bg-brick" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                          <span className="w-24 shrink-0 text-right font-semibold tabular-nums">
                            {sortBy === 'revenue' ? formatVND(val) : val.toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {sortBy === 'revenue' ? row.qty.toLocaleString('vi-VN') : formatVND(row.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{row.orders}</td>
                      <td className="px-4 py-3 text-right text-muted">{format(parseISO(row.last), 'dd-MM-yyyy')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sản phẩm chưa bán được trong khoảng này */}
        {!loading && unsold.length > 0 && !search && (
          <div className="border-t border-line">
            <button
              type="button"
              onClick={() => setShowUnsold((v) => !v)}
              aria-expanded={showUnsold}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted hover:text-ink"
            >
              <span>Chưa bán được trong khoảng này ({unsold.length})</span>
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
      </>
      )}
    </div>
  );
}
