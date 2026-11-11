-- Phân loại sản phẩm: mỗi sản phẩm có thể có nhiều phân loại — mỗi phân loại có giá bán,
-- giá vốn riêng (cost) và có thể gắn với một ảnh.
-- Ví dụ: [{"name":"50 bông","price":125000,"cost":50000,"image":"https://..."}, {"name":"75 bông","price":160000,"cost":70000,"image":null}]
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run
-- (variants là jsonb nên không cần chạy lại khi thêm giá vốn phân loại — chỉ cần chạy nếu cột chưa có.)

alter table public.products
  add column if not exists variants jsonb not null default '[]'::jsonb;

comment on column public.products.variants is 'Phân loại: [{name, price, cost, image}] — giá bán & giá vốn riêng từng phân loại';
