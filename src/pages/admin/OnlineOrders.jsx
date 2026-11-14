import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Phone,
  ChatCircleDots,
  Truck,
  Storefront,
  CalendarBlank,
  NotePencil,
  X,
  Receipt,
  Trash,
  ArrowCounterClockwise,
  Database,
  CircleNotch,
  ShoppingBag,
  DownloadSimple,
  ShareNetwork,
  CheckCircle,
  PencilSimple,
  Plus,
  Check,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { insertOrder, loadFeeNames } from '../../lib/saveOrder';
import { sellablesOf } from '../../lib/variants';
import ProductPeek from '../../components/admin/ProductPeek';
import { useInvoiceExport } from '../../components/admin/useInvoiceExport';
import { formatVND, getCover, shortId } from '../../lib/format';
import { PageHeader, Spinner, EmptyState, Thumb, DateField } from '../../components/admin/ui';

const STATUS = {
  new: { label: 'Chờ xác nhận', cls: 'bg-sunflower/20 text-[#8a5a00]' },
  confirmed: { label: 'Chờ giao hàng', cls: 'bg-blush text-brick' },
  done: { label: 'Hoàn thành', cls: 'bg-sage-soft text-sage' },
  cancelled: { label: 'Đã hủy', cls: 'bg-ink/10 text-muted' },
};
const TABS = [
  { v: 'new', label: 'Chờ xác nhận' },
  { v: 'confirmed', label: 'Chờ giao hàng' },
  { v: 'done', label: 'Hoàn thành' },
  { v: 'cancelled', label: 'Đã hủy' },
  { v: 'all', label: 'Tất cả' },
];

const toNumber = (v) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;

const isMissingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /customer_orders/.test(error.message || ''));

// Số Zalo: 0901234567 -> https://zalo.me/0901234567
const zaloLink = (phone) => `https://zalo.me/${String(phone).replace(/[^\d]/g, '')}`;
const hasRealPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/[^\d]/g, '');
  return digits.length >= 8 && !/^0+$/.test(digits);
};

