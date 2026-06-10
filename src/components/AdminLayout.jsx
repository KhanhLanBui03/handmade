import { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CircleNotch, Storefront, Package, Folders, SignOut, ChartBar } from '@phosphor-icons/react';

export default function AdminLayout() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-paper">
        <CircleNotch size={48} className="animate-spin text-ink/20" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { name: 'POS Bán hàng', path: '/admin', icon: ChartBar },
    { name: 'Lịch sử Hóa đơn', path: '/admin/orders', icon: Storefront },
    { name: 'Quản lý Sản phẩm', path: '/admin/products', icon: Package },
    { name: 'Quản lý Danh mục', path: '/admin/categories', icon: Folders },
  ];

  return (
    <div className="min-h-[100dvh] bg-paper-dim flex">
      {/* Sidebar Professional */}
      <aside className="w-72 bg-ink text-paper flex flex-col fixed h-full z-20 shadow-2xl">
        <div className="p-8 border-b border-paper/10">
          <Link to="/" className="flex items-center gap-3 text-paper hover:opacity-80 transition-opacity">
            <Storefront size={32} weight="fill" className="text-sunflower" />
            <div className="flex flex-col">
              <span className="font-semibold text-xl tracking-tight leading-tight">Admin Panel</span>
              <span className="text-xs text-paper/50 uppercase tracking-widest mt-0.5">Kẽm Nhung</span>
            </div>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-8 flex flex-col gap-3">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                  isActive 
                    ? 'bg-sunflower text-ink font-semibold shadow-lg shadow-sunflower/20 scale-100' 
                    : 'text-paper/60 hover:text-paper hover:bg-paper/5 scale-95 hover:scale-100 font-medium'
                }`}
              >
                <item.icon size={24} weight={isActive ? "fill" : "regular"} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t border-paper/10">
          <button 
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-4 px-5 py-4 w-full text-left text-paper/60 hover:text-brick hover:bg-brick/10 rounded-2xl transition-colors font-medium"
          >
            <SignOut size={24} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-72 p-10 md:p-14 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <Outlet context={{ session }} />
        </div>
      </main>
    </div>
  );
}
