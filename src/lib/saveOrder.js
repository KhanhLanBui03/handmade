import { format, parseISO } from 'date-fns';
import { supabase } from './supabase';

/**
 * Thêm hóa đơn vào bảng orders, trả về { data, error, movedToNote }.
 * Nếu Supabase chưa có cột receive_date / other_fee_name (chưa chạy SQL), tự lưu lại không có
 * các cột đó và ghi thông tin vào cuối ghi chú — để không bị kẹt khi đang bán hàng.
 */
export async function insertOrder(order) {
  const first = await supabase.from('orders').insert([order]).select().single();
  const msg = first.error?.message || '';
  const dropDate = order.receive_date && /receive_date/.test(msg);
  const dropFeeName = order.other_fee_name && /other_fee_name/.test(msg);
  if (!first.error || (!dropDate && !dropFeeName)) return { ...first, movedToNote: false };

  // Bỏ mọi cột tùy chọn có thể đang thiếu, chuyển nội dung vào ghi chú
  const { receive_date, other_fee_name, ...rest } = order;
  const lines = [];
  if (receive_date) lines.push(`Ngày nhận: ${format(parseISO(receive_date), 'dd-MM-yyyy')}`);
  if (other_fee_name) lines.push(`Phí khác: ${other_fee_name}`);
  rest.note = [rest.note, ...lines].filter(Boolean).join('\n');
  const second = await supabase.from('orders').insert([rest]).select().single();
  return { ...second, movedToNote: !second.error };
}

/**
 * Các tên "phí khác" đã từng dùng, xếp theo số lần dùng (nhiều nhất trước),
 * kèm số tiền của lần gần nhất — để gợi ý khi nhập hóa đơn mới.
 * Trả về [] nếu Supabase chưa có cột other_fee_name.
 */
export async function loadFeeNames() {
  const { data, error } = await supabase
    .from('orders')
    .select('other_fee_name, other_fee, created_at')
    .not('other_fee_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error || !data) return [];
  const map = new Map();
  data.forEach((r) => {
    const name = String(r.other_fee_name || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!map.has(key)) map.set(key, { name, amount: Number(r.other_fee) || 0, count: 0 }); // dòng đầu = mới nhất
    map.get(key).count += 1;
  });
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
}
