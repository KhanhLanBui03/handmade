-- Đơn đặt hàng online của khách (trang Admin › Đơn online)
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run
-- Khách (chưa đăng nhập) chỉ được GỬI đơn mới, không xem/sửa/xóa được đơn nào.
-- Admin (đã đăng nhập) xem, đổi trạng thái, xóa và chuyển đơn thành hóa đơn.

create table if not exists public.customer_orders (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  customer_name   text not null check (char_length(customer_name) between 1 and 100),
  phone           text not null check (phone ~ '^[0-9+ .]{8,15}$'),
  delivery_method text not null default 'ship' check (delivery_method in ('ship', 'pickup')), -- giao tận nơi / tự đến lấy
  address         text check (char_length(address) <= 300),
  receive_date    date,                                      -- ngày khách muốn nhận
  note            text check (char_length(note) <= 1000),
  items           jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  total_amount    numeric not null default 0 check (total_amount >= 0),
  status          text not null default 'new' check (status in ('new', 'confirmed', 'done', 'cancelled')),
  invoice_id      uuid                                       -- hóa đơn đã tạo từ đơn này
);

create index if not exists customer_orders_created_idx on public.customer_orders (created_at desc);
create index if not exists customer_orders_status_idx on public.customer_orders (status);

alter table public.customer_orders enable row level security;

grant insert on public.customer_orders to anon, authenticated;
grant select, update, delete on public.customer_orders to authenticated;

-- Khách gửi đơn: chỉ được tạo đơn ở trạng thái "mới"
drop policy if exists "Khách gửi đơn" on public.customer_orders;
create policy "Khách gửi đơn"
  on public.customer_orders
  for insert
  to anon, authenticated
  with check (status = 'new' and invoice_id is null);

-- Admin quản lý toàn bộ
drop policy if exists "Admin quản lý đơn online" on public.customer_orders;
create policy "Admin quản lý đơn online"
  on public.customer_orders
  for all
  to authenticated
  using (true)
  with check (true);

-- ── Cập nhật: tiền ship do shop tự điền khi xác nhận đơn ──────────────────────
alter table public.customer_orders
  add column if not exists shipping_fee numeric not null default 0 check (shipping_fee >= 0);

-- Khách gửi đơn: không được tự đặt tiền ship
drop policy if exists "Khách gửi đơn" on public.customer_orders;
create policy "Khách gửi đơn"
  on public.customer_orders
  for insert
  to anon, authenticated
  with check (status = 'new' and invoice_id is null and shipping_fee = 0);

-- ── Cập nhật: phí khác (thiệp, gói quà...) do shop tự điền khi xác nhận đơn ───
alter table public.customer_orders
  add column if not exists other_fee      numeric not null default 0 check (other_fee >= 0),
  add column if not exists other_fee_name text;

-- Khách gửi đơn: không được tự đặt tiền ship / phí khác
drop policy if exists "Khách gửi đơn" on public.customer_orders;
create policy "Khách gửi đơn"
  on public.customer_orders
  for insert
  to anon, authenticated
  with check (status = 'new' and invoice_id is null and shipping_fee = 0 and other_fee = 0 and other_fee_name is null);
