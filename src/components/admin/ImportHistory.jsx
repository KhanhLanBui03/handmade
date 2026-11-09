import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Trash,
  ClockCounterClockwise,
  CurrencyCircleDollar,
  Receipt,
  Stack,
  X,
  Storefront,
  NotePencil,
  Shapes,
  ListDashes,
  PencilSimple,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { formatVND, formatQty, normalizeText, shortId } from '../../lib/format';
import { StatCard, Spinner, EmptyState, DateField } from './ui';
import Pagination from '../Pagination';

const num = (v) => Number(v) || 0;
const PER_PAGE = { records: 10, summary: 15 };

// Lịch sử phiếu nhập: lọc theo tháng, thống kê, xem theo phiếu hoặc cộng dồn theo nguyên liệu
export default function ImportHistory({ imports, loading, onDelete, onEdit, editingId }) {
  const [month, setMonthRaw] = useState(''); // "2026-11"
  const [viewMode, setViewModeRaw] = useState('records'); // 'records' | 'summary'
  const [search, setSearchRaw] = useState('');
  const [page, setPage] = useState(1);
  // Đổi bộ lọc thì quay về trang 1
  const setMonth = (v) => { setMonthRaw(v); setPage(1); };
  const setViewMode = (v) => { setViewModeRaw(v); setPage(1); };
  const setSearch = (v) => { setSearchRaw(v); setPage(1); };

  const visible = useMemo(
    () => (month ? imports.filter((r) => String(r.import_date).startsWith(month)) : imports),
    [imports, month],
  );

  const totalCost = visible.reduce((s, r) => s + Number(r.total_cost || 0), 0);
  const totalQty = visible.reduce(
    (s, r) => s + (r.items || []).reduce((a, i) => a + num(i.quantity), 0),
    0,
  );

  // Thống kê cộng dồn theo từng nguyên liệu trong danh sách hiện tại
  const materialSummary = useMemo(() => {
    const map = {};
    visible.forEach((r) => {
      (r.items || []).forEach((it) => {
        const name = (it.name || '').trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!map[key]) {
          map[key] = {
            name,
            unit: it.unit || 'cái',
            totalQty: 0,
            totalCost: 0,
            importCount: 0,
            latestPrice: num(it.unit_price),
          };
        }
        const qty = num(it.quantity);
        const price = num(it.unit_price);
        map[key].totalQty += qty;
        map[key].totalCost += Math.round(qty * price);
        map[key].importCount += 1;
        if (price > 0) map[key].latestPrice = price;
      });
    });
    return Object.values(map).sort((a, b) => b.totalCost - a.totalCost);
  }, [visible]);

  // Tìm kiếm: theo phiếu (mã, ngày, nơi mua, ghi chú, tên nguyên liệu) hoặc theo tên nguyên liệu
  const q = normalizeText(search);
  const list = useMemo(() => {
    if (viewMode === 'summary') return q ? materialSummary.filter((m) => normalizeText(m.name).includes(q)) : materialSummary;
    if (!q) return visible;
    return visible.filter((r) =>
      normalizeText(
        [
          shortId(r.id),
          format(parseISO(r.import_date), 'dd-MM-yyyy'),
          r.supplier,
          r.note,
          ...(r.items || []).map((i) => i.name),
        ].join(' '),
      ).includes(q),
    );
  }, [viewMode, q, visible, materialSummary]);

  const perPage = PER_PAGE[viewMode];
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const curPage = Math.min(page, totalPages);
  const pageItems = list.slice((curPage - 1) * perPage, curPage * perPage);

  return (
    <section aria-labelledby="import-history-title">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="import-history-title" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ClockCounterClockwise size={22} className="text-muted" /> Lịch sử & Thống kê nhập hàng
          </h2>
          <p className="mt-1 text-sm text-muted">
            {month
              ? `Số liệu trong tháng ${month.split('-').reverse().join('-')}`
              : 'Tổng hợp toàn bộ từ trước đến hiện tại'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nút chuyển chế độ xem */}
          <div className="flex rounded-xl border border-line bg-paper p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('records')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${viewMode === 'records' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
            >
              <ListDashes size={16} /> Theo phiếu nhập
            </button>
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${viewMode === 'summary' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
            >
              <Shapes size={16} /> Cộng dồn nguyên liệu
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="sr-only" htmlFor="import-month">
              Lọc theo tháng
            </label>
            <DateField
              id="import-month"
              type="month"
              value={month}
              onChange={setMonth}
              className="w-36"
            />
            {month && (
              <button type="button" onClick={() => setMonth('')} className="btn btn-ghost btn-sm">
                <X size={14} weight="bold" /> Bỏ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard icon={CurrencyCircleDollar} label="Tổng tiền nhập" value={formatVND(totalCost)} />
        <StatCard icon={Receipt} label="Số phiếu nhập" value={visible.length} tone="sage" />
        <StatCard icon={Stack} label="Tổng số lượng đã nhập" value={formatQty(totalQty)} tone="sun" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-80">
            <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={viewMode === 'summary' ? 'Tìm nguyên liệu...' : 'Tìm theo nguyên liệu, nơi mua, ghi chú, mã phiếu...'}
              aria-label="Tìm trong lịch sử nhập hàng"
              className="input h-9 pl-9 text-sm"
            />
          </div>
          {!loading && (
            <span className="text-xs text-muted">
              {search ? `Tìm thấy ${list.length}` : list.length} {viewMode === 'summary' ? 'nguyên liệu' : 'phiếu nhập'}
            </span>
          )}
        </div>
        {loading ? (
          <Spinner />
        ) : list.length === 0 && search ? (
          <EmptyState icon={MagnifyingGlass} title="Không tìm thấy kết quả" text="Thử từ khóa khác, hoặc bỏ lọc tháng." />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ClockCounterClockwise}
            title="Chưa có phiếu nhập nào"
            text={
              month
                ? 'Không có phiếu nhập trong tháng này.'
                : 'Phiếu nhập sẽ hiện ở đây sau khi bạn bấm Lưu phiếu nhập.'
            }
          />
        ) : viewMode === 'summary' ? (
          /* BẢNG CỘNG DỒN NGUYÊN LIỆU */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper-dim/60 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Tên nguyên liệu</th>
                  <th className="px-4 py-3 font-semibold">Đơn vị</th>
                  <th className="px-4 py-3 font-semibold text-right">Tổng số lượng đã nhập</th>
                  <th className="px-4 py-3 font-semibold text-right">Đơn giá gần nhất</th>
                  <th className="px-5 py-3 font-semibold text-right">Tổng tiền chi (Cộng dồn)</th>
                  <th className="px-4 py-3 font-semibold text-center">Số lần nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-paper-dim/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-ink">
                      <span className="flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blush text-brick text-xs">
                          <Shapes size={14} weight="duotone" />
                        </span>
                        {item.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{item.unit}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-ink">
                      {formatQty(item.totalQty)} {item.unit}
                    </td>
                    <td className="px-4 py-3.5 text-right text-muted">
                      {item.latestPrice > 0 ? formatVND(item.latestPrice) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-brick text-base">
                      {formatVND(item.totalCost)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs text-muted">
                      <span className="badge bg-paper-dim">{item.importCount} lần</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* DANH SÁCH THEO PHIẾU NHẬP */
          <ul className="divide-y divide-line">
            {pageItems.map((r) => (
              <li
                key={r.id}
                className={`flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6 ${editingId === r.id ? 'bg-blush/40' : ''}`}
              >
                <div className="md:w-48 md:shrink-0">
                  <span className="badge bg-paper-dim font-mono font-semibold text-ink">#{shortId(r.id)}</span>
                  <p className="mt-2 text-sm font-medium">
                    Ngày nhập {format(parseISO(r.import_date), 'dd-MM-yyyy')}
                  </p>
                  <p className="text-xs text-muted">Lưu lúc {format(parseISO(r.created_at), 'HH:mm dd-MM-yyyy')}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <ul className="space-y-1.5 text-sm">
                    {(r.items || []).map((it, idx) => (
                      <li key={idx} className="flex justify-between gap-4">
                        <span className="min-w-0">
                          <span className="font-semibold text-muted">
                            {formatQty(it.quantity)} {it.unit || ''}
                          </span>{' '}
                          × {it.name}
                          {it.unit_price > 0 && <span className="text-muted"> · {formatVND(it.unit_price)}</span>}
                        </span>
                        <span className="shrink-0 text-muted">{formatVND(Math.round(num(it.quantity) * num(it.unit_price)))}</span>
                      </li>
                    ))}
                  </ul>
                  {(r.supplier || r.note) && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                      {r.supplier && (
                        <span className="inline-flex items-center gap-1">
                          <Storefront size={14} /> {r.supplier}
                        </span>
                      )}
                      {r.note && (
                        <span className="inline-flex items-center gap-1">
                          <NotePencil size={14} /> {r.note}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-line pt-4 md:w-44 md:flex-col md:items-end md:border-0 md:pt-0">
                  <p className="text-lg font-semibold text-brick">{formatVND(r.total_cost)}</p>
                  <div className="flex gap-1 md:flex-col md:items-end">
                  <button
                    type="button"
                    onClick={() => onEdit(r)}
                    disabled={editingId === r.id}
                    className="btn btn-ghost btn-sm text-muted hover:text-ink disabled:opacity-60"
                  >
                    <PencilSimple size={16} /> {editingId === r.id ? 'Đang sửa' : 'Sửa phiếu'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(r)}
                    className="btn btn-ghost btn-sm text-muted hover:bg-brick/10 hover:text-brick"
                  >
                    <Trash size={16} /> Xóa phiếu
                  </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="mt-4">
          <Pagination page={curPage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </section>
  );
}
