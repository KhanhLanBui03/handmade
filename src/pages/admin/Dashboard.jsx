import { useState, useEffect, useMemo } from 'react';
import { startOfDay, endOfDay, format, parseISO } from 'date-fns';
import {
  CheckCircle, CircleNotch, Minus, Plus, MagnifyingGlass, Trash, ShoppingBagOpen,
  CurrencyCircleDollar, Receipt, Package, WarningCircle, ShareNetwork, Printer, TrendUp, X,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { insertOrder, loadFeeNames } from '../../lib/saveOrder';
import { sellablesOf, makeCostOf } from '../../lib/variants';
import { formatVND, shortId } from '../../lib/format';
import { PageHeader, StatCard, Spinner, Thumb, EmptyState, DateField } from '../../components/admin/ui';
import { useInvoiceExport } from '../../components/admin/useInvoiceExport';

const normalize = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

async function loadTodayStats(productsList = []) {
  const now = new Date();
  const { data } = await supabase
    .from('orders')
    .select('total_amount, items')
    .gte('created_at', startOfDay(now).toISOString())
    .lte('created_at', endOfDay(now).toISOString());
  const list = data || [];
  const costOf = makeCostOf(productsList); // giá vốn theo phân loại
  let totalCost = 0;
  let goods = 0; // tiền hàng (không gồm ship & phí khác)
  list.forEach((o) => {
    (o.items || []).forEach((it) => {
      const qty = Number(it.quantity || 0);
      totalCost += qty * costOf(it);
      goods += qty * Number(it.price || 0);
    });
  });
  const revenue = list.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  // Lợi nhuận chỉ tính tiền hàng − giá vốn, không gồm ship & phí khác
  const profit = goods - totalCost;
  return { count: list.length, revenue, profit, cost: totalCost };
}

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState({}); // { product_id: quantity }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type, text }
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [today, setToday] = useState({ count: 0, revenue: 0, profit: 0, cost: 0 });
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [otherFee, setOtherFee] = useState('');
  const [otherFeeName, setOtherFeeName] = useState('');
  const [feeNames, setFeeNames] = useState([]); // tên phí đã dùng → gợi ý
  const [receiveDate, setReceiveDate] = useState(''); // ngày khách nhận hàng (không bắt buộc)
  const [recordOnReceiveDate, setRecordOnReceiveDate] = useState(false); // tính doanh thu vào ngày nhận (khi nhập đơn cũ)
  const [shippingFee, setShippingFee] = useState('');

  const handleReceiveDateChange = (val) => {
    setReceiveDate(val);
    // Nếu chọn ngày nhận ở quá khứ hoặc hôm nay → tự động bật tính doanh thu vào ngày đó
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    setRecordOnReceiveDate(Boolean(val && val <= todayStr));
  };
  const [lastOrder, setLastOrder] = useState(null); // hóa đơn vừa lưu, để gửi/in cho khách
  const invoice = useInvoiceExport();

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('products').select('*, categories(name)').order('name');
      if (data) {
        setProducts(data);
        loadTodayStats(data).then(setToday);
      } else {
        loadTodayStats([]).then(setToday);
      }
      setLoading(false);
    }
    fetchData();
    loadFeeNames().then(setFeeNames);
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

  const categories = useMemo(() => {
    const list = [...new Set(products.map((p) => p.categories?.name).filter(Boolean))];
    return list.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [products]);

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    const all = products.flatMap((p) => {
      const items = sellablesOf(p);
      return items.map((it) => ({ ...it, categoryName: p.categories?.name || '' }));
    });
    return all.filter((s) => {
      if (selectedCat !== 'all' && s.categoryName !== selectedCat) return false;
      if (!q) return true;
      return normalize(s.label).includes(q) || normalize(s.categoryName).includes(q);
    });
  }, [products, search, selectedCat]);

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
    if (receiveDate) {
      order.receive_date = receiveDate;
      if (recordOnReceiveDate) {
        order.created_at = new Date(`${receiveDate}T12:00:00`).toISOString();
      }
    }
    // Chỉ gửi khi có nhập, để vẫn lưu được nếu Supabase chưa có 2 cột này
    if (customerName.trim()) order.customer_name = customerName.trim();
    if (orderNote.trim()) order.note = orderNote.trim();
    if (other > 0) order.other_fee = other;
    if (other > 0 && otherFeeName.trim()) order.other_fee_name = otherFeeName.trim();
    if (ship > 0) order.shipping_fee = ship;
    const { data: saved, error, movedToNote } = await insertOrder(order);
    setSaving(false);

    if (error) {
      showToast('error', /customer_name|note|shipping_fee|other_fee|receive_date|other_fee_name/.test(error.message || '') ? 'Chưa có cột tên khách/tiền ship/ghi chú/phí khác/ngày nhận/tên phí. Chạy file supabase/orders_customer_note.sql trong Supabase rồi thử lại.' : 'Lỗi lưu đơn hàng: ' + error.message);
    } else {
      showToast('success', movedToNote ? `Đã lưu hóa đơn (một số thông tin ghi trong ghi chú)` : `Đã lưu hóa đơn ${formatVND(total)}`);
      setOrderItems({});
      setLastOrder(saved);
      setCustomerName('');
      setOrderNote('');
      setOtherFee('');
      setOtherFeeName('');
      loadFeeNames().then(setFeeNames);
      setReceiveDate('');
      setRecordOnReceiveDate(false);
      setShippingFee('');
      loadTodayStats(products).then(setToday);
    }
  };

  return (
    <div className="min-w-0">
      <div className="mb-3 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">Bán hàng</h1>
        <p className="text-xs sm:text-sm text-muted">Chọn sản phẩm và số lượng, sau đó lưu hóa đơn.</p>
      </div>

      <div className="mb-4 sm:mb-8 grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard compact icon={CurrencyCircleDollar} label="Doanh thu hôm nay" value={formatVND(today.revenue)} tone="brick" />
        <StatCard
          compact
          icon={TrendUp}
          label="Thu nhập hôm nay"
          value={formatVND(today.profit || 0)}
          tone="sage"
          hint={`Lợi nhuận (vốn: ${formatVND(today.cost || 0)})`}
        />
        <StatCard compact icon={Receipt} label="Hóa đơn hôm nay" value={today.count} tone="sun" />
        <StatCard compact icon={Package} label="Sản phẩm đang bán" value={products.length} />
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-12">
          {/* Danh sách sản phẩm */}
          <section className="card min-w-0 overflow-hidden lg:col-span-7 xl:col-span-8" aria-label="Sản phẩm">
            <div className="sticky top-0 z-10 border-b border-line bg-surface/95 p-3 sm:p-4 backdrop-blur">
              <div className="relative">
                <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên sản phẩm, phân loại..."
                  aria-label="Tìm sản phẩm"
                  className="input h-10 pl-10 pr-9 text-sm"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-paper-dim hover:text-ink"
                    aria-label="Xóa tìm kiếm"
                  >
                    <X size={16} weight="bold" />
                  </button>
                )}
              </div>

              {categories.length > 0 && (
                <div className="no-scrollbar mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCat('all')}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedCat === 'all'
                        ? 'bg-ink text-paper'
                        : 'bg-paper-dim text-muted hover:text-ink'
                    }`}
                  >
                    Tất cả ({products.length})
                  </button>
                  {categories.map((c) => {
                    const count = products.filter((p) => p.categories?.name === c).length;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedCat(c)}
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          selectedCat === c
                            ? 'bg-brick text-white'
                            : 'bg-paper-dim text-muted hover:text-ink'
                        }`}
                      >
                        {c} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {visible.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Không có sản phẩm phù hợp"
                text="Thử tìm từ khóa khác hoặc bấm Tất cả để xem lại."
                action={
                  (search || selectedCat !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setSelectedCat('all');
                      }}
                      className="btn btn-outline btn-sm mt-3"
                    >
                      Xem tất cả sản phẩm
                    </button>
                  )
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((s) => {
                  const p = { id: s.key, name: s.label };
                  const q = orderItems[s.key] || 0;
                  const price = s.price;
                  return (
                    <li key={p.id} className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 transition-colors ${q > 0 ? 'bg-blush/40' : ''}`}>
                      <Thumb src={s.image} className="size-10 sm:size-12 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm sm:text-base font-medium">{p.name}</p>
                        <p className="text-xs sm:text-sm text-muted">{formatVND(price)}</p>
                      </div>
                      <div className="flex shrink-0 items-center rounded-full border border-line bg-surface p-0.5">
                        <button
                          type="button"
                          onClick={() => setQty(p.id, q - 1)}
                          disabled={q === 0}
                          aria-label={`Giảm số lượng ${p.name}`}
                          className="flex size-7 items-center justify-center rounded-full text-muted hover:text-ink disabled:opacity-30 sm:size-8"
                        >
                          <Minus size={12} weight="bold" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={q || ''}
                          placeholder="0"
                          onChange={(e) => setQty(p.id, e.target.value)}
                          aria-label={`Số lượng ${p.name}`}
                          className="w-7 bg-transparent text-center text-xs font-semibold outline-none sm:w-8 sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setQty(p.id, q + 1)}
                          aria-label={`Tăng số lượng ${p.name}`}
                          className="flex size-7 items-center justify-center rounded-full bg-ink text-paper hover:bg-ink/85 sm:size-8"
                        >
                          <Plus size={12} weight="bold" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Hóa đơn tạm */}
          <aside id="current-invoice" className="card min-w-0 flex flex-col lg:sticky lg:top-6 lg:col-span-5 xl:col-span-4" aria-label="Hóa đơn hiện tại">
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
                <DateField id="receive-date" value={receiveDate} onChange={handleReceiveDateChange} />
                {receiveDate && (
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={recordOnReceiveDate}
                      onChange={(e) => setRecordOnReceiveDate(e.target.checked)}
                      className="size-4 accent-brick"
                    />
                    <span>
                      Tính doanh thu & thu nhập vào ngày{' '}
                      <strong className="text-ink">{format(parseISO(receiveDate), 'dd-MM-yyyy')}</strong>
                    </span>
                  </label>
                )}
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
                <label htmlFor="order-other-name" className="label">
                  Phí khác <span className="font-normal text-muted">(cộng vào tổng)</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <input
                    id="order-other-name"
                    type="text"
                    list="fee-names"
                    autoComplete="off"
                    value={otherFeeName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setOtherFeeName(v);
                      // Chọn lại tên đã dùng → tự điền số tiền lần gần nhất (nếu chưa nhập)
                      const hit = feeNames.find((f) => f.name.toLowerCase() === v.trim().toLowerCase());
                      if (hit && hit.amount && !other) setOtherFee(String(hit.amount));
                    }}
                    placeholder="Tên phí: thiệp, gói quà..."
                    aria-label="Tên phí khác"
                    className="input col-span-3"
                  />
                  <input
                    id="order-other"
                    type="text"
                    inputMode="numeric"
                    value={other ? other.toLocaleString('vi-VN') : ''}
                    onChange={(e) => setOtherFee(e.target.value)}
                    placeholder="Số tiền"
                    aria-label="Số tiền phí khác"
                    className="input col-span-2"
                  />
                </div>
                <datalist id="fee-names">
                  {feeNames.map((f) => (
                    <option key={f.name} value={f.name} label={f.amount ? formatVND(f.amount) : undefined} />
                  ))}
                </datalist>
                {feeNames.length > 0 && !otherFeeName && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {feeNames.slice(0, 6).map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => {
                          setOtherFeeName(f.name);
                          if (f.amount) setOtherFee(String(f.amount));
                        }}
                        className="badge bg-paper-dim text-ink ring-1 ring-line hover:bg-blush hover:text-brick"
                      >
                        {f.name}
                        {f.amount > 0 && <span className="text-muted">· {f.amount.toLocaleString('vi-VN')}</span>}
                      </button>
                    ))}
                  </div>
                )}
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
                  <span>Phí khác{otherFeeName.trim() ? ` (${otherFeeName.trim()})` : ''}</span>
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

      {/* Thanh hóa đơn nổi trên điện thoại khi đã chọn món */}
      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t border-line bg-surface/95 px-4 py-2.5 shadow-2xl backdrop-blur lg:hidden">
          <div>
            <p className="text-xs text-muted">{itemCount} món đã chọn</p>
            <p className="text-base font-bold text-brick">{formatVND(total)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              document.getElementById('current-invoice')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn btn-accent btn-sm rounded-xl px-4"
          >
            Xem hóa đơn & Lưu →
          </button>
        </div>
      )}

      {/* Bản hóa đơn ẩn để chụp ảnh / in */}
      {invoice.element}
    </div>
  );
}
