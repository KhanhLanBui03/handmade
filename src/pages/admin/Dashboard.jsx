import { useState, useEffect, useMemo } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import {
  CheckCircle, CircleNotch, Minus, Plus, MagnifyingGlass, Trash, ShoppingBagOpen,
  CurrencyCircleDollar, Receipt, Package, WarningCircle, ShareNetwork, Printer,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { insertOrder } from '../../lib/saveOrder';
import { sellablesOf } from '../../lib/variants';
import { formatVND, shortId } from '../../lib/format';
import { PageHeader, StatCard, Spinner, Thumb, EmptyState, DateField } from '../../components/admin/ui';
import { useInvoiceExport } from '../../components/admin/useInvoiceExport';

const normalize = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

async function loadTodayStats() {
  const now = new Date();
  const { data } = await supabase
    .from('orders')
    .select('total_amount')
    .gte('created_at', startOfDay(now).toISOString())
    .lte('created_at', endOfDay(now).toISOString());
  const list = data || [];
  return { count: list.length, revenue: list.reduce((s, o) => s + Number(o.total_amount || 0), 0) };
}

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState({}); // { product_id: quantity }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type, text }
  const [search, setSearch] = useState('');
  const [today, setToday] = useState({ count: 0, revenue: 0 });
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [otherFee, setOtherFee] = useState('');
  const [receiveDate, setReceiveDate] = useState(''); // ngày khách nhận hàng (không bắt buộc)
  const [shippingFee, setShippingFee] = useState('');
  const [lastOrder, setLastOrder] = useState(null); // hóa đơn vừa lưu, để gửi/in cho khách
  const invoice = useInvoiceExport();

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('products').select('*').order('name');
      if (data) setProducts(data);
      setLoading(false);
    }
    fetchData();
    loadTodayStats().then(setToday);
  }, []);

  const setQty = (id, value) => {
    const q = Math.max(0, Math.floor(Number(value) || 0));
    if (q > 0) setLastOrder(null);
    setOrderItems((prev) => {
      const next = { ...prev };
      if (q === 0) delete next[id];
      else next[id] = q;
      return next;
    });
  };

  const cart = useMemo(
    () =>
      products
        .flatMap(sellablesOf)
        .filter((s) => orderItems[s.key] > 0)
        .map((s) => ({ ...s, quantity: orderItems[s.key] })),
    [products, orderItems],
  );
  const subtotal = cart.reduce((s, i) => s + i.quantity * i.price, 0);
  const ship = Number(String(shippingFee).replace(/[^\d]/g, '')) || 0;
  const other = Number(String(otherFee).replace(/[^\d]/g, '')) || 0;
  const total = subtotal + ship + other; // tổng khách trả = tiền hàng + ship + phí khác
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    // Mỗi phân loại là một dòng riêng (giá riêng)
    const all = products.flatMap(sellablesOf);
    return q ? all.filter((s) => normalize(s.label).includes(q)) : all;
  }, [products, search]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveOrder = async () => {
    if (subtotal <= 0) return;
    setSaving(true);
    const items = cart.map((i) => ({
      product_id: i.product.id,
      product_name: i.label,
      variant: i.variant,
      quantity: i.quantity,
      price: i.price,
    }));
    const order = { total_amount: total, items };
    if (receiveDate) order.receive_date = receiveDate;
    // Chỉ gửi khi có nhập, để vẫn lưu được nếu Supabase chưa có 2 cột này
    if (customerName.trim()) order.customer_name = customerName.trim();
    if (orderNote.trim()) order.note = orderNote.trim();
    if (other > 0) order.other_fee = other;
    if (ship > 0) order.shipping_fee = ship;
    const { data: saved, error, movedDateToNote } = await insertOrder(order);
    setSaving(false);

    if (error) {
      showToast('error', /customer_name|note|shipping_fee|other_fee|receive_date/.test(error.message || '') ? 'Chưa có cột tên khách/tiền ship/ghi chú/phí khác/ngày nhận. Chạy file supabase/orders_customer_note.sql trong Supabase rồi thử lại.' : 'Lỗi lưu đơn hàng: ' + error.message);
    } else {
      showToast('success', movedDateToNote ? `Đã lưu hóa đơn (ngày nhận ghi trong ghi chú)` : `Đã lưu hóa đơn ${formatVND(total)}`);
      setOrderItems({});
      setLastOrder(saved);
      setCustomerName('');
      setOrderNote('');
      setOtherFee('');
      setReceiveDate('');
      setShippingFee('');
      loadTodayStats().then(setToday);
    }
  };

  return (
    <div>
      <PageHeader title="Bán hàng" description="Chọn sản phẩm và số lượng, sau đó lưu hóa đơn." />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard icon={CurrencyCircleDollar} label="Doanh thu hôm nay" value={formatVND(today.revenue)} />
        <StatCard icon={Receipt} label="Hóa đơn hôm nay" value={today.count} tone="sage" />
        <StatCard icon={Package} label="Sản phẩm đang bán" value={products.length} tone="sun" />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-12">
          {/* Danh sách sản phẩm */}
          <section className="card lg:col-span-7 xl:col-span-8" aria-label="Sản phẩm">
            <div className="border-b border-line p-4">
              <div className="relative">
                <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm sản phẩm…"
                  aria-label="Tìm sản phẩm"
                  className="input pl-10"
                />
              </div>
            </div>

            {visible.length === 0 ? (
              <EmptyState icon={Package} title="Không có sản phẩm phù hợp" />
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((s) => {
                  const p = { id: s.key, name: s.label };
                  const q = orderItems[s.key] || 0;
                  const price = s.price;
                  return (
                    <li key={p.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${q > 0 ? 'bg-blush/40' : ''}`}>
                      <Thumb src={s.image} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-sm text-muted">{formatVND(price)}</p>
                      </div>
                      <div className="flex items-center rounded-full border border-line bg-surface">
                        <button
                          type="button"
                          onClick={() => setQty(p.id, q - 1)}
                          disabled={q === 0}
                          aria-label={`Giảm số lượng ${p.name}`}
                          className="flex size-9 items-center justify-center rounded-full text-muted hover:text-ink disabled:opacity-30"
                        >
                          <Minus size={14} weight="bold" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={q || ''}
                          placeholder="0"
                          onChange={(e) => setQty(p.id, e.target.value)}
                          aria-label={`Số lượng ${p.name}`}
                          className="w-10 bg-transparent text-center font-semibold outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQty(p.id, q + 1)}
                          aria-label={`Tăng số lượng ${p.name}`}
                          className="flex size-9 items-center justify-center rounded-full bg-ink text-paper hover:bg-ink/85"
                        >
                          <Plus size={14} weight="bold" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Hóa đơn tạm */}
          <aside className="card flex flex-col lg:sticky lg:top-6 lg:col-span-5 xl:col-span-4" aria-label="Hóa đơn hiện tại">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-semibold">Hóa đơn hiện tại</h2>
              {cart.length > 0 && (
                <button type="button" onClick={() => setOrderItems({})} className="inline-flex items-center gap-1 text-sm text-muted hover:text-brick">
                  <Trash size={16} /> Xóa hết
                </button>
              )}
            </div>

            {cart.length === 0 && lastOrder ? (
              /* Vừa lưu xong: gửi hóa đơn cho khách */
              <div className="flex flex-col items-center px-6 py-8 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-sage-soft text-sage">
                  <CheckCircle size={30} weight="fill" />
                </span>
                <p className="mt-4 font-semibold">Đã lưu hóa đơn #{shortId(lastOrder.id)}</p>
                <p className="mt-1 text-sm text-muted">
                  {lastOrder.customer_name ? `${lastOrder.customer_name} · ` : ''}
                  {formatVND(lastOrder.total_amount)}
                </p>
                <div className="mt-5 grid w-full gap-2">
                  <button
                    type="button"
                    onClick={() => invoice.sendImage(lastOrder)}
                    disabled={invoice.busy}
                    className="btn btn-accent w-full rounded-xl"
                  >
                    {invoice.busy ? <CircleNotch size={18} className="animate-spin" /> : <ShareNetwork size={18} weight="bold" />}
                    Gửi ảnh hóa đơn cho khách
                  </button>
                  <button type="button" onClick={() => invoice.print(lastOrder)} className="btn btn-outline w-full rounded-xl">
                    <Printer size={18} /> In / Xuất PDF
                  </button>
                  <button type="button" onClick={() => setLastOrder(null)} className="btn btn-ghost btn-sm text-muted">
                    Bán đơn mới
                  </button>
                </div>
              </div>
            ) : cart.length === 0 ? (
              <EmptyState icon={ShoppingBagOpen} title="Chưa có sản phẩm" text="Bấm nút + ở danh sách bên cạnh để thêm vào hóa đơn." />
            ) : (
              <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto px-5">
                {cart.map((i) => (
                  <li key={i.key} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{i.label}</p>
                      <p className="text-muted">{i.quantity} × {formatVND(i.price)}</p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatVND(i.quantity * i.price)}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-3 border-t border-line px-5 py-4">
              <div>
                <label htmlFor="receive-date" className="label">
                  Ngày nhận <span className="font-normal text-muted">(không bắt buộc)</span>
                </label>
                <DateField id="receive-date" value={receiveDate} onChange={setReceiveDate} />
              </div>
              <div>
                <label htmlFor="customer-name" className="label">
                  Tên khách <span className="font-normal text-muted">(không bắt buộc)</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="VD: Chị Lan"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="shipping-fee" className="label">
                  Tiền ship <span className="font-normal text-muted">(không bắt buộc)</span>
                </label>
                <input
                  id="shipping-fee"
                  type="text"
                  inputMode="numeric"
                  value={ship ? ship.toLocaleString('vi-VN') : ''}
                  onChange={(e) => setShippingFee(e.target.value)}
                  placeholder="VD: 30.000"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="order-note" className="label">
                  Ghi chú <span className="font-normal text-muted">(in ở cuối hóa đơn)</span>
                </label>
                <textarea
                  id="order-note"
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="VD: Giao trước 14/02, gói giấy kraft"
                  className="input h-auto py-2.5"
                />
              </div>
              <div>
                <label htmlFor="order-other" className="label">
                  Phí khác <span className="font-normal text-muted">(cộng vào tổng)</span>
                </label>
                <input
                  id="order-other"
                  type="text"
                  inputMode="numeric"
                  value={other ? other.toLocaleString('vi-VN') : ''}
                  onChange={(e) => setOtherFee(e.target.value)}
                  placeholder="VD: 20.000 (thiệp, gói quà...)"
                  className="input"
                />
              </div>
            </div>

            <div className="mt-auto space-y-4 border-t border-line bg-paper-dim/60 p-5 rounded-b-2xl">
              <div className="flex justify-between text-sm text-muted">
                <span>Số lượng</span>
                <span>{itemCount} sản phẩm</span>
              </div>
              {(ship > 0 || other > 0) && (
                <div className="flex justify-between text-sm text-muted">
                  <span>Tiền hàng</span>
                  <span>{formatVND(subtotal)}</span>
                </div>
              )}
              {ship > 0 && (
                <div className="flex justify-between text-sm text-muted">
                  <span>Tiền ship</span>
                  <span>{formatVND(ship)}</span>
                </div>
              )}
              {other > 0 && (
                <div className="flex justify-between text-sm text-muted">
                  <span>Phí khác</span>
                  <span>{formatVND(other)}</span>
                </div>
              )}
              <div className="flex items-end justify-between">
                <span className="font-medium">Tổng thanh toán</span>
                <span className="text-2xl font-semibold tracking-tight text-brick">{formatVND(total)}</span>
              </div>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={saving || subtotal <= 0}
                className="btn btn-accent btn-lg w-full rounded-xl"
              >
                {saving ? <CircleNotch size={20} className="animate-spin" /> : <CheckCircle size={20} weight="fill" />}
                Lưu hóa đơn
              </button>
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-ink text-paper' : 'bg-brick text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={20} weight="fill" className="text-[#9fd08a]" /> : <WarningCircle size={20} weight="fill" />}
          {toast.text}
        </div>
      )}

      {/* Bản hóa đơn ẩn để chụp ảnh / in */}
      {invoice.element}
    </div>
  );
}
