import { useState, useEffect } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import {
  Printer,
  ShareNetwork,
  Receipt,
  X,
  CurrencyCircleDollar,
  Package,
  PencilSimple,
  Trash,
  Check,
  CircleNotch,
  Plus,
  NotePencil,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { formatVND, parsePrice, shortId } from '../../lib/format';
import { useInvoiceExport } from '../../components/admin/useInvoiceExport';
import { PageHeader, StatCard, Spinner, EmptyState, DateField } from '../../components/admin/ui';

const toNumber = (v) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;
const sumOrder = (items) => items.reduce((s, i) => s + toNumber(i.quantity) * toNumber(i.price), 0);
const BLOCKED_MSG =
  'Supabase chưa cho phép sửa/xóa hóa đơn. Mở SQL Editor, chạy file supabase/orders_policies.sql rồi thử lại.';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  // Sửa hóa đơn
  const [editingId, setEditingId] = useState(null);
  const [draftItems, setDraftItems] = useState([]);
  const [draftCustomer, setDraftCustomer] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftOther, setDraftOther] = useState('');  // phí khác
  const [draftShip, setDraftShip] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const invoice = useInvoiceExport();

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, price')
      .order('name')
      .then(({ data }) => setProducts(data || []));
  }, []);

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


  const revenue = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const units = orders.reduce((s, o) => s + (o.items || []).reduce((a, i) => a + Number(i.quantity || 0), 0), 0);

  const startEdit = (order) => {
    setEditingId(order.id);
    setDraftItems((order.items || []).map((i) => ({ ...i, quantity: String(i.quantity), price: String(i.price) })));
    setDraftCustomer(order.customer_name || '');
    setDraftNote(order.note || '');
    setDraftOther(order.other_fee ? String(order.other_fee) : '');
    setDraftShip(order.shipping_fee ? String(order.shipping_fee) : '');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraftItems([]);
  };
  const updateDraft = (idx, patch) => setDraftItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const removeDraft = (idx) => setDraftItems((list) => list.filter((_, i) => i !== idx));
  const addDraftProduct = (productId) => {
    const p = products.find((x) => String(x.id) === productId);
    if (!p) return;
    setDraftItems((list) => {
      const existing = list.findIndex((it) => String(it.product_id) === String(p.id));
      if (existing >= 0) {
        return list.map((it, i) => (i === existing ? { ...it, quantity: String(toNumber(it.quantity) + 1) } : it));
      }
      return [...list, { product_id: p.id, product_name: p.name, quantity: '1', price: String(parsePrice(p.price)) }];
    });
  };

  const draftValid = draftItems.length > 0 && draftItems.every((i) => toNumber(i.quantity) > 0);

  const saveEdit = async () => {
    if (!draftValid) return;
    setSavingEdit(true);
    const items = draftItems.map((i) => ({ ...i, quantity: toNumber(i.quantity), price: toNumber(i.price) }));
    const ship = toNumber(draftShip);
    const otherFee = toNumber(draftOther);
    const total_amount = sumOrder(items) + ship + otherFee;
    const patch = { items, total_amount };
    // Chỉ gửi khi có nội dung (hoặc khi xóa nội dung cũ), để vẫn sửa được nếu Supabase chưa có 2 cột này
    const current = orders.find((o) => o.id === editingId) || {};
    if (draftCustomer.trim() || current.customer_name) patch.customer_name = draftCustomer.trim() || null;
    if (draftNote.trim() || current.note) patch.note = draftNote.trim() || null;
    if (otherFee > 0 || Number(current.other_fee) > 0) patch.other_fee = otherFee;
    if (ship > 0 || Number(current.shipping_fee) > 0) patch.shipping_fee = ship;
    const { data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', editingId)
      .select()
      .single();
    setSavingEdit(false);
    if (error) {
      if (error.code === 'PGRST116') return alert(BLOCKED_MSG);
      if (/customer_name|note|shipping_fee|other_fee/.test(error.message || '')) return alert('Chưa có cột tên khách/tiền ship/ghi chú/phí khác. Chạy file supabase/orders_customer_note.sql trong Supabase rồi thử lại.');
      return alert('Không lưu được: ' + error.message);
    }
    setOrders((list) => list.map((o) => (o.id === data.id ? data : o)));
    cancelEdit();
  };

  const handleDelete = async (order) => {
    if (
      !confirm(
        `Xóa hóa đơn #${shortId(order.id)} ngày ${format(parseISO(order.created_at), 'dd-MM-yyyy')} (${formatVND(
          order.total_amount,
        )})?\nKhông thể hoàn tác.`,
      )
    )
      return;
    const { data, error } = await supabase.from('orders').delete().eq('id', order.id).select();
    if (error) return alert('Không xóa được: ' + error.message);
    if (!data?.length) return alert(BLOCKED_MSG);
    setOrders((list) => list.filter((o) => o.id !== order.id));
    if (editingId === order.id) cancelEdit();
  };

  return (
    <div>
      <PageHeader
        title="Hóa đơn"
        description={
          dateFilter
            ? `Các hóa đơn ngày ${format(new Date(`${dateFilter}T00:00:00`), 'dd-MM-yyyy')}`
            : 'Tất cả hóa đơn đã lưu'
        }
        actions={
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="order-date">
              Lọc theo ngày
            </label>
            <DateField id="order-date" value={dateFilter} onChange={setDateFilter} className="w-44" />
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
          <EmptyState
            icon={Receipt}
            title="Không tìm thấy hóa đơn nào"
            text={dateFilter ? 'Thử chọn ngày khác.' : 'Hóa đơn sẽ xuất hiện sau khi bạn lưu ở màn hình Bán hàng.'}
          />
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((order) => {
              const isEditing = editingId === order.id;
              return (
                <li
                  key={order.id}
                  className={`flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6 ${isEditing ? 'bg-blush/30' : ''}`}
                >
                  <div className="md:w-44 md:shrink-0">
                    <span className="badge bg-paper-dim font-mono font-semibold text-ink">#{shortId(order.id)}</span>
                    <p className="mt-2 text-sm text-muted">{format(parseISO(order.created_at), 'dd-MM-yyyy · HH:mm')}</p>
                    {!isEditing && order.customer_name && (
                      <p className="mt-1 text-sm font-medium text-ink">{order.customer_name}</p>
                    )}
                  </div>

                  {isEditing ? (
                    /* Chế độ sửa hóa đơn */
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="grid gap-2 pb-2 sm:grid-cols-2">
                        <input
                          type="text"
                          value={draftCustomer}
                          onChange={(e) => setDraftCustomer(e.target.value)}
                          placeholder="Tên khách"
                          aria-label="Tên khách"
                          className="input h-9 text-sm"
                        />
                        <input
                          type="text"
                          value={draftNote}
                          onChange={(e) => setDraftNote(e.target.value)}
                          placeholder="Ghi chú (in cuối hóa đơn)"
                          aria-label="Ghi chú"
                          className="input h-9 text-sm"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={toNumber(draftOther) ? toNumber(draftOther).toLocaleString('vi-VN') : ''}
                          onChange={(e) => setDraftOther(e.target.value)}
                          placeholder="Phí khác"
                          aria-label="Phí khác"
                          className="input h-9 text-sm"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={toNumber(draftShip) ? toNumber(draftShip).toLocaleString('vi-VN') : ''}
                          onChange={(e) => setDraftShip(e.target.value)}
                          placeholder="Tiền ship"
                          aria-label="Tiền ship"
                          className="input h-9 text-sm"
                        />
                      </div>
                      {draftItems.map((item, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                          <span className="min-w-0 flex-1 basis-full truncate text-sm font-medium sm:basis-auto">
                            {item.product_name}
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateDraft(idx, { quantity: e.target.value })}
                            aria-label={`Số lượng ${item.product_name}`}
                            className={`input h-9 w-20 text-sm ${toNumber(item.quantity) <= 0 ? 'border-brick' : ''}`}
                          />
                          <span className="text-sm text-muted">×</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.price ? toNumber(item.price).toLocaleString('vi-VN') : ''}
                            onChange={(e) => updateDraft(idx, { price: e.target.value })}
                            aria-label={`Đơn giá ${item.product_name}`}
                            className="input h-9 w-28 text-sm"
                          />
                          <span className="w-24 shrink-0 text-right text-sm text-muted">
                            {formatVND(toNumber(item.quantity) * toNumber(item.price))}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDraft(idx)}
                            className="icon-btn size-8 shrink-0 hover:text-brick"
                            aria-label={`Bỏ ${item.product_name} khỏi hóa đơn`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center gap-2 pt-1">
                        <Plus size={14} className="shrink-0 text-muted" />
                        <select
                          value=""
                          onChange={(e) => addDraftProduct(e.target.value)}
                          aria-label="Thêm sản phẩm vào hóa đơn"
                          className="input h-9 text-sm"
                        >
                          <option value="">Thêm sản phẩm vào hóa đơn...</option>
                          {products.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.name} ({formatVND(parsePrice(p.price))})
                            </option>
                          ))}
                        </select>
                      </div>
                      {!draftValid && (
                        <p className="text-sm text-brick">Hóa đơn cần ít nhất 1 sản phẩm, số lượng lớn hơn 0.</p>
                      )}
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <ul className="space-y-1.5 text-sm">
                        {(order.items || []).map((item, idx) => (
                          <li key={idx} className="flex justify-between gap-4">
                            <span>
                              <span className="font-semibold text-muted">{item.quantity}×</span> {item.product_name}
                            </span>
                            <span className="shrink-0 text-muted">{formatVND(item.quantity * item.price)}</span>
                          </li>
                        ))}
                      </ul>
                      {Number(order.shipping_fee) > 0 && (
                        <p className="mt-1.5 flex justify-between gap-4 text-sm">
                          <span className="text-muted">Tiền ship</span>
                          <span className="shrink-0 text-muted">{formatVND(order.shipping_fee)}</span>
                        </p>
                      )}
                      {Number(order.other_fee) > 0 && (
                        <p className="mt-1.5 flex justify-between gap-4 text-sm">
                          <span className="text-muted">Phí khác</span>
                          <span className="shrink-0 text-muted">{formatVND(order.other_fee)}</span>
                        </p>
                      )}
                      {order.note && (
                        <div className="mt-3 space-y-1 text-xs text-muted">
                          {order.note && (
                            <p className="flex items-start gap-1">
                              <NotePencil size={14} className="mt-px shrink-0" />
                              <span><span className="font-medium text-ink">Ghi chú:</span> {order.note}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 md:w-48 md:flex-col md:items-end md:border-0 md:pt-0">
                    <p className="text-lg font-semibold text-brick">
                      {formatVND(isEditing ? sumOrder(draftItems) + toNumber(draftShip) + toNumber(draftOther) : order.total_amount)}
                    </p>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button type="button" onClick={cancelEdit} disabled={savingEdit} className="btn btn-ghost btn-sm">
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={savingEdit || !draftValid}
                          className="btn btn-primary btn-sm rounded-lg"
                        >
                          {savingEdit ? <CircleNotch size={16} className="animate-spin" /> : <Check size={16} weight="bold" />}
                          Lưu
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 md:flex-col md:items-end">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => invoice.sendImage(order)}
                            disabled={invoice.busy}
                            className="btn btn-accent btn-sm"
                          >
                            <ShareNetwork size={16} /> Gửi ảnh
                          </button>
                          <button type="button" onClick={() => invoice.print(order)} className="btn btn-outline btn-sm">
                            <Printer size={16} /> In / PDF
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(order)}
                            className="btn btn-ghost btn-sm text-muted hover:text-ink"
                          >
                            <PencilSimple size={16} /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(order)}
                            className="btn btn-ghost btn-sm text-muted hover:bg-brick/10 hover:text-brick"
                          >
                            <Trash size={16} /> Xóa
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Bản hóa đơn ẩn để chụp ảnh / in */}
      {invoice.element}
    </div>
  );
}
