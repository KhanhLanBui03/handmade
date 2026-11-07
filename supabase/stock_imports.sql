-- Bảng phiếu nhập hàng cho trang Admin › Nhập hàng
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run

create table if not exists public.stock_imports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  import_date date        not null default current_date,  -- ngày nhập hàng
  supplier    text,                                       -- nơi mua / nhà cung cấp
  note        text,                                       -- ghi chú
  items       jsonb       not null default '[]'::jsonb,   -- [{ name, product_id, quantity, unit, unit_price }]
  total_cost  numeric     not null default 0              -- tổng tiền nhập
);

create index if not exists stock_imports_import_date_idx on public.stock_imports (import_date desc);

-- Chỉ tài khoản đã đăng nhập (admin) mới xem/thêm/xóa phiếu nhập
alter table public.stock_imports enable row level security;

drop policy if exists "Admin quản lý phiếu nhập" on public.stock_imports;
create policy "Admin quản lý phiếu nhập"
  on public.stock_imports
  for all
  to authenticated
  using (true)
  with check (true);
