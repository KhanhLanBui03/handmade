-- Thêm cột "ẩn sản phẩm": sản phẩm bị ẩn vẫn lưu trong admin nhưng khách không thấy
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run

alter table public.products
  add column if not exists is_hidden boolean not null default false;
