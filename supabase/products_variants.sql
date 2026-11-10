-- Phân loại sản phẩm: mỗi sản phẩm có thể có nhiều phân loại, mỗi phân loại một giá (và có thể gắn với một ảnh)
-- Ví dụ: [{"name":"50 bông","price":125000,"image":"https://..."}, {"name":"75 bông","price":160000,"image":null}]
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run

alter table public.products
  add column if not exists variants jsonb not null default '[]'::jsonb;

comment on column public.products.variants is 'Phân loại: [{name, price, image}] — giá riêng từng phân loại';
