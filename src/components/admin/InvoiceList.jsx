import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Printer,
  ShareNetwork,
  X,
  PencilSimple,
  Trash,
  Check,
  CircleNotch,
  Plus,
  NotePencil,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { formatVND, parsePrice, shortId } from '../../lib/format';
import { useInvoiceExport } from './useInvoiceExport';
import { DateField } from './ui';
import Pagination from '../Pagination';

const PER_PAGE = 10;
const toNumber = (v) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;
const sumOrder = (items) => items.reduce((s, i) => s + toNumber(i.quantity) * toNumber(i.price), 0);
const BLOCKED_MSG =
  'Supabase chưa cho phép sửa/xóa hóa đơn. Mở SQL Editor, chạy file supabase/orders_policies.sql rồi thử lại.';

/**
 * Danh sách hóa đơn: xem, sửa (số lượng, giá, khách, ngày nhận, ship, phí khác, ghi chú),
 * xóa, in / gửi ảnh. Tự quản lý trạng thái sửa; báo cho trang cha qua setOrders.
 */
export default function InvoiceList({ orders, setOrders, products, costOf }) {
  const invoice = useInvoiceExport();

  const [editingId, setEditingId] = useState(null);
  const [draftItems, setDraftItems] = useState([]);
  const [draftCustomer, setDraftCustomer] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftOther, setDraftOther] = useState('');
  const [draftOtherName, setDraftOtherName] = useState('');
  const [draftShip, setDraftShip] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(orders.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const pageOrders = orders.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);

  const orderCost = (order) => (order.items || []).reduce((s, it) => s + Number(it.quantity || 0) * costOf(it), 0);
  // Tiền hàng (không gồm ship & phí khác) — lãi chỉ tính trên tiền hàng
  const orderGoods = (order) => (order.items || []).reduce((s, it) => s + Number(it.quantity || 0) * Number(it.price || 0), 0);

  const startEdit = (order) => {
    setEditingId(order.id);
    setDraftItems((order.items || []).map((i) => ({ ...i, quantity: String(i.quantity), price: String(i.price) })));
    setDraftCustomer(order.customer_name || '');
    setDraftNote(order.note || '');
    setDraftOther(order.other_fee ? String(order.other_fee) : '');
    setDraftOtherName(order.other_fee_name || '');
    setDraftShip(order.shipping_fee ? String(order.shipping_fee) : '');
    setDraftDate(order.receive_date || '');
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
    const current = orders.find((o) => o.id === editingId) || {};
    if ((draftDate || null) !== (current.receive_date || null)) patch.receive_date = draftDate || null;
    if (draftCustomer.trim() || current.customer_name) patch.customer_name = draftCustomer.trim() || null;
    if (draftNote.trim() || current.note) patch.note = draftNote.trim() || null;
    if (otherFee > 0 || Number(current.other_fee) > 0) patch.other_fee = otherFee;
    if ((draftOtherName.trim() || null) !== (current.other_fee_name || null)) patch.other_fee_name = draftOtherName.trim() || null;
    if (ship > 0 || Number(current.shipping_fee) > 0) patch.shipping_fee = ship;
    const { data, error } = await supabase.from('orders').update(patch).eq('id', editingId).select().single();
    setSavingEdit(false);
    if (error) {
      if (error.code === 'PGRST116') return alert(BLOCKED_MSG);
      if (/customer_name|note|shipping_fee|other_fee|receive_date|other_fee_name/.test(error.message || ''))
        return alert('Chưa có cột tên khách/tiền ship/ghi chú/phí khác/ngày nhận/tên phí. Chạy file supabase/orders_customer_note.sql trong Supabase rồi thử lại.');
      return alert('Không lưu được: ' + error.message);
    }
    setOrders((list) => list.map((o) => (o.id === data.id ? data : o)));
    cancelEdit();
  };

  const handleDelete = async (order) => {
    if (
      !confirm(
        `Xóa hóa đơn #${shortId(order.id)} ngày ${format(parseISO(order.created_at), 'dd-MM-yyyy')} (${formatVND(order.total_amount)})?\nKhông thể hoàn tác.`,
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
    <>
      <ul className="divide-y divide-line">
        {pageOrders.map((order) => {
          const isEditing = editingId === order.id;
          return (
            <li
              key={order.id}
              className={`flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6 ${isEditing ? 'bg-blush/30' : ''}`}
            >
              <div className="md:w-44 md:shrink-0">
                <span className="badge bg-paper-dim font-mono font-semibold text-ink">#{shortId(order.id)}</span>
                <p className="mt-2 text-sm text-muted">{format(parseISO(order.created_at), 'dd-MM-yyyy · HH:mm')}</p>
                {!isEditing && order.customer_name && <p className="mt-1 text-sm font-medium text-ink">{order.customer_name}</p>}
                {!isEditing && order.receive_date && (
                  <p className="mt-1 text-xs font-medium text-brick">Nhận: {format(parseISO(order.receive_date), 'dd-MM-yyyy')}</p>
                )}
              </div>

              {isEditing ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="grid gap-2 pb-2 sm:grid-cols-2">
                    <DateField
                      value={draftDate}
                      onChange={setDraftDate}
                      placeholder="Ngày nhận (dd-mm-yyyy)"
                      aria-label="Ngày nhận"
                      className="[&_.input]:h-9 [&_.input]:text-sm"
                    />
                    <input
                      type="text"
                      value={draftCustomer}
                      onChange={(e) => setDraftCustomer(e.target.value)}
                      placeholder="Tên khách"
                      aria-label="Tên khách"
                      className="input h-9 text-sm"
                    />
                    <textarea
                      rows={Math.min(5, Math.max(2, draftNote.split('\n').length))}
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="Ghi chú (mỗi ý một dòng)"
                      aria-label="Ghi chú"
                      className="input py-2 text-sm sm:col-span-2"
                    />
                    <div className="grid grid-cols-5 gap-2">
                      <input
                        type="text"
                        list="fee-names-edit"
                        autoComplete="off"
                        value={draftOtherName}
                        onChange={(e) => setDraftOtherName(e.target.value)}
                        placeholder="Tên phí khác"
                        aria-label="Tên phí khác"
                        className="input col-span-3 h-9 text-sm"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={toNumber(draftOther) ? toNumber(draftOther).toLocaleString('vi-VN') : ''}
                        onChange={(e) => setDraftOther(e.target.value)}
                        placeholder="Phí khác"
                        aria-label="Phí khác"
                        className="input col-span-2 h-9 text-sm"
                      />
                    </div>
                    <datalist id="fee-names-edit">
                      {[...new Set(orders.map((o) => o.other_fee_name).filter(Boolean))].map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
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
                      <span className="min-w-0 flex-1 basis-full truncate text-sm font-medium sm:basis-auto">{item.product_name}</span>
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
                  {!draftValid && <p className="text-sm text-brick">Hóa đơn cần ít nhất 1 sản phẩm, số lượng lớn hơn 0.</p>}
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
                      <span className="text-muted">Phí khác{order.other_fee_name ? ` (${order.other_fee_name})` : ''}</span>
                      <span className="shrink-0 text-muted">{formatVND(order.other_fee)}</span>
                    </p>
                  )}
                  {order.note && (
                    <p className="mt-3 flex items-start gap-1 text-xs text-muted">
                      <NotePencil size={14} className="mt-px shrink-0" />
                      <span className="whitespace-pre-wrap"><span className="font-medium text-ink">Ghi chú:</span> {order.note}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="w-full shrink-0 border-t border-line pt-4 md:w-52 md:border-0 md:pt-0">
                <div className="mb-3 text-left md:text-right">
                  <p className="text-lg font-semibold text-brick">
                    {formatVND(isEditing ? sumOrder(draftItems) + toNumber(draftShip) + toNumber(draftOther) : order.total_amount)}
                  </p>
                  {!isEditing && orderCost(order) > 0 && (
                    <p className="text-xs text-muted">
                      Vốn: {formatVND(orderCost(order))}
                      <br className="sm:hidden" />
                      <span className="hidden sm:inline"> · </span>
                      <span className="font-semibold text-sage">Lời: +{formatVND(orderGoods(order) - orderCost(order))}</span>
                    </p>
                  )}
                </div>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={cancelEdit} disabled={savingEdit} className="btn btn-ghost btn-sm w-full justify-center">
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={savingEdit || !draftValid}
                      className="btn btn-primary btn-sm w-full justify-center rounded-lg"
                    >
                      {savingEdit ? <CircleNotch size={16} className="animate-spin" /> : <Check size={16} weight="bold" />}
                      Lưu
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => invoice.sendImage(order)}
                      disabled={invoice.busy}
                      className="btn btn-accent btn-sm w-full min-w-0 justify-center px-2"
                    >
                      <ShareNetwork size={16} /> Gửi ảnh
                    </button>
                    <button type="button" onClick={() => invoice.print(order)} className="btn btn-outline btn-sm w-full min-w-0 justify-center px-2">
                      <Printer size={16} /> In / PDF
                    </button>
                    <button type="button" onClick={() => startEdit(order)} className="btn btn-ghost btn-sm w-full min-w-0 justify-center px-2 text-muted hover:text-ink">
                      <PencilSimple size={16} /> Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(order)}
                      className="btn btn-ghost btn-sm w-full min-w-0 justify-center px-2 text-muted hover:bg-brick/10 hover:text-brick"
                    >
                      <Trash size={16} /> Xóa
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2 border-t border-line px-4 py-4">
          <Pagination page={curPage} totalPages={totalPages} onChange={setPage} />
          <p className="text-xs text-muted">
            Hóa đơn {((curPage - 1) * PER_PAGE + 1).toLocaleString('vi-VN')}–
            {Math.min(curPage * PER_PAGE, orders.length).toLocaleString('vi-VN')} / {orders.length.toLocaleString('vi-VN')}
          </p>
        </div>
      )}
      {invoice.element}
    </>
  );
}
