-- Cho phép khách đặt đơn "Tự đến lấy" không bắt buộc phải nhập số điện thoại
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run

alter table public.customer_orders alter column phone drop not null;

alter table public.customer_orders drop constraint if exists customer_orders_phone_check;

alter table public.customer_orders add constraint customer_orders_phone_check
  check (phone is null or phone = '' or phone ~ '^[0-9+ .]{8,15}$');

