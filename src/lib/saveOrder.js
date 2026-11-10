import { format, parseISO } from 'date-fns';
import { supabase } from './supabase';

const missingReceiveDate = (error) => /receive_date/.test(error?.message || '');

/**
 * Thêm hóa đơn vào bảng orders, trả về { data, error, movedDateToNote }.
 * Nếu Supabase chưa có cột receive_date (chưa chạy SQL), tự lưu lại không có cột đó
 * và ghi ngày nhận vào cuối ghi chú — để không bị kẹt khi đang bán hàng.
 */
export async function insertOrder(order) {
  const first = await supabase.from('orders').insert([order]).select().single();
  if (!first.error || !order.receive_date || !missingReceiveDate(first.error)) return { ...first, movedDateToNote: false };

  const { receive_date, ...rest } = order;
  const line = `Ngày nhận: ${format(parseISO(receive_date), 'dd-MM-yyyy')}`;
  rest.note = rest.note ? `${rest.note}
${line}` : line;
  const second = await supabase.from('orders').insert([rest]).select().single();
  return { ...second, movedDateToNote: !second.error };
}
