import { useState, useEffect, useMemo } from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import {
  CheckCircle, CircleNotch, Minus, Plus, MagnifyingGlass, Trash, ShoppingBagOpen,
  CurrencyCircleDollar, Receipt, Package, WarningCircle,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { formatVND, getCover, parsePrice } from '../../lib/format';
import { PageHeader, StatCard, Spinner, Thumb, EmptyState } from '../../components/admin/ui';

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
        .filter((p) => orderItems[p.id] > 0)
        .map((p) => ({ product: p, quantity: orderItems[p.id], price: parsePrice(p.price) })),
    [products, orderItems],
  );
  const total = cart.reduce((s, i) => s + i.quantity * i.price, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return q ? products.filter((p) => normalize(p.name).includes(q)) : products;
  }, [products, search]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveOrder = async () => {
    if (total <= 0) return;
    setSaving(true);
    const items = cart.map((i) => ({
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
      price: i.price,
    }));
    const { error } = await supabase.from('orders').insert([{ total_amount: total, items }]);
    setSaving(false);

    if (error) {
      showToast('error', 'Lỗi lưu đơn hàng: ' + error.message);
    } else {
      showToast('success', `Đã lưu hóa đơn ${formatVND(total)}`);
      setOrderItems({});
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
                {visible.map((p) => {
                  const q = orderItems[p.id] || 0;
                  const price = parsePrice(p.price);
                  return (
                    <li key={p.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${q > 0 ? 'bg-blush/40' : ''}`}>
                      <Thumb src={getCover(p)} />
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

            {cart.length === 0 ? (
              <EmptyState icon={ShoppingBagOpen} title="Chưa có sản phẩm" text="Bấm nút + ở danh sách bên cạnh để thêm vào hóa đơn." />
            ) : (
              <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto px-5">
                {cart.map((i) => (
                  <li key={i.product.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{i.product.name}</p>
                      <p className="text-muted">{i.quantity} × {formatVND(i.price)}</p>
                    </div>
                    <p className="shrink-0 font-semibold">{formatVND(i.quantity * i.price)}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-auto space-y-4 border-t border-line bg-paper-dim/60 p-5 rounded-b-2xl">
              <div className="flex justify-between text-sm text-muted">
                <span>Số lượng</span>
                <span>{itemCount} sản phẩm</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="font-medium">Tổng thanh toán</span>
                <span className="text-2xl font-semibold tracking-tight text-brick">{formatVND(total)}</span>
              </div>
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={saving || total <= 0}
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
    </div>
  );
}
