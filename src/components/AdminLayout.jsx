import { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, NavLink, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  CircleNotch, CashRegister, Package, Folders, SignOut, List, X, ArrowSquareOut, TrayArrowDown, Shapes, ShoppingBag, ChartBar,
} from '@phosphor-icons/react';
import { BrandLogo } from './BrandLogo';

const NAV = [
  { name: 'Bán hàng (POS)', path: '/admin', icon: CashRegister, end: true },
  { name: 'Đơn online', path: '/admin/online-orders', icon: ShoppingBag, badge: 'newOrders' },
  { name: 'Thống kê', path: '/admin/stats', icon: ChartBar },
  { name: 'Nhập hàng', path: '/admin/imports', icon: TrayArrowDown },
  { name: 'Nguyên liệu', path: '/admin/materials', icon: Shapes },
  { name: 'Sản phẩm', path: '/admin/products', icon: Package, match: '/admin/product' },
  { name: 'Danh mục', path: '/admin/categories', icon: Folders },
];

// Số đơn online mới (chưa xử lý) để hiện trên menu; cập nhật khi chuyển trang
function useNewOrderCount() {
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);
  useEffect(() => {
    supabase
      .from('customer_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .then(({ count: c, error }) => setCount(error ? 0 : c || 0));
  }, [pathname]);
  return count;
}

function Sidebar({ session, onNavigate }) {
  const { pathname } = useLocation();
  const newOrders = useNewOrderCount();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <BrandLogo subtitle="Quản trị" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Quản trị">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted/80">Menu</p>
        {NAV.map((item) => {
          const forceActive = item.match && pathname.startsWith(item.match) && !pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => {
                const on = isActive || forceActive;
                return `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  on ? 'bg-ink text-paper' : 'text-muted hover:bg-ink/5 hover:text-ink'
                }`;
              }}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} weight={isActive || forceActive ? 'fill' : 'regular'} />
                  {item.name}
                  {item.badge === 'newOrders' && newOrders > 0 && (
                    <span className="ml-auto rounded-full bg-brick px-2 py-0.5 text-xs font-semibold text-white">{newOrders}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        <div className="!mt-6 border-t border-line pt-4">
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-ink/5 hover:text-ink"
          >
            <ArrowSquareOut size={20} /> Xem cửa hàng
          </Link>
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sm font-semibold uppercase text-sage">
            {session?.user?.email?.[0] || 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session?.user?.email}</p>
            <p className="text-xs text-muted">Quản trị viên</p>
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="icon-btn size-9 hover:text-brick"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <SignOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <CircleNotch size={36} className="animate-spin text-muted" />
      </div>
    );
  }

  if (!session) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-dvh bg-paper">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:block">
        <Sidebar session={session} />
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
        <button type="button" className="icon-btn text-ink" aria-label="Mở menu" onClick={() => setDrawerOpen(true)}>
          <List size={22} />
        </button>
        <BrandLogo subtitle={null} />
        <span className="size-10" />
      </header>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl">
            <button
              type="button"
              className="icon-btn absolute right-3 top-3"
              aria-label="Đóng menu"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={20} />
            </button>
            <Sidebar session={session} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet context={{ session }} />
        </div>
      </main>
    </div>
  );
}
