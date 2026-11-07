-- Bảng danh mục nguyên liệu (VD: kẽm, cúp, ruy băng...)
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run

create table if not exists public.materials (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null unique,                -- Tên nguyên liệu: Cúp, Kẽm nhung...
  unit          text not null default 'cái',         -- Đơn vị tính: cái, cuộn, bó, mét...
  default_price numeric not null default 0,          -- Đơn giá nhập cố định/mặc định
  note          text                                 -- Ghi chú/quy cách
);

create index if not exists materials_name_idx on public.materials (name);

-- Chỉ tài khoản đã đăng nhập (admin) mới xem/thêm/sửa/xóa nguyên liệu
alter table public.materials enable row level security;

drop policy if exists "Admin quản lý nguyên liệu" on public.materials;
create policy "Admin quản lý nguyên liệu"
  on public.materials
  for all
  to authenticated
  using (true)
  with check (true);

