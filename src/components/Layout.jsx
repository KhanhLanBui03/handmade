import { Outlet, Link } from 'react-router-dom';
import { ShoppingBag } from '@phosphor-icons/react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-[72px] max-w-[1400px] mx-auto w-full">
        <Link to="/" className="text-xl font-medium tracking-tight">Kẽm Nhung Studio</Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/products" className="hover:text-brick transition-colors font-bold uppercase tracking-wider">Cửa hàng</Link>
          <Link to="/about" className="hover:text-brick transition-colors font-bold uppercase tracking-wider">Về chúng tôi</Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-ink/10 px-6 md:px-12 py-12 max-w-[1400px] mx-auto w-full mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-medium tracking-tight">Kẽm Nhung Studio</div>
          <div className="text-sm text-ink/60">
            © {new Date().getFullYear()} Kẽm Nhung Studio. Tất cả quyền được bảo lưu.
          </div>
        </div>
      </footer>
    </div>
  );
}
