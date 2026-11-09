-- Cho phép admin (tài khoản đã đăng nhập) SỬA và XÓA hóa đơn ở trang Admin › Hóa đơn
-- Chỉ cần chạy nếu trang Hóa đơn báo "Supabase chưa cho phép sửa/xóa hóa đơn".
-- Cách chạy: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file này → Run

drop policy if exists "Admin sửa hóa đơn" on public.orders;
create policy "Admin sửa hóa đơn"
  on public.orders
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin xóa hóa đơn" on public.orders;
create policy "Admin xóa hóa đơn"
  on public.orders
  for delete
  to authenticated
  using (true);
