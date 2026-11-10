import React from 'react';
import { format, parseISO } from 'date-fns';
import { CONTACT, moneyToWords } from '../lib/format';
import { BrandMark } from './BrandLogo';

// Màu cố định cho bản in / ảnh (không phụ thuộc theme web)
const C = {
  blue: '#0277bd',
  blueDark: '#015a92',
  blueSoft: '#eaf5fc',
  ink: '#0b1e33',
  muted: '#5a6b7d',
  line: '#d6e4f0',
};
const vnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

export const InvoicePrint = React.forwardRef(({ order }, ref) => {
  if (!order) return <div ref={ref}></div>;

  const orderDate = order.created_at ? parseISO(order.created_at) : new Date();
  const items = order.items || [];
  const ship = Number(order.shipping_fee) || 0;
  const other = Number(order.other_fee) || 0;
  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.price), 0);
  const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const code = String(order.id).split('-')[0].toUpperCase();

  return (
    <div
      ref={ref}
      className="bg-white"
      style={{
        color: C.ink,
        fontFamily: "'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif",
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Dải màu thương hiệu */}
      <div style={{ height: 8, background: `linear-gradient(90deg, #1a9be0, ${C.blueDark})` }} />

      <div className="px-10 pb-8 pt-8">
        {/* Đầu hóa đơn */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandMark className="size-14" />
            <div>
              <p className="text-2xl font-bold" style={{ letterSpacing: '-0.02em' }}>Trạm Hoa Nhỏ</p>
              <p className="mt-0.5 text-xs font-semibold uppercase" style={{ color: C.blue, letterSpacing: '0.16em' }}>
                Hoa kẽm nhung handmade
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="whitespace-nowrap text-[26px] font-bold uppercase leading-tight" style={{ color: C.blue, letterSpacing: '0.03em' }}>
              Phiếu mua hàng
            </p>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>
              Số: <span className="font-semibold" style={{ color: C.ink }}>#{code}</span>
            </p>
          </div>
        </div>

        {/* Thông tin đơn */}
        <div
          className={`mt-7 grid gap-4 rounded-xl px-5 py-4 ${order.receive_date ? 'grid-cols-4' : 'grid-cols-3'}`}
          style={{ background: C.blueSoft }}
        >
          <Info label="Khách hàng" value={order.customer_name || '—'} />
          <Info label="Ngày lập" value={format(orderDate, 'dd-MM-yyyy')} />
          <Info label="Giờ" value={format(orderDate, 'HH:mm')} />
          {order.receive_date && <Info label="Ngày nhận" value={format(parseISO(order.receive_date), 'dd-MM-yyyy')} />}
        </div>

        {/* Bảng sản phẩm */}
        <table className="mt-7 w-full border-collapse text-left text-sm">
          <thead>
            <tr style={{ background: C.blue, color: '#fff' }}>
              <th className="rounded-l-lg py-3 pl-4 pr-2 font-semibold" style={{ width: 44 }}>STT</th>
              <th className="px-2 py-3 font-semibold">Sản phẩm</th>
              <th className="px-2 py-3 text-center font-semibold" style={{ width: 60 }}>SL</th>
              <th className="px-2 py-3 text-right font-semibold" style={{ width: 120 }}>Đơn giá</th>
              <th className="rounded-r-lg py-3 pl-2 pr-4 text-right font-semibold" style={{ width: 130 }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="py-3.5 pl-4 pr-2" style={{ color: C.muted }}>{idx + 1}</td>
                <td className="px-2 py-3.5 font-medium">{item.product_name}</td>
                <td className="px-2 py-3.5 text-center">{item.quantity}</td>
                <td className="px-2 py-3.5 text-right" style={{ color: C.muted }}>{vnd(item.price)}</td>
                <td className="py-3.5 pl-2 pr-4 text-right font-semibold">{vnd(item.quantity * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Ghi chú (trái) + Tổng tiền (phải) nằm cùng hàng */}
        <div className="mt-6 flex items-start justify-between gap-8">
          <div className="min-w-0 flex-1">
            {order.note && (
              <div
                className="rounded-r-lg py-3 pl-4 pr-4 text-sm"
                style={{ borderLeft: `4px solid ${C.blue}`, background: C.blueSoft }}
              >
                <p className="mb-1 font-semibold" style={{ color: C.blueDark }}>Ghi chú</p>
                <p className="whitespace-pre-wrap break-words leading-relaxed">{order.note}</p>
              </div>
            )}
          </div>

          <div className="shrink-0" style={{ width: 300 }}>
            <Row label={`Tiền hàng (${totalQty} sản phẩm)`} value={vnd(subtotal)} />
            {ship > 0 && <Row label="Tiền ship" value={vnd(ship)} />}
            {other > 0 && <Row label={order.other_fee_name ? `Phí khác (${order.other_fee_name})` : 'Phí khác'} value={vnd(other)} />}
            <div
              className="mt-3 flex items-center justify-between rounded-xl px-4 py-3.5"
              style={{ background: C.blue, color: '#fff' }}
            >
              <span className="text-sm font-semibold uppercase" style={{ letterSpacing: '0.06em' }}>Tổng cộng</span>
              <span className="text-2xl font-bold">{vnd(order.total_amount)}</span>
            </div>
            <p className="mt-3 text-right text-sm" style={{ color: C.muted }}>
              Bằng chữ: <span className="font-medium" style={{ color: C.ink }}>{moneyToWords(order.total_amount)}</span>
            </p>
          </div>
        </div>

        {/* Lời cảm ơn */}
        <p className="mt-10 text-center text-lg font-semibold" style={{ color: C.blue }}>
          Cảm ơn bạn đã ghé Trạm Hoa Nhỏ!
        </p>
      </div>

      {/* Chân hóa đơn: tên shop + SĐT */}
      <div
        className="flex items-center justify-between px-10 py-4 text-xs"
        style={{ background: C.ink, color: 'rgba(255,255,255,0.85)' }}
      >
        <span className="font-semibold text-white">Trạm Hoa Nhỏ — Hoa kẽm nhung handmade</span>
        <span>SĐT/Zalo: <span className="font-semibold text-white">{CONTACT.phoneDisplay}</span></span>
      </div>
    </div>
  );
});

function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase" style={{ color: C.muted, letterSpacing: '0.08em' }}>{label}</p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span style={{ color: C.muted }}>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
