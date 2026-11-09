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
  Check,
  X,
  Receipt,
  Trash,
  ArrowCounterClockwise,
  Database,
  CircleNotch,
  ShoppingBag,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { formatVND, shortId } from '../../lib/format';
import { PageHeader, Spinner, EmptyState } from '../../components/admin/ui';

const STATUS = {
  new: { label: 'Mới', cls: 'bg-sunflower/20 text-[#8a5a00]' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-blush text-brick' },
  done: { label: 'Hoàn thành', cls: 'bg-sage-soft text-sage' },
  cancelled: { label: 'Đã hủy', cls: 'bg-ink/10 text-muted' },
};
const TABS = [
  { v: 'new', label: 'Mới' },
  { v: 'confirmed', label: 'Đã xác nhận' },
  { v: 'done', label: 'Hoàn thành' },
  { v: 'cancelled', label: 'Đã hủy' },
  { v: 'all', label: 'Tất cả' },
];

const isMissingTable = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /customer_orders/.test(error.message || ''));

// Số Zalo: 0901234567 -> https://zalo.me/0901234567
const zaloLink = (phone) => `https://zalo.me/${String(phone).replace(/[^\d]/g, '')}`;

export default function OnlineOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [tab, setTab] = useState('new');
  const [busyId, setBusyId] = useState(null);

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
  const visible = tab === 'all' ? orders : orders.filter((o) => o.status === tab);

  const replace = (row) => setOrders((list) => list.map((o) => (o.id === row.id ? row : o)));

  const setStatus = async (order, status) => {
    setBusyId(order.id);
    const { data, error } = await supabase.from('customer_orders').update({ status }).eq('id', order.id).select().single();
    setBusyId(null);
    if (error) return alert('Không cập nhật được: ' + error.message);
    replace(data);
  };

  // Chuyển đơn online thành hóa đơn bán hàng (trang Hóa đơn)
  const createInvoice = async (order) => {
    if (!confirm(`Tạo hóa đơn từ đơn #${shortId(order.id)} của ${order.customer_name}?\nPhí ship có thể sửa thêm ở trang Hóa đơn.`)) return;
    setBusyId(order.id);
    // Mỗi thông tin một dòng
    const noteParts = [
      order.delivery_method === 'ship' && order.address ? `Giao: ${order.address}` : 'Nhận hàng: Khách tự đến lấy',
      order.receive_date ? `Ngày nhận: ${format(parseISO(order.receive_date), 'dd-MM-yyyy')}` : null,
      `SĐT: ${order.phone}`,
      order.note ? `Ghi chú: ${order.note}` : null,
    ].filter(Boolean);
    const invoice = {
      total_amount: order.total_amount,
      items: order.items,
      customer_name: order.customer_name,
      note: noteParts.join('\n'),
    };
    const { data: inv, error } = await supabase.from('orders').insert([invoice]).select().single();
    if (error) {
      setBusyId(null);
      return alert(
        /customer_name|note/.test(error.message || '')
          ? 'Chưa có cột tên khách/ghi chú cho hóa đơn. Chạy file supabase/orders_customer_note.sql trong Supabase rồi thử lại.'
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
        description="Đơn khách đặt trên website. Xác nhận với khách qua Zalo/điện thoại, sau đó tạo hóa đơn."
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

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
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

      {loading ? (
        <div className="card"><Spinner /></div>
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShoppingBag}
            title={tab === 'new' ? 'Chưa có đơn mới' : 'Không có đơn nào'}
            text="Khi khách đặt hàng trên website, đơn sẽ hiện ở đây."
          />
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((o) => {
            const st = STATUS[o.status] || STATUS.new;
            const busy = busyId === o.id;
            return (
              <li key={o.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper-dim/40 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-surface font-mono font-semibold text-ink ring-1 ring-line">#{shortId(o.id)}</span>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                  </div>
                  <span className="text-xs text-muted">Đặt lúc {format(parseISO(o.created_at), 'HH:mm dd-MM-yyyy')}</span>
                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2">
                  {/* Khách hàng */}
                  <div className="space-y-2 text-sm">
                    <p className="text-base font-semibold">{o.customer_name}</p>
                    <div className="flex flex-wrap gap-2">
                      <a href={`tel:${o.phone}`} className="btn btn-outline btn-sm">
                        <Phone size={16} /> {o.phone}
                      </a>
                      <a href={zaloLink(o.phone)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                        <ChatCircleDots size={16} /> Zalo
                      </a>
                    </div>
                    <p className="flex items-start gap-2 text-muted">
                      {o.delivery_method === 'pickup' ? (
                        <><Storefront size={18} className="mt-px shrink-0" /> Khách tự đến lấy</>
                      ) : (
                        <><Truck size={18} className="mt-px shrink-0" /> <span className="text-ink">{o.address}</span></>
                      )}
                    </p>
                    {o.receive_date && (
                      <p className="flex items-center gap-2 text-muted">
                        <CalendarBlank size={18} className="shrink-0" /> Muốn nhận ngày{' '}
                        <span className="font-medium text-ink">{format(parseISO(o.receive_date), 'dd-MM-yyyy')}</span>
                      </p>
                    )}
                    {o.note && (
                      <p className="flex items-start gap-2 text-muted">
                        <NotePencil size={18} className="mt-px shrink-0" /> <span className="whitespace-pre-wrap text-ink">{o.note}</span>
                      </p>
                    )}
                  </div>

                  {/* Sản phẩm */}
                  <div>
                    <ul className="space-y-1.5 text-sm">
                      {(o.items || []).map((it, idx) => (
                        <li key={idx} className="flex justify-between gap-4">
                          <span>
                            <span className="font-semibold text-muted">{it.quantity}×</span> {it.product_name}
                          </span>
                          <span className="shrink-0 text-muted">{formatVND(it.quantity * it.price)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                      <span className="text-sm text-muted">Tổng tiền hàng</span>
                      <span className="text-lg font-semibold text-brick">{formatVND(o.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Thao tác */}
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
                  {busy && <CircleNotch size={18} className="mr-auto animate-spin text-muted" />}
                  {o.status === 'new' && (
                    <>
                      <button type="button" disabled={busy} onClick={() => setStatus(o, 'cancelled')} className="btn btn-ghost btn-sm text-muted">
                        <X size={16} /> Hủy đơn
                      </button>
                      <button type="button" disabled={busy} onClick={() => setStatus(o, 'confirmed')} className="btn btn-primary btn-sm">
                        <Check size={16} weight="bold" /> Đã xác nhận với khách
                      </button>
                    </>
                  )}
                  {o.status === 'confirmed' && (
                    <>
                      <button type="button" disabled={busy} onClick={() => setStatus(o, 'cancelled')} className="btn btn-ghost btn-sm text-muted">
                        <X size={16} /> Hủy đơn
                      </button>
                      <button type="button" disabled={busy} onClick={() => createInvoice(o)} className="btn btn-accent btn-sm">
                        <Receipt size={16} /> Tạo hóa đơn
                      </button>
                    </>
                  )}
                  {o.status === 'done' && o.invoice_id && (
                    <Link to="/admin/orders" className="btn btn-ghost btn-sm text-sage">
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
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
