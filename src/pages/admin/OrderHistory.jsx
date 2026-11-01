import { useState, useEffect, useRef } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { Printer, CalendarBlank, Receipt, X, CurrencyCircleDollar, Package } from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { formatVND, shortId } from '../../lib/format';
import { InvoicePrint } from '../../components/InvoicePrint';
import { PageHeader, StatCard, Spinner, EmptyState } from '../../components/admin/ui';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  const printRef = useRef();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Hoa_Don_Tram_Hoa_Nho',
    onAfterPrint: () => setSelectedOrder(null),
  });

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (dateFilter) {
        const d = new Date(`${dateFilter}T00:00:00`);
        query = query.gte('created_at', startOfDay(d).toISOString()).lte('created_at', endOfDay(d).toISOString());
      }
      const { data } = await query;
      setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();
  }, [dateFilter]);

  // In sau khi đơn được chọn đã render vào DOM
  useEffect(() => {
    if (selectedOrder) handlePrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder]);

  const revenue = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const units = orders.reduce((s, o) => s + (o.items || []).reduce((a, i) => a + Number(i.quantity || 0), 0), 0);

  return (
    <div>
      <PageHeader
        title="Hóa đơn"
        description={dateFilter ? `Các hóa đơn ngày ${format(new Date(`${dateFilter}T00:00:00`), 'dd/MM/yyyy')}` : 'Tất cả hóa đơn đã lưu'}
        actions={
          <div className="flex items-center gap-2">
            <label className="relative">
              <span className="sr-only">Lọc theo ngày</span>
              <CalendarBlank size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input w-auto pl-10"
              />
            </label>
            {dateFilter && (
              <button type="button" onClick={() => setDateFilter('')} className="btn btn-ghost btn-sm">
                <X size={14} weight="bold" /> Bỏ lọc
              </button>
            )}
          </div>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={CurrencyCircleDollar} label="Doanh thu" value={formatVND(revenue)} />
        <StatCard icon={Receipt} label="Số hóa đơn" value={orders.length} tone="sage" />
        <StatCard icon={Package} label="Sản phẩm đã bán" value={units} tone="sun" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState icon={Receipt} title="Không tìm thấy hóa đơn nào" text={dateFilter ? 'Thử chọn ngày khác.' : 'Hóa đơn sẽ xuất hiện sau khi bạn lưu ở màn hình Bán hàng.'} />
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6">
                <div className="md:w-44 md:shrink-0">
                  <span className="badge bg-paper-dim font-mono font-semibold text-ink">#{shortId(order.id)}</span>
                  <p className="mt-2 text-sm text-muted">{format(parseISO(order.created_at), 'dd/MM/yyyy · HH:mm')}</p>
                </div>

                <ul className="flex-1 space-y-1.5 text-sm">
                  {(order.items || []).map((item, idx) => (
                    <li key={idx} className="flex justify-between gap-4">
                      <span>
                        <span className="font-semibold text-muted">{item.quantity}×</span> {item.product_name}
                      </span>
                      <span className="shrink-0 text-muted">{formatVND(item.quantity * item.price)}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-4 border-t border-line pt-4 md:w-48 md:flex-col md:items-end md:border-0 md:pt-0">
                  <p className="text-lg font-semibold text-brick">{formatVND(order.total_amount)}</p>
                  <button type="button" onClick={() => setSelectedOrder(order)} className="btn btn-outline btn-sm">
                    <Printer size={16} /> In / Xuất PDF
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bản in ẩn */}
      <div className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <InvoicePrint ref={printRef} order={selectedOrder} />
      </div>
    </div>
  );
}