export default function OnlineOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [tab, setTab] = useState('new');
  const [busyId, setBusyId] = useState(null);
  const [products, setProducts] = useState([]);
  const [peek, setPeek] = useState(null); // { product, name } đang xem chi tiết
  const invoice = useInvoiceExport(); // tải / in phiếu mua hàng
  const [shipDrafts, setShipDrafts] = useState({}); // tiền ship đang nhập cho từng đơn mới { id: '30000' }
  const shipOf = (o) => (shipDrafts[o.id] !== undefined ? toNumber(shipDrafts[o.id]) : Number(o.shipping_fee) || 0);
  // Phí khác (tên + số tiền) đang nhập cho từng đơn mới
  const [feeDrafts, setFeeDrafts] = useState({}); // { id: { name, amount } }
  const [feeNames, setFeeNames] = useState([]); // tên phí đã dùng → gợi ý
  const otherOf = (o) => (feeDrafts[o.id]?.amount !== undefined ? toNumber(feeDrafts[o.id].amount) : Number(o.other_fee) || 0);
  const otherNameOf = (o) => (feeDrafts[o.id]?.name !== undefined ? feeDrafts[o.id].name : o.other_fee_name || '');
  const setFee = (id, patch) => setFeeDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  // Sửa sản phẩm / ngày nhận / ghi chú trong đơn
  const [editingId, setEditingId] = useState(null);
  const [draftItems, setDraftItems] = useState([]);
  const [draftDate, setDraftDate] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const sellables = useMemo(() => products.flatMap(sellablesOf), [products]);

  const startEdit = (order) => {
    setEditingId(order.id);
    setDraftItems((order.items || []).map((i) => ({ ...i, quantity: String(i.quantity), price: String(i.price) })));
    setDraftDate(order.receive_date || '');
    setDraftNote(order.note || '');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraftItems([]);
  };
  const updateDraftItem = (idx, patch) =>
    setDraftItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeDraftItem = (idx) => setDraftItems((list) => list.filter((_, i) => i !== idx));
  const addDraftProduct = (sellableKey) => {
    const s = sellables.find((x) => x.key === sellableKey);
    if (!s) return;
    setDraftItems((list) => {
      const existing = list.findIndex(
        (it) => String(it.product_id) === String(s.product.id) && (it.variant || null) === (s.variant || null),
      );
      if (existing >= 0) {
        return list.map((it, i) => (i === existing ? { ...it, quantity: String(toNumber(it.quantity) + 1) } : it));
      }
      return [
        ...list,
        { product_id: s.product.id, product_name: s.label, variant: s.variant, quantity: '1', price: String(s.price) },
      ];
    });
  };
  const addCustomDraftItem = () =>
    setDraftItems((list) => [...list, { product_id: null, product_name: '', variant: null, quantity: '1', price: '' }]);

  const draftSubtotal = draftItems.reduce((s, i) => s + toNumber(i.quantity) * toNumber(i.price), 0);
  const draftValid =
    draftItems.length > 0 && draftItems.every((i) => String(i.product_name || '').trim() && toNumber(i.quantity) > 0);

  const saveEdit = async () => {
    if (!draftValid || savingEdit) return;
    setSavingEdit(true);
    const items = draftItems.map((i) => ({
      product_id: i.product_id || null,
      product_name: String(i.product_name).trim(),
      variant: i.variant || null,
      quantity: toNumber(i.quantity),
      price: toNumber(i.price),
    }));
    const total_amount = items.reduce((s, i) => s + i.quantity * i.price, 0);
    const patch = {
      items,
      total_amount,
      receive_date: draftDate || null,
      note: draftNote.trim() || null,
    };
    const { data, error } = await supabase.from('customer_orders').update(patch).eq('id', editingId).select().single();
    setSavingEdit(false);
    if (error) return alert('Không lưu được thay đổi: ' + error.message);
    replace(data);
    cancelEdit();
  };

  // Sản phẩm để hiện ảnh & mở chi tiết (lấy đủ cột, kể cả danh mục)
  useEffect(() => {
    loadFeeNames().then(setFeeNames);
    supabase
      .from('products')
      .select('*, categories(name)')
      .then(({ data }) => setProducts(data || []));
  }, []);
  const productOf = (it) =>
    products.find((p) => String(p.id) === String(it.product_id)) ||
    products.find((p) => p.name.trim().toLowerCase() === String(it.product_name || '').trim().toLowerCase()) ||
    null;

  useEffect(() => {
    supabase
      .from('customer_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (isMissingTable(error)) setMissingTable(true);
        else setOrders(data || []);
        setLoading(false);
      });
  }, []);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    orders.forEach((o) => (c[o.status] = (c[o.status] || 0) + 1));
    return c;
  }, [orders]);
  const visible = useMemo(() => {
    const list = tab === 'all' ? orders : orders.filter((o) => o.status === tab);
    if (tab === 'confirmed') {
      // Chờ giao hàng: sắp xếp theo ngày nhận tăng dần (đơn cần giao sớm nhất hiện lên trước)
      return [...list].sort((a, b) => {
        const da = a.receive_date || '9999-12-31';
        const db = b.receive_date || '9999-12-31';
        if (da !== db) return da.localeCompare(db);
        return (a.created_at || '').localeCompare(b.created_at || '');
      });
    }
    return list;
  }, [orders, tab]);

  const replace = (row) => setOrders((list) => list.map((o) => (o.id === row.id ? row : o)));

  const setStatus = async (order, status) => {
    setBusyId(order.id);
    const { data, error } = await supabase.from('customer_orders').update({ status }).eq('id', order.id).select().single();
    setBusyId(null);
    if (error) return alert('Không cập nhật được: ' + error.message);
    replace(data);
  };

  // Dữ liệu hóa đơn từ đơn online — mỗi thông tin một dòng trong ghi chú
  const toInvoice = (order) => {
    const noteParts = [
      order.delivery_method === 'ship' && order.address ? `Giao: ${order.address}` : 'Nhận hàng: Khách tự đến lấy',
      hasRealPhone(order.phone) ? `SĐT: ${order.phone}` : null,
      order.note ? `Ghi chú: ${order.note}` : null,
    ].filter(Boolean);
    const ship = Number(order.shipping_fee) || 0;
    const other = Number(order.other_fee) || 0;
    const inv = {
      total_amount: Number(order.total_amount) + ship + other, // tiền hàng + ship + phí khác
      items: order.items,
      customer_name: order.customer_name,
      note: noteParts.join('\n'),
    };
    if (order.receive_date) inv.receive_date = order.receive_date;
    if (ship > 0) inv.shipping_fee = ship;
    if (other > 0) {
      inv.other_fee = other;
      if (order.other_fee_name) inv.other_fee_name = order.other_fee_name;
    }
    return inv;
  };

  // Chờ xác nhận → "Xác nhận đơn": lưu tiền ship & phí khác, chuyển sang Chờ giao hàng (chưa tải phiếu, chưa tính doanh thu).
  const confirmOrder = async (order) => {
    const ship = shipOf(order);
    setBusyId(order.id);
    const patch = { status: 'confirmed' };
    if (ship > 0 || Number(order.shipping_fee) > 0) patch.shipping_fee = ship;
    const other = otherOf(order);
    const otherName = otherNameOf(order).trim();
    if (other > 0 || Number(order.other_fee) > 0) {
      patch.other_fee = other;
      patch.other_fee_name = other > 0 ? otherName || null : null;
    }
    const { data, error } = await supabase.from('customer_orders').update(patch).eq('id', order.id).select().single();
    setBusyId(null);
    if (error) {
      return alert(
        /shipping_fee|other_fee/.test(error.message || '')
          ? 'Chưa có cột tiền ship / phí khác cho đơn online. Mở Supabase → SQL Editor, chạy lại file supabase/customer_orders.sql rồi thử lại.'
          : 'Không cập nhật được: ' + error.message,
      );
    }
    replace(data);
  };
  // Tải ảnh phiếu mua hàng về máy tính / điện thoại
  const downloadSlip = (order) => invoice.download({ ...toInvoice(order), id: order.id, created_at: order.created_at });
  // Mở chia sẻ ảnh phiếu mua hàng (Zalo, Messenger...)
  const shareSlip = (order) => invoice.share({ ...toInvoice(order), id: order.id, created_at: order.created_at });

  // Đang giao → "Hoàn thành đơn": lúc này mới tạo hóa đơn → tính vào doanh thu & thu nhập
  const completeOrder = async (order) => {
    if (
      !confirm(
        `Hoàn thành đơn #${shortId(order.id)} của ${order.customer_name}?\n` +
          'Đơn sẽ được tạo hóa đơn và tính vào doanh thu, thu nhập từ hôm nay.',
      )
    )
      return;
    setBusyId(order.id);
    const { data: inv, error, movedToNote } = await insertOrder(toInvoice(order));
    if (error) {
      setBusyId(null);
      return alert(
        /customer_name|note|receive_date/.test(error.message || '')
          ? 'Chưa có cột tên khách/ghi chú/ngày nhận cho hóa đơn. Chạy file supabase/orders_customer_note.sql trong Supabase rồi thử lại.'
          : 'Không tạo được hóa đơn: ' + error.message,
      );
    }
    const { data, error: err2 } = await supabase
      .from('customer_orders')
      .update({ status: 'done', invoice_id: inv.id })
      .eq('id', order.id)
      .select()
      .single();
    setBusyId(null);
    if (err2) return alert('Đã tạo hóa đơn nhưng chưa cập nhật được trạng thái đơn: ' + err2.message);
    replace(data);
    if (movedToNote) alert('Supabase chưa có cột ngày nhận nên ngày nhận đã được ghi vào phần ghi chú. Chạy file supabase/orders_customer_note.sql để có cột riêng.');
  };

  const remove = async (order) => {
    if (!confirm(`Xóa đơn #${shortId(order.id)} của ${order.customer_name}? Không thể hoàn tác.`)) return;
    const { error } = await supabase.from('customer_orders').delete().eq('id', order.id);
    if (error) return alert('Không xóa được: ' + error.message);
    setOrders((list) => list.filter((o) => o.id !== order.id));
  };

  return (
    <div>
      <PageHeader
        title="Đơn online"
        description="Chờ xác nhận (sửa món, điền ship/phí khác) → Chờ giao hàng (tải ảnh phiếu mua hàng) → Hoàn thành. Doanh thu & lợi nhuận tính theo ngày hoàn thành."
      />

      {missingTable && (
        <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-sunflower/50 bg-sunflower/10 p-4 text-sm">
          <Database size={22} weight="duotone" className="shrink-0 text-[#9a6b00]" />
          <div>
            <p className="font-semibold">Chưa có bảng lưu đơn online trong Supabase</p>
            <p className="mt-1 text-muted">
              Mở Supabase → <strong>SQL Editor</strong>, dán nội dung file{' '}
              <code className="rounded bg-paper-dim px-1">supabase/customer_orders.sql</code> và bấm <strong>Run</strong>, sau đó tải lại trang này.
              Khi chưa chạy, khách sẽ không gửi đơn được.
            </p>
          </div>
        </div>
      )}

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => setTab(t.v)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.v ? 'bg-ink text-paper' : 'bg-surface text-muted ring-1 ring-line hover:text-ink'
            }`}
          >
            {t.label}
            {counts[t.v] > 0 && (
              <span className={`rounded-full px-1.5 text-xs ${tab === t.v ? 'bg-paper/20' : t.v === 'new' ? 'bg-brick text-white' : 'bg-paper-dim'}`}>
                {counts[t.v]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'confirmed' && counts.confirmed > 0 && (
        <p className="mb-4 flex items-center gap-1.5 text-xs text-muted">
          <CalendarBlank size={14} className="shrink-0 text-brick" />
          <span>Tự động sắp xếp theo ngày nhận hàng (đơn cần giao sớm nhất hiển thị lên đầu).</span>
        </p>
      )}

      {loading ? (
        <div className="card"><Spinner /></div>
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShoppingBag}
            title={tab === 'new' ? 'Chưa có đơn chờ xác nhận' : 'Không có đơn nào'}
            text="Khi khách đặt hàng trên website, đơn sẽ hiện ở đây."
          />
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((o) => {
            const st = STATUS[o.status] || STATUS.new;
            const busy = busyId === o.id;
            const isEditing = editingId === o.id;
            return (
              <li key={o.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper-dim/40 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-surface font-mono font-semibold text-ink ring-1 ring-line">#{shortId(o.id)}</span>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {o.status === 'confirmed' && o.receive_date && (
                      <span className="badge bg-blush text-brick font-semibold">
                        <CalendarBlank size={13} weight="fill" /> Giao: {format(parseISO(o.receive_date), 'dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted">Đặt lúc {format(parseISO(o.created_at), 'HH:mm dd-MM-yyyy')}</span>
                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2">
                  {/* Khách hàng */}
                  <div className="space-y-2 text-sm">
                    <p className="text-base font-semibold">{o.customer_name}</p>
                    {hasRealPhone(o.phone) ? (
                      <div className="flex flex-wrap gap-2">
                        <a href={`tel:${o.phone}`} className="btn btn-outline btn-sm">
                          <Phone size={16} /> {o.phone}
                        </a>
                        <a href={zaloLink(o.phone)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                          <ChatCircleDots size={16} /> Zalo
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-muted italic">Khách không để lại SĐT (tự đến lấy)</p>
                    )}
                    <p className="flex items-start gap-2 text-muted">
                      {o.delivery_method === 'pickup' ? (
                        <><Storefront size={18} className="mt-px shrink-0" /> Khách tự đến lấy</>
                      ) : (
                        <><Truck size={18} className="mt-px shrink-0" /> <span className="text-ink">{o.address}</span></>
                      )}
                    </p>
                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="label text-xs">Ngày nhận hàng</label>
                          <DateField value={draftDate} onChange={setDraftDate} />
                        </div>
                        <div>
                          <label className="label text-xs">Ghi chú / Tên ghi trên cúp</label>
                          <textarea
                            rows={2}
                            value={draftNote}
                            onChange={(e) => setDraftNote(e.target.value)}
                            placeholder="Ghi chú, tên ghi trên cúp..."
                            className="input text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {o.receive_date && (
                          <p className="flex items-center gap-2 text-muted">
                            <CalendarBlank size={18} className="shrink-0" /> Ngày nhận{' '}
                            <span className="font-medium text-ink">{format(parseISO(o.receive_date), 'dd-MM-yyyy')}</span>
                          </p>
                        )}
                        {o.note && (
                          <p className="flex items-start gap-2 text-muted">
                            <NotePencil size={18} className="mt-px shrink-0" /> <span className="whitespace-pre-wrap text-ink">{o.note}</span>
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Sản phẩm */}
                  <div>
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Sửa sản phẩm trong phiếu</p>
                        <div className="space-y-2">
                          {draftItems.map((it, idx) => (
                            <div key={idx} className="grid grid-cols-12 items-center gap-1.5 rounded-xl border border-line bg-paper/60 p-2">
                              <input
                                type="text"
                                value={it.product_name}
                                onChange={(e) => updateDraftItem(idx, { product_name: e.target.value })}
                                placeholder="Tên sản phẩm"
                                aria-label={`Tên sản phẩm ${idx + 1}`}
                                className="input col-span-12 h-9 text-sm sm:col-span-5"
                              />
                              <input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={(e) => updateDraftItem(idx, { quantity: e.target.value })}
                                placeholder="SL"
                                aria-label={`Số lượng ${idx + 1}`}
                                className="input col-span-4 h-9 text-center text-sm sm:col-span-2"
                              />
                              <input
                                type="text"
                                inputMode="numeric"
                                value={toNumber(it.price) ? toNumber(it.price).toLocaleString('vi-VN') : ''}
                                onChange={(e) => updateDraftItem(idx, { price: e.target.value })}
                                placeholder="Đơn giá"
                                aria-label={`Đơn giá ${idx + 1}`}
                                className="input col-span-6 h-9 text-right text-sm sm:col-span-4"
                              />
                              <button
                                type="button"
                                onClick={() => removeDraftItem(idx)}
                                className="icon-btn col-span-2 size-9 justify-self-end hover:text-brick sm:col-span-1"
                                title="Xóa món"
                                aria-label="Xóa món"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <select
                            value=""
                            onChange={(e) => e.target.value && addDraftProduct(e.target.value)}
                            className="input h-9 min-w-0 flex-1 text-sm"
                            aria-label="Thêm sản phẩm có sẵn"
                          >
                            <option value="">+ Thêm sản phẩm từ cửa hàng…</option>
                            {sellables.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label} — {formatVND(s.price)}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={addCustomDraftItem} className="btn btn-outline btn-sm shrink-0">
                            <Plus size={14} weight="bold" /> Tự nhập món
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
                          <span className="text-muted">Tiền hàng mới</span>
                          <span className="text-base font-semibold text-brick">{formatVND(draftSubtotal)}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-2 text-sm">
                          {(o.items || []).map((it, idx) => {
                            const prod = productOf(it);
                            return (
                              <li key={idx} className="flex items-center justify-between gap-4">
                                <button
                                  type="button"
                                  onClick={() => setPeek({ product: prod, name: it.product_name })}
                                  className="group flex min-w-0 items-center gap-3 rounded-lg text-left"
                                  title="Xem chi tiết sản phẩm"
                                >
                                  <Thumb src={prod ? getCover(prod) : null} className="size-11 transition group-hover:ring-2 group-hover:ring-brick" />
                                  <span className="min-w-0">
                                    <span className="font-semibold text-muted">{it.quantity}×</span>{' '}
                                    <span className="font-medium underline-offset-2 group-hover:text-brick group-hover:underline">{it.product_name}</span>
                                  </span>
                                </button>
                                <span className="shrink-0 text-muted">{formatVND(it.quantity * it.price)}</span>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted">Tiền hàng</span>
                            <span className="font-medium">{formatVND(o.total_amount)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <label htmlFor={`ship-${o.id}`} className="text-muted">Tiền ship</label>
                            {o.status === 'new' ? (
                              <input
                                id={`ship-${o.id}`}
                                type="text"
                                inputMode="numeric"
                                value={shipOf(o) ? shipOf(o).toLocaleString('vi-VN') : ''}
                                onChange={(e) => setShipDrafts((d) => ({ ...d, [o.id]: e.target.value }))}
                                placeholder={o.delivery_method === 'pickup' ? 'Tự lấy — để trống' : 'Shop điền, VD: 30.000'}
                                className="input h-9 w-44 text-right text-sm"
                              />
                            ) : (
                              <span className="font-medium">{Number(o.shipping_fee) > 0 ? formatVND(o.shipping_fee) : '—'}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="shrink-0 text-muted">Phí khác</span>
                            {o.status === 'new' ? (
                              <div className="flex min-w-0 gap-2">
                                <input
                                  type="text"
                                  list="online-fee-names"
                                  autoComplete="off"
                                  value={otherNameOf(o)}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    // Chọn lại tên đã dùng → tự điền số tiền lần trước (nếu chưa nhập)
                                    const hit = feeNames.find((f) => f.name.toLowerCase() === v.trim().toLowerCase());
                                    setFee(o.id, hit && hit.amount && !otherOf(o) ? { name: v, amount: String(hit.amount) } : { name: v });
                                  }}
                                  placeholder="Tên: thiệp, gói quà..."
                                  aria-label="Tên phí khác"
                                  className="input h-9 min-w-0 flex-1 text-sm"
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={otherOf(o) ? otherOf(o).toLocaleString('vi-VN') : ''}
                                  onChange={(e) => setFee(o.id, { amount: e.target.value })}
                                  placeholder="Số tiền"
                                  aria-label="Số tiền phí khác"
                                  className="input h-9 w-28 text-right text-sm"
                                />
                              </div>
                            ) : (
                              <span className="font-medium">
                                {Number(o.other_fee) > 0
                                  ? `${o.other_fee_name ? `${o.other_fee_name} · ` : ''}${formatVND(o.other_fee)}`
                                  : '—'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between border-t border-line pt-2">
                            <span className="font-medium">Tổng thanh toán</span>
                            <span className="text-lg font-semibold text-brick">{formatVND(Number(o.total_amount) + shipOf(o) + otherOf(o))}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Thao tác */}
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
                  {(busy || savingEdit) && <CircleNotch size={18} className="mr-auto animate-spin text-muted" />}
                  {isEditing ? (
                    <>
                      <button type="button" disabled={savingEdit} onClick={cancelEdit} className="btn btn-ghost btn-sm text-muted">
                        <X size={16} /> Hủy sửa
                      </button>
                      <button type="button" disabled={!draftValid || savingEdit} onClick={saveEdit} className="btn btn-primary btn-sm">
                        <Check size={16} weight="bold" /> Lưu thay đổi
                      </button>
                    </>
                  ) : (
                    <>
                      {o.status === 'new' && (
                        <>
                          <button type="button" disabled={busy} onClick={() => setStatus(o, 'cancelled')} className="btn btn-ghost btn-sm text-muted">
                            <X size={16} /> Hủy đơn
                          </button>
                          <button type="button" disabled={busy} onClick={() => startEdit(o)} className="btn btn-outline btn-sm">
                            <PencilSimple size={16} /> Sửa
                          </button>
                          <button type="button" disabled={busy} onClick={() => confirmOrder(o)} className="btn btn-primary btn-sm">
                            <CheckCircle size={16} weight="bold" /> Xác nhận đơn
                          </button>
                        </>
                      )}
                      {o.status === 'confirmed' && (
                        <>
                          <button type="button" disabled={busy} onClick={() => setStatus(o, 'cancelled')} className="btn btn-ghost btn-sm text-muted">
                            <X size={16} /> Hủy đơn
                          </button>
                          <button type="button" disabled={busy} onClick={() => startEdit(o)} className="btn btn-outline btn-sm">
                            <PencilSimple size={16} /> Sửa
                          </button>
                          <button type="button" disabled={busy || invoice.busy} onClick={() => downloadSlip(o)} className="btn btn-outline btn-sm" title="Tải file ảnh phiếu về máy">
                            <DownloadSimple size={16} /> Tải về máy
                          </button>
                          <button type="button" disabled={busy || invoice.busy} onClick={() => shareSlip(o)} className="btn btn-outline btn-sm" title="Gửi ảnh qua Zalo / Messenger">
                            <ShareNetwork size={16} /> Gửi khách (Zalo)
                          </button>
                          <button type="button" disabled={busy} onClick={() => completeOrder(o)} className="btn btn-accent btn-sm">
                            <CheckCircle size={16} weight="bold" /> Hoàn thành đơn
                          </button>
                        </>
                      )}
                      {o.status === 'done' && o.invoice_id && (
                        <Link to="/admin/stats" className="btn btn-ghost btn-sm text-sage">
                          <Receipt size={16} /> Đã tạo hóa đơn #{shortId(o.invoice_id)}
                        </Link>
                      )}
                      {o.status === 'cancelled' && (
                        <button type="button" disabled={busy} onClick={() => setStatus(o, 'new')} className="btn btn-ghost btn-sm">
                          <ArrowCounterClockwise size={16} /> Khôi phục
                        </button>
                      )}
                      <button type="button" onClick={() => remove(o)} className="icon-btn hover:bg-brick/10 hover:text-brick" aria-label={`Xóa đơn #${shortId(o.id)}`}>
                        <Trash size={18} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {peek && <ProductPeek product={peek.product} fallbackName={peek.name} onClose={() => setPeek(null)} />}
      {invoice.element}
      <datalist id="online-fee-names">
        {feeNames.map((f) => (
          <option key={f.name} value={f.name} label={f.amount ? formatVND(f.amount) : undefined} />
        ))}
      </datalist>
    </div>
  );
}
