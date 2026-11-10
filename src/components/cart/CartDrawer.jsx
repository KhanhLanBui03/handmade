import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Minus,
  Plus,
  Trash,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CircleNotch,
  ChatCircleDots,
  Truck,
  Storefront,
  Flower,
} from '@phosphor-icons/react';
import { useCart } from '../../lib/cart-context';
import { supabase } from '../../lib/supabase';
import { CONTACT, formatVND, shortId } from '../../lib/format';
import { DateField } from '../admin/ui';

const INFO_KEY = 'tramhoanho:customer';
const loadInfo = () => {
  try {
    return JSON.parse(localStorage.getItem(INFO_KEY) || '{}') || {};
  } catch {
    return {};
  }
};
const today = () => format(new Date(), 'yyyy-MM-dd');

export default function CartDrawer() {
  const cart = useCart();
  const [step, setStep] = useState('cart'); // 'cart' | 'checkout' | 'done'
  const [doneCode, setDoneCode] = useState('');
  const closeRef = useRef(null);
  const { isOpen, closeCart } = cart;

  // Mở ngăn: khóa cuộn trang, Esc để đóng
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && closeCart();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, closeCart]);

  const close = () => {
    cart.closeCart();
    if (step === 'done') setStep('cart');
  };

  const title = step === 'checkout' ? 'Thông tin đặt hàng' : step === 'done' ? 'Đặt hàng thành công' : 'Giỏ hàng';

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-4">
              {step === 'checkout' && (
                <button type="button" onClick={() => setStep('cart')} className="icon-btn" aria-label="Quay lại giỏ hàng">
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 className="flex-1 px-1 text-lg font-semibold">
                {title}
                {step === 'cart' && cart.count > 0 && <span className="ml-1.5 text-muted">({cart.count})</span>}
              </h2>
              <button ref={closeRef} type="button" onClick={close} className="icon-btn" aria-label="Đóng">
                <X size={20} />
              </button>
            </header>

            {step === 'cart' && <CartStep onNext={() => setStep('checkout')} onClose={close} />}
            {step === 'checkout' && (
              <CheckoutStep
                onDone={(id) => {
                  setDoneCode(shortId(id));
                  setStep('done');
                }}
              />
            )}
            {step === 'done' && <DoneStep code={doneCode} onClose={close} />}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function CartStep({ onNext, onClose }) {
  const { items, setQty, remove, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-blush text-brick">
          <ShoppingBag size={30} weight="duotone" />
        </span>
        <p className="mt-4 font-semibold">Giỏ hàng đang trống</p>
        <p className="mt-1 text-sm text-muted">Bấm vào một sản phẩm và chọn “Thêm vào giỏ” nhé.</p>
        <button type="button" onClick={onClose} className="btn btn-primary mt-6">
          Xem sản phẩm
        </button>
      </div>
    );
  }

  return (
    <>
      <ul className="flex-1 divide-y divide-line overflow-y-auto px-4">
        {items.map((i) => (
          <li key={i.id} className="flex gap-3 py-4">
            <div className="aspect-[9/16] w-14 shrink-0 overflow-hidden rounded-lg bg-paper-dim ring-1 ring-line">
              {i.image ? (
                <img src={i.image} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-ink/20">
                  <Flower size={20} weight="duotone" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium leading-snug">{i.name}</p>
                <button
                  type="button"
                  onClick={() => remove(i.id)}
                  className="icon-btn -mr-2 -mt-1 size-8 shrink-0 hover:text-brick"
                  aria-label={`Bỏ ${i.name} khỏi giỏ`}
                >
                  <Trash size={16} />
                </button>
              </div>
              <p className="text-sm text-muted">{formatVND(i.price)}</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <Stepper value={i.quantity} onChange={(q) => setQty(i.id, q)} label={i.name} />
                <span className="font-semibold">{formatVND(i.price * i.quantity)}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <footer className="shrink-0 space-y-3 border-t border-line bg-surface p-4">
        <div className="flex items-end justify-between">
          <span className="text-sm text-muted">Tạm tính</span>
          <span className="text-xl font-semibold text-brick">{formatVND(total)}</span>
        </div>
        <p className="text-xs text-muted">Phí ship (nếu có) shop sẽ báo khi xác nhận đơn.</p>
        <button type="button" onClick={onNext} className="btn btn-accent btn-lg w-full rounded-xl">
          Tiến hành đặt hàng <ArrowRight weight="bold" />
        </button>
      </footer>
    </>
  );
}

function CheckoutStep({ onDone }) {
  const { items, total, clear } = useCart();
  const saved = loadInfo();
  const [name, setName] = useState(saved.name || '');
  const [phone, setPhone] = useState(saved.phone || '');
  const [method, setMethod] = useState(saved.method || 'ship');
  const [address, setAddress] = useState(saved.address || '');
  const [receiveDate, setReceiveDate] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const phoneClean = phone.replace(/[^\d+]/g, '');
  const phoneOk = /^\+?\d{9,12}$/.test(phoneClean);
  const valid = name.trim() && phoneOk && (method === 'pickup' || address.trim()) && items.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || sending) return;
    setSending(true);
    setError('');

    const id = crypto.randomUUID();
    const { error: err } = await supabase.from('customer_orders').insert([
      {
        id,
        customer_name: name.trim(),
        phone: phoneClean,
        delivery_method: method,
        address: method === 'ship' ? address.trim() : null,
        receive_date: receiveDate || null,
        note: note.trim() || null,
        items: items.map((i) => ({ product_id: i.product_id ?? i.id, product_name: i.name, variant: i.variant || null, quantity: i.quantity, price: i.price })),
        total_amount: total,
      },
    ]);
    setSending(false);

    if (err) {
      setError('Chưa gửi được đơn, bạn thử lại hoặc nhắn Zalo cho shop nhé.');
      return;
    }
    try {
      localStorage.setItem(INFO_KEY, JSON.stringify({ name: name.trim(), phone: phoneClean, method, address: address.trim() }));
    } catch {
      /* bỏ qua */
    }
    clear();
    onDone(id);
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <label htmlFor="co-name" className="label">
            Họ tên <span className="text-brick">*</span>
          </label>
          <input id="co-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" className="input" placeholder="VD: Nguyễn Thu Hà" />
        </div>
        <div>
          <label htmlFor="co-phone" className="label">
            Số điện thoại / Zalo <span className="text-brick">*</span>
          </label>
          <input
            id="co-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            className={`input ${phone && !phoneOk ? 'border-brick' : ''}`}
            placeholder="VD: 0901 234 567"
            aria-invalid={(phone && !phoneOk) || undefined}
          />
          {phone && !phoneOk && <p className="mt-1 text-xs text-brick">Số điện thoại chưa đúng.</p>}
        </div>

        <fieldset>
          <legend className="label">Cách nhận hàng</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: 'ship', label: 'Giao tận nơi', icon: Truck },
              { v: 'pickup', label: 'Tự đến lấy', icon: Storefront },
            ].map((o) => (
              <label
                key={o.v}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  method === o.v ? 'border-brick bg-blush text-brick' : 'border-line bg-surface text-ink hover:border-ink/30'
                }`}
              >
                <input type="radio" name="method" value={o.v} checked={method === o.v} onChange={() => setMethod(o.v)} className="sr-only" />
                <o.icon size={18} weight={method === o.v ? 'fill' : 'regular'} /> {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        {method === 'ship' && (
          <div>
            <label htmlFor="co-address" className="label">
              Địa chỉ nhận hàng <span className="text-brick">*</span>
            </label>
            <textarea id="co-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={300} autoComplete="street-address" className="input" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh" />
          </div>
        )}

        <div>
          <label htmlFor="co-date" className="label">
            Ngày muốn nhận <span className="font-normal text-muted">(không bắt buộc)</span>
          </label>
          <DateField id="co-date" value={receiveDate} onChange={setReceiveDate} min={today()} />
        </div>

        <div>
          <label htmlFor="co-note" className="label">
            Ghi chú cho shop <span className="font-normal text-muted">(không bắt buộc)</span>
          </label>
          <textarea id="co-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} className="input" placeholder="Màu giấy gói, lời chúc trên thiệp, giờ nhận..." />
        </div>

        <div className="rounded-xl border border-line bg-surface p-3 text-sm">
          <p className="mb-2 font-semibold">Đơn của bạn</p>
          <ul className="space-y-1 text-muted">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {i.quantity} × {i.name}
                </span>
                <span className="shrink-0">{formatVND(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="shrink-0 space-y-3 border-t border-line bg-surface p-4">
        {error && <p role="alert" className="text-sm text-brick">{error}</p>}
        <div className="flex items-end justify-between">
          <span className="text-sm text-muted">Tổng tiền hàng</span>
          <span className="text-xl font-semibold text-brick">{formatVND(total)}</span>
        </div>
        <button type="submit" disabled={!valid || sending} className="btn btn-accent btn-lg w-full rounded-xl">
          {sending ? <CircleNotch size={20} className="animate-spin" /> : <CheckCircle size={20} weight="fill" />}
          Gửi đơn đặt hàng
        </button>
        <p className="text-center text-xs text-muted">Chưa cần thanh toán — shop sẽ liên hệ xác nhận đơn trước.</p>
      </footer>
    </form>
  );
}

function DoneStep({ code, onClose }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-sage-soft text-sage">
        <CheckCircle size={34} weight="fill" />
      </span>
      <p className="mt-5 text-xl font-semibold">Cảm ơn bạn đã đặt hàng!</p>
      <p className="mt-2 text-sm text-muted">
        Mã đơn của bạn: <span className="font-semibold text-ink">#{code}</span>
      </p>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
        Shop sẽ nhắn Zalo hoặc gọi cho bạn để xác nhận đơn và báo phí ship trong thời gian sớm nhất.
      </p>
      <div className="mt-7 grid w-full gap-2">
        <a href={CONTACT.zalo} target="_blank" rel="noreferrer" className="btn btn-accent w-full rounded-xl">
          <ChatCircleDots size={18} weight="bold" /> Nhắn Zalo cho shop
        </a>
        <button type="button" onClick={onClose} className="btn btn-outline w-full rounded-xl">
          Tiếp tục xem sản phẩm
        </button>
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, label }) {
  return (
    <div className="flex items-center rounded-full border border-line bg-surface">
      <button type="button" onClick={() => onChange(value - 1)} className="flex size-8 items-center justify-center rounded-full text-ink hover:bg-ink/5" aria-label={`Giảm số lượng ${label}`}>
        <Minus size={14} weight="bold" />
      </button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} className="flex size-8 items-center justify-center rounded-full text-ink hover:bg-ink/5" aria-label={`Tăng số lượng ${label}`}>
        <Plus size={14} weight="bold" />
      </button>
    </div>
  );
}
