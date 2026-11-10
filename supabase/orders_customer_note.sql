-- Các cột thêm cho bảng hóa đơn (orders): tên khách hàng, tiền ship, phí khác (+ tên phí), ghi chú, ngày nhận
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run
-- Chạy lại nhiều lần cũng không sao (cột đã có sẽ được bỏ qua).

alter table public.orders
  add column if not exists customer_name text,                       -- Tên khách hàng
  add column if not exists shipping_fee  numeric not null default 0, -- Tiền ship (đồng)
  add column if not exists other_fee     numeric not null default 0, -- Phí khác (đồng), cộng vào tổng
  add column if not exists other_fee_name text,                      -- Tên phí khác: Thiệp, Gói quà...
  add column if not exists note          text,                       -- Ghi chú
  add column if not exists receive_date  date;                       -- Ngày khách nhận hàng

comment on column public.orders.customer_name is 'Tên khách hàng';
comment on column public.orders.shipping_fee  is 'Tiền ship (VND)';
comment on column public.orders.other_fee     is 'Phí khác (VND) — cộng vào tổng tiền';
comment on column public.orders.other_fee_name is 'Tên phí khác (thiệp, gói quà...) — dùng để gợi ý lần sau';
comment on column public.orders.note          is 'Ghi chú';
comment on column public.orders.receive_date  is 'Ngày khách nhận hàng';

-- Cột chữ "other_info" (Khác) cũ không còn dùng. Nếu đã tạo trước đó và muốn xóa hẳn,
-- bỏ dấu "--" ở dòng dưới rồi chạy (nội dung đã ghi trong cột này sẽ mất):
-- alter table public.orders drop column if exists other_info;
