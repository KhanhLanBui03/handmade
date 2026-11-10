import { Fragment, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CaretRight } from '@phosphor-icons/react';
import { formatVND, shortId } from '../../lib/format';
import Pagination from '../Pagination';

const PER_PAGE = 12;
const num = (v) => Number(v) || 0;

/**
 * Lợi nhuận theo từng đơn: mỗi đơn một dòng (doanh thu, giá vốn, lợi nhuận);
 * bấm vào đơn để xem chi tiết từng sản phẩm trong đơn.
 * costOf(item) → giá vốn của 1 món.
 */
export default function OrderProfitTable({ orders, costOf }) {
  const [open, setOpen] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(orders.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pageOrders = orders.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
  const allOpen = pageOrders.length > 0 && pageOrders.every((o) => open.has(o.id));

  const rows = pageOrders.map((o) => {
    const items = (o.items || []).map((it) => {
      const qty = num(it.quantity);
      const revenue = qty * num(it.price);
      const cost = qty * costOf(it);
      return { ...it, qty, revenue, unitCost: costOf(it), cost, profit: revenue - cost };
    });
    const cost = items.reduce((s, i) => s + i.cost, 0);
    // Doanh thu & lợi nhuận CHỈ tính tiền hàng — không gồm ship & phí khác
    const revenue = items.reduce((s, i) => s + i.revenue, 0);
    return { order: o, items, cost, revenue, profit: revenue - cost, qty: items.reduce((s, i) => s + i.qty, 0) };
  });

  const pct = (p, r) => (r > 0 ? Math.round((p / r) * 100) : 0);

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end border-b border-line px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(pageOrders.map((o) => o.id)))}
          className="btn btn-ghost btn-sm text-muted"
        >
          {allOpen ? 'Thu gọn tất cả' : 'Mở tất cả'}
        </button>
      </div>
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-line bg-paper-dim/60 text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="w-10 px-3 py-3.5" />
            <th className="px-3 py-3.5 font-semibold">Ngày</th>
            <th className="px-4 py-3.5 font-semibold">Khách</th>
            <th className="px-4 py-3.5 text-center font-semibold">Số món</th>
            <th className="px-4 py-3.5 text-right font-semibold">Doanh thu</th>
            <th className="px-4 py-3.5 text-right font-semibold">Giá vốn</th>
            <th className="px-4 py-3.5 text-right font-semibold">Lợi nhuận</th>
            <th className="px-4 py-3.5 text-center font-semibold">Tỷ suất</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ order: o, items, cost, revenue, profit, qty }) => {
            const isOpen = open.has(o.id);
            const ship = num(o.shipping_fee);
            const other = num(o.other_fee);
            return (
              <Fragment key={o.id}>
                {/* Dòng đơn — bấm để mở chi tiết */}
                <tr
                  onClick={() => toggle(o.id)}
                  className={`cursor-pointer border-t border-line transition-colors hover:bg-paper-dim/40 ${isOpen ? 'bg-paper-dim/40' : ''}`}
                >
                  <td className="px-3 py-3.5">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Thu gọn chi tiết đơn' : 'Xem chi tiết đơn'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(o.id);
                      }}
                      className="icon-btn size-7"
                    >
                      <CaretRight size={14} weight="bold" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5">
                    <span className="block font-medium">{format(parseISO(o.created_at), 'dd-MM-yyyy')}</span>
                    <span className="text-xs text-muted">#{shortId(o.id)}</span>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{o.customer_name || <span className="font-normal text-muted">Khách lẻ</span>}</td>
                  <td className="px-4 py-3.5 text-center tabular-nums">{qty}</td>
                  <td className="px-4 py-3.5 text-right font-medium tabular-nums">{formatVND(revenue)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-muted">{formatVND(cost)}</td>
                  <td className={`px-4 py-3.5 text-right font-semibold tabular-nums ${profit >= 0 ? 'text-sage' : 'text-brick'}`}>
                    {profit >= 0 ? '+' : ''}
                    {formatVND(profit)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`badge font-semibold ${profit >= 0 ? 'bg-sage-soft text-sage' : 'bg-blush text-brick'}`}>{pct(profit, revenue)}%</span>
                  </td>
                </tr>

                {/* Chi tiết từng sản phẩm trong đơn */}
                {isOpen && (
                  <tr className="bg-paper/60">
                    <td />
                    <td colSpan={7} className="px-3 pb-4 pt-1">
                      <table className="w-full rounded-xl text-xs ring-1 ring-line">
                        <thead className="bg-surface text-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Sản phẩm</th>
                            <th className="px-3 py-2 text-center font-semibold">SL</th>
                            <th className="px-3 py-2 text-right font-semibold">Giá bán</th>
                            <th className="px-3 py-2 text-right font-semibold">Thành tiền</th>
                            <th className="px-3 py-2 text-right font-semibold">Vốn / món</th>
                            <th className="px-3 py-2 text-right font-semibold">Tiền vốn</th>
                            <th className="px-3 py-2 text-right font-semibold">Lãi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line bg-surface">
                          {items.map((it, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-medium text-ink">{it.product_name}</td>
                              <td className="px-3 py-2 text-center tabular-nums">{it.qty}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted">{formatVND(it.price)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatVND(it.revenue)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted">
                                {it.unitCost > 0 ? formatVND(it.unitCost) : <span title="Sản phẩm chưa nhập giá vốn">—</span>}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted">{formatVND(it.cost)}</td>
                              <td className={`px-3 py-2 text-right font-semibold tabular-nums ${it.profit >= 0 ? 'text-sage' : 'text-brick'}`}>
                                {formatVND(it.profit)}
                              </td>
                            </tr>
                          ))}
                          {ship > 0 && (
                            <tr className="text-muted">
                              <td className="px-3 py-2" colSpan={3}>Tiền ship <span className="text-[11px]">(không tính lãi)</span></td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatVND(ship)}</td>
                              <td colSpan={2} />
                              <td className="px-3 py-2 text-right">—</td>
                            </tr>
                          )}
                          {other > 0 && (
                            <tr className="text-muted">
                              <td className="px-3 py-2" colSpan={3}>
                                Phí khác{o.other_fee_name ? ` (${o.other_fee_name})` : ''} <span className="text-[11px]">(không tính lãi)</span>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatVND(other)}</td>
                              <td colSpan={2} />
                              <td className="px-3 py-2 text-right">—</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex justify-center border-t border-line px-4 py-4">
          <Pagination page={curPage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
