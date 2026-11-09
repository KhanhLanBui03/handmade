import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { FileXls, ListBullets } from '@phosphor-icons/react';
import { formatVND, shortId } from '../../lib/format';
import { EmptyState } from './ui';
import Pagination from '../Pagination';

const PER_PAGE = 30; // số hóa đơn mỗi trang

const num = (v) => Number(v) || 0;
const money = (v) => (num(v) > 0 ? num(v).toLocaleString('vi-VN') : '–');

/**
 * Sổ bán hàng: mỗi món một dòng; ngày, khách, phí ship, phí khác, tổng hóa đơn
 * chỉ hiện 1 lần cho mỗi hóa đơn (gộp ô dọc).
 */
export default function SalesLedger({ orders }) {
  const [pageState, setPageState] = useState({ page: 1, orders });
  // Đổi khoảng thời gian (danh sách mới) thì quay về trang 1
  const page = pageState.orders === orders ? pageState.page : 1;
  const setPage = (p) => setPageState({ page: p, orders });
  const totalPages = Math.max(1, Math.ceil(orders.length / PER_PAGE));
  const pageOrders = orders.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const summary = useMemo(() => {
    let goods = 0;
    let qty = 0;
    let ship = 0;
    let other = 0;
    let collected = 0;
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        qty += num(it.quantity);
        goods += num(it.quantity) * num(it.price);
      });
      ship += num(o.shipping_fee);
      other += num(o.other_fee);
      collected += num(o.total_amount);
    });
    return { goods, qty, ship, other, collected };
  }, [orders]);

  const exportCsv = () => {
    const head = ['Ngày', 'Giờ', 'Mã hóa đơn', 'Tên khách', 'Sản phẩm', 'Số lượng', 'Giá bán', 'Thành tiền', 'Phí ship', 'Phí khác', 'Tổng hóa đơn'];
    const lines = [head];
    orders.forEach((o) => {
      const d = parseISO(o.created_at);
      (o.items || []).forEach((it, i) => {
        const first = i === 0; // phí & tổng chỉ ghi ở dòng đầu để cộng trong Excel không bị trùng
        lines.push([
          format(d, 'dd-MM-yyyy'),
          format(d, 'HH:mm'),
          shortId(o.id),
          o.customer_name || '',
          it.product_name || '',
          num(it.quantity),
          num(it.price),
          num(it.quantity) * num(it.price),
          first ? num(o.shipping_fee) : '',
          first ? num(o.other_fee) : '',
          first ? num(o.total_amount) : '',
        ]);
      });
    });
    const csv = lines.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }); // BOM để Excel đọc đúng tiếng Việt
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `so-ban-hang-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ListBullets}
        title="Chưa có món nào được bán"
        text="Trong khoảng thời gian này chưa có hóa đơn. Thử chọn khoảng thời gian khác."
      />
    );
  }

  return (
    <div>
      {/* Tổng kết */}
      <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
        <Summary label="Tổng tiền sản phẩm" value={formatVND(summary.goods)} strong />
        <Summary label="Số lượng món bán" value={summary.qty.toLocaleString('vi-VN')} strong />
        <Summary label="Số hóa đơn" value={orders.length.toLocaleString('vi-VN')} />
        <Summary label="Phí ship + phí khác" value={formatVND(summary.ship + summary.other)} />
        <Summary label="Tổng thu (gồm phí)" value={formatVND(summary.collected)} />
      </div>

      <div className="flex justify-end px-4 py-3">
        <button type="button" onClick={exportCsv} className="btn btn-outline btn-sm">
          <FileXls size={16} /> Tải file Excel
        </button>
      </div>

      {/* Khung cuộn riêng: tiêu đề cột ghim trên, dòng tổng ghim dưới */}
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-paper-dim">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Ngày</th>
              <th className="px-4 py-3 font-semibold">Tên khách</th>
              <th className="px-4 py-3 font-semibold">Sản phẩm</th>
              <th className="px-3 py-3 text-center font-semibold">SL</th>
              <th className="px-4 py-3 text-right font-semibold">Giá bán</th>
              <th className="px-4 py-3 text-right font-semibold">Thành tiền</th>
              <th className="px-4 py-3 text-right font-semibold">Phí ship</th>
              <th className="px-4 py-3 text-right font-semibold">Phí khác</th>
              <th className="px-4 py-3 text-right font-semibold">Tổng hóa đơn</th>
            </tr>
          </thead>
          {pageOrders.map((o) => {
            const items = o.items?.length ? o.items : [{ product_name: '(Không có món)', quantity: 0, price: 0 }];
            const span = items.length;
            const d = parseISO(o.created_at);
            return (
              // Mỗi hóa đơn là một nhóm dòng, viền đậm ngăn giữa các hóa đơn
              <tbody key={o.id} className="[&>tr:first-child>td]:border-t-2 [&>tr:first-child>td]:border-line">
                {items.map((it, i) => (
                  <tr key={i} className={i > 0 ? '[&>td]:border-t [&>td]:border-line/60' : ''}>
                    {i === 0 && (
                      <>
                        <td rowSpan={span} className="whitespace-nowrap px-4 py-3 align-top">
                          <span className="block font-medium">{format(d, 'dd-MM-yyyy')}</span>
                          <span className="text-xs text-muted">{format(d, 'HH:mm')} · #{shortId(o.id)}</span>
                        </td>
                        <td rowSpan={span} className="px-4 py-3 align-top font-medium">
                          {o.customer_name || <span className="font-normal text-muted">Khách lẻ</span>}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3">{it.product_name}</td>
                    <td className="px-3 py-3 text-center tabular-nums">{num(it.quantity)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{money(it.price)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{money(num(it.quantity) * num(it.price))}</td>
                    {i === 0 && (
                      <>
                        <td rowSpan={span} className="px-4 py-3 text-right align-top tabular-nums text-muted">{money(o.shipping_fee)}</td>
                        <td rowSpan={span} className="px-4 py-3 text-right align-top tabular-nums text-muted">{money(o.other_fee)}</td>
                        <td rowSpan={span} className="px-4 py-3 text-right align-top font-semibold tabular-nums text-brick">
                          {money(o.total_amount)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            );
          })}
          <tfoot className="font-semibold [&_td]:sticky [&_td]:bottom-0 [&_td]:border-t-2 [&_td]:border-ink/20 [&_td]:bg-paper-dim">
            <tr>
              <td colSpan={3} className="px-4 py-3">
                Tổng cộng <span className="font-normal text-muted">({orders.length.toLocaleString('vi-VN')} hóa đơn, mọi trang)</span>
              </td>
              <td className="px-3 py-3 text-center tabular-nums">{summary.qty.toLocaleString('vi-VN')}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right tabular-nums">{summary.goods.toLocaleString('vi-VN')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{summary.ship.toLocaleString('vi-VN')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{summary.other.toLocaleString('vi-VN')}</td>
              <td className="px-4 py-3 text-right tabular-nums text-brick">{summary.collected.toLocaleString('vi-VN')}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2 border-t border-line px-4 py-4">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          <p className="text-xs text-muted">
            Hóa đơn {((page - 1) * PER_PAGE + 1).toLocaleString('vi-VN')}–{Math.min(page * PER_PAGE, orders.length).toLocaleString('vi-VN')} /{' '}
            {orders.length.toLocaleString('vi-VN')}
          </p>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, strong }) {
  return (
    <div className="bg-surface px-4 py-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 tabular-nums tracking-tight ${strong ? 'text-xl font-semibold text-ink' : 'text-lg font-semibold text-ink/80'}`}>
        {value}
      </p>
    </div>
  );
}
