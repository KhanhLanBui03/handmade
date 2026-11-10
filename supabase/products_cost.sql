-- Thêm cột chi phí nguyên liệu và tổng giá vốn cho sản phẩm
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run

alter table public.products
  add column if not exists materials_cost jsonb not null default '[]'::jsonb,
  add column if not exists cost numeric not null default 0;

comment on column public.products.materials_cost is 'Danh sách nguyên liệu cấu thành: [{material_id, name, quantity, unit, unit_price}]';
comment on column public.products.cost is 'Tổng chi phí vốn nguyên liệu của sản phẩm';

